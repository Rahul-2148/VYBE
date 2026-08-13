import { LiveStream } from "../models/liveStream.model.js";

// Start Live Stream Broadcast
export const startLiveStream = async (req, res) => {
  try {
    const { title } = req.body;
    const live = await LiveStream.create({
      host: req.userId,
      title: title || "VYBE Live Stream",
      isLive: true,
      viewers: [req.userId],
      peakViewers: 1,
    });

    const populated = await live.populate("host", "name userName profileImage");

    return res.status(201).json({
      success: true,
      live: populated,
      message: "Live broadcast started!",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `startLive error: ${error.message}` });
  }
};

// Get Ongoing Live Broadcasts
export const getActiveLiveStreams = async (req, res) => {
  try {
    const lives = await LiveStream.find({ isLive: true })
      .sort({ createdAt: -1 })
      .populate("host", "name userName profileImage");

    return res.status(200).json({
      success: true,
      lives,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getActiveLives error: ${error.message}` });
  }
};

// End Live Stream Broadcast
export const endLiveStream = async (req, res) => {
  try {
    const { streamId } = req.params;
    const live = await LiveStream.findById(streamId);

    if (!live) return res.status(404).json({ message: "Live stream not found" });
    if (live.host.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: "Only the host can end the live stream" });
    }

    live.isLive = false;
    await live.save();

    return res.status(200).json({
      success: true,
      message: "Live broadcast ended",
      stats: {
        peakViewers: live.peakViewers,
        totalComments: live.comments.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `endLive error: ${error.message}` });
  }
};
