import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Check, Users, Camera, Loader2 } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import dp from "../assets/dp3.png";

export const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userList, setUserList] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    api
      .get("/user/suggested")
      .then((res) => {
        if (isMounted && res.data?.users) {
          setUserList(res.data.users);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingUsers(false);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSelectUser = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
    } else {
      setSelectedUserIds([...selectedUserIds, userId]);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      snackbar.error("Please enter a group name");
      return;
    }
    if (selectedUserIds.length < 2) {
      snackbar.error("Select at least 2 members for a group chat");
      return;
    }

    try {
      setCreating(true);
      const res = await api.post("/message/send", {
        type: "text",
        text: `Group created: ${groupName.trim()}`,
        messageType: "text",
        isGroup: true,
        groupName: groupName.trim(),
        members: selectedUserIds,
      });

      snackbar.success(`Group "${groupName.trim()}" created! 🎉`);
      if (onGroupCreated) onGroupCreated(res.data);
      onClose();
    } catch {
      // Try direct conversation endpoint
      try {
        const res2 = await api.post("/conversation/create-group", {
          name: groupName.trim(),
          members: selectedUserIds,
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

  const filteredUsers = userList.filter(
    (u) =>
      u.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[600] bg-surface-overlay backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-surface-inset border border-border rounded-3xl p-5 text-text shadow-2xl space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Users className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-base font-bold">New Group Chat</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-text rounded-full bg-surface hover:bg-surface-hover transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateGroup} className="space-y-4">
            {/* Group Name Input */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Group Name</label>
              <input
                type="text"
                placeholder="e.g. Squad Goals 🎉"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-surface border border-border px-4 py-2.5 rounded-xl text-xs text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition shadow-xs"
                required
              />
            </div>

            {/* Member Search */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                Add Members ({selectedUserIds.length} selected)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search followers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface border border-border pl-10 pr-4 py-2.5 rounded-xl text-xs text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition shadow-xs"
                />
              </div>
            </div>

            {/* Member Selection List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 hide-scrollbar">
              {loadingUsers ? (
                <div className="text-center py-6 text-xs text-text-muted">Loading suggested members...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-6 text-xs text-text-muted">No users found.</div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user._id);
                  return (
                    <div
                      key={user._id}
                      onClick={() => toggleSelectUser(user._id)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition border ${
                        isSelected
                          ? "bg-purple-500/15 border-purple-500/40"
                          : "bg-surface/60 border-border/80 hover:bg-surface"
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
                          isSelected ? "bg-purple-600 border-purple-500 text-text" : "border-border-strong bg-surface-hover"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-surface hover:bg-surface-hover font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating || !groupName.trim() || selectedUserIds.length < 2}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 via-rose-500 to-pink-600 font-bold rounded-xl text-xs shadow-lg transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Group"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreateGroupModal;
