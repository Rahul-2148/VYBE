import uploadOnCloudinary from "../config/cloudinary.js";
import { User } from "../models/user.model.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";
import QRCode from "qrcode";

// get current user controller
export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId; // auth middleware
    const user = await User.findById(userId).populate(
      "posts loops posts.author posts.comments stories followers following"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    return res.status(200).json({
      success: true,
      error: false,
      user,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `getCurrentUser error: ${error.message}` });
  }
};

// get suggested users
export const suggestedUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } })
      .select("name userName profileImage")
      .limit(5)
      .lean();

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
    user.bio = bio || user.bio;
    user.profession = profession || user.profession;
    user.gender = gender || user.gender;
    user.age = age || user.age;
    user.location = location || user.location;
    user.website = website || user.website;
    user.accountType = accountType || user.accountType;
    if (parsedLinks.length) user.links = parsedLinks;

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
    const user = await User.findOne({ userName })
      .select("-password")
      .lean()
      .populate("posts loops stories followers following");
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }
    return res.status(200).json({ success: true, error: false, user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `getProfileByUserName error: ${error.message}` });
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

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== targetUserId.toString()
      );
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUserId.toString()
      );
    } else {
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);
    }

    await currentUser.save();
    await targetUser.save();

    const updatedCurrentUser = await User.findById(currentUserId).populate(
      "posts loops stories followers following"
    );

    return res.status(200).json({
      success: true,
      error: false,
      message: isFollowing
        ? "Unfollowed successfully"
        : "Followed successfully",
      user: updatedCurrentUser,
    });
  } catch (error) {
    return res.status(500).json({ message: `follow error: ${error.message}` });
  }
};
