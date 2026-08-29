import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Video,
  Plus,
  Link2,
  Calendar,
  Keyboard,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Clock,
  Users,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Trash2,
} from "lucide-react";
import LeftHome from "../../components/LeftHome";
import Navbar from "../../components/Navbar";
import ConfirmDialogModal from "../../components/ConfirmDialogModal";
import api from "../../lib/axios";
import { snackbar } from "../../lib/snackbar";
import { triggerHaptic } from "../../lib/interactiveEffects";
import dp from "../../assets/dp3.png";

export const MeetHome = () => {
  const navigate = useNavigate();
  const { userData } = useSelector((s) => s.user);
  const [meetingCode, setMeetingCode] = useState("");
  const [showNewMeetingMenu, setShowNewMeetingMenu] = useState(false);
  const [createdMeetingInfo, setCreatedMeetingInfo] = useState(null); // { meetingId, link }
  const [isCreating, setIsCreating] = useState(false);
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const menuRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowNewMeetingMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch recent meetings history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get("/meet/history");
        if (res.data?.success && Array.isArray(res.data.meetings)) {
          setRecentMeetings(res.data.meetings);
        }
      } catch (err) {
        console.warn("[MeetHome] History fetch error:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  // Remove single meeting from history
  const handleRemoveMeeting = async (meeting) => {
    if (!meeting?.meetingId) return;
    try {
      setIsDeleting(true);
      const res = await api.delete(`/meet/history/${meeting.meetingId}`);
      if (res.data?.success) {
        setRecentMeetings((prev) => prev.filter((m) => m.meetingId !== meeting.meetingId));
        snackbar.success("Meeting removed from recent history");
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to remove meeting");
    } finally {
      setIsDeleting(false);
      setMeetingToDelete(null);
    }
  };

  // Clear all recent meetings
  const handleClearAllMeetings = async () => {
    try {
      setIsDeleting(true);
      const res = await api.delete("/meet/history/clear-all");
      if (res.data?.success) {
        setRecentMeetings([]);
        snackbar.success("Recent meetings cleared");
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to clear meetings history");
    } finally {
      setIsDeleting(false);
      setShowClearAllConfirm(false);
    }
  };

  // Start instant meeting
  const handleStartInstantMeeting = async () => {
    setIsCreating(true);
    setShowNewMeetingMenu(false);
    triggerHaptic("medium");
    try {
      const res = await api.post("/meet/create", { title: "Instant Meeting" });
      if (res.data?.success && res.data.meeting) {
        navigate(`/meet/${res.data.meeting.meetingId}`);
      } else {
        snackbar.error("Could not create meeting");
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to create meeting");
    } finally {
      setIsCreating(false);
    }
  };

  // Create meeting for later (generates code and shows copy modal)
  const handleCreateMeetingForLater = async () => {
    setIsCreating(true);
    setShowNewMeetingMenu(false);
    triggerHaptic("light");
    try {
      const res = await api.post("/meet/create", { title: "Scheduled Meeting" });
      if (res.data?.success && res.data.meeting) {
        const url = `${window.location.origin}/meet/${res.data.meeting.meetingId}`;
        setCreatedMeetingInfo({
          meetingId: res.data.meeting.meetingId,
          link: url,
        });
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to create meeting");
    } finally {
      setIsCreating(false);
    }
  };

  // Join meeting with code or full link
  const handleJoinWithCode = (e) => {
    e?.preventDefault();
    if (!meetingCode.trim()) return;

    let targetCode = meetingCode.trim();
    if (targetCode.includes("/meet/")) {
      const parts = targetCode.split("/meet/");
      targetCode = parts[parts.length - 1].split("?")[0].replace("/", "");
    }

    triggerHaptic("medium");
    navigate(`/meet/${targetCode}`);
  };

  const handleCopyLink = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      triggerHaptic("success");
      snackbar.success("Meeting link copied to clipboard! 📋");
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      snackbar.error("Could not copy link");
    }
  };

  return (
    <div className="flex min-h-[100dvh] h-[100dvh] w-screen bg-bg text-text overflow-hidden select-none">
      {/* Left Sidebar (Desktop) */}
      <LeftHome />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto hide-scrollbar pb-32 md:pb-12">
        {/* Top Nav (Mobile Back Button + Brand Header) */}
        <div className="h-14 sm:h-16 border-b border-border/70 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-bg/90 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1 rounded-xl text-text hover:bg-surface-hover active:scale-95 transition cursor-pointer lg:hidden"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-text flex items-center gap-2">
                <span>VYBE Meet</span>
                <span className="text-[10px] bg-rose-500/10 text-rose-500 font-bold px-2 py-0.5 rounded-full border border-rose-500/20">
                  PRO
                </span>
              </h1>
            </div>
          </div>

          <button
            onClick={() => navigate("/explore")}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text px-3 py-1.5 rounded-xl hover:bg-surface transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>Discover</span>
          </button>
        </div>

        {/* Hero Section */}
        <div className="p-4 sm:p-6 md:p-12 max-w-5xl mx-auto w-full space-y-8 sm:space-y-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8 md:gap-12 pt-2 sm:pt-4">
            <div className="flex-1 space-y-4 sm:space-y-5 text-center lg:text-left w-full">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border text-[11px] sm:text-xs font-bold text-text-secondary shadow-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Enterprise Encrypted Video Calling</span>
              </div>

              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-text tracking-tight leading-tight">
                Premium video meetings. Now on <span className="bg-gradient-to-r from-pink-500 to-rose-600 bg-clip-text text-transparent">VYBE</span>.
              </h2>

              <p className="text-xs sm:text-sm md:text-base text-text-muted leading-relaxed max-w-xl mx-auto lg:mx-0">
                Connect, collaborate, and share with ultra-crisp HD video, studio audio, screen sharing, real-time reactions, and interactive whiteboards.
              </p>

              {/* Action Buttons: New Meeting & Code Input */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 justify-center lg:justify-start w-full">
                {/* New Meeting Dropdown */}
                <div className="relative w-full sm:w-auto" ref={menuRef}>
                  <button
                    onClick={() => {
                      triggerHaptic("light");
                      setShowNewMeetingMenu(!showNewMeetingMenu);
                    }}
                    disabled={isCreating}
                    className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-rose-500/25 transition transform active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5 shrink-0" />
                    <span>New Meeting</span>
                  </button>

                  {showNewMeetingMenu && (
                    <div className="absolute top-14 left-0 right-0 sm:right-auto sm:w-64 bg-surface border border-border rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      <button
                        onClick={handleStartInstantMeeting}
                        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-surface-hover text-left text-xs font-semibold text-text transition cursor-pointer"
                      >
                        <Video className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Start an instant meeting</span>
                      </button>

                      <button
                        onClick={handleCreateMeetingForLater}
                        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-surface-hover text-left text-xs font-semibold text-text transition cursor-pointer"
                      >
                        <Link2 className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>Create a meeting for later</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Enter a Code Form */}
                <form onSubmit={handleJoinWithCode} className="w-full sm:w-auto flex items-center gap-2">
                  <div className="relative flex-1 sm:w-60">
                    <Keyboard className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={meetingCode}
                      onChange={(e) => setMeetingCode(e.target.value)}
                      placeholder="Enter code or link"
                      className="w-full bg-surface border border-border rounded-2xl pl-10 pr-4 py-3.5 text-xs text-text placeholder-text-muted outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!meetingCode.trim()}
                    className="px-5 py-3.5 rounded-2xl bg-surface hover:bg-surface-hover disabled:opacity-40 text-text font-bold text-xs border border-border transition cursor-pointer active:scale-95 shrink-0"
                  >
                    Join
                  </button>
                </form>
              </div>
            </div>

            {/* Visual Graphic Banner */}
            <div className="w-full lg:w-96 rounded-3xl overflow-hidden bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 border border-border/80 p-5 sm:p-6 flex flex-col justify-between shadow-2xl relative gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-rose-500 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>Vybe Meet Features</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-text">Ultra-Fast Realtime Collaboration</h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Screen share with crystal clarity, collaborate on interactive whiteboards, and send animated emoji reactions.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border/60">
                <div className="p-2.5 rounded-xl bg-surface/80 border border-border/60 text-xs font-bold text-text flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">HD Screen Share</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface/80 border border-border/60 text-xs font-bold text-text flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="truncate">In-Call Chat & Files</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Meetings Section */}
          <div className="space-y-4 pt-6 border-t border-border/80">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-text flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-muted" />
                <span>Recent Meetings</span>
              </h3>

              {recentMeetings.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearAllConfirm(true)}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {isLoadingHistory ? (
              <div className="p-8 text-center text-xs text-text-muted">Loading meetings...</div>
            ) : recentMeetings.length === 0 ? (
              <div className="p-6 sm:p-8 text-center rounded-2xl bg-surface border border-border/60 text-text-muted space-y-1.5">
                <p className="text-xs font-semibold text-text">No recent meetings</p>
                <p className="text-[11px]">When you create or join meetings on Vybe, they will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {recentMeetings.map((m) => (
                  <div
                    key={m._id}
                    className="p-4 rounded-2xl bg-surface border border-border hover:border-rose-500/40 transition-all flex flex-col justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-mono text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md">
                          {m.meetingId}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-text truncate">{m.title || "VYBE Meeting"}</h4>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Hosted by @{m.host?.userName || "User"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <button
                        onClick={() => navigate(`/meet/${m.meetingId}`)}
                        className="flex-1 py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition text-center cursor-pointer active:scale-95"
                      >
                        Rejoin
                      </button>
                      <button
                        onClick={() => handleCopyLink(`${window.location.origin}/meet/${m.meetingId}`)}
                        className="p-2 rounded-xl bg-surface-hover text-text-muted hover:text-text transition cursor-pointer"
                        title="Copy Link"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setMeetingToDelete(m)}
                        className="p-2 rounded-xl bg-surface-hover text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                        title="Remove from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Copy Link Dialog Modal (Created Meeting for later) */}
      {createdMeetingInfo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-text">Here's your joining info</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                Send this link to people you want to meet with. Be sure to save it so you can use it later, too.
              </p>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-surface-hover border border-border">
              <span className="text-xs font-mono text-text flex-1 truncate px-2">
                {createdMeetingInfo.link}
              </span>
              <button
                onClick={() => handleCopyLink(createdMeetingInfo.link)}
                className={`p-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  isCopied
                    ? "bg-emerald-600 text-white"
                    : "bg-primary text-white hover:bg-primary/90"
                }`}
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCreatedMeetingInfo(null)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-text-secondary hover:text-text cursor-pointer"
              >
                Done
              </button>
              <button
                onClick={() => navigate(`/meet/${createdMeetingInfo.meetingId}`)}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold transition shadow-md shadow-primary/20 cursor-pointer"
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove Single Meeting */}
      <ConfirmDialogModal
        isOpen={Boolean(meetingToDelete)}
        title="Remove Meeting?"
        message={`Are you sure you want to remove "${meetingToDelete?.title || meetingToDelete?.meetingId}" from your recent meetings?`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        loading={isDeleting}
        onConfirm={() => handleRemoveMeeting(meetingToDelete)}
        onCancel={() => setMeetingToDelete(null)}
      />

      {/* Confirm Clear All Meetings */}
      <ConfirmDialogModal
        isOpen={showClearAllConfirm}
        title="Clear All Recent Meetings?"
        message="Are you sure you want to remove all meetings from your recent history? This action cannot be undone."
        confirmLabel="Clear All"
        cancelLabel="Cancel"
        loading={isDeleting}
        onConfirm={handleClearAllMeetings}
        onCancel={() => setShowClearAllConfirm(false)}
      />

      {/* Mobile Navbar */}
      <Navbar />
    </div>
  );
};

export default MeetHome;
