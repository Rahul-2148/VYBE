import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import dp from "../assets/dp3.png";
import OtherUsers from "./OtherUsers";
import { setUserData } from "../redux/features/userSlice";
import api from "../lib/axios";
import GetSuggestedUsers from "../hooks/GetSuggestedUsers";
import AccountSwitcherModal from "./AccountSwitcherModal";

const RightHome = () => {
  GetSuggestedUsers();
  const { userData, suggestedUsers } = useSelector((state) => state.user);
  const dispatch = useDispatch();
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
                <BadgeCheck className="h-4 w-4 fill-[#0095f6] text-white shrink-0" />
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
            onClick={() => navigate("/explore")} 
            className="text-text hover:text-rose-400 text-[11px] cursor-pointer transition"
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

      {/* Instagram Footer Links */}
      <footer className="pt-6 border-t border-border/80 space-y-3 text-[11px] text-text-muted">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <a href="#" className="hover:underline">About</a> • 
          <a href="#" className="hover:underline">Help</a> • 
          <a href="#" className="hover:underline">Press</a> • 
          <a href="#" className="hover:underline">API</a> • 
          <a href="#" className="hover:underline">Jobs</a> • 
          <a href="#" className="hover:underline">Privacy</a> • 
          <a href="#" className="hover:underline">Terms</a>
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
