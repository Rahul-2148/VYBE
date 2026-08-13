import { createSlice } from "@reduxjs/toolkit";

const reelSlice = createSlice({
  name: "reel",
  initialState: {
    reelData: [],
    loopData: [],
    isLoading: false,
  },
  reducers: {
    setReelData: (state, action) => {
      state.reelData = action.payload;
      state.loopData = action.payload;
    },
    setLoopData: (state, action) => {
      state.reelData = action.payload;
      state.loopData = action.payload;
    },
  },
});

export const { setReelData, setLoopData } = reelSlice.actions;
export default reelSlice.reducer;
