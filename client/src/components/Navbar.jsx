import { MessageCircle, Users, Plus } from "lucide-react";
import { GoHomeFill } from "react-icons/go";
import dp from "../assets/dp3.png";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useSelector((state) => state.user);

  return (
    <div
      className="w-[92%] max-w-[400px] h-14 bg-surface-inset/90 border border-border/80 backdrop-blur-xl flex justify-around items-center fixed left-1/2 -translate-x-1/2 rounded-full shadow-2xl z-50 md:hidden select-none"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <button 
        onClick={() => navigate("/")} 
        className={`p-2 rounded-full transition ${location.pathname === "/" ? "text-text scale-110" : "text-text-secondary hover:text-text"}`}
      >
        <GoHomeFill className="w-6 h-6" />
      </button>

      <button 
        onClick={() => navigate("/communities")} 
        className={`p-2 rounded-full transition ${location.pathname === "/communities" ? "text-text scale-110" : "text-text-secondary hover:text-text"}`}
      >
        <Users className="w-6 h-6" />
      </button>

      <button 
        onClick={() => navigate("/upload")} 
        className={`p-2 rounded-full transition ${location.pathname === "/upload" ? "text-text scale-110" : "text-text-secondary hover:text-text"}`}
      >
        <Plus className="w-6 h-6" />
      </button>

      <button 
        onClick={() => navigate("/messages")} 
        className={`p-2 rounded-full transition ${location.pathname.startsWith("/messages") ? "text-text scale-110" : "text-text-secondary hover:text-text"}`}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      <button
        className="w-8 h-8 rounded-full border border-border-strong overflow-hidden cursor-pointer active:scale-95 transition"
        onClick={() => navigate(`/profile/${userData?.user?.userName}`)}
      >
        <img
          src={userData?.user?.profileImage?.url || dp}
          alt=""
          className="w-full h-full object-cover"
        />
      </button>
    </div>
  );
};

export default Navbar;
