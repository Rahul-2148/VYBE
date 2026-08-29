import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize2,
  Minimize2,
  Move,
  Scaling,
} from "lucide-react";
import { useMeet } from "../../context/MeetContext";
import { triggerHaptic } from "../../lib/interactiveEffects";
import dp from "../../assets/dp3.png";

const RemoteAudioPlayer = React.memo(({ stream }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;

    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }

    el.muted = false;
    el.volume = 1.0;

    const playAudio = () => {
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("[MeetAudio] Remote audio play deferred by browser policy:", err?.message);
        });
      }
    };

    playAudio();

    const unlockOnInteraction = () => {
      if (el && el.paused) {
        playAudio();
      }
    };

    window.addEventListener("touchstart", unlockOnInteraction, { passive: true, once: true });
    window.addEventListener("click", unlockOnInteraction, { passive: true, once: true });

    return () => {
      window.removeEventListener("touchstart", unlockOnInteraction);
      window.removeEventListener("click", unlockOnInteraction);
    };
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline className="sr-only" />;
});

export const MeetFloatingWindow = () => {
  const { activeMeeting, isMinimized, rtc, expandMeeting, leaveMeeting } = useMeet();
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Window Dimension state: defaults to 340px x 215px
  const [size, setSize] = useState(() => {
    const w = Math.min(window.innerWidth - 32, 340);
    const h = Math.round(w * 0.62);
    return { width: w, height: h };
  });

  // Window Position state (x, y coordinates from top-left)
  const [position, setPosition] = useState(() => {
    const initialW = Math.min(window.innerWidth - 32, 340);
    const initialH = Math.round(initialW * 0.62);
    return {
      x: Math.max(16, window.innerWidth - initialW - 24),
      y: Math.max(16, window.innerHeight - initialH - 24),
    };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Drag tracking refs
  const dragStartRef = useRef({ startX: 0, startY: 0, initialPosX: 0, initialPosY: 0 });
  // Resize tracking refs
  const resizeStartRef = useRef({
    startX: 0,
    startY: 0,
    initialWidth: 0,
    initialHeight: 0,
    initialPosX: 0,
    initialPosY: 0,
    handle: "",
  });

  // Keep window clamped within viewport on screen resize
  useEffect(() => {
    const handleWindowResize = () => {
      setSize((prevSize) => {
        const maxW = Math.min(window.innerWidth - 24, 900);
        const maxH = Math.min(window.innerHeight - 24, 680);
        const newW = Math.min(prevSize.width, maxW);
        const newH = Math.min(prevSize.height, maxH);
        return { width: newW, height: newH };
      });

      setPosition((prevPos) => {
        const maxX = Math.max(12, window.innerWidth - size.width - 12);
        const maxY = Math.max(12, window.innerHeight - size.height - 12);
        return {
          x: Math.min(Math.max(12, prevPos.x), maxX),
          y: Math.min(Math.max(12, prevPos.y), maxY),
        };
      });
    };

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [size.width, size.height]);

  // 1. Fluid Pointer-Driven Drag Handler (Move Anywhere)
  const handlePointerDownDrag = useCallback((e) => {
    // Only trigger drag on main mouse button or touch
    if (e.button !== 0 && e.pointerType === "mouse") return;
    // Don't drag if clicking buttons
    if (e.target.closest("button") || e.target.closest("[data-no-drag]")) return;

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y,
    };

    const handlePointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;

      const maxX = Math.max(12, window.innerWidth - size.width - 12);
      const maxY = Math.max(12, window.innerHeight - size.height - 12);

      const nextX = Math.min(Math.max(12, dragStartRef.current.initialPosX + deltaX), maxX);
      const nextY = Math.min(Math.max(12, dragStartRef.current.initialPosY + deltaY), maxY);

      setPosition({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }, [position, size]);

  // 2. Dynamic Sizing Drag Handler (Press & Drag to Resize Smoothly)
  const handlePointerDownResize = useCallback((e, handle = "bottom-right") => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    triggerHaptic("light");

    resizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialWidth: size.width,
      initialHeight: size.height,
      initialPosX: position.x,
      initialPosY: position.y,
      handle,
    };

    const handlePointerMove = (moveEvent) => {
      const { startX, startY, initialWidth, initialHeight, initialPosX, initialPosY, handle: activeHandle } =
        resizeStartRef.current;

      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const minWidth = 220;
      const minHeight = 140;
      const maxWidth = Math.min(window.innerWidth - 24, 940);
      const maxHeight = Math.min(window.innerHeight - 24, 720);

      let newWidth = initialWidth;
      let newHeight = initialHeight;
      let newPosX = initialPosX;
      let newPosY = initialPosY;

      if (activeHandle.includes("right")) {
        newWidth = Math.min(Math.max(minWidth, initialWidth + deltaX), maxWidth);
      }
      if (activeHandle.includes("bottom")) {
        newHeight = Math.min(Math.max(minHeight, initialHeight + deltaY), maxHeight);
      }
      if (activeHandle.includes("left")) {
        const calculatedWidth = initialWidth - deltaX;
        if (calculatedWidth >= minWidth && calculatedWidth <= maxWidth) {
          newWidth = calculatedWidth;
          newPosX = initialPosX + deltaX;
        }
      }
      if (activeHandle.includes("top")) {
        const calculatedHeight = initialHeight - deltaY;
        if (calculatedHeight >= minHeight && calculatedHeight <= maxHeight) {
          newHeight = calculatedHeight;
          newPosY = initialPosY + deltaY;
        }
      }

      // Clamp position so window stays fully visible
      const clampedX = Math.min(Math.max(12, newPosX), window.innerWidth - newWidth - 12);
      const clampedY = Math.min(Math.max(12, newPosY), window.innerHeight - newHeight - 12);

      setSize({ width: Math.round(newWidth), height: Math.round(newHeight) });
      setPosition({ x: Math.round(clampedX), y: Math.round(clampedY) });
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }, [position, size]);

  // Quick Preset Scale Toggle (Compact <-> Medium <-> Theater)
  const cycleSizePreset = useCallback(() => {
    triggerHaptic("medium");
    setSize((current) => {
      if (current.width < 380) {
        // Switch to Medium
        const nextW = Math.min(window.innerWidth - 32, 480);
        const nextH = Math.round(nextW * 0.62);
        return { width: nextW, height: nextH };
      } else if (current.width < 600) {
        // Switch to Theater / Large
        const nextW = Math.min(window.innerWidth - 32, 680);
        const nextH = Math.round(nextW * 0.62);
        return { width: nextW, height: nextH };
      } else {
        // Switch to Compact
        const nextW = Math.min(window.innerWidth - 32, 320);
        const nextH = Math.round(nextW * 0.62);
        return { width: nextW, height: nextH };
      }
    });
  }, []);

  if (!activeMeeting || !isMinimized) {
    return null;
  }

  const peerList = Object.values(rtc.peers || {});
  const totalParticipants = 1 + peerList.length;

  const activePeer = peerList.find((p) => p.userId === rtc.activeSpeaker) || peerList[0];
  const displayStream = activePeer?.stream || (!rtc.isVideoOff ? rtc.localStream : null);
  const displayName = activePeer ? `@${activePeer.userName}` : "You";
  const displayAvatar = activePeer ? activePeer.profilePicture : dp;
  const isDisplayVideoOff = activePeer ? activePeer.videoOff : rtc.isVideoOff;

  return (
    <>
      {/* Ambient Top In-Meeting Quick Return Banner (Google Meet / iOS Call Bar) */}
      <div
        onClick={() => {
          triggerHaptic("medium");
          expandMeeting();
        }}
        className="fixed top-2.5 left-1/2 -translate-x-1/2 z-[99990] flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold backdrop-blur-xl shadow-xl cursor-pointer hover:bg-emerald-900/90 active:scale-95 transition-all select-none animate-in fade-in slide-in-from-top-2 duration-200"
        title="Tap to return to full meeting view"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
        <span className="truncate max-w-[140px] sm:max-w-[220px]">
          {activeMeeting.roomTitle || "Live Meeting"}
        </span>
        <span className="text-emerald-400 text-[10px] uppercase font-black tracking-wider bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded-md shrink-0">
          Return
        </span>
      </div>

      {/* Background Remote Audio Players — ensures call audio stays uninterrupted across routes */}
      {peerList.map((p) =>
        p.stream ? (
          <RemoteAudioPlayer
            key={`meet-float-audio-${p.socketId || p.userId}`}
            stream={p.stream}
          />
        ) : null
      )}

      {/* Dynamic Sizing & Free-Form Draggable Floating Mini Call Window */}
      <div
        ref={containerRef}
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          touchAction: "none",
        }}
        className={`fixed top-0 left-0 z-[99999] bg-[#1e1f20] border border-zinc-700/90 shadow-2xl rounded-3xl overflow-hidden flex flex-col justify-between select-none ${
          isDragging ? "cursor-grabbing shadow-[0_20px_50px_rgba(0,0,0,0.8)] ring-2 ring-rose-500/50" : ""
        } ${isResizing ? "ring-2 ring-emerald-500/60" : ""}`}
      >
        {/* Top Drag & Action Bar */}
        <div
          onPointerDown={handlePointerDownDrag}
          onDoubleClick={cycleSizePreset}
          className="relative flex-1 w-full h-full bg-zinc-950 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing group"
        >
          {!isDisplayVideoOff && displayStream ? (
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && el.srcObject !== displayStream) {
                  el.srcObject = displayStream;
                }
              }}
              autoPlay
              playsInline
              muted={!activePeer}
              className={`w-full h-full object-cover pointer-events-none ${!activePeer ? "-scale-x-100" : ""}`}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 pointer-events-none">
              <img
                src={displayAvatar || dp}
                alt={displayName}
                onError={(e) => { e.target.src = dp; }}
                className="w-14 h-14 rounded-full object-cover border-2 border-white/20 shadow-lg"
              />
              <span className="text-xs font-bold text-white">{displayName}</span>
            </div>
          )}

          {/* Top Header Controls */}
          <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between z-20 pointer-events-auto">
            <div className="bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-white flex items-center gap-1.5 border border-white/10 shadow-sm max-w-[180px] sm:max-w-[240px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">{activeMeeting.roomTitle || "Meeting"}</span>
              <span className="text-[10px] text-zinc-400 font-mono">({totalParticipants})</span>
            </div>

            <div className="flex items-center gap-1.5" data-no-drag>
              {/* Quick Cycle Size Preset Button */}
              <button
                type="button"
                data-testid="float-size-btn"
                onClick={cycleSizePreset}
                className="p-1.5 rounded-full bg-black/80 hover:bg-black/95 text-zinc-300 hover:text-white transition cursor-pointer border border-white/10 shadow-sm hover:scale-105 active:scale-95"
                title={`Resize Window (${size.width}x${size.height}px)`}
              >
                <Scaling className="w-3.5 h-3.5" />
              </button>

              {/* Expand to Full Screen Meeting Button */}
              <button
                type="button"
                data-testid="float-expand-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  expandMeeting();
                }}
                className="p-1.5 rounded-full bg-black/80 hover:bg-black/95 text-white transition cursor-pointer border border-white/10 shadow-sm hover:scale-105 active:scale-95"
                title="Expand to Full Meeting"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Controls Bar */}
          <div
            data-no-drag
            className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 z-20 shadow-xl pointer-events-auto"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic("light");
                rtc.toggleMute();
              }}
              className={`p-2 rounded-full transition cursor-pointer ${
                rtc.isMuted
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-xs"
                  : "bg-zinc-800 hover:bg-zinc-700 text-white"
              }`}
              title={rtc.isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {rtc.isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic("light");
                rtc.toggleVideo();
              }}
              className={`p-2 rounded-full transition cursor-pointer ${
                rtc.isVideoOff
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-xs"
                  : "bg-zinc-800 hover:bg-zinc-700 text-white"
              }`}
              title={rtc.isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
            >
              {rtc.isVideoOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                leaveMeeting();
              }}
              className="p-2 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white transition cursor-pointer shadow-xs"
              title="Leave Meeting"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dynamic Corner & Edge Resize Handles */}
          {/* Bottom-Right Handle with Visual Grip */}
          <div
            onPointerDown={(e) => handlePointerDownResize(e, "bottom-right")}
            data-testid="float-resize-br"
            className="absolute bottom-0 right-0 w-6 h-6 z-30 cursor-nwse-resize flex items-end justify-end p-1 group/grip"
            title="Drag to resize window"
          >
            <div className="w-3 h-3 border-r-2 border-b-2 border-white/50 group-hover/grip:border-rose-400 transition rounded-br-sm pointer-events-none" />
          </div>

          {/* Bottom-Left Handle */}
          <div
            onPointerDown={(e) => handlePointerDownResize(e, "bottom-left")}
            className="absolute bottom-0 left-0 w-5 h-5 z-30 cursor-nesw-resize"
            title="Drag to resize"
          />

          {/* Top-Left Handle */}
          <div
            onPointerDown={(e) => handlePointerDownResize(e, "top-left")}
            className="absolute top-0 left-0 w-5 h-5 z-30 cursor-nwse-resize"
            title="Drag to resize"
          />

          {/* Top-Right Handle */}
          <div
            onPointerDown={(e) => handlePointerDownResize(e, "top-right")}
            className="absolute top-0 right-0 w-5 h-5 z-30 cursor-nesw-resize"
            title="Drag to resize"
          />

          {/* Right Edge Handle */}
          <div
            onPointerDown={(e) => handlePointerDownResize(e, "right")}
            className="absolute top-6 bottom-6 right-0 w-2 z-30 cursor-ew-resize hover:bg-rose-500/30 transition"
            title="Drag to resize width"
          />

          {/* Bottom Edge Handle */}
          <div
            onPointerDown={(e) => handlePointerDownResize(e, "bottom")}
            className="absolute bottom-0 left-6 right-6 h-2 z-30 cursor-ns-resize hover:bg-rose-500/30 transition"
            title="Drag to resize height"
          />
        </div>
      </div>
    </>
  );
};

export default MeetFloatingWindow;
