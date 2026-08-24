import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Lock } from "lucide-react";
import dp from "../assets/dp3.png";
import OtherUsers from "./OtherUsers";
import GetSuggestedUsers from "../hooks/GetSuggestedUsers";
import AccountSwitcherModal from "./AccountSwitcherModal";
import VerifiedBadge from "./VerifiedBadge";

const RightHome = () => {
  GetSuggestedUsers();
  const { userData, suggestedUsers } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [showSwitcher, setShowSwitcher] = useState(false);

  return (
    <aside className="w-[320px] hidden xl:flex flex-col gap-6 p-6 h-full border-l border-border bg-bg text-text z-30 select-none overflow-y-auto hide-scrollbar shrink-0">
      {/* Current User Profile Card */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div 
          onClick={() => navigate(`/profile/${userData?.user?.userName}`)} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full overflow-hidden border border-border p-0.5 group-hover:border-rose-500 transition">
            <img 
              src={userData?.user?.profileImage?.url || dp} 
              alt="" 
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-text group-hover:underline truncate max-w-[130px] flex items-center gap-0.5">
              {userData?.user?.userName}
              {userData?.user?.isVerified && (
                <VerifiedBadge size="xs" />
              )}
              {userData?.user?.accountType === "private" && (
                <Lock className="w-3 h-3 text-text-muted ml-0.5 shrink-0" />
              )}
            </span>
            <span className="text-[11px] text-text-secondary truncate max-w-[130px]">
              {userData?.user?.name}
            </span>
          </div>
        </div>

        <button 
          onClick={() => setShowSwitcher(true)} 
          className="text-xs font-bold text-rose-500 hover:text-rose-400 cursor-pointer transition"
        >
          Switch
        </button>
      </div>

      {/* Suggested Creators Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-text-secondary">Suggested for you</span>
          <button 
            onClick={() => navigate("/explore?tab=accounts")} 
            className="text-text hover:text-rose-400 text-[11px] cursor-pointer transition font-semibold"
          >
            See All
          </button>
        </div>

        {/* Suggested Creators List */}
        <div className="space-y-3">
          {suggestedUsers && suggestedUsers.length > 0 ? (
            suggestedUsers.slice(0, 5).map((user) => (
              <OtherUsers key={user._id} user={user} />
            ))
          ) : (
            <div className="text-xs text-text-muted py-4 text-center">No suggested accounts right now</div>
          )}
        </div>
      </div>

      {/* Enterprise Footer Links */}
      <footer className="pt-6 border-t border-border/80 space-y-3 text-[11px] text-text-muted">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 font-medium">
          <button onClick={() => navigate("/about")} className="hover:text-text hover:underline transition cursor-pointer">About</button> • 
          <button onClick={() => navigate("/help")} className="hover:text-text hover:underline transition cursor-pointer">Help</button> • 
          <button onClick={() => navigate("/press")} className="hover:text-text hover:underline transition cursor-pointer">Press</button> • 
          <button onClick={() => navigate("/api")} className="hover:text-text hover:underline transition cursor-pointer">API</button> • 
          <button onClick={() => navigate("/jobs")} className="hover:text-text hover:underline transition cursor-pointer">Jobs</button> • 
          <button onClick={() => navigate("/privacy")} className="hover:text-text hover:underline transition cursor-pointer">Privacy</button> • 
          <button onClick={() => navigate("/terms")} className="hover:text-text hover:underline transition cursor-pointer">Terms</button>
        </div>
        <p className="font-semibold text-text-muted uppercase tracking-wider text-[10px]">
          © 2026 VYBE FROM CREATORS
        </p>
      </footer>
      <AccountSwitcherModal
        isOpen={showSwitcher}
        onClose={() => setShowSwitcher(false)}
      />
    </aside>
  );
};

export default RightHome;
