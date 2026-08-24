import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSocket } from "../lib/socket";
import { playMessageSound } from "../lib/sounds";
import {
  addMessage,
  updateMessage,
  updateMessageReactionInRedux,
  markMessagesAsSeenInRedux,
  updateConversationLastMessage,
  updateUserPresenceInRedux,
  setOnlineUsersListInRedux,
  setTypingUsersInRedux,
} from "../redux/features/messageSlice";

export const useChatSync = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const { selectedChatUser } = useSelector((state) => state.message);

  const currentUserId = userData?._id || userData?.user?._id;

  useEffect(() => {
    if (!currentUserId) return;

    const socket = getSocket();
    if (!socket) return;

    // 1. Join user room & active chat on connect/reconnect
    const handleConnect = () => {
      console.log("🔌 ChatSync connected/reconnected. Registering rooms & sync presence...");
      socket.emit("register-user", { userId: currentUserId });
      socket.emit("get-online-users");
      if (selectedChatUser?.conversationId) {
        socket.emit("join-conversation", { conversationId: selectedChatUser.conversationId });
      }
    };

    socket.on("connect", handleConnect);
    // Trigger immediately if socket is already connected
    if (socket.connected) {
      handleConnect();
    }

    // 2. Incoming messages
    const handleMessageReceived = (data) => {
      const { conversationId, message } = data;
      if (!message) return;

      // Update active messages list
      dispatch(addMessage(message));

      // Update global conversations inbox list
      dispatch(
        updateConversationLastMessage({
          conversationId,
          message,
          currentUserId,
        })
      );
      const isFromMe = (message.sender?._id || message.sender)?.toString() === currentUserId?.toString();
      if (!isFromMe) {
        playMessageSound();
      }
    };

    // 3. Mark messages seen
    const handleMessagesSeen = (data) => {
      const { conversationId, seenBy, readBy, messageId } = data;
      const viewerId = seenBy || readBy;

      if (messageId) {
        dispatch(updateMessage({ _id: messageId, status: "seen" }));
      }

      if (conversationId && viewerId) {
        dispatch(markMessagesAsSeenInRedux({ conversationId, userId: viewerId }));
      }
    };

    // 4. Edit message
    const handleMessageEdited = (data) => {
      const { messageId, newText } = data;
      dispatch(updateMessage({ _id: messageId, content: { text: newText }, edited: true }));
    };

    // 5. Delete message for everyone
    const handleMessageDeletedEveryone = (data) => {
      const { messageId } = data;
      dispatch(
        updateMessage({
          _id: messageId,
          deletedForEveryone: true,
          content: { text: "This message was deleted" },
        })
      );
    };

    // 6. Message reaction
    const handleMessageReactionUpdated = (data) => {
      const { messageId, reactions } = data;
      dispatch(updateMessageReactionInRedux({ messageId, reactions }));
    };

    // 7. Presence updates
    const handleOnlineUsersList = (data) => {
      const list = Array.isArray(data) ? data : data?.onlineUsers || [];
      dispatch(setOnlineUsersListInRedux(list));
    };

    const handleUserOnline = (data) => {
      dispatch(
        updateUserPresenceInRedux({
          userId: data.userId,
          isOnline: true,
          lastSeen: null,
        })
      );
    };

    const handleUserOffline = (data) => {
      dispatch(
        updateUserPresenceInRedux({
          userId: data.userId,
          isOnline: false,
          lastSeen: data.lastSeen || new Date(),
        })
      );
    };

    // 8. Typing indicators
    const handleUserTyping = (data) => {
      const { conversationId, userId, isTyping } = data;
      dispatch(
        setTypingUsersInRedux({
          conversationId,
          typingList: isTyping ? [userId] : [],
        })
      );
    };

    socket.on("message-received", handleMessageReceived);
    socket.on("messages-seen", handleMessagesSeen);
    socket.on("message-read-receipt", handleMessagesSeen);
    socket.on("message-edited", handleMessageEdited);
    socket.on("message-deleted-everyone", handleMessageDeletedEveryone);
    socket.on("message-reaction-updated", handleMessageReactionUpdated);
    socket.on("online-users-list", handleOnlineUsersList);
    socket.on("user-online", handleUserOnline);
    socket.on("user-offline", handleUserOffline);
    socket.on("user-typing", handleUserTyping);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("message-received", handleMessageReceived);
      socket.off("messages-seen", handleMessagesSeen);
      socket.off("message-read-receipt", handleMessagesSeen);
      socket.off("message-edited", handleMessageEdited);
      socket.off("message-deleted-everyone", handleMessageDeletedEveryone);
      socket.off("message-reaction-updated", handleMessageReactionUpdated);
      socket.off("online-users-list", handleOnlineUsersList);
      socket.off("user-online", handleUserOnline);
      socket.off("user-offline", handleUserOffline);
      socket.off("user-typing", handleUserTyping);
    };
  }, [currentUserId, selectedChatUser?.conversationId, dispatch]);
};

export default useChatSync;
