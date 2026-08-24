import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Send, Check, CheckCircle2, Users, CornerUpRight,
  Image as ImageIcon, Film, Mic, FileText, Phone, Sparkles, Loader2
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setForwardModal } from "../redux/features/messageSlice";
import api from "../lib/axios";
import { snackbar } from "../lib/snackbar";
import { playMessageSentSound } from "../lib/sounds";
import VerifiedBadge from "./VerifiedBadge";
import dp from "../assets/dp3.png";

const ForwardMessageModal = () => {
  const dispatch = useDispatch();
  const { forwardModalOpen, forwardingMessage } = useSelector((state) => state.message);
  const { userData } = useSelector((state) => state.user);
  const currentUserId = userData?.user?._id;

  const [searchQuery, setSearchQuery] = useState("");
  const [conversations, setConversations] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [selectedTargets, setSelectedTargets] = useState([]); // array of { conversationId, recipientId, name }
  const [sentTargets, setSentTargets] = useState(new Set());
  const [sendingSingle, setSendingSingle] = useState(null);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!forwardModalOpen) return;

    let isMounted = true;
    // Fetch conversations and suggested contacts
    Promise.all([
      api.get("/message/conversations").catch(() => ({ data: { conversations: [] } })),
      api.get("/user/suggested").catch(() => ({ data: { users: [] } })),
    ])
      .then(([convRes, suggRes]) => {
        if (isMounted && convRes.data?.conversations) {
          setConversations(convRes.data.conversations);
        }
        if (isMounted && suggRes.data?.users) {
          setSuggestedUsers(suggRes.data.users);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      setSearchQuery("");
      setSelectedTargets([]);
      setSentTargets(new Set());
    };
  }, [forwardModalOpen]);

  const handleClose = () => {
    dispatch(setForwardModal({ open: false, message: null }));
  };

  // Compile full targets list: Recent conversations first, then following/suggested users who don't have a convo
  const allTargets = useMemo(() => {
    const list = [];
    const existingUserIds = new Set();

    // 1. Add conversations
    conversations.forEach((conv) => {
      if (conv.isGroup) {
        list.push({
          id: conv._id,
          conversationId: conv._id,
          recipientId: null,
          isGroup: true,
          name: conv.groupName || conv.name || "Group Chat",
          subtext: `${conv.participants?.length || 0} members`,
          avatar: conv.groupAvatar || null,
          isVerified: false,
        });
      } else {
        const other = conv.participant || conv.participants?.find((p) => (p._id || p) !== currentUserId);
        if (other) {
          const uid = other._id || other;
          existingUserIds.add(uid.toString());
          list.push({
            id: conv._id,
            conversationId: conv._id,
            recipientId: uid,
            isGroup: false,
            name: other.name || other.userName || "User",
            userName: other.userName || "",
            subtext: `@${other.userName || "user"}`,
            avatar: other.profileImage || null,
            isVerified: other.isVerified || false,
          });
        }
      }
    });

    // 2. Add following & suggested users not already in recent chats
    const followingList = userData?.user?.following || [];
    const pool = [...followingList, ...suggestedUsers];
    pool.forEach((u) => {
      if (u && u._id && !existingUserIds.has(u._id.toString()) && u._id !== currentUserId) {
        existingUserIds.add(u._id.toString());
        list.push({
          id: `user_${u._id}`,
          conversationId: null,
          recipientId: u._id,
          isGroup: false,
          name: u.name || u.userName || "User",
          userName: u.userName || "",
          subtext: `@${u.userName || "user"}`,
          avatar: u.profileImage || null,
          isVerified: u.isVerified || false,
        });
      }
    });

    return list;
  }, [conversations, suggestedUsers, userData, currentUserId]);

  const filteredTargets = useMemo(() => {
    if (!searchQuery.trim()) return allTargets;
    const q = searchQuery.toLowerCase().trim();
    return allTargets.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.userName?.toLowerCase().includes(q) ||
        t.subtext?.toLowerCase().includes(q)
    );
  }, [allTargets, searchQuery]);

  // Payload preparation for forwarded message
  const buildForwardPayload = (target) => {
    if (!forwardingMessage) return null;
    const m = forwardingMessage;
    const effectiveType = m.type || (m.content?.media?.length ? m.content.media[0].type : "text");

    const payload = {
      isForwarded: true,
      forwardedFrom: m._id,
      messageType: effectiveType,
      type: effectiveType,
      text: m.content?.text || "",
    };

    if (target.conversationId) {
      payload.conversationId = target.conversationId;
    } else if (target.recipientId) {
      payload.recipientId = target.recipientId;
    }

    if (m.content?.media && m.content.media.length > 0) {
      payload.media = m.content.media;
    }
    if (m.content?.sharedData || m.sharedData) {
      payload.sharedData = m.content?.sharedData || m.sharedData;
      payload.sharedType = m.content?.shared?.type || m.type?.replace("shared_", "") || "post";
      if (m.content?.shared?.refId) payload.sharedId = m.content.shared.refId;
    }
    if (m.content?.contactData) {
      payload.contactData = m.content.contactData;
    }
    if (m.content?.locationData) {
      payload.locationData = m.content.locationData;
    }

    return payload;
  };

  // Instant single forward
  const handleSingleForward = async (target) => {
    if (sentTargets.has(target.id) || sendingSingle === target.id) return;
    const payload = buildForwardPayload(target);
    if (!payload) return;

    setSendingSingle(target.id);
    try {
      await api.post("/message/send", payload);
      setSentTargets((prev) => new Set([...prev, target.id]));
      playMessageSentSound();
      snackbar.success(`Forwarded to ${target.name}`);
    } catch (err) {
      console.error("Forward message error:", err);
      snackbar.error(err.response?.data?.message || "Failed to forward message");
    } finally {
      setSendingSingle(null);
    }
  };

  // Toggle selection for batch forward
  const toggleSelectTarget = (target) => {
    if (sentTargets.has(target.id)) return;
    const exists = selectedTargets.some((t) => t.id === target.id);
    if (exists) {
      setSelectedTargets((prev) => prev.filter((t) => t.id !== target.id));
    } else {
      setSelectedTargets((prev) => [...prev, target]);
    }
  };

  // Batch forward to all selected
  const handleBatchForward = async () => {
    if (selectedTargets.length === 0 || sendingBatch) return;
    setSendingBatch(true);

    let successCount = 0;
    for (const target of selectedTargets) {
      const payload = buildForwardPayload(target);
      if (!payload) continue;
      try {
        await api.post("/message/send", payload);
        setSentTargets((prev) => new Set([...prev, target.id]));
        successCount++;
      } catch (err) {
        console.warn(`Failed to forward to ${target.name}:`, err);
      }
    }

    setSendingBatch(false);
    if (successCount > 0) {
      playMessageSentSound();
      snackbar.success(`Forwarded message to ${successCount} chat${successCount > 1 ? "s" : ""}`);
      handleClose();
    } else {
      snackbar.error("Failed to forward messages. Please try again.");
    }
  };

  // Render preview snippet of forwarding message
  const renderMessagePreview = () => {
    if (!forwardingMessage) return null;
    const m = forwardingMessage;
    const firstMedia = m.content?.media?.[0];

    return (
      <div className="bg-surface-hover/80 dark:bg-zinc-800/80 border border-border/80 dark:border-zinc-700/60 rounded-2xl p-3 flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
          <CornerUpRight className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
            <span>Forwarding</span>
            <span className="text-text-muted font-normal">
              · {m.sender?.userName ? `@${m.sender.userName}` : "Message"}
            </span>
          </div>
          {m.content?.text ? (
            <p className="text-xs text-text dark:text-zinc-200 truncate font-medium mt-0.5">
              "{m.content.text}"
            </p>
          ) : firstMedia?.type === "image" || m.type === "image" ? (
            <p className="text-xs text-text-secondary truncate flex items-center gap-1 mt-0.5">
              <ImageIcon className="w-3.5 h-3.5 text-primary" /> Photo Attachment
            </p>
          ) : firstMedia?.type === "video" || m.type === "video" ? (
            <p className="text-xs text-text-secondary truncate flex items-center gap-1 mt-0.5">
              <Film className="w-3.5 h-3.5 text-rose-500" /> Video Attachment
            </p>
          ) : m.type === "voice" ? (
            <p className="text-xs text-text-secondary truncate flex items-center gap-1 mt-0.5">
              <Mic className="w-3.5 h-3.5 text-emerald-400" /> Voice Message
            </p>
          ) : m.type === "sticker" ? (
            <p className="text-xs text-text-secondary truncate flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Sticker
            </p>
          ) : (
            <p className="text-xs text-text-secondary truncate font-medium mt-0.5">
              Attachment
            </p>
          )}
        </div>
      </div>
    );
  };

  if (!forwardModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-surface dark:bg-zinc-900 border border-border dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border/80 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CornerUpRight className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-text dark:text-zinc-100">Forward Message</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-full hover:bg-surface-hover dark:hover:bg-zinc-800 text-text-muted hover:text-text dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Container */}
          <div className="p-4 space-y-3 flex-1 overflow-y-auto hide-scrollbar flex flex-col">
            {/* Preview Banner */}
            {renderMessagePreview()}

            {/* Search Input Bar */}
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-text-muted dark:text-zinc-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people or groups..."
                className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-surface-hover/70 dark:bg-zinc-800/70 border border-border/80 dark:border-zinc-700/80 rounded-2xl text-text dark:text-zinc-100 placeholder:text-text-muted outline-none focus:border-primary/80 focus:ring-2 focus:ring-primary/10 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-text-muted hover:text-text dark:hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Contacts & Recent Chats List */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-[220px] max-h-[360px] pr-0.5">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-48 text-text-muted space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">Loading contacts...</span>
                </div>
              ) : filteredTargets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-text-muted space-y-1.5">
                  <Users className="w-8 h-8 opacity-40" />
                  <p className="text-xs font-semibold">No users or chats found</p>
                  <p className="text-[11px] opacity-70">Try searching for a different name</p>
                </div>
              ) : (
                filteredTargets.map((target) => {
                  const isSent = sentTargets.has(target.id);
                  const isSelected = selectedTargets.some((t) => t.id === target.id);
                  const isSending = sendingSingle === target.id;

                  return (
                    <div
                      key={target.id}
                      onClick={() => toggleSelectTarget(target)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? "bg-primary/10 dark:bg-primary/15 border border-primary/30"
                          : "hover:bg-surface-hover dark:hover:bg-zinc-800/60 border border-transparent"
                      }`}
                    >
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                        <div className="relative shrink-0">
                          {target.isGroup ? (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[1.5px]">
                              <div className="w-full h-full rounded-full bg-surface dark:bg-zinc-800 flex items-center justify-center">
                                <Users className="w-5 h-5 text-purple-300" />
                              </div>
                            </div>
                          ) : (
                            <img
                              src={target.avatar || dp}
                              alt={target.name}
                              className="w-10 h-10 rounded-full object-cover border border-border/80 dark:border-zinc-700"
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-text dark:text-zinc-100 truncate">
                              {target.name}
                            </span>
                            {target.isVerified && <VerifiedBadge size={14} />}
                          </div>
                          <p className="text-[11px] text-text-secondary dark:text-zinc-400 truncate">
                            {target.subtext}
                          </p>
                        </div>
                      </div>

                      {/* Right: Instant Send Button / Checkbox */}
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleSingleForward(target)}
                          disabled={isSent || isSending || sendingBatch}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                            isSent
                              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 cursor-default"
                              : isSending
                              ? "bg-primary/50 text-white cursor-wait"
                              : "bg-primary hover:bg-primary-hover text-white shadow-xs"
                          }`}
                        >
                          {isSent ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Sent</span>
                            </>
                          ) : isSending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>Send</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Floating Batch Action Bar (if multiple selected) */}
          {selectedTargets.length > 0 && (
            <div className="p-4 border-t border-border/80 dark:border-zinc-800 bg-surface/95 dark:bg-zinc-900/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 animate-in slide-in-from-bottom-2 duration-150">
              <span className="text-xs font-semibold text-text dark:text-zinc-200">
                {selectedTargets.length} chat{selectedTargets.length > 1 ? "s" : ""} selected
              </span>
              <button
                type="button"
                onClick={handleBatchForward}
                disabled={sendingBatch}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-primary to-rose-500 hover:opacity-95 text-white text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {sendingBatch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Forwarding...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to {selectedTargets.length}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ForwardMessageModal;
