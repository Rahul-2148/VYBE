import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    suggestedUsers: [],
    profileData: null,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
    setProfileData: (state, action) => {
      state.profileData = action.payload;
    },
    setSuggestedUsers: (state, action) => {
      state.suggestedUsers = action.payload;
    },
  },
});

export const {
  setUserData,
  setSuggestedUsers,
  setProfileData,
  toggleFollowInUserData,
} = userSlice.actions;

export default userSlice.reducer;
