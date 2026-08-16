import { createSlice } from "@reduxjs/toolkit";

const reelSlice = createSlice({
  name: "reel",
  initialState: {
    reelData: [],
    isLoading: false,
  },
  reducers: {
    setReelData: (state, action) => {
      state.reelData = action.payload;
    },
    setReelsLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setReelData, setReelsLoading } = reelSlice.actions;
export default reelSlice.reducer;
