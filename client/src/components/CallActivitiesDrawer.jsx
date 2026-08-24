// client/src/components/CallActivitiesDrawer.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  ChevronLeft,
  PenTool,
  Radio,
  BarChart2,
  HelpCircle,
  Sparkles,
  VolumeX,
  Shield,
  Plus,
  Check,
  Download,
  Trash2,
  RotateCcw,
  ThumbsUp,
  Play,
  Square,
  Pause,
  Layers,
  LayoutGrid,
  CheckCircle2,
  Smartphone,
  Volume2,
} from "lucide-react";
import {
  triggerHaptic,
  microAudio,
  getHapticsEnabled,
  setHapticsEnabled,
  getSoundEffectsEnabled,
  setSoundEffectsEnabled,
} from "../lib/interactiveEffects";
import { snackbar } from "../lib/snackbar";

export const CallActivitiesDrawer = ({
  isOpen,
  onClose,
  isHost,
  isRecording,
  recordingDuration,
  onToggleRecording,
  videoFilter,
  onChangeVideoFilter,
  onMuteAll,
  hostSettings = {
    allowScreenShare: true,
    allowChat: true,
    allowMic: true,
    allowReactions: true,
  },
  onUpdateHostSettings,
  myUserName = "You",
  socket,
  room,
}) => {
  const [activeActivity, setActiveActivity] = useState(null); // null (grid), 'whiteboard', 'recording', 'polls', 'qna', 'effects', 'host', 'sensory'
  const [drawerHapticsOn, setDrawerHapticsOn] = useState(() => getHapticsEnabled());
  const [drawerSoundsOn, setDrawerSoundsOn] = useState(() => getSoundEffectsEnabled());

  // ==========================================
  // 1. WHITEBOARD STATE & CANVAS
  // ==========================================
  const canvasRef = useRef(null);
  const [brushColor, setBrushColor] = useState("#3b82f6");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const initCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  useEffect(() => {
    if (activeActivity === "whiteboard") {
      setTimeout(initCanvas, 50);
    }
  }, [activeActivity, initCanvas]);

  const drawRemoteStroke = useCallback((stroke) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = stroke.isEraser ? "#18181b" : stroke.color;
    ctx.lineWidth = stroke.isEraser ? stroke.size * 3 : stroke.size;
    ctx.beginPath();
    ctx.moveTo(stroke.prevX, stroke.prevY);
    ctx.lineTo(stroke.x, stroke.y);
    ctx.stroke();
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    lastPosRef.current = { x, y };
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const prevX = lastPosRef.current.x;
    const prevY = lastPosRef.current.y;

    ctx.strokeStyle = isEraser ? "#18181b" : brushColor;
    ctx.lineWidth = isEraser ? brushSize * 3 : brushSize;
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPosRef.current = { x, y };

    if (socket && room) {
      socket.emit("call:action", {
        room,
        action: "whiteboard-draw",
        stroke: {
          prevX,
          prevY,
          x,
          y,
          color: brushColor,
          size: brushSize,
          isEraser,
        },
      });
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = useCallback((emit = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (emit && socket && room) {
      socket.emit("call:action", {
        room,
        action: "whiteboard-clear",
      });
      snackbar.info("Whiteboard cleared 🧼");
    }
  }, [socket, room]);

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `vybe-whiteboard-${Date.now()}.png`;
    a.click();
    snackbar.success("Whiteboard downloaded 🎨");
  };

  // ==========================================
  // 2. POLLS STATE (Real-Time Synchronized)
  // ==========================================
  const [polls, setPolls] = useState([]);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);

  const handleVotePoll = (pollId, optIdx) => {
    triggerHaptic("selection");
    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;
        const alreadyVoted = p.userVotedOptionIndex !== undefined;
        const newOptions = p.options.map((opt, i) => {
          let count = opt.votes;
          if (alreadyVoted && p.userVotedOptionIndex === i) count = Math.max(0, count - 1);
          if (i === optIdx) count += 1;
          return { ...opt, votes: count };
        });
        return {
          ...p,
          options: newOptions,
          userVotedOptionIndex: optIdx,
        };
      })
    );

    if (socket && room) {
      socket.emit("call:action", {
        room,
        action: "vote-poll",
        pollId,
        optIdx,
        voter: myUserName,
      });
    }
    snackbar.success("Vote recorded! 📊");
  };

  const handleCreatePoll = (e) => {
    e.preventDefault();
    if (!newPollQuestion.trim()) return;
    const validOptions = newPollOptions.filter((o) => o.trim().length > 0);
    if (validOptions.length < 2) {
      snackbar.error("Please provide at least 2 options");
      return;
    }

    const created = {
      id: `poll-${Date.now()}-${Math.random().toString(36).substring(4)}`,
      question: newPollQuestion.trim(),
      options: validOptions.map((t) => ({ text: t.trim(), votes: 0 })),
      userVotedOptionIndex: undefined,
      creator: myUserName,
      isActive: true,
      createdAt: Date.now(),
    };

    setPolls((prev) => [created, ...prev]);
    setNewPollQuestion("");
    setNewPollOptions(["", ""]);
    setIsCreatingPoll(false);

    if (socket && room) {
      socket.emit("call:action", {
        room,
        action: "create-poll",
        poll: created,
      });
    }
    snackbar.success("Poll launched live! 🚀");
  };

  // ==========================================
  // 3. Q&A STATE (Real-Time Synchronized)
  // ==========================================
  const [questions, setQuestions] = useState([]);
  const [newQuestionText, setNewQuestionText] = useState("");

  const handleAskQuestion = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    const created = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(4)}`,
      author: myUserName,
      text: newQuestionText.trim(),
      upvotes: 0,
      isAnswered: false,
      hasUpvoted: false,
      createdAt: Date.now(),
    };

    setQuestions((prev) => [created, ...prev]);
    setNewQuestionText("");

    if (socket && room) {
      socket.emit("call:action", {
        room,
        action: "ask-question",
        question: created,
      });
    }
    snackbar.success("Question submitted to speakers! ❓");
  };

  const handleUpvoteQuestion = (qId) => {
    triggerHaptic("selection");
    let isNowUpvoted = false;
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        isNowUpvoted = !q.hasUpvoted;
        return {
          ...q,
          upvotes: isNowUpvoted ? q.upvotes + 1 : Math.max(0, q.upvotes - 1),
          hasUpvoted: isNowUpvoted,
        };
      })
    );

    if (socket && room) {
      socket.emit("call:action", {
        room,
        action: "upvote-question",
        qId,
        isUpvoted: isNowUpvoted,
      });
    }
  };

  const handleToggleAnsweredQuestion = (qId) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        const state = !q.isAnswered;
        if (socket && room) {
          socket.emit("call:action", {
            room,
            action: "answer-question",
            qId,
            isAnswered: state,
          });
        }
        return { ...q, isAnswered: state };
      })
    );
  };

  // ==========================================
  // 4. REAL-TIME SOCKET BROADCAST SYNC
  // ==========================================
  useEffect(() => {
    if (!socket) return;

    const handleBroadcast = (data) => {
      if (!data || !data.action) return;

      switch (data.action) {
        case "create-poll":
          if (data.poll) {
            setPolls((prev) => {
              if (prev.some((p) => p.id === data.poll.id)) return prev;
              return [data.poll, ...prev];
            });
            snackbar.info(`📊 New live poll from ${data.poll.creator || "Host"}`);
          }
          break;

        case "vote-poll":
          if (data.pollId) {
            setPolls((prev) =>
              prev.map((p) => {
                if (p.id !== data.pollId) return p;
                const newOptions = p.options.map((opt, i) => {
                  if (i === data.optIdx) {
                    return { ...opt, votes: opt.votes + 1 };
                  }
                  return opt;
                });
                return { ...p, options: newOptions };
              })
            );
          }
          break;

        case "ask-question":
          if (data.question) {
            setQuestions((prev) => {
              if (prev.some((q) => q.id === data.question.id)) return prev;
              return [data.question, ...prev];
            });
            snackbar.info(`❓ New question from ${data.question.author || "Participant"}`);
          }
          break;

        case "upvote-question":
          if (data.qId) {
            setQuestions((prev) =>
              prev.map((q) => {
                if (q.id !== data.qId) return q;
                return {
                  ...q,
                  upvotes: data.isUpvoted ? q.upvotes + 1 : Math.max(0, q.upvotes - 1),
                };
              })
            );
          }
          break;

        case "answer-question":
          if (data.qId) {
            setQuestions((prev) =>
              prev.map((q) => (q.id === data.qId ? { ...q, isAnswered: data.isAnswered } : q))
            );
          }
          break;

        case "whiteboard-draw":
          if (data.stroke) {
            drawRemoteStroke(data.stroke);
          }
          break;

        case "whiteboard-clear":
          clearCanvas(false);
          break;

        default:
          break;
      }
    };

    socket.on("call:action-broadcast", handleBroadcast);
    return () => {
      socket.off("call:action-broadcast", handleBroadcast);
    };
  }, [socket, drawRemoteStroke, clearCanvas]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-[#1e1f20] text-white select-none overflow-hidden font-sans border-l border-zinc-700/80">
      {/* DRAWER TOP BAR */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-700/80 shrink-0">
        <div className="flex items-center gap-2">
          {activeActivity && (
            <button
              type="button"
              onClick={() => setActiveActivity(null)}
              className="p-1 hover:bg-white/10 rounded-full transition cursor-pointer text-zinc-300 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
            {!activeActivity && <LayoutGrid className="w-4 h-4 text-blue-400" />}
            {activeActivity === "whiteboard" && "Whiteboard"}
            {activeActivity === "recording" && "Call Recording"}
            {activeActivity === "polls" && "Live Polls"}
            {activeActivity === "qna" && "Q&A"}
            {activeActivity === "effects" && "Visual Effects & Tone"}
            {activeActivity === "host" && "Host Controls"}
            {!activeActivity && "Activities"}
          </h3>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* DRAWER CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
        {/* ============================================================
            1. ACTIVITIES HOME GRID (EXACT GOOGLE MEET SELECTION MENU)
            ============================================================ */}
        {!activeActivity && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Collaborate, brainstorm, launch live polls, and record in real-time.
            </p>

            <div className="space-y-2">
              {/* Whiteboard */}
              <button
                type="button"
                onClick={() => setActiveActivity("whiteboard")}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#28292a] hover:bg-[#333537] border border-zinc-700/60 transition cursor-pointer text-left group shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition">
                      Whiteboard (Live Canvas)
                    </h4>
                    <p className="text-[11px] text-zinc-400">Collaborative live drawing & sketching</p>
                  </div>
                </div>
              </button>

              {/* Call Recording */}
              <button
                type="button"
                onClick={() => setActiveActivity("recording")}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#28292a] hover:bg-[#333537] border border-zinc-700/60 transition cursor-pointer text-left group shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-rose-400 transition">
                      Call Recording
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      {isRecording ? "🔴 Recording in progress..." : "Record meeting audio & video"}
                    </p>
                  </div>
                </div>
              </button>

              {/* Polls */}
              <button
                type="button"
                onClick={() => setActiveActivity("polls")}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#28292a] hover:bg-[#333537] border border-zinc-700/60 transition cursor-pointer text-left group shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                      Live Polls {polls.length > 0 && `(${polls.length})`}
                    </h4>
                    <p className="text-[11px] text-zinc-400">Instant questions & realtime vote percentages</p>
                  </div>
                </div>
              </button>

              {/* Q&A */}
              <button
                type="button"
                onClick={() => setActiveActivity("qna")}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#28292a] hover:bg-[#333537] border border-zinc-700/60 transition cursor-pointer text-left group shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition">
                      Q&A {questions.length > 0 && `(${questions.length})`}
                    </h4>
                    <p className="text-[11px] text-zinc-400">Ask live questions and upvote inquiries</p>
                  </div>
                </div>
              </button>

              {/* Visual Effects */}
              <button
                type="button"
                onClick={() => setActiveActivity("effects")}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#28292a] hover:bg-[#333537] border border-zinc-700/60 transition cursor-pointer text-left group shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-pink-400 transition">
                      Visual Filters & Tone
                    </h4>
                    <p className="text-[11px] text-zinc-400">Vibrant contrast, Noir, warm tone, blur</p>
                  </div>
                </div>
              </button>

              {/* Host Controls */}
              <button
                type="button"
                onClick={() => setActiveActivity("host")}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#28292a] hover:bg-[#333537] border border-zinc-700/60 transition cursor-pointer text-left group shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition">
                      Host Controls
                    </h4>
                    <p className="text-[11px] text-zinc-400">Meeting security, permissions & mute all</p>
                  </div>
                </div>
              </button>

              {/* Sensory & Feedback (Haptics & Micro Sounds) */}
              <button
                type="button"
                onClick={() => setActiveActivity("sensory")}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#28292a] hover:bg-[#333537] border border-zinc-700/60 transition cursor-pointer text-left group shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-purple-400 transition">
                      Haptics & Micro-Sounds
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      {drawerHapticsOn ? "📳 Haptics On" : "📳 Haptics Off"} • {drawerSoundsOn ? "🔔 Sound On" : "🔕 Sound Off"}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            2. WHITEBOARD VIEW (Real-Time Collaborative)
            ============================================================ */}
        {activeActivity === "whiteboard" && (
          <div className="space-y-3 flex flex-col h-full">
            {/* Whiteboard Controls */}
            <div className="flex items-center justify-between gap-1 p-2 bg-[#28292a] rounded-xl border border-zinc-700/60 shrink-0">
              <div className="flex items-center gap-1.5">
                {["#3b82f6", "#10b981", "#f43f5e", "#a855f7", "#f59e0b", "#ffffff"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setIsEraser(false);
                      setBrushColor(color);
                    }}
                    style={{ backgroundColor: color }}
                    className={`w-5 h-5 rounded-full border transition cursor-pointer ${
                      brushColor === color && !isEraser ? "scale-125 border-white shadow-md" : "border-transparent"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1">
                {[2, 4, 8].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setBrushSize(size)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                      brushSize === size ? "bg-blue-600 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    {size}px
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsEraser(!isEraser)}
                  className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isEraser ? "bg-rose-500 text-white" : "bg-white/10 text-zinc-300 hover:bg-white/15"
                  }`}
                  title="Eraser"
                >
                  Eraser
                </button>
                <button
                  type="button"
                  onClick={() => clearCanvas(true)}
                  className="p-1.5 rounded-lg bg-white/10 text-zinc-300 hover:text-rose-400 hover:bg-white/15 transition cursor-pointer"
                  title="Clear Whiteboard"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={downloadCanvas}
                  className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition cursor-pointer"
                  title="Save PNG"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Interactive HTML5 Canvas */}
            <div className="relative flex-1 min-h-[340px] rounded-2xl overflow-hidden border border-zinc-700/80 bg-zinc-900 shadow-inner">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full cursor-crosshair touch-none"
              />
            </div>
          </div>
        )}

        {/* ============================================================
            3. RECORDING VIEW
            ============================================================ */}
        {activeActivity === "recording" && (
          <div className="space-y-4 text-center py-6">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <Radio className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Cloud & Local Meeting Recording</h4>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Record your video, audio, and presentation screens. When stopped, video automatically downloads directly to your device.
              </p>
            </div>

            {isRecording && (
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-950/80 border border-rose-500/50 text-rose-300 font-mono text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>REC {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={onToggleRecording}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-lg ${
                  isRecording
                    ? "bg-zinc-800 hover:bg-zinc-700 text-rose-400 border border-rose-500/30"
                    : "bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-90 text-white shadow-rose-600/30"
                }`}
              >
                {isRecording ? <Square className="w-4 h-4 fill-rose-400" /> : <Play className="w-4 h-4 fill-white" />}
                <span>{isRecording ? "Stop Recording" : "Start Recording"}</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            4. POLLS VIEW (Clean, Real-time)
            ============================================================ */}
        {activeActivity === "polls" && (
          <div className="space-y-4">
            {!isCreatingPoll ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsCreatingPoll(true)}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start a Poll</span>
                </button>

                {polls.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
                      <BarChart2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-bold text-white">No active polls</h4>
                    <p className="text-[11px] text-zinc-400 max-w-[200px] mx-auto">
                      Launch a poll to collect live votes and opinions from participants in real-time.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {polls.map((p) => {
                      const totalVotes = p.options.reduce((acc, o) => acc + o.votes, 0);

                      return (
                        <div key={p.id} className="p-3.5 rounded-2xl bg-[#28292a] border border-zinc-700/60 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs font-bold text-white">{p.question}</h4>
                              <span className="text-[10px] text-zinc-400">By {p.creator}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-medium shrink-0 bg-zinc-800 px-2 py-0.5 rounded-full">
                              {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {p.options.map((opt, optIdx) => {
                              const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                              const isSelected = p.userVotedOptionIndex === optIdx;

                              return (
                                <div
                                  key={optIdx}
                                  onClick={() => handleVotePoll(p.id, optIdx)}
                                  className={`relative p-2.5 rounded-xl border transition cursor-pointer overflow-hidden ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-500/10 text-white shadow-xs"
                                      : "border-zinc-700/80 bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300"
                                  }`}
                                >
                                  {/* Progress Bar Background */}
                                  <div
                                    className="absolute top-0 left-0 bottom-0 bg-blue-600/25 transition-all duration-300"
                                    style={{ width: `${pct}%` }}
                                  />

                                  <div className="relative flex items-center justify-between text-xs font-medium z-10">
                                    <span className="truncate">{opt.text}</span>
                                    <span className="text-[11px] font-bold text-zinc-300 ml-2">{pct}%</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              /* Create Poll Form */
              <form onSubmit={handleCreatePoll} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">Question</label>
                  <input
                    type="text"
                    required
                    placeholder="Ask a question..."
                    value={newPollQuestion}
                    onChange={(e) => setNewPollQuestion(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-300 block">Options</label>
                  {newPollOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const copy = [...newPollOptions];
                        copy[idx] = e.target.value;
                        setNewPollOptions(copy);
                      }}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
                    />
                  ))}
                  {newPollOptions.length < 5 && (
                    <button
                      type="button"
                      onClick={() => setNewPollOptions([...newPollOptions, ""])}
                      className="text-xs text-blue-400 hover:text-blue-300 font-bold cursor-pointer"
                    >
                      + Add Option
                    </button>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingPoll(false)}
                    className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Launch Poll
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================
            5. Q&A VIEW (Clean, Real-time)
            ============================================================ */}
        {activeActivity === "qna" && (
          <div className="space-y-4">
            <form onSubmit={handleAskQuestion} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask a question..."
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!newQuestionText.trim()}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer"
              >
                Ask
              </button>
            </form>

            {questions.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-white">No questions asked yet</h4>
                <p className="text-[11px] text-zinc-400 max-w-[200px] mx-auto">
                  Type a question above to start an interactive Q&A session with attendees.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                {questions.map((q) => (
                  <div key={q.id} className="p-3 rounded-2xl bg-[#28292a] border border-zinc-700/60 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="font-bold text-zinc-300">@{q.author}</span>
                      {q.isAnswered && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                          Answered
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-white leading-relaxed">{q.text}</p>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-700/40">
                      <button
                        type="button"
                        onClick={() => handleUpvoteQuestion(q.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                          q.hasUpvoted
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "text-zinc-400 hover:text-white bg-zinc-800"
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{q.upvotes}</span>
                      </button>

                      {isHost && (
                        <button
                          type="button"
                          onClick={() => handleToggleAnsweredQuestion(q.id)}
                          className="text-[10px] text-zinc-400 hover:text-emerald-400 font-bold cursor-pointer transition"
                        >
                          {q.isAnswered ? "Mark Unanswered" : "Mark as Answered"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            6. VISUAL EFFECTS & BACKGROUNDS
            ============================================================ */}
        {activeActivity === "effects" && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Video Filters & Tone</h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "none", label: "Normal" },
                { id: "grayscale", label: "Noir" },
                { id: "warm", label: "Warm" },
                { id: "cool", label: "Cool" },
                { id: "contrast", label: "Vibrant" },
                { id: "blur", label: "Blur Cam" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    onChangeVideoFilter?.(f.id);
                  }}
                  className={`p-3 rounded-2xl text-xs font-bold border transition text-center cursor-pointer ${
                    videoFilter === f.id
                      ? "bg-pink-600 text-white border-pink-500 shadow-md shadow-pink-600/30"
                      : "bg-[#28292a] border-zinc-700 text-zinc-300 hover:bg-[#333537]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================
            7. HOST CONTROLS VIEW (Real-Time Synchronized)
            ============================================================ */}
        {activeActivity === "host" && (
          <div className="space-y-4">
            <div className={`p-3 rounded-2xl border space-y-1 ${
              isHost ? "bg-blue-950/40 border-blue-500/30" : "bg-zinc-800/60 border-zinc-700/60"
            }`}>
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${isHost ? "text-blue-400" : "text-zinc-400"}`} />
                <h4 className="text-xs font-bold text-white">
                  {isHost ? "Host Management" : "Meeting Policies"}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400">
                {isHost
                  ? "Control attendee privileges, live security and room-wide moderation."
                  : "Meeting permissions are actively configured by the host."}
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                { key: "allowMic", label: "Turn on their microphone", desc: "Allow attendees to unmute" },
                { key: "allowCamera", label: "Turn on their video", desc: "Allow attendees to turn on camera" },
                { key: "allowScreenShare", label: "Share their screen", desc: "Allow participants to present" },
                { key: "allowChat", label: "Send in-call chat", desc: "Allow text discussions" },
                { key: "allowReactions", label: "Send emoji reactions", desc: "Allow floating reaction bursts" },
              ].map((ctrl) => (
                <div
                  key={ctrl.key}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#28292a] border border-zinc-700/60 transition"
                >
                  <div className="pr-2">
                    <span className="text-xs font-bold text-white block">{ctrl.label}</span>
                    <span className="text-[10px] text-zinc-400 block">{ctrl.desc}</span>
                  </div>
                  {isHost ? (
                    <input
                      type="checkbox"
                      checked={Boolean(hostSettings[ctrl.key])}
                      onChange={() => {
                        const updated = {
                          ...hostSettings,
                          [ctrl.key]: !hostSettings[ctrl.key],
                        };
                        triggerHaptic("selection");
                        onUpdateHostSettings?.(updated);
                        snackbar.success(
                          `${ctrl.label} ${updated[ctrl.key] ? "allowed" : "restricted"} for participants`
                        );
                      }}
                      className="accent-blue-500 w-4 h-4 cursor-pointer"
                    />
                  ) : (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hostSettings[ctrl.key] ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    }`}>
                      {hostSettings[ctrl.key] ? "Allowed" : "Restricted"}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {isHost && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("medium");
                    onMuteAll?.();
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                >
                  <VolumeX className="w-4 h-4" />
                  <span>Mute All Participants</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            8. SENSORY FEEDBACK & HAPTICS VIEW
            ============================================================ */}
        {activeActivity === "sensory" && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <h4 className="text-xs font-bold text-purple-300 mb-1 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-purple-400" />
                Haptics & Sensory Effects
              </h4>
              <p className="text-[11px] text-zinc-400">
                Customize touch vibrations and acoustic micro-feedback for a personalized meeting experience.
              </p>
            </div>

            <div className="space-y-3">
              {/* Haptic Vibration Toggle */}
              <div className="p-3.5 rounded-2xl bg-[#28292a] border border-zinc-700/60 flex items-center justify-between">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-white block">📳 Haptic Vibration</span>
                  <span className="text-[10px] text-zinc-400 block">Vibrate on buttons, toggles and emoji reactions</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("heavy");
                      snackbar.info("Haptic vibration tested 📳");
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer border border-zinc-700"
                  >
                    Test
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !drawerHapticsOn;
                      setDrawerHapticsOn(next);
                      setHapticsEnabled(next);
                      if (next) triggerHaptic("medium");
                      snackbar.success(`Haptics ${next ? "Enabled" : "Disabled"}`);
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      drawerHapticsOn ? "bg-purple-600" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        drawerHapticsOn ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Micro-Sound Effects Toggle */}
              <div className="p-3.5 rounded-2xl bg-[#28292a] border border-zinc-700/60 flex items-center justify-between">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-white block">🔔 Sound Effects & Chimes</span>
                  <span className="text-[10px] text-zinc-400 block">Acoustic chimes for joins, leaves, hand raise & reactions</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      microAudio?.playPop?.();
                      snackbar.info("Audio chime tested 🔔");
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer border border-zinc-700"
                  >
                    Test
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !drawerSoundsOn;
                      setDrawerSoundsOn(next);
                      setSoundEffectsEnabled(next);
                      if (next) microAudio?.playPop?.();
                      snackbar.success(`Sound effects ${next ? "Enabled" : "Disabled"}`);
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      drawerSoundsOn ? "bg-purple-600" : "bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        drawerSoundsOn ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallActivitiesDrawer;
