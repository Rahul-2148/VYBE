import React, { useState } from "react";
import { FiEye } from "react-icons/fi";
import { Sparkles, Trash2, BarChart3, Users } from "lucide-react";
import dp from "../assets/dp3.png";
import StoryAnalyticsTab from "./StoryAnalyticsTab";

const StoryViewersDrawer = ({
  story,
  viewers = [],
  onClose,
  onOpenHighlight,
  onDeleteStory,
}) => {
  const [activeTab, setActiveTab] = useState("viewers"); // 'viewers' | 'analytics'

  return (
    <div className="absolute inset-x-0 bottom-0 h-[65%] bg-surface border-t border-border p-4 z-50 rounded-t-3xl text-text pointer-events-auto flex flex-col space-y-3 shadow-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 bg-surface-inset p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab("viewers")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition ${
              activeTab === "viewers" ? "bg-rose-600 text-text shadow" : "text-text-secondary hover:text-text"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Viewers ({viewers.length})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition ${
              activeTab === "analytics" ? "bg-rose-600 text-text shadow" : "text-text-secondary hover:text-text"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Insights
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHighlight}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Highlight
          </button>
          <button
            onClick={onDeleteStory}
            className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-400 font-semibold px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <button
            onClick={onClose}
            className="text-xs text-text-secondary hover:text-text font-semibold transition px-1 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-1">
        {activeTab === "viewers" ? (
          <div className="space-y-2">
            {viewers.length === 0 ? (
              <div className="text-center text-xs text-text-muted py-8">
                No viewers yet
              </div>
            ) : (
              viewers.map((v) => (
                <div
                  key={v._id || v}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-hover/60 transition border border-transparent hover:border-border"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={v.profileImage?.url || dp}
                      className="w-9 h-9 rounded-full object-cover border border-border"
                      alt=""
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-text">
                        {v.userName || "User"}
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        {v.name || ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <StoryAnalyticsTab story={story} />
        )}
      </div>
    </div>
  );
};

export default StoryViewersDrawer;
