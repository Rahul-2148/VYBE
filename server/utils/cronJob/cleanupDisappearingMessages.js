// /utils/cronJob/cleanupDisappearingMessages.js
import { Message } from "../../models/message.model.js";

export const cleanupExpiredMessages = async () => {
  await Message.deleteMany({
    "disappear.enabled": true,
    "disappear.expireAt": { $lte: new Date() },
  });
};
