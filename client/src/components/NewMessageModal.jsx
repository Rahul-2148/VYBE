import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Check, Users, MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedChatUser } from "../redux/features/messageSlice";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import dp from "../assets/dp3.png";
import VerifiedBadge from "./VerifiedBadge";

export const NewMessageModal = ({ isOpen, onClose, onGroupCreated }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((s) => s.user);
  const { conversations } = useSelector((s) => s.message);
  const currentUserId = (userData?.user?._id || userData?._id)?.toString();

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fetch suggested users when opening
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const fetchSuggested = async () => {
      try {
        setLoading(true);
        const res = await api.get("/user/suggested");
        if (isMounted && res.data?.users) {
          setSuggestedUsers(res.data.users.filter((u) => u._id?.toString() !== currentUserId));
        }
      } catch {
        // silent
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSuggested();

    return () => {
      isMounted = false;
    };
  }, [isOpen, currentUserId]);

  // Debounced Universal Search
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      const timer = setTimeout(() => setSearchResults([]), 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await api.get(`/user/search?q=${encodeURIComponent(query)}`);
        if (res.data?.users) {
          setSearchResults(res.data.users.filter((u) => u._id?.toString() !== currentUserId));
        }
      } catch (err) {
        console.warn("[NewMessageModal] Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, currentUserId]);

  if (!isOpen) return null;

  const handleSelectUser = (user) => {
    if (isGroupMode) {
      if (selectedUsers.some((u) => u._id === user._id)) {
        setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id));
      } else {
        setSelectedUsers([...selectedUsers, user]);
      }
    } else {
      // 1-to-1 Chat Direct Open
      const existingConv = conversations.find(
        (c) =>
          !c.isGroup &&
          ((c.participant?._id || c.participant)?.toString() === user._id?.toString() ||
            c.participants?.some((p) => (p?._id || p)?.toString() === user._id?.toString()))
      );

      if (existingConv) {
        dispatch(
          setSelectedChatUser({
            conversationId: existingConv._id || existingConv.conversationId,
            user,
          })
        );
        navigate(`/messages/${existingConv._id || existingConv.conversationId}`);
      } else {
        // Draft 1-to-1 chat
        dispatch(
          setSelectedChatUser({
            conversationId: null,
            user,
          })
        );
        navigate(`/messages`);
      }
      onClose();
    }
  };

  const handleCreateGroup = async (e) => {
    e?.preventDefault();
    if (!groupName.trim()) {
      snackbar.error("Please enter a group name");
      return;
    }
    if (selectedUsers.length < 2) {
      snackbar.error("Select at least 2 people for a group chat");
      return;
    }

    try {
      setCreating(true);
      const memberIds = selectedUsers.map((u) => u._id);
      const res = await api.post("/message/send", {
        type: "text",
        text: `Group created: ${groupName.trim()}`,
        messageType: "text",
        isGroup: true,
        groupName: groupName.trim(),
        members: memberIds,
      });

      snackbar.success(`Group "${groupName.trim()}" created! 🎉`);
      if (onGroupCreated) onGroupCreated(res.data);
      onClose();
    } catch {
      try {
        const res2 = await api.post("/conversation/create-group", {
          name: groupName.trim(),
          members: selectedUsers.map((u) => u._id),
        });
        snackbar.success(`Group "${groupName.trim()}" created! 🎉`);
        if (onGroupCreated) onGroupCreated(res2.data.conversation);
        onClose();
      } catch (err2) {
        snackbar.error(err2.response?.data?.message || "Failed to create group.");
      }
    } finally {
      setCreating(false);
    }
  };

  const displayUsers = searchQuery.trim() ? searchResults : suggestedUsers;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[600] bg-surface-overlay backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-surface-inset border border-border rounded-3xl p-5 text-text shadow-2xl space-y-4 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                {isGroupMode ? <Users className="w-4.5 h-4.5" /> : <MessageSquare className="w-4.5 h-4.5" />}
              </div>
              <h3 className="text-base font-bold text-text">
                {isGroupMode ? "New Group Message" : "New Message"}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsGroupMode(!isGroupMode);
                  setSelectedUsers([]);
                }}
                className={`text-xs px-2.5 py-1 rounded-xl font-bold transition cursor-pointer ${
                  isGroupMode
                    ? "bg-primary text-white"
                    : "bg-surface hover:bg-surface-hover text-text-secondary hover:text-text"
                }`}
              >
                {isGroupMode ? "Single Chat" : "Group Chat"}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-text-secondary hover:text-text rounded-full bg-surface hover:bg-surface-hover transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Group Name input if in Group Mode */}
          {isGroupMode && (
            <div className="space-y-2 shrink-0">
              <input
                type="text"
                placeholder="Group Name (e.g. Core Squad)..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-surface border border-border px-3.5 py-2 rounded-xl text-xs text-text outline-none focus:border-primary transition"
              />
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {selectedUsers.map((u) => (
                    <span
                      key={u._id}
                      className="inline-flex items-center gap-1 bg-primary/10 border border-primary/30 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full"
                    >
                      @{u.userName}
                      <button
                        onClick={() => setSelectedUsers(selectedUsers.filter((sel) => sel._id !== u._id))}
                        className="hover:text-rose-400 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Search Box */}
          <div className="relative shrink-0">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name or @username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border pl-9 pr-3.5 py-2 rounded-xl text-xs text-text outline-none focus:border-primary transition placeholder:text-text-muted"
            />
          </div>

          {/* User Results List */}
          <div className="flex-1 overflow-y-auto space-y-1 min-h-[220px] hide-scrollbar">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest px-2 py-1">
              {searchQuery.trim() ? "Search Results" : "Suggested Accounts"}
            </p>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-text-muted gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Searching users...</span>
              </div>
            ) : displayUsers.length === 0 ? (
              <div className="text-center py-10 text-text-muted text-xs">
                No accounts found matching "{searchQuery}"
              </div>
            ) : (
              displayUsers.map((u) => {
                const isSelected = selectedUsers.some((sel) => sel._id === u._id);
                const avatar =
                  u.profileImage?.url ||
                  (typeof u.profileImage === "string" ? u.profileImage : null) ||
                  u.profilePicture?.url ||
                  (typeof u.profilePicture === "string" ? u.profilePicture : null) ||
                  dp;

                return (
                  <div
                    key={u._id}
                    onClick={() => handleSelectUser(u)}
                    className={`flex items-center justify-between p-2.5 rounded-2xl transition cursor-pointer ${
                      isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-text truncate">@{u.userName}</span>
                          {u.isVerified && <VerifiedBadge size="xs" />}
                        </div>
                        <p className="text-[11px] text-text-secondary truncate">{u.name || `@${u.userName}`}</p>
                      </div>
                    </div>

                    {isGroupMode && (
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition shrink-0 ${
                          isSelected ? "bg-primary border-primary text-white" : "border-border bg-surface"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Group Submit Button */}
          {isGroupMode && (
            <button
              onClick={handleCreateGroup}
              disabled={creating || selectedUsers.length < 2 || !groupName.trim()}
              className="w-full py-2.5 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-xs font-bold transition shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Group...</span>
                </>
              ) : (
                <span>Create Group Chat ({selectedUsers.length})</span>
              )}
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NewMessageModal;
