import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, ArrowLeft, Heart, MessageCircle, Video, Image } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "../lib/axios";

export const LocationPage = () => {
  const { locationName } = useParams();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loops, setLoops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts"); // posts vs reels

  useEffect(() => {
    fetchLocationDetails();
  }, [locationName]);

  const fetchLocationDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/search/location/${encodeURIComponent(locationName)}`);
      if (res.data.success) {
        setPosts(res.data.posts || []);
        setLoops(res.data.loops || []);
      }
    } catch {
      toast.error("Failed to load location details.");
    } finally {
      setLoading(false);
    }
  };

  const displayItems = activeTab === "posts" ? posts : loops;

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Top Header Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Location Explore</h1>
      </div>

      {/* Location Hero Banner */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-surface border border-border shadow-2xl">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-500 flex items-center justify-center text-text shadow-2xl">
          <MapPin className="w-12 h-12" />
        </div>

        <div className="text-center sm:text-left space-y-2 flex-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate max-w-lg">
            {decodeURIComponent(locationName)}
          </h2>
          <p className="text-xs text-text-secondary">
            {posts.length} posts and {loops.length} reels tagged at this location.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center border-b border-border/80">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex-1 py-3 text-center border-b-2 text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "posts"
              ? "border-text text-text"
              : "border-transparent text-text-secondary hover:text-text"
          }`}
        >
          <Image className="w-4 h-4" />
          <span>Posts ({posts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("reels")}
          className={`flex-1 py-3 text-center border-b-2 text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "reels"
              ? "border-text text-text"
              : "border-transparent text-text-secondary hover:text-text"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Reels ({loops.length})</span>
        </button>
      </div>

      {/* Grid Display */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-20 text-text-muted">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading items...
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-16 text-text-muted text-sm">
            No {activeTab} found at this location.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {displayItems.map((item) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  if (activeTab === "reels") {
                    navigate(`/reels?reelId=${item._id}`);
                  } else {
                    navigate(`/?postId=${item._id}`);
                  }
                }}
                className="relative aspect-square rounded-2xl overflow-hidden bg-surface border border-border cursor-pointer group shadow-lg"
              >
                {item.mediaType === "video" || activeTab === "reels" ? (
                  <video src={item.media?.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={item.media?.url} alt="" className="w-full h-full object-cover" />
                )}

                <div className="absolute inset-0 bg-surface-overlay opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-6 font-bold text-sm text-white">
                  <div className="flex items-center gap-1">
                    <Heart className="w-5 h-5 fill-white" />
                    <span>{item.likes?.length || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-5 h-5 fill-white" />
                    <span>{item.comments?.length || 0}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationPage;
