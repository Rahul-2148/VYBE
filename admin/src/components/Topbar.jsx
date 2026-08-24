import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Volume2, VolumeX, Bell, PanelLeftOpen, PanelLeftClose, Menu } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useAdminSocket } from "../context/AdminSocketContext";
import { useSidebar } from "../context/SidebarContext";
import { useSound } from "../context/SoundContext";
import AdminNotificationCenter from "./AdminNotificationCenter";
import SoundSettingsModal from "./SoundSettingsModal";

const ROUTE_TITLES = {
  "/": "Overview Dashboard",
  "/profile": "Admin Profile & Security Center",
  "/users": "User Directory & 360 Enforcement",
  "/moderation": "Single Review Tool (SRT) Moderation",
  "/live-streams": "Live Stream Safety & Intercept",
  "/verifications": "Blue Badge Identity Desk",
  "/finance": "Creator Monetization & Finance",
  "/broadcasts": "System Broadcasts & Alerts",
  "/staff": "Staff & RBAC Permissions",
  "/staff/register": "Register New Staff",
  "/audit-logs": "Security Audit Trail",
};

const ROLE_WORKSPACE = {
  superadmin: "Super Admin Command Center",
  admin: "Platform Admin Operations",
  moderator: "Trust & Safety Workspace",
  support: "Support & Verification Desk",
  finance: "Finance & Revenue Studio",
};

export const Topbar = () => {
  const { adminUser } = useAdminAuth();
  const { isConnected, unreadCount } = useAdminSocket();
  const { isCollapsed, toggleSidebar, mobileOpen, toggleMobileMenu } = useSidebar();
  const { isMuted } = useSound();
  const location = useLocation();
  const [timeStr, setTimeStr] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);

  useEffect(() => {
    const tick = () => {
      setTimeStr(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const role = adminUser?.role || "admin";
  const pageTitle = ROUTE_TITLES[location.pathname] || "Operations Portal";
  const workspaceName = ROLE_WORKSPACE[role] || "Operations Portal";

  return (
    <>
      <header className="h-14 px-3.5 sm:px-6 bg-[#0a0e16]/95 backdrop-blur-xl border-b border-white/[0.05] flex items-center justify-between sticky top-0 z-30 select-none">
        {/* Left — Mobile Drawer Hamburger & Breadcrumb */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Mobile Drawer Trigger (Shown only on mobile/tablets < lg) */}
          <button
            type="button"
            onClick={toggleMobileMenu}
            title={mobileOpen ? "Close Menu" : "Open Menu"}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition cursor-pointer shrink-0 lg:hidden border border-white/[0.06]"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-ping"
              }`}
            />
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider hidden md:inline truncate">
              {workspaceName}
            </span>
            <span className="text-zinc-700 hidden md:inline">/</span>
            <span className="text-[12px] sm:text-[13px] font-bold text-zinc-100 truncate">{pageTitle}</span>
          </div>
        </div>

        {/* Right — Notification Bell, Soundbox Audio Controls, Clock & Realtime Status */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Notification Center Trigger */}
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            title="Real-time notifications center"
            className="relative p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black animate-pulse shadow-lg shadow-rose-500/50">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Soundbox & Incident Audio Alerts Button */}
          <button
            type="button"
            onClick={() => setShowSoundSettings(true)}
            title={isMuted ? "Audio Muted — Click to configure Sound Box" : "Audio Active — Click to configure"}
            className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
              !isMuted
                ? "bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="text-[10px] font-bold uppercase hidden md:inline">
              {isMuted ? "Muted" : "Sound"}
            </span>
          </button>

          {/* Real-time Clock */}
          <span className="text-[11px] font-mono text-zinc-500 tabular-nums hidden lg:block">{timeStr}</span>

          {/* Live WebSocket Status Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl border text-[10px] font-bold ${
              isConnected
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/25 text-amber-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
              }`}
            />
            <span className="hidden sm:inline">{isConnected ? "LIVE" : "CONNECTING"}</span>
          </div>
        </div>
      </header>

      {/* Real-time Notifications Drawer */}
      <AdminNotificationCenter
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      {/* Sound Settings & Audio Synthesizer Modal */}
      <SoundSettingsModal
        isOpen={showSoundSettings}
        onClose={() => setShowSoundSettings(false)}
      />
    </>
  );
};

export default Topbar;
