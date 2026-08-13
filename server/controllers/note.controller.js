import { Note } from "../models/note.model.js";
import { User } from "../models/user.model.js";
import { getBlockedUserIds } from "../utils/blockHelper.js";

// Create or update current user's note
export const createOrUpdateNote = async (req, res) => {
  try {
    const userId = req.userId;
    const { text, musicTitle, musicArtist } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Note text is required" });
    }

    if (text.trim().length > 60) {
      return res.status(400).json({ success: false, message: "Note text cannot exceed 60 characters" });
    }

    // Delete any existing active note for this user
    await Note.deleteMany({ user: userId });

    const note = await Note.create({
      user: userId,
      text: text.trim(),
      music: musicTitle ? { title: musicTitle.trim(), artist: musicArtist?.trim() || "" } : null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const populated = await note.populate("user", "userName name profileImage isVerified");

    return res.status(201).json({
      success: true,
      message: "Note created successfully! ✨",
      note: populated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `createNote error: ${error.message}` });
  }
};

// Get active notes from user and following
export const getActiveNotes = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Users whose notes we want to see: self + people we follow (excluding blocked users)
    const blockedUserIds = await getBlockedUserIds(userId);
    const allowedUserIds = [userId, ...(user.following || [])].filter(
      (id) => !blockedUserIds.includes(id.toString())
    );

    const notes = await Note.find({
      user: { $in: allowedUserIds },
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "userName name profileImage isOnline lastSeen isVerified")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      notes,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getNotes error: ${error.message}` });
  }
};

// Delete user's active note
export const deleteNote = async (req, res) => {
  try {
    const userId = req.userId;
    await Note.deleteMany({ user: userId });
    return res.status(200).json({ success: true, message: "Note deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: `deleteNote error: ${error.message}` });
  }
};
