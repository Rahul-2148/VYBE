import React, { useState, useRef } from "react";
import { Search } from "lucide-react";
import { GoHome, GoHomeFill } from "react-icons/go";
import dp from "../assets/dp3.png";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { triggerHaptic } from "../lib/interactiveEffects";
import AccountSwitcherModal from "./AccountSwitcherModal";

// Exact Reels Icon
const ReelsIcon = ({ className = "w-6 h-6", filled = false }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    className={className}
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={filled ? "0" : "2"}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {filled ? (
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 8.5C3 5.46243 5.46243 3 8.5 3H15.5C18.5376 3 21 5.46243 21 8.5V15.5C21 18.5376 18.5376 21 15.5 21H8.5C5.46243 21 3 18.5376 3 15.5V8.5ZM9.75 8.25C9.75 7.67264 10.375 7.31174 10.875 7.60042L16.082 10.6074C16.582 10.8961 16.582 11.6179 16.082 11.9066L10.875 14.9136C10.375 15.2023 9.75 14.8414 9.75 14.264V8.25Z"
        fill="currentColor"
      />
    ) : (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5.5" stroke="currentColor" strokeWidth="2" fill="none" />
        <path
          d="M10 8.25C10 7.67264 10.625 7.31174 11.125 7.60042L15.832 10.6074C16.332 10.8961 16.332 11.6179 15.832 11.9066L11.125 14.9136C10.625 15.2023 10 14.8414 10 14.264V8.25Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    )}
  </svg>
);

// Exact Direct Message / Messenger Paper Airplane Icon
const DirectMessageIcon = ({ className = "w-6 h-6", filled = false }) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    className={className}
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={filled ? "0" : "2"}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {filled ? (
      <path
        fill="currentColor"
        d="M22.02 2.45a1.25 1.25 0 0 0-1.32-.28L2.68 9.38a1.25 1.25 0 0 0-.08 2.33l6.98 3.5 3.5 6.98a1.25 1.25 0 0 0 2.33-.08l7.21-18.02a1.25 1.25 0 0 0-.6-.64zM10.2 13.8l-4.7-2.35 13.9-5.56-9.2 7.91zm2.35 4.7l-2.35-4.7 7.91-9.2-5.56 13.9z"
      />
    ) : (
      <path
        d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </svg>
);

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useSelector((state) => state.user);
  const { unreadMessagesCount } = useSelector((state) => state.notification || {});

  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const pressTimer = useRef(null);
  const lastTapRef = useRef(0);

  const handleNav = (path) => {
    triggerHaptic("light");
    navigate(path);
  };

  const handleProfileTouchStart = () => {
    pressTimer.current = setTimeout(() => {
      triggerHaptic("medium");
      setShowAccountSwitcher(true);
    }, 450); // 450ms long press opens Account Switcher like Instagram
  };

  const handleProfileTouchEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  };

  const handleProfileClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected -> Open Account Switcher
      triggerHaptic("medium");
      setShowAccountSwitcher(true);
    } else {
      // Single tap -> Navigate to own profile
      handleNav(`/profile/${userData?.user?.userName || ""}`);
    }
    lastTapRef.current = now;
  };

  const isHome = location.pathname === "/";
  const isReels = location.pathname.startsWith("/reels");
  const isMessages = location.pathname.startsWith("/messages");
  const isExplore = location.pathname.startsWith("/explore");
  const isProfile = location.pathname.startsWith("/profile");

  return (
    <nav
      className="w-full min-h-[3.5rem] h-[calc(3.5rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-bg/95 border-t border-border/80 backdrop-blur-xl flex justify-around items-center fixed bottom-0 left-0 right-0 z-50 md:hidden select-none px-1"
    >
      {/* 1. Home */}
      <button
        onClick={() => handleNav("/")}
        className="flex-1 flex justify-center items-center py-2 transition-transform active:scale-90 interactive-tap text-text"
        title="Home"
      >
        {isHome ? (
          <GoHomeFill className="w-7 h-7 text-text" />
        ) : (
          <GoHome className="w-7 h-7 text-text hover:text-text" />
        )}
      </button>

      {/* 2. Reels (Exact Social Reels Icon) */}
      <button
        onClick={() => handleNav("/reels")}
        className="flex-1 flex justify-center items-center py-2 transition-transform active:scale-90 interactive-tap text-text"
        title="Reels"
      >
        <ReelsIcon className="w-6 h-6 text-text" filled={isReels} />
      </button>

      {/* 3. Direct Messages (Exact Airplane/DM Icon) */}
      <button
        onClick={() => handleNav("/messages")}
        className="flex-1 flex justify-center items-center py-2 relative transition-transform active:scale-90 interactive-tap text-text"
        title="Messages"
      >
        <DirectMessageIcon className="w-6 h-6 text-text" filled={isMessages} />
        {unreadMessagesCount > 0 && !isMessages && (
          <span className="absolute top-1.5 right-[24%] w-2.5 h-2.5 rounded-full bg-[#ff3040] shadow-[0_0_8px_rgba(255,48,64,0.9)] ring-2 ring-bg animate-pulse" />
        )}
      </button>

      {/* 4. Search & Explore */}
      <button
        onClick={() => handleNav("/explore")}
        className="flex-1 flex justify-center items-center py-2 transition-transform active:scale-90 interactive-tap text-text"
        title="Search & Explore"
      >
        <Search className={`w-6 h-6 text-text ${isExplore ? "stroke-[3]" : "stroke-[2]"}`} />
      </button>

      {/* 5. Profile */}
      <button
        onClick={handleProfileClick}
        onTouchStart={handleProfileTouchStart}
        onTouchEnd={handleProfileTouchEnd}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowAccountSwitcher(true);
        }}
        className="flex-1 flex justify-center items-center py-2 transition-transform active:scale-90 interactive-tap"
        title="Profile (Long press or double-tap to switch account)"
      >
        <div
          className={`w-7 h-7 rounded-full overflow-hidden transition-all ${isProfile
              ? "ring-2 ring-text ring-offset-2 ring-offset-bg scale-105"
              : "border border-border/80 opacity-90 hover:opacity-100"
            }`}
        >
          <img
            src={userData?.user?.profileImage?.url || dp}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </button>

      {/* Account Switcher Modal for Mobile */}
      <AccountSwitcherModal
        isOpen={showAccountSwitcher}
        onClose={() => setShowAccountSwitcher(false)}
      />
    </nav>
  );
};

export default Navbar;
