import { Meeting } from "../models/meeting.model.js";
import { User } from "../models/user.model.js";
import crypto from "crypto";
import { generateMeetingAISummary } from "../utils/aiEngine.js";

// Helper to generate Google Meet-style meeting codes (e.g. "abc-defg-hij")
const generateMeetingCode = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const getSegment = (len) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${getSegment(3)}-${getSegment(4)}-${getSegment(3)}`;
};

// Helper to normalize user input (matches "abc-defg-hij" even if entered as "abcdefghij")
const normalizeMeetingId = (id) => {
  if (!id) return "";
  const cleaned = id.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 10)}`;
  }
  return id.trim().toLowerCase();
};

/**
 * Create a new Vybe Meet meeting
 * POST /api/v1/meet/create
 */
export const createMeeting = async (req, res) => {
  try {
    const { title, settings } = req.body;
    let meetingId = generateMeetingCode();

    // Ensure collision resistance
    let existing = await Meeting.findOne({ meetingId });
    while (existing) {
      meetingId = generateMeetingCode();
      existing = await Meeting.findOne({ meetingId });
    }

    const meeting = await Meeting.create({
      meetingId,
      title: title?.trim() || "VYBE Meeting",
      host: req.userId,
      status: "waiting",
      participants: [
        {
          user: req.userId,
          role: "host",
          status: "joined",
          joinedAt: new Date(),
        },
      ],
      settings: {
        allowScreenShare: settings?.allowScreenShare ?? true,
        allowChat: settings?.allowChat ?? true,
        allowReactions: settings?.allowReactions ?? true,
        muteOnEntry: settings?.muteOnEntry ?? false,
        isLocked: settings?.isLocked ?? false,
      },
    });

    const populated = await Meeting.findById(meeting._id).populate(
      "host",
      "name userName profileImage isVerified"
    );

    return res.status(201).json({
      success: true,
      message: "Meeting created successfully",
      meeting: populated || meeting,
    });
  } catch (error) {
    console.error("[createMeeting] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get meeting details by meetingId
 * GET /api/v1/meet/:meetingId
 */
export const getMeetingInfo = async (req, res) => {
  try {
    const { meetingId } = req.params;
    if (!meetingId) {
      return res.status(400).json({ success: false, message: "Meeting ID is required" });
    }

    const normalizedId = normalizeMeetingId(meetingId);
    const meeting = await Meeting.findOne({ meetingId: normalizedId })
      .populate("host", "name userName profileImage isVerified")
      .populate("participants.user", "name userName profileImage isVerified");

    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found or has expired" });
    }

    const isHost = meeting.host?._id?.toString() === req.userId.toString();

    return res.status(200).json({
      success: true,
      meeting,
      isHost,
    });
  } catch (error) {
    console.error("[getMeetingInfo] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Join meeting
 * POST /api/v1/meet/:meetingId/join
 */
export const joinMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const normalizedId = normalizeMeetingId(meetingId);

    let meeting = await Meeting.findOne({ meetingId: normalizedId });
    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    if (meeting.settings?.isLocked && meeting.host.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Meeting is locked by the host" });
    }

    const isHost = meeting.host.toString() === req.userId.toString();

    // Transition status to active
    if (meeting.status === "waiting") {
      meeting.status = "active";
      meeting.startTime = new Date();
    }

    // Add or update participant
    const existingIndex = meeting.participants.findIndex(
      (p) => p.user.toString() === req.userId.toString()
    );

    if (existingIndex !== -1) {
      meeting.participants[existingIndex].status = "joined";
      meeting.participants[existingIndex].joinedAt = new Date();
      meeting.participants[existingIndex].leftAt = null;
    } else {
      meeting.participants.push({
        user: req.userId,
        role: isHost ? "host" : "participant",
        status: "joined",
        joinedAt: new Date(),
      });
    }

    await meeting.save();

    const populated = await Meeting.findById(meeting._id)
      .populate("host", "name userName profileImage isVerified")
      .populate("participants.user", "name userName profileImage isVerified");

    return res.status(200).json({
      success: true,
      message: "Joined meeting successfully",
      meeting: populated || meeting,
      isHost,
    });
  } catch (error) {
    console.error("[joinMeeting] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * End meeting (Host only)
 * POST /api/v1/meet/:meetingId/end
 */
export const endMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const normalizedId = normalizeMeetingId(meetingId);

    const meeting = await Meeting.findOne({ meetingId: normalizedId });
    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    if (meeting.host.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Only the host can end the meeting" });
    }

    meeting.status = "ended";
    meeting.endTime = new Date();
    meeting.participants.forEach((p) => {
      if (p.status === "joined") {
        p.status = "left";
        p.leftAt = new Date();
      }
    });

    await meeting.save();

    return res.status(200).json({
      success: true,
      message: "Meeting ended successfully",
    });
  } catch (error) {
    console.error("[endMeeting] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update meeting settings
 * PATCH /api/v1/meet/:meetingId/settings
 */
export const updateMeetingSettings = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { settings } = req.body;

    const meeting = await Meeting.findOne({ meetingId: normalizeMeetingId(meetingId) });
    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    if (meeting.host.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Only host can update meeting settings" });
    }

    if (settings) {
      meeting.settings = {
        ...meeting.settings,
        ...settings,
      };
      await meeting.save();
    }

    return res.status(200).json({
      success: true,
      message: "Settings updated",
      settings: meeting.settings,
    });
  } catch (error) {
    console.error("[updateMeetingSettings] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get current user's recent meetings
 * GET /api/v1/meet/history
 */
export const getRecentMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [{ host: req.userId }, { "participants.user": req.userId }],
      hiddenFor: { $ne: req.userId },
    })
      .populate("host", "name userName profileImage isVerified")
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      meetings,
    });
  } catch (error) {
    console.error("[getRecentMeetings] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove a single meeting from recent meetings history
 * DELETE /api/v1/meet/history/:meetingId
 */
export const removeRecentMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const meeting = await Meeting.findOneAndUpdate(
      { meetingId },
      { $addToSet: { hiddenFor: req.userId } },
      { new: true }
    );

    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Meeting removed from recent history",
    });
  } catch (error) {
    console.error("[removeRecentMeeting] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Clear all meetings from recent meetings history
 * DELETE /api/v1/meet/history/clear-all
 */
export const clearAllRecentMeetings = async (req, res) => {
  try {
    await Meeting.updateMany(
      {
        $or: [{ host: req.userId }, { "participants.user": req.userId }],
      },
      {
        $addToSet: { hiddenFor: req.userId },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Recent meetings history cleared",
    });
  } catch (error) {
    console.error("[clearAllRecentMeetings] error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Gemini AI in Meet Assistant
 * POST /api/v1/meet/:meetingId/ai-assistant
 */
export const getMeetingAIAssistant = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { actionType = "summary", transcript = "", chatMessages = [], customPrompt = "" } = req.body;

    const normalizedId = normalizeMeetingId(meetingId);
    const meeting = await Meeting.findOne({ meetingId: normalizedId });
    const meetingTitle = meeting?.title || "VYBE Meeting";

    const aiContent = await generateMeetingAISummary({
      title: meetingTitle,
      transcript,
      chatMessages,
      actionType,
      customPrompt,
    });

    return res.status(200).json({
      success: true,
      actionType,
      content: aiContent,
    });
  } catch (error) {
    console.error("[getMeetingAIAssistant] error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate AI meeting intelligence",
    });
  }
};
