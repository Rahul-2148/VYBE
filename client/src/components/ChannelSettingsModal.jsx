// client/src/components/ChannelSettingsModal.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Hash,
  Volume2,
  Video,
  Trash2,
  X,
} from "lucide-react";
import api from "../lib/axios";
import { snackbar } from "../lib/snackbar";
import ConfirmDialogModal from "./ConfirmDialogModal";

export const ChannelSettingsModal = ({
  isOpen,
  channel,
  communityId,
  onClose,
  onChannelUpdated,
  onChannelDeleted,
}) => {
  const [name, setName] = useState(channel?.name || "");
  const [topic, setTopic] = useState(channel?.topic || channel?.description || "");
  const [category, setCategory] = useState(channel?.category || (channel?.type === "text" ? "TEXT CHANNELS" : "VOICE ROOMS"));
  const [slowmode, setSlowmode] = useState(channel?.slowmode || 0);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  if (!isOpen || !channel) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const res = await api.put(`/community/${communityId}/channel/${channel._id}`, {
        name: name.trim(),
        topic: topic.trim(),
        category: category.trim(),
        slowmode: Number(slowmode),
      });

      if (res.data?.success) {
        snackbar.success("Channel settings updated!");
        onChannelUpdated?.(res.data.channel);
        onClose?.();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to update channel");
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    try {
      const res = await api.delete(`/community/${communityId}/channel/${channel._id}`);
      if (res.data?.success) {
        snackbar.success("Channel deleted");
        onChannelDeleted?.(channel._id);
        onClose?.();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to delete channel");
    } finally {
      setDeleteModalOpen(false);
    }
  };

  const handleDelete = () => {
    setDeleteModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[320] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-surface border border-border w-full max-w-md rounded-3xl shadow-2xl p-6 relative overflow-hidden"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text hover:bg-surface-inset rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
            {channel.type === "text" ? <Hash className="w-5 h-5" /> : channel.type === "voice" ? <Volume2 className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-text">Channel Settings</h3>
            <span className="text-xs text-text-muted">#{channel.name} ({channel.type} channel)</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Channel Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-surface-inset border border-border rounded-xl px-3.5 py-2 text-xs text-text outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. TEXT CHANNELS or ANNOUNCEMENTS"
              className="bg-surface-inset border border-border rounded-xl px-3.5 py-2 text-xs text-text outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Channel Topic / Description</label>
            <textarea
              rows={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What is this channel about?"
              className="bg-surface-inset border border-border rounded-xl px-3.5 py-2 text-xs text-text outline-none focus:border-primary resize-none"
            />
          </div>

          {channel.type === "text" && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Slowmode Cooldown</label>
              <select
                value={slowmode}
                onChange={(e) => setSlowmode(e.target.value)}
                className="bg-surface-inset border border-border rounded-xl px-3.5 py-2 text-xs text-text outline-none focus:border-primary"
              >
                <option value={0}>Off</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Channel</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Confirmation Dialog */}
      <ConfirmDialogModal
        isOpen={deleteModalOpen}
        title="Delete Channel"
        message={`Are you sure you want to delete #${channel.name}? All messages in this channel will be permanently removed.`}
        confirmLabel="Delete Channel"
        onConfirm={executeDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default ChannelSettingsModal;
