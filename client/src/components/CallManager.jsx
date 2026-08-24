import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneCall, PhoneOff, Video, X } from "lucide-react";
import { useSelector } from "react-redux";
import { getSocket } from "../lib/socket";
import api from "../lib/axios";
import VybeCallOverlay from "./calls/VybeCallOverlay";
import { useWebRTC } from "../hooks/useWebRTC";
import { snackbar } from "../lib/snackbar";
import {
  startOutgoingSound,
  stopOutgoingSound,
  startIncomingRingtone,
  stopIncomingRingtone,
  playCallConnectedSound,
  playCallDeclinedSound,
  playBusyTone,
  playCallEndedSound,
} from "../lib/sounds";

const RING_TIMEOUT_MS = 30000; // 30 seconds ring timeout
const ACTIVE_CALL_STORAGE_KEY = "vybe_active_call";

const saveActiveCallToStorage = (callData) => {
  try {
    if (callData && callData.room) {
      sessionStorage.setItem(
        ACTIVE_CALL_STORAGE_KEY,
        JSON.stringify({
          ...callData,
          savedAt: Date.now(),
        })
      );
    } else {
      sessionStorage.removeItem(ACTIVE_CALL_STORAGE_KEY);
    }
  } catch (e) {
    console.warn("Could not save active call to storage:", e);
  }
};

const getActiveCallFromStorage = () => {
  try {
    const raw = sessionStorage.getItem(ACTIVE_CALL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Allow re-joining active call if within 4 hours
    if (parsed && parsed.room && parsed.savedAt && Date.now() - parsed.savedAt < 4 * 60 * 60 * 1000) {
      return parsed;
    }
    sessionStorage.removeItem(ACTIVE_CALL_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
};

export const CallManager = () => {
  const [incomingCall, setIncomingCall] = useState(null); // { room, from, callerName, callerAvatar, type, conversationId }
  const [activeCall, setActiveCallState] = useState(() => getActiveCallFromStorage()); // Rehydrate immediately on refresh!
  
  const setActiveCall = useCallback((callData) => {
    setActiveCallState(callData);
    saveActiveCallToStorage(callData);
  }, []);

  const { userData } = useSelector((s) => s.user);
  const currentUserId = userData?.user?._id || userData?._id;

  const ringTimeoutRef = useRef(null);
  const leaveRoomFnRef = useRef(null); // Ref to hold the leaveRoom function from WebRTC hook

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  const incomingTimeoutRef = useRef(null);

  const clearIncomingTimeout = useCallback(() => {
    if (incomingTimeoutRef.current) {
      clearTimeout(incomingTimeoutRef.current);
      incomingTimeoutRef.current = null;
    }
  }, []);

  const activeCallRef = useRef(activeCall);
  const incomingCallRef = useRef(incomingCall);
  const userDataRef = useRef(userData);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  // Background active call recovery & verification with server
  useEffect(() => {
    if (!currentUserId) return;

    let isMounted = true;
    const checkServerActiveCall = async () => {
      try {
        const res = await api.get("/call/active");
        if (!isMounted) return;
        const session = res.data?.session;

        if (session && session.status === "active" && session.room) {
          const otherParticipant = session.participants?.find(
            (p) => (p.user?._id || p.user)?.toString() !== currentUserId.toString()
          )?.user || session.initiator;

          const rehydrated = {
            room: session.room,
            type: session.type === "voice" || session.type === "audio" ? "voice" : "video",
            targetUser: otherParticipant,
            isIncoming: (session.initiator?._id || session.initiator)?.toString() !== currentUserId.toString(),
            conversationId: session.conversationId,
          };
          setActiveCall(rehydrated);
        }
      } catch (err) {
        console.warn("Active call server sync check warning:", err?.message);
      }
    };

    checkServerActiveCall();
    return () => {
      isMounted = false;
    };
  }, [currentUserId, setActiveCall]);

  // Bulletproof Socket signaling listeners (Direct binding to getSocket + Reconnect resilience)
  useEffect(() => {
    let boundSocket = null;

    const handleInvite = (data) => {
      const myId = (userDataRef.current?.user?._id || userDataRef.current?._id)?.toString();
      const callerId = (data?.from?._id || data?.from)?.toString();

      // 1. Ignore invite if it was initiated by ourselves
      if (callerId && myId && callerId === myId) {
        return;
      }

      // 2. Ignore invite if it belongs to our current active call room
      if (activeCallRef.current?.room === data.room) {
        return;
      }

      console.log("📞 [CallManager] INCOMING CALL INVITE RECEIVED:", data);

      // 3. Only signal busy if actively in a connected call in a different room
      if (activeCallRef.current && activeCallRef.current.room !== data.room) {
        const s = getSocket();
        s?.emit("call:respond", { room: data.room, response: "busy", to: data.from });
        return;
      }

      // 4. Mount incoming call prompt and start ringtone
      setIncomingCall(data);
      startIncomingRingtone(data.type || "video");

      // Auto-clear incoming call if unanswered after timeout
      clearIncomingTimeout();
      incomingTimeoutRef.current = setTimeout(() => {
        setIncomingCall(null);
        stopIncomingRingtone();
      }, RING_TIMEOUT_MS);

      // Mobile vibration
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([300, 200, 300, 200, 500]);
        } catch {
          // Ignore vibration failure
        }
      }

      // Web Push / OS Notification if granted
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(`Incoming ${data.type === "video" ? "Video" : "Voice"} Call`, {
            body: `@${data.callerName} is calling you on VYBE`,
            icon: data.callerAvatar || "/favicon.ico",
            tag: data.room,
          });
        } catch {
          // Ignore notification error
        }
      }
    };

    const handleResponse = (data) => {
      const myId = (userDataRef.current?.user?._id || userDataRef.current?._id)?.toString();
      const responderId = (data?.from?._id || data?.from)?.toString();

      // Ignore responses sent by ourselves
      if (responderId && myId && responderId === myId) {
        return;
      }

      // Ignore responses that don't match our active call room
      if (activeCallRef.current && data.room && activeCallRef.current.room !== data.room) {
        return;
      }

      console.log("📞 [CallManager] CALL RESPONSE RECEIVED:", data);
      if (data.response === "accepted" || data.response === "joined") {
        stopOutgoingSound();
        stopIncomingRingtone();
        clearRingTimeout();
        snackbar.dismiss("call-ringing");
        playCallConnectedSound();
        snackbar.success("Call connected!");
      } else if (data.response === "declined") {
        stopOutgoingSound();
        stopIncomingRingtone();
        clearRingTimeout();
        snackbar.dismiss("call-ringing");
        playCallDeclinedSound();
        snackbar.error("Call declined by user");
        setActiveCall(null);
      } else if (data.response === "busy") {
        stopOutgoingSound();
        stopIncomingRingtone();
        clearRingTimeout();
        snackbar.dismiss("call-ringing");
        playBusyTone();
        snackbar.error("User is busy on another call");
        setActiveCall(null);
      } else if (data.response === "cancelled") {
        // Caller hung up while we were still ringing — dismiss incoming call UI
        stopIncomingRingtone();
        stopOutgoingSound();
        playCallDeclinedSound();
        setIncomingCall(null);
        snackbar.error("Caller cancelled the call");
      }
    };

    const handleRejected = (data) => {
      if (data.reason === "User is offline") {
        try { snackbar?.dismiss?.("call-ringing"); } catch { /* ignore */ }
        try { snackbar?.loading?.("Calling... (Waiting for user)", { id: "call-ringing" }); } catch { /* ignore */ }
        return;
      }
      stopOutgoingSound();
      stopIncomingRingtone();
      clearRingTimeout();
      try { snackbar?.dismiss?.("call-ringing"); } catch { /* ignore */ }
      playCallDeclinedSound();
      try { snackbar?.error?.(data.reason || "Call declined"); } catch { /* ignore */ }
      setActiveCall(null);
    };

    const handleCallStatus = (data) => {
      if (data.status === "ringing") {
        try {
          if (typeof snackbar?.loading === "function") snackbar.loading("Ringing...", { id: "call-ringing" });
          else snackbar?.info?.("Ringing...");
        } catch { /* ignore */ }
        startOutgoingSound();
      } else if (data.status === "calling") {
        try {
          if (typeof snackbar?.loading === "function") snackbar.loading("Calling...", { id: "call-ringing" });
          else snackbar?.info?.("Calling...");
        } catch { /* ignore */ }
        startOutgoingSound();
      }
    };

    const handleCallEnded = (data) => {
      if (!activeCallRef.current || (data.room && activeCallRef.current.room !== data.room)) {
        return;
      }
      console.log("📴 [CallManager] Call ended event received from server:", data);
      stopOutgoingSound();
      stopIncomingRingtone();
      clearRingTimeout();
      playCallEndedSound();
      snackbar.info("Call ended");
      setActiveCall(null);
    };

    const attachListeners = () => {
      const s = getSocket();
      if (!s) return false;

      // Always ensure listeners are cleanly attached to the active socket
      s.off("call:invite-received", handleInvite);
      s.off("call:response-received", handleResponse);
      s.off("call:rejected", handleRejected);
      s.off("call:status", handleCallStatus);
      s.off("call:ended", handleCallEnded);

      s.on("call:invite-received", handleInvite);
      s.on("call:response-received", handleResponse);
      s.on("call:rejected", handleRejected);
      s.on("call:status", handleCallStatus);
      s.on("call:ended", handleCallEnded);

      boundSocket = s;
      return true;
    };

    attachListeners();
    const interval = setInterval(attachListeners, 1000);

    return () => {
      clearInterval(interval);
      if (boundSocket) {
        boundSocket.off("call:invite-received", handleInvite);
        boundSocket.off("call:response-received", handleResponse);
        boundSocket.off("call:rejected", handleRejected);
        boundSocket.off("call:status", handleCallStatus);
        boundSocket.off("call:ended", handleCallEnded);
      }
    };
  }, [clearRingTimeout, clearIncomingTimeout, setActiveCall]);

  // Ensure active socket user registration whenever user state is present
  useEffect(() => {
    if (!currentUserId) return;
    const sock = getSocket();
    if (sock && sock.connected) {
      sock.emit("register-user", { userId: currentUserId });
    }
  }, [currentUserId]);

  // Separate effect for listening to custom window events for placing calls from chat
  useEffect(() => {
    const handleInitiateCallEvent = async (e) => {
      const { type, user, targetUserId: explicitTargetId, conversationId } = e.detail;
      const targetUserId = (explicitTargetId || user?._id || user?.id || user?.user?._id || user)?.toString();
      const room = `call_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const dbType = type === "audio" ? "voice" : type;

      // 1. Immediately display call screen for caller
      setActiveCall({ room, type: dbType, targetUser: user, isIncoming: false, conversationId });
      startOutgoingSound();
      try {
        if (typeof snackbar?.loading === "function") snackbar.loading("Calling...", { id: "call-ringing" });
        else snackbar?.info?.("Calling...");
      } catch (err) {
        console.warn("Snackbar call skipped:", err);
      }

      // 2. Emit invite signal via socket with retry resilience
      const currentUser = userDataRef.current?.user || userDataRef.current;
      const callerAvatarUrl = currentUser?.profileImage?.url || 
        (typeof currentUser?.profileImage === "string" ? currentUser.profileImage : "");

      const emitInvite = () => {
        const sock = getSocket();
        if (sock) {
          console.log(`📞 [CallManager] Emitting call:invite to ${targetUserId} in room ${room} (socket connected: ${sock.connected})`);
          sock.emit("call:invite", {
            room,
            userToCall: targetUserId,
            targetUserId,
            type: dbType,
            callerName: currentUser?.userName || currentUser?.name || "VYBE User",
            callerAvatar: callerAvatarUrl,
            conversationId,
          });
          return sock.connected;
        }
        return false;
      };

      const isConnected = emitInvite();
      if (!isConnected) {
        const retryTimer = setInterval(() => {
          const connected = emitInvite();
          if (connected) clearInterval(retryTimer);
        }, 500);
        setTimeout(() => clearInterval(retryTimer), 3500);
      }

      // 3. Ring timeout — auto-cancel after 30s
      clearRingTimeout();
      ringTimeoutRef.current = setTimeout(() => {
        stopOutgoingSound();
        snackbar.dismiss("call-ringing");
        snackbar.error("No answer");
        api.post("/call/end", { room }).catch(() => null);
        setActiveCall(null);
      }, RING_TIMEOUT_MS);

      // 4. Non-blocking backend session initiation
      api.post("/call/initiate", {
        room,
        type: dbType,
        receiverId: targetUserId,
        conversationId,
      }).catch((err) => {
        console.warn("DB call initiate sync warning:", err?.message);
      });
    };

    window.addEventListener("vybe:initiate-call", handleInitiateCallEvent);
    return () => {
      window.removeEventListener("vybe:initiate-call", handleInitiateCallEvent);
    };
  }, [clearRingTimeout, setActiveCall]);

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    clearIncomingTimeout();
    stopIncomingRingtone();
    stopOutgoingSound();
    clearRingTimeout();

    const socket = getSocket();
    const { room, type, from, callerName, callerAvatar, conversationId } = incomingCall;

    // Immediately show active call screen so UI never blocks
    setActiveCall({
      room,
      type: type === "audio" ? "voice" : type || "video",
      targetUser: { _id: from, userName: callerName, profileImage: { url: callerAvatar } },
      isIncoming: true,
      conversationId,
    });
    setIncomingCall(null);

    // Signal back to caller immediately
    socket?.emit("call:respond", { room, response: "accepted", to: from });
    playCallConnectedSound();

    // Non-blocking background DB sync
    api.post("/call/respond", { room, response: "joined" }).catch((e) => {
      console.warn("respond API non-critical sync:", e?.message);
    });
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;
    clearIncomingTimeout();
    stopIncomingRingtone();
    stopOutgoingSound();
    clearRingTimeout();
    playCallDeclinedSound();

    const socket = getSocket();
    const { room, from } = incomingCall;

    setIncomingCall(null);
    socket?.emit("call:respond", { room, response: "declined", to: from });

    api.post("/call/respond", { room, response: "declined" }).catch((e) => {
      console.warn("Decline API call failed:", e?.message);
    });
  };

  const handleHangUp = useCallback(async () => {
    if (!activeCall) return;

    // 1. Immediately dismiss call UI, clear storage & play hang up sound
    const targetCallRoom = activeCall.room;
    const targetUserId = activeCall.targetUser?._id || activeCall.targetUser;

    setActiveCall(null);
    snackbar.dismiss("call-ringing");
    clearRingTimeout();
    stopIncomingRingtone();
    stopOutgoingSound();
    playCallEndedSound();

    // 2. Notify all participants via call:hangup
    const socket = getSocket();
    socket?.emit("call:hangup", {
      room: targetCallRoom,
      targetUserId: targetUserId ? targetUserId.toString() : null,
    });

    if (targetUserId) {
      socket?.emit("call:respond", {
        room: targetCallRoom,
        response: "cancelled",
        to: targetUserId,
      });
    }

    // 3. Clean up WebRTC peer connections and media tracks
    if (leaveRoomFnRef.current) {
      try {
        leaveRoomFnRef.current();
      } catch (err) {
        console.warn("leaveRoom cleanup failed:", err);
      }
    }

    // 4. Background DB cleanup (non-blocking)
    api.post("/call/end", { room: targetCallRoom }).catch((e) => {
      console.warn("End call API failed:", e);
    });
  }, [activeCall, clearRingTimeout, setActiveCall]);

  return (
    <>
      {/* Incoming Call Overlay */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[999] w-[calc(100%-2rem)] max-w-lg bg-surface/95 border-2 border-primary/50 backdrop-blur-2xl p-4 md:p-5 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex items-center justify-between ring-4 ring-primary/20"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center ring-2 ring-white/20 shadow-md">
                  {incomingCall.callerAvatar ? (
                    <img src={incomingCall.callerAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-black text-xl">
                      {incomingCall.callerName?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 p-1 bg-primary text-white rounded-full shadow">
                  {incomingCall.type === "video" ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                </span>
              </div>
              <div className="min-w-0">
                <h4 className="text-sm md:text-base font-extrabold text-text truncate">@{incomingCall.callerName}</h4>
                <p className="text-xs text-primary font-semibold flex items-center gap-1.5 animate-pulse mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  <span>Incoming {incomingCall.type === "video" ? "Video" : "Voice"} Call...</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 ml-2">
              <button
                onClick={handleRejectCall}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-2xl transition shadow-lg cursor-pointer"
                title="Decline"
              >
                <PhoneOff className="w-4 h-4" />
                <span className="hidden sm:inline">Decline</span>
              </button>
              <button
                onClick={handleAcceptCall}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold rounded-2xl transition shadow-lg shadow-emerald-500/30 animate-bounce cursor-pointer"
                title="Accept"
              >
                <PhoneCall className="w-4 h-4" />
                <span className="hidden sm:inline">Accept</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Render Social Vybe Call Session */}
      {activeCall && (
        <VybeCallSessionWrapper
          room={activeCall.room}
          type={activeCall.type}
          targetUser={activeCall.targetUser}
          currentUserId={currentUserId}
          onEndCall={handleHangUp}
          leaveRoomFnRef={leaveRoomFnRef}
        />
      )}
    </>
  );
};

// Wrapper that connects useWebRTC engine with mobile-first Instagram VybeCallOverlay
const VybeCallSessionWrapper = ({
  room,
  type,
  targetUser,
  currentUserId,
  onEndCall,
  leaveRoomFnRef,
}) => {
  const rtc = useWebRTC(room, currentUserId, type);

  // Expose leaveRoom to the parent via ref
  useEffect(() => {
    leaveRoomFnRef.current = rtc.leaveRoom;
  }, [rtc.leaveRoom, leaveRoomFnRef]);

  // Dismiss "Ringing..." once peer connects
  useEffect(() => {
    if (Object.keys(rtc.peers || {}).length > 0) {
      try {
        snackbar.dismiss("call-ringing");
      } catch {}
    }
  }, [rtc.peers]);

  // Flip Camera
  const handleFlipCamera = useCallback(() => {
    if (rtc.videoDevices && rtc.videoDevices.length > 1) {
      const currentIndex = rtc.videoDevices.findIndex(
        (d) => d.deviceId === rtc.selectedVideo
      );
      const nextIndex = (currentIndex + 1) % rtc.videoDevices.length;
      rtc.setSelectedVideo(rtc.videoDevices[nextIndex].deviceId);
    }
  }, [rtc.videoDevices, rtc.selectedVideo, rtc.setSelectedVideo]);

  return (
    <VybeCallOverlay
      room={room}
      callType={type}
      targetUser={targetUser}
      currentUserId={currentUserId}
      localStream={rtc.localStream}
      screenStream={rtc.screenStream}
      peers={rtc.peers}
      isMuted={rtc.isMuted}
      isVideoOff={rtc.isVideoOff}
      isScreenSharing={rtc.isScreenSharing}
      activeSpeaker={rtc.activeSpeaker}
      connectionQuality={rtc.connectionQuality}
      videoFilter={rtc.videoFilter}
      changeVideoFilter={rtc.changeVideoFilter}
      onToggleMute={rtc.toggleMute}
      onToggleVideo={rtc.toggleVideo}
      onToggleScreenShare={rtc.toggleScreenShare}
      onFlipCamera={handleFlipCamera}
      onEndCall={onEndCall}
    />
  );
};

export default CallManager;
