import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Hash, User, Trash2, Clock, ArrowRight, BadgeCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import dp from "../assets/dp3.png";
import api from "../lib/axios";

export const SearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("top"); // 'top', 'accounts', 'tags'
  const [users, setUsers] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSearchHistory();
    }
  }, [isOpen]);

  const fetchSearchHistory = async () => {
    try {
      const res = await api.get("/search/history");
      if (res.data.success) {
        setSearchHistory(res.data.searchHistory || []);
      }
    } catch {}
  };

  const handleDeleteHistoryItem = async (itemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const res = await api.delete(`/search/history/${itemId}`);
      if (res.data.success) {
        setSearchHistory((prev) => prev.filter((item) => item._id !== itemId));
        toast.success("Removed from history");
      }
    } catch {
      toast.error("Failed to remove item.");
    }
  };

  const handleClearAllHistory = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const res = await api.delete("/search/history");
      if (res.data.success) {
        setSearchHistory([]);
        toast.success("History cleared");
      }
    } catch {
      toast.error("Failed to clear history.");
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      setHashtags([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/search/query?q=${encodeURIComponent(query)}`);
        if (res.data.success) {
          setUsers(res.data.users || []);
          setHashtags(res.data.hashtags || []);
        }
      } catch {
        toast.error("Search query failed.");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectUser = async (user) => {
    try {
      await api.post("/search/history", { targetUserId: user._id });
    } catch {}
    onClose();
    navigate(`/profile/${user.userName}`);
  };

  const handleSelectTag = async (tagName) => {
    try {
      await api.post("/search/history", { targetTag: tagName });
    } catch {}
    onClose();
    navigate(`/explore/tag/${tagName}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[600] flex items-start justify-center pt-12 md:pt-20 p-4 bg-surface-overlay backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative w-full max-w-xl bg-surface-inset border border-border rounded-3xl p-6 text-text shadow-2xl space-y-6"
        >
          {/* Top Search Input */}
          <div className="vybe-search-bar" style={{ height: 40, borderRadius: 10 }}>
            <Search className="search-icon" style={{ width: 18, height: 18 }} />
            <input
              autoFocus
              type="text"
              placeholder="Search users, @usernames, or #hashtags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery("")} className="clear-btn">
                <X />
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                outline: "none",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                cursor: "pointer",
                paddingLeft: 8,
                borderLeft: "1px solid var(--border)",
                marginLeft: 4,
                lineHeight: 1,
                fontFamily: "inherit",
              }}
            >
              Esc
            </button>
          </div>

          {/* Search Tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            {["top", "accounts", "tags"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-1.5 px-4 rounded-xl text-xs font-bold transition capitalize ${
                  activeTab === tab ? "bg-rose-600 text-text shadow" : "text-text-secondary hover:text-text bg-surface"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Results List */}
          <div className="max-h-96 overflow-y-auto space-y-3">
            {loading ? (
              <div className="text-center py-10 text-text-muted">
                <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Searching...
              </div>
            ) : !query.trim() ? (
              searchHistory.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Recent Searches</p>
                    <button
                      onClick={handleClearAllHistory}
                      className="text-xs text-rose-500 hover:text-rose-400 font-bold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-2">
                    {searchHistory.map((item) => {
                      if (item.targetUser) {
                        return (
                          <div
                            key={item._id}
                            className="flex items-center justify-between p-3 rounded-2xl bg-surface/60 hover:bg-surface border border-border/80 transition"
                          >
                            <div
                              onClick={() => {
                                onClose();
                                navigate(`/profile/${item.targetUser.userName}`);
                              }}
                              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                            >
                              <img
                                src={item.targetUser.profileImage?.url || dp}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover border border-border"
                              />
                              <div className="truncate">
                                <p className="text-xs font-bold text-text flex items-center gap-0.5">
                                  @{item.targetUser.userName}
                                  {item.targetUser.isVerified && (
                                    <BadgeCheck className="h-4 w-4 fill-[#0095f6] text-white shrink-0" />
                                  )}
                                </p>
                                <p className="text-[11px] text-text-secondary truncate">{item.targetUser.name}</p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => handleDeleteHistoryItem(item._id, e)}
                              className="p-1 rounded-full hover:bg-surface-hover text-text-muted hover:text-text transition cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      }
                      if (item.targetTag) {
                        return (
                          <div
                            key={item._id}
                            className="flex items-center justify-between p-3 rounded-2xl bg-surface/60 hover:bg-surface border border-border/80 transition"
                          >
                            <div
                              onClick={() => {
                                onClose();
                                navigate(`/explore/tag/${item.targetTag}`);
                              }}
                              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                            >
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-text shadow">
                                <Hash className="w-5 h-5" />
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold text-text">#{item.targetTag}</p>
                                <p className="text-[11px] text-text-secondary">Hashtag</p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => handleDeleteHistoryItem(item._id, e)}
                              className="p-1 rounded-full hover:bg-surface-hover text-text-muted hover:text-text transition cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-text-muted text-xs space-y-2">
                  <Clock className="w-8 h-8 mx-auto text-text-muted mb-2" />
                  <p className="font-semibold text-text-secondary">Search for people, tags, or topics</p>
                  <p>Type a search term above to explore VYBE creators.</p>
                </div>
              )
            ) : (
              <>
                {/* Users Section */}
                {(activeTab === "top" || activeTab === "accounts") && users.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Accounts</p>
                    {users.map((u) => (
                      <div
                        key={u._id}
                        onClick={() => handleSelectUser(u)}
                        className="flex items-center justify-between p-3 rounded-2xl bg-surface/60 hover:bg-surface border border-border/80 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3">
                          <img src={u.profileImage?.url || dp} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                          <div>
                            <p className="text-xs font-bold text-text flex items-center gap-0.5">
                              @{u.userName}
                              {u.isVerified && (
                                <BadgeCheck className="h-4 w-4 fill-[#0095f6] text-white shrink-0" />
                              )}
                            </p>
                            <p className="text-[11px] text-text-secondary">{u.name}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-muted" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Hashtags Section */}
                {(activeTab === "top" || activeTab === "tags") && hashtags.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Hashtags</p>
                    {hashtags.map((h, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectTag(h.name)}
                        className="flex items-center justify-between p-3 rounded-2xl bg-surface/60 hover:bg-surface border border-border/80 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-text shadow">
                            <Hash className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-text">#{h.name}</p>
                            <p className="text-[11px] text-text-secondary">{h.count} posts</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-muted" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SearchModal;
