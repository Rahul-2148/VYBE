import { createSlice } from "@reduxjs/toolkit";

const notificationSlice = createSlice({
  name: "notification",
  initialState: {
    unreadNotificationsCount: 0,
    unreadMessagesCount: 0,
    latestNotification: null,
    lightBarActive: false,
  },
  reducers: {
    setUnreadNotificationsCount: (state, action) => {
      state.unreadNotificationsCount = Math.max(0, action.payload || 0);
    },
    incrementUnreadNotifications: (state, action) => {
      state.unreadNotificationsCount += 1;
      state.latestNotification = action.payload || null;
      state.lightBarActive = true;
    },
    clearUnreadNotifications: (state) => {
      state.unreadNotificationsCount = 0;
      state.lightBarActive = false;
    },
    setUnreadMessagesCount: (state, action) => {
      state.unreadMessagesCount = Math.max(0, action.payload || 0);
    },
    incrementUnreadMessages: (state) => {
      state.unreadMessagesCount += 1;
    },
    clearUnreadMessages: (state) => {
      state.unreadMessagesCount = 0;
    },
    triggerLightBar: (state, action) => {
      state.lightBarActive = true;
      if (action.payload) {
        state.latestNotification = action.payload;
      }
    },
    dismissLightBar: (state) => {
      state.lightBarActive = false;
      state.latestNotification = null;
    },
  },
});

export const {
  setUnreadNotificationsCount,
  incrementUnreadNotifications,
  clearUnreadNotifications,
  setUnreadMessagesCount,
  incrementUnreadMessages,
  clearUnreadMessages,
  triggerLightBar,
  dismissLightBar,
} = notificationSlice.actions;

export default notificationSlice.reducer;
