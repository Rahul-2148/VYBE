import React from "react";
import { Eye, Heart, BarChart3, TrendingUp, Users, MessageSquare } from "lucide-react";

export const StoryAnalyticsTab = ({ story }) => {
  const views = story?.viewers?.length || 0;
  const likes = story?.likes?.length || 0;
  const reactions = story?.reactions?.length || 0;
  const pollVotes = story?.pollVotes?.length || 0;

  const estimatedReach = Math.round(views * 1.25);
  const completionRate = views > 0 ? Math.min(100, Math.round((views / (views + 2)) * 100)) : 0;

  return (
    <div className="space-y-4 p-4 text-text">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-surface border border-border rounded-2xl flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-text-secondary text-xs font-semibold">
            <Eye className="w-4 h-4 text-purple-400" />
            <span>Total Views</span>
          </div>
          <span className="text-xl font-black text-text">{views}</span>
        </div>

        <div className="p-3 bg-surface border border-border rounded-2xl flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-text-secondary text-xs font-semibold">
            <Heart className="w-4 h-4 text-rose-500" />
            <span>Story Likes</span>
          </div>
          <span className="text-xl font-black text-text">{likes}</span>
        </div>

        <div className="p-3 bg-surface border border-border rounded-2xl flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-text-secondary text-xs font-semibold">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Est. Reach</span>
          </div>
          <span className="text-xl font-black text-text">{estimatedReach}</span>
        </div>

        <div className="p-3 bg-surface border border-border rounded-2xl flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-text-secondary text-xs font-semibold">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>Completion</span>
          </div>
          <span className="text-xl font-black text-text">{completionRate}%</span>
        </div>
      </div>

      {/* Engagement Breakdown */}
      <div className="p-4 bg-surface border border-border rounded-2xl space-y-2">
        <h4 className="text-xs font-bold text-text uppercase tracking-wider">Engagement Breakdown</h4>
        <div className="flex items-center justify-between text-xs py-1 border-b border-border">
          <span className="text-text-secondary">Emoji Reactions</span>
          <span className="font-bold text-text">{reactions}</span>
        </div>
        <div className="flex items-center justify-between text-xs py-1">
          <span className="text-text-secondary">Poll Responses</span>
          <span className="font-bold text-text">{pollVotes}</span>
        </div>
      </div>
    </div>
  );
};

export default StoryAnalyticsTab;
