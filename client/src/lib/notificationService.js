/**
 * VYBE System Notifications & Alert Service
 * Handles browser & mobile push alerts, permissions, vibrations, and interactive actions.
 */

class NotificationService {
  constructor() {
    this.isSupported = typeof window !== "undefined" && "Notification" in window;
    this.activeNotifications = new Map();
  }

  /**
   * Request Notification Permission from user
   */
  async requestPermission() {
    if (!this.isSupported) return "unsupported";
    if (Notification.permission === "granted") return "granted";

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn("[NotificationService] Permission request failed:", e);
      return Notification.permission;
    }
  }

  /**
   * Check if notifications are allowed
   */
  hasPermission() {
    return this.isSupported && Notification.permission === "granted";
  }

  /**
   * Show an Incoming Call Notification (High Priority, Persists, Vibrates)
   */
  showCallNotification({ callerName, callerAvatar, callType = "video", room }) {
    if (!this.hasPermission()) {
      // Proactively try requesting permission if default
      if (this.isSupported && Notification.permission === "default") {
        this.requestPermission();
      }
      return null;
    }

    try {
      const title = `📞 Incoming ${callType === "video" ? "Video" : "Voice"} Call`;
      const options = {
        body: `@${callerName || "Someone"} is calling you on VYBE`,
        icon: callerAvatar || "/favicon.ico",
        badge: "/favicon.ico",
        tag: `vybe-call-${room}`,
        renotify: true,
        requireInteraction: true,
        vibrate: [500, 250, 500, 250, 500],
        data: { room, type: "call" },
      };

      const notif = new Notification(title, options);

      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      this.activeNotifications.set(`call-${room}`, notif);
      return notif;
    } catch (e) {
      console.warn("[NotificationService] Show call notification failed:", e);
      return null;
    }
  }

  /**
   * Dismiss Active Call Notification
   */
  dismissCallNotification(room) {
    const notif = this.activeNotifications.get(`call-${room}`);
    if (notif) {
      try {
        notif.close();
      } catch {}
      this.activeNotifications.delete(`call-${room}`);
    }
  }

  /**
   * Show Message Notification (Only if window not focused or in background)
   */
  showMessageNotification({ senderName, senderAvatar, text, conversationId }) {
    if (!this.hasPermission()) return null;
    if (typeof document !== "undefined" && !document.hidden && document.hasFocus()) {
      // User is actively focused on the app
      return null;
    }

    try {
      const title = `💬 ${senderName || "New Message"}`;
      const options = {
        body: text || "Sent an attachment",
        icon: senderAvatar || "/favicon.ico",
        badge: "/favicon.ico",
        tag: `vybe-msg-${conversationId}`,
        renotify: true,
        vibrate: [200, 100, 200],
        data: { conversationId, type: "message" },
      };

      const notif = new Notification(title, options);
      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      setTimeout(() => {
        try {
          notif.close();
        } catch {}
      }, 6000);

      return notif;
    } catch (e) {
      console.warn("[NotificationService] Show message notification failed:", e);
      return null;
    }
  }

  /**
   * Show General System Notification
   */
  showGeneralNotification({ title, body, icon, link }) {
    if (!this.hasPermission()) return null;

    try {
      const options = {
        body,
        icon: icon || "/favicon.ico",
        badge: "/favicon.ico",
        tag: `vybe-notif-${Date.now()}`,
        vibrate: [100, 50, 100],
      };

      const notif = new Notification(title, options);
      if (link) {
        notif.onclick = () => {
          window.focus();
          if (window.location) window.location.href = link;
          notif.close();
        };
      }
      setTimeout(() => {
        try {
          notif.close();
        } catch {}
      }, 5000);
      return notif;
    } catch (e) {
      console.warn("[NotificationService] Show general notification failed:", e);
      return null;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
