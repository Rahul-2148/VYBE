import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, PhoneCall, Mic, MicOff, Video, VideoOff, Maximize2 } from "lucide-react";
import dp from "../assets/dp3.png";

export const CallModal = ({
  isOpen,
  onClose,
  callType = "video", // 'audio' or 'video'
  isIncoming = false,
  callerName = "User",
  callerAvatar,
  onAccept,
  onReject,
  onEndCall,
  localStream,
  remoteStream,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!isOpen) return null;

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => (track.enabled = !isMuted));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => (track.enabled = !isVideoOff));
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-bg/90 backdrop-blur-md p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl h-[80vh] bg-surface-inset border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
        >
          {/* Main Video Area */}
          <div className="relative flex-1 w-full h-full bg-surface flex items-center justify-center overflow-hidden">
            {callType === "video" && remoteStream ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="relative p-1 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 shadow-2xl animate-pulse">
                  <img
                    src={callerAvatar || dp}
                    alt=""
                    className="w-24 h-24 rounded-full object-cover border-4 border-bg"
                  />
                </div>
                <h3 className="text-2xl font-bold text-text tracking-tight">{callerName}</h3>
                <p className="text-xs text-text-secondary">
                  {isIncoming ? `Incoming ${callType} call...` : "Calling..."}
                </p>
              </div>
            )}

            {/* Local Pip Video Overlay */}
            {callType === "video" && localStream && (
              <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-bg">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Call Controls Bar */}
          <div className="p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-center gap-6">
            {isIncoming ? (
              <div className="flex items-center gap-8">
                <button
                  onClick={onReject}
                  className="p-5 rounded-full bg-rose-600 hover:bg-rose-500 text-text shadow-xl transition transform hover:scale-110"
                  title="Decline Call"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>

                <button
                  onClick={onAccept}
                  className="p-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-text-inverse shadow-xl transition transform hover:scale-110 animate-bounce"
                  title="Accept Call"
                >
                  <PhoneCall className="w-7 h-7" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleMute}
                  className={`p-4 rounded-full transition ${
                    isMuted ? "bg-rose-600 text-text" : "bg-surface-hover hover:bg-surface-active text-text"
                  }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                {callType === "video" && (
                  <button
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition ${
                      isVideoOff ? "bg-rose-600 text-text" : "bg-surface-hover hover:bg-surface-active text-text"
                    }`}
                  >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </button>
                )}

                <button
                  onClick={onEndCall || onClose}
                  className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-text shadow-xl transition transform hover:scale-105"
                  title="End Call"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CallModal;
