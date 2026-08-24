import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { SERVER_URL } from "../lib/api";
import { useAdminAuth } from "./AdminAuthContext";
import { useSound } from "./SoundContext";
import { toast } from "../lib/toast";

const AdminSocketContext = createContext(null);

export const AdminSocketProvider = ({ children }) => {
  const { adminUser } = useAdminAuth();
  const { playSound } = useSound();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0);
  const [activeStreamsCount, setActiveStreamsCount] = useState(0);
  const [liveAuditFeed, setLiveAuditFeed] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Audio effect for incoming high-priority reports
  const playAlertSound = () => {
    playSound();
  };

  const addNotification = (item) => {
    const newNotif = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: new Date().toISOString(),
      isRead: false,
      ...item,
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!adminUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io(SERVER_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketInstance.on("connect", () => {
      setIsConnected(true);
      console.log("⚡ Admin Real-time Telemetry WebSocket connected:", socketInstance.id);
      socketInstance.emit("register-user", { userId: adminUser._id });
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
      console.log("⚠️ Admin WebSocket disconnected.");
    });

    // Real-time Event Listeners
    socketInstance.on("report:new", (report) => {
      setPendingReportsCount((prev) => prev + 1);
      playAlertSound();
      toast.warning(
        `🚨 New Incident Reported: ${report.targetType?.toUpperCase()} reported for ${report.reason?.replace(/_/g, " ")}.`
      );
      addNotification({
        type: "report",
        title: `Reported ${report.targetType?.toUpperCase()}`,
        message: `Violation flagged: ${report.reason?.replace(/_/g, " ")} by @${report.reporter?.userName || "user"}`,
        link: "/moderation",
        priority: "high",
      });
    });

    socketInstance.on("report:resolved", () => {
      setPendingReportsCount((prev) => Math.max(0, prev - 1));
    });

    socketInstance.on("verification:new", (req) => {
      setPendingVerificationsCount((prev) => prev + 1);
      playAlertSound();
      toast.info(`🔵 New Verification Request: @${req.user?.userName || "Creator"} applied for Blue Badge.`);
      addNotification({
        type: "verification",
        title: "Blue Badge Application",
        message: `@${req.user?.userName || "Creator"} submitted identity documents for verification.`,
        link: "/verifications",
        priority: "normal",
      });
    });

    socketInstance.on("verification:processed", () => {
      setPendingVerificationsCount((prev) => Math.max(0, prev - 1));
    });

    socketInstance.on("stream:updated", ({ isLive, stream }) => {
      setActiveStreamsCount((prev) => (isLive ? prev + 1 : Math.max(0, prev - 1)));
      if (isLive) {
        addNotification({
          type: "stream",
          title: "New Broadcast On-Air",
          message: `@${stream?.host?.userName || "Creator"} started live broadcast: "${stream?.title || "Live Stream"}"`,
          link: "/live-streams",
          priority: "normal",
        });
      }
    });

    socketInstance.on("audit:new", (log) => {
      setLiveAuditFeed((prev) => [log, ...prev].slice(0, 30));
      addNotification({
        type: "audit",
        title: `Security Action: ${log.action}`,
        message: `Admin @${log.admin?.userName || "admin"} executed ${log.action} on ${log.targetType || "resource"}.`,
        link: "/audit-logs",
        priority: "low",
      });
    });

    socketInstance.on("system-announcement-received", ({ announcement }) => {
      toast.info(`📢 Platform Broadcast: "${announcement.title}"`);
      addNotification({
        type: "broadcast",
        title: announcement.title,
        message: announcement.message,
        link: "/broadcasts",
        priority: "high",
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [adminUser?._id]);

  return (
    <AdminSocketContext.Provider
      value={{
        socket,
        isConnected,
        pendingReportsCount,
        pendingVerificationsCount,
        activeStreamsCount,
        liveAuditFeed,
        notifications,
        unreadCount,
        markAllAsRead,
        markAsRead,
        clearAllNotifications,
        playAlertSound,
      }}
    >
      {children}
    </AdminSocketContext.Provider>
  );
};

export const useAdminSocket = () => {
  const context = useContext(AdminSocketContext);
  if (!context) {
    throw new Error("useAdminSocket must be used within an AdminSocketProvider");
  }
  return context;
};
