import { SquarePlay } from "lucide-react";
import { AiOutlinePlusSquare } from "react-icons/ai";
import { GoHomeFill } from "react-icons/go";
import { RiSearchLine } from "react-icons/ri";
import dp from "../assets/dp3.png";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const Navbar = () => {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);

  return (
    <div className="w-[90%] lg:w-[40%] h-[80px] bg-black flex justify-around items-center fixed bottom-[20px] rounded-full shadow-2xl shadow-[#000000] z-100">
      <div className="" onClick={() => navigate("/")}>
        <GoHomeFill className="w-[25px] h-[25px] text-white cursor-pointer" />
      </div>
      <div onClick={() => navigate("/search")}>
        <RiSearchLine className="w-[25px] h-[25px] text-white cursor-pointer" />
      </div>
      <div onClick={() => navigate("/upload")}>
        <AiOutlinePlusSquare className="w-[28px] h-[28px] text-white cursor-pointer" />
      </div>
      <div onClick={() => navigate("/loops")}>
        <SquarePlay className="w-[25px] h-[25px] text-white cursor-pointer" />
      </div>

      <div
        className="w-[40px] h-[40px] border-2 border-black rounded-full cursor-pointer overflow-hidden"
        onClick={() => navigate(`/profile/${userData?.user?.userName}`)}
      >
        <img
          src={userData?.user?.profileImage?.url || dp}
          alt=""
          className="w-full object-cover"
        />
      </div>
    </div>
  );
};

export default Navbar;
