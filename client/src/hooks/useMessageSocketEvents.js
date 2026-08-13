// src/hooks/useMessageSocketEvents.js - Hook to handle message socket events

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSocket, joinConversation, leaveConversation } from "../lib/socket";
import {
  addMessage,
  updateMessage,
  updateMessageReactionInRedux,
  markMessagesAsSeenInRedux,
  markMessageEditedInRedux,
  markMessageDeletedInRedux,
  markMessagePinnedInRedux,
  updateConversationLastMessage,
  updateConversationThemeInRedux,
  updateConversationDisappearingInRedux,
} from "../redux/features/messageSlice";

export const useMessageSocketEvents = (conversationId) => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const currentUserId = userData?.user?._id || userData?._id;

  useEffect(() => {
    if (!conversationId) return;

    const socket = getSocket();
    if (!socket) return;

    joinConversation(conversationId);

    // 1. Message received
    const handleMessageReceived = (data) => {
      if (data.conversationId === conversationId && data.message) {
        dispatch(addMessage(data.message));
        dispatch(
          updateConversationLastMessage({
            conversationId,
            message: data.message,
            currentUserId,
          })
        );
      }
    };

    // 2. Message edited
    const handleMessageEdited = (data) => {
      if (data.conversationId === conversationId && data.messageId) {
        dispatch(
          markMessageEditedInRedux({
            messageId: data.messageId,
            text: data.newText || data.text,
            editedAt: data.editedAt,
          })
        );
      }
    };

    // 3. Message deleted for everyone
    const handleMessageDeletedEveryone = (data) => {
      if (data.conversationId === conversationId && data.messageId) {
        dispatch(
          markMessageDeletedInRedux({
            messageId: data.messageId,
          })
        );
      }
    };

    // 4. Reaction updated
    const handleReactionUpdated = (data) => {
      if (data.conversationId === conversationId && data.messageId) {
        dispatch(
          updateMessageReactionInRedux({
            messageId: data.messageId,
            reactions: data.reactions,
          })
        );
      }
    };

    // 5. Messages seen
    const handleMessagesSeen = (data) => {
      if (data.conversationId === conversationId) {
        dispatch(
          markMessagesAsSeenInRedux({
            conversationId,
            userId: data.seenBy,
          })
        );
      }
    };

    // 6. Message pinned/unpinned
    const handleMessagePinned = (data) => {
      if (data.conversationId === conversationId && data.messageId) {
        dispatch(
          markMessagePinnedInRedux({
            messageId: data.messageId,
            isPinned: data.isPinned,
          })
        );
      }
    };

    // 7. Message forwarded into this conversation
    const handleMessageForwarded = (data) => {
      if (data.conversationId === conversationId && data.message) {
        dispatch(addMessage(data.message));
      }
    };

    // 8. Chat theme updated
    const handleThemeUpdated = (data) => {
      if (data.conversationId) {
        dispatch(updateConversationThemeInRedux({ conversationId: data.conversationId, theme: data.theme }));
      }
    };

    // 9. Disappearing messages updated
    const handleDisappearingUpdated = (data) => {
      if (data.conversationId) {
        dispatch(updateConversationDisappearingInRedux({ conversationId: data.conversationId, disappearingMessages: data.disappearingMessages }));
      }
    };

    socket.on("message-received", handleMessageReceived);
    socket.on("message-edited", handleMessageEdited);
    socket.on("message-deleted-everyone", handleMessageDeletedEveryone);
    socket.on("message-reaction-updated", handleReactionUpdated);
    socket.on("messages-seen", handleMessagesSeen);
    socket.on("message-pinned", handleMessagePinned);
    socket.on("message-forwarded", handleMessageForwarded);
    socket.on("chat-theme-updated", handleThemeUpdated);
    socket.on("disappearing-messages-updated", handleDisappearingUpdated);

    return () => {
      socket.off("message-received", handleMessageReceived);
      socket.off("message-edited", handleMessageEdited);
      socket.off("message-deleted-everyone", handleMessageDeletedEveryone);
      socket.off("message-reaction-updated", handleReactionUpdated);
      socket.off("messages-seen", handleMessagesSeen);
      socket.off("message-pinned", handleMessagePinned);
      socket.off("message-forwarded", handleMessageForwarded);
      socket.off("chat-theme-updated", handleThemeUpdated);
      socket.off("disappearing-messages-updated", handleDisappearingUpdated);
      leaveConversation(conversationId);
    };
  }, [conversationId, dispatch, currentUserId]);
};

export default useMessageSocketEvents;
