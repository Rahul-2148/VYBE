import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Music, Play, ArrowLeft, Disc, Video } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/axios";

export const AudioTrackPage = () => {
  const { audioId } = useParams();
  const navigate = useNavigate();

  const [loops, setLoops] = useState([]);
  const [audioName, setAudioName] = useState("Original Audio");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAudioReels = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/loop/audio/${audioId}`);
        if (res.data.success) {
          setLoops(res.data.loops);
          if (res.data.audioTrackName) setAudioName(res.data.audioTrackName);
        }
      } catch (err) {
        toast.error("Failed to load audio track details.");
      } finally {
        setLoading(false);
      }
    };

    fetchAudioReels();
  }, [audioId]);

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Top Header Bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover transition"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Audio Track</h1>
      </div>

      {/* Audio Track Hero Banner */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-surface border border-border shadow-2xl">
        {/* Spinning Vinyl Disc Showcase */}
        <div className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 p-1 flex items-center justify-center shadow-2xl">
          <div className="w-full h-full rounded-full bg-surface-inset flex items-center justify-center animate-spin-slow">
            <Disc className="w-12 h-12 text-rose-500" />
          </div>
        </div>

        <div className="text-center sm:text-left space-y-2 flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <Music className="w-5 h-5 text-rose-500" />
            <h2 className="text-2xl font-bold tracking-tight">{audioName}</h2>
          </div>

          <p className="text-xs text-text-secondary">
            {loops.length} {loops.length === 1 ? "reels" : "reels"} created with this audio track.
          </p>

          <button
            onClick={() => navigate("/upload")}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-95 text-text font-semibold rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-2 mx-auto sm:mx-0 mt-2"
          >
            <Video className="w-4 h-4" />
            <span>Use Audio</span>
          </button>
        </div>
      </div>

      {/* Grid of Reels using this Audio */}
      <div>
        <h3 className="text-lg font-bold mb-4">Reels using this audio</h3>

        {loading ? (
          <div className="text-center py-16 text-text-muted">
            <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading reels...
          </div>
        ) : loops.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-12">No reels found for this audio track.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {loops.map((loop) => (
              <motion.div
                key={loop._id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => navigate("/loops", { state: { initialLoopId: loop._id } })}
                className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-surface border border-border cursor-pointer group shadow-lg"
              >
                <video src={loop.media?.url} className="w-full h-full object-cover" />

                <div className="absolute inset-0 bg-bg/40 group-hover:bg-surface-overlay transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Play className="w-10 h-10 text-text fill-white shadow" />
                </div>

                <div className="absolute bottom-2 left-2 right-2 text-[10px] text-text font-semibold flex items-center gap-1">
                  <span>@{loop.author?.userName}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioTrackPage;
