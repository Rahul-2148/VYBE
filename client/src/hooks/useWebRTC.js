import { useEffect, useRef, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { getSocket } from "../lib/socket";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import { playJoinSound, playLeaveSound, playHandRaiseSound } from "../lib/sounds";
import { ULTRA_AUDIO_CONSTRAINTS, tuneOpusSdp, unlockAudioContext } from "../lib/webrtcCore";

/**
 * useWebRTC - Industry-Grade Multi-Track WebRTC Hook for VYBE
 *
 * Core Capabilities:
 * 1. Independent Simultaneous Camera + Screen Sharing (Multi-track)
 * 2. High-Definition Screen Capture (contentHint: "detail", 1080p/1440p 30-60fps)
 * 3. Studio Voice with Hardware Acoustic Echo Cancellation & Noise Suppression
 * 4. Opus SDP Tuning (Inband FEC + DTX for zero packet loss & ultra-low latency)
 * 5. Native Browser "Stop Sharing" Listener (screenTrack.onended)
 * 6. Glare-Proof Perfect Negotiation (Offer/Answer/Rollback State Machine)
 * 7. ICE Candidate Queueing & Resilient ICE Restart Recovery
 * 8. Clean Resource Teardown (Zero Memory Leaks)
 */

// High-Definition Screen Share Video Constraints
const SCREEN_SHARE_VIDEO_CONSTRAINTS = {
  width: { ideal: 1920, max: 2560 },
  height: { ideal: 1080, max: 1440 },
  frameRate: { ideal: 30, max: 60 },
  cursor: "always",
  displaySurface: "monitor",
};

export const useWebRTC = (room, currentUserId, type = "video", initialOptions = {}) => {
  const { userData } = useSelector((s) => s.user || {});
  const rawUserName = userData?.user?.userName || userData?.userName || "";
  const rawName = userData?.user?.name || userData?.name || "";
  const myProfileAvatar =
    userData?.user?.profileImage?.url ||
    userData?.profileImage?.url ||
    (typeof userData?.user?.profileImage === "string" ? userData.user.profileImage : "") ||
    (typeof userData?.profileImage === "string" ? userData.profileImage : "") ||
    userData?.user?.profilePicture?.url ||
    (typeof userData?.user?.profilePicture === "string" ? userData.user.profilePicture : "") ||
    userData?.profilePicture ||
    "";

  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  // peers: { [socketId]: { userId, stream (camera+mic), screenStream (display), muted, videoOff, screenSharing, screenStreamId, videoFilter, handRaised } }
  const [peers, setPeers] = useState({});
  const isAudioOnly = type === "voice" || type === "audio";

  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState(initialOptions.selectedAudioInput || "");
  const [selectedVideo, setSelectedVideo] = useState(initialOptions.selectedVideo || "");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState("");

  const [isMuted, setIsMuted] = useState(Boolean(initialOptions.isMuted));
  const [isVideoOff, setIsVideoOff] = useState(Boolean(initialOptions.isVideoOff || isAudioOnly));
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [handRaisedAt, setHandRaisedAt] = useState(null);
  const [videoFilter, setVideoFilter] = useState(initialOptions.videoFilter || "none");
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState("good"); // "good", "reconnecting", "poor"

  // Refs for WebRTC & Audio Context (Persistent lifecycle)
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnections = useRef({}); // { socketId: RTCPeerConnection }

  // Dedicated sender tracking for multi-track management
  const audioSendersRef = useRef({}); // { socketId: RTCRtpSender }
  const cameraSendersRef = useRef({}); // { socketId: RTCRtpSender }
  const screenSendersRef = useRef({}); // { socketId: RTCRtpSender }
  const screenAudioSendersRef = useRef({}); // { socketId: RTCRtpSender }

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const iceServersRef = useRef([
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ]);

  const makingOfferRef = useRef({});
  const ignoreOfferRef = useRef({});
  const queuedCandidatesRef = useRef({});
  const hasJoinedRoomRef = useRef(false);
  const cleanedUpRef = useRef(false);

  // ========== STEP 1: Fetch TURN credentials ==========
  useEffect(() => {
    let cancelled = false;
    const fetchTurn = async () => {
      try {
        const res = await api.get("/call/turn-credentials");
        if (!cancelled && res.data?.success && Array.isArray(res.data.iceServers) && res.data.iceServers.length > 0) {
          iceServersRef.current = res.data.iceServers;
        }
      } catch (err) {
        console.warn("[WebRTC] Using fallback STUN servers:", err.message);
      }
    };
    fetchTurn();
    return () => {
      cancelled = true;
    };
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
      console.warn("[WebRTC] Device enumeration error:", err);
    }
  }, [selectedAudioInput, selectedVideo, selectedAudioOutput]);

  // ========== Audio level analysis for active speaker indicator ==========
  const setupAudioAnalysis = useCallback((stream) => {
    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      unlockAudioContext(ctx);
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
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
      console.warn("[WebRTC] Audio analysis non-critical note:", e?.message);
    }
  }, [currentUserId]);

  // ========== STEP 2: Initial Media Acquisition ==========
  useEffect(() => {
    let cancelled = false;

    const acquireMedia = async () => {
      let stream;
      const audioConstraint = selectedAudioInput || initialOptions.selectedAudioInput
        ? { deviceId: { exact: selectedAudioInput || initialOptions.selectedAudioInput }, ...ULTRA_AUDIO_CONSTRAINTS }
        : ULTRA_AUDIO_CONSTRAINTS;
      const videoDeviceId = selectedVideo || initialOptions.selectedVideo;

      try {
        if (isAudioOnly) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraint,
              video: false,
            });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          }
        } else {
          // Tier 1: HD Video + Studio Noise-Cancelled Audio
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraint,
              video: videoDeviceId
                ? { deviceId: { exact: videoDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
                : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
            });
          } catch (e1) {
            console.warn("[WebRTC] HD tier failed, falling back to basic video...", e1.message);
            // Tier 2: Basic Video
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: audioConstraint,
                video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
              });
            } catch (e2) {
              console.warn("[WebRTC] Video capture failed, audio-only fallback...", e2.message);
              // Tier 3: Audio Only Fallback
              stream = await navigator.mediaDevices.getUserMedia({
                audio: audioConstraint,
                video: false,
              });
              setIsVideoOff(true);
            }
          }
        }

        if (cancelled) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }

        if (stream) {
          if (initialOptions.isMuted) {
            stream.getAudioTracks().forEach((t) => (t.enabled = false));
          }
          if (initialOptions.isVideoOff) {
            stream.getVideoTracks().forEach((t) => (t.enabled = false));
          }
          localStreamRef.current = stream;
          setLocalStream(stream);
          setupAudioAnalysis(stream);
          await enumerateDevices();
        }
      } catch (error) {
        console.error("[WebRTC] Failed to access media devices:", error);
        snackbar.error("Microphone/camera permissions required for call audio/video.");
      } finally {
        if (!cancelled) {
          setIsMediaReady(true);
        }
      }
    };

    acquireMedia();
    return () => {
      cancelled = true;
    };
  }, [setupAudioAnalysis, enumerateDevices, isAudioOnly, initialOptions.isMuted, initialOptions.isVideoOff, initialOptions.selectedAudioInput, initialOptions.selectedVideo]);

  // ========== Create Multi-Track Peer Connection ==========
  const createPeerConnection = useCallback((remoteSocketId, remoteUserId, metadata = {}) => {
    if (peerConnections.current[remoteSocketId]) {
      // If peer already exists, update metadata if available
      if (metadata && (metadata.userName || metadata.profilePicture)) {
        setPeers((prev) => {
          if (!prev[remoteSocketId]) return prev;
          return {
            ...prev,
            [remoteSocketId]: {
              ...prev[remoteSocketId],
              userName: metadata.userName || prev[remoteSocketId].userName,
              name: metadata.name || prev[remoteSocketId].name,
              profilePicture: metadata.profilePicture || prev[remoteSocketId].profilePicture,
            },
          };
        });
      }
      return peerConnections.current[remoteSocketId];
    }

    console.log(`[WebRTC] Initializing PeerConnection -> ${remoteSocketId} (${remoteUserId || "peer"})`, metadata);
    const pc = new RTCPeerConnection({
      iceServers: iceServersRef.current,
      iceCandidatePoolSize: 10,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });
    peerConnections.current[remoteSocketId] = pc;

    // 1. Add Microphone Audio track
    if (localStreamRef.current) {
      const micTrack = localStreamRef.current.getAudioTracks()[0];
      if (micTrack) {
        try {
          audioSendersRef.current[remoteSocketId] = pc.addTrack(micTrack, localStreamRef.current);
        } catch (e) {
          console.warn("[WebRTC] addTrack mic audio warning:", e.message);
        }
      }

      // 2. Add Camera Video track
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      if (cameraTrack) {
        try {
          cameraSendersRef.current[remoteSocketId] = pc.addTrack(cameraTrack, localStreamRef.current);
        } catch (e) {
          console.warn("[WebRTC] addTrack camera video warning:", e.message);
        }
      }
    }

    // 3. Add Screen Share tracks if actively sharing
    if (screenStreamRef.current) {
      const screenTrack = screenStreamRef.current.getVideoTracks()[0];
      if (screenTrack) {
        try {
          const sender = pc.addTrack(screenTrack, screenStreamRef.current);
          screenSendersRef.current[remoteSocketId] = sender;
          try {
            const params = sender.getParameters();
            if (params.encodings && params.encodings.length > 0) {
              params.encodings[0].maxBitrate = 8000000;
              params.encodings[0].maxFramerate = 60;
              params.encodings[0].scaleResolutionDownBy = 1.0;
              sender.setParameters(params).catch(() => null);
            }
          } catch {
            /* ignore sender parameter tuning error */
          }
        } catch (e) {
          console.warn("[WebRTC] addTrack screen video warning:", e.message);
        }
      }
      const screenAudioTrack = screenStreamRef.current.getAudioTracks()[0];
      if (screenAudioTrack) {
        try {
          screenAudioSendersRef.current[remoteSocketId] = pc.addTrack(screenAudioTrack, screenStreamRef.current);
        } catch (e) {
          console.warn("[WebRTC] addTrack screen audio warning:", e.message);
        }
      }
    }

    // ICE Candidate Exchange
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("call:signal", {
          toSocketId: remoteSocketId,
          fromUserId: currentUserId,
          fromMetadata: {
            userId: currentUserId,
            userName: rawUserName,
            name: rawName,
            profilePicture: myProfileAvatar,
          },
          signal: { type: "candidate", candidate: event.candidate },
        });
      }
    };

    // Remote Track Receiver (Handles both Camera Stream AND Screen Stream)
    pc.ontrack = (event) => {
      const track = event.track;
      if (!track) return;
      track.enabled = true;
      track.onunmute = () => {
        track.enabled = true;
      };

      // Ensure stream is never null/dropped even if event.streams is empty
      const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([track]);

      console.log(`[WebRTC] Received remote track (${track.kind}) in stream ${stream.id} from ${remoteSocketId}`);

      setPeers((prev) => {
        const existing = prev[remoteSocketId] || { userId: remoteUserId };
        const mainStream = existing.stream;

        // Determine if stream is screen share or camera:
        const isScreenStream =
          (existing.screenSharing && (existing.screenStreamId === stream.id || !existing.screenStream)) ||
          (mainStream && stream.id !== mainStream.id && track.kind === "video");

        const resolvedUserName =
          (existing.userName && existing.userName !== "Participant")
            ? existing.userName
            : (metadata.userName && metadata.userName !== "Participant")
            ? metadata.userName
            : (existing.userName || metadata.userName || "Participant");

        const resolvedName = existing.name || metadata.name || "";
        const resolvedProfilePicture = existing.profilePicture || metadata.profilePicture || null;

        if (isScreenStream) {
          return {
            ...prev,
            [remoteSocketId]: {
              ...existing,
              userId: remoteUserId || existing.userId,
              userName: resolvedUserName,
              name: resolvedName,
              profilePicture: resolvedProfilePicture,
              screenStream: stream,
              screenSharing: true,
            },
          };
        } else {
          // Merge track into existing main stream if available
          let targetStream = mainStream;
          if (targetStream && targetStream.id === stream.id) {
            if (!targetStream.getTracks().some((t) => t.id === track.id)) {
              targetStream.addTrack(track);
            }
          } else if (!targetStream) {
            targetStream = stream;
          } else {
            // New stream arrived from peer
            targetStream = stream;
          }

          // Ensure all tracks in stream are active
          targetStream.getTracks().forEach((t) => (t.enabled = true));

          return {
            ...prev,
            [remoteSocketId]: {
              ...existing,
              userId: remoteUserId || existing.userId,
              userName: resolvedUserName,
              name: resolvedName,
              profilePicture: resolvedProfilePicture,
              stream: targetStream,
              screenStream: existing.screenSharing && !existing.screenStream ? targetStream : existing.screenStream,
            },
          };
        }
      });
    };

    // Connection State Diagnostic Tracker
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === "failed") {
        setConnectionQuality("poor");
        try {
          pc.restartIce();
        } catch {
          /* ignore ice restart failure */
        }
      } else if (state === "disconnected") {
        setConnectionQuality("reconnecting");
      } else if (state === "connected" || state === "completed") {
        setConnectionQuality("good");
      }
    };

    // Perfect Negotiation Glare Resolution with Opus SDP Tuning
    pc.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current[remoteSocketId] = true;
        const offer = await pc.createOffer();
        const tunedSdp = tuneOpusSdp(offer.sdp);
        await pc.setLocalDescription({ type: offer.type, sdp: tunedSdp });
        socketRef.current?.emit("call:signal", {
          toSocketId: remoteSocketId,
          fromUserId: currentUserId,
          fromMetadata: {
            userId: currentUserId,
            userName: rawUserName,
            name: rawName,
            profilePicture: myProfileAvatar,
          },
          signal: { type: "offer", sdp: pc.localDescription },
        });
      } catch (e) {
        console.error("[WebRTC] Negotiation error:", e);
      } finally {
        makingOfferRef.current[remoteSocketId] = false;
      }
    };

    // Initialize peer state entry
    setPeers((prev) => ({
      ...prev,
      [remoteSocketId]: {
        ...prev[remoteSocketId],
        userId: remoteUserId,
        userName: metadata.userName || prev[remoteSocketId]?.userName || "Participant",
        name: metadata.name || prev[remoteSocketId]?.name || "",
        profilePicture: metadata.profilePicture || prev[remoteSocketId]?.profilePicture || null,
        stream: prev[remoteSocketId]?.stream || null,
        screenStream: prev[remoteSocketId]?.screenStream || null,
      },
    }));

    return pc;
  }, [rawUserName, rawName, myProfileAvatar, currentUserId]);

  // ========== STEP 3: Socket Signaling Binding ==========
  useEffect(() => {
    if (!isMediaReady || !room) return;

    const socket = getSocket();
    if (!socket) {
      console.error("[WebRTC] No active socket connection");
      return;
    }
    socketRef.current = socket;
    cleanedUpRef.current = false;

    const myResolvedId = (currentUserId || userData?.user?._id || userData?._id)?.toString();

    // Room members discovery
    const handleRoomMembers = ({ members }) => {
      console.log(`[WebRTC] Discovered ${members.length} member(s) in room ${room}`, members);
      members.forEach(({ socketId, userId, userName, name, profilePicture }) => {
        const isSelf = (socketId && socketId === socket.id) || (userId && myResolvedId && userId.toString() === myResolvedId);
        if (!isSelf && socketId) {
          createPeerConnection(socketId, userId, { userName, name, profilePicture });
          setPeers((prev) => ({
            ...prev,
            [socketId]: {
              ...prev[socketId],
              userId,
              userName: userName || prev[socketId]?.userName || "Participant",
              name: name || prev[socketId]?.name || "",
              profilePicture: profilePicture || prev[socketId]?.profilePicture || null,
            },
          }));
        }
      });
    };

    // New peer joined
    const handlePeerJoined = ({ socketId, userId, userName, name, profilePicture }) => {
      const isSelf = (socketId && socketId === socket.id) || (userId && myResolvedId && userId.toString() === myResolvedId);
      if (isSelf || !socketId) return;
      console.log(`[WebRTC] New peer joined: ${socketId} (user: ${userId}, @${userName})`);
      createPeerConnection(socketId, userId, { userName, name, profilePicture });
      setPeers((prev) => ({
        ...prev,
        [socketId]: {
          ...prev[socketId],
          userId,
          userName: userName || prev[socketId]?.userName || "Participant",
          name: name || prev[socketId]?.name || "",
          profilePicture: profilePicture || prev[socketId]?.profilePicture || null,
        },
      }));
      playJoinSound();
    };

    // Signal received (Offer / Answer / ICE Candidate) with Opus SDP Tuning
    const handleSignalReceived = async ({ fromSocketId, fromUserId, fromMetadata, signal }) => {
      const isSelf = (fromSocketId && fromSocketId === socket.id) || (fromUserId && myResolvedId && fromUserId.toString() === myResolvedId);
      if (isSelf || !fromSocketId || !signal) return;
      let pc = peerConnections.current[fromSocketId];
      if (!pc) {
        pc = createPeerConnection(fromSocketId, fromUserId, fromMetadata || {});
      }
      
      if (fromMetadata && (fromMetadata.userName || fromMetadata.profilePicture || fromMetadata.name)) {
        setPeers((prev) => {
          const current = prev[fromSocketId] || {};
          return {
            ...prev,
            [fromSocketId]: {
              ...current,
              userId: fromUserId || current.userId,
              userName: fromMetadata.userName || current.userName || "Participant",
              name: fromMetadata.name || current.name || "",
              profilePicture: fromMetadata.profilePicture || current.profilePicture || null,
            },
          };
        });
      }

      // Polite peer designation (smaller socket ID)
      const polite = socket.id < fromSocketId;

      try {
        if (signal.type === "offer") {
          const sdp = signal.sdp || signal;
          const offerCollision = makingOfferRef.current[fromSocketId] || pc.signalingState !== "stable";

          ignoreOfferRef.current[fromSocketId] = !polite && offerCollision;
          if (ignoreOfferRef.current[fromSocketId]) {
            console.warn(`[WebRTC] Impolite peer ignoring glare offer from ${fromSocketId}`);
            return;
          }

          const rawSdpStr = typeof sdp === "string" ? sdp : sdp.sdp;
          const tunedRemoteOffer = tuneOpusSdp(rawSdpStr);
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: tunedRemoteOffer }));

          // Process queued ICE candidates
          if (queuedCandidatesRef.current[fromSocketId]) {
            for (const cand of queuedCandidatesRef.current[fromSocketId]) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.warn("[WebRTC] addIceCandidate queued error:", e);
              }
            }
            queuedCandidatesRef.current[fromSocketId] = [];
          }

          const answer = await pc.createAnswer();
          const tunedAnswerSdp = tuneOpusSdp(answer.sdp);
          await pc.setLocalDescription({ type: answer.type, sdp: tunedAnswerSdp });

          socket.emit("call:signal", {
            toSocketId: fromSocketId,
            fromUserId: currentUserId,
            fromMetadata: {
              userId: currentUserId,
              userName: rawUserName,
              name: rawName,
              profilePicture: myProfileAvatar,
            },
            signal: { type: "answer", sdp: pc.localDescription },
          });
        } else if (signal.type === "answer") {
          const sdp = signal.sdp || signal;
          if (pc.signalingState === "have-local-offer") {
            const rawSdpStr = typeof sdp === "string" ? sdp : sdp.sdp;
            const tunedRemoteAnswer = tuneOpusSdp(rawSdpStr);
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: tunedRemoteAnswer }));

            // Process queued ICE candidates
            if (queuedCandidatesRef.current[fromSocketId]) {
              for (const cand of queuedCandidatesRef.current[fromSocketId]) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(cand));
                } catch (e) {
                  console.warn("[WebRTC] addIceCandidate queued error:", e);
                }
              }
              queuedCandidatesRef.current[fromSocketId] = [];
            }
          }
        } else if (signal.type === "candidate" && signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (e) {
              console.warn("[WebRTC] addIceCandidate direct error:", e);
            }
          } else {
            if (!queuedCandidatesRef.current[fromSocketId]) {
              queuedCandidatesRef.current[fromSocketId] = [];
            }
            queuedCandidatesRef.current[fromSocketId].push(signal.candidate);
          }
        }
      } catch (err) {
        console.error(`[WebRTC] Signaling error handling ${signal.type} from ${fromSocketId}:`, err);
      }
    };

    // Peer disconnected
    const handlePeerLeft = ({ socketId, userId }) => {
      console.log(`[WebRTC] Peer disconnected: ${socketId} (user: ${userId})`);
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      delete audioSendersRef.current[socketId];
      delete cameraSendersRef.current[socketId];
      delete screenSendersRef.current[socketId];
      delete screenAudioSendersRef.current[socketId];
      delete queuedCandidatesRef.current[socketId];
      delete makingOfferRef.current[socketId];
      delete ignoreOfferRef.current[socketId];

      setPeers((prev) => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });

      playLeaveSound();
    };

    // Remote in-call state changes (mute, videoOff, screenSharing, videoFilter, handRaised)
    const handleActionBroadcast = (data) => {
      const { socketId: incomingSocketId, userId, action, value, streamId } = data;
      setPeers((prev) => {
        const entry = Object.entries(prev).find(
          ([sid, d]) =>
            (incomingSocketId && sid === incomingSocketId) ||
            (userId && (d.userId || "").toString() === userId.toString())
        );
        if (!entry) return prev;
        const [sid, peerData] = entry;

        if (action === "screen") {
          return {
            ...prev,
            [sid]: {
              ...peerData,
              screenSharing: Boolean(value),
              screenStreamId: value ? streamId : null,
              screenStream: value ? (peerData.screenStream || peerData.stream) : null,
            },
          };
        }

        if (action === "video") {
          return {
            ...prev,
            [sid]: {
              ...peerData,
              videoOff: Boolean(value),
            },
          };
        }

        if (action === "mute") {
          return {
            ...prev,
            [sid]: {
              ...peerData,
              muted: Boolean(value),
            },
          };
        }

        if (action === "lower-all-hands") {
          setIsHandRaised(false);
          setHandRaisedAt(null);
          return Object.fromEntries(
            Object.entries(prev).map(([id, p]) => [id, { ...p, handRaised: false, handRaisedAt: null }])
          );
        }

        if (action === "lower-hand" && data.targetUserId) {
          if (data.targetUserId.toString() === currentUserId?.toString()) {
            setIsHandRaised(false);
            setHandRaisedAt(null);
            snackbar.info("Your hand was lowered by the host ✋");
          }
          return Object.fromEntries(
            Object.entries(prev).map(([id, p]) => [
              id,
              p.userId?.toString() === data.targetUserId.toString() ? { ...p, handRaised: false, handRaisedAt: null } : p,
            ])
          );
        }

        if (action === "hand") {
          if (value) {
            playHandRaiseSound();
          }
          return {
            ...prev,
            [sid]: {
              ...data,
              handRaised: value,
              handRaisedAt: value ? (data.raisedAt || Date.now()) : null,
            },
          };
        }

        const key =
          action === "mute"
            ? "muted"
            : action === "video"
            ? "videoOff"
            : action === "filter"
            ? "videoFilter"
            : action;

        return { ...prev, [sid]: { ...data, [key]: value } };
      });
    };

    const handleModerated = ({ moderatorId, targetUserId, action }) => {
      if (action === "mute-all") {
        if (socket.id !== moderatorId) {
          if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) audioTrack.enabled = false;
          }
          setIsMuted(true);
          socket.emit("call:action", { room, action: "mute", value: true });
          snackbar.warning("You have been muted by the host 🔇");
        }
      } else if (action === "mute-user" && targetUserId?.toString() === currentUserId?.toString()) {
        if (localStreamRef.current) {
          const audioTrack = localStreamRef.current.getAudioTracks()[0];
          if (audioTrack) audioTrack.enabled = false;
        }
        setIsMuted(true);
        socket.emit("call:action", { room, action: "mute", value: true });
        snackbar.warning("You have been muted by the host 🔇");
      }
    };

    socket.on("call:room-members", handleRoomMembers);
    socket.on("call:peer-joined", handlePeerJoined);
    socket.on("call:signal-received", handleSignalReceived);
    socket.on("call:peer-left", handlePeerLeft);
    socket.on("call:action-broadcast", handleActionBroadcast);
    socket.on("call:moderated", handleModerated);

    socket.emit("call:join-room", {
      room,
      userId: currentUserId,
      userName: rawUserName,
      name: rawName,
      profilePicture: myProfileAvatar,
      isMuted: Boolean(initialOptions.isMuted),
      videoOff: Boolean(initialOptions.isVideoOff || isAudioOnly),
      videoFilter: initialOptions.videoFilter || "none",
    });

    if (initialOptions.isMuted) {
      socket.emit("call:action", { room, action: "mute", value: true });
    }
    if (initialOptions.isVideoOff || isAudioOnly) {
      socket.emit("call:action", { room, action: "video", value: true });
    }

    hasJoinedRoomRef.current = true;

    return () => {
      if (cleanedUpRef.current) return;
      cleanedUpRef.current = true;

      socket.off("call:room-members", handleRoomMembers);
      socket.off("call:peer-joined", handlePeerJoined);
      socket.off("call:signal-received", handleSignalReceived);
      socket.off("call:peer-left", handlePeerLeft);
      socket.off("call:action-broadcast", handleActionBroadcast);
      socket.off("call:moderated", handleModerated);

      if (hasJoinedRoomRef.current) {
        socket.emit("call:leave-room", { room });
        hasJoinedRoomRef.current = false;
      }

      Object.keys(peerConnections.current).forEach((sid) => {
        peerConnections.current[sid].close();
      });
      peerConnections.current = {};
      audioSendersRef.current = {};
      cameraSendersRef.current = {};
      screenSendersRef.current = {};
      screenAudioSendersRef.current = {};

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
      setScreenStream(null);
      setPeers({});
      setIsScreenSharing(false);
      setIsMediaReady(false);
    };
  }, [isMediaReady, room, createPeerConnection, currentUserId, myProfileAvatar, rawName, rawUserName, initialOptions.isMuted, initialOptions.isVideoOff, initialOptions.videoFilter, isAudioOnly]);

  // ========== Device switching ==========
  const _switchDevice = useCallback(async (audioId, videoId) => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints = {
        audio: audioId ? { deviceId: { exact: audioId }, ...ULTRA_AUDIO_CONSTRAINTS } : ULTRA_AUDIO_CONSTRAINTS,
        video: isAudioOnly ? false : videoId ? { deviceId: { exact: videoId }, width: 1280, height: 720 } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Replace tracks in active senders without tearing down connections
      const newMicTrack = stream.getAudioTracks()[0];
      const newCameraTrack = stream.getVideoTracks()[0];

      Object.keys(peerConnections.current).forEach((socketId) => {
        if (newMicTrack && audioSendersRef.current[socketId]) {
          audioSendersRef.current[socketId].replaceTrack(newMicTrack);
        }
        if (newCameraTrack && cameraSendersRef.current[socketId]) {
          cameraSendersRef.current[socketId].replaceTrack(newCameraTrack);
        }
      });

      return stream;
    } catch (error) {
      console.error("[WebRTC] Failed to switch device:", error);
      snackbar.error("Could not switch device.");
    }
  }, [isAudioOnly]);

  // ========== Media Controls: Microphone Mute/Unmute ==========
  const toggleMute = useCallback((forceMuteState) => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      const nextMuted = typeof forceMuteState === "boolean" ? forceMuteState : !isMuted;
      if (audioTrack) {
        audioTrack.enabled = !nextMuted;
      }
      setIsMuted(nextMuted);
      socketRef.current?.emit("call:action", { room, action: "mute", value: nextMuted });
    }
  }, [isMuted, room]);

  // ========== Media Controls: Dynamic Camera Video Toggle (Independent of Screen Share) ==========
  const toggleVideo = useCallback(async () => {
    try {
      if (isVideoOff) {
        // Turning camera ON
        let cameraTrack = localStreamRef.current?.getVideoTracks()[0];

        // If no camera track exists or it was stopped/ended, dynamically acquire video stream
        if (!cameraTrack || cameraTrack.readyState === "ended") {
          let videoStream;
          try {
            videoStream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
            });
          } catch {
            // Graceful fallback to basic video constraint if resolution constraint is locked
            videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          }
          const newTrack = videoStream.getVideoTracks()[0];
          if (!newTrack) return;

          if (localStreamRef.current) {
            // Remove any dead video tracks first
            localStreamRef.current.getVideoTracks().forEach((t) => {
              if (t.readyState === "ended") {
                try {
                  localStreamRef.current.removeTrack(t);
                } catch {}
              }
            });
            localStreamRef.current.addTrack(newTrack);
          } else {
            localStreamRef.current = videoStream;
          }
          cameraTrack = newTrack;

          // Add or replace camera track in peer connections
          Object.keys(peerConnections.current).forEach((socketId) => {
            const pc = peerConnections.current[socketId];
            if (cameraSendersRef.current[socketId]) {
              cameraSendersRef.current[socketId].replaceTrack(newTrack).catch(() => null);
            } else {
              try {
                cameraSendersRef.current[socketId] = pc.addTrack(newTrack, localStreamRef.current);
              } catch (e) {
                console.warn("[WebRTC] addTrack camera on toggle warning:", e.message);
              }
            }
          });
        } else {
          cameraTrack.enabled = true;
        }

        setIsVideoOff(false);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        socketRef.current?.emit("call:action", { room, action: "video", value: false }); // videoOff: false
      } else {
        // Turning camera OFF
        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
        if (cameraTrack) {
          cameraTrack.enabled = false;
        }
        setIsVideoOff(true);
        socketRef.current?.emit("call:action", { room, action: "video", value: true }); // videoOff: true
      }
    } catch (err) {
      console.error("[WebRTC] Failed to toggle camera video:", err);
      if (err.name === "NotReadableError") {
        snackbar.error("Camera is in use by another app or tab.");
      } else if (err.name === "NotAllowedError") {
        snackbar.error("Camera permission was denied.");
      } else {
        snackbar.error("Could not access camera device.");
      }
    }
  }, [isVideoOff, room]);

  // ========== Media Controls: Stop Screen Sharing (Clean Multi-Track Teardown) ==========
  const stopScreenSharing = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setScreenStream(null);
    setIsScreenSharing(false);

    // Remove screen senders from all peer connections
    Object.keys(peerConnections.current).forEach((socketId) => {
      const pc = peerConnections.current[socketId];
      if (screenSendersRef.current[socketId]) {
        try {
          pc.removeTrack(screenSendersRef.current[socketId]);
        } catch (e) {
          console.warn(`[WebRTC] removeTrack screen error for ${socketId}:`, e.message);
        }
        delete screenSendersRef.current[socketId];
      }
      if (screenAudioSendersRef.current[socketId]) {
        try {
          pc.removeTrack(screenAudioSendersRef.current[socketId]);
        } catch (e) {
          console.warn(`[WebRTC] removeTrack screen audio error for ${socketId}:`, e.message);
        }
        delete screenAudioSendersRef.current[socketId];
      }
    });

    // Notify room that screen share stopped
    socketRef.current?.emit("call:action", {
      room,
      action: "screen",
      value: false,
    });
  }, [room]);

  // ========== Media Controls: Start Screen Sharing (Industry-Grade Multi-Track) ==========
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenSharing();
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      snackbar.error("Screen sharing is not supported in this browser.");
      return;
    }

    try {
      if (typeof snackbar?.loading === "function") {
        snackbar.loading("Starting screen share...", { id: "screen-share-toast" });
      } else {
        snackbar?.info?.("Starting screen share...");
      }

      // Request display stream with high-res video and optional tab/system audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: SCREEN_SHARE_VIDEO_CONSTRAINTS,
        audio: true,
      });

      if (typeof snackbar?.dismiss === "function") {
        snackbar.dismiss("screen-share-toast");
      }

      const screenVideoTrack = displayStream.getVideoTracks()[0];
      if (!screenVideoTrack) {
        displayStream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Optimize track for fine detail (text, code, documents)
      if ("contentHint" in screenVideoTrack) {
        screenVideoTrack.contentHint = "detail";
      }

      const screenAudioTrack = displayStream.getAudioTracks()[0];

      screenStreamRef.current = displayStream;
      setScreenStream(displayStream);
      setIsScreenSharing(true);

      // Attach screen tracks to each peer connection as distinct tracks
      Object.keys(peerConnections.current).forEach((socketId) => {
        const pc = peerConnections.current[socketId];
        try {
          const sender = pc.addTrack(screenVideoTrack, displayStream);
          screenSendersRef.current[socketId] = sender;

          // Set high bitrate parameters on the sender for razor-sharp 1080p/1440p detail
          try {
            const params = sender.getParameters();
            if (params.encodings && params.encodings.length > 0) {
              params.encodings[0].maxBitrate = 8000000; // 8 Mbps for ultra-crisp 1080p/1440p
              params.encodings[0].maxFramerate = 60;
              params.encodings[0].scaleResolutionDownBy = 1.0;
              sender.setParameters(params).catch(() => null);
            }
          } catch {
            /* ignore sender parameter tuning error */
          }

          if (screenAudioTrack) {
            const audioSender = pc.addTrack(screenAudioTrack, displayStream);
            screenAudioSendersRef.current[socketId] = audioSender;
          }
        } catch (err) {
          console.error(`[WebRTC] Error attaching screen track to peer ${socketId}:`, err);
        }
      });

      // Browser native "Stop Sharing" button listener
      screenVideoTrack.onended = () => {
        console.log("[WebRTC] Screen share ended by user via browser control");
        stopScreenSharing();
      };

      // Broadcast screen share active status
      socketRef.current?.emit("call:action", {
        room,
        action: "screen",
        value: true,
        streamId: displayStream.id,
        hasAudio: Boolean(screenAudioTrack),
      });

      snackbar.success("You are now sharing your screen.");
    } catch (err) {
      snackbar.dismiss("screen-share-toast");
      if (err.name === "NotAllowedError" || err.name === "AbortError") {
        snackbar.info("Screen sharing cancelled.");
      } else if (err.name === "NotFoundError" || err.name === "NotReadableError") {
        snackbar.error("Selected screen source is currently unavailable.");
      } else {
        console.error("[WebRTC] getDisplayMedia error:", err);
        snackbar.error("Unable to start screen sharing. Please try again.");
      }
    }
  }, [isScreenSharing, room, stopScreenSharing]);

  // ========== Hand Raise & Video Effects ==========
  const toggleHand = useCallback(() => {
    const newValue = !isHandRaised;
    const now = newValue ? Date.now() : null;
    setIsHandRaised(newValue);
    setHandRaisedAt(now);
    socketRef.current?.emit("call:action", {
      room,
      action: "hand",
      value: newValue,
      raisedAt: now,
      userName: rawUserName || rawName || "Participant",
    });
    if (newValue) {
      playHandRaiseSound();
    }
  }, [isHandRaised, room, rawUserName, rawName]);

  const changeVideoFilter = useCallback((filterName) => {
    setVideoFilter(filterName);
    socketRef.current?.emit("call:action", { room, action: "filter", value: filterName });
  }, [room]);

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
    audioSendersRef.current = {};
    cameraSendersRef.current = {};
    screenSendersRef.current = {};
    screenAudioSendersRef.current = {};

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
    setScreenStream(null);
    setPeers({});
    setIsScreenSharing(false);
  }, [room]);

  const switchAudioInput = useCallback(async (deviceId) => {
    setSelectedAudioInput(deviceId);
    if (!localStreamRef.current) return;
    try {
      const isSuppressionOn = typeof window !== "undefined" ? localStorage.getItem("vybe_noise_suppression") !== "false" : true;
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: { ideal: isSuppressionOn },
          noiseSuppression: { ideal: isSuppressionOn },
          autoGainControl: { ideal: isSuppressionOn },
        },
      });
      const newTrack = newStream.getAudioTracks()[0];
      if (!newTrack) return;

      const oldTrack = localStreamRef.current.getAudioTracks()[0];
      if (oldTrack) {
        localStreamRef.current.removeTrack(oldTrack);
        oldTrack.stop();
      }
      newTrack.enabled = !isMuted;
      localStreamRef.current.addTrack(newTrack);

      Object.keys(peerConnections.current).forEach((sid) => {
        if (audioSendersRef.current[sid]) {
          audioSendersRef.current[sid].replaceTrack(newTrack).catch((e) => console.warn(e));
        }
      });

      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      snackbar.success("Microphone updated 🎙️");
    } catch (e) {
      console.error("[WebRTC] switchAudioInput error:", e);
      snackbar.error("Failed to switch microphone.");
    }
  }, [isMuted]);

  const switchVideoDevice = useCallback(async (deviceId) => {
    setSelectedVideo(deviceId);
    if (isVideoOff || !localStreamRef.current) return;
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });
      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return;

      const oldTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldTrack) {
        localStreamRef.current.removeTrack(oldTrack);
        oldTrack.stop();
      }
      newTrack.enabled = true;
      localStreamRef.current.addTrack(newTrack);

      Object.keys(peerConnections.current).forEach((sid) => {
        if (cameraSendersRef.current[sid]) {
          cameraSendersRef.current[sid].replaceTrack(newTrack).catch((e) => console.warn(e));
        }
      });

      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      snackbar.success("Camera updated 📹");
    } catch (e) {
      console.error("[WebRTC] switchVideoDevice error:", e);
      snackbar.error("Failed to switch camera.");
    }
  }, [isVideoOff]);

  return {
    localStream,
    screenStream,
    peers,
    audioInputDevices,
    videoDevices,
    audioOutputDevices,
    selectedAudioInput,
    setSelectedAudioInput: switchAudioInput,
    selectedVideo,
    setSelectedVideo: switchVideoDevice,
    selectedAudioOutput,
    setSelectedAudioOutput,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isHandRaised,
    handRaisedAt,
    videoFilter,
    activeSpeaker,
    connectionQuality,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleHand,
    changeVideoFilter,
    leaveRoom,
  };
};
