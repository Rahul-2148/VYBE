import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Search, X, Check, Users, Trash2, CheckCircle2 } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import dp from "../assets/dp3.png";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import VerifiedBadge from "./VerifiedBadge";

export const CloseFriendsModal = ({ isOpen, onClose }) => {
  const [closeFriends, setCloseFriends] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("list"); // 'list' | 'suggestions'
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchFriendsData = async () => {
      try {
        setLoading(true);
        const res = await api.get("/story/close-friends");

        if (res.data?.success) {
          setCloseFriends(res.data.closeFriends || []);
          setSuggestions(res.data.suggestions || []);
        }
      } catch (err) {
        console.error("Failed to load close friends:", err);
        snackbar.error("Failed to load close friends list.");
      } finally {
        setLoading(false);
      }
    };

    fetchFriendsData();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleCloseFriend = async (targetUser) => {
    const targetUserId = targetUser._id || targetUser;

    triggerHaptic("light");
    setTogglingId(targetUserId);

    try {
      const res = await api.post(`/story/close-friends/toggle/${targetUserId}`);
      if (res.data?.success) {
        if (res.data.isCloseFriend) {
          microAudio.playPop();
          setCloseFriends((prev) => [...prev, targetUser]);
          setSuggestions((prev) =>
            prev.filter((u) => (u._id || u).toString() !== targetUserId.toString())
          );
          snackbar.success(`Added @${targetUser.userName || "friend"} to Close Friends ⭐️`);
        } else {
          setCloseFriends((prev) =>
            prev.filter((f) => (f._id || f).toString() !== targetUserId.toString())
          );
          setSuggestions((prev) => [targetUser, ...prev]);
          snackbar.success(`Removed @${targetUser.userName || "friend"} from Close Friends`);
        }
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to update close friend status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleClearAll = async () => {
    if (closeFriends.length === 0) return;
    try {
      const res = await api.delete("/story/close-friends/clear");
      if (res.data?.success) {
        setSuggestions((prev) => [...closeFriends, ...prev]);
        setCloseFriends([]);
        setShowClearConfirm(false);
        snackbar.success("Cleared all Close Friends ⭐️");
      }
    } catch {
      snackbar.error("Failed to clear close friends list.");
    }
  };

  // Filtered Lists
  const filteredCloseFriends = closeFriends.filter(
    (u) =>
      u.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuggestions = suggestions.filter(
    (u) =>
      u.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentList = activeTab === "list" ? filteredCloseFriends : filteredSuggestions;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-5 text-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                <Star className="w-4 h-4 fill-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-1.5">
                  <span>Close Friends</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    {closeFriends.length}
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  We don't send notifications when you edit your list.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {closeFriends.length > 0 && (
                showClearConfirm ? (
                  <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 rounded-xl p-1 animate-in fade-in">
                    <button
                      onClick={handleClearAll}
                      className="px-2 py-1 text-[10px] bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-500 transition cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="p-2 text-zinc-400 hover:text-rose-400 rounded-xl hover:bg-zinc-900 transition cursor-pointer"
                    title="Clear list"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )
              )}

              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mt-3 shrink-0">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Custom Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900 rounded-2xl mt-3 border border-zinc-800 shrink-0">
            <button
              onClick={() => setActiveTab("list")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "list"
                  ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Your List ({closeFriends.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("suggestions")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "suggestions"
                  ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Suggested ({suggestions.length})</span>
            </button>
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto mt-3 space-y-1.5 pr-1 min-h-[220px] max-h-[380px]">
            {loading ? (
              <div className="text-center py-12 text-zinc-500 text-xs">
                <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading circle...
              </div>
            ) : currentList.length === 0 ? (
              <div className="text-center py-10 px-4 space-y-2 text-zinc-400">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-emerald-400">
                  <Star className="w-5 h-5 fill-emerald-400" />
                </div>
                <p className="text-xs font-bold text-white">
                  {activeTab === "list"
                    ? searchQuery
                      ? "No matching close friends found"
                      : "No close friends yet"
                    : "No more suggested friends"}
                </p>
                <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                  {activeTab === "list"
                    ? "Add people from the Suggested tab to share exclusive stories with your private circle."
                    : "You've added all your suggested contacts to your Close Friends list!"}
                </p>
              </div>
            ) : (
              currentList.map((user) => {
                const uid = user._id || user;
                const isCloseFriend = closeFriends.some(
                  (f) => (f._id || f).toString() === uid.toString()
                );
                const isToggling = togglingId === uid;

                return (
                  <div
                    key={uid}
                    onClick={() => handleToggleCloseFriend(user)}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer group select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="relative shrink-0">
                        <img
                          src={user.profileImage?.url || dp}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                        />
                        {isCloseFriend && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center border border-zinc-950 shadow">
                            <Star className="w-2.5 h-2.5 fill-black" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-extrabold text-white truncate group-hover:text-emerald-400 transition flex items-center gap-1">
                            <span>{user.userName}</span>
                            {user.isVerified && (
                              <VerifiedBadge size="xs" />
                            )}
                          </p>
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate">{user.name || user.userName}</p>
                      </div>
                    </div>

                    {/* Custom Circular Radio / Checkbox */}
                    <div className="shrink-0 pl-2">
                      {isToggling ? (
                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      ) : isCloseFriend ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform transform active:scale-90">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-zinc-600 hover:border-zinc-400 transition-colors" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Done Button */}
          <div className="pt-3 mt-2 border-t border-zinc-800 shrink-0">
            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-xs uppercase tracking-wider rounded-2xl hover:opacity-95 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Done</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CloseFriendsModal;
