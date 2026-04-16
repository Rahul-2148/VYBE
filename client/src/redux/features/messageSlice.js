import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedChatUser: {
    conversationId: null, // conversation _id
    user: null, // other user object
  },
  messages: [],
  vanishMode: false,
  isLoading: false,
};

const messageSlice = createSlice({
  name: "message",
  initialState,
  reducers: {
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
    },

    setMessages(state, action) {
      state.messages = action.payload;
    },

    addMessage(state, action) {
      const exists = state.messages.some((m) => m._id === action.payload?._id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },

    removeMessage(state, action) {
      state.messages = state.messages.filter((m) => m._id !== action.payload);
    },

    updateMessage(state, action) {
      const idx = state.messages.findIndex((m) => m._id === action.payload._id);
      if (idx !== -1) {
        state.messages[idx] = action.payload;
      }
    },

    toggleVanish(state) {
      state.vanishMode = !state.vanishMode;
    },

    setLoading(state, action) {
      state.isLoading = action.payload;
    },
  },
});

export const {
  setSelectedChatUser,
  clearSelectedChatUser,
  setMessages,
  addMessage,
  removeMessage,
  updateMessage,
  toggleVanish,
  setLoading,
} = messageSlice.actions;

export default messageSlice.reducer;
