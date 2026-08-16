import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Check, Send, Link2, Share2, PlusCircle, CheckCircle2, Users, Loader2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { snackbar } from "../lib/snackbar";
import { useNavigate } from "react-router-dom";
import dp from "../assets/dp3.png";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";

export const ShareSheet = ({ open, onClose, entity, entityType = "post", following = [] }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [userList, setUserList] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;

    api.get("/message/conversations")
      .then((res) => {
        if (res.data?.conversations) {
          setConversations(res.data.conversations);
          const dmUsers = res.data.conversations
            .filter((c) => !c.isGroup && c.participant)
            .map((c) => c.participant);

          setUserList((prev) => {
            const combined = [...dmUsers, ...prev];
            const seen = new Set();
            return combined.filter((u) => {
              if (!u?._id || seen.has(u._id)) return false;
              seen.add(u._id);
              return true;
            });
          });
        }
      })
      .catch(() => null);

    if (following && following.length > 0 && typeof following[0] === "object") {
      setUserList((prev) => {
        const combined = [...following, ...prev];
        const seen = new Set();
        return combined.filter((u) => {
          if (!u?._id || seen.has(u._id)) return false;
          seen.add(u._id);
          return true;
        });
      });
    } else {
      api
        .get("/user/suggested")
        .then((res) => {
          if (res.data?.users) {
            setUserList((prev) => {
              const combined = [...prev, ...res.data.users];
              const seen = new Set();
              return combined.filter((u) => {
                if (!u?._id || seen.has(u._id)) return false;
                seen.add(u._id);
                return true;
              });
            });
          }
        })
        .catch(() => {});
    }
  }, [open, following]);

  if (!open || !entity?._id) return null;

  const getShareUrl = () => {
    const origin = window.location.origin;
    if (entityType === "reel") return `${origin}/reel/${entity._id}`;
    if (entityType === "profile") return `${origin}/profile/${entity.userName}`;
    if (entityType === "story") return `${origin}/story/${entity._id}`;
    return `${origin}/post/${entity._id}`;
  };

  const filteredUsers = userList.filter(
    (user) =>
      user.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = conversations.filter(
    (c) => c.isGroup && (c.groupName || c.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSelectUser = (user) => {
    if (selectedUsers.some((u) => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const toggleSelectGroup = (group) => {
    if (selectedConversations.some((c) => c._id === group._id)) {
      setSelectedConversations(selectedConversations.filter((c) => c._id !== group._id));
    } else {
      setSelectedConversations([...selectedConversations, group]);
    }
  };

  const handleSendDM = async () => {
    if (selectedUsers.length === 0 && selectedConversations.length === 0) return;

    try {
      setSending(true);
      const socket = getSocket();
      const shareUrl = getShareUrl();

      const shareText = customMessage.trim()
        ? `${customMessage.trim()}\n${shareUrl}`
        : `Shared a ${entityType}: ${shareUrl}`;

      let successCount = 0;
      let errorMessages = [];

      const normType = (entityType === "reels") ? "reel" : (entityType === "user") ? "profile" : entityType;
      const entityId = entity?._id || entity?.id;

      // Send to 1-to-1 users
      for (const targetUser of selectedUsers) {
        const clientMsgId = `client_${Date.now()}_${targetUser._id}_${Math.random().toString(36).substr(2, 9)}`;
        const payload = {
          clientMessageId: clientMsgId,
          recipientId: targetUser._id,
          text: shareText,
          messageType: `shared_${normType}`,
          sharedType: normType,
          ...(entityId ? { sharedId: entityId } : {}),
          sharedData: {
            _id: entityId,
            author: entity?.author || { userName: entity?.userName || entity?.user?.userName, profileImage: entity?.profileImage || entity?.user?.profileImage },
            mediaUrl: entity?.mediaUrl || entity?.media?.url || (Array.isArray(entity?.media) ? entity.media[0]?.url : null) || (Array.isArray(entity?.carousel) ? entity.carousel[0]?.url : null) || entity?.profileImage?.url || "",
            caption: entity?.caption || entity?.title || entity?.description || "",
          },
        };

        try {
          const res = await api.post("/message/send", payload);
          if (res.data?.message && socket) {
            socket.emit("send-message", {
              conversationId: res.data.message.conversation,
              recipientId: targetUser._id,
              messageContent: res.data.message,
            });
          }
          successCount++;
        } catch (err) {
          const msg = err.response?.data?.message || `Failed to send to @${targetUser.userName}`;
          errorMessages.push(`@${targetUser.userName}: ${msg}`);
        }
      }

      // Send to Group Conversations
      for (const group of selectedConversations) {
        const clientMsgId = `client_${Date.now()}_${group._id}_${Math.random().toString(36).substr(2, 9)}`;
        const payload = {
          clientMessageId: clientMsgId,
          conversationId: group._id,
          text: shareText,
          messageType: `shared_${normType}`,
          sharedType: normType,
          ...(entityId ? { sharedId: entityId } : {}),
          sharedData: {
            _id: entityId,
            author: entity?.author || { userName: entity?.userName || entity?.user?.userName, profileImage: entity?.profileImage || entity?.user?.profileImage },
            mediaUrl: entity?.mediaUrl || entity?.media?.url || (Array.isArray(entity?.media) ? entity.media[0]?.url : null) || (Array.isArray(entity?.carousel) ? entity.carousel[0]?.url : null) || entity?.profileImage?.url || "",
            caption: entity?.caption || entity?.title || entity?.description || "",
          },
        };

        try {
          const res = await api.post("/message/send", payload);
          if (res.data?.message && socket) {
            socket.emit("send-message", {
              conversationId: group._id,
              messageContent: res.data.message,
            });
          }
          successCount++;
        } catch (err) {
          errorMessages.push(`Group ${group.groupName}: ${err.response?.data?.message || "Failed"}`);
        }
      }

      if (successCount > 0) {
        setSentSuccess(true);
        snackbar.success(`Shared with ${successCount} target${successCount > 1 ? "s" : ""}! ✨`);
        setTimeout(() => {
          setSentSuccess(false);
          onClose();
        }, 1200);
      }

      if (errorMessages.length > 0) {
        errorMessages.forEach((msg) => snackbar.error(msg, { duration: 4000 }));
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to share content.");
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getShareUrl());
    snackbar.success("Link copied to clipboard!");
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Check this out on VYBE 👀\n${getShareUrl()}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleSystemShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "VYBE Share",
          url: getShareUrl(),
        });
      } else {
        handleCopyLink();
      }
    } catch (e) {
      console.warn("ShareSheet: system share failed", e);
    }
  };

  const handleAddToStory = () => {
    onClose();
    const mediaUrl =
      entity?.mediaUrl ||
      entity?.videoUrl ||
      entity?.media?.url ||
      (Array.isArray(entity?.media) ? entity.media[0]?.url : null) ||
      (Array.isArray(entity?.carousel) ? entity.carousel[0]?.url : null) ||
      entity?.thumbnail;

    const authorData = entity?.author || {
      userName: entity?.userName || entity?.user?.userName,
      name: entity?.name || entity?.user?.name,
      profileImage: entity?.profileImage || entity?.user?.profileImage,
    };

    navigate("/upload?type=story", {
      state: {
        type: "story",
        initialMediaUrl: mediaUrl,
        sharedEntity: {
          entityId: entity?._id || entity?.id,
          entityType: (entityType === "reels") ? "reel" : entityType,
          authorName: authorData?.userName || authorData?.name || "user",
          authorAvatar: typeof authorData?.profileImage === "object" ? authorData?.profileImage?.url : authorData?.profileImage || "",
          mediaUrl: mediaUrl,
          caption: entity?.caption || entity?.title || "",
        },
      },
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[600] bg-surface-overlay backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
          className="relative w-full max-w-lg bg-surface-inset/95 border border-border/80 rounded-t-3xl sm:rounded-3xl p-5 text-text shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
        >
          {/* Header Bar */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-1 bg-surface-active rounded-full" />
            <div className="w-full flex items-center justify-between">
              <h3 className="text-base font-bold text-text capitalize">Share {entityType}</h3>
              <button onClick={onClose} className="p-1.5 text-text-secondary hover:text-text rounded-full bg-surface hover:bg-surface-hover transition cursor-pointer">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>

          {/* Search Filter Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search recipients or groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border pl-10 pr-4 py-2.5 rounded-2xl text-xs text-text outline-none focus:border-rose-500 transition"
            />
          </div>

          {/* Recipients Grid List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-48 pr-1 hide-scrollbar">
            {/* Groups */}
            {filteredGroups.map((group) => {
              const isSelected = selectedConversations.some((c) => c._id === group._id);
              return (
                <div
                  key={group._id}
                  onClick={() => toggleSelectGroup(group)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition border ${
                    isSelected ? "bg-rose-500/15 border-rose-500/40" : "bg-surface/60 border-border/80 hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Users className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text">{group.groupName || group.name || "Group"}</p>
                      <p className="text-[10px] text-text-secondary">{group.participants?.length || 0} members</p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                      isSelected ? "bg-rose-600 border-rose-500 text-text" : "border-border-strong bg-surface-hover"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}

            {/* 1-to-1 Users */}
            {filteredUsers.map((user) => {
              const isSelected = selectedUsers.some((u) => u._id === user._id);
              return (
                <div
                  key={user._id}
                  onClick={() => toggleSelectUser(user)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition border ${
                    isSelected ? "bg-rose-500/15 border-rose-500/40" : "bg-surface/60 border-border/80 hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={user.profileImage?.url || dp}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border border-border"
                    />
                    <div>
                      <p className="text-xs font-bold text-text">@{user.userName}</p>
                      <p className="text-[10px] text-text-secondary">{user.name}</p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                      isSelected ? "bg-rose-600 border-rose-500 text-text" : "border-border-strong bg-surface-hover"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Optional Message Input Box */}
          {(selectedUsers.length > 0 || selectedConversations.length > 0) && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Write a message..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full bg-surface border border-border px-4 py-2.5 rounded-xl text-xs text-text outline-none focus:border-rose-500 transition"
              />
              <button
                onClick={handleSendDM}
                disabled={sending}
                className="w-full py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 font-bold text-xs rounded-2xl shadow-xl hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : sentSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-text animate-bounce" />
                    <span>Sent Successfully!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send to {selectedUsers.length + selectedConversations.length} Target{selectedUsers.length + selectedConversations.length > 1 ? "s" : ""}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Quick Action Grid */}
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border text-center text-xs">
            <button onClick={handleAddToStory} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-surface transition cursor-pointer">
              <div className="w-10 h-10 rounded-2xl bg-surface border border-border flex items-center justify-center text-rose-500 shadow">
                <PlusCircle className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-text font-semibold">Add to Story</span>
            </button>

            <button onClick={handleWhatsAppShare} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-surface transition cursor-pointer">
              <div className="w-10 h-10 rounded-2xl bg-surface border border-border flex items-center justify-center text-emerald-400 shadow">
                <FaWhatsapp className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-text font-semibold">WhatsApp</span>
            </button>

            <button onClick={handleSystemShare} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-surface transition cursor-pointer">
              <div className="w-10 h-10 rounded-2xl bg-surface border border-border flex items-center justify-center text-purple-400 shadow">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-text font-semibold">Share via...</span>
            </button>

            <button onClick={handleCopyLink} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-surface transition cursor-pointer">
              <div className="w-10 h-10 rounded-2xl bg-surface border border-border flex items-center justify-center text-cyan-400 shadow">
                <Link2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-text font-semibold">Copy Link</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareSheet;
