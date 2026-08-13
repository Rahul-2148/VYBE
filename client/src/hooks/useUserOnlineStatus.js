// src/hooks/useUserOnlineStatus.js - Hook to track user online/offline status

import { useEffect, useState } from "react";
import {
  onUserOnline,
  onUserOffline,
  onUserPresenceUpdated,
  getSocket,
} from "../lib/socket";

/**
 * Hook to track user online/offline status
 * Returns object with active users and their statuses
 */
export const useUserOnlineStatus = () => {
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [userPresence, setUserPresence] = useState({});
  const [activeUsersCount, setActiveUsersCount] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for user online
    const unsubscribeOnline = onUserOnline((data) => {
      const { userId, totalActiveUsers } = data;
      setOnlineUsers((prev) => new Set([...prev, userId]));
      setActiveUsersCount(totalActiveUsers);
    });

    // Listen for user offline
    const unsubscribeOffline = onUserOffline((data) => {
      const { userId, totalActiveUsers } = data;
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
      setActiveUsersCount(totalActiveUsers);
    });

    // Listen for user presence updated
    const unsubscribePresence = onUserPresenceUpdated((data) => {
      const { userId, status, lastSeen } = data;
      setUserPresence((prev) => ({
        ...prev,
        [userId]: {
          status,
          lastSeen,
        },
      }));
    });

    return () => {
      unsubscribeOnline?.();
      unsubscribeOffline?.();
      unsubscribePresence?.();
    };
  }, []);

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const getUserStatus = (userId) => {
    return userPresence[userId] || null;
  };

  return {
    onlineUsers,
    userPresence,
    activeUsersCount,
    isUserOnline,
    getUserStatus,
  };
};

export default useUserOnlineStatus;
