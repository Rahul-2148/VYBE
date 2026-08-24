import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  ShieldAlert,
  CheckCircle2,
  Radio,
  Lock,
  BellRing,
  Check,
  Trash2,
  X,
  ExternalLink,
  Clock,
  Sparkles,
} from "lucide-react";
import { useAdminSocket } from "../context/AdminSocketContext";

const getRelativeTime = (isoString) => {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(isoString).toLocaleDateString();
};

export const AdminNotificationCenter = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    clearAllNotifications,
  } = useAdminSocket();
  const [filter, setFilter] = useState("all"); // "all", "report", "verification", "stream", "audit"

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (filter === "all") return true;
    return n.type === filter;
  });

  const handleNotificationClick = (item) => {
    markAsRead(item.id);
    if (item.link) {
      navigate(item.link);
      onClose();
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "report":
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case "verification":
        return <CheckCircle2 className="w-4 h-4 text-sky-400" />;
      case "stream":
        return <Radio className="w-4 h-4 text-emerald-400" />;
      case "audit":
        return <Lock className="w-4 h-4 text-purple-400" />;
      case "broadcast":
      default:
        return <BellRing className="w-4 h-4 text-amber-400" />;
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "high":
        return "border-l-2 border-l-rose-500 bg-rose-500/[0.04]";
      case "normal":
        return "border-l-2 border-l-sky-500 bg-sky-500/[0.04]";
      default:
        return "border-l-2 border-l-purple-500 bg-purple-500/[0.02]";
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm select-none font-sans animate-fade-in"
    >
      <div
        className="w-full max-w-full sm:max-w-md h-full bg-[#0d111a] border-l border-white/[0.1] shadow-2xl flex flex-col animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-rose-950/30 to-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white font-['Outfit']">Operations Center</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Real-time incident and staff event stream.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills & Actions Bar */}
        <div className="p-3 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
            {[
              { id: "all", label: "All" },
              { id: "report", label: "Incidents" },
              { id: "verification", label: "Badges" },
              { id: "stream", label: "Streams" },
              { id: "audit", label: "Security" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  filter === tab.id
                    ? "bg-white/[0.12] text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                title="Mark all as read"
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-bold text-zinc-300 transition flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Read All</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAllNotifications}
                title="Clear all alerts"
                className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/80 mx-auto" />
              <p className="text-sm font-bold text-white font-['Outfit']">All Operations Clear</p>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                No active notifications or alerts. New real-time WebSocket events will arrive here automatically.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                  item.isRead
                    ? "bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]"
                    : `${getPriorityStyle(item.priority)} border-white/[0.1] shadow-lg shadow-black/40`
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/[0.05] border border-white/[0.08] shrink-0 mt-0.5">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-white truncate">{item.title}</p>
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                        {getRelativeTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed line-clamp-2">{item.message}</p>
                  </div>
                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationCenter;
