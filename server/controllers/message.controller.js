// controllers/message.controller.js
import uploadOnCloudinary from "../config/cloudinary.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { User } from "../models/user.model.js";
import { getIO } from "../socket.js";

const emitRealtime = (conversationId, eventName, payload) => {
  try {
    const io = getIO();
    io.to(`conversation:${conversationId}`).emit(eventName, payload);
  } catch {
    // Socket server may not be initialized in tests/non-realtime runs.
  }
};

export const sendMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId, type, text, sharedType, sharedId, replyTo } =
      req.body;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!conversationId)
      return res.status(400).json({ message: "conversationId missing" });

    const conversation = await Conversation.findById(conversationId);
    if (!conversation)
      return res.status(404).json({ message: "Conversation not found" });

    if (!conversation.participants.includes(userId)) {
      return res.status(403).json({ message: "Not a participant" });
    }

    const content = {};

    // Text
    if (type === "text") {
      if (!text) return res.status(400).json({ message: "Text required" });
      content.text = text;
    }

    // MEDIA (MULTIPLE)
    if (req.files && req.files.length > 0) {
      content.media = [];

      for (const file of req.files) {
        const upload = await uploadOnCloudinary(file.path, "VYBE/messages");

        content.media.push({
          url: upload.url,
          public_id: upload.public_id,
          type: file.mimetype.startsWith("image")
            ? "image"
            : file.mimetype.startsWith("video")
            ? "video"
            : "document",
          name: file.originalname,
        });
      }
    }

    // Share
    if (type === "share") {
      if (!sharedType || !sharedId)
        return res.status(400).json({ message: "Shared type & id required" });
      content.shared = { type: sharedType, refId: sharedId };
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: userId,
      type: req.files && req.files.length > 0 ? content.media[0].type : type,
      content,
      replyTo,
      status: "sent",
    });

    // Update lastMessage & unread counts
    conversation.lastMessage = message._id;
    conversation.participants.forEach((uid) => {
      if (uid.toString() !== userId.toString()) {
        conversation.unreadCount.set(
          uid,
          (conversation.unreadCount.get(uid) || 0) + 1
        );
      }
    });
    await conversation.save();

    const populatedMessage = await message.populate(
      "sender",
      "userName profileImage"
    );

    emitRealtime(conversationId, "message:new", populatedMessage);

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({ message: `sendMessage error: ${error.message}` });
  }
};

// GET MESSAGES (Pagination)
export const getMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const messages = await Message.find({
      conversation: conversationId,
      deletedFor: { $ne: userId },
    })
      .populate("sender", "userName profileImage")
      .populate({
        path: "replyTo",
        populate: {
          path: "sender",
          select: "userName profileImage",
        },
      })
      .sort({ createdAt: 1 });

    res.status(200).json({ messages });
  } catch (error) {
    console.error("getMessages error:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

// MARK AS SEEN (Read Receipts Logic)
export const markConversationSeen = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;

    const user = await User.findById(userId);
    if (!user.readReceipts) {
      // Instagram style: silently ignore
      return res.status(200).json({ success: true });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        status: { $ne: "seen" },
      },
      {
        $addToSet: { seenBy: userId },
        $set: { status: "seen" },
      }
    );

    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { [`unreadCount.${userId}`]: 0 },
    });

    emitRealtime(conversationId, "conversation:seen", {
      conversationId,
      seenBy: userId,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: `markSeen error: ${error.message}` });
  }
};

// EDIT MESSAGE (Text only)
export const editMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;
    const { text } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (message.type !== "text") {
      return res.status(400).json({ message: "Only text messages editable" });
    }

    message.content.text = text;
    message.edited = true;
    await message.save();

    const updatedMessage = await message.populate("sender", "userName profileImage");

    emitRealtime(message.conversation.toString(), "message:updated", updatedMessage);

    res.status(200).json({
      success: true,
      message: updatedMessage,
      info: "Message edited!",
    });
  } catch (error) {
    res.status(500).json({ message: `editMessage error: ${error.message}` });
  }
};

// DELETE MESSAGE (For Me)
export const deleteMessageForMe = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;

    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { deletedFor: userId },
    });

    res.status(200).json({ success: true, message: "Message deleted!" });
  } catch (error) {
    res.status(500).json({ message: `deleteMessage error: ${error.message}` });
  }
};

// DELETE MESSAGE (For Everyone) - Instagram Style (Soft Delete)
export const deleteMessageForEveryone = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // only sender can delete for everyone
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // time limit (Instagram like)
    const MAX_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days
    if (Date.now() - message.createdAt.getTime() > MAX_TIME) {
      return res.status(403).json({
        message: "Delete for everyone time expired",
      });
    }

    // delete media from cloudinary (if any)
    if (message.content?.media?.length > 0) {
      for (const m of message.content.media) {
        if (m.public_id) {
          await deleteFromCloudinary(m.public_id);
        }
      }
    }

    // 🔥 SOFT DELETE (Instagram Style)
    message.deletedForEveryone = true;
    message.status = "seen";
    message.type = "text";
    message.content = { text: "This message was deleted" };
    message.reactions = [];

    await message.save();

    const updatedMessage = await message.populate("sender", "userName profileImage");

    emitRealtime(
      message.conversation.toString(),
      "message:updated",
      updatedMessage
    );

    res.json({
      success: true,
      message: updatedMessage,
      info: "Message deleted for everyone!",
    });
  } catch (error) {
    res.status(500).json({
      message: `deleteForEveryone error: ${error.message}`,
    });
  }
};

// MARK MESSAGE AS SEEN
export const markMessageAsSeen = async (req, res) => {
  const userId = req.userId;
  const { messageId } = req.params;

  const message = await Message.findById(messageId);
  if (!message) return res.status(404).json({ message: "Message not found" });

  if (!message.seenBy.includes(userId)) {
    message.seenBy.push(userId);
    await message.save();

    emitRealtime(message.conversation.toString(), "message:updated", message);
  }

  // 🔥 DELETE AFTER SEEN
  const conversation = await Conversation.findById(message.conversation);

  if (
    message.disappear.enabled &&
    message.disappear.afterSeen &&
    message.seenBy.length >= conversation.participants.length - 1
  ) {
    await Message.findByIdAndDelete(messageId);
  }

  res.json({ success: true });
};

// REACT MESSAGE
export const reactMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // check if already reacted
    const existingIndex = message.reactions.findIndex(
      (r) => r.user.toString() === userId.toString()
    );

    if (existingIndex !== -1) {
      // same emoji => remove reaction
      if (message.reactions[existingIndex].emoji === emoji) {
        message.reactions.splice(existingIndex, 1);
      } else {
        // change emoji
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      // add new reaction
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();

    const populated = await message.populate("sender", "userName profileImage");

    emitRealtime(message.conversation.toString(), "message:updated", populated);

    res.status(200).json({ success: true, message: populated });
  } catch (error) {
    res.status(500).json({
      message: `reactMessage error: ${error.message}`,
    });
  }
};

// SEARCH MESSAGES
export const searchMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { conversationId } = req.params;
    const { q } = req.query;

    if (!q) return res.json({ messages: [] });

    const messages = await Message.find({
      conversation: conversationId,
      "content.text": { $regex: q, $options: "i" },
      deletedForEveryone: { $ne: true },
      deletedFor: { $ne: userId },
    })
      .populate("sender", "userName profileImage")
      .sort({ createdAt: 1 })
      .limit(50);

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
