import { createSlice } from "@reduxjs/toolkit";

const loopSlice = createSlice({
  name: "loop",
  initialState: {
    loopData: [],
    isLoading: false,
  },
  reducers: {
    setLoopData: (state, action) => {
      state.loopData = action.payload;
    },
  },
});

export const { setLoopData } = loopSlice.actions;
export default loopSlice.reducer;
