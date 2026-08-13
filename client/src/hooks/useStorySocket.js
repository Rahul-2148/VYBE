import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getSocket } from "../lib/socket";
import {
  toggleStoryLikeInRedux,
  updateStoryReaction,
  markStoryAsViewedInRedux,
  removeStoryFromReduxFeed,
  setStoryFeed,
} from "../redux/features/storySlice";
import api from "../lib/axios";

export const useStorySocket = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleStoryLiked = (data) => {
      if (data?.storyId && data?.userId) {
        dispatch(
          toggleStoryLikeInRedux({
            storyId: data.storyId,
            userId: data.userId,
            isLiked: data.isLiked,
          })
        );
      }
    };

    const handleStoryReacted = (data) => {
      if (data?.storyId && data?.userId) {
        dispatch(
          updateStoryReaction({
            storyId: data.storyId,
            userId: data.userId,
            reaction: data.emoji || data.reaction,
          })
        );
      }
    };

    const handleStoryViewed = (data) => {
      if (data?.storyId && data?.userId) {
        dispatch(
          markStoryAsViewedInRedux({
            storyId: data.storyId,
            userId: data.userId,
          })
        );
      }
    };

    const handleStoryDeleted = (data) => {
      if (data?.storyId) {
        dispatch(removeStoryFromReduxFeed({ storyId: data.storyId }));
      }
    };

    const handleStoryCreated = () => {
      api.get("/story/feed").then((res) => {
        if (res.data?.stories || res.data?.feed) {
          dispatch(setStoryFeed(res.data.stories || res.data.feed));
        }
      }).catch(() => null);
    };

    socket.on("story-liked", handleStoryLiked);
    socket.on("story-reacted", handleStoryReacted);
    socket.on("story-viewed", handleStoryViewed);
    socket.on("story-deleted", handleStoryDeleted);
    socket.on("story-created", handleStoryCreated);

    return () => {
      socket.off("story-liked", handleStoryLiked);
      socket.off("story-reacted", handleStoryReacted);
      socket.off("story-viewed", handleStoryViewed);
      socket.off("story-deleted", handleStoryDeleted);
      socket.off("story-created", handleStoryCreated);
    };
  }, [dispatch, userData]);
};

export default useStorySocket;
