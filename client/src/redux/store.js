import { configureStore } from "@reduxjs/toolkit";
import userSlice from "./features/userSlice";
import postSlice from "./features/postSlice";
import storySlice from "./features/storySlice";
import loopSlice from "./features/loopSlice";
import messageSlice from "./features/messageSlice";
import notificationSlice from "./features/notificationSlice";

const store = configureStore({
    reducer: {
        user: userSlice,
        post: postSlice,
        story: storySlice,
        loop: loopSlice,
        reel: loopSlice,
        message: messageSlice,
        notification: notificationSlice,
    },
});

export default store;