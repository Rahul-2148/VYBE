import { createSlice } from "@reduxjs/toolkit";

const storySlice = createSlice({
  name: "story",
  initialState: {
    feed: [],
    yourStory: null,
    followingStories: [],
    activeUserIndex: 0,
    activeStoryIndex: 0,
  },
  reducers: {
    setStoryFeed: (state, action) => {
      state.feed = action.payload;
      state.yourStory = action.payload.find((s) => s.isCurrentUser) || null;
      state.followingStories = action.payload.filter((s) => !s.isCurrentUser);
    },

    setActiveStory: (state, action) => {
      state.activeUserIndex = action.payload.userIndex;
      state.activeStoryIndex = action.payload.storyIndex;
    },

    // ✅ NEW reducer for reactions
    updateStoryReaction: (state, action) => {
      const { storyId, reaction, userId } = action.payload;
      const updateInStories = (storiesArray) => {
        const story = storiesArray.find((s) => s._id === storyId);
        if (!story) return;

        // remove old reaction if exists
        story.reactions = story.reactions?.filter(
          (r) => r.userId !== userId
        ) || [];

        // add new reaction
        if (reaction) {
          story.reactions.push({ userId, emoji: reaction });
        }
      };

      updateInStories(state.feed);
      updateInStories(state.yourStory ? [state.yourStory] : []);
      updateInStories(state.followingStories);
    },
  },
});

export const { setStoryFeed, setActiveStory, updateStoryReaction } = storySlice.actions;
export default storySlice.reducer;
