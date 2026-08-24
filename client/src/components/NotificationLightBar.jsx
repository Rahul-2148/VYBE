import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, UserPlus, AtSign, X, Bell } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { getSocket } from "../lib/socket";
import { microAudio, triggerHaptic } from "../lib/interactiveEffects";
import {
  incrementUnreadNotifications,
  incrementUnreadMessages,
  setUnreadNotificationsCount,
  dismissLightBar,
} from "../redux/features/notificationSlice";
import api from "../lib/axios";
import dp from "../assets/dp3.png";

export const NotificationLightBar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { latestNotification, lightBarActive } = useSelector((s) => s.notification);
  const { userData } = useSelector((s) => s.user);
  const currentUserId = userData?.user?._id || userData?._id;

  const [activeBanner, setActiveBanner] = useState(null);

  // Fetch initial unread notification count
  useEffect(() => {
    if (!currentUserId) return;
    const fetchUnread = async () => {
      try {
        const res = await api.get("/notification/unread-count");
        if (res.data?.success) {
          dispatch(setUnreadNotificationsCount(res.data.unreadCount ?? res.data.count ?? 0));
        }
      } catch {
        // Silent fallback
      }
    };
    fetchUnread();
  }, [currentUserId, dispatch]);

  // Listen to socket events for real-time notifications
  useEffect(() => {
    if (!currentUserId) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNotification = (data) => {
      const notif = data?.notification || data;
      if (!notif) return;

      // Avoid displaying banner if already on notifications page
      if (location.pathname === "/notifications") return;

      // Play audio chime and trigger haptic pulse
      microAudio.playNotificationChime();
      triggerHaptic("notification");

      dispatch(incrementUnreadNotifications(notif));
      setActiveBanner(notif);

      // Auto-hide banner after 4.5 seconds
      setTimeout(() => {
        setActiveBanner((current) => (current?._id === notif._id ? null : current));
        dispatch(dismissLightBar());
      }, 4500);
    };

    const handleMessage = () => {
      if (location.pathname.startsWith("/messages")) return;
      dispatch(incrementUnreadMessages());
      microAudio.playBubble();
      triggerHaptic("light");
    };

    socket.on("new-notification", handleNotification);
    socket.on("receiveMessage", handleMessage);

    return () => {
      socket.off("new-notification", handleNotification);
      socket.off("receiveMessage", handleMessage);
    };
  }, [currentUserId, dispatch, location.pathname]);

  // Fallback to latestNotification from Redux
  useEffect(() => {
    if (latestNotification && lightBarActive) {
      const showTimer = setTimeout(() => {
        setActiveBanner(latestNotification);
      }, 0);
      const dismissTimer = setTimeout(() => {
        setActiveBanner((current) => (current?._id === latestNotification._id ? null : current));
        dispatch(dismissLightBar());
      }, 4500);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(dismissTimer);
      };
    }
  }, [latestNotification, lightBarActive, dispatch]);

  const getMessage = (notif) => {
    if (!notif) return "";
    const sender = notif.sender?.userName || notif.author?.userName || "Someone";
    switch (notif.type) {
      case "like":
        return `${sender} liked your post.`;
      case "comment":
        return `${sender} commented on your post.`;
      case "follow":
        return `${sender} started following you.`;
      case "follow_request":
        return `${sender} sent you a follow request.`;
      case "mention":
        return `${sender} mentioned you in a comment.`;
      default:
        return notif.message || `${sender} interacted with you.`;
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "like":
        return <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />;
      case "comment":
        return <MessageCircle className="w-3.5 h-3.5 text-blue-500" />;
      case "follow":
      case "follow_request":
        return <UserPlus className="w-3.5 h-3.5 text-emerald-500" />;
      case "mention":
        return <AtSign className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const avatar = activeBanner?.sender?.profileImage?.url || activeBanner?.author?.profileImage?.url || dp;
  const senderName = activeBanner?.sender?.userName || activeBanner?.author?.userName || "VYBE";

  return (
    <AnimatePresence>
      {activeBanner && (
        <motion.div
          initial={{ opacity: 0, y: -60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          onClick={() => {
            setActiveBanner(null);
            navigate("/notifications");
          }}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[1000] w-[92%] max-w-md bg-surface/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-border/80 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.25)] p-3 cursor-pointer overflow-hidden group select-none"
        >
          {/* Animated Light Bar (Bottom glowing sweep) */}
          <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-border/40 overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 animate-vybe-light-bar shadow-[0_0_12px_rgba(244,63,94,0.9)]" />
          </div>

          <div className="flex items-center gap-3">
            {/* User Avatar with Gradient Ring & Action Badge */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 animate-pulse">
                <img
                  src={avatar}
                  alt=""
                  className="w-full h-full rounded-full object-cover bg-bg"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-surface rounded-full shadow-md border border-border">
                {getIcon(activeBanner.type)}
              </div>
            </div>

            {/* Notification Text */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-xs font-bold text-text truncate">
                  @{senderName}
                </h4>
                <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  New
                </span>
              </div>
              <p className="text-xs text-text-secondary truncate mt-0.5">
                {getMessage(activeBanner)}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveBanner(null);
              }}
              className="p-1.5 text-text-muted hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationLightBar;
