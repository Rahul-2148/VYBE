import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Check, Send, Link2, Share2, PlusCircle, CheckCircle2, Users, Loader2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { snackbar } from "../lib/snackbar";
import { useNavigate } from "react-router-dom";
import dp from "../assets/dp3.png";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";
import VerifiedBadge from "./VerifiedBadge";

export const ShareSheet = ({ open, onClose, entity, entityType = "post", following = [] }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedConversations, setSelectedConversations] = useState([]);
  const [userList, setUserList] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Debounced Global User Search
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      const timer = setTimeout(() => {
        setGlobalSearchResults([]);
        setIsSearchingGlobal(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingGlobal(true);
        const res = await api.get(`/user/search?q=${encodeURIComponent(query)}`);
        if (res.data?.users) {
          setGlobalSearchResults(res.data.users);
        }
      } catch (err) {
        console.warn("Global search in ShareSheet error:", err);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!open) return;
    let isMounted = true;

    const baseList = following && following.length > 0 && typeof following[0] === "object" ? following : [];

    Promise.all([
      api.get("/message/conversations").catch(() => ({ data: { conversations: [] } })),
      baseList.length === 0 ? api.get("/user/suggested").catch(() => ({ data: { users: [] } })) : Promise.resolve({ data: { users: [] } }),
    ]).then(([convRes, suggRes]) => {
      if (!isMounted) return;
      if (convRes.data?.conversations) {
        setConversations(convRes.data.conversations);
        const dmUsers = convRes.data.conversations
          .filter((c) => !c.isGroup && c.participant)
          .map((c) => c.participant);

        const candidates = [...baseList, ...dmUsers, ...(suggRes.data?.users || [])];
        const seen = new Set();
        const deduped = candidates.filter((u) => {
          if (!u?._id || seen.has(u._id)) return false;
          seen.add(u._id);
          return true;
        });
        setUserList(deduped);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [open, following]);

  if (!open || (!entity?._id && !entity?.id && !entity?.title && !entity?.userName)) return null;

  const getShareUrl = () => {
    const origin = window.location.origin;
    if (entityType === "reel" || entityType === "reels") return `${origin}/reel/${entity._id || entity.id}`;
    if (entityType === "profile" || entityType === "user") return `${origin}/profile/${entity.userName || entity._id || entity.id}`;
    if (entityType === "story") return `${origin}/story/${entity._id || entity.id}`;
    if (entityType === "audio" || entityType === "music") return `${origin}/audio/${encodeURIComponent(entity._id || entity.id || entity.title || "")}`;
    if (entityType === "location" || entityType === "place") return `${origin}/explore/location/${encodeURIComponent(entity._id || entity.id || entity.title || "")}`;
    return `${origin}/post/${entity._id || entity.id}`;
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

      const normType = (entityType === "reels") ? "reel" : (entityType === "user") ? "profile" : (entityType === "music") ? "audio" : entityType;
      const entityId = entity?._id || entity?.id || (entityType === "audio" ? entity?.title : undefined);

      const sharedDataPayload = {
        _id: entityId || entity?.title || "",
        id: entityId || entity?.title || "",
        title: entity?.title || entity?.caption || "",
        artist: entity?.artist || entity?.author?.name || entity?.author?.userName || "",
        author: entity?.author || {
          userName: entity?.userName || entity?.user?.userName || entity?.artist || "user",
          name: entity?.name || entity?.user?.name || entity?.artist || "User",
          profileImage: entity?.profileImage || entity?.user?.profileImage || entity?.coverUrl || ""
        },
        mediaUrl: entity?.mediaUrl || entity?.coverUrl || entity?.media?.url || (Array.isArray(entity?.media) ? entity.media[0]?.url : null) || (Array.isArray(entity?.carousel) ? entity.carousel[0]?.url : null) || entity?.profileImage?.url || "",
        coverUrl: entity?.coverUrl || entity?.mediaUrl || "",
        caption: entity?.caption || entity?.title || entity?.description || "",
        audioUrl: entity?.audioUrl || "",
      };

      // Send to 1-to-1 users
      for (const targetUser of selectedUsers) {
        const clientMsgId = `client_${Date.now()}_${targetUser._id}_${Math.random().toString(36).substr(2, 9)}`;
        const payload = {
          clientMessageId: clientMsgId,
          recipientId: targetUser._id,
          text: shareText,
          messageType: `shared_${normType}`,
          sharedType: normType,
          ...(entityId && entityId !== entity?.title ? { sharedId: entityId } : {}),
          sharedData: sharedDataPayload,
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
          ...(entityId && entityId !== entity?.title ? { sharedId: entityId } : {}),
          sharedData: sharedDataPayload,
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
      entity?.coverUrl ||
      entity?.videoUrl ||
      entity?.media?.url ||
      (Array.isArray(entity?.media) ? entity.media[0]?.url : null) ||
      (Array.isArray(entity?.carousel) ? entity.carousel[0]?.url : null) ||
      entity?.thumbnail;

    const authorData = entity?.author || {
      userName: entity?.userName || entity?.user?.userName || entity?.artist || "audio",
      name: entity?.name || entity?.user?.name || entity?.artist || "Audio",
      profileImage: entity?.profileImage || entity?.user?.profileImage || entity?.coverUrl,
    };

    navigate("/upload?type=story", {
      state: {
        type: "story",
        initialMediaUrl: mediaUrl,
        sharedEntity: {
          entityId: entity?._id || entity?.id || entity?.title,
          entityType: (entityType === "reels") ? "reel" : (entityType === "music") ? "audio" : entityType,
          authorName: authorData?.userName || authorData?.name || "user",
          authorAvatar: typeof authorData?.profileImage === "object" ? authorData?.profileImage?.url : authorData?.profileImage || "",
          mediaUrl: mediaUrl,
          caption: entity?.caption || entity?.title || "",
          audioUrl: entity?.audioUrl || "",
        },
      },
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-sheet-backdrop"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-[2px] flex items-end justify-center p-0 select-none"
        >
          <motion.div
            key="share-sheet-content"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            dragSnapToOrigin
            onDragEnd={(e, info) => {
              if (info.offset.y > 80 || info.velocity.y > 400) {
                onClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg md:max-w-xl bg-surface/98 backdrop-blur-2xl border-t border-x border-border rounded-t-[28px] md:rounded-t-[32px] rounded-b-none shadow-[0_-12px_45px_rgba(0,0,0,0.85)] p-5 text-text h-[64vh] md:h-[62vh] max-h-[620px] flex flex-col justify-between overflow-hidden"
          >
          {/* Header Bar */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="w-10 h-1 bg-border-strong rounded-full opacity-60 cursor-pointer hover:opacity-100 transition" onClick={onClose} />
            <div className="w-full flex items-center justify-between">
              <h3 className="text-base font-bold text-text capitalize">Share {entityType}</h3>
              <button onClick={onClose} className="p-1.5 text-text-secondary hover:text-text rounded-full bg-surface-hover/50 hover:bg-surface-hover transition cursor-pointer">
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

            {/* 1-to-1 Users from Recent/Following */}
            {filteredUsers.map((user) => {
              const isSelected = selectedUsers.some((u) => u._id === user._id);
              const avatar =
                user.profileImage?.url ||
                (typeof user.profileImage === "string" ? user.profileImage : null) ||
                user.profilePicture?.url ||
                (typeof user.profilePicture === "string" ? user.profilePicture : null) ||
                dp;

              return (
                <div
                  key={user._id}
                  onClick={() => toggleSelectUser(user)}
                  className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition border ${
                    isSelected ? "bg-rose-500/15 border-rose-500/40" : "bg-surface/60 border-border/80 hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={avatar}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold text-text truncate">@{user.userName}</p>
                        {user.isVerified && <VerifiedBadge size="xs" />}
                      </div>
                      <p className="text-[10px] text-text-secondary truncate">{user.name || `@${user.userName}`}</p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition shrink-0 ${
                      isSelected ? "bg-rose-600 border-rose-500 text-text" : "border-border-strong bg-surface-hover"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}

            {/* Global Search Users on VYBE */}
            {searchQuery.trim().length > 0 && (
              <>
                {globalSearchResults
                  .filter((gu) => !filteredUsers.some((fu) => fu._id === gu._id))
                  .map((user) => {
                    const isSelected = selectedUsers.some((u) => u._id === user._id);
                    const avatar =
                      user.profileImage?.url ||
                      (typeof user.profileImage === "string" ? user.profileImage : null) ||
                      user.profilePicture?.url ||
                      (typeof user.profilePicture === "string" ? user.profilePicture : null) ||
                      dp;

                    return (
                      <div
                        key={user._id}
                        onClick={() => toggleSelectUser(user)}
                        className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition border ${
                          isSelected ? "bg-rose-500/15 border-rose-500/40" : "bg-surface/60 border-border/80 hover:bg-surface"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={avatar}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-bold text-text truncate">@{user.userName}</p>
                              {user.isVerified && <VerifiedBadge size="xs" />}
                            </div>
                            <p className="text-[10px] text-text-secondary truncate">{user.name || `@${user.userName}`}</p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition shrink-0 ${
                            isSelected ? "bg-rose-600 border-rose-500 text-text" : "border-border-strong bg-surface-hover"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
              </>
            )}

            {filteredGroups.length === 0 && filteredUsers.length === 0 && globalSearchResults.length === 0 && (
              <div className="text-center py-8 text-xs text-text-muted">
                {isSearchingGlobal ? "Searching users on VYBE..." : `No users found matching "${searchQuery}"`}
              </div>
            )}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareSheet;
