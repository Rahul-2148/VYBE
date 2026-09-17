import { createSlice } from "@reduxjs/toolkit";

const getInitialMuted = () => {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem("vybe_reels_muted");
    if (saved !== null) {
      return saved === "true";
    }
  }
  if (typeof window !== "undefined" && window.__vybe_reels_muted !== undefined) {
    return window.__vybe_reels_muted;
  }
  return false;
};

const reelSlice = createSlice({
  name: "reel",
  initialState: {
    reelData: [],
    isLoading: false,
    isMuted: getInitialMuted(),
    isModalOpen: false,
  },
  reducers: {
    setReelData: (state, action) => {
      state.reelData = action.payload;
    },
    setReelsLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setReelsMuted: (state, action) => {
      const nextMuted = Boolean(action.payload);
      state.isMuted = nextMuted;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("vybe_reels_muted", String(nextMuted));
      }
      if (typeof window !== "undefined") {
        window.__vybe_reels_muted = nextMuted;
      }
    },
    setIsModalOpen: (state, action) => {
      state.isModalOpen = Boolean(action.payload);
    },
  },
});

export const { setReelData, setReelsLoading, setReelsMuted, setIsModalOpen } = reelSlice.actions;
export default reelSlice.reducer;

