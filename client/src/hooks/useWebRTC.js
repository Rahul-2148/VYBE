import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "../lib/socket";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import { playJoinSound, playLeaveSound, playHandRaiseSound } from "../lib/sounds";

/**
 * useWebRTC - Production WebRTC hook for VYBE
 *
 * Critical lifecycle:
 * 1. Fetch TURN credentials (once, stored in ref)
 * 2. Acquire local media (camera + mic)
 * 3. Only AFTER media is ready, join the signaling room
 * 4. On room-members event, create PCs to all existing peers
 * 5. On peer-joined event, create PC to the new peer
 * 6. Perfect Negotiation handles glare
 * 7. On unmount, leave room and clean up everything
 */
export const useWebRTC = (room, currentUserId, type = "video") => {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({}); // { socketId: { stream, userId, muted, videoOff, screenSharing } }
  const isAudioOnly = type === "voice" || type === "audio";
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(isAudioOnly);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [videoFilter, setVideoFilter] = useState("none");
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [isMediaReady, setIsMediaReady] = useState(false);

  const toggleHand = useCallback(() => {
    const newValue = !isHandRaised;
    setIsHandRaised(newValue);
    socketRef.current?.emit("call:action", { room, action: "hand", value: newValue });
    if (newValue) {
      playHandRaiseSound();
    }
  }, [isHandRaised, room]);

  const changeVideoFilter = useCallback((filterName) => {
    setVideoFilter(filterName);
    socketRef.current?.emit("call:action", { room, action: "filter", value: filterName });
  }, [room]);

  // Refs — these do NOT trigger re-renders or effect re-runs
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnections = useRef({}); // { socketId: RTCPeerConnection }
  const screenStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const iceServersRef = useRef([
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ]);
  const makingOfferRef = useRef({});
  const ignoreOfferRef = useRef({});
  const queuedCandidatesRef = useRef({});
  const hasJoinedRoomRef = useRef(false);
  const cleanedUpRef = useRef(false);

  // ========== STEP 1: Fetch TURN credentials once ==========
  useEffect(() => {
    let cancelled = false;
    const fetchTurn = async () => {
      try {
        const res = await api.get("/call/turn-credentials");
        if (!cancelled && res.data?.success && res.data.iceServers) {
          iceServersRef.current = res.data.iceServers;
          console.log("[WebRTC] TURN credentials loaded:", res.data.iceServers.length, "servers");
        }
      } catch (err) {
        console.warn("[WebRTC] Could not fetch TURN credentials, using STUN fallback:", err.message);
      }
    };
    fetchTurn();
    return () => { cancelled = true; };
  }, []);

  // ========== Device enumeration ==========
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioIns = devices.filter((d) => d.kind === "audioinput");
      const videoDevs = devices.filter((d) => d.kind === "videoinput");
      const audioOuts = devices.filter((d) => d.kind === "audiooutput");

      setAudioInputDevices(audioIns);
      setVideoDevices(videoDevs);
      setAudioOutputDevices(audioOuts);

      if (audioIns.length > 0 && !selectedAudioInput) setSelectedAudioInput(audioIns[0].deviceId);
      if (videoDevs.length > 0 && !selectedVideo) setSelectedVideo(videoDevs[0].deviceId);
      if (audioOuts.length > 0 && !selectedAudioOutput) setSelectedAudioOutput(audioOuts[0].deviceId);
    } catch (err) {
      console.error("[WebRTC] Error enumerating devices:", err);
    }
  }, [selectedAudioInput, selectedVideo, selectedAudioOutput]);

  // ========== Audio analysis for active speaker ==========
  const setupAudioAnalysis = useCallback((stream) => {
    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const average = sum / bufferLength;
        if (average > 30) setActiveSpeaker(currentUserId);
        setTimeout(checkVolume, 300);
      };
      checkVolume();
    } catch (e) {
      console.warn("[WebRTC] Could not setup audio analysis:", e);
    }
  }, [currentUserId]);

  // ========== STEP 2: Acquire media ==========
  useEffect(() => {
    let cancelled = false;

    const acquireMedia = async () => {
      try {
        const constraints = {
          audio: true,
          video: isAudioOnly ? false : { width: 1280, height: 720 },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setupAudioAnalysis(stream);
        await enumerateDevices();
        setIsMediaReady(true);
        console.log("[WebRTC] Local media acquired:", stream.getTracks().map((t) => t.kind).join(", "));
      } catch (error) {
        console.error("[WebRTC] Failed to access media devices:", error);
        snackbar.error("Failed to access camera or microphone. Please check permissions.");
        // Still allow joining (audio-only or receive-only)
        setIsMediaReady(true);
      }
    };

    acquireMedia();
    return () => { cancelled = true; };
  }, [setupAudioAnalysis, enumerateDevices, isAudioOnly]);

  // ========== Create Peer Connection ==========
  const createPeerConnection = useCallback((remoteSocketId, remoteUserId) => {
    // Don't create duplicate PCs
    if (peerConnections.current[remoteSocketId]) {
      console.warn(`[WebRTC] PC already exists for ${remoteSocketId}, reusing`);
      return peerConnections.current[remoteSocketId];
    }

    console.log(`[WebRTC] Creating PeerConnection to ${remoteSocketId} (user: ${remoteUserId})`);
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    peerConnections.current[remoteSocketId] = pc;

    // Add local tracks to the peer connection
    let videoAdded = false;
    if (screenStreamRef.current) {
      const screenTrack = screenStreamRef.current.getVideoTracks()[0];
      if (screenTrack) {
        pc.addTrack(screenTrack, screenStreamRef.current);
        videoAdded = true;
      }
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        if (track.kind === "video") {
          if (!videoAdded) {
            pc.addTrack(track, localStreamRef.current);
            videoAdded = true;
          }
        } else {
          pc.addTrack(track, localStreamRef.current);
        }
      });
    }

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("call:signal", {
          toSocketId: remoteSocketId,
          signal: { type: "candidate", candidate: event.candidate },
        });
      }
    };

    // Remote tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      setPeers((prev) => ({
        ...prev,
        [remoteSocketId]: {
          ...prev[remoteSocketId],
          userId: remoteUserId || prev[remoteSocketId]?.userId,
          stream,
        },
      }));
    };

    // ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE state for ${remoteSocketId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === "disconnected") {
        console.warn(`[WebRTC] ICE disconnected for ${remoteSocketId}, attempting restart`);
        pc.restartIce();
      }
      if (pc.iceConnectionState === "failed") {
        console.error(`[WebRTC] ICE failed for ${remoteSocketId}`);
        pc.restartIce();
      }
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state for ${remoteSocketId}: ${pc.connectionState}`);
    };

    // Perfect Negotiation: onnegotiationneeded
    pc.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current[remoteSocketId] = true;
        const offer = await pc.createOffer();
        if (pc.signalingState !== "stable") {
          console.warn(`[WebRTC] Signaling state not stable during offer creation, aborting`);
          return;
        }
        await pc.setLocalDescription(offer);
        console.log(`[WebRTC] Sending offer to ${remoteSocketId}`);
        socketRef.current?.emit("call:signal", {
          toSocketId: remoteSocketId,
          signal: { type: "offer", sdp: pc.localDescription },
        });
      } catch (e) {
        console.error("[WebRTC] Negotiation error:", e);
      } finally {
        makingOfferRef.current[remoteSocketId] = false;
      }
    };

    // Initialize peer state
    setPeers((prev) => ({
      ...prev,
      [remoteSocketId]: {
        ...prev[remoteSocketId],
        userId: remoteUserId,
        stream: prev[remoteSocketId]?.stream || null,
      },
    }));

    return pc;
  }, []);

  // ========== STEP 3: Join room ONLY after media is ready ==========
  useEffect(() => {
    if (!isMediaReady || !room) return;

    const socket = getSocket();
    if (!socket) {
      console.error("[WebRTC] No socket available");
      return;
    }
    // assignment to ref is intentional; silence immutability rule for this lifecycle assignment
    // eslint-disable-next-line react-hooks/immutability
    socketRef.current = socket;
    cleanedUpRef.current = false;

    console.log(`[WebRTC] Media ready, joining room: ${room}`);

    // ---- Socket event handlers ----

    // Server sends the list of who's already in the room
    const handleRoomMembers = ({ members }) => {
      console.log(`[WebRTC] Room has ${members.length} existing member(s)`);
      members.forEach(({ socketId, userId }) => {
        createPeerConnection(socketId, userId);
      });
    };

    // A new peer joined after us — create a PC to them
    const handlePeerJoined = ({ socketId, userId }) => {
      console.log(`[WebRTC] Peer joined: ${socketId} (user: ${userId})`);
      createPeerConnection(socketId, userId);
      playJoinSound();
    };

    // Handle signals with Perfect Negotiation
    const handleSignalReceived = async ({ fromSocketId, fromUserId, signal }) => {
      let pc = peerConnections.current[fromSocketId];
      if (!pc) {
        pc = createPeerConnection(fromSocketId, fromUserId);
      }

      // Polite peer = the one with the lexicographically smaller socket ID
      const polite = socket.id < fromSocketId;

      try {
        if (signal.type === "offer") {
          const sdp = signal.sdp || signal;
          const offerCollision = makingOfferRef.current[fromSocketId] || pc.signalingState !== "stable";

          ignoreOfferRef.current[fromSocketId] = !polite && offerCollision;
          if (ignoreOfferRef.current[fromSocketId]) {
            console.warn(`[WebRTC] Glare: impolite peer ignoring offer from ${fromSocketId}`);
            return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log(`[WebRTC] Sending answer to ${fromSocketId}`);
          socket.emit("call:signal", {
            toSocketId: fromSocketId,
            signal: { type: "answer", sdp: pc.localDescription },
          });

          // Drain queued candidates
          const queued = queuedCandidatesRef.current[fromSocketId] || [];
          queuedCandidatesRef.current[fromSocketId] = [];
          for (const cand of queued) {
            await pc.addIceCandidate(cand).catch(() => null);
          }

        } else if (signal.type === "answer") {
          const sdp = signal.sdp || signal;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));

          // Drain queued candidates
          const queued = queuedCandidatesRef.current[fromSocketId] || [];
          queuedCandidatesRef.current[fromSocketId] = [];
          for (const cand of queued) {
            await pc.addIceCandidate(cand).catch(() => null);
          }

        } else if (signal.type === "candidate") {
          const candidate = new RTCIceCandidate(signal.candidate);
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(candidate).catch(() => null);
          } else {
            if (!queuedCandidatesRef.current[fromSocketId]) {
              queuedCandidatesRef.current[fromSocketId] = [];
            }
            queuedCandidatesRef.current[fromSocketId].push(candidate);
          }
        }
      } catch (err) {
        console.error("[WebRTC] Signal handling failed:", err);
      }
    };

    // Peer left
    const handlePeerLeft = ({ socketId }) => {
      console.log(`[WebRTC] Peer left: ${socketId}`);
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      // Clean up refs
      delete makingOfferRef.current[socketId];
      delete ignoreOfferRef.current[socketId];
      delete queuedCandidatesRef.current[socketId];
      setPeers((prev) => {
        const copy = { ...prev };
        delete copy[socketId];
        return copy;
      });
      playLeaveSound();
    };

    // Action broadcasts (mute, video, screen share, hand raise, filter)
    const handleActionBroadcast = ({ userId, action, value }) => {
      setPeers((prev) => {
        // Find the socketId that matches this userId
        const entry = Object.entries(prev).find(([, data]) => data.userId === userId);
        if (!entry) return prev;
        const [sid, data] = entry;
        const key =
          action === "mute"
            ? "muted"
            : action === "video"
            ? "videoOff"
            : action === "screen"
            ? "screenSharing"
            : action === "hand"
            ? "handRaised"
            : action === "filter"
            ? "videoFilter"
            : action;

        if (action === "hand" && value) {
          playHandRaiseSound();
        }

        return { ...prev, [sid]: { ...data, [key]: value } };
      });
    };

    // Register listeners
    socket.on("call:room-members", handleRoomMembers);
    socket.on("call:peer-joined", handlePeerJoined);
    socket.on("call:signal-received", handleSignalReceived);
    socket.on("call:peer-left", handlePeerLeft);
    socket.on("call:action-broadcast", handleActionBroadcast);

    // Join the room NOW that media is ready
    socket.emit("call:join-room", { room });
    hasJoinedRoomRef.current = true;

    // ---- Cleanup ----
    return () => {
      if (cleanedUpRef.current) return;
      cleanedUpRef.current = true;

      console.log("[WebRTC] Cleaning up...");
      socket.off("call:room-members", handleRoomMembers);
      socket.off("call:peer-joined", handlePeerJoined);
      socket.off("call:signal-received", handleSignalReceived);
      socket.off("call:peer-left", handlePeerLeft);
      socket.off("call:action-broadcast", handleActionBroadcast);

      // Leave room
      if (hasJoinedRoomRef.current) {
        socket.emit("call:leave-room", { room });
        hasJoinedRoomRef.current = false;
      }

      // Close all peer connections
      Object.keys(peerConnections.current).forEach((sid) => {
        peerConnections.current[sid].close();
      });
      peerConnections.current = {};
      makingOfferRef.current = {};
      ignoreOfferRef.current = {};
      queuedCandidatesRef.current = {};

      // Stop local media
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => null);
        audioContextRef.current = null;
      }
      analyserRef.current = null;

      setLocalStream(null);
      setPeers({});
      setIsScreenSharing(false);
      setIsMediaReady(false);
    };
  }, [isMediaReady, room, createPeerConnection]);

  // ========== Device switching ==========
  const switchDevice = useCallback(async (audioId, videoId) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints = {
        audio: audioId ? { deviceId: { exact: audioId } } : true,
        video: isAudioOnly ? false : (videoId ? { deviceId: { exact: videoId }, width: 1280, height: 720 } : true),
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Replace tracks in all active peer connections
      Object.keys(peerConnections.current).forEach((socketId) => {
        const pc = peerConnections.current[socketId];
        const senders = pc.getSenders();
        stream.getTracks().forEach((track) => {
          const sender = senders.find((s) => s.track && s.track.kind === track.kind);
          if (sender) {
            sender.replaceTrack(track);
          }
        });
      });

      return stream;
    } catch (error) {
      console.error("[WebRTC] Failed to switch device:", error);
      snackbar.error("Failed to switch device");
    }
  }, []);

  // React to device selection changes
  useEffect(() => {
    if (!isMediaReady) return;
    if (selectedAudioInput || selectedVideo) {
      // Defer switching device to avoid calling setState synchronously inside effect
      setTimeout(() => switchDevice(selectedAudioInput, selectedVideo), 0);
    }
  }, [selectedAudioInput, selectedVideo, isMediaReady, switchDevice]);

  // ========== Media controls ==========
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted; // flip it
        setIsMuted(!isMuted);
        socketRef.current?.emit("call:action", { room, action: "mute", value: !isMuted });
      }
    }
  }, [isMuted, room]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff;
        setIsVideoOff(!isVideoOff);
        socketRef.current?.emit("call:action", { room, action: "video", value: !isVideoOff });
      }
    }
  }, [isVideoOff, room]);

  const stopScreenSharing = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    // Restore camera track
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      Object.keys(peerConnections.current).forEach((socketId) => {
        const pc = peerConnections.current[socketId];
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          if (videoTrack) {
            sender.replaceTrack(videoTrack);
          } else {
            pc.removeTrack(sender);
          }
        }
      });
    } else {
      Object.keys(peerConnections.current).forEach((socketId) => {
        const pc = peerConnections.current[socketId];
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) {
          pc.removeTrack(sender);
        }
      });
    }

    setIsScreenSharing(false);
    socketRef.current?.emit("call:action", { room, action: "screen", value: false });
  }, [room]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        const screenTrack = stream.getVideoTracks()[0];

        // Replace video track in all peer connections
        Object.keys(peerConnections.current).forEach((socketId) => {
          const pc = peerConnections.current[socketId];
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          } else {
            pc.addTrack(screenTrack, stream);
          }
        });

        screenTrack.onended = () => stopScreenSharing();
        setIsScreenSharing(true);
        socketRef.current?.emit("call:action", { room, action: "screen", value: true });
      } else {
        stopScreenSharing();
      }
    } catch (err) {
      console.error("[WebRTC] Screen share failed:", err);
      snackbar.error("Failed to share screen");
    }
  }, [isScreenSharing, room]);

  

 

  // ========== Explicit leave for external callers ==========
  const leaveRoom = useCallback(() => {
    if (cleanedUpRef.current) return;
    cleanedUpRef.current = true;

    socketRef.current?.emit("call:leave-room", { room });
    hasJoinedRoomRef.current = false;

    Object.keys(peerConnections.current).forEach((sid) => {
      peerConnections.current[sid].close();
    });
    peerConnections.current = {};

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => null);
      audioContextRef.current = null;
    }
    analyserRef.current = null;

    setLocalStream(null);
    setPeers({});
    setIsScreenSharing(false);
  }, [room]);

  return {
    localStream,
    peers,
    audioInputDevices,
    videoDevices,
    audioOutputDevices,
    selectedAudioInput,
    setSelectedAudioInput,
    selectedVideo,
    setSelectedVideo,
    selectedAudioOutput,
    setSelectedAudioOutput,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isHandRaised,
    videoFilter,
    activeSpeaker,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleHand,
    changeVideoFilter,
    leaveRoom,
  };
};
