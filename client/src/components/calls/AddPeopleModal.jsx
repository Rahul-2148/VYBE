import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, X, Check, Loader2, Users, Phone } from "lucide-react";
import api from "../../lib/axios";
import { getSocket } from "../../lib/socket";
import { snackbar } from "../../lib/snackbar";
import { triggerHaptic } from "../../lib/interactiveEffects";
import dp from "../../assets/dp3.png";

export const AddPeopleModal = ({
  isOpen,
  onClose,
  room,
  callType = "video",
  peers = {},
  currentUserId,
}) => {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [invitedIds, setInvitedIds] = useState(new Set());

  // Fetch suggested friends or search results
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        if (query.trim()) {
          const res = await api.get(`/search/users`, { params: { q: query.trim() } });
          if (isMounted && res.data?.success && Array.isArray(res.data.users)) {
            setUsers(res.data.users.filter((u) => u._id !== currentUserId));
            setIsLoading(false);
            return;
          }
        }

        // Default when query is empty: Fetch suggested users
        const res = await api.get(`/user/suggested`);
        if (isMounted && res.data?.success && Array.isArray(res.data.users)) {
          setUsers(res.data.users.filter((u) => u._id !== currentUserId));
        } else {
          // Fallback: fetch recent conversations
          const convRes = await api.get(`/message/conversations`);
          if (isMounted && convRes.data?.success && Array.isArray(convRes.data.conversations)) {
            const list = [];
            convRes.data.conversations.forEach((c) => {
              c.participants?.forEach((p) => {
                if (p._id !== currentUserId && !list.some((x) => x._id === p._id)) {
                  list.push(p);
                }
              });
            });
            setUsers(list);
          }
        }
      } catch (err) {
        console.error("AddPeopleModal error fetching contacts:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchUsers, query.trim() ? 250 : 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, query, currentUserId]);

  const handleInviteUser = (user) => {
    triggerHaptic("medium");
    const socket = getSocket();
    if (!socket || !room || !user?._id) return;

    socket.emit("call:invite-user", {
      room,
      targetUserId: user._id,
      type: callType,
    });

    setInvitedIds((prev) => new Set([...prev, user._id]));
    snackbar.success(`Calling @${user.userName || user.name}...`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md select-none">
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-tight">Add People to Call</h3>
                <p className="text-[11px] text-zinc-400">Invite friends into this live session</p>
              </div>
            </div>

            <button
              onClick={() => {
                triggerHaptic("light");
                onClose();
              }}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-zinc-800/60 bg-zinc-900/40">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search friends by name or username..."
                className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700/60 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500/80 transition"
                autoFocus
              />
            </div>
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-zinc-900">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500">
                <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                <span className="text-xs">Finding available friends...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 space-y-1">
                <p className="text-xs font-medium text-zinc-400">No users found</p>
                <p className="text-[11px] text-zinc-600">Try searching for their exact @username</p>
              </div>
            ) : (
              users.map((user) => {
                const avatar =
                  user.profileImage?.url ||
                  (typeof user.profileImage === "string" ? user.profileImage : "") ||
                  user.profilePicture?.url ||
                  (typeof user.profilePicture === "string" ? user.profilePicture : "") ||
                  dp;

                const isAlreadyInCall = Object.values(peers || {}).some(
                  (p) => p.userId === user._id || p.userName === user.userName
                );
                const isInvited = invitedIds.has(user._id);

                return (
                  <div
                    key={user._id}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                        <img src={avatar} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{user.name || user.userName}</h4>
                        <p className="text-[11px] text-zinc-400 truncate">@{user.userName}</p>
                      </div>
                    </div>

                    {isAlreadyInCall ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        In Call
                      </span>
                    ) : isInvited ? (
                      <span className="px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
                        Calling...
                      </span>
                    ) : (
                      <button
                        onClick={() => handleInviteUser(user)}
                        className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-md shadow-pink-600/20"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddPeopleModal;
