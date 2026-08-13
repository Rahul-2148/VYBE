import { User } from "../models/user.model.js";

/**
 * Returns an array of user ObjectIds that either the current user has blocked,
 * or who have blocked the current user.
 */
export const getBlockedUserIds = async (userId) => {
  if (!userId) return [];
  
  try {
    // 1. Users blocked by the current user
    const user = await User.findById(userId).select("blockedUsers");
    const blockedByMe = user?.blockedUsers || [];
    
    // 2. Users who have blocked the current user
    const blockedByOthers = await User.find({ blockedUsers: userId }).select("_id");
    const blockedByOthersIds = blockedByOthers.map(u => u._id);
    
    // Combine both arrays
    const allBlocked = [...blockedByMe, ...blockedByOthersIds];
    
    // Return list of unique string/ObjectId values
    return Array.from(new Set(allBlocked.map((id) => id.toString())));
  } catch (error) {
    console.error("Error fetching blocked user IDs:", error);
    return [];
  }
};
