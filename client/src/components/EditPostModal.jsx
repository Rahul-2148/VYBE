import React, { useState, useEffect } from "react";
import { X, MapPin, Type, MessageSquare, Eye, EyeOff, Sparkles, Save, Loader2, ImageIcon, Bot, Layers } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { snackbar } from "../lib/snackbar";
import { triggerHaptic } from "../lib/interactiveEffects";
import AIInfoModal from "./AIInfoModal";
import api from "../lib/axios";

const POPULAR_AI_TOOLS = [
  "Midjourney",
  "ChatGPT / DALL·E",
  "Runway Gen-3",
  "Sora",
  "Stable Diffusion",
  "Flux.1",
  "ElevenLabs",
  "Luma Dream",
];

const EditPostModal = ({ post, isOpen, onClose, onPostUpdated }) => {
  const [caption, setCaption] = useState(post?.caption || "");
  const [location, setLocation] = useState(post?.location || "");
  const [altText, setAltText] = useState(post?.altText || "");
  const [allowComments, setAllowComments] = useState(post?.allowComments !== false);
  const [likesHidden, setLikesHidden] = useState(post?.likesHidden || false);
  const [isAIGenerated, setIsAIGenerated] = useState(post?.aiLabel?.isAIGenerated || false);
  const [aiTool, setAiTool] = useState(post?.aiLabel?.tool || "");
  const [aiContentType, setAiContentType] = useState(post?.aiLabel?.contentType || "image");
  const [showAIInfoModal, setShowAIInfoModal] = useState(false);
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
      setAiContentType(post.aiLabel?.contentType || "image");
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
          contentType: isAIGenerated ? aiContentType : "image",
        },
      });

      if (res.data.success) {
        snackbar.success("Post updated!");
        onPostUpdated?.(res.data.post);
        onClose();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to update post.");
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
        className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
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
              className="p-1.5 text-text-secondary hover:text-text rounded-full hover:bg-surface transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-bold text-text">Edit Info</h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer"
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
                    className="text-text-muted hover:text-text transition cursor-pointer"
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
                className="w-full px-5 py-4 flex items-center justify-between text-sm text-text hover:bg-surface/50 transition cursor-pointer"
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
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-xs text-text outline-none focus:border-primary resize-none placeholder:text-text-muted transition"
                  />
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">
                Advanced Settings
              </h3>

              {/* Hide Like Count */}
              <div className="flex items-center justify-between py-2.5">
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
                  type="button"
                  onClick={() => setLikesHidden(!likesHidden)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${likesHidden ? "bg-rose-600" : "bg-surface-hover border border-border"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${likesHidden ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              {/* Turn Off Comments */}
              <div className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-text-secondary" />
                  <div>
                    <p className="text-sm text-text font-medium">Turn off commenting</p>
                    <p className="text-[10px] text-text-muted">People won't be able to comment on this post</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowComments(!allowComments)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${!allowComments ? "bg-rose-600" : "bg-surface-hover border border-border"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${!allowComments ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>
            </div>

            {/* AI Content Label Section */}
            <div className="px-5 py-4 space-y-3.5 bg-surface/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Sparkles className="w-4 h-4 fill-purple-400/20" />
                  </div>
                  <div>
                    <p className="text-sm text-text font-bold">Add "Made with AI" Label</p>
                    <p className="text-[10px] text-text-muted">Disclose that this post contains AI-generated media</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("selection");
                    setIsAIGenerated(!isAIGenerated);
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${isAIGenerated ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-surface-hover border border-border"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isAIGenerated ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              {/* AI Tool & Content Type Selector (shown when AI is enabled) */}
              {isAIGenerated && (
                <div className="pt-2 border-t border-border/60 space-y-3 animate-fade-in">
                  {/* Type */}
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
                      Media Type
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "image", label: "AI Image / Art" },
                        { id: "video", label: "AI Video" },
                        { id: "voice", label: "Voice Clone" },
                        { id: "avatar", label: "Avatar" },
                        { id: "full", label: "Fully Generated" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic("selection");
                            setAiContentType(t.id);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                            aiContentType === t.id
                              ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                              : "bg-surface border-border text-text-secondary hover:text-text hover:bg-surface-hover"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tool */}
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
                      AI Tool Used
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_AI_TOOLS.map((tool) => (
                        <button
                          key={tool}
                          type="button"
                          onClick={() => {
                            triggerHaptic("selection");
                            setAiTool(aiTool === tool ? "" : tool);
                          }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                            aiTool === tool
                              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-sm"
                              : "bg-surface border-border text-text-secondary hover:text-text hover:bg-surface-hover"
                          }`}
                        >
                          {tool}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="Or enter custom tool name..."
                      value={aiTool}
                      onChange={(e) => setAiTool(e.target.value)}
                      className="w-full bg-surface-inset border border-border text-text text-xs rounded-xl px-3.5 py-2 mt-2 focus:border-purple-500 outline-none"
                    />
                  </div>

                  {/* Policy Preview Trigger */}
                  <button
                    type="button"
                    onClick={() => setShowAIInfoModal(true)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer pt-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Preview "Made with AI" info sheet</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* AI Transparency Disclosure Modal Preview */}
      <AIInfoModal
        isOpen={showAIInfoModal}
        onClose={() => setShowAIInfoModal(false)}
        aiLabel={{
          isAIGenerated: true,
          tool: aiTool || "AI Tool",
          contentType: aiContentType,
        }}
        authorName="You"
      />
    </AnimatePresence>
  );
};

export default EditPostModal;
