import axios from "axios";
import { Eye, Send } from "lucide-react";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { FiVolume2, FiVolumeX } from "react-icons/fi";
import { GoHeart, GoHeartFill } from "react-icons/go";
import { IoSendSharp } from "react-icons/io5";
import { MdOutlineComment } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { SERVER_URL } from "../App";
import dp from "../assets/dp3.png";
import { setLoopData } from "../redux/features/loopSlice";
import FollowButton from "./FollowButton";
import ShareSheet from "./ShareSheet";

const LoopCard = ({ loop }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const commentRef = useRef(null);
  const { userData } = useSelector((state) => state.user);
  const { loopData } = useSelector((state) => state.loop);

  const videoRef = useRef(null);
  const viewCountedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [message, setMessage] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const viewersRef = useRef(null);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      const percent = (video.currentTime / video.duration) * 100;
      setProgress(percent);
    }
  };

  const handleVideoClick = () => {
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleLike = async () => {
    try {
      const result = await axios.post(
        `${SERVER_URL}/api/v1/loop/like/${loop?._id}`,
        {},
        { withCredentials: true }
      );

      const updatedLoop = result.data.loop;

      const updatedLoops = loopData?.map((l) =>
        l._id === loop._id ? updatedLoop : l
      );

      toast.success(result.data.message);
      dispatch(setLoopData(updatedLoops));
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  };

  const handleComment = async () => {
    if (!message.trim()) return;

    try {
      setCommentLoading(true);

      const result = await axios.post(
        `${SERVER_URL}/api/v1/loop/comment/${loop?._id}`,
        { message },
        { withCredentials: true }
      );

      const updatedLoop = result.data.loop;
      const updatedLoops = loopData.map((l) =>
        l._id === loop._id ? updatedLoop : l
      );

      dispatch(setLoopData(updatedLoops));
      setMessage("");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleLikeOnDoubleClick = () => {
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 600);

    const alreadyLiked = loop?.likes?.some(
      (like) => like?._id === userData?.user?._id
    );

    if (!alreadyLiked) {
      handleLike();
    }
  };

  const incrementView = async () => {
    if (viewCountedRef.current) return;

    try {
      viewCountedRef.current = true;

      await axios.post(
        `${SERVER_URL}/api/v1/loop/view/${loop?._id}`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.log("View increment failed");
    }
  };

  const watchStartRef = useRef(null);

  const handlePlay = () => {
    watchStartRef.current = Date.now();
  };

  const handlePause = async () => {
    if (!watchStartRef.current) return;

    const duration = Math.floor((Date.now() - watchStartRef.current) / 1000);

    watchStartRef.current = null;

    await axios.post(
      `${SERVER_URL}/api/v1/loop/watch/${loop._id}`,
      { duration },
      { withCredentials: true }
    );
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (commentRef.current && !commentRef.current.contains(event.target)) {
        setShowComments(false);
      }
    };

    if (showComments) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showComments]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (viewersRef.current && !viewersRef.current.contains(e.target)) {
        setShowViewers(false);
      }
    };

    if (showViewers) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showViewers]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;

        if (!video) return;

        if (entry.isIntersecting) {
          video.play();
          setIsPlaying(true);

          setTimeout(() => {
            incrementView();
          }, 1000);
        } else {
          video.pause();
          setIsPlaying(false);
        }
      },
      {
        threshold: 0.6,
      }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full lg:w-[480px] h-[100vh] flex items-center justify-center border-l-2 border-r-2 border-gray-800 relative overflow-hidden">
      {showHeart && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 heart-animation z-50">
          <GoHeartFill className="w-[100px] h-[100px] text-white drop-shadow-2xl" />
        </div>
      )}

      <div
        ref={commentRef}
        className={`absolute z-[200] bottom-0 w-full h-[500px] p-[10px] rounded-t-4xl bg-[#0e1718] transition-transform duration-500 ease-in-out left-0 shadow-2xl shadow-black ${
          showComments ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <h1 className="text-white text-[20px] text-center font-semibold">
          Comments
        </h1>

        <div className="w-full h-[350px] overflow-y-auto flex flex-col gap-[20px]">
          {loop?.comments?.length === 0 && (
            <div className="text-center text-white text-[20px] font-semibold mt-[50px]">
              No Comments Yet
            </div>
          )}

          {loop?.comments?.map((comment, index) => {
            return (
              <div
                key={index}
                className="w-full flex flex-col gap-[5px] border-b-[1px] border-gray-800 justify-center pb-[10px] mt-[10px]"
              >
                <div className="flex justify-start items-center gap-[10px] md:gap-[20px]">
                  <div
                    className="w-[30px] h-[30px] md:w-[40px] md:h-[40px] border-2 border-black rounded-full cursor-pointer overflow-hidden"
                    onClick={() =>
                      navigate(`/profile/${comment?.author?.userName}`)
                    }
                  >
                    <img
                      src={comment?.author?.profileImage?.url || dp}
                      alt=""
                      className="w-full object-cover"
                    />
                  </div>

                  <div className="flex flex-col">
                    <span
                      className="font-semibold truncate text-white"
                      title={comment?.author?.userName}
                    >
                      {comment?.author?.userName}
                    </span>

                    <span className="text-xs text-gray-500">
                      {moment(comment?.createdAt).fromNow()}
                    </span>
                  </div>
                </div>

                <div className="text-white pl-[60px]">{comment?.message}</div>
              </div>
            );
          })}
        </div>

        <div className="w-full fixed bottom-0 h-[80px] flex items-center justify-between px-[20px] py-[20px]">
          <div
            className="w-[30px] h-[30px] md:w-[40px] md:h-[40px] border-2 border-black rounded-full cursor-pointer overflow-hidden"
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
            className="px-[10px] border-b-2 border-b-gray-500 w-[90%] outline-none h-[40px] text-white placeholder:text-white bg-transparent"
            placeholder="Write comment..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {message && (
            <button
              disabled={commentLoading}
              className="absolute right-[20px]"
              onClick={handleComment}
            >
              {commentLoading ? (
                <ClipLoader size={18} />
              ) : (
                <IoSendSharp className="w-[25px] h-[25px] text-white" />
              )}
            </button>
          )}
        </div>
      </div>

      <div
        ref={viewersRef}
        className={`absolute z-[300] bottom-0 w-full h-[450px] bg-[#0e1718] rounded-t-3xl transition-transform duration-500 ease-in-out shadow-2xl shadow-black ${
          showViewers ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <h2 className="text-white text-center text-lg font-semibold py-4">
          Viewers
        </h2>

        <div className="h-[360px] overflow-y-auto px-4 flex flex-col gap-4">
          {loop?.viewedBy?.length === 0 && (
            <p className="text-center text-gray-400 mt-10">No views yet</p>
          )}

          {loop?.viewedBy?.map((viewer, index) => (
            <div
              key={index}
              className="flex items-center gap-3 border-b border-gray-800 pb-2"
            >
              <div
                className="w-10 h-10 rounded-full overflow-hidden cursor-pointer"
                onClick={() => navigate(`/profile/${viewer?.userName}`)}
              >
                <img
                  src={viewer?.profileImage?.url || dp}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-white font-semibold">
                  {viewer?.userName}
                </span>
                <span className="text-gray-400 text-xs">{viewer?.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <video
        onPlay={handlePlay}
        onPause={handlePause}
        ref={videoRef}
        autoPlay
        muted={isMuted}
        loop
        src={loop?.media?.url}
        className="w-full max-h-full"
        onClick={handleVideoClick}
        onTimeUpdate={handleTimeUpdate}
        onDoubleClick={handleLikeOnDoubleClick}
        // onTripleClick={() => setShowComments(!showComments)}
      />

      <div
        className="absolute top-[20px] right-[20px] z-[100]"
        onClick={() => setIsMuted(!isMuted)}
      >
        {!isMuted ? (
          <FiVolume2 className="w-[20px] h-[20px] text-white font-semibold" />
        ) : (
          <FiVolumeX className="w-[20px] h-[20px] text-white font-semibold" />
        )}
      </div>

      <div className="absolute bottom-0 left-0 w-full h-[5px] bg-gray-900">
        <div
          className="h-full bg-white w-[200px] transition-all duration-200 ease-linear"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="w-full absolute h-[100px] bottom-[10px] p-[10px] flex flex-col gap-[10px]">
        <div className="flex items-center gap-[5px]">
          <div
            className="w-[30px] h-[30px] md:w-[40px] md:h-[40px] border-2 border-black rounded-full cursor-pointer overflow-hidden"
            onClick={() => navigate(`/profile/${loop?.author?.userName}`)}
          >
            <img
              src={loop?.author?.profileImage?.url || dp}
              alt=""
              className="w-full object-cover"
            />
          </div>

          <div
            className="w-[120px] text-white font-semibold truncate"
            title={loop?.author?.userName}
          >
            {loop?.author?.userName}
          </div>

          {loop?.author?._id !== userData?.user?._id && (
            <FollowButton
              targetUserId={loop?.author?._id}
              tailwind="px-[10px] py-[5px] text-white border-2 text-[14px] rounded-2xl border-white"
            />
          )}
        </div>

        <div className="text-white px-[10px]">{loop?.caption}</div>

        <div className="absolute right-0 flex flex-col gap-[20px] text-white bottom-[150px] justify-center px-[10px]">
          <div className="flex flex-col items-center cursor-pointer">
            <div className="" onClick={handleLike}>
              {!loop?.likes?.some(
                (like) => like?._id === userData?.user?._id
              ) ? (
                <GoHeart className="w-[25px] h-[25px]" />
              ) : (
                <GoHeartFill className="w-[25px] h-[25px] text-red-600" />
              )}
            </div>
            <div>{loop?.likes?.length}</div>
          </div>

          <div
            className="flex flex-col items-center cursor-pointer"
            onClick={() => setShowComments(!showComments)}
          >
            <div>
              <MdOutlineComment className="w-[25px] h-[25px] cursor-pointer" />
            </div>
            <div>{loop?.comments?.length}</div>
          </div>

          <div
            className="flex flex-col items-center cursor-pointer active:scale-90 transition"
            onClick={() => setShowShare(true)}
          >
            <Send size={22} strokeWidth={1.5} />
            <span>{loop?.forwards || 0}</span>
          </div>

          <div
            className="flex items-center gap-1 text-gray-300 text-sm cursor-pointer"
            onClick={() => setShowViewers(true)}
          >
            <Eye size={16} strokeWidth={1.5} />
            <span>{loop?.views || 0}</span>
          </div>

          {/* Share Sheet Call */}
          <ShareSheet
            open={showShare}
            onClose={() => setShowShare(false)}
            loop={loop}
            following={userData?.user?.following}
          />
        </div>
      </div>
    </div>
  );
};

export default LoopCard;
