import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    isAuthInitialized: false,
    suggestedUsers: [],
    profileData: null,
  },
  reducers: {
    setUserData: (state, action) => {
      const payload = action.payload;
      if (!payload) {
        state.userData = null;
      } else {
        let userObj = payload.user ? payload.user : payload;
        while (userObj && userObj.user && userObj.user._id) {
          userObj = userObj.user;
        }

        if (userObj && (userObj._id || userObj.userName)) {
          // Destructure to prevent circular references
          const { user: _omitted, ...cleanUser } = userObj;
          const userCopy = { ...cleanUser };
          state.userData = {
            ...userCopy,
            user: { ...userCopy },
          };
        } else {
          state.userData = null;
        }
      }
      state.isAuthInitialized = true;
    },
    setAuthInitialized: (state, action) => {
      state.isAuthInitialized = action.payload;
    },
    setProfileData: (state, action) => {
      const payload = action.payload;
      if (!payload) {
        state.profileData = null;
      } else {
        let userObj = payload.user ? payload.user : payload;
        const { user: _omitted, ...cleanUser } = userObj;
        state.profileData = {
          ...payload,
          user: { ...cleanUser },
        };
      }
    },
    setSuggestedUsers: (state, action) => {
      state.suggestedUsers = action.payload || [];
    },
    toggleFollowInUserData: (state, action) => {
      const targetUserId = action.payload;
      if (!state.userData) return;
      const userObj = state.userData.user || state.userData;
      const following = userObj.following || [];
      const updatedFollowing = following.includes(targetUserId)
        ? following.filter((id) => id !== targetUserId)
        : [...following, targetUserId];

      const cleanUser = { ...userObj, following: updatedFollowing };
      delete cleanUser.user;
      state.userData = {
        ...cleanUser,
        user: { ...cleanUser },
      };
    },
  },
});

export const {
  setUserData,
  setAuthInitialized,
  setSuggestedUsers,
  setProfileData,
  toggleFollowInUserData,
} = userSlice.actions;

export default userSlice.reducer;
