import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { getSocket } from "../lib/socket";
import {
  getIceServers,
  ULTRA_AUDIO_CONSTRAINTS,
  SOCIAL_CALL_VIDEO_CONSTRAINTS,
  tuneOpusSdp,
  DEFAULT_ICE_SERVERS,
} from "../lib/webrtcCore";
import { snackbar } from "../lib/snackbar";

/**
 * useVybeCall — Lightweight, high-performance 1-to-1 WebRTC Call Hook for Vybe Calls
 * Designed specifically for Instagram/WhatsApp-style direct messaging calls.
 */
export const useVybeCall = ({ room, targetUserId, type = "video", isIncoming = false, onCallEnded }) => {
  const { userData } = useSelector((s) => s.user);
  const currentUserId = (userData?.user?._id || userData?._id)?.toString();

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const isAudioOnly = type === "voice" || type === "audio";
  const [isVideoOff, setIsVideoOff] = useState(isAudioOnly);
  const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callState, setCallState] = useState(isIncoming ? "connected" : "ringing"); // "ringing" | "connected" | "reconnecting" | "ended"
  const [connectionQuality, setConnectionQuality] = useState("good"); // "good" | "poor"

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const durationTimerRef = useRef(null);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const isSettingRemoteAnswerPendingRef = useRef(false);
  const queuedCandidatesRef = useRef([]);
  const iceServersRef = useRef(DEFAULT_ICE_SERVERS);
  const cleanedUpRef = useRef(false);

  // Load ICE / STUN / TURN servers
  useEffect(() => {
    let active = true;
    getIceServers().then((servers) => {
      if (active && servers && Array.isArray(servers) && servers.length > 0) {
        iceServersRef.current = servers;
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Duration Timer (counts up when callState === "connected" & remoteStream is present)
  useEffect(() => {
    if (callState === "connected") {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  // Clean Teardown
  const cleanup = useCallback(() => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.oniceconnectionstatechange = null;
        peerConnectionRef.current.onnegotiationneeded = null;
        peerConnectionRef.current.close();
      } catch {}
      peerConnectionRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCallState("ended");
  }, []);

  // Initialize Media and Peer Connection
  useEffect(() => {
    if (!room) return;
    cleanedUpRef.current = false;
    const socket = getSocket();

    const startCallEngine = async () => {
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: ULTRA_AUDIO_CONSTRAINTS,
            video: isAudioOnly
              ? false
              : {
                  ...SOCIAL_CALL_VIDEO_CONSTRAINTS,
                  facingMode,
                },
          });
        } catch (e1) {
          console.warn("[VybeCall] HD constraints failed, falling back to basic constraints...", e1?.message);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: ULTRA_AUDIO_CONSTRAINTS,
              video: isAudioOnly ? false : { facingMode },
            });
          } catch (e2) {
            console.warn("[VybeCall] Video fallback failed, acquiring audio only...", e2?.message);
            stream = await navigator.mediaDevices.getUserMedia({
              audio: ULTRA_AUDIO_CONSTRAINTS,
              video: false,
            });
            setIsVideoOff(true);
          }
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Create PeerConnection with perfect negotiation pattern
        const pc = new RTCPeerConnection({
          iceServers: iceServersRef.current,
          iceCandidatePoolSize: 10,
          bundlePolicy: "max-bundle",
          rtcpMuxPolicy: "require",
        });
        peerConnectionRef.current = pc;

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          try {
            pc.addTrack(track, stream);
          } catch (e) {
            console.warn("[VybeCall] addTrack error:", e);
          }
        });

        // Remote Track listener (merges audio + video tracks safely and un-mutes immediately)
        pc.ontrack = (event) => {
          console.log("📞 [VybeCall] Remote track received:", event.track.kind);
          const track = event.track;
          if (track) {
            track.enabled = true;
            track.onunmute = () => {
              track.enabled = true;
            };
          }

          setRemoteStream((prev) => {
            if (!prev) {
              const newStream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([track]);
              newStream.getTracks().forEach((t) => (t.enabled = true));
              return newStream;
            }
            const existingTrack = prev.getTracks().find((t) => t.id === track.id || t.kind === track.kind);
            if (existingTrack && existingTrack.id !== track.id) {
              prev.removeTrack(existingTrack);
            }
            if (!prev.getTracks().some((t) => t.id === track.id)) {
              prev.addTrack(track);
            }
            prev.getTracks().forEach((t) => (t.enabled = true));
            return new MediaStream(prev.getTracks());
          });
          setCallState("connected");
        };

        // ICE Candidate handler
        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit("call:signal", {
              room,
              toSocketId: targetUserId,
              toUserId: targetUserId,
              signal: { candidate: event.candidate },
            });
          }
        };

        // Connection state listener
        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          console.log(`📞 [VybeCall] Connection state: ${state}`);
          if (state === "connected") {
            setCallState("connected");
            setConnectionQuality("good");
          } else if (state === "connecting") {
            setCallState("ringing");
          } else if (state === "disconnected" || state === "failed") {
            setConnectionQuality("poor");
            setCallState("reconnecting");
          } else if (state === "closed") {
            setCallState("ended");
            onCallEnded?.();
          }
        };

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            setConnectionQuality("poor");
          } else if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
            setConnectionQuality("good");
          }
        };

        // Caller initiates the offer with Opus SDP tuning
        if (!isIncoming) {
          pc.onnegotiationneeded = async () => {
            try {
              makingOfferRef.current = true;
              const offer = await pc.createOffer();
              if (pc.signalingState !== "stable") return;
              const tunedOfferSdp = tuneOpusSdp(offer.sdp);
              await pc.setLocalDescription({ type: offer.type, sdp: tunedOfferSdp });
              socket?.emit("call:signal", {
                room,
                toSocketId: targetUserId,
                toUserId: targetUserId,
                signal: { type: "offer", sdp: pc.localDescription },
              });
            } catch (err) {
              console.error("[VybeCall] Negotiation needed error:", err);
            } finally {
              makingOfferRef.current = false;
            }
          };
        }

        // Join room on socket to be ready for media signaling
        socket?.emit("call:join-room", { room });
      } catch (err) {
        console.error("[VybeCall] Camera/Microphone access error:", err);
        snackbar.error("Could not access camera/microphone");
        setCallState("ended");
        onCallEnded?.();
      }
    };

    startCallEngine();

    // Signal listener from socket
    const handleSignal = async (data) => {
      const isSelf =
        (data.fromSocketId && data.fromSocketId === socket?.id) ||
        (data.fromUserId && currentUserId && data.fromUserId.toString() === currentUserId);
      if (isSelf) return;

      const pc = peerConnectionRef.current;
      if (!pc || !data.signal) return;

      const signal = data.signal;
      const sdpData = signal.sdp || signal;
      const candidateData = signal.candidate || (signal.candidate !== undefined ? signal : null);

      try {
        if (sdpData && (sdpData.type || signal.type)) {
          const sdpType = signal.type || sdpData.type;
          const isOffer = sdpType === "offer";
          const offerCollision = isOffer && (makingOfferRef.current || pc.signalingState !== "stable");

          // Determine polite peer (callee is polite, caller is impolite)
          const isPolite = isIncoming;

          ignoreOfferRef.current = !isPolite && offerCollision;
          if (ignoreOfferRef.current) {
            console.log("[VybeCall] Impolite caller ignoring offer collision");
            return;
          }

          if (isOffer && offerCollision) {
            console.log("[VybeCall] Polite peer rolling back for incoming offer");
            await pc.setLocalDescription({ type: "rollback" });
          }

          const rawSdpStr = typeof sdpData === "string" ? sdpData : sdpData.sdp || sdpData;
          const tunedRemoteSdp = tuneOpusSdp(rawSdpStr);

          isSettingRemoteAnswerPendingRef.current = !isOffer;
          await pc.setRemoteDescription(new RTCSessionDescription({ type: sdpType, sdp: tunedRemoteSdp }));
          isSettingRemoteAnswerPendingRef.current = false;

          // Drain queued ICE candidates
          if (queuedCandidatesRef.current.length > 0) {
            for (const cand of queuedCandidatesRef.current) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn("[VybeCall] Add queued candidate failed:", e);
              }
            }
            queuedCandidatesRef.current = [];
          }

          if (isOffer) {
            const answer = await pc.createAnswer();
            const tunedAnswerSdp = tuneOpusSdp(answer.sdp);
            await pc.setLocalDescription({ type: answer.type, sdp: tunedAnswerSdp });
            socket?.emit("call:signal", {
              room,
              toSocketId: data.fromSocketId || targetUserId,
              toUserId: data.fromUserId || targetUserId,
              signal: { type: "answer", sdp: pc.localDescription },
            });
          }
        } else if (candidateData && candidateData.candidate) {
          try {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } else {
              queuedCandidatesRef.current.push(candidateData);
            }
          } catch (candErr) {
            if (!ignoreOfferRef.current) {
              console.warn("[VybeCall] ICE candidate error:", candErr);
            }
          }
        }
      } catch (err) {
        console.error("[VybeCall] Signaling error:", err);
      }
    };

    socket?.on("call:signal-received", handleSignal);

    return () => {
      socket?.off("call:signal-received", handleSignal);
      cleanup();
    };
  }, [room, isIncoming, targetUserId, isAudioOnly, facingMode, cleanup, onCallEnded, currentUserId]);

  // Toggle Microphone
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Toggle Camera
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  }, [isVideoOff]);

  // Flip Camera (Mobile Front/Back)
  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current) return;
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...SOCIAL_CALL_VIDEO_CONSTRAINTS,
          facingMode: newFacingMode,
        },
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (sender && newVideoTrack) {
          sender.replaceTrack(newVideoTrack);
        }
      }

      if (oldVideoTrack) {
        localStreamRef.current.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }

      localStreamRef.current.addTrack(newVideoTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setFacingMode(newFacingMode);
    } catch (err) {
      console.warn("[VybeCall] Camera flip error:", err);
      snackbar.error("Could not switch camera");
    }
  }, [facingMode]);

  // Toggle Speaker Output
  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
  }, []);

  // Expose compatible peers dictionary for overlay components
  const peers = useMemo(() => {
    if (!remoteStream) return {};
    const key = targetUserId || "remote-peer";
    return {
      [key]: {
        userId: targetUserId,
        stream: remoteStream,
        isMuted: false,
        isVideoOff: false,
      },
    };
  }, [remoteStream, targetUserId]);

  return {
    localStream,
    remoteStream,
    peers,
    isMuted,
    isVideoOff,
    isSpeakerOn,
    callDuration,
    callState,
    connectionQuality,
    facingMode,
    toggleMute,
    toggleVideo,
    flipCamera,
    toggleSpeaker,
    endCall: cleanup,
  };
};

export default useVybeCall;
