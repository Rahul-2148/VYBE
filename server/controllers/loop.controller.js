import uploadOnCloudinary from "../config/cloudinary.js";
import { Loop } from "../models/loop.model.js";
import { User } from "../models/user.model.js";
import calculateLoopScore from "../utils/calculateLoopScore.js";

// create reel/loop controller
export const uploadLoop = async (req, res) => {
  try {
    const author = req.userId; // auth middleware
    const { caption, location, hashtags, music } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Media is required" });
    }

    // size check (100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (req.file.size > MAX_SIZE) {
      return res.status(400).json({
        message: "Loop video must be under 100MB",
      });
    }

    // mime type check
    if (!req.file.mimetype.startsWith("video/")) {
      return res.status(400).json({
        message: "Only video files allowed for loops",
      });
    }

    const media = await uploadOnCloudinary(req.file.path, "VYBE/loops");

    const loop = await Loop.create({
      caption,
      media,
      author,
      location,
      hashtags,
      music,
    });

    const user = await User.findById(req.userId);
    user.loops.push(loop._id);
    await user.save();

    const populatedLoop = await Loop.findById(loop._id).populate(
      "author",
      "name userName profileImage"
    );
    return res.status(200).json({
      success: true,
      error: false,
      loop: populatedLoop,
      message: "Loop uploaded successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `uploadLoop error: ${error.message}` });
  }
};

// get all loops of logged in user controller
export const getAllLoopsOfLoggedInUser = async (req, res) => {
  try {
    const author = req.userId; // auth middleware
    const loops = await Loop.find({ author })
      .sort({ createdAt: -1 })
      .populate("author", "name userName profileImage")
      .populate("likes")
      .populate("comments.author")
      .populate("viewedBy", "userName name profileImage");
    return res.status(200).json({ success: true, error: false, loops });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `getAllLoops error: ${error.message}` });
  }
};

// like controller
export const likeLoop = async (req, res) => {
  try {
    const loopId = req.params.loopId;
    const userId = req.userId; // auth middleware

    const loop = await Loop.findById(loopId);
    if (!loop) {
      return res.status(404).json({ message: "loop not found!" });
    }

    // BEFORE push/remove like
    if (loop.likes.length > 50000) {
      return res.status(429).json({
        message: "Like limit reached for this loop",
      });
    }

    const alreadyLiked = loop.likes.some(
      (id) => id.toString() === userId.toString()
    );
    if (alreadyLiked) {
      loop.likes = loop.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      loop.likes.push(userId);
    }
    loop.score = calculateLoopScore(loop);

    await loop.save();

    await loop.populate("author", "name userName profileImage");
    await loop.populate("likes", "_id");
    await loop.populate("comments.author");

    return res.status(200).json({
      success: true,
      error: false,
      loop,
      message: alreadyLiked ? "Like removed" : "Like added",
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `likeLoop error: ${error.message}` });
  }
};

// comment controller
export const commentLoop = async (req, res) => {
  try {
    const loopId = req.params.loopId;
    const author = req.userId; // auth middleware
    const { message } = req.body;

    const loop = await Loop.findById(loopId);
    if (!loop) {
      return res.status(404).json({ message: "loop not found!" });
    }

    // 🔒 prevent comment spam (same user)
    const userComments = loop.comments.filter(
      (c) => c.author.toString() === author.toString()
    );

    if (userComments.length >= 100) {
      return res.status(429).json({
        message: "Too many comments on this loop",
      });
    }

    loop.comments.push({ author, message });

    loop.score = calculateLoopScore(loop);

    await loop.save();
    await loop.populate("author", "name userName profileImage"),
      await loop.populate("comments.author");
    return res.status(200).json({ success: true, error: false, loop });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `commentLoop error: ${error.message}` });
  }
};

// get all loops controller
export const getAllLoops = async (req, res) => {
  try {
    const loops = await Loop.find({})
      .sort({ score: -1, createdAt: -1 })
      .populate("author", "name userName profileImage")
      .populate("likes")
      .populate("comments.author")
      .populate("viewedBy", "userName name profileImage");
    return res.status(200).json({ success: true, error: false, loops });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `getAllLoopsAdmin error: ${error.message}` });
  }
};

// increment loop view controller
export const incrementLoopView = async (req, res) => {
  try {
    const { loopId } = req.params;
    const userId = req.userId;

    const loop = await Loop.findById(loopId);
    if (!loop) {
      return res.status(404).json({ message: "Loop not found" });
    }

    // already viewed?
    const alreadyViewed = loop.viewedBy.some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyViewed) {
      return res.status(200).json({
        success: true,
        error: false,
        views: loop.views,
        message: "View already counted",
      });
    }

    // first time view
    loop.views += 1;
    loop.viewedBy.push(userId);

    loop.score = calculateLoopScore(loop);

    await loop.save();

    return res.status(200).json({
      success: true,
      error: false,
      views: loop.views,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `incrementLoopView error: ${error.message}` });
  }
};

// add watch time controller
export const addWatchTime = async (req, res) => {
  const { duration } = req.body;
  const { loopId } = req.params;

  const loop = await Loop.findById(loopId);
  if (!loop) return res.status(404).json({ message: "Loop not found" });

  loop.watchTime += duration;

  loop.score += duration * 5; // 🔥 watch time boost

  await loop.save();

  res.status(200).json({ success: true });
};
