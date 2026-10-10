import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, Trash2, SendHorizonal, Loader2, AlertCircle } from "lucide-react";
import moment from "moment";
import api from "../lib/axios";
import { snackbar } from "../lib/snackbar";

export default function ScheduleMessageModal({
  isOpen,
  onClose,
  conversationId,
  initialText = "",
  onScheduledSuccess,
}) {
  const [activeTab, setActiveTab] = useState("new"); // "new" | "pending"
  const [scheduledText, setScheduledText] = useState(initialText);
  // Default scheduled date/time: 1 hour from now
  const defaultDate = moment().format("YYYY-MM-DD");
  const defaultTime = moment().add(1, "hour").format("HH:mm");
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [scheduledTime, setScheduledTime] = useState(defaultTime);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  useEffect(() => {
    if (initialText) {
      setScheduledText(initialText);
    }
  }, [initialText]);

  useEffect(() => {
    if (isOpen && conversationId) {
      fetchScheduled();
    }
  }, [isOpen, conversationId]);

  const fetchScheduled = async () => {
    if (!conversationId) return;
    setIsLoadingPending(true);
    try {
      const res = await api.get(`/message/scheduled/${conversationId}`);
      if (res.data?.success) {
        setPendingMessages(res.data.scheduledMessages || []);
      }
    } catch (err) {
      console.warn("Failed to fetch scheduled messages:", err);
    } finally {
      setIsLoadingPending(false);
    }
  };

  const handleCancelScheduled = async (messageId) => {
    try {
      const res = await api.delete(`/message/scheduled/${messageId}`);
      if (res.data?.success) {
        setPendingMessages((prev) => prev.filter((m) => m._id !== messageId));
        snackbar.success("Scheduled message cancelled");
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to cancel scheduled message");
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduledText.trim()) {
      snackbar.error("Please enter a message to schedule");
      return;
    }

    const scheduledDateTime = moment(`${scheduledDate} ${scheduledTime}`, "YYYY-MM-DD HH:mm");
    if (!scheduledDateTime.isValid()) {
      snackbar.error("Invalid scheduled date or time");
      return;
    }

    if (scheduledDateTime.isBefore(moment().add(1, "minute"))) {
      snackbar.error("Scheduled time must be at least 2 minutes in the future");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/message/send", {
        conversationId,
        text: scheduledText.trim(),
        scheduledFor: scheduledDateTime.toISOString(),
      });

      if (res.data?.success) {
        snackbar.success(`Message scheduled for ${scheduledDateTime.format("MMM D, YYYY [at] h:mm A")}! ✨`);
        setScheduledText("");
        onScheduledSuccess?.(res.data.message);
        fetchScheduled();
        setActiveTab("pending");
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to schedule message");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-hover/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">Scheduled Messages</h3>
              <p className="text-[11px] text-text-muted">Draft messages to automatically send at a future time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-hover text-text-secondary hover:text-text transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-border bg-surface/50">
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`flex-1 py-2.5 text-xs font-bold transition text-center cursor-pointer border-b-2 ${
              activeTab === "new"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-text-secondary hover:text-text"
            }`}
          >
            Schedule New
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`flex-1 py-2.5 text-xs font-bold transition text-center cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === "pending"
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-text-secondary hover:text-text"
            }`}
          >
            <span>Upcoming Queue</span>
            {pendingMessages.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                {pendingMessages.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab content */}
        <div className="p-4 overflow-y-auto flex-1">
          {activeTab === "new" ? (
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Message
                </label>
                <textarea
                  value={scheduledText}
                  onChange={(e) => setScheduledText(e.target.value)}
                  placeholder="Type your message to send later..."
                  rows={4}
                  className="w-full bg-bg border border-border rounded-xl p-3 text-xs text-text placeholder:text-text-muted outline-none focus:border-primary/80 focus:ring-1 focus:ring-primary/20 transition resize-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> Date
                  </label>
                  <input
                    type="date"
                    min={moment().format("YYYY-MM-DD")}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-primary/80 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Time
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-bg border border-border rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-primary/80 transition"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
                  The message will be automatically dispatched to this conversation at the specified time by VYBE's background queue.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !scheduledText.trim()}
                className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <SendHorizonal className="w-4 h-4" />
                    <span>Confirm Schedule</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div>
              {isLoadingPending ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-text-muted">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">Loading queue...</span>
                </div>
              ) : pendingMessages.length === 0 ? (
                <div className="py-8 text-center text-text-muted">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">No scheduled messages</p>
                  <p className="text-[11px] mt-0.5">You don't have any messages waiting to be sent in this chat.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingMessages.map((msg) => (
                    <div
                      key={msg._id}
                      className="p-3 rounded-xl bg-bg border border-border/80 flex items-start justify-between gap-3 shadow-xs hover:border-border transition"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-primary font-bold">
                          <Clock className="w-3 h-3" />
                          <span>{moment(msg.scheduledFor).format("MMM D, YYYY [at] h:mm A")}</span>
                          <span className="text-text-muted font-normal">
                            ({moment(msg.scheduledFor).fromNow()})
                          </span>
                        </div>
                        <p className="text-xs text-text font-medium break-words leading-relaxed">
                          {msg.content?.text || "(Media message)"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelScheduled(msg._id)}
                        className="p-1.5 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer shrink-0"
                        title="Cancel scheduled message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
