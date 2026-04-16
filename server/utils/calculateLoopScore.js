const calculateLoopScore = (loop) => {
  return loop.views * 1 + loop.likes.length * 3 + loop.comments.length * 4;
};
export default calculateLoopScore;
