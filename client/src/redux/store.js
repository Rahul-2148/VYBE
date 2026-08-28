import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import userSlice from "./features/userSlice";
import postSlice from "./features/postSlice";
import storySlice from "./features/storySlice";
import reelSlice from "./features/reelSlice";
import messageSlice from "./features/messageSlice";
import notificationSlice from "./features/notificationSlice";
import { apiSlice } from "./api/apiSlice";

const store = configureStore({
  reducer: {
    user: userSlice,
    post: postSlice,
    story: storySlice,
    reel: reelSlice,
    message: messageSlice,
    notification: notificationSlice,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(apiSlice.middleware),
});

setupListeners(store.dispatch);

if (typeof window !== "undefined") {
  window.store = store;
}

export default store;