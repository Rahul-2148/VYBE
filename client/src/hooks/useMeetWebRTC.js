import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { getSocket } from "../lib/socket";
import { snackbar } from "../lib/snackbar";
import {
  getIceServers,
  STUDIO_AUDIO_CONSTRAINTS,
  SCREEN_SHARE_CONSTRAINTS,
  enumerateDevices,
  createVoiceActivityDetector,
} from "../lib/webrtcCore";
import { playJoinSound, playLeaveSound, playHandRaiseSound } from "../lib/sounds";

/**
 * useMeetWebRTC - Multi-Participant Mesh WebRTC Engine for Vybe Meet
 * Dedicated to Google Meet-style multi-party video conferencing.
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
  // peers: { [socketId]: { userId, userName, name, profilePicture, stream, screenStream, muted, videoOff, screenSharing, handRaised, videoFilter } }
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

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnections = useRef({}); // { socketId: RTCPeerConnection }
  const cameraSendersRef = useRef({}); // { socketId: RTCRtpSender }
  const audioSendersRef = useRef({}); // { socketId: RTCRtpSender }
  const screenSendersRef = useRef({}); // { socketId: RTCRtpSender }
  const iceServersRef = useRef([{ urls: "stun:stun.l.google.com:19302" }]);
  const makingOfferRef = useRef({});
  const ignoreOfferRef = useRef({});
  const queuedCandidatesRef = useRef({});
  const cleanedUpRef = useRef(false);

  // 1. Fetch ICE / TURN servers
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

  // 2. Enumerate audio & video devices
  const refreshDevices = useCallback(async () => {
    const { audioInputs, videoInputs, audioOutputs } = await enumerateDevices();
    setAudioInputDevices(audioInputs);
    setVideoDevices(videoInputs);
    setAudioOutputDevices(audioOutputs);
    if (audioInputs.length > 0 && !selectedAudioInput) setSelectedAudioInput(audioInputs[0].deviceId);
    if (videoInputs.length > 0 && !selectedVideo) setSelectedVideo(videoInputs[0].deviceId);
    if (audioOutputs.length > 0 && !selectedAudioOutput) setSelectedAudioOutput(audioOutputs[0].deviceId);
  }, [selectedAudioInput, selectedVideo, selectedAudioOutput]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Clean peer connection helper
  const closePeerConnection = useCallback((socketId) => {
    const pc = peerConnections.current[socketId];
    if (pc) {
      try {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.close();
      } catch {}
      delete peerConnections.current[socketId];
    }
    delete cameraSendersRef.current[socketId];
    delete audioSendersRef.current[socketId];
    delete screenSendersRef.current[socketId];
    delete makingOfferRef.current[socketId];
    delete ignoreOfferRef.current[socketId];
    delete queuedCandidatesRef.current[socketId];
  }, []);

  // Teardown all resources
  const leaveRoom = useCallback(() => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;

    const socket = socketRef.current;
    if (socket && meetingId) {
      socket.emit("meeting:leave-room", { meetingId });
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
  }, [meetingId, closePeerConnection]);

  // Create Peer Connection with perfect negotiation
  const createPeerConnection = useCallback(
    (socketId, isInitiator, memberMetadata = {}) => {
      if (peerConnections.current[socketId]) {
        return peerConnections.current[socketId];
      }

      const socket = socketRef.current;
      const pc = new RTCPeerConnection({
        iceServers: iceServersRef.current,
        iceCandidatePoolSize: 2,
      });

      peerConnections.current[socketId] = pc;
      makingOfferRef.current[socketId] = false;
      ignoreOfferRef.current[socketId] = false;
      queuedCandidatesRef.current[socketId] = [];

      // Add local audio and video tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          const sender = pc.addTrack(track, localStreamRef.current);
          if (track.kind === "video") cameraSendersRef.current[socketId] = sender;
          if (track.kind === "audio") audioSendersRef.current[socketId] = sender;
        });
      }

      // Add screen share tracks if active
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => {
          const sender = pc.addTrack(track, screenStreamRef.current);
          if (track.kind === "video") screenSendersRef.current[socketId] = sender;
        });
      }

      // Handle remote incoming tracks
      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        const track = event.track;

        setPeers((prev) => {
          const existing = prev[socketId] || {
            socketId,
            userId: memberMetadata.userId || null,
            userName: memberMetadata.userName || "Participant",
            name: memberMetadata.name || "",
            profilePicture: memberMetadata.profilePicture || null,
            isVerified: memberMetadata.isVerified || false,
            muted: false,
            videoOff: false,
            screenSharing: false,
            handRaised: false,
            videoFilter: "none",
          };

          // Detect whether track is screen share or camera
          const isDisplayTrack =
            track.kind === "video" &&
            (existing.screenSharing || event.streams[0]?.id?.includes("screen") || track.label?.includes("screen"));

          if (isDisplayTrack) {
            return {
              ...prev,
              [socketId]: {
                ...existing,
                screenStream: stream,
                screenSharing: true,
              },
            };
          }

          return {
            ...prev,
            [socketId]: {
              ...existing,
              stream: stream,
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
            signal: { candidate: event.candidate },
          });
        }
      };

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

      // Perfect Negotiation
      if (isInitiator) {
        pc.onnegotiationneeded = async () => {
          try {
            makingOfferRef.current[socketId] = true;
            const offer = await pc.createOffer();
            if (pc.signalingState !== "stable") return;
            await pc.setLocalDescription(offer);
            socket?.emit("meeting:signal", {
              meetingId,
              toSocketId: socketId,
              signal: { sdp: pc.localDescription },
            });
          } catch (err) {
            console.error("[MeetWebRTC] Negotiation error:", err);
          } finally {
            makingOfferRef.current[socketId] = false;
          }
        };
      }

      return pc;
    },
    [meetingId, closePeerConnection]
  );

  // Initialize Meeting Room Media & Socket Listeners
  useEffect(() => {
    if (!meetingId) return;
    cleanedUpRef.current = false;
    const socket = getSocket();
    socketRef.current = socket;

    const startMeeting = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: STUDIO_AUDIO_CONSTRAINTS,
          video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
        });

        if (isMuted) {
          const audioTrack = stream.getAudioTracks()[0];
          if (audioTrack) audioTrack.enabled = false;
        }

        if (isVideoOff) {
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) videoTrack.enabled = false;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Voice activity detector
        createVoiceActivityDetector(stream, (volume) => {
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
        });
      } catch (err) {
        console.error("[MeetWebRTC] Media init error:", err);
        snackbar.error("Could not access camera/microphone");
      }
    };

    startMeeting();

    // Socket Event: Room Members list received
    const handleRoomMembers = ({ members }) => {
      console.log(`📹 [MeetWebRTC] Joined meeting with ${members?.length || 0} existing peers`);
      if (Array.isArray(members)) {
        members.forEach((member) => {
          if (member.socketId && member.socketId !== socket?.id) {
            setPeers((prev) => ({
              ...prev,
              [member.socketId]: {
                ...member,
                muted: false,
                videoOff: false,
                screenSharing: false,
                handRaised: false,
              },
            }));
            createPeerConnection(member.socketId, true, member);
          }
        });
      }
    };

    // Socket Event: New Peer Joined
    const handlePeerJoined = (data) => {
      console.log(`📹 [MeetWebRTC] New peer joined: @${data.userName}`);
      playJoinSound();
      snackbar.info(`@${data.userName} joined`);
      setPeers((prev) => ({
        ...prev,
        [data.socketId]: {
          ...data,
          muted: false,
          videoOff: false,
          screenSharing: false,
          handRaised: false,
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

    // Socket Event: WebRTC Signal Received
    const handleSignalReceived = async (data) => {
      const { fromSocketId, signal, fromMetadata } = data;
      if (!fromSocketId || !signal) return;

      let pc = peerConnections.current[fromSocketId];
      if (!pc) {
        pc = createPeerConnection(fromSocketId, false, fromMetadata || {});
      }

      try {
        if (signal.sdp) {
          const isOffer = signal.sdp.type === "offer";
          const offerCollision =
            isOffer && (makingOfferRef.current[fromSocketId] || pc.signalingState !== "stable");

          ignoreOfferRef.current[fromSocketId] = offerCollision;
          if (ignoreOfferRef.current[fromSocketId]) {
            console.log("[MeetWebRTC] Offer collision detected, ignoring");
            return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

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
            await pc.setLocalDescription(answer);
            socket?.emit("meeting:signal", {
              meetingId,
              toSocketId: fromSocketId,
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

    // Socket Event: Action Broadcast (mute, video, screen share, hand raise, reaction)
    const handleActionBroadcast = (data) => {
      const { socketId, action, streamId, hasAudio, isHandRaised: peerHandRaised, isScreenSharing: peerScreen, videoFilter: peerFilter, isMuted: peerMuted, isVideoOff: peerVideoOff } = data;
      if (!socketId) return;

      if (action === "hand") {
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
            videoFilter: peerFilter || target.videoFilter,
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
  }, [meetingId, currentUserId, rawUserName, rawName, myProfileAvatar, selectedVideo, isMuted, createPeerConnection, closePeerConnection, leaveRoom]);

  // Toggle Microphone
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = isMuted;
      setIsMuted(!isMuted);
      socketRef.current?.emit("meeting:action", {
        meetingId,
        action: isMuted ? "unmute" : "mute",
        isMuted: !isMuted,
      });
    }
  }, [isMuted, meetingId]);

  // Toggle Video Camera
  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
      socketRef.current?.emit("meeting:action", {
        meetingId,
        action: isVideoOff ? "video-on" : "video-off",
        isVideoOff: !isVideoOff,
      });
    }
  }, [isVideoOff, meetingId]);

  // Toggle Screen Sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop Screen Share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setScreenStream(null);
      setIsScreenSharing(false);

      // Remove screen tracks from peer connections
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
      // Start Screen Share
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_SHARE_CONSTRAINTS);
        screenStreamRef.current = stream;
        setScreenStream(stream);
        setIsScreenSharing(true);

        const screenVideoTrack = stream.getVideoTracks()[0];

        // Browser native "Stop sharing" listener
        screenVideoTrack.onended = () => {
          toggleScreenShare();
        };

        // Add screen tracks to all active peer connections
        Object.keys(peerConnections.current).forEach((sid) => {
          const pc = peerConnections.current[sid];
          if (pc) {
            const sender = pc.addTrack(screenVideoTrack, stream);
            screenSendersRef.current[sid] = sender;
          }
        });

        socketRef.current?.emit("meeting:action", {
          meetingId,
          action: "screen-start",
          isScreenSharing: true,
          streamId: stream.id,
        });
      } catch (err) {
        console.warn("[MeetWebRTC] Screen share cancelled/error:", err);
      }
    }
  }, [isScreenSharing, meetingId]);

  // Toggle Hand Raise
  const toggleHand = useCallback(() => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    setHandRaisedAt(nextState ? Date.now() : null);

    socketRef.current?.emit("meeting:action", {
      meetingId,
      action: nextState ? "hand" : "lower-hand",
      isHandRaised: nextState,
    });
  }, [isHandRaised, meetingId]);

  // Change Video Filter
  const changeVideoFilter = useCallback(
    (filterName) => {
      setVideoFilter(filterName);
      socketRef.current?.emit("meeting:action", {
        meetingId,
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
