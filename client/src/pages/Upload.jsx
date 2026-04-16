import axios from "axios";
import { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { FiPlusSquare } from "react-icons/fi";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { SERVER_URL } from "../App";
import VideoPlayer from "../components/VideoPlayer";
import { setLoopData } from "../redux/features/loopSlice";
import { setPostData } from "../redux/features/postSlice";
import { setStoryFeed } from "../redux/features/storySlice";

const MAX_LOOP_DURATION = 600; // 10 min
const MAX_LOOP_SIZE = 100 * 1024 * 1024; // 100 MB

const Upload = () => {
  const navigate = useNavigate();

  const [uploadType, setUploadType] = useState("post");
  const [frontendMedia, setFrontendMedia] = useState(null);
  const [backendMedia, setBackendMedia] = useState(null);
  const [mediaType, setMediaType] = useState("");
  const [caption, setCaption] = useState("");
  const mediaInput = useRef(null);

  const dispatch = useDispatch();
  const { postData } = useSelector((state) => state.post);
  const { storyData } = useSelector((state) => state.story);
  const { loopData } = useSelector((state) => state.loop);
  const [isLoading, setIsLoading] = useState(false);

  const checkVideoDuration = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };

      video.onerror = () => {
        reject("Invalid video file");
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleMedia = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // detect media type
    if (file.type.includes("image")) {
      setMediaType("image");
    } else if (file.type.includes("video")) {
      setMediaType("video");
    } else if (file.type.includes("audio")) {
      setMediaType("audio");
    } else {
      setMediaType("file");
    }

    if (uploadType === "loop") {
      // size check
      if (file.size > MAX_LOOP_SIZE) {
        toast.error("Loop video must be under 60MB");
        e.target.value = "";
        return;
      }

      // duration check
      try {
        const duration = await checkVideoDuration(file);

        if (duration > MAX_LOOP_DURATION) {
          toast.error("Loop video must be under 10 minutes");
          e.target.value = "";
          return;
        }
      } catch (err) {
        toast.error("Invalid video file");
        return;
      }
    }

    setBackendMedia(file);
    setFrontendMedia(URL.createObjectURL(file));
  };

  const uploadPost = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("caption", caption);
      formData.append("mediaType", mediaType);
      formData.append("media", backendMedia);

      const result = await axios.post(
        `${SERVER_URL}/api/v1/post/upload`,
        formData,
        { withCredentials: true }
      );
      dispatch(setPostData([result.data.post, ...postData]));
      console.log(result);
      toast.success(result.data.message);
      setIsLoading(false);
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message);
      console.log(error);
      setIsLoading(false);
    }
  };

  // uploadStory function
  const uploadStory = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("mediaType", mediaType);
      formData.append("media", backendMedia);

      await axios.post(`${SERVER_URL}/api/v1/story/upload`, formData, {
        withCredentials: true,
      });

      // 🔥 re-fetch story feed
      const feedRes = await axios.get(`${SERVER_URL}/api/v1/story/feed`, {
        withCredentials: true,
      });

      dispatch(setStoryFeed(feedRes.data.stories));

      toast.success("Story uploaded successfully!");
      setIsLoading(false);
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed");
      setIsLoading(false);
    }
  };

  const uploadLoop = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("caption", caption);
      formData.append("media", backendMedia);

      const result = await axios.post(
        `${SERVER_URL}/api/v1/loop/upload`,
        formData,
        { withCredentials: true }
      );
      dispatch(setLoopData([result.data.loop, ...loopData]));
      console.log(result);
      toast.success(result.data.message);
      setIsLoading(false);
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message);
      console.log(error);
      setIsLoading(false);
    }
  };

  const handleUpload = () => {
    if (uploadType === "post") {
      uploadPost();
    } else if (uploadType === "story") {
      uploadStory();
    } else if (uploadType === "loop") {
      uploadLoop();
    }
  };

  return (
    <div className="w-full h-[100vh] bg-black flex flex-col items-center">
      <div className="w-full h-[80px] flex items-center gap-[20px] px-[20px]">
        <MdOutlineKeyboardBackspace
          className="w-[25px] h-[25px] text-white cursor-pointer"
          onClick={() => navigate(-1)}
        />
        <h1 className="text-white text-[20px] font-semibold">Upload Media</h1>
      </div>

      <div className="w-[90%] max-w-[600px] h-[80px] bg-white rounded-full flex justify-around items-center gap-[10px]">
        <div
          className={`w-[28%] h-[80%] flex justify-center items-center text-[19px] font-semibold hover:bg-black rounded-full hover:text-white cursor-pointer hover:shadow-2xl hover:shadow-black ${
            uploadType === "post"
              ? "bg-black text-white shadow-2xl shadow-black"
              : ""
          }`}
          onClick={() => setUploadType("post")}
        >
          Post
        </div>
        <div
          className={`w-[28%] h-[80%] flex justify-center items-center text-[19px] font-semibold hover:bg-black rounded-full hover:text-white cursor-pointer hover:shadow-2xl hover:shadow-black ${
            uploadType === "story"
              ? "bg-black text-white shadow-2xl shadow-black"
              : ""
          }`}
          onClick={() => setUploadType("story")}
        >
          Story
        </div>
        <div
          className={`w-[28%] h-[80%] flex justify-center items-center text-[19px] font-semibold hover:bg-black rounded-full hover:text-white cursor-pointer hover:shadow-2xl hover:shadow-black ${
            uploadType === "loop"
              ? "bg-black text-white shadow-2xl shadow-black"
              : ""
          }`}
          onClick={() => setUploadType("loop")}
        >
          Loops
        </div>
      </div>

      {!frontendMedia && (
        <div
          className="w-[80%] max-w-[500px] h-[250px] bg-[#0e1316] border-gray-800 border-2 flex flex-col items-center justify-center gap-[8px] mt-[15vh] rounded-2xl cursor-pointer hover:bg-[#353a3d]"
          onClick={() => mediaInput.current.click()}
        >
          <input
            type="file"
            accept={uploadType == "loop" ? "video/*" : ""}
            hidden
            ref={mediaInput}
            onChange={handleMedia}
          />
          <FiPlusSquare className="w-[25px] h-[25px] text-white cursor-pointer" />
          <div className="text-white text-[19px] font-semibold">
            Upload {uploadType}
          </div>
        </div>
      )}

      {frontendMedia && (
        <div className="w-[80%] max-w-[500px] h-[250px] flex flex-col items-center justify-center mt-[15vh] ">
          {mediaType === "image" && (
            <div className="w-[80%] max-w-[500px] h-[250px] flex flex-col items-center justify-center mt-[5vh]">
              <img src={frontendMedia} alt="" className="h-[60%] rounded-2xl" />

              {uploadType !== "story" && (
                <input
                  type="text"
                  className="w-full border-b-gray-400 border-b-2 outline-none px-[10px] py-[5px] text-white mt-[20px]"
                  placeholder="write caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              )}
            </div>
          )}

          {mediaType === "video" && (
            <div className="w-[80%] max-w-[500px] h-[250px] flex flex-col items-center justify-center mt-[5vh]">
              <VideoPlayer media={frontendMedia} />

              {uploadType !== "story" && (
                <input
                  type="text"
                  className="w-full border-b-gray-400 border-b-2 outline-none px-[10px] py-[5px] text-white mt-[20px]"
                  placeholder="write caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              )}
            </div>
          )}
        </div>
      )}

      {frontendMedia && (
        <button
          disabled={isLoading}
          className="px-[10px] w-[60%] max-w-[400px] py-[5px] h-[50px] bg-white hover:bg-rose-400 mt-[50px] cursor-pointer rounded-2xl mb-[10px]"
          onClick={handleUpload}
        >
          {isLoading ? (
            <ClipLoader size={30} color="black" />
          ) : (
            `Upload ${uploadType}`
          )}
        </button>
      )}
    </div>
  );
};

export default Upload;
