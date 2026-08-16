import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { getBlockedUserIds } from "./blockHelper.js";

/**
 * Returns an array of mongoose.Types.ObjectId representing author IDs
 * whose posts/reels should NOT be visible to the current user in the feed.
 *
 * Rules:
 * 1. Public accounts (personal/creator/business) are NEVER excluded for any user.
 * 2. Private accounts are visible ONLY to the owner and accepted followers.
 * 3. Blocked users (in both directions) are ALWAYS excluded.
 */
export const getExcludedAuthorIdsForFeed = async (currentUserId) => {
  try {
    const currentUserIdStr = currentUserId ? currentUserId.toString() : null;

    // 1. Blocked user IDs (both directions)
    const blockedUserIds = currentUserId ? await getBlockedUserIds(currentUserId) : [];
    const excludedIds = new Set(blockedUserIds.map((id) => id.toString()));

    // 2. Query only private accounts
    // Exact Instagram Rule: Creator & Business accounts are always 100% public.
    // An account is private ONLY if accountType === "private" AND it is a personal account.
    const privateUsers = await User.find({
      $and: [
        { $or: [{ accountType: "private" }, { isPrivate: true }] },
        { professionalType: { $nin: ["creator", "business"] } },
      ],
    }).select("_id followers");

    for (const pUser of privateUsers) {
      const pUserIdStr = pUser._id.toString();

      // Current user can always view their own posts
      if (currentUserIdStr && pUserIdStr === currentUserIdStr) {
        continue;
      }

      // If current user is following this private account, allowed!
      const isFollowing =
        currentUserIdStr &&
        Array.isArray(pUser.followers) &&
        pUser.followers.some((fId) => fId && fId.toString() === currentUserIdStr);

      if (!isFollowing) {
        excludedIds.add(pUserIdStr);
      }
    }

    return Array.from(excludedIds)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
  } catch (err) {
    console.error("getExcludedAuthorIdsForFeed error:", err);
    return [];
  }
};
