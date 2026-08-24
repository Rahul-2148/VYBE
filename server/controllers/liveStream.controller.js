import { LiveStream } from "../models/liveStream.model.js";
import { User } from "../models/user.model.js";
import { Reel } from "../models/reel.model.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const ARCHIVE_TTL_DAYS = 30;

function archiveExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + ARCHIVE_TTL_DAYS);
  return d;
}

// ── Start Live Stream ────────────────────────────────────────────────────────

export const startLiveStream = async (req, res) => {
  try {
    const { title, audience = "everyone" } = req.body;
    const userId = req.userId;

    // End any previously active live streams for this user
    await LiveStream.updateMany(
      { host: userId, isLive: true },
      { isLive: false, endedAt: new Date() }
    );

    const live = await LiveStream.create({
      host: userId,
      title: title?.trim() || "Live Video",
      audience,
      isLive: true,
      viewers: [userId],
      peakViewers: 1,
      totalUniqueViewers: 1,
      startedAt: new Date(),
    });

    const populated = await LiveStream.findById(live._id)
      .populate("host", "name userName profileImage isVerified followers")
      .populate("coHost", "name userName profileImage isVerified");

    return res.status(201).json({
      success: true,
      live: populated,
      message: "You are now live!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `startLive error: ${error.message}` });
  }
};

// ── Get Active Live Streams ──────────────────────────────────────────────────

export const getActiveLiveStreams = async (req, res) => {
  try {
    const lives = await LiveStream.find({ isLive: true })
      .sort({ createdAt: -1 })
      .populate("host", "name userName profileImage isVerified")
      .populate("coHost", "name userName profileImage isVerified");

    return res.status(200).json({ success: true, lives });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getActiveLives error: ${error.message}` });
  }
};

// ── Get Live Stream Details ──────────────────────────────────────────────────

export const getLiveStreamDetails = async (req, res) => {
  try {
    const { streamId } = req.params;
    const live = await LiveStream.findById(streamId)
      .populate("host", "name userName profileImage isVerified bio followers")
      .populate("coHost", "name userName profileImage isVerified")
      .populate("viewers", "name userName profileImage isVerified");

    if (!live) {
      return res.status(404).json({ success: false, message: "Live stream not found" });
    }

    return res.status(200).json({ success: true, live });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── End Live Stream ──────────────────────────────────────────────────────────

export const endLiveStream = async (req, res) => {
  try {
    const { streamId } = req.params;
    const { totalHearts = 0 } = req.body;
    const live = await LiveStream.findById(streamId);

    if (!live) return res.status(404).json({ success: false, message: "Live stream not found" });
    if (live.host.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Only the host can end the live stream" });
    }

    const endedAt = new Date();
    const durationSeconds = Math.max(0, Math.floor((endedAt - new Date(live.startedAt)) / 1000));

    live.isLive = false;
    live.endedAt = endedAt;
    live.isArchived = true;
    live.archiveExpiresAt = archiveExpiry();
    live.stats = {
      durationSeconds,
      totalHearts: Number(totalHearts) || live.stats?.totalHearts || 0,
      totalComments: live.comments.length,
    };
    await live.save();

    return res.status(200).json({
      success: true,
      message: "Live broadcast ended",
      stats: {
        durationSeconds,
        peakViewers: live.peakViewers,
        totalUniqueViewers: live.totalUniqueViewers || live.viewers.length,
        totalComments: live.comments.length,
        totalHearts: live.stats.totalHearts,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `endLive error: ${error.message}` });
  }
};

// ── Upload Recording (client-side recorded video) ────────────────────────────

export const uploadRecording = async (req, res) => {
  try {
    const { streamId } = req.params;
    const live = await LiveStream.findById(streamId);

    if (!live) return res.status(404).json({ success: false, message: "Stream not found" });
    if (live.host.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Host only" });
    }

    if (!req.file && !req.body.videoUrl) {
      return res.status(400).json({ success: false, message: "No recording file provided" });
    }

    let uploadResult;

    if (req.body.videoUrl) {
      // Direct Cloudinary URL provided (client already uploaded via unsigned upload)
      live.recording = {
        url: req.body.videoUrl,
        publicId: req.body.publicId || null,
        thumbnailUrl: req.body.thumbnailUrl || null,
        duration: live.stats?.durationSeconds || 0,
        uploadedAt: new Date(),
      };
    } else if (req.file) {
      // Server-side upload from multer
      const uploadResult = await uploadOnCloudinary(req.file.path, "vybe_live_recordings");

      let thumbnailUrl = uploadResult.url;
      if (uploadResult.url && uploadResult.url.includes("/upload/")) {
        thumbnailUrl = uploadResult.url
          .replace("/upload/", "/upload/so_0,w_480,h_480,c_fill,q_auto,f_jpg/")
          .replace(/\.\w+$/, ".jpg");
      }

      live.recording = {
        url: uploadResult.url,
        publicId: uploadResult.public_id,
        thumbnailUrl,
        duration: live.stats?.durationSeconds || 0,
        uploadedAt: new Date(),
      };
    }

    await live.save();

    return res.status(200).json({
      success: true,
      recording: live.recording,
      message: "Recording saved!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `uploadRecording error: ${error.message}` });
  }
};

// ── Share Live Recording as Reel Post ────────────────────────────────────────

export const shareLiveAsReel = async (req, res) => {
  try {
    const { streamId } = req.params;
    const { caption = "" } = req.body;
    const live = await LiveStream.findById(streamId);

    if (!live) return res.status(404).json({ success: false, message: "Stream not found" });
    if (live.host.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Host only" });
    }
    if (!live.recording?.url) {
      return res.status(400).json({ success: false, message: "No recording available to share" });
    }
    if (live.sharedAsReel) {
      return res.status(400).json({ success: false, message: "Already shared as reel" });
    }

    // Create a reel from the live recording
    const reel = await Reel.create({
      author: req.userId,
      caption: caption.trim() || `${live.title} — Live Replay`,
      media: {
        url: live.recording.url,
        public_id: live.recording.publicId || "live_replay",
      },
      duration: live.recording.duration || live.stats?.durationSeconds || 0,
    });

    live.sharedAsReel = reel._id;
    await live.save();

    return res.status(201).json({
      success: true,
      reel,
      message: "Live replay shared as reel!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `shareLiveAsReel error: ${error.message}` });
  }
};

// ── Get Live Archive (user's past broadcasts) ────────────────────────────────

export const getLiveArchive = async (req, res) => {
  try {
    const userId = req.userId;
    const archives = await LiveStream.find({
      host: userId,
      isLive: false,
      isArchived: true,
    })
      .sort({ createdAt: -1 })
      .select("title recording stats startedAt endedAt peakViewers totalUniqueViewers sharedAsReel audience")
      .limit(50);

    return res.status(200).json({ success: true, archives });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Delete Archive Entry ─────────────────────────────────────────────────────

export const deleteArchive = async (req, res) => {
  try {
    const { streamId } = req.params;
    const live = await LiveStream.findById(streamId);

    if (!live) return res.status(404).json({ success: false, message: "Archive not found" });
    if (live.host.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Host only" });
    }

    // Delete recording from Cloudinary if exists
    if (live.recording?.publicId) {
      await deleteFromCloudinary(live.recording.publicId, "video").catch(() => null);
    }

    live.isArchived = false;
    live.recording = { url: null, publicId: null, thumbnailUrl: null, duration: 0, uploadedAt: null };
    await live.save();

    return res.status(200).json({ success: true, message: "Archive deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Get Replay (recording URL for an ended stream) ───────────────────────────

export const getReplay = async (req, res) => {
  try {
    const { streamId } = req.params;
    const live = await LiveStream.findById(streamId)
      .populate("host", "name userName profileImage isVerified")
      .select("title recording stats startedAt endedAt peakViewers host audience");

    if (!live) return res.status(404).json({ success: false, message: "Stream not found" });
    if (!live.recording?.url) {
      return res.status(404).json({ success: false, message: "No replay available" });
    }

    return res.status(200).json({ success: true, replay: live });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Toggle Comments (host only) ──────────────────────────────────────────────

export const toggleComments = async (req, res) => {
  try {
    const { streamId } = req.params;
    const { disabled } = req.body;

    const live = await LiveStream.findById(streamId);
    if (!live) return res.status(404).json({ success: false, message: "Stream not found" });
    if (live.host.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Host only" });
    }

    live.commentsDisabled = Boolean(disabled);
    await live.save();

    return res.status(200).json({ success: true, commentsDisabled: live.commentsDisabled });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Submit Live Q&A Question ─────────────────────────────────────────────────

export const submitLiveQuestion = async (req, res) => {
  try {
    const { streamId } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: "Question text required" });
    }

    const live = await LiveStream.findById(streamId);
    if (!live || !live.isLive) {
      return res.status(404).json({ success: false, message: "Live stream not active" });
    }

    const user = await User.findById(userId).select("userName profileImage name");
    const newQuestion = {
      user: userId,
      userName: user?.userName || "Viewer",
      userAvatar: user?.profileImage?.url || "",
      text: text.trim(),
      isAnswered: false,
      isDisplayed: false,
      createdAt: new Date(),
    };

    live.questions.push(newQuestion);
    await live.save();

    const savedQ = live.questions[live.questions.length - 1];

    return res.status(200).json({ success: true, question: savedQ, message: "Question submitted!" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Toggle Display Question (host only) ──────────────────────────────────────

export const toggleQuestionDisplay = async (req, res) => {
  try {
    const { streamId, questionId } = req.params;
    const { display } = req.body;

    const live = await LiveStream.findById(streamId);
    if (!live) return res.status(404).json({ success: false, message: "Stream not found" });
    if (live.host.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Host only" });
    }

    live.questions.forEach((q) => {
      if (q._id.toString() === questionId) {
        q.isDisplayed = Boolean(display);
        if (display) q.isAnswered = true;
      } else if (display) {
        q.isDisplayed = false;
      }
    });

    await live.save();

    return res.status(200).json({ success: true, questions: live.questions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Pin / Unpin Comment (host only) ──────────────────────────────────────────

export const togglePinComment = async (req, res) => {
  try {
    const { streamId } = req.params;
    const { comment } = req.body;

    const live = await LiveStream.findById(streamId);
    if (!live) return res.status(404).json({ success: false, message: "Stream not found" });
    if (live.host.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Host only" });
    }

    if (!comment) {
      live.pinnedComment = null;
    } else {
      live.pinnedComment = {
        user: comment.user,
        userName: comment.userName || "Viewer",
        text: comment.text,
        pinnedAt: new Date(),
      };
    }

    await live.save();

    return res.status(200).json({ success: true, pinnedComment: live.pinnedComment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── Kick / Mute Viewer (host only) ──────────────────────────────────────────

export const kickMuteViewer = async (req, res) => {
  try {
    const { streamId, viewerId } = req.params;
    const { action } = req.body;

    const live = await LiveStream.findById(streamId);
    if (!live) return res.status(404).json({ success: false, message: "Stream not found" });
    if (live.host.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: "Host only" });
    }

    if (action === "mute") {
      if (!live.mutedUsers.includes(viewerId)) {
        live.mutedUsers.push(viewerId);
      }
    } else if (action === "kick") {
      live.viewers = live.viewers.filter((v) => v.toString() !== viewerId.toString());
      if (!live.mutedUsers.includes(viewerId)) {
        live.mutedUsers.push(viewerId);
      }
    }

    await live.save();

    return res.status(200).json({ success: true, message: `Viewer ${action}ed successfully` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
