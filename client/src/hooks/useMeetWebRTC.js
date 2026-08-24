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
import { playJoinSound, playLeaveSound, playHandRaiseSound } from "../lib/sounds";

/**
 * useMeetWebRTC - Enterprise Multi-Party Mesh WebRTC Engine for Vybe Meet
 * Implements Perfect Negotiation, Opus HD 64kbps SDP Tuning, Hardware AEC,
 * Reliable Candidate Queuing, Multi-Track Separation & Resilient State Management.
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

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
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
    refreshDevices();
  }, [refreshDevices]);

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

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      screenStreamRef.current = null;
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

        if (initialOptions.isMuted) {
          stream.getAudioTracks().forEach((t) => (t.enabled = false));
        }

        if (initialOptions.isVideoOff) {
          stream.getVideoTracks().forEach((t) => (t.enabled = false));
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsMediaReady(true);

        // Voice activity detector for active speaker indicator
        vadCleanupRef.current = createVoiceActivityDetector(stream, (volume) => {
          if (volume > 25 && !isMuted) {
            setActiveSpeaker(currentUserId || "me");
          }
        });

        // Join Meeting Room via Socket
        socket?.emit("meeting:join-room", {
          meetingId,
          userName: rawUserName,
          name: rawName,
          profilePicture: myProfileAvatar,
          isMuted: Boolean(initialOptions.isMuted),
          isVideoOff: Boolean(initialOptions.isVideoOff),
          videoFilter: initialOptions.videoFilter || "none",
        });

        if (initialOptions.isMuted) {
          socket?.emit("meeting:action", { meetingId, action: "mute", isMuted: true });
        }
        if (initialOptions.isVideoOff) {
          socket?.emit("meeting:action", { meetingId, action: "video-off", isVideoOff: true });
        }
      } catch (err) {
        console.error("[MeetWebRTC] Media init error:", err);
        snackbar.error("Microphone/camera permissions required to join meeting");
      }
    };

    startMeeting();

    const myResolvedId = (currentUserId || userData?.user?._id || userData?._id)?.toString();

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
      const { socketId, action, streamId, isHandRaised: peerHandRaised, isScreenSharing: peerScreen, videoFilter: peerFilter, isMuted: peerMuted, isVideoOff: peerVideoOff, raisedAt } = data;
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

    // Socket Event: Meeting Ended by Host
    const handleMeetingEnded = () => {
      snackbar.info("The host has ended this meeting");
      leaveRoom();
    };

    socket?.on("meeting:room-members", handleRoomMembers);
    socket?.on("meeting:peer-joined", handlePeerJoined);
    socket?.on("meeting:peer-left", handlePeerLeft);
    socket?.on("meeting:signal-received", handleSignalReceived);
    socket?.on("meeting:action-broadcast", handleActionBroadcast);
    socket?.on("meeting:ended", handleMeetingEnded);

    return () => {
      socket?.off("meeting:room-members", handleRoomMembers);
      socket?.off("meeting:peer-joined", handlePeerJoined);
      socket?.off("meeting:peer-left", handlePeerLeft);
      socket?.off("meeting:signal-received", handleSignalReceived);
      socket?.off("meeting:action-broadcast", handleActionBroadcast);
      socket?.off("meeting:ended", handleMeetingEnded);
      leaveRoom();
    };
  }, [
    meetingId,
    currentUserId,
    rawUserName,
    rawName,
    myProfileAvatar,
    selectedAudioInput,
    selectedVideo,
    initialOptions.isMuted,
    initialOptions.isVideoOff,
    initialOptions.videoFilter,
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
          toggleScreenShare();
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

  // Media Controls: Video Filter
  const changeVideoFilter = useCallback(
    (filterName) => {
      setVideoFilter(filterName);
      socketRef.current?.emit("meeting:action", {
        meetingId,
        action: "filter",
        videoFilter: filterName,
      });
    },
    [meetingId]
  );

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
    toggleScreenShare,
    toggleHand,
    changeVideoFilter,
    leaveRoom,
  };
};

export default useMeetWebRTC;
