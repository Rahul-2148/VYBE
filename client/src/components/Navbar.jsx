import { MessageCircle, Users, Plus, Heart } from "lucide-react";
import { GoHomeFill } from "react-icons/go";
import dp from "../assets/dp3.png";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { triggerHaptic } from "../lib/interactiveEffects";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useSelector((state) => state.user);
  const { unreadNotificationsCount, unreadMessagesCount } = useSelector((state) => state.notification || {});

  const handleNav = (path) => {
    triggerHaptic("light");
    navigate(path);
  };

  return (
    <div
      className="w-[92%] max-w-[420px] h-14 bg-surface-inset/90 border border-border/80 backdrop-blur-xl flex justify-around items-center fixed left-1/2 -translate-x-1/2 rounded-full shadow-2xl z-50 md:hidden select-none px-2"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <button 
        onClick={() => handleNav("/")} 
        className={`p-2 rounded-full transition-transform active:scale-90 interactive-tap ${location.pathname === "/" ? "text-text scale-110" : "text-text-secondary hover:text-text"}`}
      >
        <GoHomeFill className="w-6 h-6" />
      </button>

      <button 
        onClick={() => handleNav("/communities")} 
        className={`p-2 rounded-full transition-transform active:scale-90 interactive-tap ${location.pathname === "/communities" ? "text-text scale-110" : "text-text-secondary hover:text-text"}`}
      >
        <Users className="w-6 h-6" />
      </button>

      <button 
        onClick={() => handleNav("/upload")} 
        className={`p-2 rounded-full bg-gradient-to-tr from-pink-500 to-rose-600 text-white shadow-lg transition-transform active:scale-90 interactive-tap`}
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* Notifications Button with Glowing Unread Dot */}
      <button 
        onClick={() => handleNav("/notifications")} 
        className={`p-2 rounded-full relative transition-transform active:scale-90 interactive-tap ${location.pathname === "/notifications" ? "text-text scale-110" : "text-text-secondary hover:text-text"}`}
      >
        <Heart className={`w-6 h-6 ${unreadNotificationsCount > 0 && location.pathname !== "/notifications" ? "text-rose-500" : ""}`} />
        {unreadNotificationsCount > 0 && location.pathname !== "/notifications" && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ff3040] shadow-[0_0_8px_rgba(255,48,64,0.9)] animate-pulse ring-2 ring-surface-inset" />
        )}
      </button>

      {/* Messages Button with Unread Dot */}
      <button 
        onClick={() => handleNav("/messages")} 
        className={`p-2 rounded-full relative transition-transform active:scale-90 interactive-tap ${location.pathname.startsWith("/messages") ? "text-text scale-110" : "text-text-secondary hover:text-text"}`}
      >
        <MessageCircle className="w-6 h-6" />
        {unreadMessagesCount > 0 && !location.pathname.startsWith("/messages") && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#ff3040] shadow-[0_0_8px_rgba(255,48,64,0.9)] animate-pulse ring-2 ring-surface-inset" />
        )}
      </button>

      <button
        className="w-7 h-7 rounded-full border-2 border-border-strong overflow-hidden cursor-pointer active:scale-90 transition-transform interactive-tap"
        onClick={() => handleNav(`/profile/${userData?.user?.userName}`)}
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
