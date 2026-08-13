// src/hooks/useTypingIndicator.js - Hook to handle typing indicators

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  emitTyping,
  emitStopTyping,
  onUserTyping,
  getSocket,
} from "../lib/socket";

/**
 * Hook to manage typing indicators
 * Handles sending typing events and listening for typing events from others
 */
export const useTypingIndicator = (conversationId) => {
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeoutRef = useRef(null);

  // Emit typing event
  const setTyping = useCallback(() => {
    if (!conversationId) return;

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing event
    emitTyping(conversationId);

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTyping(conversationId);
    }, 3000);
  }, [conversationId]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (conversationId) {
      emitStopTyping(conversationId);
    }
  }, [conversationId]);

  // Listen for typing events
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId) return;

    const unsubscribe = onUserTyping((data) => {
      if (data.conversationId === conversationId) {
        const { userId, isTyping } = data;

        setTypingUsers((prev) => {
          const updated = new Set(prev);
          if (isTyping) {
            updated.add(userId);
          } else {
            updated.delete(userId);
          }
          return updated;
        });
      }
    });

    return () => {
      unsubscribe?.();
      stopTyping();
    };
  }, [conversationId, stopTyping]);

  return {
    typingUsers,
    setTyping,
    stopTyping,
    isAnyoneTyping: typingUsers.size > 0,
  };
};

export default useTypingIndicator;
