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

    markStoryAsViewedInRedux: (state, action) => {
      const { storyId, userId } = action.payload;
      const updateStories = (storiesArray) => {
        storiesArray.forEach((group) => {
          group.stories?.forEach((story) => {
            if (story._id === storyId) {
              const alreadyViewed = story.viewers?.some((v) => (v?._id?.toString() || v) === userId);
              if (!alreadyViewed) {
                story.viewers = [...(story.viewers || []), userId];
              }
              story.hasSeen = true;
            }
          });
          group.hasUnseen = group.stories?.some((s) => !s.hasSeen);
        });
      };

      updateStories(state.feed);
      if (state.yourStory) updateStories([state.yourStory]);
      updateStories(state.followingStories);
    },

    toggleStoryLikeInRedux: (state, action) => {
      const { storyId, userId, isLiked } = action.payload;
      const updateLike = (group) => {
        group?.stories?.forEach((story) => {
          if (story._id === storyId) {
            if (isLiked) {
              const alreadyLiked = story.likes?.some((id) => (id?._id?.toString() || id) === userId);
              if (!alreadyLiked) {
                story.likes = [...(story.likes || []), userId];
              }
            } else {
              story.likes = story.likes?.filter((id) => (id?._id?.toString() || id) !== userId) || [];
            }
          }
        });
      };

      state.feed.forEach(updateLike);
      if (state.yourStory) updateLike(state.yourStory);
      state.followingStories.forEach(updateLike);
    },

    updateStoryReaction: (state, action) => {
      const { storyId, reaction, userId } = action.payload;
      const updateInStories = (storiesArray) => {
        storiesArray.forEach((group) => {
          group.stories?.forEach((story) => {
            if (story._id === storyId) {
              story.reactions = story.reactions?.filter((r) => r.userId !== userId) || [];
              if (reaction) {
                story.reactions.push({ userId, emoji: reaction });
              }
            }
          });
        });
      };

      updateInStories(state.feed);
      if (state.yourStory) updateInStories([state.yourStory]);
      updateInStories(state.followingStories);
    },

    updateStoryPollVotesInRedux: (state, action) => {
      const { storyId, pollVotes } = action.payload;
      const updateVotes = (group) => {
        group?.stories?.forEach((story) => {
          if (story._id === storyId) {
            story.pollVotes = pollVotes;
          }
        });
      };
      state.feed.forEach(updateVotes);
      if (state.yourStory) updateVotes(state.yourStory);
      state.followingStories.forEach(updateVotes);
    },

    updateStoryQuestionResponsesInRedux: (state, action) => {
      const { storyId, questionResponses } = action.payload;
      const updateResponses = (group) => {
        group?.stories?.forEach((story) => {
          if (story._id === storyId) {
            story.questionResponses = questionResponses;
          }
        });
      };
      state.feed.forEach(updateResponses);
      if (state.yourStory) updateResponses(state.yourStory);
      state.followingStories.forEach(updateResponses);
    },

    updateStoryQuizAnswersInRedux: (state, action) => {
      const { storyId, quizAnswers } = action.payload;
      const updateQuiz = (group) => {
        group?.stories?.forEach((story) => {
          if (story._id === storyId) {
            story.quizAnswers = quizAnswers;
          }
        });
      };
      state.feed.forEach(updateQuiz);
      if (state.yourStory) updateQuiz(state.yourStory);
      state.followingStories.forEach(updateQuiz);
    },

    removeStoryFromReduxFeed: (state, action) => {
      const { storyId } = action.payload;
      const filterGroup = (group) => {
        if (!group) return null;
        group.stories = group.stories?.filter((s) => s._id !== storyId) || [];
        return group.stories.length > 0 ? group : null;
      };

      state.feed = state.feed.map(filterGroup).filter(Boolean);
      if (state.yourStory) state.yourStory = filterGroup(state.yourStory);
      state.followingStories = state.followingStories.map(filterGroup).filter(Boolean);
    },
  },
});

export const {
  setStoryFeed,
  setActiveStory,
  markStoryAsViewedInRedux,
  toggleStoryLikeInRedux,
  updateStoryReaction,
  updateStoryPollVotesInRedux,
  updateStoryQuestionResponsesInRedux,
  updateStoryQuizAnswersInRedux,
  removeStoryFromReduxFeed,
} = storySlice.actions;

export default storySlice.reducer;
