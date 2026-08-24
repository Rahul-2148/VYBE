import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Hash,
  User,
  Trash2,
  Clock,
  ArrowRight,
  BadgeCheck,
  Lock,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { snackbar } from "../lib/snackbar";
import dp from "../assets/dp3.png";
import api from "../lib/axios";
import VerifiedBadge from "./VerifiedBadge";
import { searchPlaces } from "../lib/locationService";
import { triggerHaptic } from "../lib/interactiveEffects";

export const SearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("top"); // 'top', 'accounts', 'tags', 'places'
  const [users, setUsers] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [places, setPlaces] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      api
        .get("/search/history")
        .then((res) => {
          if (isMounted && res.data?.success) {
            setSearchHistory(res.data.searchHistory || []);
          }
        })
        .catch((e) => {
          if (isMounted) console.warn("SearchModal: fetchSearchHistory failed", e);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleDeleteHistoryItem = async (itemId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      const res = await api.delete(`/search/history/${itemId}`);
      if (res.data.success) {
        setSearchHistory((prev) => prev.filter((item) => item._id !== itemId));
        snackbar.success("Removed from history");
      }
    } catch {
      snackbar.error("Failed to remove item.");
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
        snackbar.success("History cleared");
      }
    } catch {
      snackbar.error("Failed to clear history.");
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      const clearTimer = setTimeout(() => {
        setUsers([]);
        setHashtags([]);
        setPlaces([]);
      }, 0);
      return () => clearTimeout(clearTimer);
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [backendRes, livePlaces] = await Promise.allSettled([
          api.get(`/search/query?q=${encodeURIComponent(query)}`),
          searchPlaces(query, { limit: 6 }),
        ]);

        if (backendRes.status === "fulfilled" && backendRes.value.data?.success) {
          setUsers(backendRes.value.data.users || []);
          setHashtags(backendRes.value.data.hashtags || []);

          const backendPlaces = backendRes.value.data.places || [];
          const geoPlaces = livePlaces.status === "fulfilled" ? livePlaces.value : [];

          const seen = new Set();
          const merged = [];

          backendPlaces.forEach((bp) => {
            seen.add(bp.name.toLowerCase());
            merged.push(bp);
          });

          geoPlaces.forEach((gp) => {
            if (!seen.has(gp.name.toLowerCase())) {
              seen.add(gp.name.toLowerCase());
              merged.push({
                name: gp.name,
                title: gp.title,
                subtitle: gp.subtitle,
                count: 0,
              });
            }
          });

          setPlaces(merged.slice(0, 8));
        }
      } catch {
        snackbar.error("Search query failed.");
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectUser = async (user) => {
    triggerHaptic("selection");
    try {
      await api.post("/search/history", { targetUserId: user._id });
    } catch (e) {
      console.warn("SearchModal: handleSelectUser failed", e);
    }
    onClose();
    navigate(`/profile/${user.userName}`);
  };

  const handleSelectTag = async (tagName) => {
    triggerHaptic("selection");
    try {
      await api.post("/search/history", { targetTag: tagName });
    } catch (e) {
      console.warn("SearchModal: handleSelectTag failed", e);
    }
    onClose();
    navigate(`/explore/tag/${tagName}`);
  };

  const handleSelectPlace = async (placeName) => {
    triggerHaptic("selection");
    try {
      await api.post("/search/history", { targetTag: placeName });
    } catch (e) {
      console.warn("SearchModal: handleSelectPlace failed", e);
    }
    onClose();
    navigate(`/explore/location/${encodeURIComponent(placeName)}`);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[600] flex items-start justify-center pt-12 md:pt-20 p-4 bg-surface-overlay backdrop-blur-md font-sans select-none">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="relative w-full max-w-xl bg-surface border border-border rounded-3xl p-5 sm:p-6 text-text shadow-2xl space-y-5"
        >
          {/* Top Search Input */}
          <div className="flex items-center gap-3 bg-surface-inset border border-border rounded-2xl px-4 py-2.5 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/10 transition shadow-inner">
            <Search className="w-4.5 h-4.5 text-text-muted shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search users, #hashtags, or places..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs sm:text-sm text-text placeholder:text-text-muted outline-none border-none ring-0 min-w-0 font-medium"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-1 text-text-muted hover:text-text rounded-full hover:bg-surface transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-2.5 py-1 text-xs font-semibold text-text-secondary hover:text-text border-l border-border transition cursor-pointer shrink-0"
            >
              Esc
            </button>
          </div>

          {/* Search Tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            {[
              { id: "top", label: "Top" },
              { id: "accounts", label: "Accounts" },
              { id: "tags", label: "Tags" },
              { id: "places", label: "Places 📍" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic("selection");
                  setActiveTab(tab.id);
                }}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                    : "text-text-secondary hover:text-text bg-surface-inset border border-border/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Results List */}
          <div className="max-h-96 overflow-y-auto space-y-3 pr-1 hide-scrollbar">
            {loading ? (
              <div className="text-center py-10 text-text-muted">
                <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span className="text-xs font-bold">Searching across Vybe...</span>
              </div>
            ) : !query.trim() ? (
              searchHistory.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                      Recent Searches
                    </p>
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
                            className="flex items-center justify-between p-3 rounded-2xl bg-surface-inset hover:bg-surface-hover border border-border transition"
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
                                  {item.targetUser.isVerified && <VerifiedBadge size="xs" />}
                                  {item.targetUser.accountType === "private" && (
                                    <Lock className="w-3 h-3 text-text-muted ml-0.5 shrink-0" />
                                  )}
                                </p>
                                <p className="text-[11px] text-text-secondary truncate">
                                  {item.targetUser.name}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => handleDeleteHistoryItem(item._id, e)}
                              className="p-1.5 rounded-full hover:bg-surface text-text-muted hover:text-text transition cursor-pointer"
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
                            className="flex items-center justify-between p-3 rounded-2xl bg-surface-inset hover:bg-surface-hover border border-border transition"
                          >
                            <div
                              onClick={() => {
                                onClose();
                                navigate(`/explore/tag/${item.targetTag}`);
                              }}
                              className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                            >
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow">
                                <Hash className="w-5 h-5" />
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold text-text">#{item.targetTag}</p>
                                <p className="text-[11px] text-text-secondary">Hashtag</p>
                              </div>
                            </div>
                            <button
                              onClick={(e) => handleDeleteHistoryItem(item._id, e)}
                              className="p-1.5 rounded-full hover:bg-surface text-text-muted hover:text-text transition cursor-pointer"
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
                  <p className="font-semibold text-text-secondary">Search for people, tags, or places</p>
                  <p>Type a search term above to explore VYBE creators and real locations.</p>
                </div>
              )
            ) : (
              <>
                {/* Users Section */}
                {(activeTab === "top" || activeTab === "accounts") && users.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                      Accounts
                    </p>
                    {users.map((u) => (
                      <div
                        key={u._id}
                        onClick={() => handleSelectUser(u)}
                        className="flex items-center justify-between p-3 rounded-2xl bg-surface-inset hover:bg-surface-hover border border-border cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={u.profileImage?.url || dp}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
                          />
                          <div className="truncate">
                            <p className="text-xs font-bold text-text flex items-center gap-0.5">
                              @{u.userName}
                              {u.isVerified && <VerifiedBadge size="xs" />}
                              {u.accountType === "private" && (
                                <Lock className="w-3 h-3 text-text-muted ml-0.5 shrink-0" />
                              )}
                            </p>
                            <p className="text-[11px] text-text-secondary truncate">{u.name}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-muted shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Hashtags Section */}
                {(activeTab === "top" || activeTab === "tags") && hashtags.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                      Hashtags
                    </p>
                    {hashtags.map((h, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectTag(h.name)}
                        className="flex items-center justify-between p-3 rounded-2xl bg-surface-inset hover:bg-surface-hover border border-border cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center text-white shadow">
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

                {/* Places Section */}
                {(activeTab === "top" || activeTab === "places") && places.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                      Places & Locations
                    </p>
                    {places.map((p, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectPlace(p.name)}
                        className="flex items-center justify-between p-3 rounded-2xl bg-surface-inset hover:bg-surface-hover border border-border cursor-pointer transition"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-500 flex items-center justify-center text-white shadow shrink-0">
                            <MapPin className="w-5 h-5 fill-white/20" />
                          </div>
                          <div className="truncate flex-1">
                            <p className="text-xs font-bold text-text truncate">
                              {p.title || p.name.split(",")[0]}
                            </p>
                            <p className="text-[11px] text-text-secondary truncate">
                              {p.subtitle || p.name.split(",").slice(1).join(", ").trim() || (p.count > 0 ? `${p.count} posts & reels` : "Explore on Map")}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-muted shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                )}

                {users.length === 0 && hashtags.length === 0 && places.length === 0 && (
                  <div className="text-center py-12 text-text-muted text-xs">
                    No results found for "{query}".
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
