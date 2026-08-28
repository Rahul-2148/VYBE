import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Sparkles,
  Copy,
  Check,
  Send,
  Loader2,
  FileText,
  Zap,
  CheckSquare,
  Lightbulb,
  Mail,
  HelpCircle,
  Share2,
  Download,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Bot,
  User,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import api from "../../lib/axios";
import { snackbar } from "../../lib/snackbar";
import { triggerHaptic, microAudio } from "../../lib/interactiveEffects";

/**
 * Google Gemini Official 4-Point Star Icon with Vibrant Workspace Gradient
 */
export const GoogleGeminiStar = ({ className = "w-5 h-5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
      fill="url(#gemini-gradient)"
    />
    <defs>
      <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4285f4" />
        <stop offset="50%" stopColor="#9b72cb" />
        <stop offset="100%" stopColor="#d96570" />
      </linearGradient>
    </defs>
  </svg>
);

export const MeetGeminiDrawer = ({
  isOpen,
  onClose,
  meetingId,
  meetingTitle = "VYBE Meeting",
  transcript = "",
  chatMessages = [],
  onSendToChat,
}) => {
  const [messages, setMessages] = useState([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [feedbackState, setFeedbackState] = useState({}); // { [msgId]: 'up' | 'down' }
  const scrollRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Clean speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleRunAIAction = async (actionType, customText = "") => {
    if (isLoading) return;

    let promptLabel = "";
    switch (actionType) {
      case "summary":
        promptLabel = "Take notes for me";
        break;
      case "catch-up":
        promptLabel = "Catch me up on what happened";
        break;
      case "action-items":
        promptLabel = "Extract all action items & owners";
        break;
      case "decisions":
        promptLabel = "What key decisions were made?";
        break;
      case "email":
        promptLabel = "Draft a meeting recap email";
        break;
      case "questions":
        promptLabel = "List unresolved questions & debates";
        break;
      default:
        promptLabel = customText;
    }

    const userMsgId = `user_${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      role: "user",
      text: promptLabel,
      actionType,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    triggerHaptic("medium");

    try {
      const res = await api.post(`/meet/${meetingId}/ai-assistant`, {
        actionType,
        customPrompt: customText,
        transcript,
        chatMessages,
      });

      if (res.data?.success && res.data.content) {
        const modelMsg = {
          id: `model_${Date.now()}`,
          role: "model",
          text: res.data.content,
          actionType,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, modelMsg]);
        microAudio?.playSuccess?.();
      } else {
        snackbar.error("Could not generate AI meeting insights");
      }
    } catch (err) {
      console.error("[MeetGeminiDrawer] AI error:", err);
      const errMsg =
        err.response?.data?.message || "Failed to generate AI insights. Please try again.";
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "model",
          isError: true,
          text: `⚠️ **AI Notice:** ${errMsg}`,
          actionType,
          timestamp: new Date().toISOString(),
        },
      ]);
      snackbar.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = async (text, id) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      triggerHaptic("success");
      snackbar.success("Copied to clipboard! 📋");
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      snackbar.error("Could not copy to clipboard");
    }
  };

  const handleShareToChat = (text) => {
    if (!text) return;
    if (onSendToChat) {
      onSendToChat(text);
      triggerHaptic("medium");
      snackbar.success("Sent Gemini notes to meeting chat! 💬");
    } else {
      handleCopyText(text, "share");
    }
  };

  const handleExportDoc = (text, title = "Meeting_Notes") => {
    if (!text) return;
    try {
      const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      triggerHaptic("success");
      snackbar.success("Exported meeting notes as Markdown file! 📥");
    } catch {
      snackbar.error("Could not export document");
    }
  };

  const handleToggleSpeak = (text, id) => {
    if (!window.speechSynthesis) {
      snackbar.info("Speech synthesis not supported in this browser");
      return;
    }

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean markdown symbols for natural speech
    const cleanText = text
      .replace(/[#*`_~[\]()]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
    triggerHaptic("light");
  };

  const handleFeedback = (id, type) => {
    setFeedbackState((prev) => ({ ...prev, [id]: type }));
    triggerHaptic("light");
    snackbar.info(type === "up" ? "Thanks for your feedback! 👍" : "Feedback received. We'll improve! 👎");
  };

  const handleClearHistory = () => {
    setMessages([]);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeakingId(null);
    triggerHaptic("light");
    snackbar.info("Gemini conversation cleared");
  };

  const quickPills = [
    { id: "summary", label: "Take notes for me", icon: FileText, desc: "Executive summary, topics & action items" },
    { id: "catch-up", label: "Catch me up", icon: Zap, desc: "Quick highlights for late joiners" },
    { id: "action-items", label: "Action items", icon: CheckSquare, desc: "Task checklist with owners" },
    { id: "decisions", label: "Key decisions", icon: Lightbulb, desc: "Agreements & consensus reached" },
    { id: "email", label: "Draft follow-up email", icon: Mail, desc: "Ready-to-send recap email" },
    { id: "questions", label: "Unresolved questions", icon: HelpCircle, desc: "Open topics needing review" },
  ];

  const transcriptLineCount = transcript ? transcript.split("\n").filter(Boolean).length : 0;
  const chatCount = Array.isArray(chatMessages) ? chatMessages.length : 0;

  return (
    <div className="flex flex-col h-full bg-[#1e1f20] text-white select-none overflow-hidden font-sans border-l border-zinc-700/80 w-full shadow-2xl">
      {/* 1. Header with Authentic Google Gemini Branding */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700/80 shrink-0 bg-[#252729]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-500/20 via-purple-500/20 to-pink-500/20 border border-purple-400/30 flex items-center justify-center text-white shadow-sm p-1.5">
            <GoogleGeminiStar className="w-full h-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">Gemini</h3>
              <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded-md bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 text-purple-200 font-bold border border-purple-400/30">
                Workspace AI
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 truncate max-w-[170px]">
              {transcriptLineCount > 0
                ? `🎙️ ${transcriptLineCount} speech events captured`
                : "Real-time meeting intelligence"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-white/10 rounded-lg transition cursor-pointer"
              title="Clear conversation"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            title="Close Gemini drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Main Conversation Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
        {/* Hero Banner: Take Notes with Gemini */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#2a2b2e] via-[#242528] to-[#1e1f20] border border-purple-500/30 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GoogleGeminiStar className="w-4 h-4" />
              <span className="text-xs font-bold text-white">Take notes with Gemini</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Active listening" />
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Gemini synthesizes live spoken transcripts and in-room chat messages into structured meeting notes, decisions, and action items.
          </p>
          <button
            type="button"
            onClick={() => handleRunAIAction("summary")}
            disabled={isLoading}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Meeting Notes Now</span>
          </button>
        </div>

        {/* Quick Tools Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-1">
            <span>Smart Meeting Tools</span>
            <span className="text-purple-400 lowercase font-normal">Context-aware</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {quickPills.slice(1).map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => handleRunAIAction(tool.id)}
                  disabled={isLoading}
                  className="flex flex-col items-start p-2.5 rounded-2xl bg-[#282a2c] hover:bg-[#323538] border border-zinc-700/70 hover:border-purple-500/40 text-left transition-all cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300" />
                    <span className="text-xs font-bold text-zinc-200 group-hover:text-white">{tool.label}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 leading-tight line-clamp-2">{tool.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Stream */}
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const isSpeaking = speakingId === msg.id;
          const userFeedback = feedbackState[msg.id];

          return (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1.5 animate-in fade-in duration-200 ${
                isUser ? "items-end" : "items-start"
              }`}
            >
              {/* Sender Tag */}
              <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold text-zinc-400">
                {isUser ? (
                  <>
                    <span>You</span>
                    <User className="w-3 h-3 text-emerald-400" />
                  </>
                ) : (
                  <>
                    <GoogleGeminiStar className="w-3 h-3" />
                    <span className="text-purple-300 font-semibold">Gemini in Meet</span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-3.5 rounded-2xl text-xs max-w-[95%] leading-relaxed ${
                  isUser
                    ? "bg-purple-600/30 border border-purple-500/50 text-white rounded-tr-xs"
                    : "bg-[#282a2c] border border-zinc-700/80 text-zinc-100 rounded-tl-xs shadow-lg space-y-3"
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-wrap font-sans break-words prose prose-invert prose-xs max-w-none">
                  {msg.text}
                </div>

                {/* AI Response Action Toolbar (Google Workspace parity) */}
                {!isUser && !msg.isError && (
                  <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-400">
                    {/* Left: Interactive Action Buttons */}
                    <div className="flex items-center gap-1">
                      {/* Copy */}
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.text, msg.id)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                        title="Copy note"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Copy</span>
                          </>
                        )}
                      </button>

                      {/* Share to In-Meeting Chat */}
                      <button
                        type="button"
                        onClick={() => handleShareToChat(msg.text)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                        title="Share notes to Meeting Chat"
                      >
                        <Share2 className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline">Share to Chat</span>
                      </button>

                      {/* Export to Document (.md) */}
                      <button
                        type="button"
                        onClick={() => handleExportDoc(msg.text, meetingTitle)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                        title="Export notes as Markdown document"
                      >
                        <Download className="w-3.5 h-3.5 text-purple-400" />
                        <span className="hidden sm:inline">Export</span>
                      </button>

                      {/* Text to Speech (Listen) */}
                      <button
                        type="button"
                        onClick={() => handleToggleSpeak(msg.text, msg.id)}
                        className={`p-1.5 rounded-lg hover:bg-white/10 transition flex items-center gap-1 cursor-pointer ${
                          isSpeaking ? "text-rose-400 font-bold" : "text-zinc-300 hover:text-white"
                        }`}
                        title={isSpeaking ? "Stop listening" : "Listen to note"}
                      >
                        {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{isSpeaking ? "Stop" : "Listen"}</span>
                      </button>
                    </div>

                    {/* Right: Thumbs Up / Down Feedback */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleFeedback(msg.id, "up")}
                        className={`p-1 rounded-md hover:bg-white/10 transition cursor-pointer ${
                          userFeedback === "up" ? "text-emerald-400 font-bold" : "text-zinc-400 hover:text-white"
                        }`}
                        title="Good response"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFeedback(msg.id, "down")}
                        className={`p-1 rounded-md hover:bg-white/10 transition cursor-pointer ${
                          userFeedback === "down" ? "text-rose-400 font-bold" : "text-zinc-400 hover:text-white"
                        }`}
                        title="Bad response"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="p-4 rounded-2xl bg-[#282a2c] border border-purple-500/40 flex items-center gap-3 shadow-lg">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 animate-spin flex items-center justify-center p-0.5">
              <div className="w-full h-full bg-[#282a2c] rounded-full" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Gemini is generating insights...</span>
                <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
              </p>
              <p className="text-[10px] text-zinc-400">Synthesizing speech transcripts and meeting context</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Prompt Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (customPrompt.trim() && !isLoading) {
            handleRunAIAction("custom", customPrompt.trim());
            setCustomPrompt("");
          }
        }}
        className="p-3 border-t border-zinc-700/80 bg-[#252729]"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Ask Gemini anything about this meeting..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            disabled={isLoading}
            className="w-full bg-[#1e1f20] border border-zinc-700 rounded-full pl-4 pr-10 py-2.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-purple-500 transition shadow-inner"
          />
          <button
            type="submit"
            disabled={!customPrompt.trim() || isLoading}
            className={`absolute right-1.5 p-1.5 rounded-full transition cursor-pointer ${
              customPrompt.trim() && !isLoading
                ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-xs"
                : "text-zinc-600 pointer-events-none"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default MeetGeminiDrawer;
