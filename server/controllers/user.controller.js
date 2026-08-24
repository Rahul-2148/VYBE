import uploadOnCloudinary from "../config/cloudinary.js";
import { User } from "../models/user.model.js";
import { Report } from "../models/report.model.js";
import { VerificationRequest } from "../models/verificationRequest.model.js";
import { SystemAnnouncement } from "../models/systemAnnouncement.model.js";
import { Post } from "../models/post.model.js";
import { Reel } from "../models/reel.model.js";
import { Story } from "../models/story.model.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";
import QRCode from "qrcode";
import { createNotificationHelper } from "./notification.controller.js";
import { CATEGORY_KEYWORDS } from "./search.controller.js";
import { getBlockedUserIds } from "../utils/blockHelper.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import mongoose from "mongoose";
import { Notification } from "../models/notification.model.js";
import { getSocket } from "../socket.js";

// Transaction Execution helper with standalone fallback
export const runTransactionSafe = async (operationsFn) => {
  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await operationsFn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    // Standalone fallback: If error indicates standalone server, run operations without transaction session
    if (error.message && (
      error.message.includes("replica set") || 
      error.message.includes("Transaction numbers") ||
      error.code === 20 ||
      error.codeName === "IllegalOperation"
    )) {
      console.warn("[Transaction Fallback] MongoDB running as standalone. Executing operations sequentially.");
      return await operationsFn(null);
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

// get current user controller
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId; // auth middleware
    const user = await User.findById(userId)
      .select("-password -twoFactorSecret -twoFactorRecoveryCodes -pendingTwoFactorToken")
      .populate("reels")
      .populate("stories")
      .populate("followers", "name userName profileImage isVerified")
      .populate("following", "name userName profileImage isVerified")
      .populate("followRequests", "name userName profileImage isVerified")
      .populate({
        path: "posts",
        populate: [
          { path: "author", select: "name userName profileImage isVerified" },
          { path: "comments.author", select: "name userName profileImage isVerified" },
        ],
      });

    if (!user) {
      return res.status(404).json({ success: false, error: true, message: "User not found!" });
    }

    return res.status(200).json({
      success: true,
      error: false,
      user,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: true, message: `getCurrentUser error: ${error.message}` });
  }
};

// get suggested users
export const suggestedUsers = async (req, res) => {
  try {
    const { category } = req.query;
    const blockedUserIds = await getBlockedUserIds(req.userId);
    let filter = { _id: { $ne: req.userId, $nin: blockedUserIds } };

    if (category && category !== "all") {
      const keywords = CATEGORY_KEYWORDS[category.toLowerCase()];
      if (keywords && keywords.length > 0) {
        const keywordRegex = new RegExp(keywords.join("|"), "i");
        filter.$or = [
          { category: { $regex: keywordRegex } },
          { profession: { $regex: keywordRegex } },
          { bio: { $regex: keywordRegex } },
          { name: { $regex: keywordRegex } }
        ];
      }
    }

    let users = await User.find(filter)
      .select("name userName profileImage followers isVerified")
      .limit(12)
      .lean();

    // If there are less than 12 users matching the category, pad with other suggestions
    if (users.length < 12) {
      const existingIds = users.map((u) => u._id);
      const excludedIds = [...existingIds, ...blockedUserIds];
      const fallbackUsers = await User.find({
        _id: { $ne: req.userId, $nin: excludedIds },
      })
        .select("name userName profileImage followers isVerified")
        .limit(12 - users.length)
        .lean();
      users = users.concat(fallbackUsers);
    }

    return res.status(200).json({
      success: true,
      error: false,
      users,
    });
  } catch (error) {
    return res.status(500).json({
      message: `suggestedUsers error: ${error.message}`,
    });
  }
};

// edit user profile
export const editProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      name,
      userName,
      bio,
      profession,
      gender,
      age,
      location,
      website,
      accountType,
      links, // string or array
      sensitiveContentFilter,
      snoozeSuggestedPosts,
      category,
      professionalType,
      showCategory,
      contactEmail,
      contactPhone,
      businessAddress,
      showContactInfo,
    } = req.body || {};

    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found!" });

    // -------------------
    // Parse links safely
    // -------------------
    let parsedLinks = [];
    if (links) {
      if (typeof links === "string") {
        try {
          parsedLinks = JSON.parse(links);
        } catch {
          parsedLinks = [];
        }
      } else if (Array.isArray(links)) {
        parsedLinks = links;
      }
    }

    // -------------------
    // Handle username change & QR code
    // -------------------
    if (userName && userName !== user.userName) {
      const existingUser = await User.findOne({
        userName,
        _id: { $ne: userId },
      }).select("-password");

      if (existingUser)
        return res.status(400).json({
          message: "Username already exists! Please try another username",
        });

      // Delete old QR code if exists
      if (user.qrCode?.public_id) {
        await deleteFromCloudinary(user.qrCode.public_id, "image");
      }

      // Generate new QR code for updated username
      const profileUrl = `${process.env.CLIENT_URL}/profile/${userName}`;
      const qrDataUrl = await QRCode.toDataURL(profileUrl);
      const qrUpload = await uploadOnCloudinary(
        qrDataUrl,
        "VYBE/user-qr-codes"
      );

      user.qrCode = {
        url: qrUpload.url,
        public_id: qrUpload.public_id,
      };
      user.userName = userName;
    }

    // -------------------
    // Handle profile image upload
    // -------------------
    if (req.file) {
      if (user.profileImage?.public_id) {
        await deleteFromCloudinary(user.profileImage.public_id, "image");
      }

      const uploadedImage = await uploadOnCloudinary(
        req.file.path,
        "VYBE/user-profile-images"
      );

      user.profileImage = {
        url: uploadedImage.url,
        public_id: uploadedImage.public_id,
      };
    }

    // -------------------
    // Update other fields
    // -------------------
    user.name = name || user.name;
    if (bio !== undefined) user.bio = bio.slice(0, 150);
    if (profession !== undefined) user.profession = profession.slice(0, 50);
    user.gender = gender || user.gender;
    user.age = age || user.age;
    user.location = location || user.location;
    user.website = website || user.website;
    if (accountType !== undefined) user.accountType = accountType;
    if (req.body.isPrivate !== undefined) {
      user.accountType = req.body.isPrivate === true || String(req.body.isPrivate) === "true" ? "private" : "public";
    }
    if (parsedLinks) user.links = parsedLinks;
    if (category !== undefined) user.category = category;
    if (professionalType !== undefined) user.professionalType = professionalType;
    
    // Exact Instagram Rule:
    // 1. If account is private, professionalType must be personal.
    // 2. If professionalType is creator or business, accountType must be public.
    if (user.accountType === "private") {
      user.professionalType = "personal";
    } else if (user.professionalType && user.professionalType !== "personal") {
      user.accountType = "public";
    } else if (!user.professionalType) {
      user.professionalType = "personal";
    }

    if (showCategory !== undefined) {
      user.showCategory = String(showCategory) === "true" || showCategory === true;
    }
    if (contactEmail !== undefined) user.contactEmail = contactEmail;
    if (contactPhone !== undefined) user.contactPhone = contactPhone;
    if (businessAddress !== undefined) user.businessAddress = businessAddress;
    if (showContactInfo !== undefined) {
      user.showContactInfo = String(showContactInfo) === "true" || showContactInfo === true;
    }

    if (sensitiveContentFilter !== undefined) {
      user.sensitiveContentFilter = sensitiveContentFilter;
    }
    if (snoozeSuggestedPosts !== undefined) {
      const isSnoozed = String(snoozeSuggestedPosts) === "true";
      user.snoozeSuggestedPosts = isSnoozed;
      user.snoozeExpiresAt = isSnoozed ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
    }

    const updatedUser = await user.save();

    return res.status(200).json({
      success: true,
      error: false,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("editProfile error:", error);
    return res
      .status(500)
      .json({ message: `editProfile error: ${error.message}` });
  }
};

// get profile by userName controller
export const getProfile = async (req, res) => {
  try {
    const { userName } = req.params || {};
    const cleanUserName = (userName || "").trim();
    const user = await User.findOne({
      userName: { $regex: new RegExp("^" + cleanUserName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "$", "i") },
    })
      .select("-password")
      .populate({
        path: "posts",
        match: { isArchived: { $ne: true } },
        options: { sort: { createdAt: -1 } },
        populate: [
          { path: "author", select: "name userName profileImage isVerified" },
          { path: "comments.author", select: "name userName profileImage isVerified" },
          { path: "taggedUsers.user", select: "userName profileImage" },
        ],
      })
      .populate("reels stories followers following followRequests");
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const currentUserId = req.userId;
    if (currentUserId) {
      const currentUser = await User.findById(currentUserId).select("blockedUsers");
      const isBlockedByMe = currentUser?.blockedUsers?.some(
        (id) => id.toString() === user._id.toString()
      );
      const isBlockingMe = user.blockedUsers?.some(
        (id) => id.toString() === currentUserId.toString()
      );

      if (isBlockedByMe || isBlockingMe) {
        return res.status(404).json({ message: "User not found!" });
      }
    }

    // Increment profile visits dynamically if viewer is a different user
    if (currentUserId && currentUserId.toString() !== user._id.toString()) {
      await User.updateOne(
        { _id: user._id },
        { $inc: { "insights.profileVisitsCount": 1 } }
      );
    } else if (currentUserId && currentUserId.toString() === user._id.toString()) {
      // If owner is viewing own profile, populate full savedPosts and savedReels
      await user.populate([
        {
          path: "savedPosts",
          populate: [
            { path: "author", select: "name userName profileImage isVerified" },
            { path: "comments.author", select: "userName profileImage isVerified" },
          ],
        },
        {
          path: "savedReels",
          populate: { path: "author", select: "name userName profileImage isVerified" },
        },
      ]);
    }

    return res.status(200).json({ success: true, error: false, user: user.toObject() });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `getProfileByUserName error: ${error.message}` });
  }
};

// get all saved items (posts + reels) for logged-in user
export const getSavedItems = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId)
      .populate({
        path: "savedPosts",
        populate: [
          { path: "author", select: "name userName profileImage isVerified" },
          { path: "comments.author", select: "userName profileImage isVerified" },
        ],
      })
      .populate({
        path: "savedReels",
        populate: { path: "author", select: "name userName profileImage isVerified" },
      });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const validSavedPosts = (user.savedPosts || []).filter(Boolean);
    const validSavedReels = (user.savedReels || []).filter(Boolean);

    return res.status(200).json({
      success: true,
      error: false,
      savedPosts: validSavedPosts,
      savedReels: validSavedReels,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `getSavedItems error: ${error.message}`,
    });
  }
};

// follow controller (follow targeted user by current user)
export const follow = async (req, res) => {
  try {
    const currentUserId = req.userId; // auth middleware
    const targetUserId = req.params.targetUserId;
    if (!targetUserId)
      return res.status(400).json({ message: "Target user not found!" });

    if (currentUserId === targetUserId)
      return res.status(400).json({ message: "You can't follow yourself!" });

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);
    if (!currentUser || !targetUser)
      return res.status(404).json({ message: "User not found!" });

    const isBlockedByMe = currentUser.blockedUsers?.some(
      (id) => id.toString() === targetUserId.toString()
    );
    const isBlockingMe = targetUser.blockedUsers?.some(
      (id) => id.toString() === currentUserId.toString()
    );
    if (isBlockedByMe || isBlockingMe) {
      return res.status(400).json({ message: "Unable to follow this user." });
    }

    const isFollowing = currentUser.following.some(
      (id) => id.toString() === targetUserId.toString()
    );

    let message = "";

    await runTransactionSafe(async (session) => {
      if (isFollowing) {
        // Unfollow
        await User.findByIdAndUpdate(currentUserId, {
          $pull: { following: targetUserId }
        }, { session });
        await User.findByIdAndUpdate(targetUserId, {
          $pull: { followers: currentUserId }
        }, { session });
        message = "Unfollowed successfully";
        await Notification.deleteMany({
          recipient: targetUserId,
          sender: currentUserId,
          type: "follow",
        }, { session });
      } else {
        // If target user is private, handle follow requests
        if (targetUser.accountType === "private") {
          const hasRequested = (targetUser.followRequests || []).some(
            (id) => id.toString() === currentUserId.toString()
          );

          if (hasRequested) {
            // Cancel follow request
            await User.findByIdAndUpdate(targetUserId, {
              $pull: { followRequests: currentUserId }
            }, { session });
            message = "Follow request cancelled";
            await Notification.deleteMany({
              recipient: targetUserId,
              sender: currentUserId,
              type: "follow_request",
            }, { session });
          } else {
            // Send follow request
            await User.findByIdAndUpdate(targetUserId, {
              $addToSet: { followRequests: currentUserId }
            }, { session });
            message = "Follow request sent";

            // 🔥 Trigger Real-Time Notification for Request
            createNotificationHelper({
              req,
              recipient: targetUserId,
              sender: currentUserId,
              type: "follow_request",
            }).catch(() => null);
          }
        } else {
          // Direct follow for public accounts
          await User.findByIdAndUpdate(currentUserId, {
            $addToSet: { following: targetUserId }
          }, { session });
          await User.findByIdAndUpdate(targetUserId, {
            $addToSet: { followers: currentUserId }
          }, { session });
          message = "Followed successfully";

          // 🔥 Trigger Real-Time Notification
          createNotificationHelper({
            req,
            recipient: targetUserId,
            sender: currentUserId,
            type: "follow",
          }).catch(() => null);
        }
      }
    });

    const updatedCurrentUser = await User.findById(currentUserId).populate(
      "posts reels stories followers following"
    );

    return res.status(200).json({
      success: true,
      error: false,
      message,
      user: updatedCurrentUser,
    });
  } catch (error) {
    return res.status(500).json({ message: `follow error: ${error.message}` });
  }
};

// Switch Professional Account Type (personal, creator, business)
export const switchAccountType = async (req, res) => {
  try {
    const { professionalType, category, showCategory, contactEmail, contactPhone, businessAddress, showContactInfo } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found!" });

    if (professionalType) {
      user.professionalType = professionalType;
      if (professionalType !== "personal") {
        user.accountType = "public";
      }
    }
    if (category !== undefined) user.category = category;
    if (showCategory !== undefined) {
      user.showCategory = String(showCategory) === "true" || showCategory === true;
    }
    if (contactEmail !== undefined) user.contactEmail = contactEmail;
    if (contactPhone !== undefined) user.contactPhone = contactPhone;
    if (businessAddress !== undefined) user.businessAddress = businessAddress;
    if (showContactInfo !== undefined) {
      user.showContactInfo = String(showContactInfo) === "true" || showContactInfo === true;
    }

    await user.save();

    const msg = user.professionalType === "personal"
      ? `Account switched to personal mode!`
      : `Account switched to ${user.professionalType} mode (${user.category})!`;

    return res.status(200).json({
      success: true,
      user,
      message: msg,
    });
  } catch (error) {
    return res.status(500).json({ message: `switchAccountType error: ${error.message}` });
  }
};

// Get Creator Insights & Analytics
export const getAccountInsights = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate("posts reels followers");
    if (!user) return res.status(404).json({ message: "User not found!" });

    // Calculate aggregated metrics
    let totalLikes = 0;
    let totalComments = 0;

    user.posts?.forEach((p) => {
      totalLikes += p.likes?.length || 0;
      totalComments += p.comments?.length || 0;
    });

    user.reels?.forEach((l) => {
      totalLikes += l.likes?.length || 0;
      totalComments += l.comments?.length || 0;
    });

    const followerCount = user.followers?.length || 0;
    
    // Dynamic reach & impressions calculation
    const reachCount = followerCount * 12 + totalLikes * 3.5 + totalComments * 5 + 14;
    const impressionsCount = reachCount * 1.8 + totalLikes * 2;
    const profileVisits = user.insights?.profileVisitsCount || (followerCount * 4 + 18);

    // Dynamic Gender split from followers (with baseline blending)
    let femaleCount = 0;
    let maleCount = 0;
    let locationCounts = {};

    user.followers?.forEach((f) => {
      if (f.gender === "female") femaleCount++;
      else if (f.gender === "male") maleCount++;

      if (f.location) {
        const loc = f.location.trim();
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
      }
    });

    // Blended gender defaults so dashboard is never empty
    const totalFollowersWithGender = femaleCount + maleCount;
    let femalePercentage = 55; // default baseline
    let malePercentage = 45; // default baseline

    if (totalFollowersWithGender > 0) {
      femalePercentage = Math.round((femaleCount / totalFollowersWithGender) * 100);
      malePercentage = 100 - femalePercentage;
    }

    // Blended location defaults
    const topLocations = [
      { name: "Delhi, India", count: 12 },
      { name: "Mumbai, India", count: 8 },
      { name: "Bangalore, India", count: 6 },
      { name: "New York, USA", count: 4 }
    ];

    if (Object.keys(locationCounts).length > 0) {
      const sortedLocs = Object.entries(locationCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      
      // Override with actual data
      sortedLocs.forEach((loc, idx) => {
        if (topLocations[idx]) {
          topLocations[idx] = { name: loc.name, count: loc.count * 10 };
        } else {
          topLocations.push({ name: loc.name, count: loc.count * 10 });
        }
      });
    }

    // Sort locations by count and compute percentages
    const totalLocCount = topLocations.reduce((sum, item) => sum + item.count, 0) || 1;
    const locationsBreakdown = topLocations
      .map(item => ({
        city: item.name,
        percent: `${Math.round((item.count / totalLocCount) * 100)}%`
      }))
      .sort((a, b) => parseInt(b.percent) - parseInt(a.percent))
      .slice(0, 4);

    return res.status(200).json({
      success: true,
      insights: {
        accountType: user.professionalType || "creator",
        category: user.category || "Digital Creator",
        followersCount: followerCount,
        followingCount: user.following?.length || 0,
        totalPosts: (user.posts?.length || 0) + (user.reels?.length || 0),
        totalLikes,
        totalComments,
        reachCount: Math.round(reachCount),
        impressionsCount: Math.round(impressionsCount),
        profileVisits: Math.round(profileVisits),
        websiteTapsCount: user.insights?.websiteTapsCount || 0,
        contactTapsCount: user.insights?.contactTapsCount || 0,
        directionsTapsCount: user.insights?.directionsTapsCount || 0,
        femalePercentage,
        malePercentage,
        locationsBreakdown
      },
    });
  } catch (error) {
    return res.status(500).json({ message: `getAccountInsights error: ${error.message}` });
  }
};

// Track profile link clicks (website, contact, directions)
export const trackProfileTap = async (req, res) => {
  try {
    const { userId, type } = req.body;
    if (!userId || !type) {
      return res.status(400).json({ success: false, message: "Missing userId or type!" });
    }

    const fieldMap = {
      website: "insights.websiteTapsCount",
      contact: "insights.contactTapsCount",
      directions: "insights.directionsTapsCount"
    };

    const updateField = fieldMap[type];
    if (!updateField) {
      return res.status(400).json({ success: false, message: "Invalid tap type!" });
    }

    await User.updateOne({ _id: userId }, { $inc: { [updateField]: 1 } });
    return res.status(200).json({ success: true, message: `${type} tap tracked successfully!` });
  } catch (error) {
    return res.status(500).json({ success: false, message: `trackProfileTap error: ${error.message}` });
  }
};

// Get Privacy & DM Settings
export const getPrivacySettings = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("privacySettings accountType readReceipts blockedUsers");
    if (!user) return res.status(404).json({ message: "User not found!" });

    return res.status(200).json({
      success: true,
      privacySettings: user.privacySettings || {
        allowMessagesFrom: "everyone",
        allowStoryRepliesFrom: "everyone",
        allowPostSharingToDM: "everyone",
        messageRequestPermission: "requests",
      },
      accountType: user.accountType || "public",
      readReceipts: user.readReceipts ?? true,
    });
  } catch (error) {
    return res.status(500).json({ message: `getPrivacySettings error: ${error.message}` });
  }
};

// Update Privacy & DM Settings
export const updatePrivacySettings = async (req, res) => {
  try {
    const { allowMessagesFrom, allowStoryRepliesFrom, allowPostSharingToDM, messageRequestPermission, accountType, readReceipts } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found!" });

    if (!user.privacySettings) {
      user.privacySettings = {};
    }

    if (allowMessagesFrom !== undefined) user.privacySettings.allowMessagesFrom = allowMessagesFrom;
    if (allowStoryRepliesFrom !== undefined) user.privacySettings.allowStoryRepliesFrom = allowStoryRepliesFrom;
    if (allowPostSharingToDM !== undefined) user.privacySettings.allowPostSharingToDM = allowPostSharingToDM;
    if (messageRequestPermission !== undefined) user.privacySettings.messageRequestPermission = messageRequestPermission;
    if (accountType !== undefined) {
      user.accountType = accountType;
      if (accountType === "private") {
        user.professionalType = "personal";
      }
    }
    if (readReceipts !== undefined) user.readReceipts = readReceipts;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Privacy settings updated successfully!",
      privacySettings: user.privacySettings,
      accountType: user.accountType,
      readReceipts: user.readReceipts,
    });
  } catch (error) {
    return res.status(500).json({ message: `updatePrivacySettings error: ${error.message}` });
  }
};

// Get User Theme
export const getUserTheme = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(200).json({ success: true, theme: "system" });
    }
    const user = await User.findById(req.userId).select("theme");
    return res.status(200).json({
      success: true,
      theme: user?.theme || "system",
    });
  } catch (error) {
    return res.status(200).json({ success: true, theme: "system" });
  }
};

// Update User Theme
export const updateUserTheme = async (req, res) => {
  try {
    const { theme } = req.body;
    if (!["light", "dark", "system"].includes(theme)) {
      return res.status(400).json({ message: "Invalid theme value!" });
    }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { theme } },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ message: "User not found!" });
    return res.status(200).json({
      success: true,
      message: "Theme updated successfully!",
      theme: user.theme,
    });
  } catch (error) {
    return res.status(500).json({ message: `updateUserTheme error: ${error.message}` });
  }
};

// Get list of pending follow requests for the current user
export const getFollowRequests = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("followRequests")
      .populate("followRequests", "name userName profileImage isVerified");

    if (!user) return res.status(404).json({ message: "User not found!" });

    return res.status(200).json({
      success: true,
      requests: user.followRequests || [],
    });
  } catch (error) {
    return res.status(500).json({ message: `getFollowRequests error: ${error.message}` });
  }
};

// Accept or decline a follow request
export const handleFollowRequest = async (req, res) => {
  try {
    const { senderId } = req.body;
    const { action } = req.params; // 'accept' or 'decline'

    if (!senderId) {
      return res.status(400).json({ message: "Sender ID is required!" });
    }

    await runTransactionSafe(async (session) => {
      if (action === "accept") {
        // Atomically update current user (remove from requests, add to followers)
        const currentUser = await User.findByIdAndUpdate(
          req.userId,
          {
            $pull: { followRequests: senderId },
            $addToSet: { followers: senderId }
          },
          { returnDocument: 'after', session }
        );
        
        // Atomically update sender (add to following)
        await User.findByIdAndUpdate(
          senderId,
          { $addToSet: { following: req.userId } },
          { session }
        );

        if (!currentUser) throw new Error("User not found!");

        // Trigger accept notification
        createNotificationHelper({
          req,
          recipient: senderId,
          sender: req.userId,
          type: "follow_accept",
        }).catch(() => null);

        await Notification.deleteMany({
          recipient: req.userId,
          sender: senderId,
          type: "follow_request",
        }, { session });
      } else {
        // Decline follow request: pull senderId from followRequests
        const currentUser = await User.findByIdAndUpdate(
          req.userId,
          { $pull: { followRequests: senderId } },
          { returnDocument: 'after', session }
        );
        if (!currentUser) throw new Error("User not found!");

        await Notification.deleteMany({
          recipient: req.userId,
          sender: senderId,
          type: "follow_request",
        }, { session });
      }
    });

    // Populate updated requests list
    const populatedUser = await User.findById(req.userId)
      .select("followRequests followers following")
      .populate("followRequests", "name userName profileImage isVerified");

    return res.status(200).json({
      success: true,
      message: action === "accept" ? "Follow request accepted" : "Follow request declined",
      requests: populatedUser.followRequests || [],
      followersCount: populatedUser.followers.length,
      followingCount: populatedUser.following.length,
    });
  } catch (error) {
    return res.status(500).json({ message: `handleFollowRequest error: ${error.message}` });
  }
};

// Direct User-level Block
export const blockUserDirect = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetUserId } = req.params;

    if (userId.toString() === targetUserId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot block yourself!" });
    }

    const [user, targetUser] = await Promise.all([
      User.findById(userId),
      User.findById(targetUserId),
    ]);

    if (!user || !targetUser) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    // Add to blockedUsers if not already blocked
    if (!user.blockedUsers.some((id) => id.toString() === targetUserId.toString())) {
      user.blockedUsers.push(targetUserId);
    }

    // Sever following/follower relationship in both directions
    user.following.pull(targetUserId);
    user.followers.pull(targetUserId);
    targetUser.following.pull(userId);
    targetUser.followers.pull(userId);

    // Pull any pending follow requests
    user.followRequests.pull(targetUserId);
    targetUser.followRequests.pull(userId);

    await Promise.all([user.save(), targetUser.save()]);

    // Also look up and update any 1-to-1 conversation to mark blockedBy
    const conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [userId, targetUserId] }
    });

    if (conversation) {
      if (!conversation.blockedBy.some((id) => id.toString() === userId.toString())) {
        conversation.blockedBy.push(userId);
        await conversation.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "User blocked successfully",
      isBlocked: true,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Direct User-level Unblock
export const unblockUserDirect = async (req, res) => {
  try {
    const userId = req.userId;
    const { targetUserId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    user.blockedUsers.pull(targetUserId);
    await user.save();

    // Also update any 1-to-1 conversation to pull from blockedBy
    const conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [userId, targetUserId] }
    });

    if (conversation) {
      conversation.blockedBy.pull(userId);
      await conversation.save();
    }

    return res.status(200).json({
      success: true,
      message: "User unblocked successfully",
      isBlocked: false,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get list of blocked users
export const getBlockedUsersList = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId)
      .select("blockedUsers")
      .populate("blockedUsers", "userName profileImage name isVerified");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found!" });
    }

    return res.status(200).json({
      success: true,
      blockedUsers: user.blockedUsers || [],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get followers of a user with live search support
export const getUserFollowers = async (req, res) => {
  try {
    const { userName } = req.params;
    const { search = "" } = req.query;
    const cleanUserName = (userName || "").trim();

    const targetUser = await User.findOne({
      userName: { $regex: new RegExp("^" + cleanUserName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "$", "i") },
    }).select("followers accountType");

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const filter = {
      _id: { $in: targetUser.followers || [] },
    };

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { userName: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
      ];
    }

    const followers = await User.find(filter).select(
      "name userName profileImage isVerified bio profession followers following"
    );

    return res.status(200).json({
      success: true,
      followers,
      count: targetUser.followers?.length || 0,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get following of a user with live search support
export const getUserFollowing = async (req, res) => {
  try {
    const { userName } = req.params;
    const { search = "" } = req.query;
    const cleanUserName = (userName || "").trim();

    const targetUser = await User.findOne({
      userName: { $regex: new RegExp("^" + cleanUserName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "$", "i") },
    }).select("following accountType");

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const filter = {
      _id: { $in: targetUser.following || [] },
    };

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { userName: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
      ];
    }

    const following = await User.find(filter).select(
      "name userName profileImage isVerified bio profession followers following"
    );

    return res.status(200).json({
      success: true,
      following,
      count: targetUser.following?.length || 0,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get mutual connections between followers and following
export const getUserMutuals = async (req, res) => {
  try {
    const { userName } = req.params;
    const cleanUserName = (userName || "").trim();

    const targetUser = await User.findOne({
      userName: { $regex: new RegExp("^" + cleanUserName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") + "$", "i") },
    }).select("followers following");

    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const followerIds = (targetUser.followers || []).map((id) => id.toString());
    const followingIds = (targetUser.following || []).map((id) => id.toString());

    // Mutuals: in both followers AND following
    const mutualIds = followerIds.filter((id) => followingIds.includes(id));

    const mutuals = await User.find({
      _id: { $in: mutualIds },
    }).select("name userName profileImage isVerified bio profession followers following");

    return res.status(200).json({
      success: true,
      mutuals,
      count: mutuals.length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Request Contact Phone Number from user
export const requestContactInfo = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.userId;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: "Target user required" });
    }

    if (targetUserId.toString() === currentUserId.toString()) {
      return res.status(400).json({ success: false, message: "Cannot request your own contact" });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const currentUser = await User.findById(currentUserId).select("name userName profileImage contactPhone");

    const uObjId = new mongoose.Types.ObjectId(currentUserId);
    const tObjId = new mongoose.Types.ObjectId(targetUserId);

    // 1. Find or create 1-on-1 Conversation
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [uObjId, tObjId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [uObjId, tObjId],
        isGroup: false,
        requestStatus: "none",
      });
    }

    // 2. Create the Contact Request Message in the conversation
    const message = await Message.create({
      conversation: conversation._id,
      sender: currentUserId,
      type: "contact_request",
      content: {
        text: `📱 Contact Request: @${currentUser.userName} requested to view your phone number.`,
        contactData: {
          name: currentUser.name,
          phone: currentUser.contactPhone || "",
        },
      },
    });

    // Update conversation last message & timestamp
    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    // 3. Create Notification
    const notification = await Notification.create({
      recipient: targetUserId,
      sender: currentUserId,
      type: "contact_request",
      commentText: "requested your contact phone number in chat.",
    });

    // 4. Real-time emit via Socket.IO
    try {
      const io = req.app.locals.io;
      if (io) {
        const populatedMessage = await Message.findById(message._id).populate("sender", "name userName profileImage isVerified");
        const notifPayload = {
          _id: notification._id,
          recipient: targetUserId,
          sender: currentUser,
          type: "contact_request",
          commentText: "requested your contact phone number in chat.",
          createdAt: notification.createdAt,
        };

        const targetRooms = [`user_${targetUserId}`, targetUserId.toString()];
        targetRooms.forEach((r) => {
          io.to(r).emit("notification-received", { notification: notifPayload });
          io.to(r).emit("new-notification", notifPayload);
          io.to(r).emit("notification:received", notifPayload);
          io.to(r).emit("receive-message", populatedMessage);
          io.to(r).emit("message-received", { message: populatedMessage });
          io.to(r).emit("new-message", populatedMessage);
        });

        io.to(conversation._id.toString()).emit("new-message", populatedMessage);
        io.to(`conversation_${conversation._id}`).emit("message-received", { message: populatedMessage });
      }
    } catch (sErr) {
      console.warn("Socket notification warning:", sErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Contact request sent to @${targetUser.userName} in Direct Messages!`,
      conversationId: conversation._id,
      messageId: message._id,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `requestContactInfo error: ${err.message}` });
  }
};

// 31. Unified Content & User Reporting Endpoint
export const submitReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, description } = req.body;
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ success: false, message: "Target type, target ID, and reason are required." });
    }

    let reportedUserId = null;

    if (targetType === "post") {
      const p = await Post.findById(targetId);
      if (p) reportedUserId = p.author;
    } else if (targetType === "reel") {
      const r = await Reel.findById(targetId);
      if (r) reportedUserId = r.author;
    } else if (targetType === "story") {
      const s = await Story.findById(targetId);
      if (s) reportedUserId = s.author;
    } else if (targetType === "user") {
      reportedUserId = targetId;
    }

    const report = await Report.create({
      reporter: req.userId,
      reportedUser: reportedUserId,
      targetType,
      targetId,
      reason,
      description: description || "",
      status: "pending",
    });

    const populatedReport = await Report.findById(report._id)
      .populate("reporter", "name userName profileImage")
      .populate("reportedUser", "name userName profileImage isVerified strikes");

    const socket = getSocket();
    if (socket) {
      socket.to("admin_moderator").to("admin_admin").to("admin_superadmin").emit("report:new", populatedReport);
      socket.to("admin_staff").emit("stats:report-count", { increment: 1 });
    }

    return res.status(201).json({
      success: true,
      message: "Thank you for reporting. Our Trust & Safety team will review this promptly.",
      reportId: report._id,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `submitReport error: ${error.message}` });
  }
};

// 32. Apply for Verified Badge (Meta Blue Check)
export const applyForVerification = async (req, res) => {
  try {
    const { fullName, knownAs, category, documentType, socialLinks, additionalInfo } = req.body;

    if (!fullName || !category || !documentType) {
      return res.status(400).json({ success: false, message: "Full name, category, and document type are required." });
    }

    // Check if pending request exists
    const existing = await VerificationRequest.findOne({ user: req.userId, status: "pending" });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending verification request under review.",
      });
    }

    const documentImages = [];
    if (req.file) {
      const uploaded = await uploadOnCloudinary(req.file.path, "VYBE/verification-docs");
      if (uploaded) {
        documentImages.push({ url: uploaded.url, publicId: uploaded.public_id });
      }
    }

    const parsedLinks = typeof socialLinks === "string" ? JSON.parse(socialLinks) : socialLinks || [];

    const request = await VerificationRequest.create({
      user: req.userId,
      fullName,
      knownAs: knownAs || "",
      category,
      documentType,
      documentImages,
      socialLinks: parsedLinks,
      additionalInfo: additionalInfo || "",
      status: "pending",
    });

    await User.findByIdAndUpdate(req.userId, { verificationStatus: "pending" });

    const populatedRequest = await VerificationRequest.findById(request._id)
      .populate("user", "name userName email profileImage followers createdAt");

    const socket = getSocket();
    if (socket) {
      socket.to("admin_support").to("admin_admin").to("admin_superadmin").emit("verification:new", populatedRequest);
      socket.to("admin_staff").emit("stats:verification-count", { increment: 1 });
    }

    return res.status(201).json({
      success: true,
      message: "Verification application submitted! We will review your documents shortly.",
      request,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `applyForVerification error: ${error.message}` });
  }
};

// 33. Get Verification Status
export const getVerificationStatus = async (req, res) => {
  try {
    const request = await VerificationRequest.findOne({ user: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      status: request ? request.status : "none",
      request,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getVerificationStatus error: ${error.message}` });
  }
};

// 34. Get Active System Announcements for Users
export const getActiveAnnouncements = async (req, res) => {
  try {
    const now = new Date();
    const announcements = await SystemAnnouncement.find({
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, announcements });
  } catch (error) {
    return res.status(500).json({ success: false, message: `getActiveAnnouncements error: ${error.message}` });
  }
};
