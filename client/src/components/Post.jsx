import axios from "axios";
import { Check } from "lucide-react";
import moment from "moment";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  GoBookmark,
  GoBookmarkFill,
  GoHeart,
  GoHeartFill,
} from "react-icons/go";
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

const Post = ({ post }) => {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { postData } = useSelector((state) => state.post);
  const [showComments, setShowComments] = useState(true);
  const dispatch = useDispatch();
  const [message, setMessage] = useState("");

  const [commentLoading, setCommentLoading] = useState(false);
  const [deletePostLoading, setDeletePostLoading] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingMessage, setEditingMessage] = useState("");
  const [editLoadingId, setEditLoadingId] = useState(null);

  const handleLike = async () => {
    try {
      const result = await axios.post(
        `${SERVER_URL}/api/v1/post/like/${post?._id}`,
        {},
        { withCredentials: true }
      );

      const updatedPost = result.data.post;

      const updatedPosts = postData?.map((p) =>
        p._id === post._id ? updatedPost : p
      );

      dispatch(setPostData(updatedPosts));
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  };

  const handleComment = async () => {
    if (!message.trim()) return;

    try {
      setCommentLoading(true);

      const result = await axios.post(
        `${SERVER_URL}/api/v1/post/comment/${post?._id}`,
        { message },
        { withCredentials: true }
      );

      const updatedPost = result.data.post;
      const updatedPosts = postData.map((p) =>
        p._id === post._id ? updatedPost : p
      );

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
      const result = await axios.post(
        `${SERVER_URL}/api/v1/post/save-post/${post?._id}`,
        {},
        { withCredentials: true }
      );

      dispatch(
        setUserData({
          ...userData,
          user: {
            ...userData.user,
            savedPosts: result.data.savedPosts,
          },
        })
      );

      toast.success(result.data.message);
    } catch (error) {
      toast.error("Failed to save post");
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Delete this post?")) return;

    try {
      setDeletePostLoading(true);

      await axios.delete(`${SERVER_URL}/api/v1/post/delete-post/${post._id}`, {
        withCredentials: true,
      });

      dispatch(setPostData(postData.filter((p) => p._id !== post._id)));
      toast.success("Post deleted");
    } catch (error) {
      toast.error("Failed to delete post");
    } finally {
      setDeletePostLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      setDeleteCommentId(commentId);

      const res = await axios.delete(
        `${SERVER_URL}/api/v1/post/delete-comment/${post._id}/${commentId}`,
        { withCredentials: true }
      );

      dispatch(
        deleteCommentFromPost({
          postId: res.data.postId,
          commentId: res.data.commentId,
        })
      );

      toast.success(res.data.message);
    } catch (error) {
      toast.error("Delete failed");
    } finally {
      setDeleteCommentId(null);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editingMessage.trim()) return;

    try {
      setEditLoadingId(commentId);

      const res = await axios.patch(
        `${SERVER_URL}/api/v1/post/edit-comment/${post._id}/${commentId}`,
        { message: editingMessage },
        { withCredentials: true }
      );

      dispatch(
        editCommentInPost({
          postId: res.data.postId,
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
    <div className="w-[90%] flex flex-col gap-[10px] bg-white items-center shadow-2xl shadow-[#00000058] rounded-2xl pb-[20px]">
      <div className="w-full h-[80px] flex justify-between items-center px-[10px]">
        <div className="flex justify-center items-center gap-[10px] md:gap-[20px]">
          <div
            className="w-[40px] h-[40px] md:w-[60px] md:h-[60px] border-2 border-black rounded-full cursor-pointer overflow-hidden"
            onClick={() => navigate(`/profile/${post?.author?.userName}`)}
          >
            <img
              src={post?.author?.profileImage?.url || dp}
              alt=""
              className="w-full object-cover"
            />
          </div>

          <div className="flex flex-col">
            <span
              className="font-semibold truncate"
              title={post?.author?.userName}
            >
              {post?.author?.userName}
            </span>

            <span className="text-xs text-gray-500">
              {moment(post?.createdAt).fromNow()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userData?.user?._id === post?.author?._id ? (
            deletePostLoading ? (
              <ClipLoader size={20} />
            ) : (
              <MdDeleteOutline
                className="w-[25px] h-[25px] cursor-pointer text-red-500"
                onClick={handleDeletePost}
              />
            )
          ) : (
            <FollowButton
              targetUserId={post?.author?._id}
              tailwind="px-4 py-1 md:px-6 md:py-2 bg-black text-white rounded-2xl whitespace-nowrap"
            />
          )}
        </div>
      </div>

      <div className="w-[90%] flex items-center justify-center">
        {post?.mediaType === "image" && (
          <div className="w-[90%] flex items-center justify-center">
            <img
              src={post?.media?.url}
              alt=""
              className="w-[80%] rounded-2xl object-cover"
            />
          </div>
        )}

        {post?.mediaType === "video" && (
          <div className="w-[80%] flex flex-col items-center justify-center">
            <VideoPlayer media={post?.media?.url} />
          </div>
        )}
      </div>

      <div className="w-full h-[60px] flex justify-between items-center px-[20px] mt-[10px]">
        <div className="flex justify-center items-center gap-[10px] like&comment">
          <div
            className="like flex justify-center items-center gap-[5px]"
            onClick={handleLike}
          >
            {!post?.likes?.includes(userData?.user?._id) ? (
              <GoHeart className="w-[25px] h-[25px] cursor-pointer" />
            ) : (
              <GoHeartFill className="w-[25px] h-[25px] text-rose-500 cursor-pointer" />
            )}
            <span>{post?.likes?.length}</span>
          </div>
          <div
            className="comment flex justify-center items-center gap-[5px]"
            onClick={() => setShowComments((prev) => !prev)}
          >
            <MdOutlineComment className="w-[25px] h-[25px] cursor-pointer" />
            <span>{post?.comments?.length}</span>
          </div>
        </div>

        <div className="save" onClick={handleSaved}>
          {!userData?.user?.savedPosts?.includes(post?._id) ? (
            <GoBookmark className="w-[25px] h-[25px] cursor-pointer" />
          ) : (
            <GoBookmarkFill className="w-[25px] h-[25px] cursor-pointer" />
          )}
        </div>
      </div>

      {post?.caption && (
        <div className="w-full px-[20px] gap-[10px] flex flex-col sm:flex-row sm:items-center">
          <h1>{post?.author?.userName}</h1>
          <div>{post?.caption}</div>
        </div>
      )}

      {showComments && (
        <div className="w-full flex flex-col gap-[30px] pb-[20px]">
          <div className="w-full h-[80px] flex items-center justify-between px-[20px] relative">
            <div
              className="w-[40px] h-[40px] md:w-[60px] md:h-[60px] border-2 border-black rounded-full cursor-pointer overflow-hidden"
              onClick={() => navigate(`/profile/${userData?.user?.userName}`)}
              title={userData?.user?.userName}
            >
              <img
                src={userData?.user?.profileImage?.url || dp}
                alt=""
                className="w-full object-cover"
              />
            </div>

            <input
              type="text"
              className="px-[10px] border-b-2 border-b-gray-500 w-[90%] outline-none h-[40px]"
              placeholder="Write comment..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              disabled={commentLoading}
              className="absolute right-[20px]"
              onClick={handleComment}
            >
              {commentLoading ? (
                <ClipLoader size={18} />
              ) : (
                <IoSendSharp className="w-[25px] h-[25px]" />
              )}
            </button>
          </div>

          <div className="w-full max-h-[300px] overflow-auto">
            {post?.comments?.map((comment) => {
              const canEdit = comment.author?._id === userData?.user?._id;
              const canDelete =
                canEdit || post.author?._id === userData?.user?._id;

              const isEditing = editingCommentId === comment._id;

              return (
                <div
                  key={comment._id}
                  className="flex justify-between px-[20px] py-[15px] border-b"
                >
                  <div className="flex gap-[15px] items-center">
                    <img
                      src={comment.author?.profileImage?.url || dp}
                      className="w-[40px] h-[40px] rounded-full cursor-pointer"
                      onClick={() =>
                        navigate("/profile/" + comment.author?.userName)
                      }
                    />

                    {isEditing ? (
                      <textarea
                        cols="30"
                        type="text"
                        autoFocus
                        style={{ resize: "none" }}
                        placeholder="Write comment..."
                        value={editingMessage}
                        onChange={(e) => setEditingMessage(e.target.value)}
                        className="border-b border-gray-500 outline-none w-full"
                      />
                    ) : (
                      <div>{comment.message}</div>
                    )}
                  </div>

                  <div className="flex gap-2 items-center">
                    {canEdit &&
                      (isEditing ? (
                        <>
                          {editLoadingId === comment._id ? (
                            <ClipLoader size={18} />
                          ) : (
                            <button
                              className="text-blue-500 cursor-pointer"
                              onClick={() => handleEditComment(comment._id)}
                            >
                              <Check className="w-[25px] h-[25px]" />
                            </button>
                          )}

                          <button
                            disabled={editLoadingId === comment._id}
                            className="text-gray-500 cursor-pointer"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditingMessage("");
                            }}
                          >
                            <RxCross2 className="w-[25px] h-[25px]" />
                          </button>
                        </>
                      ) : (
                        <button
                          className="text-blue-500 cursor-pointer"
                          onClick={() => {
                            setEditingCommentId(comment._id);
                            setEditingMessage(comment.message);
                          }}
                        >
                          <MdEdit className="w-[25px] h-[25px]" />
                        </button>
                      ))}

                    {canDelete &&
                      !isEditing &&
                      (deleteCommentId === comment._id ? (
                        <ClipLoader size={20} />
                      ) : (
                        <MdDeleteOutline
                          className="text-[25px] cursor-pointer text-red-500"
                          onClick={() => handleDeleteComment(comment._id)}
                        />
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Post;
