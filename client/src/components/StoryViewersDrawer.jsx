import React, { useState } from "react";
import { FiEye, FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import {
  Sparkles,
  Trash2,
  BarChart3,
  Users,
  Search,
  MessageCircle,
  HelpCircle,
  Vote,
  Share2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import dp from "../assets/dp3.png";
import StoryAnalyticsTab from "./StoryAnalyticsTab";

export const StoryViewersDrawer = ({
  story,
  onClose,
  onOpenHighlight,
  onDeleteStory,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("viewers"); // 'viewers' | 'responses' | 'analytics'
  const [searchQuery, setSearchQuery] = useState("");

  const viewersList = story?.viewers || [];
  const reactionsList = story?.reactions || [];
  const likesList = story?.likes || [];
  const pollVotes = story?.pollVotes || [];
  const quizAnswers = story?.quizAnswers || [];
  const questionResponses = story?.questionResponses || [];
  const sliderResponses = story?.sliderResponses || [];

  const hasResponses =
    pollVotes.length > 0 ||
    quizAnswers.length > 0 ||
    questionResponses.length > 0 ||
    sliderResponses.length > 0;

  // Filter viewers by search query
  const filteredViewers = viewersList.filter((v) => {
    const name = (v.userName || v.name || "").toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  const getViewerReaction = (userId) => {
    const r = reactionsList.find(
      (item) => item.user?._id?.toString() === userId?.toString() || item.user?.toString() === userId?.toString()
    );
    return r ? r.emoji : null;
  };

  const isViewerLiked = (userId) => {
    return likesList.some(
      (id) => (id?._id?.toString() || id?.toString()) === userId?.toString()
    );
  };

  const handleShareQuestionResponse = (responseItem) => {
    onClose();
    navigate("/upload?type=story", {
      state: {
        sharedEntity: {
          entityType: "questionResponse",
          authorName: responseItem.user?.userName || "User",
          caption: responseItem.responseText,
        },
      },
    });
  };

  return (
    <div
      className="fixed inset-0 z-[500] bg-black/75 backdrop-blur-sm flex items-end justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-[75vh] bg-zinc-950 border-t border-zinc-800 rounded-t-[32px] p-5 text-white flex flex-col space-y-4 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Handle Bar */}
        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto -mt-1 cursor-pointer" onClick={onClose} />

        {/* Header HUD */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setActiveTab("viewers")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeTab === "viewers"
                  ? "bg-[#0095f6] text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Viewers ({viewersList.length})</span>
            </button>

            {hasResponses && (
              <button
                onClick={() => setActiveTab("responses")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  activeTab === "responses"
                    ? "bg-[#0095f6] text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Responses</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-[#0095f6] text-white shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Insights</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenHighlight}
              className="flex items-center gap-1 text-xs text-amber-400 font-bold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer"
              title="Add to Highlight"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Highlight</span>
            </button>

            <button
              onClick={onDeleteStory}
              className="p-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
              title="Delete Story"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 hide-scrollbar">
          {activeTab === "viewers" && (
            <div className="space-y-3">
              {/* Search Viewers */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search viewers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 pl-10 pr-4 py-2 rounded-xl text-xs text-white outline-none focus:border-[#0095f6] transition placeholder:text-zinc-500"
                />
              </div>

              {filteredViewers.length === 0 ? (
                <div className="text-center text-xs text-zinc-500 py-12">
                  {viewersList.length === 0 ? "No viewers yet. Check back soon!" : "No matching viewers found."}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredViewers.map((v) => {
                    const reaction = getViewerReaction(v._id || v);
                    const isLiked = isViewerLiked(v._id || v);

                    return (
                      <div
                        key={v._id || v}
                        onClick={() => navigate(`/profile/${v.userName}`)}
                        className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/60 border border-white/5 hover:bg-zinc-900 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={v.profileImage?.url || dp}
                            className="w-10 h-10 rounded-full object-cover border border-white/10 bg-zinc-800"
                            alt=""
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white hover:underline">
                              {v.userName || "User"}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {v.name || ""}
                            </span>
                          </div>
                        </div>

                        {/* Reaction / Like Badges */}
                        <div className="flex items-center gap-2">
                          {reaction && (
                            <span className="text-xl" title={`Reacted ${reaction}`}>
                              {reaction}
                            </span>
                          )}
                          {isLiked && (
                            <FaHeart className="w-4 h-4 text-[#ff3040]" title="Liked your story" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "responses" && (
            <div className="space-y-4">
              {/* Poll Votes Section */}
              {pollVotes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    <Vote className="w-4 h-4 text-rose-500" />
                    <span>Poll Votes ({pollVotes.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {pollVotes.map((pv, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-white/5 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={pv.user?.profileImage?.url || dp}
                            className="w-7 h-7 rounded-full object-cover"
                            alt=""
                          />
                          <span className="font-bold text-white">{pv.user?.userName || "User"}</span>
                        </div>
                        <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md text-[11px]">
                          Option {pv.optionIndex + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quiz Answers Section */}
              {quizAnswers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    <Vote className="w-4 h-4 text-emerald-400" />
                    <span>Quiz Answers ({quizAnswers.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {quizAnswers.map((qa, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-white/5 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={qa.user?.profileImage?.url || dp}
                            className="w-7 h-7 rounded-full object-cover"
                            alt=""
                          />
                          <span className="font-bold text-white">{qa.user?.userName || "User"}</span>
                        </div>
                        <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                          qa.isCorrect ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10"
                        }`}>
                          {qa.isCorrect ? "✓ Correct" : "✕ Wrong"} (Option {String.fromCharCode(65 + (qa.optionIndex || 0))})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Slider Responses Section */}
              {sliderResponses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span>Slider Responses ({sliderResponses.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {sliderResponses.map((sr, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-zinc-900/60 rounded-xl border border-white/5 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={sr.user?.profileImage?.url || dp}
                            className="w-7 h-7 rounded-full object-cover"
                            alt=""
                          />
                          <span className="font-bold text-white">{sr.user?.userName || "User"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-orange-400 text-xs">{sr.value || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Question Responses Section */}
              {questionResponses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    <HelpCircle className="w-4 h-4 text-purple-400" />
                    <span>Question Responses ({questionResponses.length})</span>
                  </div>
                  <div className="space-y-2">
                    {questionResponses.map((qr, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-zinc-900 border border-white/10 rounded-2xl space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img
                              src={qr.user?.profileImage?.url || dp}
                              className="w-6 h-6 rounded-full object-cover"
                              alt=""
                            />
                            <span className="text-xs font-bold text-zinc-300">
                              @{qr.user?.userName || "Anonymous"}
                            </span>
                          </div>
                          <button
                            onClick={() => handleShareQuestionResponse(qr)}
                            className="flex items-center gap-1 text-[11px] font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 transition cursor-pointer"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>Share to Story</span>
                          </button>
                        </div>
                        <p className="text-xs font-medium text-white bg-zinc-950 p-2.5 rounded-xl border border-white/5">
                          "{qr.responseText}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <StoryAnalyticsTab story={story} />
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryViewersDrawer;
