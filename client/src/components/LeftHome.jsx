import React, { useState } from "react";
import { 
  Home as HomeIcon, 
  Search, 
  Compass, 
  Film, 
  MessageCircle, 
  Heart, 
  PlusSquare, 
  User, 
  ShieldCheck, 
  LogOut, 
  ShieldAlert,
  Sun,
  Moon,
  Monitor,
  Users
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import logo from "../assets/logo.png";
import dp from "../assets/dp3.png";
import { setUserData } from "../redux/features/userSlice";
import SearchModal from "./SearchModal";
import api from "../lib/axios";
import { useTheme } from "../lib/themeContext";
import { removeLinkedAccount, getNextAccount, setActiveAccountId } from "../lib/accountManager";
import { disconnectSocket, initializeSocket } from "../lib/socket";

const LeftHome = () => {
  const { userData } = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [showSearchModal, setShowSearchModal] = useState(false);
  const themeCtx = useTheme();

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
            toast.success(`Switched to @${switchRes.data.user.userName}`);
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
      toast.success("Logged out");
      navigate("/signin");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const navItems = [
    { label: "Home", icon: HomeIcon, path: "/" },
    { label: "Search", icon: Search, action: () => setShowSearchModal(true) },
    { label: "Explore", icon: Compass, path: "/explore" },
    { label: "Reels", icon: Film, path: "/reels" },
    { label: "Messages", icon: MessageCircle, path: "/messages" },
    { label: "Communities", icon: Users, path: "/communities" },
    { label: "Notifications", icon: Heart, path: "/notifications" },
    { label: "Create", icon: PlusSquare, path: "/upload" },
    { label: "Monetization", icon: ShieldCheck, path: "/monetization" },
    { label: "Security Center", icon: ShieldAlert, path: "/security" },
    { 
      label: "Profile", 
      icon: User, 
      path: `/profile/${userData?.user?.userName || ""}`,
      avatar: userData?.user?.profileImage?.url 
    },
  ];

  return (
    <aside className="w-[72px] xl:w-[245px] h-full border-r border-border bg-bg text-text hidden md:flex flex-col justify-between p-3 xl:py-4 xl:px-3 z-40 select-none overflow-hidden shrink-0">
      {/* Top Logo & Navigation */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto hide-scrollbar space-y-4 xl:space-y-5 pr-0.5 pb-4">
        {/* Logo Header */}
        <div 
          onClick={() => navigate("/")} 
          className="px-3 pt-2 cursor-pointer flex items-center gap-3 transition transform active:scale-95"
        >
          <img src={logo} alt="VYBE" className="h-7 w-auto object-contain hidden xl:block" style={{ filter: themeCtx.resolvedTheme === "dark" ? "none" : "invert(1)" }} />
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-600 flex items-center justify-center xl:hidden font-black text-white text-sm shadow-lg">
            V
          </div>
        </div>

        {/* Nav Links List */}
        <nav className="space-y-1">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = item.path && location.pathname === item.path;

            return (
              <div key={idx} className="relative group">
                <button
                  onClick={() => {
                    if (item.action) item.action();
                    else if (item.path) navigate(item.path);
                  }}
                  className={`w-full flex items-center gap-4 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-surface text-text font-bold"
                      : "text-text-secondary hover:text-text hover:bg-surface/80"
                  }`}
                >
                  {item.avatar ? (
                    <div className={`w-6 h-6 rounded-full overflow-hidden border-2 transition ${
                      isActive ? "border-text scale-110" : "border-border-strong group-hover:border-border-strong"
                    }`}>
                      <img src={item.avatar || dp} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <Icon className={`w-6 h-6 transition-transform duration-200 group-hover:scale-110 ${
                      isActive ? "text-text scale-105" : "text-text-secondary group-hover:text-text"
                    }`} />
                  )}

                  <span className="hidden xl:inline truncate">{item.label}</span>
                </button>

                {/* Right-side Instagram Hover Tooltip (Shown on Icon-Only Collapsed View) */}
                <div className="xl:hidden opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-4 transition-all duration-200 absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-surface border border-border text-text text-xs font-semibold rounded-lg shadow-2xl pointer-events-none whitespace-nowrap z-50 flex items-center gap-1">
                  <span>{item.label}</span>
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
    </aside>
  );
};

export default LeftHome;
