import React, { useState, useEffect } from "react";
import { X, MapPin, Type, MessageSquare, Eye, EyeOff, Sparkles, Save, Loader2, ImageIcon, Bot } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import api from "../lib/axios";

const AI_TOOLS = [
  "DALL·E",
  "Midjourney",
  "Stable Diffusion",
  "Adobe Firefly",
  "ChatGPT",
  "Google Gemini",
  "Other AI Tool",
];

const EditPostModal = ({ post, isOpen, onClose, onPostUpdated }) => {
  const [caption, setCaption] = useState(post?.caption || "");
  const [location, setLocation] = useState(post?.location || "");
  const [altText, setAltText] = useState(post?.altText || "");
  const [allowComments, setAllowComments] = useState(post?.allowComments !== false);
  const [likesHidden, setLikesHidden] = useState(post?.likesHidden || false);
  const [isAIGenerated, setIsAIGenerated] = useState(post?.aiLabel?.isAIGenerated || false);
  const [aiTool, setAiTool] = useState(post?.aiLabel?.tool || "");
  const [saving, setSaving] = useState(false);
  const [showAltText, setShowAltText] = useState(false);

  useEffect(() => {
    if (post) {
      setCaption(post.caption || "");
      setLocation(post.location || "");
      setAltText(post.altText || "");
      setAllowComments(post.allowComments !== false);
      setLikesHidden(post.likesHidden || false);
      setIsAIGenerated(post.aiLabel?.isAIGenerated || false);
      setAiTool(post.aiLabel?.tool || "");
    }
  }, [post]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.patch(`/post/edit/${post._id}`, {
        caption,
        location,
        altText,
        allowComments,
        likesHidden,
        aiLabel: {
          isAIGenerated,
          tool: isAIGenerated ? aiTool : "",
        },
      });

      if (res.data.success) {
        toast.success("Post updated!");
        onPostUpdated?.(res.data.post);
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update post.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const thumbnailUrl =
    post?.mediaType === "carousel"
      ? post?.carouselMedia?.[0]?.url
      : post?.media?.url;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-bg border border-border rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-text rounded-full hover:bg-surface transition"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold text-text">Edit Info</h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-[#0095f6] hover:bg-[#1aa1f7] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Done
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto flex-1 hide-scrollbar">
            {/* Post Preview + Caption */}
            <div className="flex gap-3 p-5 border-b border-border">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface border border-border shrink-0">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
              </div>
              {/* Caption Input */}
              <div className="flex-1">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption..."
                  rows={4}
                  maxLength={2200}
                  className="w-full bg-transparent text-text text-sm resize-none outline-none placeholder:text-text-muted leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-text-muted">
                    {caption.length}/2,200
                  </span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-text-secondary shrink-0" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location"
                  className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-text-muted"
                />
                {location && (
                  <button
                    onClick={() => setLocation("")}
                    className="text-text-muted hover:text-text transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Alt Text (Expandable) */}
            <div className="border-b border-border">
              <button
                onClick={() => setShowAltText(!showAltText)}
                className="w-full px-5 py-4 flex items-center justify-between text-sm text-text hover:bg-surface/50 transition"
              >
                <div className="flex items-center gap-3">
                  <Type className="w-5 h-5 text-text-secondary" />
                  <span>Accessibility</span>
                </div>
                <span className="text-[10px] text-text-muted font-medium">
                  {altText ? "Alt text added" : "Write alt text"}
                </span>
              </button>
              {showAltText && (
                <div className="px-5 pb-4">
                  <p className="text-[11px] text-text-muted mb-2">
                    Alt text describes your photos for people with visual impairments.
                  </p>
                  <textarea
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Describe what's in your photo..."
                    rows={2}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-text outline-none focus:border-[#0095f6] resize-none placeholder:text-text-muted transition"
                  />
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <div className="px-5 py-3">
              <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">
                Advanced Settings
              </h3>

              {/* Hide Like Count */}
              <div className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  {likesHidden ? (
                    <EyeOff className="w-5 h-5 text-text-secondary" />
                  ) : (
                    <Eye className="w-5 h-5 text-text-secondary" />
                  )}
                  <div>
                    <p className="text-sm text-text font-medium">Hide like count</p>
                    <p className="text-[10px] text-text-muted">Only you will see the total number of likes</p>
                  </div>
                </div>
                <button
                  onClick={() => setLikesHidden(!likesHidden)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${likesHidden ? "bg-[#0095f6]" : "bg-zinc-600"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${likesHidden ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              {/* Turn Off Comments */}
              <div className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-text-secondary" />
                  <div>
                    <p className="text-sm text-text font-medium">Turn off commenting</p>
                    <p className="text-[10px] text-text-muted">People won't be able to comment on this post</p>
                  </div>
                </div>
                <button
                  onClick={() => setAllowComments(!allowComments)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${!allowComments ? "bg-[#0095f6]" : "bg-zinc-600"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${!allowComments ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>
            </div>

            {/* AI Content Label Section */}
            <div className="px-5 py-3 border-t border-border">
              <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                AI Content
              </h3>

              <div className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <Bot className="w-5 h-5 text-text-secondary" />
                  <div>
                    <p className="text-sm text-text font-medium">AI generated content</p>
                    <p className="text-[10px] text-text-muted">Label this post as made with AI</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAIGenerated(!isAIGenerated)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isAIGenerated ? "bg-[#0095f6]" : "bg-zinc-600"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isAIGenerated ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              {/* AI Tool Selector (shown when AI is enabled) */}
              {isAIGenerated && (
                <div className="pl-8 pb-3 space-y-2">
                  <p className="text-[10px] text-text-muted mb-2">
                    Which AI tool was used to create or edit this content?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {AI_TOOLS.map((tool) => (
                      <button
                        key={tool}
                        onClick={() => setAiTool(tool)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${
                          aiTool === tool
                            ? "bg-[#0095f6] border-[#0095f6] text-white"
                            : "bg-surface border-border text-text-secondary hover:border-text-muted hover:text-text"
                        }`}
                      >
                        {tool}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EditPostModal;
