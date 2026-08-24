// client/src/components/CommunityPinnedMessagesModal.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, X, CornerUpLeft, Trash2, ExternalLink } from "lucide-react";
import VoiceNotePlayer from "./VoiceNotePlayer";

export const CommunityPinnedMessagesModal = ({
  isOpen,
  channelName,
  pinnedMessages = [],
  isAdmin,
  onClose,
  onUnpin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[310] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-surface border border-border w-full max-w-lg h-[550px] max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-surface-inset/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Pin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-text">Pinned Messages</h3>
              <span className="text-[11px] text-text-muted">#{channelName} ({pinnedMessages.length} pinned)</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-text hover:bg-surface rounded-full transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of Pinned Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
          {pinnedMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-text-muted">
              <Pin className="w-10 h-10 mb-2 opacity-30 text-amber-400" />
              <h4 className="text-xs font-bold text-text mb-1">No pinned messages yet</h4>
              <p className="text-[11px] max-w-xs">
                Important announcements or useful links can be pinned to this channel by admins.
              </p>
            </div>
          ) : (
            pinnedMessages.map((msg) => (
              <div
                key={msg._id}
                className="p-3.5 rounded-2xl bg-surface-inset border border-border/80 hover:border-amber-500/30 transition flex flex-col justify-between gap-2"
              >
                {/* Sender & Timestamp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-surface">
                      <img src={msg.sender?.profileImage?.url || ""} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-bold text-text">@{msg.sender?.userName || "user"}</span>
                    <span className="text-[10px] text-text-muted">
                      {new Date(msg.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => onUnpin?.(msg._id)}
                      className="text-[11px] font-bold text-text-muted hover:text-rose-400 transition cursor-pointer flex items-center gap-1"
                      title="Unpin Message"
                    >
                      <X className="w-3 h-3" /> Unpin
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="text-xs text-text pl-8">
                  {msg.content?.text && <p className="leading-relaxed break-words">{msg.content.text}</p>}

                  {msg.type === "voice" && (
                    <VoiceNotePlayer audioUrl={msg.content?.media?.[0]?.url} duration={msg.content?.voiceDuration} />
                  )}

                  {msg.content?.media?.map((m, i) => (
                    <div key={i} className="mt-1 rounded-xl overflow-hidden max-w-xs">
                      {m.type === "image" ? (
                        <img src={m.url} alt="" className="max-h-40 w-auto object-cover" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CommunityPinnedMessagesModal;
