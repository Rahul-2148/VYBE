import axios from "axios";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { SERVER_URL } from "../App";
import dp from "../assets/dp3.png";
import Navbar from "../components/Navbar";
import { setProfileData, setUserData } from "../redux/features/userSlice";
import ProfileQrModal from "../components/ProfileQRModal";
import FollowButton from "../components/FollowButton";
import InfoSheet from "../components/InfoSheet";
import Post from "../components/Post";
import { Info } from "lucide-react";
import { setSelectedChatUser } from "../redux/features/messageSlice";

const Profile = () => {
  const { profileData, userData } = useSelector((state) => state.user);
  const { postData } = useSelector((state) => state.post);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showQRModal, setShowQRModal] = useState(false);
  const [postType, setPostType] = useState("posts");
  const [showDpView, setShowDpView] = useState(false);
  const [showInfoSheet, setShowInfoSheet] = useState(false);

  const { userName } = useParams();
  const handleProfile = async () => {
    try {
      const result = await axios.get(
        `${SERVER_URL}/api/v1/user/getProfile/${userName}`,
        {
          withCredentials: true,
        }
      );
      dispatch(setProfileData(result.data));
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    handleProfile();
  }, [userName, dispatch]);

  const handleLogOut = async () => {
    try {
      const result = await axios.post(
        `${SERVER_URL}/api/v1/auth/signout`,
        {},
        { withCredentials: true }
      );

      dispatch(setUserData(null));
      toast.success(result.data.message);
      navigate("/signin");
    } catch (error) {
      toast.error(error.response?.data?.message);
    }
  };

  const isOwnProfile = profileData?.user?._id === userData?.user?._id;

  const handleMessage = async () => {
    const res = await axios.post(
      `${SERVER_URL}/api/v1/conversation/one-to-one`,
      { userId: profileData.user._id },
      { withCredentials: true }
    );

    dispatch(
      setSelectedChatUser({
        conversationId: res.data.conversation._id,
        user: profileData.user,
      })
    );

    navigate("/messageArea");
  };

  return (
    <div className="w-full min-h-screen bg-black">
      <div className="w-full h-[80px] flex justify-between items-center px-[30px] text-white">
        <div onClick={() => navigate("/")}>
          <MdOutlineKeyboardBackspace className="w-[25px] h-[25px] text-white cursor-pointer" />
        </div>
        <div className="font-semibold text-[20px]">
          <span className="text-rose-500">@</span>
          {profileData?.user?.userName}
        </div>
        <div
          className="font-semibold text-[20px] cursor-pointer text-blue-500"
          onClick={handleLogOut}
        >
          Log Out
        </div>
      </div>

      <div className="w-full h-[150px] flex items-start gap-[20px] lg:gap-[50px] pt-[20px] px-[10px] justify-center">
        <div
          className="w-[80px] h-[80px] md:w-[140px] md:h-[140px] border-2 border-black rounded-full cursor-pointer overflow-hidden"
          onClick={() => {
            setShowDpView(true);
            document.body.classList.add("overflow-hidden", "hide-scrollbar");
          }}
        >
          <img
            src={profileData?.user?.profileImage?.url || dp}
            alt=""
            className="w-full object-cover"
          />
        </div>

        <div className="">
          <div className="font-semibold text-[22px] text-white">
            {profileData?.user?.name}
          </div>
          <div className="text-[17px] text-[#ffffffe8]">
            {profileData?.user?.profession || "Profession"}
          </div>
          <div className="text-[15px] text-[#ffffffe8]">
            {profileData?.user?.bio}
          </div>
          <div className="text-[14px] text-[#ffffffe8]">
            {profileData?.user?.email}
          </div>
        </div>
      </div>

      <div className="w-full h-[100px] flex items-center justify-center gap-[40px] md:gap-[60px] px-[20%] pt-[30px] text-white">
        {/* posts */}
        <div>
          <div className="text-white text-[22px] md:text-[30px] font-semibold">
            {profileData?.user?.posts?.length || 0}
          </div>
          <div className="text-[18px] md:text-[22px] text-[#ffffffc7]">
            Posts
          </div>
        </div>

        {/* followers */}
        <div>
          <div className="flex items-center justify-center gap-[20px]">
            <div className="flex relative">
              {profileData?.user?.followers?.slice(0, 3).map((user, index) => {
                return (
                  <div
                    key={user._id}
                    className={`w-[40px] h-[40px] border-2 border-black rounded-full cursor-pointer overflow-hidden ${
                      index > 0 ? `absolute left-[${index * 9}px]` : ""
                    }`}
                  >
                    <img
                      src={profileData?.user?.profileImage?.url || dp}
                      alt=""
                      className="w-full object-cover"
                    />
                  </div>
                );
              })}
            </div>
            <div className="text-white text-[22px] md:text-[30px] font-semibold">
              {profileData?.user?.followers?.length || 0}
            </div>
          </div>
          <div className="text-[18px] md:text-[22px] text-[#ffffffc7]">
            Followers
          </div>
        </div>

        {/* following */}
        <div>
          <div className="flex items-center justify-center gap-[20px]">
            <div className="flex relative">
              {profileData?.user?.following?.slice(0, 3).map((user, index) => (
                <div
                  className={`w-[40px] h-[40px] border-2 border-black rounded-full cursor-pointer overflow-hidden ${
                    index > 0 ? `absolute left-[${index * 9}px]` : ""
                  }`}
                >
                  <img
                    src={user?.profileImage?.url || dp}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            <div className="text-white text-[22px] md:text-[30px] font-semibold">
              {profileData?.user?.following?.length || 0}
            </div>
          </div>
          <div className="text-[18px] md:text-[22px] text-[#ffffffc7]">
            Following
          </div>
        </div>
      </div>

      <div className="w-full h-[80px] flex justify-center items-center gap-[20px] mt-[10px]">
        {profileData?.user?._id === userData?.user?._id ? (
          <div className="flex items-center justify-center gap-4">
            <button
              className="px-4 py-2 min-w-[150px] h-[40px] bg-white rounded-2xl"
              onClick={() => navigate("/edit-profile")}
            >
              Edit Profile
            </button>

            <button
              className="px-4 py-2 min-w-[150px] h-[40px] bg-purple-600 text-white rounded-2xl"
              onClick={() => setShowQRModal(true)}
            >
              Share Profile
            </button>

            {/* Info */}
            <button
              onClick={() => setShowInfoSheet(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-mdshadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Info className="w-5 h-5 text-black/80" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <FollowButton
              targetUserId={profileData?.user?._id}
              tailwind="px-4 py-2 min-w-[130px] h-[40px] bg-white rounded-2xl"
              onFollowChange={handleProfile}
            />

            <button
              className="px-4 py-2 min-w-[130px] h-[40px] bg-white rounded-2xl"
              onClick={handleMessage}
            >
              Message
            </button>

            {/* Info button */}
            <button
              onClick={() => setShowInfoSheet(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-mdshadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Info className="w-5 h-5 text-black/80" />
            </button>
          </div>
        )}
      </div>

      <div className="w-full min-h-[100vh] flex justify-center">
        <div className="w-full max-w-[900px] flex flex-col items-center rounded-t-[30px] bg-white relative gap-[20px] pt-[30px] pb-[100px]">
          {isOwnProfile && (
            <>
              <div className="w-[90%] mx-auto h-[70px] flex justify-center gap-3">
                <button
                  // role="button"
                  // tabIndex={0}
                  className={`w-[45%] flex justify-center items-center rounded-full cursor-pointer font-semibold text-[18px transition-all duration-300 hover:bg-black hover:text-white hover:shadow-2xl hover:shadow-black ${
                    postType === "posts"
                      ? "bg-black text-white shadow-2xl shadow-black"
                      : "bg-white text-black"
                  }`}
                  onClick={() => setPostType("posts")}
                >
                  Posts
                </button>

                <button
                  // role="button"
                  // tabIndex={0}
                  className={`w-[45%] flex justify-center items-center rounded-full cursor-pointer font-semibold text-[18px transition-all duration-300 hover:bg-black hover:text-white hover:shadow-2xl hover:shadow-black ${
                    postType === "savedPosts"
                      ? "bg-black text-white shadow-2xl shadow-black"
                      : "bg-white text-black"
                  }`}
                  onClick={() => setPostType("savedPosts")}
                >
                  Saved Posts
                </button>
              </div>

              <Navbar />
            </>
          )}

          {/* OWN PROFILE */}
          {isOwnProfile &&
            postType === "posts" &&
            postData?.map((post) => {
              if (post?.author?._id === profileData?.user?._id) {
                return <Post key={post._id} post={post} />;
              }
            })}

          {isOwnProfile &&
            postType === "savedPosts" &&
            postData
              ?.filter((post) =>
                userData?.user?.savedPosts?.includes(post?._id)
              )
              ?.map((post) => <Post key={post._id} post={post} />)}

          {!isOwnProfile &&
            postData?.map((post) => {
              if (post?.author?._id === profileData?.user?._id) {
                return <Post key={post._id} post={post} />;
              }
            })}
        </div>
      </div>

      {showQRModal && (
        <ProfileQrModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          user={profileData?.user}
        />
      )}

      <InfoSheet
        isOpen={showInfoSheet}
        onClose={() => setShowInfoSheet(false)}
        user={profileData?.user}
        onOpenQR={() => setShowQRModal(true)}
        hideQR={isOwnProfile}
      />

      {showDpView && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex justify-center items-center z-[9999] animate-fadeIn"
          onClick={() => {
            setShowDpView(false);
            document.body.classList.remove("overflow-hidden");
          }}
        >
          <img
            src={profileData?.user?.profileImage?.url || dp}
            className="max-w-[90%] max-h-[90%] rounded-full animate-zoomIn object-contain"
            alt="Profile"
          />
        </div>
      )}
    </div>
  );
};

export default Profile;
