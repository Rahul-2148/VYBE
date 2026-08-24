import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "../lib/socket";
import { getIceServers, STUDIO_AUDIO_CONSTRAINTS, SOCIAL_CALL_VIDEO_CONSTRAINTS } from "../lib/webrtcCore";
import { snackbar } from "../lib/snackbar";

/**
 * useVybeCall — Lightweight, high-performance 1-to-1 WebRTC Call Hook for Vybe Calls
 * Designed specifically for Instagram/WhatsApp-style direct messaging calls.
 */
export const useVybeCall = ({ room, targetUserId, type = "video", isIncoming = false, onCallEnded }) => {
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
  const queuedCandidatesRef = useRef([]);
  const iceServersRef = useRef([{ urls: "stun:stun.l.google.com:19302" }]);
  const cleanedUpRef = useRef(false);

  // Load ICE / STUN / TURN servers
  useEffect(() => {
    let active = true;
    getIceServers().then((servers) => {
      if (active && servers) {
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
        const constraints = {
          audio: STUDIO_AUDIO_CONSTRAINTS,
          video: isAudioOnly
            ? false
            : {
                ...SOCIAL_CALL_VIDEO_CONSTRAINTS,
                facingMode,
              },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Create PeerConnection with perfect negotiation pattern
        const pc = new RTCPeerConnection({
          iceServers: iceServersRef.current,
          iceCandidatePoolSize: 2,
        });
        peerConnectionRef.current = pc;

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Remote Track listener
        pc.ontrack = (event) => {
          console.log("📞 [VybeCall] Remote track received:", event.track.kind);
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
            setCallState("connected");
          } else {
            const inboundStream = new MediaStream([event.track]);
            setRemoteStream(inboundStream);
            setCallState("connected");
          }
        };

        // ICE Candidate handler
        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit("call:signal", {
              room,
              toSocketId: targetUserId,
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

        // Caller initiates the offer
        if (!isIncoming) {
          pc.onnegotiationneeded = async () => {
            try {
              makingOfferRef.current = true;
              const offer = await pc.createOffer();
              if (pc.signalingState !== "stable") return;
              await pc.setLocalDescription(offer);
              socket?.emit("call:signal", {
                room,
                toSocketId: targetUserId,
                signal: { sdp: pc.localDescription },
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
      const pc = peerConnectionRef.current;
      if (!pc || !data.signal) return;

      const { sdp, candidate } = data.signal;

      try {
        if (sdp) {
          const isOffer = sdp.type === "offer";
          const offerCollision = isOffer && (makingOfferRef.current || pc.signalingState !== "stable");

          ignoreOfferRef.current = !isIncoming && offerCollision;
          if (ignoreOfferRef.current) {
            console.log("[VybeCall] Offer collision detected, ignoring incoming offer");
            return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

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
            await pc.setLocalDescription(answer);
            socket?.emit("call:signal", {
              room,
              toSocketId: data.fromSocketId || targetUserId,
              signal: { sdp: pc.localDescription },
            });
          }
        } else if (candidate) {
          try {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
              queuedCandidatesRef.current.push(candidate);
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
  }, [room, isIncoming, targetUserId, isAudioOnly, facingMode, cleanup, onCallEnded]);

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

  return {
    localStream,
    remoteStream,
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
