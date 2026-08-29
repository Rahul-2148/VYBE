import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { getSocket } from "../lib/socket";
import { snackbar } from "../lib/snackbar";
import {
  getIceServers,
  DEFAULT_ICE_SERVERS,
  ULTRA_AUDIO_CONSTRAINTS,
  SCREEN_SHARE_CONSTRAINTS,
  enumerateDevices,
  createVoiceActivityDetector,
  tuneOpusSdp,
  unlockAudioContext,
} from "../lib/webrtcCore";
import { VideoBackgroundProcessor } from "../lib/videoBackgroundProcessor";
import { playJoinSound, playLeaveSound, playHandRaiseSound } from "../lib/sounds";

/**
 * useMeetWebRTC - Enterprise Multi-Party Mesh WebRTC Engine for Vybe Meet
 * Implements Perfect Negotiation, Opus HD 64kbps SDP Tuning, Hardware AEC,
 * Real-Time Video Background & Studio Lighting Processing, Multi-Track Separation & Resilient State Management.
 */
export const useMeetWebRTC = (meetingId, currentUserId, initialOptions = {}) => {
  const { userData } = useSelector((s) => s.user || {});
  const rawUserName = userData?.user?.userName || userData?.userName || "";
  const rawName = userData?.user?.name || userData?.name || "";
  const myProfileAvatar =
    userData?.user?.profileImage?.url ||
    userData?.profileImage?.url ||
    (typeof userData?.user?.profileImage === "string" ? userData.user.profileImage : "") ||
    (typeof userData?.profileImage === "string" ? userData.profileImage : "") ||
    "";

  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  // peers: { [socketId]: { socketId, userId, userName, name, profilePicture, isVerified, stream, screenStream, muted, videoOff, screenSharing, handRaised, handRaisedAt, videoFilter } }
  const [peers, setPeers] = useState({});

  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState(initialOptions.selectedAudioInput || "");
  const [selectedVideo, setSelectedVideo] = useState(initialOptions.selectedVideo || "");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState("");

  const [isMuted, setIsMuted] = useState(Boolean(initialOptions.isMuted));
  const [isVideoOff, setIsVideoOff] = useState(Boolean(initialOptions.isVideoOff));
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [handRaisedAt, setHandRaisedAt] = useState(null);
  const [videoFilter, setVideoFilter] = useState(initialOptions.videoFilter || "none");
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [connectionQuality, setConnectionQuality] = useState("good");
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [facingMode, setFacingMode] = useState("user"); // "user" (front selfie) | "environment" (rear back)

  const resolvedUserId = (currentUserId || userData?.user?._id || userData?._id)?.toString() || "";
  const initialOptionsRef = useRef(initialOptions);
  useEffect(() => {
    initialOptionsRef.current = initialOptions;
  }, [initialOptions]);

  const isMutedRef = useRef(isMuted);
  const isVideoOffRef = useRef(isVideoOff);
  const videoFilterRef = useRef(videoFilter);
  const toggleScreenShareRef = useRef(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
    isVideoOffRef.current = isVideoOff;
    videoFilterRef.current = videoFilter;
  });

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const rawStreamRef = useRef(null);
  const videoProcessorRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnections = useRef({}); // { [socketId]: RTCPeerConnection }
  const cameraSendersRef = useRef({}); // { [socketId]: RTCRtpSender }
  const audioSendersRef = useRef({}); // { [socketId]: RTCRtpSender }
  const screenSendersRef = useRef({}); // { [socketId]: RTCRtpSender }
  const iceServersRef = useRef(DEFAULT_ICE_SERVERS);
  const makingOfferRef = useRef({});
  const ignoreOfferRef = useRef({});
  const isSettingRemoteAnswerPendingRef = useRef({});
  const queuedCandidatesRef = useRef({});
  const cleanedUpRef = useRef(false);
  const vadCleanupRef = useRef(null);

  // 1. Fetch Dynamic ICE / TURN Servers
  useEffect(() => {
    let active = true;
    getIceServers().then((servers) => {
      if (active && Array.isArray(servers) && servers.length > 0) {
        iceServersRef.current = servers;
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // 2. Enumerate Devices
  const refreshDevices = useCallback(async () => {
    try {
      const { audioInputs, videoInputs, audioOutputs } = await enumerateDevices();
      setAudioInputDevices(audioInputs);
      setVideoDevices(videoInputs);
      setAudioOutputDevices(audioOutputs);
      if (audioInputs.length > 0 && !selectedAudioInput) setSelectedAudioInput(audioInputs[0].deviceId);
      if (videoInputs.length > 0 && !selectedVideo) setSelectedVideo(videoInputs[0].deviceId);
      if (audioOutputs.length > 0 && !selectedAudioOutput) setSelectedAudioOutput(audioOutputs[0].deviceId);
    } catch (e) {
      console.warn("[MeetWebRTC] Enumerate devices notice:", e);
    }
  }, [selectedAudioInput, selectedVideo, selectedAudioOutput]);

  useEffect(() => {
    let active = true;
    enumerateDevices().then(({ audioInputs, videoInputs, audioOutputs }) => {
      if (!active) return;
      setAudioInputDevices(audioInputs);
      setVideoDevices(videoInputs);
      setAudioOutputDevices(audioOutputs);
      if (audioInputs.length > 0 && !selectedAudioInput) setSelectedAudioInput(audioInputs[0].deviceId);
      if (videoInputs.length > 0 && !selectedVideo) setSelectedVideo(videoInputs[0].deviceId);
      if (audioOutputs.length > 0 && !selectedAudioOutput) setSelectedAudioOutput(audioOutputs[0].deviceId);
    }).catch((e) => console.warn("[MeetWebRTC] Enumerate devices notice:", e));

    return () => {
      active = false;
    };
  }, [selectedAudioInput, selectedVideo, selectedAudioOutput]);

  // Helper: Close a single peer connection safely
  const closePeerConnection = useCallback((socketId) => {
    const pc = peerConnections.current[socketId];
    if (pc) {
      try {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.oniceconnectionstatechange = null;
        pc.onconnectionstatechange = null;
        pc.onnegotiationneeded = null;
        pc.close();
      } catch {}
      delete peerConnections.current[socketId];
    }
    delete cameraSendersRef.current[socketId];
    delete audioSendersRef.current[socketId];
    delete screenSendersRef.current[socketId];
    delete makingOfferRef.current[socketId];
    delete ignoreOfferRef.current[socketId];
    delete isSettingRemoteAnswerPendingRef.current[socketId];
    delete queuedCandidatesRef.current[socketId];
  }, []);

  // Helper: Teardown All Media & Signaling
  const leaveRoom = useCallback(() => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;

    const socket = socketRef.current;
    if (socket && meetingId) {
      socket.emit("meeting:leave-room", { meetingId });
    }

    if (vadCleanupRef.current) {
      vadCleanupRef.current();
      vadCleanupRef.current = null;
    }

    if (videoProcessorRef.current) {
      videoProcessorRef.current.cleanup();
      videoProcessorRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      screenStreamRef.current = null;
    }

    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      rawStreamRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      localStreamRef.current = null;
    }

    Object.keys(peerConnections.current).forEach((sid) => {
      closePeerConnection(sid);
    });

    setLocalStream(null);
    setScreenStream(null);
    setPeers({});
    setIsScreenSharing(false);
    setIsMediaReady(false);
  }, [meetingId, closePeerConnection]);

  // 3. Create Peer Connection with Perfect Negotiation Pattern
  const createPeerConnection = useCallback(
    (socketId, isInitiator, memberMetadata = {}) => {
      if (peerConnections.current[socketId]) {
        return peerConnections.current[socketId];
      }

      const socket = socketRef.current;
      const pc = new RTCPeerConnection({
        iceServers: iceServersRef.current,
        iceCandidatePoolSize: 10,
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      });

      peerConnections.current[socketId] = pc;
      makingOfferRef.current[socketId] = false;
      ignoreOfferRef.current[socketId] = false;
      isSettingRemoteAnswerPendingRef.current[socketId] = false;
      queuedCandidatesRef.current[socketId] = [];

      // Determine polite peer (deterministic fallback if both create offers)
      const isPolite = socket?.id ? socket.id < socketId : !isInitiator;

      // Add local audio and video tracks to new peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          try {
            const sender = pc.addTrack(track, localStreamRef.current);
            if (track.kind === "video") cameraSendersRef.current[socketId] = sender;
            if (track.kind === "audio") audioSendersRef.current[socketId] = sender;
          } catch (e) {
            console.warn("[MeetWebRTC] addTrack initial error:", e?.message);
          }
        });
      }

      // Add screen share tracks if currently active
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => {
          try {
            const sender = pc.addTrack(track, screenStreamRef.current);
            if (track.kind === "video") screenSendersRef.current[socketId] = sender;
          } catch (e) {
            console.warn("[MeetWebRTC] addTrack screen error:", e?.message);
          }
        });
      }

      // Handle remote incoming tracks
      pc.ontrack = (event) => {
        const track = event.track;
        if (!track) return;
        track.enabled = true;

        const incomingStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([track]);
        incomingStream.getAudioTracks().forEach((t) => (t.enabled = true));

        setPeers((prev) => {
          const existing = prev[socketId] || {
            socketId,
            userId: memberMetadata.userId || null,
            userName: memberMetadata.userName || "Participant",
            name: memberMetadata.name || "",
            profilePicture: memberMetadata.profilePicture || null,
            isVerified: memberMetadata.isVerified || false,
            stream: null,
            screenStream: null,
            muted: false,
            videoOff: false,
            screenSharing: false,
            handRaised: false,
            handRaisedAt: null,
            videoFilter: "none",
          };

          // Merge incoming track into stream if stream exists
          let targetStream = existing.stream;
          if (!targetStream) {
            targetStream = incomingStream;
          } else {
            const existingTrack = targetStream.getTracks().find((t) => t.id === track.id || t.kind === track.kind);
            if (existingTrack && existingTrack.id !== track.id) {
              targetStream.removeTrack(existingTrack);
            }
            if (!targetStream.getTracks().some((t) => t.id === track.id)) {
              targetStream.addTrack(track);
            }
          }

          const isDisplayTrack =
            track.kind === "video" &&
            (existing.screenSharing || event.streams[0]?.id?.includes("screen") || track.label?.toLowerCase().includes("screen"));

          if (isDisplayTrack) {
            return {
              ...prev,
              [socketId]: {
                ...existing,
                screenStream: incomingStream,
                screenSharing: true,
              },
            };
          }

          return {
            ...prev,
            [socketId]: {
              ...existing,
              stream: new MediaStream(targetStream.getTracks()),
            },
          };
        });
      };

      // ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("meeting:signal", {
            meetingId,
            toSocketId: socketId,
            toUserId: memberMetadata.userId,
            signal: { candidate: event.candidate },
          });
        }
      };

      // Connection state tracking
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "disconnected" || state === "failed") {
          setConnectionQuality("poor");
        } else if (state === "connected") {
          setConnectionQuality("good");
        } else if (state === "closed") {
          closePeerConnection(socketId);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          setConnectionQuality("poor");
        } else if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setConnectionQuality("good");
        }
      };

      // Negotiation with Opus SDP tuning & Polite Collision Handler
      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current[socketId] = true;
          const offer = await pc.createOffer();
          if (pc.signalingState !== "stable") return;
          const tunedOffer = tuneOpusSdp(offer.sdp);
          await pc.setLocalDescription({ type: offer.type, sdp: tunedOffer });
          socket?.emit("meeting:signal", {
            meetingId,
            toSocketId: socketId,
            toUserId: memberMetadata.userId,
            signal: { sdp: pc.localDescription },
          });
        } catch (err) {
          console.error("[MeetWebRTC] Negotiation error:", err);
        } finally {
          makingOfferRef.current[socketId] = false;
        }
      };

      return pc;
    },
    [meetingId, closePeerConnection]
  );

  // 4. Initial Media Acquisition & Socket Room Join
  useEffect(() => {
    if (!meetingId) return;
    cleanedUpRef.current = false;
    const socket = getSocket();
    socketRef.current = socket;

    const startMeeting = async () => {
      try {
        const audioConstraint = selectedAudioInput
          ? { deviceId: { exact: selectedAudioInput }, ...ULTRA_AUDIO_CONSTRAINTS }
          : ULTRA_AUDIO_CONSTRAINTS;

        const videoConstraint = selectedVideo
          ? { deviceId: { exact: selectedVideo }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraint,
            video: videoConstraint,
          });
        } catch (e1) {
          console.warn("[MeetWebRTC] HD tier fallback...", e1?.message);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraint,
              video: true,
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraint,
              video: false,
            });
            setIsVideoOff(true);
          }
        }

        if (initialOptionsRef.current.isMuted) {
          stream.getAudioTracks().forEach((t) => (t.enabled = false));
        }

        if (initialOptionsRef.current.isVideoOff) {
          stream.getVideoTracks().forEach((t) => (t.enabled = false));
        }

        rawStreamRef.current = stream;

        // Initialize Real-Time Video Background & Studio Lighting Processor
        let activeVideoTrack = stream.getVideoTracks()[0];
        try {
          const processor = new VideoBackgroundProcessor();
          videoProcessorRef.current = processor;
          await processor.initialize(stream);
          if (initialOptionsRef.current.videoFilter && initialOptionsRef.current.videoFilter !== "none") {
            processor.setEffect(initialOptionsRef.current.videoFilter, initialOptionsRef.current.customBackgroundUrl);
          }
          const pTrack = processor.getProcessedVideoTrack();
          if (pTrack) {
            activeVideoTrack = pTrack;
            if (initialOptionsRef.current.isVideoOff) {
              pTrack.enabled = false;
            }
          }
        } catch (procErr) {
          console.warn("[MeetWebRTC] VideoProcessor initialization notice:", procErr);
        }

        const compositeStream = new MediaStream([
          ...stream.getAudioTracks(),
          ...(activeVideoTrack ? [activeVideoTrack] : []),
        ]);

        localStreamRef.current = compositeStream;
        setLocalStream(compositeStream);
        setIsMediaReady(true);

        // Voice activity detector for active speaker indicator
        vadCleanupRef.current = createVoiceActivityDetector(stream, (volume) => {
          if (volume > 25 && !isMutedRef.current) {
            setActiveSpeaker(resolvedUserId || "me");
          }
        });

        // Join Meeting Room via Socket
        socket?.emit("meeting:join-room", {
          meetingId,
          userName: rawUserName,
          name: rawName,
          profilePicture: myProfileAvatar,
          isMuted: Boolean(initialOptionsRef.current.isMuted),
          isVideoOff: Boolean(initialOptionsRef.current.isVideoOff),
          videoFilter: initialOptionsRef.current.videoFilter || "none",
        });

        if (initialOptionsRef.current.isMuted) {
          socket?.emit("meeting:action", { meetingId, action: "mute", isMuted: true });
        }
        if (initialOptionsRef.current.isVideoOff) {
          socket?.emit("meeting:action", { meetingId, action: "video-off", isVideoOff: true });
        }
      } catch (err) {
        console.error("[MeetWebRTC] Media init error:", err);
        snackbar.error("Microphone/camera permissions required to join meeting");
      }
    };

    startMeeting();

    // 5. Connection Health & Stats Polling Loop (Google Meet Adaptive Quality Parity)
    const statsInterval = setInterval(async () => {
      const pcs = Object.values(peerConnections.current);
      if (pcs.length === 0) return;

      let totalRtt = 0;
      let sampleCount = 0;
      let hasFailed = false;

      for (const pc of pcs) {
        if (pc.iceConnectionState === "failed" || pc.connectionState === "failed") {
          hasFailed = true;
          try {
            pc.restartIce();
          } catch {}
        }

        try {
          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (
              report.type === "candidate-pair" &&
              report.state === "succeeded" &&
              report.currentRoundTripTime
            ) {
              totalRtt += report.currentRoundTripTime * 1000;
              sampleCount += 1;
            }
          });
        } catch {}
      }

      if (hasFailed) {
        setConnectionQuality("poor");
      } else if (sampleCount > 0) {
        const avgRtt = totalRtt / sampleCount;
        if (avgRtt < 160) setConnectionQuality("good");
        else if (avgRtt < 360) setConnectionQuality("fair");
        else setConnectionQuality("poor");
      }
    }, 3000);

    const myResolvedId = resolvedUserId;

    // Socket Event: Room Members list received
    const handleRoomMembers = ({ members }) => {
      console.log(`📹 [MeetWebRTC] Joined meeting with ${members?.length || 0} existing peers`);
      if (Array.isArray(members)) {
        members.forEach((member) => {
          const isSelf = (member.socketId && member.socketId === socket?.id) || (member.userId && myResolvedId && member.userId.toString() === myResolvedId);
          if (!isSelf && member.socketId) {
            setPeers((prev) => ({
              ...prev,
              [member.socketId]: {
                ...member,
                muted: Boolean(member.isMuted),
                videoOff: Boolean(member.isVideoOff),
                screenSharing: false,
                handRaised: false,
                handRaisedAt: null,
                videoFilter: member.videoFilter || "none",
              },
            }));
            createPeerConnection(member.socketId, true, member);
          }
        });
      }
    };

    // Socket Event: New Peer Joined
    const handlePeerJoined = (data) => {
      const isSelf = (data.socketId && data.socketId === socket?.id) || (data.userId && myResolvedId && data.userId.toString() === myResolvedId);
      if (isSelf || !data.socketId) return;
      console.log(`📹 [MeetWebRTC] New peer joined: @${data.userName}`);
      playJoinSound();
      snackbar.info(`@${data.userName || "Participant"} joined`);
      setPeers((prev) => ({
        ...prev,
        [data.socketId]: {
          ...data,
          muted: Boolean(data.isMuted),
          videoOff: Boolean(data.isVideoOff),
          screenSharing: false,
          handRaised: false,
          handRaisedAt: null,
          videoFilter: data.videoFilter || "none",
        },
      }));
      createPeerConnection(data.socketId, false, data);
    };

    // Socket Event: Peer Left
    const handlePeerLeft = (data) => {
      playLeaveSound();
      closePeerConnection(data.socketId);
      setPeers((prev) => {
        const next = { ...prev };
        delete next[data.socketId];
        return next;
      });
    };

    // Socket Event: WebRTC Signal Received with Perfect Negotiation & Opus Tuning
    const handleSignalReceived = async (data) => {
      const { fromSocketId, fromUserId, signal, fromMetadata } = data;
      const isSelf = (fromSocketId && fromSocketId === socket?.id) || (fromUserId && myResolvedId && fromUserId.toString() === myResolvedId);
      if (isSelf || !fromSocketId || !signal) return;

      let pc = peerConnections.current[fromSocketId];
      if (!pc) {
        pc = createPeerConnection(fromSocketId, false, fromMetadata || {});
      }

      const isPolite = socket?.id ? socket.id < fromSocketId : true;

      try {
        if (signal.sdp) {
          const isOffer = signal.sdp.type === "offer";
          const offerCollision =
            isOffer && (makingOfferRef.current[fromSocketId] || pc.signalingState !== "stable");

          ignoreOfferRef.current[fromSocketId] = !isPolite && offerCollision;
          if (ignoreOfferRef.current[fromSocketId]) {
            console.log("[MeetWebRTC] Impolite peer ignoring colliding offer");
            return;
          }

          if (isOffer && offerCollision && isPolite) {
            console.log("[MeetWebRTC] Polite peer rolling back colliding offer");
            await pc.setLocalDescription({ type: "rollback" });
          }

          const rawSdpStr = typeof signal.sdp === "string" ? signal.sdp : signal.sdp.sdp;
          const tunedRemote = tuneOpusSdp(rawSdpStr);
          await pc.setRemoteDescription(new RTCSessionDescription({ type: signal.sdp.type || (isOffer ? "offer" : "answer"), sdp: tunedRemote }));

          // Drain queued candidates
          if (queuedCandidatesRef.current[fromSocketId]?.length > 0) {
            for (const cand of queuedCandidatesRef.current[fromSocketId]) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn("[MeetWebRTC] Candidate error:", e);
              }
            }
            queuedCandidatesRef.current[fromSocketId] = [];
          }

          if (isOffer) {
            const answer = await pc.createAnswer();
            const tunedAnswer = tuneOpusSdp(answer.sdp);
            await pc.setLocalDescription({ type: answer.type, sdp: tunedAnswer });
            socket?.emit("meeting:signal", {
              meetingId,
              toSocketId: fromSocketId,
              toUserId: fromMetadata?.userId,
              signal: { sdp: pc.localDescription },
            });
          }
        } else if (signal.candidate) {
          try {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } else {
              if (!queuedCandidatesRef.current[fromSocketId]) {
                queuedCandidatesRef.current[fromSocketId] = [];
              }
              queuedCandidatesRef.current[fromSocketId].push(signal.candidate);
            }
          } catch (candErr) {
            if (!ignoreOfferRef.current[fromSocketId]) {
              console.warn("[MeetWebRTC] ICE candidate error:", candErr);
            }
          }
        }
      } catch (err) {
        console.error("[MeetWebRTC] Signal handling error:", err);
      }
    };

    // Socket Event: Action Broadcast (mute, video, screen share, hand raise, reaction, filter)
    const handleActionBroadcast = (data) => {
      const { socketId, action, streamId: _streamId, isHandRaised: peerHandRaised, isScreenSharing: peerScreen, videoFilter: peerFilter, isMuted: peerMuted, isVideoOff: peerVideoOff, raisedAt } = data;
      if (!socketId) return;

      if (action === "hand" || peerHandRaised) {
        playHandRaiseSound();
      }

      setPeers((prev) => {
        const target = prev[socketId];
        if (!target) return prev;
        return {
          ...prev,
          [socketId]: {
            ...target,
            muted: peerMuted ?? (action === "mute" ? true : action === "unmute" ? false : target.muted),
            videoOff: peerVideoOff ?? (action === "video-off" ? true : action === "video-on" ? false : target.videoOff),
            screenSharing: peerScreen ?? (action === "screen-start" ? true : action === "screen-stop" ? false : target.screenSharing),
            handRaised: peerHandRaised ?? (action === "hand" ? true : action === "lower-hand" ? false : target.handRaised),
            handRaisedAt: raisedAt || (action === "hand" ? Date.now() : target.handRaisedAt),
            videoFilter: peerFilter || (action === "filter" ? data.filter : target.videoFilter),
          },
        };
      });
    };

    // Socket Event: Breakout Room Members Received (WebRTC mesh isolation)
    const handleBreakoutRoomMembers = ({ members }) => {
      console.log(`🚪 [MeetWebRTC] Entering breakout sub-mesh with ${members?.length || 0} peers`);
      // Close existing connections to main room peers
      Object.keys(peerConnections.current).forEach((sid) => {
        closePeerConnection(sid);
      });
      setPeers({});

      if (Array.isArray(members)) {
        members.forEach((member) => {
          const isSelf = (member.socketId && member.socketId === socket?.id) || (member.userId && myResolvedId && member.userId.toString() === myResolvedId);
          if (!isSelf && member.socketId) {
            setPeers((prev) => ({
              ...prev,
              [member.socketId]: {
                ...member,
                muted: false,
                videoOff: false,
                screenSharing: false,
                handRaised: false,
                handRaisedAt: null,
                videoFilter: "none",
              },
            }));
            createPeerConnection(member.socketId, true, member);
          }
        });
      }
    };

    // Socket Event: Breakout Peer Joined
    const handleBreakoutPeerJoined = (data) => {
      const isSelf = (data.socketId && data.socketId === socket?.id) || (data.userId && myResolvedId && data.userId.toString() === myResolvedId);
      if (isSelf || !data.socketId) return;
      playJoinSound();
      snackbar.info(`@${data.userName || "Participant"} joined this breakout room`);
      setPeers((prev) => ({
        ...prev,
        [data.socketId]: {
          ...data,
          muted: false,
          videoOff: false,
          screenSharing: false,
          handRaised: false,
          handRaisedAt: null,
          videoFilter: "none",
        },
      }));
      createPeerConnection(data.socketId, false, data);
    };

    // Socket Event: Breakout Peer Left
    const handleBreakoutPeerLeft = ({ socketId }) => {
      if (socketId) {
        closePeerConnection(socketId);
      }
    };

    // Socket Event: Breakout Session Ended (Return to main room mesh)
    const handleBreakoutEnded = () => {
      console.log(`🚪 [MeetWebRTC] Breakout session closed, rejoining main room mesh`);
      Object.keys(peerConnections.current).forEach((sid) => {
        closePeerConnection(sid);
      });
      setPeers({});

      // Rejoin main meeting room to receive full room members
      socket?.emit("meeting:join-room", {
        meetingId,
        userName: rawUserName,
        name: rawName,
        profilePicture: myProfileAvatar,
        isMuted: isMutedRef.current,
        isVideoOff: isVideoOffRef.current,
        videoFilter: videoFilterRef.current,
      });
    };

    // Socket Event: Meeting Ended by Host
    const handleMeetingEnded = () => {
      snackbar.info("The host has ended this meeting");
      leaveRoom();
    };

    socket.on("meeting:room-members", handleRoomMembers);
    socket.on("meeting:peer-joined", handlePeerJoined);
    socket.on("meeting:peer-left", handlePeerLeft);
    socket.on("meeting:signal-received", handleSignalReceived);
    socket.on("meeting:action-broadcast", handleActionBroadcast);
    socket.on("meeting:breakout-room-members", handleBreakoutRoomMembers);
    socket.on("meeting:breakout-peer-joined", handleBreakoutPeerJoined);
    socket.on("meeting:breakout-peer-left", handleBreakoutPeerLeft);
    socket.on("meeting:breakout-ended", handleBreakoutEnded);
    socket.on("meeting:ended", handleMeetingEnded);

    return () => {
      clearInterval(statsInterval);
      socket.off("meeting:room-members", handleRoomMembers);
      socket.off("meeting:peer-joined", handlePeerJoined);
      socket.off("meeting:peer-left", handlePeerLeft);
      socket.off("meeting:signal-received", handleSignalReceived);
      socket.off("meeting:action-broadcast", handleActionBroadcast);
      socket.off("meeting:breakout-room-members", handleBreakoutRoomMembers);
      socket.off("meeting:breakout-peer-joined", handleBreakoutPeerJoined);
      socket.off("meeting:breakout-peer-left", handleBreakoutPeerLeft);
      socket.off("meeting:breakout-ended", handleBreakoutEnded);
      socket.off("meeting:ended", handleMeetingEnded);
    };
  }, [
    meetingId,
    resolvedUserId,
    rawUserName,
    rawName,
    myProfileAvatar,
    selectedAudioInput,
    selectedVideo,
    createPeerConnection,
    closePeerConnection,
    leaveRoom,
  ]);

  // Media Controls: Microphone Mute/Unmute
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    const nextMuted = !isMuted;
    if (audioTrack) {
      audioTrack.enabled = !nextMuted;
    }
    setIsMuted(nextMuted);
    socketRef.current?.emit("meeting:action", {
      meetingId,
      action: nextMuted ? "mute" : "unmute",
      isMuted: nextMuted,
    });
  }, [isMuted, meetingId]);

  // Media Controls: Camera Video Toggle
  const toggleVideo = useCallback(async () => {
    if (!localStreamRef.current) return;
    const nextVideoOff = !isVideoOff;

    if (!nextVideoOff) {
      let videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState === "ended") {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
          });
          const newTrack = videoStream.getVideoTracks()[0];
          if (newTrack) {
            localStreamRef.current.addTrack(newTrack);
            videoTrack = newTrack;
            Object.keys(peerConnections.current).forEach((sid) => {
              if (cameraSendersRef.current[sid]) {
                cameraSendersRef.current[sid].replaceTrack(newTrack).catch(() => null);
              } else {
                try {
                  cameraSendersRef.current[sid] = peerConnections.current[sid].addTrack(newTrack, localStreamRef.current);
                } catch {}
              }
            });
          }
        } catch (e) {
          console.warn("[MeetWebRTC] Toggle video reacquire error:", e);
        }
      } else {
        videoTrack.enabled = true;
      }
      setIsVideoOff(false);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      socketRef.current?.emit("meeting:action", {
        meetingId,
        action: "video-on",
        isVideoOff: false,
      });
    } else {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = false;
      }
      setIsVideoOff(true);
      socketRef.current?.emit("meeting:action", {
        meetingId,
        action: "video-off",
        isVideoOff: true,
      });
    }
  }, [isVideoOff, meetingId, selectedVideo]);

  // Media Controls: Screen Share Toggle
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {}
        });
        screenStreamRef.current = null;
      }
      setScreenStream(null);
      setIsScreenSharing(false);

      Object.keys(peerConnections.current).forEach((sid) => {
        const sender = screenSendersRef.current[sid];
        const pc = peerConnections.current[sid];
        if (sender && pc) {
          try {
            pc.removeTrack(sender);
          } catch {}
          delete screenSendersRef.current[sid];
        }
      });

      socketRef.current?.emit("meeting:action", {
        meetingId,
        action: "screen-stop",
        isScreenSharing: false,
      });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_SHARE_CONSTRAINTS);
        screenStreamRef.current = stream;
        setScreenStream(stream);
        setIsScreenSharing(true);

        const screenVideoTrack = stream.getVideoTracks()[0];
        screenVideoTrack.onended = () => {
          toggleScreenShareRef.current?.();
        };

        Object.keys(peerConnections.current).forEach((sid) => {
          const pc = peerConnections.current[sid];
          if (pc && screenVideoTrack) {
            try {
              const sender = pc.addTrack(screenVideoTrack, stream);
              screenSendersRef.current[sid] = sender;
            } catch (e) {
              console.warn("[MeetWebRTC] addTrack screen share error:", e);
            }
          }
        });

        socketRef.current?.emit("meeting:action", {
          meetingId,
          action: "screen-start",
          isScreenSharing: true,
          streamId: stream.id,
        });
      } catch (err) {
        console.warn("[MeetWebRTC] Screen share aborted:", err?.message);
      }
    }
  }, [isScreenSharing, meetingId]);

  useEffect(() => {
    toggleScreenShareRef.current = toggleScreenShare;
  }, [toggleScreenShare]);

  // Media Controls: Raise / Lower Hand
  const toggleHand = useCallback(() => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    const now = nextState ? Date.now() : null;
    setHandRaisedAt(now);

    socketRef.current?.emit("meeting:action", {
      meetingId,
      action: nextState ? "hand" : "lower-hand",
      isHandRaised: nextState,
      raisedAt: now,
    });
  }, [isHandRaised, meetingId]);

  // Media Controls: Video Filter & Virtual Backgrounds
  const changeVideoFilter = useCallback(
    (filterName, customImageUrl = null) => {
      setVideoFilter(filterName);
      if (videoProcessorRef.current) {
        videoProcessorRef.current.setEffect(filterName, customImageUrl);
        const pTrack = videoProcessorRef.current.getProcessedVideoTrack();
        if (pTrack && !isVideoOff) {
          Object.keys(peerConnections.current).forEach((sid) => {
            if (cameraSendersRef.current[sid]) {
              cameraSendersRef.current[sid].replaceTrack(pTrack).catch(() => null);
            }
          });
        }
      }
      socketRef.current?.emit("meeting:action", {
        meetingId,
        action: "filter",
        videoFilter: filterName,
      });
    },
    [meetingId, isVideoOff]
  );

  // Media Controls: Mobile Flip Camera (Front Selfie <-> Rear Back Environment)
  const flipCamera = useCallback(async () => {
    if (isVideoOff) return;
    try {
      const nextFacingMode = facingMode === "user" ? "environment" : "user";
      const constraints = {
        video: {
          facingMode: { ideal: nextFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return;

      // Stop previous raw video track
      if (rawStreamRef.current) {
        const oldTrack = rawStreamRef.current.getVideoTracks()[0];
        if (oldTrack) oldTrack.stop();
      }

      rawStreamRef.current = new MediaStream([
        ...(rawStreamRef.current ? rawStreamRef.current.getAudioTracks() : []),
        newVideoTrack,
      ]);

      if (localStreamRef.current) {
        const oldLocalVideoTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldLocalVideoTrack) {
          localStreamRef.current.removeTrack(oldLocalVideoTrack);
          oldLocalVideoTrack.stop();
        }
        localStreamRef.current.addTrack(newVideoTrack);
      }

      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      setFacingMode(nextFacingMode);

      // Seamlessly replace camera track across all active peer connections
      Object.keys(peerConnections.current).forEach((sid) => {
        const sender = cameraSendersRef.current[sid];
        if (sender) {
          sender.replaceTrack(newVideoTrack).catch((err) => {
            console.warn("[MeetWebRTC] replaceTrack error during flip:", err?.message);
          });
        }
      });

      snackbar.info(`Switched to ${nextFacingMode === "user" ? "Front" : "Back"} camera 🔄`);
    } catch (err) {
      console.warn("[MeetWebRTC] Failed to flip camera:", err?.message);
      snackbar.warning("Unable to switch camera on this device.");
    }
  }, [facingMode, isVideoOff]);

  // Screen WakeLock API (Prevents mobile screen from dimming or locking during active meeting)
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator && isMediaReady) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch (err) {
        console.warn("[MeetWebRTC] Screen WakeLock unavailable:", err?.message);
      }
    };
    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (wakeLock) {
        wakeLock.release().catch(() => null);
      }
    };
  }, [isMediaReady]);

  // Mobile Background Tab Video Saver (Keep audio active, throttle camera encoding)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!localStreamRef.current) return;
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (!videoTrack) return;

      if (document.hidden) {
        if (videoTrack.enabled && !isVideoOff) {
          videoTrack.enabled = false;
        }
      } else {
        if (!isVideoOff) {
          videoTrack.enabled = true;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isVideoOff]);

  return {
    localStream,
    screenStream,
    peers,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isHandRaised,
    handRaisedAt,
    activeSpeaker,
    connectionQuality,
    videoFilter,
    facingMode,
    isFrontCamera: facingMode === "user",
    isMediaReady,
    audioInputDevices,
    videoDevices,
    audioOutputDevices,
    selectedAudioInput,
    setSelectedAudioInput,
    selectedVideo,
    setSelectedVideo,
    selectedAudioOutput,
    setSelectedAudioOutput,
    toggleMute,
    toggleVideo,
    flipCamera,
    toggleScreenShare,
    toggleHand,
    changeVideoFilter,
    leaveRoom,
  };
};

export default useMeetWebRTC;
