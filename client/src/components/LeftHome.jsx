import React, { useState, useEffect } from "react";
import { 
  Home as HomeIcon, 
  Search, 
  Compass, 
  Film, 
  MessageCircle, 
  Heart, 
  PlusSquare, 
  Plus,
  User, 
  ShieldCheck, 
  LogOut, 
  ShieldAlert,
  Sun,
  Moon,
  Monitor,
  Users,
  Radio,
  Video,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { snackbar } from "../lib/snackbar";
import logo from "../assets/logo.png";
import dp from "../assets/dp3.png";
import { setUserData } from "../redux/features/userSlice";
import {
  clearUnreadNotifications,
  clearUnreadMessages,
  incrementUnreadNotifications,
  incrementUnreadMessages,
  setUnreadNotificationsCount,
  setUnreadMessagesCount,
} from "../redux/features/notificationSlice";
import SearchModal from "./SearchModal";
import VybeLiveModal from "./VybeLiveModal";
import api from "../lib/axios";
import { useTheme } from "../lib/themeContext";
import { removeLinkedAccount, getNextAccount, setActiveAccountId } from "../lib/accountManager";
import { disconnectSocket, initializeSocket, getSocket } from "../lib/socket";
import { triggerHaptic } from "../lib/interactiveEffects";

const LeftHome = () => {
  const { userData } = useSelector((state) => state.user);
  const { unreadNotificationsCount, unreadMessagesCount } = useSelector((state) => state.notification || {});
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showLiveModal, setShowLiveModal] = useState(false);
  const themeCtx = useTheme();

  const currentUserId = userData?.user?._id || userData?._id;

  // Fetch initial unread counts on mount
  useEffect(() => {
    if (!currentUserId) return;
    const fetchUnreadCounts = async () => {
      try {
        const [notifRes, msgRes] = await Promise.allSettled([
          api.get("/notification/unread-count"),
          api.get("/message/unread-count"),
        ]);
        if (notifRes.status === "fulfilled" && notifRes.value.data?.success) {
          dispatch(setUnreadNotificationsCount(notifRes.value.data.unreadCount ?? 0));
        }
        if (msgRes.status === "fulfilled" && msgRes.value.data?.success) {
          dispatch(setUnreadMessagesCount(msgRes.value.data.unreadCount ?? 0));
        }
      } catch (err) {
        console.warn("LeftHome: fetchUnreadCounts failed", err);
      }
    };
    fetchUnreadCounts();
  }, [currentUserId, dispatch]);

  // Real-time socket event listeners for instant left sidebar notification dot
  useEffect(() => {
    if (!currentUserId) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (data) => {
      const notif = data?.notification || data;
      if (location.pathname !== "/notifications") {
        dispatch(incrementUnreadNotifications(notif));
      }
    };

    const handleNewMessage = () => {
      if (!location.pathname.startsWith("/messages")) {
        dispatch(incrementUnreadMessages());
      }
    };

    socket.on("notification-received", handleNewNotification);
    socket.on("new-notification", handleNewNotification);
    socket.on("notification:received", handleNewNotification);
    socket.on("receive-message", handleNewMessage);
    socket.on("message:received", handleNewMessage);
    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("notification-received", handleNewNotification);
      socket.off("new-notification", handleNewNotification);
      socket.off("notification:received", handleNewNotification);
      socket.off("receive-message", handleNewMessage);
      socket.off("message:received", handleNewMessage);
      socket.off("new-message", handleNewMessage);
    };
  }, [currentUserId, location.pathname, dispatch]);

  const handleLogOut = async () => {
    const currentUserId = userData?.user?._id || userData?._id;
    try {
      await api.post("/auth/signout");

      // Remove this account from the multi-account registry
      removeLinkedAccount(currentUserId);

      // Check if there are other linked accounts to auto-switch to
      const nextAccount = getNextAccount(currentUserId);
      if (nextAccount) {
        // Auto-switch to next linked account
        try {
          disconnectSocket();
          const switchRes = await api.post("/auth/switch-account", { targetUserId: nextAccount.userId });
          if (switchRes.data?.success && switchRes.data?.user) {
            dispatch(setUserData(switchRes.data.user));
            setActiveAccountId(switchRes.data.user._id);
            try {
              localStorage.setItem("vybe_cached_user", JSON.stringify(switchRes.data.user));
            } catch (e) {
              console.warn("LeftHome: failed to write cached user on switch", e);
            }
            initializeSocket(switchRes.data.user._id);
            snackbar.success(`Switched to @${switchRes.data.user.userName}`);
            navigate("/", { replace: true });
            return;
          }
        } catch {
          // Switch failed — fall through to full logout
        }
      }

      // No other accounts or switch failed — full logout
      dispatch(setUserData(null));
      try {
        localStorage.removeItem("vybe_cached_user");
      } catch (e) {
        console.warn("LeftHome: failed to remove cached user on logout", e);
      }
      disconnectSocket();
      snackbar.success("Logged out");
      navigate("/signin", { replace: true });
    } catch {
      snackbar.error("Logout failed");
    }
  };

  const isNotificationsActive = location.pathname === "/notifications";
  const isMessagesActive = location.pathname.startsWith("/messages");

  // Auto clear unread state when navigating to those pages
  useEffect(() => {
    if (isNotificationsActive && unreadNotificationsCount > 0) {
      dispatch(clearUnreadNotifications());
    }
  }, [isNotificationsActive, unreadNotificationsCount, dispatch]);

  useEffect(() => {
    if (isMessagesActive && unreadMessagesCount > 0) {
      dispatch(clearUnreadMessages());
    }
  }, [isMessagesActive, unreadMessagesCount, dispatch]);

  const userProfileImage =
    userData?.user?.profileImage?.url ||
    userData?.profileImage?.url ||
    (typeof userData?.user?.profileImage === "string" ? userData.user.profileImage : null) ||
    (typeof userData?.profileImage === "string" ? userData.profileImage : null) ||
    dp;
  const currentUsername = userData?.user?.userName || userData?.userName || "";

  const navItems = [
    { label: "Home", icon: HomeIcon, path: "/" },
    { label: "Search", icon: Search, action: () => setShowSearchModal(true) },
    { label: "Explore", icon: Compass, path: "/explore" },
    { label: "Reels", icon: Film, path: "/reels" },
    { 
      label: "Messages", 
      icon: MessageCircle, 
      path: "/messages", 
      hasDot: unreadMessagesCount > 0 && !isMessagesActive 
    },
    { label: "Communities", icon: Users, path: "/communities" },
    { label: "Vybe Meet", icon: Video, path: "/meet" },
    { 
      label: "Notifications", 
      icon: Heart, 
      path: "/notifications", 
      hasDot: unreadNotificationsCount > 0 && !isNotificationsActive 
    },
    { label: "Go Live", icon: Radio, action: () => setShowLiveModal(true) },
    { label: "Create", icon: PlusSquare, path: "/upload" },
    { label: "Monetization", icon: ShieldCheck, path: "/monetization" },
    { label: "Security Center", icon: ShieldAlert, path: "/security" },
    { 
      label: "Profile", 
      isProfile: true,
      path: `/profile/${currentUsername}`,
      avatar: userProfileImage,
    },
  ];

  return (
    <aside className="w-[72px] xl:w-[245px] h-full border-r border-border bg-bg text-text hidden md:flex flex-col justify-between p-3 xl:py-4 xl:px-3 z-40 select-none overflow-hidden shrink-0">
      {/* Top Logo & Navigation */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto hide-scrollbar space-y-4 xl:space-y-5 pr-0.5 pb-4">
        {/* Logo & Quick Header Actions */}
        <div className="flex items-center justify-between px-2 pt-1">
          <div 
            onClick={() => {
              triggerHaptic("light");
              navigate("/");
            }} 
            className="cursor-pointer flex items-center gap-2.5 transition transform active:scale-95 group"
            title="VYBE Home"
          >
            <img src={logo} alt="VYBE" className="h-7 w-auto object-contain hidden xl:block theme-logo-adaptive" />
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center xl:hidden font-black text-white text-sm shadow-lg">
              V
            </div>
          </div>

          {/* Right Action Icons: Notification & Plus */}
          <div className="hidden xl:flex items-center gap-1">
            {/* Notification Button with live unread badge */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                navigate("/notifications");
              }}
              className={`relative p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                location.pathname === "/notifications"
                  ? "bg-surface text-rose-500 font-bold shadow-xs"
                  : "text-text-secondary hover:text-text hover:bg-surface/80"
              }`}
              title="Notifications"
              aria-label="Notifications"
            >
              <Heart className={`w-5 h-5 transition-transform duration-200 hover:scale-110 ${
                location.pathname === "/notifications" ? "fill-rose-500 text-rose-500" : ""
              }`} />
              {unreadNotificationsCount > 0 && location.pathname !== "/notifications" && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 ring-2 ring-bg"></span>
                </span>
              )}
            </button>

            {/* Plus / Create Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("medium");
                navigate("/upload");
              }}
              className={`relative p-2 rounded-xl transition-all duration-200 cursor-pointer ${
                location.pathname === "/upload"
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                  : "text-text-secondary hover:text-text hover:bg-surface/80"
              }`}
              title="Create Post, Reel, or Story"
              aria-label="Create"
            >
              <Plus className="w-5 h-5 transition-transform duration-200 hover:scale-110" />
            </button>
          </div>
        </div>

        {/* Nav Links List */}
        <nav className="space-y-1">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isProfileItem = item.isProfile && location.pathname.startsWith("/profile");
            const isActive =
              isProfileItem ||
              (item.path &&
                (location.pathname === item.path ||
                  (item.path === "/messages" && location.pathname.startsWith("/messages"))));

            return (
              <div key={idx} className="relative group">
                <button
                  onClick={() => {
                    triggerHaptic("light");
                    if (item.action) item.action();
                    else if (item.path) navigate(item.path);
                  }}
                  className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer interactive-tap ${
                    isActive
                      ? "bg-surface text-text font-bold shadow-sm"
                      : "text-text-secondary hover:text-text hover:bg-surface/80"
                  }`}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    {item.isProfile ? (
                      <div
                        className={`w-6 h-6 rounded-full overflow-hidden transition-all duration-200 shrink-0 ${
                          isActive
                            ? "ring-2 ring-text ring-offset-2 ring-offset-bg scale-110 shadow-sm"
                            : "border border-border/80 group-hover:border-text group-hover:scale-105"
                        }`}
                      >
                        <img
                          src={userProfileImage}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = dp;
                          }}
                        />
                      </div>
                    ) : (
                      <Icon className={`w-6 h-6 transition-transform duration-200 group-hover:scale-110 ${
                        isActive ? "text-text scale-105" : "text-text-secondary group-hover:text-text"
                      }`} />
                    )}

                    {/* Clean Pink Blinking Dot */}
                    {item.hasDot && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#ff3040] shadow-[0_0_8px_rgba(255,48,64,0.9)] animate-pulse ring-2 ring-bg" />
                    )}
                  </div>

                  <span className="hidden xl:inline truncate flex-1 text-left">{item.label}</span>

                  {/* Desktop Right Side Pink Dot */}
                  {item.hasDot && (
                    <span className="hidden xl:block w-2 h-2 rounded-full bg-[#ff3040] shadow-[0_0_6px_rgba(255,48,64,0.8)] animate-pulse ml-auto shrink-0" />
                  )}
                </button>

                {/* Right-side Hover Tooltip (Shown on Icon-Only Collapsed View) */}
                <div className="xl:hidden opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-4 transition-all duration-200 absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-surface border border-border text-text text-xs font-semibold rounded-lg shadow-2xl pointer-events-none whitespace-nowrap z-50 flex items-center gap-1.5">
                  <span>{item.label}</span>
                  {item.hasDot && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff3040] animate-ping" />
                  )}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Theme Controls */}
      <div className="pt-4 border-t border-border space-y-1">
        {/* Theme Toggle */}
        <div className="relative group">
          <button
            onClick={themeCtx.toggleTheme}
            className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-text hover:bg-surface/60 transition cursor-pointer"
            title={themeCtx.resolvedTheme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {themeCtx.resolvedTheme === 'dark' ? (
              <Moon className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
            ) : (
              <Sun className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
            )}
            <span className="hidden xl:inline">
              {themeCtx.resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
          </button>
          <div className="xl:hidden opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-4 transition-all duration-200 absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-surface border border-border text-text text-xs font-semibold rounded-lg shadow-2xl pointer-events-none whitespace-nowrap z-50">
            {themeCtx.resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </div>
        </div>

        <div className="relative group">
          <button
            onClick={handleLogOut}
            className="w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="hidden xl:inline">Log Out</span>
          </button>
          <div className="xl:hidden opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-4 transition-all duration-200 absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-surface border border-border text-rose-400 text-xs font-semibold rounded-lg shadow-2xl pointer-events-none whitespace-nowrap z-50">
            Log Out
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {showSearchModal && <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />}

      {/* Live Stream Broadcast Modal */}
      {showLiveModal && <VybeLiveModal isOpen={showLiveModal} onClose={() => setShowLiveModal(false)} />}
    </aside>
  );
};

export default LeftHome;
