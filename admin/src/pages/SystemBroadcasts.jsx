import React, { useState, useEffect } from "react";
import {
  BellRing,
  Send,
  Trash2,
  Loader2,
  X,
  Smartphone,
} from "lucide-react";
import api from "../lib/api";
import { toast } from "../lib/toast";
import ConfirmModal from "../components/ConfirmModal";

export const SystemBroadcasts = () => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info"); // "info", "warning", "maintenance", "security"
  const [targetAudience, setTargetAudience] = useState("all"); // "all", "creators", "staff"
  const [actionUrl, setActionUrl] = useState("");
  const [actionLabel, setActionLabel] = useState("");
  const [expiresDays, setExpiresDays] = useState("7");
  const [creating, setCreating] = useState(false);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/broadcasts");
      if (res.data?.success) {
        setBroadcasts(res.data.announcements || []);
      }
    } catch {
      toast.error("Failed to load broadcasts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    try {
      setCreating(true);
      const expiresAt =
        expiresDays === "never"
          ? null
          : new Date(Date.now() + parseInt(expiresDays, 10) * 24 * 60 * 60 * 1000);

      const res = await api.post("/broadcasts", {
        title: title.trim(),
        message: message.trim(),
        type,
        targetAudience,
        actionUrl: actionUrl.trim(),
        actionLabel: actionLabel.trim(),
        expiresAt,
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setShowCreateModal(false);
        setTitle("");
        setMessage("");
        setActionUrl("");
        setActionLabel("");
        fetchBroadcasts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to publish broadcast.");
    } finally {
      setCreating(false);
    }
  };

  // Delete Confirm Modal State
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, broadcastId: null });

  const executeDelete = async (broadcastId) => {
    try {
      const res = await api.delete(`/broadcasts/${broadcastId}`);
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchBroadcasts();
      }
    } catch (err) {
      toast.error("Failed to delete broadcast.");
    } finally {
      setDeleteModal({ isOpen: false, broadcastId: null });
    }
  };

  const handleDelete = (broadcastId) => {
    setDeleteModal({ isOpen: true, broadcastId });
  };

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-extrabold uppercase tracking-wider">
              Push Notification Center
            </span>
            <span className="text-zinc-500 text-xs">•</span>
            <span className="text-zinc-400 text-xs">Omnichannel Messaging</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-['Outfit']">
            System Broadcasts & Push Alerts
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Publish live app banner notifications, maintenance advisories & security alerts.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-purple-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition flex items-center gap-2 cursor-pointer self-start"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Dispatch New Broadcast</span>
        </button>
      </div>

      {/* Broadcasts List */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-bold">Loading broadcast history...</p>
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="p-16 text-center space-y-3 rounded-3xl bg-[#0d111a] border border-white/[0.06]">
          <BellRing className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white font-['Outfit']">No Active Broadcasts</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            There are currently no active announcements. Click "Dispatch New Broadcast" to send a banner alert to active users.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {broadcasts.map((b) => (
            <div
              key={b._id}
              className="p-5 rounded-3xl bg-[#0d111a] border border-white/[0.06] hover:border-purple-500/30 transition shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        b.type === "security"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : b.type === "warning"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                      }`}
                    >
                      {b.type}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-bold capitalize">
                      Audience: {b.targetAudience}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDelete(b._id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">{b.title}</h3>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{b.message}</p>
                </div>

                {b.actionUrl && (
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-zinc-400 flex items-center justify-between">
                    <span>CTA: {b.actionLabel || "Learn More"}</span>
                    <span className="font-mono text-[10px] text-purple-400">{b.actionUrl}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500">
                <span>By @{b.createdBy?.userName || "admin"}</span>
                <span>{new Date(b.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Broadcast Modal with Live Mobile Preview */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-4xl bg-[#0d111a] border border-purple-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5 sm:space-y-6 animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-white font-['Outfit'] truncate">Dispatch System Broadcast</h3>
                  <p className="text-xs text-zinc-400 truncate">Push banner alert to online user feeds in real-time.</p>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen: Form vs In-App Live Mobile Preview */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Form (7 cols) */}
              <form onSubmit={handleCreateBroadcast} className="md:col-span-7 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Alert Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g. Scheduled System Upgrade Tonight"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Message Content</label>
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Details about the update, guidelines change, or incident..."
                    className="w-full p-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase">Alert Priority</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="info" className="bg-[#0d111a]">Information (Blue)</option>
                      <option value="warning" className="bg-[#0d111a]">Warning Advisory (Amber)</option>
                      <option value="security" className="bg-[#0d111a]">Security Alert (Rose)</option>
                      <option value="maintenance" className="bg-[#0d111a]">Maintenance Notice</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase">Audience</label>
                    <select
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none"
                    >
                      <option value="all" className="bg-[#0d111a]">All Platform Users</option>
                      <option value="creators" className="bg-[#0d111a]">Verified Creators Only</option>
                      <option value="staff" className="bg-[#0d111a]">Staff & Operations Only</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish Now"}
                  </button>
                </div>
              </form>

              {/* In-App Live Mobile Preview Widget (5 cols) */}
              <div className="md:col-span-5 bg-black/40 border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <span>In-App Mobile Preview</span>
                </div>

                {/* Mock Phone Container */}
                <div className="p-4 rounded-2xl bg-[#080b12] border border-white/10 shadow-xl space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span>VYBE APP</span>
                    <span>Just Now</span>
                  </div>
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      type === "security"
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
                        : type === "warning"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                        : "bg-purple-500/10 border-purple-500/30 text-purple-200"
                    }`}
                  >
                    <p className="font-bold text-white text-xs">{title || "Announcement Title"}</p>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {message || "Your broadcast announcement text will preview here in real-time."}
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-500 text-center">
                  This is how the push notification banner appears inside the Vybe mobile app.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Revoke System Broadcast"
        message="Are you sure you want to revoke and delete this active system announcement? It will no longer display to platform users."
        confirmLabel="Revoke Broadcast"
        variant="danger"
        onConfirm={() => executeDelete(deleteModal.broadcastId)}
        onCancel={() => setDeleteModal({ isOpen: false, broadcastId: null })}
      />
    </div>
  );
};

export default SystemBroadcasts;
