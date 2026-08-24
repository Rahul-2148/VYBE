import React from "react";
import { Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import dp from "../assets/dp3.png";
import { triggerHaptic } from "../lib/interactiveEffects";

const LiveStoryDp = ({ stream }) => {
  const navigate = useNavigate();
  const host = stream?.host || {};
  const userName = host.userName || host.name || "Creator";
  const profileImage = host.profileImage?.url || dp;

  const handleClick = () => {
    triggerHaptic("medium");
    if (stream?._id) {
      navigate(`/live/${stream._id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="flex flex-col w-[76px] items-center gap-1.5 shrink-0 select-none group relative cursor-pointer"
      title={`Watch @${userName}'s LIVE broadcast`}
    >
      <div className="w-[74px] h-[74px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#833ab4] via-[#fd1d1d] to-[#fcb045] flex items-center justify-center transition-all duration-300 transform group-hover:scale-105 active:scale-95 relative z-10 shadow-lg shadow-pink-500/25 ring-2 ring-rose-500/50 animate-pulse">
        <div className="w-full h-full bg-bg rounded-full p-[2px] relative overflow-hidden">
          <img
            src={profileImage}
            alt=""
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      </div>

      {/* Bold Instagram LIVE Badge at bottom of circle */}
      <div className="absolute bottom-[18px] bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-sm border-2 border-bg shadow-lg z-20 flex items-center gap-1 tracking-wider">
        <Radio className="w-2.5 h-2.5 animate-pulse" />
        <span>LIVE</span>
      </div>

      <div className="text-[11px] font-bold text-rose-500 truncate w-full text-center tracking-tight">
        {userName}
      </div>
    </div>
  );
};

export default LiveStoryDp;
