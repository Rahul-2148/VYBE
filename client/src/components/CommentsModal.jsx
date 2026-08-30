import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Trash2,
  Edit3,
  MessageCircle,
  Pin,
  ChevronDown,
  ChevronUp,
  Loader2,
  CornerDownRight,
  Search,
  Heart,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { GoHeart, GoHeartFill } from "react-icons/go";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import api from "../lib/axios";
import dp from "../assets/dp3.png";
import VerifiedBadge from "./VerifiedBadge";
import FollowButton from "./FollowButton";
import { snackbar } from "../lib/snackbar";
import { setPostData } from "../redux/features/postSlice";
import { setReelData } from "../redux/features/reelSlice";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";

const QUICK_EMOJIS = ["❤️", "🙌", "🔥", "👏", "😍", "😂", "😮", "✨"];

export const CommentsModal = ({
  isOpen,
  onClose,
  post,
  reel,
  isExpanded: externalExpanded,
  onExpandChange,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { postData } = useSelector((state) => state.post);
  const { reelData } = useSelector((state) => state.reel);

  const [internalExpanded, setInternalExpanded] = useState(Boolean(externalExpanded));
  const isExpanded = externalExpanded !== undefined ? Boolean(externalExpanded) : internalExpanded;
  const setIsExpanded = (val) => {
    setInternalExpanded(val);
    onExpandChange?.(val);
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const [activeTab, setActiveTab] = useState("comments"); // "comments" | "likes"
  const [likers, setLikers] = useState([]);
  const [loadingLikers, setLoadingLikers] = useState(false);
  const [likerSearch, setLikerSearch] = useState("");

  const [message, setMessage] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState(null); // { commentId, userName }
  const [expandedReplies, setExpandedReplies] = useState({}); // { [commentId]: boolean }
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingMessage, setEditingMessage] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);
  const currentUserId = (userData?.user?._id || userData?._id)?.toString();

  const isPost = Boolean(post);
  const activeEntity = isPost
    ? postData?.find((p) => (p?._id || p)?.toString() === (post?._id || post)?.toString()) || post
    : reelData?.find((r) => (r?._id || r)?.toString() === (reel?._id || reel)?.toString()) || reel;

  const entityId = activeEntity?._id;
  const isAuthor = (activeEntity?.author?._id || activeEntity?.author)?.toString() === currentUserId;

  const entityComments = activeEntity?.comments || (isPost ? post?.comments : reel?.comments) || [];
  const [prevEntityId, setPrevEntityId] = useState(entityId);
  // Local comments state with 0ms instant optimistic updates
  const [localComments, setLocalComments] = useState(entityComments);

  // Sync comments state when entity changes
  if (entityId !== prevEntityId) {
    setPrevEntityId(entityId);
    setLocalComments(entityComments);
  }

  // Fetch fresh populated comments directly from server when modal opens
  useEffect(() => {
    if (isOpen && entityId) {
      let isMounted = true;
      const endpoint = isPost ? `/post/${entityId}` : `/reel/${entityId}`;
      api
        .get(endpoint)
        .then((res) => {
          if (isMounted) {
            const serverEntity = res.data?.post || res.data?.reel;
            if (serverEntity?.comments && Array.isArray(serverEntity.comments)) {
              setLocalComments(serverEntity.comments);
              if (isPost && postData) {
                const updated = postData.map((p) => (p._id === entityId ? serverEntity : p));
                dispatch(setPostData(updated));
              } else if (!isPost && reelData) {
                const updated = reelData.map((r) => (r._id === entityId ? serverEntity : r));
                dispatch(setReelData(updated));
              }
            }
          }
        })
        .catch(() => {});

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, entityId, isPost, dispatch, postData, reelData]);

  const [expandedComments, setExpandedComments] = useState({});

  const followingList = useMemo(() => {
    return userData?.user?.following || userData?.following || [];
  }, [userData?.user?.following, userData?.following]);
  const followingIds = useMemo(() => {
    return new Set(followingList.map((f) => (f?._id || f)?.toString()));
  }, [followingList]);

  // Compute total comments count (top-level + all nested replies)
  const totalCommentsCount = useMemo(() => {
    let count = 0;
    const list = Array.isArray(localComments) ? localComments : (activeEntity?.comments || []);
    list.forEach((c) => {
      count += 1;
      if (c.replies && Array.isArray(c.replies)) {
        count += c.replies.length;
      }
    });
    return count;
  }, [localComments, activeEntity?.comments]);

  // Smart Prioritized Comments Sorting (Pinned -> Creator -> Followed Friends -> Most Liked -> Chronological)
  const sortedComments = useMemo(() => {
    const authorUserId = (activeEntity?.author?._id || activeEntity?.author)?.toString();
    const list = Array.isArray(localComments) ? localComments : [];
    return [...list].sort((a, b) => {
      // 1. Pinned comments first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      // 2. Creator (Author) comment
      const aIsAuthor = (a.author?._id || a.author)?.toString() === authorUserId;
      const bIsAuthor = (b.author?._id || b.author)?.toString() === authorUserId;
      if (aIsAuthor && !bIsAuthor) return -1;
      if (!aIsAuthor && bIsAuthor) return 1;

      // 3. Comments by people current user follows (Close friends / following connections)
      const aIsFollowed = followingIds.has((a.author?._id || a.author)?.toString());
      const bIsFollowed = followingIds.has((b.author?._id || b.author)?.toString());
      if (aIsFollowed && !bIsFollowed) return -1;
      if (!aIsFollowed && bIsFollowed) return 1;

      // 4. Most liked comments or verified
      const aLikes = a.likes?.length || 0;
      const bLikes = b.likes?.length || 0;
      if (aLikes !== bLikes && (aLikes > 2 || bLikes > 2)) return bLikes - aLikes;

      // 5. Chronological
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });
  }, [localComments, activeEntity?.author, followingIds]);

  // Fetch Likers when modal opens or switching to "likes" tab
  useEffect(() => {
    if (isOpen && entityId) {
      let isMounted = true;
      const endpoint = isPost ? `/post/likers/${entityId}` : `/reel/likers/${entityId}`;
      api
        .get(endpoint)
        .then((res) => {
          if (isMounted) {
            const fetched = res.data?.likers || res.data?.likes || [];
            setLikers(fetched);
          }
        })
        .catch(() => {
          if (isMounted && activeTab === "likes") setLikers([]);
        })
        .finally(() => {
          if (isMounted) setLoadingLikers(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, activeTab, entityId, isPost]);

  // Smart Prioritized Likers (Followed friends first at the top!)
  const filteredLikers = useMemo(() => {
    const list = likers.filter((liker) => {
      const u = liker?.user || liker;
      if (!likerSearch.trim()) return true;
      const q = likerSearch.toLowerCase();
      return (
        u?.userName?.toLowerCase().includes(q) ||
        u?.name?.toLowerCase().includes(q)
      );
    });

    return list.sort((aItem, bItem) => {
      const a = aItem?.user || aItem;
      const b = bItem?.user || bItem;
      const aFollow = followingIds.has((a?._id || a)?.toString()) ? 1 : 0;
      const bFollow = followingIds.has((b?._id || b)?.toString()) ? 1 : 0;
      if (aFollow !== bFollow) return bFollow - aFollow;
      if (a?.isVerified !== b?.isVerified) return (b?.isVerified ? 1 : 0) - (a?.isVerified ? 1 : 0);
      return (a?.userName || "").localeCompare(b?.userName || "");
    });
  }, [likers, likerSearch, followingIds]);

  const toggleExpandComment = (commentId) => {
    setExpandedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const toggleExpandReplies = (commentId) => {
    triggerHaptic("light");
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleStartReply = (commentId, userName) => {
    triggerHaptic("light");
    setReplyingToComment({ commentId, userName });
    setMessage(`@${userName} `);
    inputRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyingToComment(null);
    setMessage("");
  };

  // 1. Add Comment or Reply
  const handleAddComment = async (e) => {
    if (e) e.preventDefault();
    if (!message.trim()) return;

    if (!currentUserId) {
      snackbar.error("Please login to comment");
      return;
    }

    try {
      setCommentLoading(true);
      triggerHaptic("light");
      microAudio.playBubble();

      let result;
      if (replyingToComment) {
        // Nested Reply
        const endpoint = isPost
          ? `/post/comment/reply/${entityId}/${replyingToComment.commentId}`
          : `/reel/comment/reply/${entityId}/${replyingToComment.commentId}`;

        result = await api.post(endpoint, {
          message: message.trim(),
          replyingTo: replyingToComment.userName,
        });

        // Automatically expand the reply thread
        setExpandedReplies((prev) => ({
          ...prev,
          [replyingToComment.commentId]: true,
        }));
      } else {
        // Top-Level Comment
        const endpoint = isPost
          ? `/post/comment/${entityId}`
          : `/reel/comment/${entityId}`;

        result = await api.post(endpoint, {
          message: message.trim(),
        });
      }

      if (isPost && result.data?.post) {
        setLocalComments(result.data.post.comments || []);
        if (postData) {
          const updated = postData.map((p) => (p._id === entityId ? result.data.post : p));
          dispatch(setPostData(updated));
        }
      } else if (!isPost && result.data?.reel) {
        setLocalComments(result.data.reel.comments || []);
        if (reelData) {
          const updated = reelData.map((r) => (r._id === entityId ? result.data.reel : r));
          dispatch(setReelData(updated));
        }
      }

      setMessage("");
      setReplyingToComment(null);
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      snackbar.error(error.response?.data?.message || "Failed to post comment");
    } finally {
      setCommentLoading(false);
    }
  };

  // 2. Like / Unlike Top-Level Comment (0ms instant punchy response)
  const handleLikeComment = async (commentId, currentLikes = []) => {
    if (!currentUserId) {
      snackbar.error("Please login to like comments");
      return;
    }

    const hasLiked = currentLikes.some((id) => (id?._id || id)?.toString() === currentUserId);

    if (!hasLiked) {
      triggerHaptic("like");
      microAudio.playLikeBurst();
    } else {
      triggerHaptic("light");
      microAudio.playPop();
    }

    // 0ms Optimistic UI update
    setLocalComments((prev) =>
      prev.map((c) => {
        if (c._id === commentId) {
          const updatedLikes = hasLiked
            ? (c.likes || []).filter((id) => (id?._id || id)?.toString() !== currentUserId)
            : [...(c.likes || []), currentUserId];
          return { ...c, likes: updatedLikes };
        }
        return c;
      })
    );

    try {
      const endpoint = isPost
        ? `/post/comment/like/${entityId}/${commentId}`
        : `/reel/comment/like/${entityId}/${commentId}`;

      const res = await api.post(endpoint);
      if (isPost && res.data?.post?.comments) {
        setLocalComments(res.data.post.comments);
        if (postData) {
          const updated = postData.map((p) => (p._id === entityId ? res.data.post : p));
          dispatch(setPostData(updated));
        }
      } else if (!isPost && res.data?.reel?.comments) {
        setLocalComments(res.data.reel.comments);
        if (reelData) {
          const updated = reelData.map((r) => (r._id === entityId ? res.data.reel : r));
          dispatch(setReelData(updated));
        }
      }
    } catch {
      // Revert on error
      setLocalComments((prev) =>
        prev.map((c) => (c._id === commentId ? { ...c, likes: currentLikes } : c))
      );
      snackbar.error("Failed to like comment");
    }
  };

  // 3. Like / Unlike Nested Reply (0ms instant punchy response)
  const handleLikeReply = async (commentId, replyId) => {
    if (!currentUserId) {
      snackbar.error("Please login to like replies");
      return;
    }

    // Determine if reply is currently liked
    const parentComment = localComments.find((c) => c._id === commentId);
    const targetReply = parentComment?.replies?.find((r) => r._id === replyId);
    const replyLikes = targetReply?.likes || [];
    const hasLiked = replyLikes.some((id) => (id?._id || id)?.toString() === currentUserId);

    if (!hasLiked) {
      triggerHaptic("like");
      microAudio.playLikeBurst();
    } else {
      triggerHaptic("light");
      microAudio.playPop();
    }

    // 0ms Optimistic update on reply
    setLocalComments((prev) =>
      prev.map((c) => {
        if (c._id === commentId) {
          const updatedReplies = (c.replies || []).map((r) => {
            if (r._id === replyId) {
              const nextLikes = hasLiked
                ? replyLikes.filter((id) => (id?._id || id)?.toString() !== currentUserId)
                : [...replyLikes, currentUserId];
              return { ...r, likes: nextLikes };
            }
            return r;
          });
          return { ...c, replies: updatedReplies };
        }
        return c;
      })
    );

    try {
      const endpoint = isPost
        ? `/post/comment/reply-like/${entityId}/${commentId}/${replyId}`
        : `/reel/comment/reply-like/${entityId}/${commentId}/${replyId}`;

      const res = await api.post(endpoint);
      if (isPost && res.data?.post?.comments) {
        setLocalComments(res.data.post.comments);
        if (postData) {
          const updated = postData.map((p) => (p._id === entityId ? res.data.post : p));
          dispatch(setPostData(updated));
        }
      } else if (!isPost && res.data?.reel?.comments) {
        setLocalComments(res.data.reel.comments);
        if (reelData) {
          const updated = reelData.map((r) => (r._id === entityId ? res.data.reel : r));
          dispatch(setReelData(updated));
        }
      }
    } catch {
      snackbar.error("Failed to like reply");
    }
  };

  // 4. Pin / Unpin Comment (Author Only)
  const handlePinComment = async (commentId) => {
    triggerHaptic("medium");
    // Optimistic single-pin toggle
    setLocalComments((prev) =>
      prev.map((c) => ({
        ...c,
        isPinned: c._id === commentId ? !c.isPinned : false,
      }))
    );

    try {
      const endpoint = isPost
        ? `/post/comment/pin/${entityId}/${commentId}`
        : `/reel/comment/pin/${entityId}/${commentId}`;

      const res = await api.post(endpoint);
      if (isPost && res.data?.post?.comments) {
        setLocalComments(res.data.post.comments);
        if (postData) {
          const updated = postData.map((p) => (p._id === entityId ? res.data.post : p));
          dispatch(setPostData(updated));
        }
      } else if (!isPost && res.data?.reel?.comments) {
        setLocalComments(res.data.reel.comments);
        if (reelData) {
          const updated = reelData.map((r) => (r._id === entityId ? res.data.reel : r));
          dispatch(setReelData(updated));
        }
      }
      snackbar.success(res.data?.isPinned ? "Comment pinned" : "Comment unpinned");
    } catch {
      snackbar.error("Failed to pin comment");
    }
  };

  // 5. Delete Top-Level Comment
  const handleDeleteComment = async (commentId) => {
    triggerHaptic("medium");
    setLocalComments((prev) => prev.filter((c) => c._id !== commentId));
    try {
      const endpoint = isPost
        ? `/post/comment/${entityId}/${commentId}`
        : `/reel/comment/${entityId}/${commentId}`;

      await api.delete(endpoint);
      if (isPost && postData) {
        const updated = postData.map((p) =>
          p._id === entityId
            ? { ...p, comments: (p.comments || []).filter((c) => c._id !== commentId) }
            : p
        );
        dispatch(setPostData(updated));
      }
      snackbar.success("Comment deleted");
    } catch {
      snackbar.error("Failed to delete comment");
    }
  };

  // 6. Delete Nested Reply
  const handleDeleteReply = async (commentId, replyId) => {
    triggerHaptic("medium");
    setLocalComments((prev) =>
      prev.map((c) =>
        c._id === commentId
          ? { ...c, replies: (c.replies || []).filter((r) => r._id !== replyId) }
          : c
      )
    );
    try {
      const endpoint = isPost
        ? `/post/comment/reply/${entityId}/${commentId}/${replyId}`
        : `/reel/comment/reply/${entityId}/${commentId}/${replyId}`;

      const res = await api.delete(endpoint);
      if (isPost && res.data?.post?.comments) {
        setLocalComments(res.data.post.comments);
        if (postData) {
          const updated = postData.map((p) => (p._id === entityId ? res.data.post : p));
          dispatch(setPostData(updated));
        }
      }
      snackbar.success("Reply deleted");
    } catch {
      snackbar.error("Failed to delete reply");
    }
  };

  // 7. Edit Comment
  const handleEditComment = async (commentId) => {
    if (!editingMessage.trim()) return;
    try {
      setEditLoading(true);
      const endpoint = isPost
        ? `/post/comment/${entityId}/${commentId}`
        : `/reel/comment/${entityId}/${commentId}`;

      const res = await api.put(endpoint, { message: editingMessage.trim() });
      if (isPost && res.data?.post?.comments) {
        setLocalComments(res.data.post.comments);
        if (postData) {
          const updated = postData.map((p) => (p._id === entityId ? res.data.post : p));
          dispatch(setPostData(updated));
        }
      }
      setEditingCommentId(null);
      setEditingMessage("");
      snackbar.success("Comment updated");
    } catch {
      snackbar.error("Failed to update comment");
    } finally {
      setEditLoading(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="comments-modal-backdrop"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className={`fixed inset-0 z-[1200] flex items-end justify-center transition-colors duration-300 ${
            isExpanded
              ? "bg-black/80 backdrop-blur-md"
              : reel
              ? "bg-black/20 md:bg-black/40"
              : "bg-black/60 backdrop-blur-sm"
          }`}
        >
          <motion.div
            key="comments-modal-sheet"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.12, bottom: 0.35 }}
            onDragEnd={(e, info) => {
              // Drag up to expand to full screen
              if (info.offset.y < -35 || info.velocity.y < -200) {
                if (!isExpanded) {
                  setIsExpanded(true);
                  onExpandChange?.(true);
                  triggerHaptic("medium");
                }
              }
              // Drag down to collapse or close
              else if (info.offset.y > 45 || info.velocity.y > 220) {
                if (isExpanded) {
                  setIsExpanded(false);
                  onExpandChange?.(false);
                  triggerHaptic("light");
                } else {
                  triggerHaptic("light");
                  onClose();
                }
              }
            }}
            className={`relative w-full max-w-lg md:max-w-xl bg-surface/98 backdrop-blur-2xl border-t border-x border-border rounded-t-[28px] shadow-[0_-12px_45px_rgba(0,0,0,0.5)] dark:shadow-[0_-12px_45px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col transition-all duration-300 ease-out text-text ${
              isExpanded
                ? "h-[94dvh] md:h-[90dvh]"
                : "h-[58dvh] md:h-[56dvh] max-h-[580px]"
            }`}
          >
            {/* Instagram Top Drag Notch / Swipe Handle */}
            <div
              className="w-12 h-1.5 rounded-full bg-border-strong hover:bg-border-focus mx-auto mt-2.5 mb-1 shrink-0 opacity-70 cursor-pointer transition-all hover:scale-110 active:scale-95"
              onClick={() => {
                const next = !isExpanded;
                setIsExpanded(next);
                onExpandChange?.(next);
                triggerHaptic("light");
              }}
              title={isExpanded ? "Collapse to half screen" : "Expand to full screen"}
            />
            {/* Header with Comments & Likes Tabs (Instagram & Facebook style) */}
            <div className="flex items-center justify-between px-5 pt-3.5 pb-2 border-b border-border bg-surface-hover/20 shrink-0">
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveTab("comments");
                  }}
                  className={`text-xs font-bold transition-all relative flex items-center gap-1.5 cursor-pointer pb-2 ${
                    activeTab === "comments"
                      ? "text-text border-b-2 border-rose-500"
                      : "text-text-secondary hover:text-text"
                  }`}
                >
                  <MessageCircle className="w-4 h-4 text-rose-500" />
                  <span>Comments ({totalCommentsCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setActiveTab("likes");
                  }}
                  className={`text-xs font-bold transition-all relative flex items-center gap-1.5 cursor-pointer pb-2 ${
                    activeTab === "likes"
                      ? "text-text border-b-2 border-rose-500"
                      : "text-text-secondary hover:text-text"
                  }`}
                >
                  <GoHeartFill className="w-4 h-4 text-rose-500" />
                  <span>
                    Likes ({
                      likers.length > 0
                        ? likers.length
                        : (isPost
                            ? (activeEntity?.likes?.length ?? post?.likes?.length ?? 0)
                            : (activeEntity?.likes?.length ?? reel?.likes?.length ?? 0))
                    })
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isExpanded;
                    setIsExpanded(next);
                    onExpandChange?.(next);
                    triggerHaptic("light");
                  }}
                  className="p-1.5 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
                  title={isExpanded ? "Collapse sheet" : "Expand to full screen"}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onClose();
                  }}
                  className="p-1.5 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

          {/* Modal Body: Comments Tab vs Likes Tab */}
          {activeTab === "likes" ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
              {/* Likers Search */}
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={likerSearch}
                  onChange={(e) => setLikerSearch(e.target.value)}
                  placeholder="Search users who liked..."
                  className="w-full bg-surface-hover border border-border rounded-full pl-9 pr-4 py-1.5 text-xs text-text placeholder:text-text-muted outline-none focus:border-rose-500 transition"
                />
              </div>

              {loadingLikers ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <p className="text-xs">Loading likes...</p>
                </div>
              ) : filteredLikers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400 text-center gap-2">
                  <Heart className="w-10 h-10 opacity-30 text-rose-400" />
                  <p className="text-sm font-semibold text-zinc-300">
                    {likerSearch.trim() ? "No users found matching search" : "No likes yet"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {likerSearch.trim() ? "Try searching for a different username" : "Be the first to give this a like!"}
                  </p>
                </div>
              ) : (
                filteredLikers.map((userItem, idx) => {
                  const u = userItem?.user || userItem;
                  const isMe = (u?._id || u)?.toString() === currentUserId;
                  return (
                    <div
                      key={(u?._id || u)?.toString() || `liker_${idx}`}
                      className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0 hover:bg-surface-hover px-2 rounded-xl transition"
                    >
                      <div
                        onClick={() => {
                          onClose();
                          navigate(`/profile/${u?.userName}`);
                        }}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-border shrink-0">
                          <img
                            src={u?.profileImage?.url || dp}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-bold text-text hover:underline truncate">
                              {u?.name || u?.userName}
                            </span>
                            {u?.isVerified && <VerifiedBadge size="xs" />}
                            {followingIds.has((u?._id || u)?.toString()) && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-500 font-semibold border border-rose-500/30 shrink-0">
                                Following
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-text-secondary truncate">@{u?.userName}</span>
                        </div>
                      </div>

                      {!isMe && (u?._id || u) && (
                        <FollowButton targetUserId={u._id || u} />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-border-subtle hide-scrollbar">
              {/* Comments List */}
              {sortedComments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-text-secondary text-center gap-2.5">
                  <div className="w-14 h-14 rounded-full bg-surface-hover flex items-center justify-center border border-border">
                    <MessageCircle className="w-7 h-7 text-rose-500" />
                  </div>
                  <p className="text-sm font-bold text-text">No comments yet</p>
                  <p className="text-xs text-text-muted">Start the conversation.</p>
                </div>
              ) : (
                sortedComments.map((comment, commentIdx) => {
                  const commentAuthorId = (comment.author?._id || comment.author)?.toString();
                  const isCommentOwner = commentAuthorId === currentUserId;
                  const isEditing = editingCommentId === comment._id;
                  const commentLikes = comment.likes || [];
                  const isCommentLiked = Boolean(
                    currentUserId &&
                    commentLikes.some((id) => (id?._id || id)?.toString() === currentUserId)
                  );
                  const replies = comment.replies || [];
                  const hasReplies = replies.length > 0;
                  const isExpanded = Boolean(expandedReplies[comment._id]);

                  return (
                    <div key={(comment._id || comment.clientCommentId)?.toString() || `comment_${commentIdx}`} className="pt-3.5 first:pt-0 space-y-2 group">
                      {/* Top-Level Comment Row */}
                      <div
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (!isCommentLiked) {
                            handleLikeComment(comment._id, commentLikes);
                          }
                        }}
                        className="flex items-start gap-3 select-none"
                      >
                        {/* Avatar */}
                        <div
                          onClick={() => {
                            onClose();
                            navigate(`/profile/${comment.author?.userName}`);
                          }}
                          className="w-8 h-8 rounded-full overflow-hidden border border-border shrink-0 cursor-pointer hover:border-rose-500 transition"
                        >
                          <img
                            src={comment.author?.profileImage?.url || dp}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Content & Action Bar */}
                        <div className="flex-1 flex flex-col min-w-0">
                          {/* YouTube-style Pinned Banner */}
                          {comment.isPinned && (
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-500 font-semibold mb-1">
                              <Pin className="w-3.5 h-3.5 fill-amber-500 shrink-0" />
                              <span>Pinned by @{activeEntity?.author?.userName || "author"}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              onClick={() => {
                                onClose();
                                navigate(`/profile/${comment.author?.userName}`);
                              }}
                              className="text-xs font-bold text-text hover:underline cursor-pointer flex items-center gap-1"
                            >
                              @{comment.author?.userName || "user"}
                              {comment.author?.isVerified && <VerifiedBadge size="xs" />}
                            </span>
                            <span className="text-[10px] text-text-muted font-medium">
                              {moment(comment.createdAt).fromNow()}
                            </span>
                          </div>

                          {/* Comment Text or Edit Form */}
                          {isEditing ? (
                            <div className="mt-2 space-y-2">
                              <input
                                type="text"
                                value={editingMessage}
                                onChange={(e) => setEditingMessage(e.target.value)}
                                className="w-full bg-surface-hover border border-rose-500/50 rounded-xl px-3 py-1.5 text-xs text-text outline-none"
                                autoFocus
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={editLoading}
                                  onClick={() => handleEditComment(comment._id)}
                                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  {editLoading ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCommentId(null)}
                                  className="px-3 py-1 bg-surface-hover hover:bg-surface-active text-text-secondary rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-text mt-1 leading-relaxed whitespace-pre-wrap break-words">
                              {(() => {
                                const msg = comment.message || "";
                                const isLong = msg.length > 120;
                                const isExpanded = expandedComments[comment._id];
                                if (!isLong || isExpanded) {
                                  return (
                                    <>
                                      <span>{msg}</span>
                                      {isLong && (
                                        <button
                                          type="button"
                                          onClick={() => toggleExpandComment(comment._id)}
                                          className="text-text-secondary font-semibold hover:text-text ml-1.5 cursor-pointer text-[11px]"
                                        >
                                          less
                                        </button>
                                      )}
                                    </>
                                  );
                                }
                                return (
                                  <>
                                    <span>{msg.slice(0, 115)}</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandComment(comment._id)}
                                      className="text-text-secondary font-bold hover:text-text ml-1 cursor-pointer text-[11px]"
                                    >
                                      ...more
                                    </button>
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          {/* Actions Row: Reply Button • Likes Count • Pin Option • Owner Options */}
                          <div className="flex items-center gap-3.5 mt-1.5 text-[11px] text-text-secondary font-semibold select-none">
                            <button
                              type="button"
                              onClick={() => handleStartReply(comment._id, comment.author?.userName)}
                              className="hover:text-rose-500 transition cursor-pointer"
                            >
                              Reply
                            </button>

                            {commentLikes.length > 0 && (
                              <span className="text-[10px] text-text-muted font-medium">
                                {commentLikes.length} {commentLikes.length === 1 ? "like" : "likes"}
                              </span>
                            )}

                            {/* YouTube-style Pin / Unpin Button for Post/Reel Creator */}
                            {isAuthor && (
                              <button
                                type="button"
                                onClick={() => handlePinComment(comment._id)}
                                className={`flex items-center gap-1 transition cursor-pointer ${
                                  comment.isPinned
                                    ? "text-amber-500 font-bold hover:text-amber-400"
                                    : "text-text-secondary hover:text-amber-500 opacity-70 group-hover:opacity-100"
                                }`}
                                title={comment.isPinned ? "Unpin comment" : "Pin comment to top"}
                              >
                                <Pin className={`w-3 h-3 ${comment.isPinned ? "fill-amber-500" : ""}`} />
                                <span>{comment.isPinned ? "Unpin" : "Pin"}</span>
                              </button>
                            )}

                            {isCommentOwner && !isEditing && (
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(comment._id);
                                    setEditingMessage(comment.message);
                                  }}
                                  className="hover:text-text transition cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(comment._id)}
                                  className="hover:text-rose-500 transition cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Heart (Like) Button for Comment */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLikeComment(comment._id, commentLikes);
                          }}
                          className="p-1.5 text-text-secondary hover:text-rose-500 transition cursor-pointer shrink-0 mt-1 active:scale-75"
                          title={isCommentLiked ? "Unlike comment" : "Like comment"}
                        >
                          {isCommentLiked ? (
                            <GoHeartFill className="w-4 h-4 text-rose-500 scale-110 animate-heart-burst drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                          ) : (
                            <GoHeart className="w-4 h-4 hover:scale-110 transition-transform animate-heart-deflate" />
                          )}
                        </button>
                      </div>

                      {/* Nested Replies Accordion ("View X replies ▾") */}
                      {hasReplies && (
                        <div className="pl-11 pt-1">
                          <button
                            type="button"
                            onClick={() => toggleExpandReplies(comment._id)}
                            className="flex items-center gap-2 text-xs text-rose-500 hover:text-rose-400 font-semibold cursor-pointer select-none transition"
                          >
                            <span className="w-6 h-px bg-rose-500/50" />
                            <span>
                              {isExpanded
                                ? `Hide replies`
                                : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Expanded Replies List */}
                          {isExpanded && (
                            <div className="space-y-3 pt-2.5 border-l-2 border-border pl-3 ml-2 mt-1">
                              {replies.map((reply, rIdx) => {
                                const replyAuthorId = (reply.author?._id || reply.author)?.toString();
                                const isReplyOwner = replyAuthorId === currentUserId;
                                const replyLikes = reply.likes || [];
                                const isReplyLiked = Boolean(
                                  currentUserId &&
                                  replyLikes.some((id) => (id?._id || id)?.toString() === currentUserId)
                                );

                                return (
                                  <div
                                    key={(reply._id || reply.clientReplyId)?.toString() || `reply_${rIdx}`}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      if (!isReplyLiked) {
                                        handleLikeReply(comment._id, reply._id);
                                      }
                                    }}
                                    className="flex items-start gap-2.5 group/reply select-none"
                                  >
                                    {/* Reply Avatar */}
                                    <div
                                      onClick={() => {
                                        onClose();
                                        navigate(`/profile/${reply.author?.userName}`);
                                      }}
                                      className="w-6 h-6 rounded-full overflow-hidden border border-border shrink-0 cursor-pointer hover:border-rose-500 transition"
                                    >
                                      <img
                                        src={reply.author?.profileImage?.url || dp}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    </div>

                                    {/* Reply Content */}
                                    <div className="flex-1 flex flex-col min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span
                                          onClick={() => {
                                            onClose();
                                            navigate(`/profile/${reply.author?.userName}`);
                                          }}
                                          className="text-xs font-bold text-text hover:underline cursor-pointer flex items-center gap-0.5"
                                        >
                                          @{reply.author?.userName || "user"}
                                          {reply.author?.isVerified && <VerifiedBadge size="xs" />}
                                        </span>
                                        <span className="text-[10px] text-text-muted font-medium">
                                          {moment(reply.createdAt || Date.now()).fromNow()}
                                        </span>
                                      </div>

                                      <div className="text-xs text-text mt-0.5 leading-relaxed break-words">
                                        {reply.replyingTo && (
                                          <span className="text-rose-500 font-semibold mr-1">
                                            @{reply.replyingTo}
                                          </span>
                                        )}
                                        {(() => {
                                          const prefix = reply.replyingTo ? `@${reply.replyingTo}` : "";
                                          const rawMsg = prefix && reply.message?.startsWith(prefix)
                                            ? reply.message.slice(prefix.length).trimStart()
                                            : reply.message || "";
                                          const isLong = rawMsg.length > 100;
                                          const isExpanded = expandedComments[reply._id];
                                          if (!isLong || isExpanded) {
                                            return (
                                              <>
                                                <span>{rawMsg}</span>
                                                {isLong && (
                                                  <button
                                                    type="button"
                                                    onClick={() => toggleExpandComment(reply._id)}
                                                    className="text-text-secondary font-semibold hover:text-text ml-1.5 cursor-pointer text-[11px]"
                                                  >
                                                    less
                                                  </button>
                                                )}
                                              </>
                                            );
                                          }
                                          return (
                                            <>
                                              <span>{rawMsg.slice(0, 95)}</span>
                                              <button
                                                type="button"
                                                onClick={() => toggleExpandComment(reply._id)}
                                                className="text-text-secondary font-bold hover:text-text ml-1 cursor-pointer text-[11px]"
                                              >
                                                ...more
                                              </button>
                                            </>
                                          );
                                        })()}
                                      </div>

                                      {/* Reply Action Bar */}
                                      <div className="flex items-center gap-3 mt-1 text-[10px] text-text-secondary font-semibold select-none">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleStartReply(comment._id, reply.author?.userName)
                                          }
                                          className="hover:text-rose-500 transition cursor-pointer"
                                        >
                                          Reply
                                        </button>

                                        {replyLikes.length > 0 && (
                                          <span className="text-text-muted font-medium">
                                            {replyLikes.length} {replyLikes.length === 1 ? "like" : "likes"}
                                          </span>
                                        )}

                                        {isReplyOwner && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteReply(comment._id, reply._id)}
                                            className="hover:text-rose-500 opacity-0 group-hover/reply:opacity-100 transition cursor-pointer"
                                            title="Delete reply"
                                          >
                                            <Trash2 className="w-2.5 h-2.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Reply Heart Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleLikeReply(comment._id, reply._id);
                                      }}
                                      className="p-1 text-text-secondary hover:text-rose-500 transition cursor-pointer shrink-0 mt-0.5 active:scale-75"
                                      title={isReplyLiked ? "Unlike reply" : "Like reply"}
                                    >
                                      {isReplyLiked ? (
                                        <GoHeartFill className="w-3.5 h-3.5 text-rose-500 scale-110 animate-heart-burst drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
                                      ) : (
                                        <GoHeart className="w-3.5 h-3.5 animate-heart-deflate" />
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={commentsEndRef} />
            </div>
          )}

          {/* Bottom Composer & Quick Emojis (Comments Tab Only) */}
          {activeTab === "comments" && (
            activeEntity?.commentsDisabled ? (
              <div className="p-3.5 border-t border-border bg-surface-hover shrink-0 text-center">
                <p className="text-xs font-semibold text-text-secondary flex items-center justify-center gap-1.5">
                  <span>🔒 Commenting has been turned off for this {isPost ? "post" : "reel"}.</span>
                </p>
              </div>
            ) : (
              <div className="p-3 border-t border-border bg-surface shrink-0 space-y-2">
                {/* Replying Status Pill (if in reply mode) */}
                {replyingToComment && (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-semibold text-rose-500 animate-in fade-in slide-in-from-bottom-1 duration-150">
                    <span className="flex items-center gap-1">
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>Replying to @{replyingToComment.userName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelReply}
                      className="p-0.5 hover:bg-rose-500/20 rounded-full transition cursor-pointer text-rose-500"
                      title="Cancel reply"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Quick Emojis Row */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        setMessage((prev) => prev + emoji);
                        inputRef.current?.focus();
                      }}
                      className="px-2 py-1 rounded-full bg-surface-hover hover:bg-surface-active text-sm transition cursor-pointer hover:scale-110 active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Comment Form Input */}
                <form onSubmit={handleAddComment} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-border shrink-0">
                    <img
                      src={userData?.user?.profileImage?.url || userData?.profileImage?.url || dp}
                      alt="You"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <input
                    ref={inputRef}
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      replyingToComment
                        ? `Reply to @${replyingToComment.userName}...`
                        : `Add a comment as @${userData?.user?.userName || userData?.userName || "you"}...`
                    }
                    className="flex-1 bg-surface-hover border border-border rounded-full px-4 py-2 text-xs text-text placeholder:text-text-muted outline-none focus:border-rose-500 transition"
                  />

                  <button
                    type="submit"
                    disabled={!message.trim() || commentLoading}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/30"
                  >
                    {commentLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Post</span>
                        <Send className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )
          )}
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CommentsModal;
