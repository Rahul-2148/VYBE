import axios from "axios";
import toast from "react-hot-toast";
import { FaRegHeart } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { SERVER_URL } from "../App";
import dp from "../assets/dp3.png";
import logo from "../assets/logo.png";
import { setUserData } from "../redux/features/userSlice";
import OtherUsers from "./OtherUsers";

const LeftHome = () => {
  const { userData, suggestedUsers } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

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

  return (
    <div className="w-[25%] hidden lg:block min-h-[100vh] bg-black border-r-2 border-gray-900">
      <div className="w-full h-[100px] flex items-center justify-between p-[20px]">
        <img src={logo} alt="" className="w-[80px]" />
        <div className="">
          <FaRegHeart className="text-white w-[25px] h-[25px] " />
        </div>
      </div>
      <div className="flex items-center w-full justify-between gap-[10px] px-[10px] border-b-2 border-gray-900 py-[10px]">
        <div className="flex items-center gap-[10px]">
          <div className="w-[70px] h-[70px] border-2 border-black rounded-full cursor-pointer overflow-hidden" onClick={() => navigate(`/profile/${userData?.user?.userName}`)}>
            <img
              src={userData?.user?.profileImage?.url || dp}
              alt=""
              className="w-full object-cover"
            />
          </div>
          <div className="">
            <div className="text-[18px] text-white font-semibold">
              {userData?.user?.userName}
            </div>
            <div className="text-[15px] text-gray-400 font-semibold">
              {userData?.user?.name}
            </div>
          </div>
        </div>
        <div
          className="text-blue-500 font-semibold cursor-pointer"
          onClick={handleLogOut}
        >
          Log Out
        </div>
      </div>

      <div className="w-full flex flex-col gap-[20px] p-[20px]">
        <h1 className="text-white text-[19px]">Suggested Users</h1>
        {suggestedUsers &&
          suggestedUsers.slice(0, 5).map((user, index) => {
            return <OtherUsers key={index} user={user} />;
          })}
      </div>
    </div>
  );
};

export default LeftHome;
