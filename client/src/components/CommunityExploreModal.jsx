// client/src/components/CommunityExploreModal.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  Search,
  Users,
  Gamepad2,
  Cpu,
  Music,
  GraduationCap,
  Clapperboard,
  Sparkles,
  ArrowRight,
  X,
  Lock,
  Globe,
  Plus,
  Check,
} from "lucide-react";
import api from "../lib/axios";
import { snackbar } from "../lib/snackbar";

const CATEGORIES = [
  { id: "All", label: "All Communities", icon: Compass },
  { id: "Gaming", label: "Gaming", icon: Gamepad2 },
  { id: "Technology", label: "Technology", icon: Cpu },
  { id: "Music", label: "Music", icon: Music },
  { id: "Education", label: "Education", icon: GraduationCap },
  { id: "Entertainment", label: "Entertainment", icon: Clapperboard },
  { id: "Creator", label: "Creators", icon: Sparkles },
];

export const CommunityExploreModal = ({ isOpen, onClose, onJoinedCommunity }) => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState(null);

  const fetchPublicCommunities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/community/explore", {
        params: {
          category: selectedCategory,
          search: searchQuery,
          limit: 30,
        },
      });
      if (res.data?.success) {
        setCommunities(res.data.communities || []);
      }
    } catch (err) {
      console.warn("Failed to explore communities:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchPublicCommunities();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fetchPublicCommunities]);

  const handleJoin = async (community) => {
    setJoiningId(community._id);
    try {
      const res = await api.post(`/community/${community._id}/join-public`);
      if (res.data?.success) {
        snackbar.success(res.data.message || `Joined ${community.name}!`);
        onJoinedCommunity?.(res.data.community);
        onClose?.();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to join community");
    } finally {
      setJoiningId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-surface border border-border w-full max-w-4xl h-[650px] max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text hover:bg-surface-inset rounded-full transition z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HERO HEADER */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-r from-purple-900/60 via-indigo-900/40 to-rose-900/50 border-b border-border flex flex-col justify-end shrink-0">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white text-xs font-semibold mb-3">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>Public Discovery</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Find your community on Vybe
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300">
              From gaming clans and coding groups to music hubs and study lounges, there's a space for everyone.
            </p>
          </div>

          {/* Search bar */}
          <div className="mt-5 relative flex items-center max-w-lg">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Explore gaming, coding, music, memes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface/90 border border-border text-xs sm:text-sm text-text rounded-2xl pl-10 pr-4 py-2.5 outline-none focus:border-primary shadow-lg transition placeholder:text-text-muted"
            />
          </div>
        </div>

        {/* CATEGORY TABS */}
        <div className="px-6 py-3 border-b border-border/80 bg-surface-inset/60 flex items-center gap-2 overflow-x-auto hide-scrollbar shrink-0">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSel = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                  isSel
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
                    : "bg-surface hover:bg-surface-inset text-text-secondary hover:text-text border border-border/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* COMMUNITY CARDS GRID */}
        <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Finding vibrant communities...</span>
            </div>
          ) : communities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-text-muted">
              <Compass className="w-12 h-12 mb-3 text-text-muted/60" />
              <h4 className="text-sm font-bold text-text mb-1">No communities found</h4>
              <p className="text-xs max-w-sm">
                Try searching for something else or be the first to create a public server for this category!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {communities.map((comm) => (
                <div
                  key={comm._id}
                  className="group bg-surface hover:bg-surface-inset border border-border hover:border-primary/50 rounded-2xl overflow-hidden transition duration-200 flex flex-col shadow-sm hover:shadow-lg"
                >
                  {/* Banner */}
                  <div className="h-24 bg-gradient-to-r from-purple-800 to-rose-700 relative overflow-hidden">
                    {comm.banner?.url ? (
                      <img src={comm.banner.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full opacity-30 flex items-center justify-center font-black text-2xl tracking-widest text-white">
                        VYBE
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-400" />
                      <span>{comm.memberCount || comm.members?.length || 1} members</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Avatar + Name */}
                      <div className="flex items-center gap-3 -mt-8 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-surface border-2 border-surface overflow-hidden shadow-md shrink-0 flex items-center justify-center font-black text-base text-text">
                          {comm.icon?.url || comm.image?.url ? (
                            <img src={comm.icon?.url || comm.image?.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            comm.name?.[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 pt-4">
                          <h4 className="text-sm font-bold text-text truncate group-hover:text-primary transition">
                            {comm.name}
                          </h4>
                          <span className="text-[10px] text-text-muted font-medium block">
                            {comm.category || "General"}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-text-secondary line-clamp-2 mb-3">
                        {comm.description || "Welcome to our space! Join in on the conversations, voice rooms and fun."}
                      </p>

                      {/* Tags */}
                      {comm.tags && comm.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {comm.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-surface-inset text-text-muted text-[10px] font-medium border border-border/60"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Join button */}
                    <button
                      onClick={() => handleJoin(comm)}
                      disabled={joiningId === comm._id}
                      className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                    >
                      {joiningId === comm._id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Join Community</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CommunityExploreModal;
