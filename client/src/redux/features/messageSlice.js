import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedChatUser: {
    conversationId: null, // conversation _id
    user: null, // other user object
  },
  conversations: [], // Global inbox list
  messages: [], // Active conversation messages
  vanishMode: false,
  isLoading: false,
  typingUsers: {}, // Maps conversationId -> Array of userIds currently typing
  chatInfoOpen: false, // Chat info/details drawer
  forwardModalOpen: false, // Forward message modal
  forwardingMessage: null, // Message being forwarded
  isFloatingDockOpen: false, // Mini window drawer state
  floatingActiveConvo: null, // Active conversation inside floating mini dock
};

const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
    setFloatingDockOpen(state, action) {
      state.isFloatingDockOpen = action.payload;
    },

    setFloatingActiveConvo(state, action) {
      state.floatingActiveConvo = action.payload;
    },

    minimizeToFloatingDock(state, action) {
      state.isFloatingDockOpen = true;
      if (action.payload) {
        state.floatingActiveConvo = action.payload;
      } else if (state.selectedChatUser?.conversationId) {
        state.floatingActiveConvo = {
          _id: state.selectedChatUser.conversationId,
          participant: state.selectedChatUser.user,
        };
      }
    },

    setSelectedChatUser(state, action) {
      state.selectedChatUser = {
        conversationId: action.payload.conversationId,
        user: action.payload.user,
      };
    },

    clearSelectedChatUser(state) {
      state.selectedChatUser = {
        conversationId: null,
        user: null,
      };
      state.messages = [];
      state.chatInfoOpen = false;
    },

    setConversations(state, action) {
      state.conversations = action.payload;
    },

    setMessages(state, action) {
      state.messages = action.payload;
    },

    prependHistoricalMessages(state, action) {
      state.messages = [...action.payload, ...state.messages];
    },

    addMessage(state, action) {
      const message = action.payload;
      if (!message || !message._id) return;
      const convId = state.selectedChatUser.conversationId;
      // Handle both string and ObjectId comparisons
      const msgConvId = typeof message.conversation === "object"
        ? message.conversation?._id || message.conversation
        : message.conversation;

      if (!convId || msgConvId?.toString() !== convId?.toString()) {
        return;
      }

      // Check if message already exists by real _id
      const existingIdx = state.messages.findIndex(
        (m) => m._id?.toString() === message._id?.toString()
      );
      if (existingIdx !== -1) {
        state.messages[existingIdx] = { ...state.messages[existingIdx], ...message };
        return;
      }

      // Check if this incoming message matches an optimistic temp message
      const optimisticIdx = state.messages.findIndex((m) => {
        if (!m) return false;
        if (message.clientMessageId && (m._id === message.clientMessageId || m.clientMessageId === message.clientMessageId)) {
          return true;
        }
        // Match temp message with same text and sender
        if (
          typeof m._id === "string" &&
          m._id.startsWith("temp_") &&
          m.content?.text === message.content?.text &&
          ((m.sender?._id || m.sender)?.toString() === (message.sender?._id || message.sender)?.toString())
        ) {
          return true;
        }
        return false;
      });

      if (optimisticIdx !== -1) {
        // Replace optimistic placeholder with real confirmed message
        state.messages[optimisticIdx] = message;
      } else {
        state.messages.push(message);
      }
    },

    // Optimistic message — add immediately with temp ID, replace when server confirms
    addOptimisticMessage(state, action) {
      if (!action.payload) return;
      // Ensure no existing message with same temp id exists
      const exists = state.messages.some((m) => m._id === action.payload._id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },

    replaceOptimisticMessage(state, action) {
      const { tempId, message } = action.payload;
      if (!message) return;

      const alreadyHasReal = state.messages.some(
        (m) => m._id?.toString() === message._id?.toString()
      );
      const tempIdx = state.messages.findIndex((m) => m._id === tempId);

      if (tempIdx !== -1) {
        if (alreadyHasReal) {
          // Real message was already appended by socket; remove the optimistic duplicate
          state.messages.splice(tempIdx, 1);
        } else {
          // Replace the optimistic placeholder with the real message
          state.messages[tempIdx] = message;
        }
      } else if (!alreadyHasReal) {
        state.messages.push(message);
      }
    },

    markOptimisticFailed(state, action) {
      const { tempId } = action.payload;
      const msg = state.messages.find((m) => m._id === tempId);
      if (msg) {
        msg.status = "failed";
      }
    },

    removeMessage(state, action) {
      state.messages = state.messages.filter((m) => m._id !== action.payload);
    },

    updateMessage(state, action) {
      const updated = action.payload;
      const idx = state.messages.findIndex((m) => m._id === updated._id);
      if (idx !== -1) {
        state.messages[idx] = { ...state.messages[idx], ...updated };
      }
    },

    updateMessageReactionInRedux(state, action) {
      const { messageId, reactions } = action.payload;
      const msg = state.messages.find((m) => m._id === messageId);
      if (msg) {
        msg.reactions = reactions;
      }
    },

    markMessagesAsSeenInRedux(state, action) {
      const { conversationId, userId } = action.payload;
      if (state.selectedChatUser.conversationId === conversationId) {
        state.messages.forEach((m) => {
          const senderId = m.sender?._id || m.sender;
          if (senderId !== userId) {
            m.status = "seen";
          }
        });
      }

      // Clear local unread counts inside the matching conversation object
      const conv = state.conversations.find((c) => c._id === conversationId);
      if (conv) {
        conv.unreadCount = 0;
      }
    },

    markMessageEditedInRedux(state, action) {
      const { messageId, text, editedAt } = action.payload;
      const msg = state.messages.find((m) => m._id === messageId);
      if (msg) {
        if (msg.content) msg.content.text = text;
        msg.edited = true;
        msg.editedAt = editedAt;
      }
    },

    markMessageDeletedInRedux(state, action) {
      const { messageId } = action.payload;
      const msg = state.messages.find((m) => m._id === messageId);
      if (msg) {
        msg.deletedForEveryone = true;
        msg.type = "text";
        msg.content = { text: "This message was deleted" };
        msg.reactions = [];
      }
    },

    markMessagePinnedInRedux(state, action) {
      const { messageId, isPinned } = action.payload;
      const msg = state.messages.find((m) => m._id === messageId);
      if (msg) {
        msg.isPinned = isPinned;
      }
    },

    toggleVanish(state, action) {
      const conversationId = action.payload;
      if (conversationId) {
        const conv = state.conversations.find((c) => (c._id || c.conversationId)?.toString() === conversationId.toString());
        if (conv) {
          conv.vanishMode = !conv.vanishMode;
        }
      }
      state.vanishMode = !state.vanishMode;
    },

    setLoading(state, action) {
      state.isLoading = action.payload;
    },

    updateConversationLastMessage(state, action) {
      const { conversationId, message, currentUserId } = action.payload;

      let conv = state.conversations.find((c) => c._id === conversationId);
      if (conv) {
        conv.lastMessage = message;
        conv.updatedAt = new Date().toISOString();

        // Increment unread count if message sender is not current user AND conversation is not selected
        const senderId = message.sender?._id || message.sender;
        if (senderId !== currentUserId && state.selectedChatUser.conversationId !== conversationId) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }

        // Reorder list to move updated convo to top (but keep pinned on top)
        const pinned = state.conversations.filter((c) => c.isPinned && c._id !== conversationId);
        const unpinned = state.conversations.filter((c) => !c.isPinned && c._id !== conversationId);

        if (conv.isPinned) {
          state.conversations = [conv, ...pinned, ...unpinned];
        } else {
          state.conversations = [...pinned, conv, ...unpinned];
        }
      }
    },

    toggleMuteInRedux(state, action) {
      const { conversationId, muted } = action.payload;
      const conv = state.conversations.find((c) => c._id === conversationId);
      if (conv) {
        conv.isMuted = muted;
      }
    },

    togglePinInRedux(state, action) {
      const { conversationId, pinned } = action.payload;
      const conv = state.conversations.find((c) => c._id === conversationId);
      if (conv) {
        conv.isPinned = pinned;
      }
      // Re-sort: pinned first
      state.conversations.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
      });
    },

    toggleArchiveInRedux(state, action) {
      const { conversationId, archived } = action.payload;
      const conv = state.conversations.find((c) => c._id === conversationId);
      if (conv) {
        conv.isArchived = archived;
      }
    },

    updateUserPresenceInRedux(state, action) {
      const { userId, isOnline, lastSeen } = action.payload;
      if (!userId) return;

      const userIdStr = userId.toString();

      // Update selectedChatUser if matching
      if (state.selectedChatUser.user?._id?.toString() === userIdStr) {
        state.selectedChatUser.user.isOnline = isOnline;
        state.selectedChatUser.user.lastSeen = lastSeen;
      }
      // Update inside conversations list
      state.conversations.forEach((conv) => {
        const participant = conv.participant;
        if (participant && (participant._id || participant)?.toString() === userIdStr) {
          participant.isOnline = isOnline;
          participant.lastSeen = lastSeen;
        }
        if (conv.participants) {
          conv.participants.forEach((p) => {
            if ((p._id || p)?.toString() === userIdStr) {
              p.isOnline = isOnline;
              p.lastSeen = lastSeen;
            }
          });
        }
      });
    },

    setTypingUsersInRedux(state, action) {
      const { conversationId, typingList } = action.payload;
      state.typingUsers[conversationId] = typingList;
    },

    setChatInfoOpen(state, action) {
      state.chatInfoOpen = action.payload;
    },

    setForwardModal(state, action) {
      state.forwardModalOpen = action.payload.open;
      state.forwardingMessage = action.payload.message || null;
    },

    removeConversationInRedux(state, action) {
      const conversationId = action.payload;
      state.conversations = state.conversations.filter(
        (c) => (c._id || c.conversationId) !== conversationId
      );
      if (state.selectedChatUser.conversationId === conversationId) {
        state.selectedChatUser = { conversationId: null, user: null };
        state.messages = [];
        state.chatInfoOpen = false;
      }
    },

    clearMessagesInRedux(state, action) {
      const conversationId = action.payload;
      if (state.selectedChatUser.conversationId === conversationId) {
        state.messages = [];
      }
      const convo = state.conversations.find((c) => (c._id || c.conversationId) === conversationId);
      if (convo) {
        convo.lastMessage = null;
      }
    },

    updateConversationThemeInRedux(state, action) {
      const { conversationId, theme } = action.payload;
      const conv = state.conversations.find((c) => (c._id || c.conversationId)?.toString() === conversationId?.toString());
      if (conv) {
        conv.theme = theme;
      }
    },

    updateConversationDisappearingInRedux(state, action) {
      const { conversationId, disappearingMessages } = action.payload;
      const conv = state.conversations.find((c) => c._id === conversationId);
      if (conv) {
        conv.disappearingMessages = disappearingMessages;
      }
    },
  },
});

export const {
  setFloatingDockOpen,
  setFloatingActiveConvo,
  minimizeToFloatingDock,
  setSelectedChatUser,
  clearSelectedChatUser,
  setConversations,
  setMessages,
  prependHistoricalMessages,
  addMessage,
  addOptimisticMessage,
  replaceOptimisticMessage,
  markOptimisticFailed,
  removeMessage,
  updateMessage,
  updateMessageReactionInRedux,
  markMessagesAsSeenInRedux,
  markMessageEditedInRedux,
  markMessageDeletedInRedux,
  markMessagePinnedInRedux,
  toggleVanish,
  setLoading,
  updateConversationLastMessage,
  toggleMuteInRedux,
  togglePinInRedux,
  toggleArchiveInRedux,
  updateUserPresenceInRedux,
  setTypingUsersInRedux,
  setChatInfoOpen,
  setForwardModal,
  removeConversationInRedux,
  clearMessagesInRedux,
  updateConversationThemeInRedux,
  updateConversationDisappearingInRedux,
} = messageSlice.actions;

export default messageSlice.reducer;
