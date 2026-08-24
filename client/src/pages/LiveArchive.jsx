import React from "react";
import { ArrowLeft, Archive, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LiveArchiveTab from "../components/LiveArchiveTab";

export const LiveArchive = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-bg/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-text hover:text-text-secondary rounded-full hover:bg-surface-hover transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="ml-3 flex items-center gap-2">
            <Radio className="w-5 h-5 text-rose-500" />
            <h1 className="text-base font-bold tracking-tight">Live Archive</h1>
          </div>
        </div>

        {/* Archive Navigation Switcher */}
        <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => navigate("/story/archive")}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-text border border-border bg-surface hover:bg-surface-hover transition cursor-pointer shrink-0"
          >
            Stories Archive
          </button>
          <button
            onClick={() => navigate("/post/archive")}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-text-secondary hover:text-text border border-border bg-surface hover:bg-surface-hover transition cursor-pointer shrink-0"
          >
            Posts & Reels Archive
          </button>
          <button
            onClick={() => navigate("/live/archive")}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-md cursor-pointer shrink-0"
          >
            Live Archive
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <LiveArchiveTab />
      </div>
    </div>
  );
};

export default LiveArchive;
