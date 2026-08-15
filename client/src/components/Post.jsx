import { Check, Archive, FolderPlus, Tag, VolumeX, Volume2, BadgeCheck, Sparkles, Info, Bot, X, Music } from "lucide-react";
import moment from "moment";
import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { GoBookmark, GoBookmarkFill, GoHeart, GoHeartFill } from "react-icons/go";
import { IoSendSharp } from "react-icons/io5";
import { MdDeleteOutline, MdEdit, MdOutlineComment } from "react-icons/md";
import { RxCross2 } from "react-icons/rx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { SERVER_URL } from "../App";
import dp from "../assets/dp3.png";
import { deleteCommentFromPost, editCommentInPost, setPostData } from "../redux/features/postSlice";
import { setUserData } from "../redux/features/userSlice";
import FollowButton from "./FollowButton";
import VideoPlayer from "./VideoPlayer";
import PostCarousel from "./PostCarousel";
import TaggedUsersOverlay from "./TaggedUsersOverlay";
import CollectionsModal from "./CollectionsModal";
import AITranslateButton from "./AITranslateButton";
import ShareSheet from "./ShareSheet";
import EditPostModal from "./EditPostModal";
import api from "../lib/axios";

// Render interactive caption with clickable @mentions and #hashtags
const RenderParsedCaption = ({ caption, onNavigate }) => {
  if (!caption) return null;
  const parts = caption.split(/(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+)/g);

  return (
    <span className="text-xs text-text leading-relaxed font-normal">
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const userName = part.slice(1);
          return (
            <span
              key={i}
              onClick={() => onNavigate(`/profile/${userName}`)}
              className="text-rose-400 font-semibold cursor-pointer hover:underline mr-1"
            >
              {part}
            </span>
          );
        }
        if (part.startsWith("#")) {
          const tag = part.slice(1);
          return (
            <span
              key={i}
              onClick={() => onNavigate(`/explore/tag/${tag}`)}
              className="text-rose-400 font-semibold cursor-pointer hover:underline mr-1"
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </span>
  );
};

const Post = ({ post }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { postData } = useSelector((state) => state.post);

  const [showComments, setShowComments] = useState(false);
  const [message, setMessage] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [deletePostLoading, setDeletePostLoading] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingMessage, setEditingMessage] = useState("");
  const [editLoadingId, setEditLoadingId] = useState(null);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [showTags, setShowTags] = useState(false);

  // Background Looping Music State
  const [musicMuted, setMusicMuted] = useState(true);
  const audioRef = useRef(null);

  const getMusicObject = (musicField) => {
    if (!musicField) return null;
    if (typeof musicField === "object") return musicField;
    try {
      return JSON.parse(musicField);
    } catch {
      return null;
    }
  };

  const parsedMusic = useMemo(() => getMusicObject(post?.music), [post?.music]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (parsedMusic?.audioUrl) {
      const a = new Audio(parsedMusic.audioUrl);
      a.loop = true;
      audioRef.current = a;

      if (!musicMuted) {
        a.play().catch(() => null);
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [parsedMusic?.audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      if (musicMuted) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => null);
      }
    }
  }, [musicMuted]);


  // Collections & Share Modal states
  const [showCollectionsModal, setShowCollectionsModal] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAIInfoModal, setShowAIInfoModal] = useState(false);

  const handlePostUpdated = (updatedPost) => {
    if (!updatedPost) return;
    const updatedPosts = postData?.map((p) => (p._id === updatedPost._id ? updatedPost : p));
    dispatch(setPostData(updatedPosts));
  };

  const handleLike = async () => {
    try {
      const isLiked = post?.likes?.includes(userData?.user?._id);
      const result = await api.post(`/post/like/${post?._id}`, { action: isLiked ? "unlike" : "like" });
      const updatedPost = result.data.post;
      const updatedPosts = postData?.map((p) => (p._id === post._id ? updatedPost : p));
      dispatch(setPostData(updatedPosts));
    } catch (error) {
      toast.error(error.response?.data?.message || "Like failed");
    }
  };

  const handleComment = async () => {
    if (!message.trim()) return;
    try {
      setCommentLoading(true);
      const result = await api.post(`/post/comment/${post?._id}`, { message });
      const updatedPost = result.data.post;
      const updatedPosts = postData.map((p) => (p._id === post._id ? updatedPost : p));

      dispatch(setPostData(updatedPosts));
      setMessage("");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleSaved = async () => {
    try {
      const result = await api.post(`/post/saved/${post?._id}`);
      dispatch(setUserData(result.data.user));
      toast.success(result.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Bookmark failed");
    }
  };

  const handleDeletePost = async () => {
    try {
      setDeletePostLoading(true);
      const result = await api.delete(`/post/delete/${post?._id}`);
      toast.success(result.data.message);
      const updatedPosts = postData.filter((p) => p._id !== post._id);
      dispatch(setPostData(updatedPosts));
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setDeletePostLoading(false);
    }
  };

  const handleToggleArchive = async () => {
    try {
      const res = await api.post(`/post/archive/${post?._id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        // Only remove from feed if the post was archived (not unarchived)
        if (res.data.isArchived) {
          const updatedPosts = postData.filter((p) => p._id !== post._id);
          dispatch(setPostData(updatedPosts));
        }
      }
    } catch {
      toast.error("Archive failed");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      setDeleteCommentId(commentId);
      const res = await api.delete(`/post/comment/${post._id}/${commentId}`);
      dispatch(deleteCommentFromPost({ postId: post._id, commentId }));
      toast.success(res.data.message);
    } catch (error) {
      toast.error("Failed to delete comment");
    } finally {
      setDeleteCommentId(null);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editingMessage.trim()) return;
    try {
      setEditLoadingId(commentId);
      const res = await api.put(`/post/comment/${post._id}/${commentId}`, {
        message: editingMessage,
      });
      dispatch(
        editCommentInPost({
          postId: post._id,
          comment: res.data.comment,
        })
      );
      setEditingCommentId(null);
      setEditingMessage("");
      toast.success(res.data.message);
    } catch (error) {
      toast.error("Failed to edit comment");
    } finally {
      setEditLoadingId(null);
    }
  };

  return (
    <div id={`post-${post?._id}`} className="w-full flex flex-col bg-surface-inset/90 border border-border/80 shadow-2xl rounded-2xl overflow-hidden my-3 transition-all duration-300">
      {/* POST HEADER */}
      <div className="w-full h-14 flex justify-between items-center px-4 border-b border-border/80 bg-bg/40">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full border border-border cursor-pointer overflow-hidden shadow"
            onClick={() => navigate(`/profile/${post?.author?.userName}`)}
          >
            <img src={post?.author?.profileImage?.url || dp} alt="" className="w-full h-full object-cover" />
          </div>

          <div className="flex flex-col">
            <span
              className="font-bold text-xs text-text cursor-pointer hover:underline truncate max-w-[150px] flex items-center gap-1"
              onClick={() => navigate(`/profile/${post?.author?.userName}`)}
            >
              {post?.author?.userName}
              {post?.author?.isVerified && (
                <BadgeCheck className="h-4 w-4 fill-[#0095f6] text-white shrink-0" />
              )}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-medium flex-wrap">
              <span>{moment(post?.createdAt).fromNow()}</span>
              {post?.isEdited && (
                <span className="text-[9px] text-text-muted opacity-80 font-semibold">• Edited</span>
              )}
              {post?.aiLabel?.isAIGenerated && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAIInfoModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[9px] font-bold text-purple-300 hover:bg-purple-500/20 hover:text-purple-200 transition cursor-pointer"
                  title="Content made or edited with AI"
                >
                  <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                  <span>AI info</span>
                </button>
              )}
            </div>
            {post?.location && (
              <span
                onClick={() => navigate(`/explore/location/${encodeURIComponent(post.location)}`)}
                className="text-[10px] text-rose-400 font-semibold cursor-pointer hover:underline flex items-center gap-0.5 mt-0.5"
              >
                📍 {post.location}
              </span>
            )}
            {post?.music && (
              <span 
                className="text-[10px] text-text-secondary font-semibold flex items-center gap-1 mt-0.5 hover:text-text cursor-pointer"
                onClick={() => navigate(`/audio/${encodeURIComponent(typeof post.music === 'object' ? post.music.id || post.music.title : post.music)}`)}
              >
                🎵 {typeof post.music === 'object' ? `${post.music.title} • ${post.music.artist}` : post.music}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {userData?.user?._id === post?.author?._id ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface transition cursor-pointer"
                title="Edit Post"
              >
                <MdEdit className="w-4 h-4" />
              </button>

              <button
                onClick={handleToggleArchive}
                className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface transition cursor-pointer"
                title="Archive Post"
              >
                <Archive className="w-4 h-4" />
              </button>

              {deletePostLoading ? (
                <ClipLoader size={16} color="white" />
              ) : (
                <button onClick={handleDeletePost} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-full transition cursor-pointer" title="Delete Post">
                  <MdDeleteOutline className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <FollowButton
              targetUserId={post?.author?._id}
              tailwind="px-3.5 py-1 bg-rose-600 hover:bg-rose-500 text-text text-[11px] font-semibold rounded-full shadow"
            />
          )}
        </div>
      </div>

      {/* MEDIA CONTAINER */}
      <div 
        onClick={(e) => {
          // Handle single vs double click separating tags toggle from heart animation
          if (e.detail === 1) {
            window.postClickTimeout = setTimeout(() => {
              setShowTags((prev) => !prev);
            }, 250);
          } else if (e.detail === 2) {
            clearTimeout(window.postClickTimeout);
            if (!post?.likes?.includes(userData?.user?._id)) {
              handleLike();
            }
            setShowHeartAnim(true);
            setTimeout(() => setShowHeartAnim(false), 900);
          }
        }}
        className="relative w-full bg-bg flex items-center justify-center overflow-hidden min-h-[300px] cursor-pointer"
      >
        {post?.mediaType === "carousel" ? (
          <PostCarousel mediaList={post?.carouselMedia || []} />
        ) : post?.mediaType === "video" ? (
          <VideoPlayer media={post?.media?.url} />
        ) : (
          <img src={post?.media?.url} alt={post?.altText || "Post Media"} loading="lazy" className="w-full object-cover max-h-[620px]" />
        )}

        {/* Tagged Users Interactive Overlay */}
        <TaggedUsersOverlay taggedUsers={post?.taggedUsers || []} showTags={showTags} setShowTags={setShowTags} />

        {/* Bouncing heart on double tap */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-50 pointer-events-none animate-fade-in">
            <GoHeartFill 
              className="text-text text-8xl drop-shadow-2xl scale-125 animate-bounce transition-all duration-300"
              style={{ filter: "drop-shadow(0 10px 20px rgba(244, 63, 94, 0.6))" }}
            />
          </div>
        )}

        {/* Instagram-Style Floating Soundtrack Pill */}
        {post?.music && (
          <div
            className="absolute bottom-3 left-3 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md text-white border border-white/20 shadow-xl transition cursor-pointer group select-none"
          >
            {/* Click to Navigate to Audio Detail Page */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                const trackId = typeof post.music === "object" ? post.music.id || post.music.title : post.music;
                navigate(`/audio/${encodeURIComponent(trackId)}`, {
                  state: { music: parsedMusic },
                });
              }}
              className="flex items-center gap-2 hover:opacity-90 transition"
            >
              <div className={`w-4 h-4 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shrink-0 ${!musicMuted && parsedMusic?.audioUrl ? "animate-spin-slow" : ""}`}>
                <Music className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-[10px] font-bold truncate max-w-[130px] sm:max-w-[190px] hover:underline">
                {typeof post.music === "object" ? `${post.music.title} • ${post.music.artist}` : post.music}
              </span>
            </div>

            {/* Click to Toggle Mute / Unmute */}
            {parsedMusic?.audioUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMusicMuted(!musicMuted);
                }}
                className="flex items-center gap-1 ml-1 border-l border-white/20 pl-1.5 cursor-pointer hover:scale-105 transition"
                title={musicMuted ? "Unmute" : "Mute"}
              >
                {!musicMuted ? (
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 bg-rose-400 h-full animate-pulse" />
                    <span className="w-0.5 bg-rose-300 h-2/3 animate-bounce" />
                    <span className="w-0.5 bg-rose-400 h-4/5 animate-pulse" />
                  </div>
                ) : (
                  <VolumeX className="w-3 h-3 text-zinc-400 group-hover:text-white" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ACTION BAR */}
      <div className="w-full h-12 flex justify-between items-center px-4 border-t border-border/80 bg-bg/40">
        <div className="flex items-center gap-5">
          <button onClick={handleLike} className="flex items-center gap-1.5 text-text hover:text-rose-500 transition cursor-pointer">
            {post?.likes?.includes(userData?.user?._id) ? (
              <GoHeartFill className="w-5 h-5 text-rose-500 scale-110" />
            ) : (
              <GoHeart className="w-5 h-5" />
            )}
            {post?.likesHidden ? (
              <span className="text-[11px] font-bold text-text">
                {post?.likes?.includes(userData?.user?._id) ? "Liked by you & others" : "Liked by others"}
              </span>
            ) : (
              <span className="text-xs font-semibold text-text">{post?.likes?.length || 0}</span>
            )}
          </button>

          {post?.allowComments !== false ? (
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-text hover:text-rose-500 transition cursor-pointer">
              <MdOutlineComment className="w-5 h-5" />
              <span className="text-xs font-semibold text-text">{post?.comments?.length || 0}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-text-muted cursor-not-allowed">
              <MdOutlineComment className="w-5 h-5 opacity-40" />
              <span className="text-[10px] font-extrabold uppercase tracking-tight">Comments Off</span>
            </div>
          )}

          <button onClick={() => setShowShareSheet(true)} className="p-1 text-text hover:text-rose-500 transition cursor-pointer" title="Share Post">
            <IoSendSharp className="w-4 h-4 -rotate-45" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCollectionsModal(true)}
            className="p-1.5 text-text-secondary hover:text-rose-400 rounded-full hover:bg-surface transition cursor-pointer"
            title="Save to folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>

          <button onClick={handleSaved} className="p-1.5 text-text hover:text-amber-400 transition cursor-pointer">
            {userData?.user?.savedPosts?.includes(post?._id) ? (
              <GoBookmarkFill className="w-5 h-5 text-amber-400" />
            ) : (
              <GoBookmark className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* CAPTION & PARSED MENTIONS */}
      {post?.caption && (
        <div className="w-full px-4 pb-3 pt-1 space-y-1 bg-bg/20">
          <div className="flex items-start gap-2 text-xs">
            <span className="font-bold text-text cursor-pointer hover:underline flex items-center gap-0.5" onClick={() => navigate(`/profile/${post?.author?.userName}`)}>
              @{post?.author?.userName}
              {post?.author?.isVerified && (
                <BadgeCheck className="h-3.5 w-3.5 fill-[#0095f6] text-white shrink-0" />
              )}
            </span>
            <RenderParsedCaption caption={post.caption} onNavigate={navigate} />
          </div>
          <AITranslateButton originalText={post.caption} />
        </div>
      )}

      {/* COMMENTS SHEET */}
      {showComments && post?.allowComments !== false && (
        <div className="w-full border-t border-border p-4 space-y-3 bg-surface-inset">
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="flex-1 bg-surface border border-border rounded-full px-4 py-2 text-xs text-text outline-none focus:border-rose-500"
              placeholder="Add a comment..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleComment();
              }}
            />
            <button disabled={commentLoading} onClick={handleComment} className="p-2.5 bg-rose-600 hover:bg-rose-500 text-text rounded-full transition cursor-pointer">
              {commentLoading ? <ClipLoader size={14} color="white" /> : <IoSendSharp className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2">
            {post?.comments?.map((comment) => (
              <div key={comment._id} className="flex justify-between items-start text-xs p-2.5 rounded-xl bg-surface/60 border border-border/60">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-text cursor-pointer hover:underline flex items-center gap-0.5" onClick={() => navigate(`/profile/${comment.author?.userName}`)}>
                    @{comment.author?.userName}
                    {comment.author?.isVerified && (
                      <BadgeCheck className="h-3.5 w-3.5 fill-[#0095f6] text-white shrink-0" />
                    )}
                  </span>
                  <span className="text-text">{comment.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collections Modal */}
      {showCollectionsModal && (
        <CollectionsModal isOpen={showCollectionsModal} onClose={() => setShowCollectionsModal(false)} postId={post?._id} />
      )}

      {/* Instagram Share Sheet */}
      {showShareSheet && (
        <ShareSheet
          open={showShareSheet}
          onClose={() => setShowShareSheet(false)}
          entity={post}
          entityType="post"
          following={userData?.user?.following || []}
        />
      )}

      {/* Edit Post Modal (Instagram-style) */}
      {showEditModal && (
        <EditPostModal
          post={post}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onPostUpdated={handlePostUpdated}
        />
      )}

      {/* AI Information Modal */}
      {showAIInfoModal && (
        <div
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAIInfoModal(false)}
        >
          <div
            className="bg-bg border border-border rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-sm text-text">AI Info</h3>
              </div>
              <button
                onClick={() => setShowAIInfoModal(false)}
                className="p-1 rounded-full text-text-muted hover:text-text hover:bg-surface transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-text-secondary leading-relaxed">
              <p>
                The creator of this post or VYBE's detection systems indicated that this media was created or modified using Generative AI tools.
              </p>
              {post?.aiLabel?.tool && (
                <div className="p-3 bg-surface rounded-xl border border-border flex items-center gap-2 mt-2">
                  <Bot className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="font-medium text-text">Tool used: {post.aiLabel.tool}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowAIInfoModal(false)}
              className="w-full py-2 bg-surface hover:bg-surface-hover text-text font-semibold text-xs rounded-xl border border-border transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Post;
