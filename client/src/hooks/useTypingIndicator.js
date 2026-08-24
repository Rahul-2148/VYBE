// src/hooks/useTypingIndicator.js - Hook to handle rich live typing indicators
import { useCallback, useEffect, useRef, useState } from "react";
import { emitTyping, emitStopTyping, onUserTyping, getSocket } from "../lib/socket";

/**
 * Hook to manage rich real-time typing indicators
 * Handles sending typing events with current user metadata & receiving typing indicators
 */
export const useTypingIndicator = (conversationId, currentUser) => {
  const [typingUsersMap, setTypingUsersMap] = useState({});
  const typingTimeoutRef = useRef(null);

  // Emit typing event with user metadata
  const setTyping = useCallback(() => {
    if (!conversationId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const userName = currentUser?.username || currentUser?.userName || currentUser?.fullName || currentUser?.name || "Someone";
    const userAvatar = currentUser?.profileImage?.url || currentUser?.profilePicture || currentUser?.avatar || null;

    emitTyping(conversationId, { userName, userAvatar });

    // Auto-stop typing after 3.5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(conversationId);
    }, 3500);
  }, [conversationId, currentUser]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (conversationId) {
      emitStopTyping(conversationId);
    }
  }, [conversationId]);

  // Listen for incoming typing events
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId) return;

    const currentUid = (currentUser?._id || currentUser?.id)?.toString();

    const unsubscribe = onUserTyping((data) => {
      if (data.conversationId?.toString() === conversationId?.toString()) {
        const { userId, isTyping, userName, userAvatar } = data;
        const incomingUid = (userId?._id || userId?.id || userId)?.toString();

        // Ignore self typing events
        if (incomingUid && currentUid && incomingUid === currentUid) return;

        setTypingUsersMap((prev) => {
          const updated = { ...prev };
          if (isTyping && incomingUid) {
            updated[incomingUid] = {
              userId: incomingUid,
              userName: userName || "Someone",
              userAvatar: userAvatar || null,
              timestamp: Date.now(),
            };
          } else if (incomingUid) {
            delete updated[incomingUid];
          }
          return updated;
        });
      }
    });

    // Auto-expire stale typing entries after 4.5 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsersMap((prev) => {
        let changed = false;
        const updated = { ...prev };
        Object.keys(updated).forEach((uid) => {
          if (now - updated[uid].timestamp > 4500) {
            delete updated[uid];
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }, 2000);

    return () => {
      unsubscribe?.();
      clearInterval(interval);
      stopTyping();
      setTypingUsersMap({});
    };
  }, [conversationId, currentUser, stopTyping]);

  const typingUsersList = Object.values(typingUsersMap);
  const isAnyoneTyping = typingUsersList.length > 0;

  let typingText = "";
  if (typingUsersList.length === 1) {
    typingText = `${typingUsersList[0].userName} is typing...`;
  } else if (typingUsersList.length === 2) {
    typingText = `${typingUsersList[0].userName} and ${typingUsersList[1].userName} are typing...`;
  } else if (typingUsersList.length > 2) {
    typingText = `${typingUsersList[0].userName} and ${typingUsersList.length - 1} others are typing...`;
  }

  return {
    typingUsers: typingUsersList,
    typingText,
    isAnyoneTyping,
    setTyping,
    stopTyping,
  };
};

export default useTypingIndicator;
