import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneCall, PhoneOff, Video, X } from "lucide-react";
import { getSocket } from "../lib/socket";
import api from "../lib/axios";
import CallScreen from "./CallScreen";
import { useWebRTC } from "../hooks/useWebRTC";
import toast from "../lib/hotToastAdapter";
import {
  startOutgoingSound,
  stopOutgoingSound,
  startIncomingRingtone,
  stopIncomingRingtone,
} from "../lib/sounds";

const RING_TIMEOUT_MS = 30000; // 30 seconds ring timeout

export const CallManager = () => {
  const [incomingCall, setIncomingCall] = useState(null); // { room, from, callerName, callerAvatar, type, conversationId }
  const [activeCall, setActiveCall] = useState(null); // { room, type, targetUser, isIncoming, conversationId }
  const [userData, setUserData] = useState(null);

  const ringTimeoutRef = useRef(null);
  const leaveRoomFnRef = useRef(null); // Ref to hold the leaveRoom function from WebRTC hook

  const clearRingTimeout = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  }, []);

  // Fetch logged in user details
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/user/current-user");
        if (res.data?.success) {
          setUserData(res.data.user);
        }
      } catch (err) {
        console.warn("Could not load user profile for CallManager:", err);
      }
    };
    fetchUser();
  }, []);

  // Recover active call session on mount / userData load
  useEffect(() => {
    if (!userData) return;

    const checkActiveCall = async () => {
      try {
        const res = await api.get("/call/active");
        if (res.data?.success && res.data.session) {
          const session = res.data.session;
          const myParticipant = session.participants.find(
            (p) => (p.user?._id || p.user) === userData._id
          );

          if (myParticipant && (myParticipant.status === "ringing" || myParticipant.status === "joined")) {
            if (session.initiator?._id !== userData._id) {
              // It's an incoming call
              if (myParticipant.status === "ringing") {
                setIncomingCall({
                  room: session.room,
                  from: session.initiator?._id,
                  callerName: session.initiator?.userName || "User",
                  callerAvatar: session.initiator?.profileImage?.url,
                  type: session.type,
                  conversationId: session.conversationId,
                });
                startRingtone();
              } else {
                // Already joined
                setActiveCall({
                  room: session.room,
                  type: session.type,
                  targetUser: session.initiator || { userName: "User" },
                  isIncoming: true,
                  conversationId: session.conversationId,
                });
              }
            } else {
              // We are the initiator
              const otherParticipant = session.participants.find(
                (p) => (p.user?._id || p.user) !== userData._id
              );
              setActiveCall({
                room: session.room,
                type: session.type,
                targetUser: otherParticipant?.user || { userName: "User" },
                isIncoming: false,
                conversationId: session.conversationId,
              });
            }
          }
        }
      } catch (err) {
        console.warn("Call recovery failed:", err);
      }
    };

    checkActiveCall();
  }, [userData]);

  // Socket signaling listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleInvite = (data) => {
      // Ignore if already in a call
      if (activeCall || incomingCall) {
        socket.emit("call:respond", { room: data.room, response: "busy", to: data.from });
        return;
      }
      setIncomingCall(data);
      startIncomingRingtone();
    };

    const handleResponse = (data) => {
      if (data.response === "accepted" || data.response === "joined") {
        stopOutgoingSound();
        stopIncomingRingtone();
        clearRingTimeout();
        toast.dismiss("call-ringing");
        toast.success("Call accepted!");
      } else if (data.response === "declined") {
        stopOutgoingSound();
        stopIncomingRingtone();
        clearRingTimeout();
        toast.dismiss("call-ringing");
        toast.error("Call declined by user");
        setActiveCall(null);
      } else if (data.response === "busy") {
        stopOutgoingSound();
        stopIncomingRingtone();
        clearRingTimeout();
        toast.dismiss("call-ringing");
        toast.error("User is busy on another call");
        setActiveCall(null);
      } else if (data.response === "cancelled") {
        // Caller hung up while we were still ringing — dismiss incoming call UI
        stopIncomingRingtone();
        stopOutgoingSound();
        setIncomingCall(null);
        toast.error("Caller cancelled the call");
      }
    };

    const handleRejected = (data) => {
      stopOutgoingSound();
      stopIncomingRingtone();
      clearRingTimeout();
      toast.dismiss("call-ringing");
      toast.error(data.reason || "Call failed");
      setActiveCall(null);
    };

    const handleCallStatus = (data) => {
      if (data.status === "ringing") {
        toast.loading("Ringing...", { id: "call-ringing" });
        startOutgoingSound();
      } else if (data.status === "calling") {
        toast.loading("Calling...", { id: "call-ringing" });
        startOutgoingSound();
      }
    };

    socket.on("call:invite-received", handleInvite);
    socket.on("call:response-received", handleResponse);
    socket.on("call:rejected", handleRejected);
    socket.on("call:status", handleCallStatus);

    // Listen to custom window events for placing calls from chat
    const handleInitiateCallEvent = async (e) => {
      const { type, user, conversationId } = e.detail;
      const room = `call_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const dbType = type === "audio" ? "voice" : type;

      try {
        setActiveCall({ room, type, targetUser: user, isIncoming: false, conversationId });

        // Initiate session in DB
        await api.post("/call/initiate", {
          room,
          type: dbType,
          receiverId: user._id,
          conversationId,
        });

        // Emit invite signal with conversationId
        socket.emit("call:invite", {
          room,
          userToCall: user._id,
          type,
          callerName: userData?.userName || userData?.name || "VYBE User",
          callerAvatar: userData?.profileImage?.url,
          conversationId,
        });

        toast.loading("Calling...", { id: "call-ringing" });

        // Ring timeout — auto-cancel after 30s
        ringTimeoutRef.current = setTimeout(() => {
          toast.dismiss("call-ringing");
          toast.error("No answer");
          // End the DB session
          api.post("/call/end", { room }).catch(() => null);
          setActiveCall(null);
        }, RING_TIMEOUT_MS);

      } catch (err) {
        toast.error("Failed to start call");
        setActiveCall(null);
      }
    };

    window.addEventListener("vybe:initiate-call", handleInitiateCallEvent);

    return () => {
      socket.off("call:invite-received", handleInvite);
      socket.off("call:response-received", handleResponse);
      socket.off("call:rejected", handleRejected);
      socket.off("call:status", handleCallStatus);
      window.removeEventListener("vybe:initiate-call", handleInitiateCallEvent);
      stopIncomingRingtone();
      stopOutgoingSound();
      clearRingTimeout();
    };
  }, [activeCall, incomingCall, userData, clearRingTimeout]);

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    stopIncomingRingtone();
    stopOutgoingSound();

    const socket = getSocket();
    const { room, type, from, callerName, callerAvatar, conversationId } = incomingCall;

    try {
      // Respond via API
      await api.post("/call/respond", { room, response: "joined" });

      // Signal back to caller
      socket?.emit("call:respond", { room, response: "accepted", to: from });

      setActiveCall({
        room,
        type,
        targetUser: { _id: from, userName: callerName, profileImage: { url: callerAvatar } },
        isIncoming: true,
        conversationId,
      });
      setIncomingCall(null);
    } catch (e) {
      toast.error("Failed to join call");
      setIncomingCall(null);
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;
    stopIncomingRingtone();
    stopOutgoingSound();

    const socket = getSocket();
    const { room, from } = incomingCall;

    try {
      await api.post("/call/respond", { room, response: "declined" });
      socket?.emit("call:respond", { room, response: "declined", to: from });
    } catch (e) {
      console.warn("Decline API call failed:", e);
    }

    setIncomingCall(null);
  };

  const handleHangUp = useCallback(async () => {
    if (!activeCall) return;

    // 1. Immediately dismiss call UI
    const targetCallRoom = activeCall.room;
    const targetUserId = activeCall.targetUser?._id || activeCall.targetUser;

    setActiveCall(null);
    toast.dismiss("call-ringing");
    clearRingTimeout();
    stopIncomingRingtone();
    stopOutgoingSound();

    // 2. Notify receiver to stop ringing (direct socket emit)
    const socket = getSocket();
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
  }, [activeCall, clearRingTimeout]);

  return (
    <>
      {/* Incoming Call Overlay */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 z-[999] w-full max-w-md bg-surface/90 border border-border backdrop-blur-xl p-4 rounded-3xl shadow-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center">
                {incomingCall.callerAvatar ? (
                  <img src={incomingCall.callerAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-lg">
                    {incomingCall.callerName?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-text">@{incomingCall.callerName}</h4>
                <p className="text-xs text-text-secondary flex items-center gap-1">
                  {incomingCall.type === "video" ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                  <span>Incoming {incomingCall.type} call...</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRejectCall}
                className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition shadow cursor-pointer"
                title="Decline"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
              <button
                onClick={handleAcceptCall}
                className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition shadow animate-bounce cursor-pointer"
                title="Accept"
              >
                <PhoneCall className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Render call session */}
      {activeCall && (
        <CallScreenWrapper
          room={activeCall.room}
          type={activeCall.type}
          currentUserId={userData?._id}
          callerName={activeCall.targetUser?.userName}
          onEndCall={handleHangUp}
          leaveRoomFnRef={leaveRoomFnRef}
        />
      )}
    </>
  );
};

// Wrapper to initialize WebRTC hook for the active room
const CallScreenWrapper = ({ room, type, currentUserId, callerName, onEndCall, leaveRoomFnRef }) => {
  const rtc = useWebRTC(room, currentUserId, type);

  // Expose leaveRoom to the parent via ref
  useEffect(() => {
    leaveRoomFnRef.current = rtc.leaveRoom;
  }, [rtc.leaveRoom, leaveRoomFnRef]);

  // Clear "Ringing..." notification if peer joins
  useEffect(() => {
    if (Object.keys(rtc.peers).length > 0) {
      toast.dismiss("call-ringing");
    }
  }, [rtc.peers]);

  return (
    <CallScreen
      localStream={rtc.localStream}
      peers={rtc.peers}
      isMuted={rtc.isMuted}
      isVideoOff={rtc.isVideoOff}
      isScreenSharing={rtc.isScreenSharing}
      isHandRaised={rtc.isHandRaised}
      activeSpeaker={rtc.activeSpeaker}
      onToggleMute={rtc.toggleMute}
      onToggleVideo={rtc.toggleVideo}
      onToggleScreenShare={rtc.toggleScreenShare}
      onToggleHand={rtc.toggleHand}
      onEndCall={onEndCall}
      audioInputDevices={rtc.audioInputDevices}
      videoDevices={rtc.videoDevices}
      audioOutputDevices={rtc.audioOutputDevices}
      selectedAudioInput={rtc.selectedAudioInput}
      setSelectedAudioInput={rtc.setSelectedAudioInput}
      selectedVideo={rtc.selectedVideo}
      setSelectedVideo={rtc.setSelectedVideo}
      selectedAudioOutput={rtc.selectedAudioOutput}
      setSelectedAudioOutput={rtc.setSelectedAudioOutput}
      roomTitle={`${callerName ? `@${callerName}` : "Room Session"}`}
      room={room}
      currentUserId={currentUserId}
      callerName={callerName}
      videoFilter={rtc.videoFilter}
      changeVideoFilter={rtc.changeVideoFilter}
    />
  );
};

export default CallManager;
