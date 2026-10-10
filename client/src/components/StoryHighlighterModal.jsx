import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Check,
  Plus,
  ArrowLeft,
  Image as ImageIcon,
  Film,
  Type,
  Clock,
  Loader2,
} from "lucide-react";
import { useSelector } from "react-redux";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import dp from "../assets/dp3.png";
import moment from "moment";

export const StoryHighlighterModal = ({
  isOpen,
  onClose,
  onSuccess,
  story = null,
}) => {
  const { userData } = useSelector((state) => state.user);
  const currentUserName = userData?.user?.userName;

  // Mode:
  // If `story` prop is provided -> 'quick_add' (Select existing highlight or + New)
  // If `story` is null -> 'wizard' (Step 1: Select stories, Step 2: Name & Cover)
  const isQuickAddMode = Boolean(story?._id);

  // Quick Add State (when story prop is passed)
  const [existingHighlights, setExistingHighlights] = useState([]);
  const [loadingHighlights, setLoadingHighlights] = useState(false);
  const [showCreateNewInQuickAdd, setShowCreateNewInQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [addingToHighlightId, setAddingToHighlightId] = useState(null);

  // Full Wizard State (when creating from Profile)
  const [wizardStep, setWizardStep] = useState(1); // 1 = select stories, 2 = title & cover
  const [allStories, setAllStories] = useState([]);
  const [activeStories, setActiveStories] = useState([]);
  const [archivedStories, setArchivedStories] = useState([]);
  const [selectedStoryIds, setSelectedStoryIds] = useState(() =>
    story?._id ? [story._id] : []
  );
  const [coverStoryId, setCoverStoryId] = useState(() => story?._id || null);
  const [title, setTitle] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'active' | 'archive'
  const [loadingStories, setLoadingStories] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Existing Highlights for Quick Add
  useEffect(() => {
    if (!isOpen || !isQuickAddMode || !currentUserName) return;
    let isMounted = true;

    const fetchUserHighlights = async () => {
      setLoadingHighlights(true);
      try {
        const res = await api.get(`/story/highlight/user/${currentUserName}`);
        if (isMounted && res.data?.success) {
          setExistingHighlights(res.data.highlights || []);
        }
      } catch (err) {
        console.warn("Failed to fetch user highlights:", err);
      } finally {
        if (isMounted) setLoadingHighlights(false);
      }
    };

    fetchUserHighlights();
    return () => {
      isMounted = false;
    };
  }, [isOpen, isQuickAddMode, currentUserName]);

  // Fetch All User Stories (Active + Archived) for Full Wizard
  useEffect(() => {
    if (!isOpen || isQuickAddMode) return;
    let isMounted = true;

    const fetchAllStories = async () => {
      setLoadingStories(true);
      try {
        const res = await api.get("/story/my-stories/all");
        if (isMounted && res.data?.success) {
          const all = res.data.stories || [];
          const act = res.data.activeStories || [];
          const arc = res.data.archivedStories || [];

          setAllStories(all);
          setActiveStories(act);
          setArchivedStories(arc);

          // Default cover to the first story if selected
          if (all.length > 0 && !coverStoryId) {
            setCoverStoryId(all[0]._id);
          }
        }
      } catch (err) {
        console.warn("Failed to load user stories:", err);
        snackbar.error("Failed to load stories.");
      } finally {
        if (isMounted) setLoadingStories(false);
      }
    };

    fetchAllStories();
    return () => {
      isMounted = false;
    };
  }, [isOpen, isQuickAddMode]);

  if (!isOpen) return null;

  // Toggle selection in Wizard
  const toggleStorySelect = (sId) => {
    triggerHaptic("light");
    if (selectedStoryIds.includes(sId)) {
      const next = selectedStoryIds.filter((id) => id !== sId);
      setSelectedStoryIds(next);
      if (coverStoryId === sId && next.length > 0) {
        setCoverStoryId(next[0]);
      }
    } else {
      const next = [...selectedStoryIds, sId];
      setSelectedStoryIds(next);
      if (!coverStoryId) {
        setCoverStoryId(sId);
      }
    }
  };

  // Add active story to an existing highlight
  const handleAddToExistingHighlight = async (hl) => {
    if (!story?._id) return;
    const isAlreadyIn = (hl.stories || []).some(
      (s) => (s._id || s).toString() === story._id.toString()
    );

    if (isAlreadyIn) {
      snackbar.info(`Story is already in "${hl.title}"`);
      return;
    }

    setAddingToHighlightId(hl._id);
    triggerHaptic("medium");
    microAudio.playPop();

    try {
      const res = await api.post(`/story/highlight/${hl._id}/add-story`, {
        storyId: story._id,
      });

      if (res.data?.success) {
        snackbar.success(`Added to "${hl.title}"! ✨`);
        if (onSuccess) onSuccess(res.data.highlight);
        onClose();
      }
    } catch (err) {
      snackbar.error(
        err.response?.data?.message || "Failed to add story to highlight."
      );
    } finally {
      setAddingToHighlightId(null);
    }
  };

  // Quick create new highlight from active story
  const handleQuickCreateHighlight = async (e) => {
    if (e) e.preventDefault();
    if (!quickAddTitle.trim()) {
      snackbar.error("Please enter a title for your highlight.");
      return;
    }

    setSubmitting(true);
    triggerHaptic("medium");
    try {
      const res = await api.post("/story/highlight/create", {
        title: quickAddTitle.trim(),
        storyIds: [story._id],
      });

      if (res.data?.success) {
        snackbar.success(`Added to "${quickAddTitle.trim()}"! ✨`);
        if (onSuccess) onSuccess(res.data.highlight);
        onClose();
      }
    } catch (err) {
      snackbar.error(
        err.response?.data?.message || "Failed to create highlight."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Full Wizard Create Highlight
  const handleWizardCreateHighlight = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      snackbar.error("Please enter a title for your highlight.");
      return;
    }

    if (selectedStoryIds.length === 0) {
      snackbar.error("Please select at least one story.");
      return;
    }

    // Reorder so coverStoryId is first if specified
    let finalStoryIds = [...selectedStoryIds];
    if (coverStoryId && finalStoryIds.includes(coverStoryId)) {
      finalStoryIds = [
        coverStoryId,
        ...finalStoryIds.filter((id) => id !== coverStoryId),
      ];
    }

    setSubmitting(true);
    triggerHaptic("selection");
    try {
      const res = await api.post("/story/highlight/create", {
        title: title.trim(),
        storyIds: finalStoryIds,
      });

      if (res.data?.success) {
        snackbar.success("New Highlight added to your profile! ✨");
        if (onSuccess) onSuccess(res.data.highlight);
        onClose();
      }
    } catch (err) {
      snackbar.error(
        err.response?.data?.message || "Failed to create highlight."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Selected Cover Story Object
  const selectedCoverStory =
    allStories.find((s) => s._id === coverStoryId) ||
    allStories.find((s) => selectedStoryIds.includes(s._id)) ||
    story;

  // Current tab stories for wizard
  const storiesToDisplay =
    activeTab === "active"
      ? activeStories
      : activeTab === "archive"
      ? archivedStories
      : allStories;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-t-[32px] sm:rounded-[32px] text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* ========================================================= */}
          {/* A. QUICK ADD MODE (From Active Story Viewer)               */}
          {/* ========================================================= */}
          {isQuickAddMode ? (
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-500 flex items-center justify-center shadow">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold tracking-tight">
                      {showCreateNewInQuickAdd ? "New Highlight" : "Add to Highlight"}
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      {showCreateNewInQuickAdd
                        ? "Give your highlight a name"
                        : "Save this story permanently to your profile"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Story Mini Preview */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-zinc-900 border border-zinc-800/80">
                <div className="w-12 h-16 rounded-xl overflow-hidden bg-black shrink-0 relative border border-white/10">
                  {story?.mediaType === "image" ? (
                    <img
                      src={story.media?.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : story?.mediaType === "video" ? (
                    <video
                      src={story.media?.url}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-800 to-rose-700 flex items-center justify-center p-1 text-[8px] text-center font-bold">
                      {story?.caption?.slice(0, 15) || "Text"}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {story?.caption || "Active Story"}
                  </p>
                  <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Posted {moment(story?.createdAt).fromNow()}</span>
                  </p>
                </div>
              </div>

              {/* Inline New Highlight Creator */}
              {showCreateNewInQuickAdd ? (
                <form onSubmit={handleQuickCreateHighlight} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Highlight Name
                    </label>
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. Highlights, Travel, Memories..."
                      maxLength={30}
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-2xl outline-none text-white focus:border-rose-500 text-sm font-medium transition"
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateNewInQuickAdd(false)}
                      className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold rounded-2xl text-xs transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !quickAddTitle.trim()}
                      className="flex-1 py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        "Create & Save"
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* List of Existing Highlights + New Option */
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-0.5">
                    <span>Choose a Highlight</span>
                    <button
                      type="button"
                      onClick={() => setShowCreateNewInQuickAdd(true)}
                      className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New</span>
                    </button>
                  </div>

                  {loadingHighlights ? (
                    <div className="py-8 text-center text-zinc-500">
                      <Loader2 className="w-6 h-6 animate-spin text-rose-500 mx-auto mb-2" />
                      <p className="text-xs">Loading your highlights...</p>
                    </div>
                  ) : existingHighlights.length === 0 ? (
                    <div className="py-6 text-center text-zinc-400 space-y-3 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 p-4">
                      <Sparkles className="w-8 h-8 text-amber-400 mx-auto" />
                      <p className="text-xs font-semibold">No Highlights Created Yet</p>
                      <button
                        type="button"
                        onClick={() => setShowCreateNewInQuickAdd(true)}
                        className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl text-xs font-bold transition shadow-md hover:scale-105"
                      >
                        Create Your First Highlight
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-56 overflow-y-auto pr-1">
                      {/* "+ New" Circle */}
                      <button
                        type="button"
                        onClick={() => setShowCreateNewInQuickAdd(true)}
                        className="flex flex-col items-center gap-1.5 cursor-pointer group"
                      >
                        <div className="w-14 h-14 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-rose-500 flex items-center justify-center bg-zinc-900 transition">
                          <Plus className="w-5 h-5 text-zinc-400 group-hover:text-rose-400" />
                        </div>
                        <span className="text-[10px] font-semibold text-zinc-400 group-hover:text-white truncate w-full text-center">
                          New
                        </span>
                      </button>

                      {/* Existing Highlights */}
                      {existingHighlights.map((hl) => {
                        const isAlreadyIn = (hl.stories || []).some(
                          (s) => (s._id || s).toString() === story._id.toString()
                        );
                        const isPending = addingToHighlightId === hl._id;

                        return (
                          <button
                            key={hl._id}
                            type="button"
                            onClick={() => handleAddToExistingHighlight(hl)}
                            disabled={isPending}
                            className="flex flex-col items-center gap-1.5 cursor-pointer group relative"
                            title={hl.title}
                          >
                            <div className="relative w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 shadow-md group-hover:scale-105 transition">
                              <img
                                src={hl.coverImage?.url || dp}
                                alt=""
                                className="w-full h-full rounded-full object-cover border-2 border-black bg-zinc-800"
                              />

                              {isAlreadyIn && (
                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                                </div>
                              )}

                              {isPending && (
                                <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                </div>
                              )}
                            </div>

                            <span className="text-[10px] font-semibold text-zinc-300 group-hover:text-white truncate w-full text-center">
                              {hl.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ========================================================= */
            /* B. FULL HIGHLIGHT CREATOR WIZARD (From Profile)          */
            /* ========================================================= */
            <div className="flex flex-col h-full">
              {/* Wizard Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
                {wizardStep === 2 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                <h3 className="text-sm font-extrabold tracking-tight">
                  {wizardStep === 1 ? "Select Stories" : "New Highlight"}
                </h3>

                {wizardStep === 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedStoryIds.length === 0) {
                        snackbar.error("Please select at least one story");
                        return;
                      }
                      setWizardStep(2);
                    }}
                    disabled={selectedStoryIds.length === 0}
                    className="text-xs font-bold text-rose-500 hover:text-rose-400 disabled:opacity-40 transition cursor-pointer"
                  >
                    Next ({selectedStoryIds.length})
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleWizardCreateHighlight}
                    disabled={submitting || !title.trim()}
                    className="text-xs font-bold text-rose-500 hover:text-rose-400 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                    ) : (
                      "Done"
                    )}
                  </button>
                )}
              </div>

              {/* STEP 1: Select Stories (Active & Archive) */}
              {wizardStep === 1 && (
                <div className="flex flex-col flex-1 min-h-0">
                  {/* Category Filter Tabs */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-850 bg-zinc-900/50 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab("all")}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                        activeTab === "all"
                          ? "bg-white text-black shadow"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      All ({allStories.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("active")}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                        activeTab === "active"
                          ? "bg-white text-black shadow"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Active ({activeStories.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("archive")}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                        activeTab === "archive"
                          ? "bg-white text-black shadow"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Archive ({archivedStories.length})
                    </button>
                  </div>

                  {/* Stories Grid */}
                  <div className="flex-1 overflow-y-auto p-3 min-h-[300px] max-h-[60vh]">
                    {loadingStories ? (
                      <div className="py-16 text-center text-zinc-500">
                        <Loader2 className="w-8 h-8 animate-spin text-rose-500 mx-auto mb-2" />
                        <p className="text-xs font-medium">Loading your stories...</p>
                      </div>
                    ) : storiesToDisplay.length === 0 ? (
                      <div className="py-16 text-center text-zinc-500 space-y-2">
                        <ImageIcon className="w-10 h-10 mx-auto text-zinc-600" />
                        <p className="text-xs font-semibold">
                          {activeTab === "active"
                            ? "No active stories right now"
                            : activeTab === "archive"
                            ? "No archived stories yet"
                            : "No stories found to highlight"}
                        </p>
                        <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                          Stories you post will automatically appear here to curate into highlights.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                        {storiesToDisplay.map((s) => {
                          const isSelected = selectedStoryIds.includes(s._id);
                          const selectionIndex = selectedStoryIds.indexOf(s._id) + 1;

                          return (
                            <div
                              key={s._id}
                              onClick={() => toggleStorySelect(s._id)}
                              className={`relative aspect-[9/16] rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-150 select-none ${
                                isSelected
                                  ? "border-rose-500 ring-2 ring-rose-500/30 scale-[0.98]"
                                  : "border-transparent opacity-85 hover:opacity-100"
                              }`}
                            >
                              {/* Media Render */}
                              {s.mediaType === "image" ? (
                                <img
                                  src={s.media?.url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : s.mediaType === "video" ? (
                                <video
                                  src={s.media?.url}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-900 via-rose-900 to-amber-900 p-2 flex items-center justify-center text-center">
                                  <p className="text-[10px] font-bold text-white line-clamp-3">
                                    {s.caption || "Text Story"}
                                  </p>
                                </div>
                              )}

                              {/* Media Type Icon & Date Tag */}
                              <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-semibold text-zinc-300">
                                {moment(s.createdAt).format("MMM D")}
                              </div>

                              {/* Selection Number Check Badge */}
                              <div
                                className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-lg transition-all ${
                                  isSelected
                                    ? "bg-rose-600 text-white border-2 border-white scale-105"
                                    : "border-2 border-white/80 bg-black/30 text-transparent"
                                }`}
                              >
                                {isSelected ? selectionIndex : ""}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: Title & Cover Preview */}
              {wizardStep === 2 && (
                <div className="p-6 space-y-6 flex-1 flex flex-col items-center justify-center">
                  {/* Round Cover Preview */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 shadow-xl shadow-rose-500/20">
                      <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 border-2 border-black flex items-center justify-center">
                        {selectedCoverStory?.mediaType === "image" ? (
                          <img
                            src={selectedCoverStory.media?.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : selectedCoverStory?.mediaType === "video" ? (
                          <video
                            src={selectedCoverStory.media?.url}
                            className="w-full h-full object-cover"
                          />
                        ) : selectedCoverStory?.mediaType === "text" ? (
                          <div className="w-full h-full bg-gradient-to-br from-purple-800 to-rose-700 flex items-center justify-center p-2 text-[10px] text-center font-bold">
                            {selectedCoverStory?.caption?.slice(0, 10)}
                          </div>
                        ) : (
                          <ImageIcon className="w-8 h-8 text-zinc-600" />
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] font-bold text-rose-400">
                      Cover Preview ({selectedStoryIds.length} stories selected)
                    </p>
                  </div>

                  {/* Title Input */}
                  <div className="w-full space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">
                      Highlight Name
                    </label>
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. Highlights, Travel, 2026..."
                      maxLength={30}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-2xl outline-none text-white focus:border-rose-500 text-sm font-semibold text-center transition shadow-inner"
                      required
                    />
                  </div>

                  {/* Pick Cover from Selected Stories */}
                  {selectedStoryIds.length > 1 && (
                    <div className="w-full space-y-2">
                      <p className="text-[11px] font-semibold text-zinc-400 text-center">
                        Tap any story to set as Cover:
                      </p>
                      <div className="flex gap-2 justify-center overflow-x-auto py-1">
                        {selectedStoryIds.map((sid) => {
                          const sObj = allStories.find((s) => s._id === sid);
                          const isCover = coverStoryId === sid;

                          return (
                            <div
                              key={sid}
                              onClick={() => {
                                setCoverStoryId(sid);
                                triggerHaptic("light");
                              }}
                              className={`w-12 h-16 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition ${
                                isCover
                                  ? "border-rose-500 scale-105 ring-2 ring-rose-500/40"
                                  : "border-transparent opacity-60 hover:opacity-100"
                              }`}
                            >
                              {sObj?.mediaType === "image" ? (
                                <img
                                  src={sObj.media?.url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : sObj?.mediaType === "video" ? (
                                <video
                                  src={sObj.media?.url}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-800 to-rose-700 text-[8px] flex items-center justify-center p-0.5 font-bold text-center">
                                  {sObj?.caption?.slice(0, 8)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <button
                    type="button"
                    onClick={handleWizardCreateHighlight}
                    disabled={submitting || !title.trim()}
                    className="w-full py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:opacity-95 text-white font-bold rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      "Add Highlight to Profile ✨"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StoryHighlighterModal;
