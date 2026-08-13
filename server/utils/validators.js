// utils/validators.js - Input Validation Utilities

import { AppError } from "./errorHandler.js";

// Validate email format
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const validatePassword = (password) => {
  if (!password || password.length < 6) {
    throw new AppError("Password must be at least 6 characters long", 400);
  }
  return true;
};

// Validate username
export const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_.-]{3,30}$/;
  if (!usernameRegex.test(username)) {
    throw new AppError(
      "Username must be 3-30 characters and can contain letters, numbers, dots, hyphens, and underscores",
      400
    );
  }
  return true;
};

// Validate MongoDB ObjectId
export const validateObjectId = (id, fieldName = "ID") => {
  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
  return true;
};

// Validate required fields
export const validateRequired = (fields, data) => {
  const missingFields = fields.filter((field) => !data[field]);
  if (missingFields.length > 0) {
    throw new AppError(
      `Missing required fields: ${missingFields.join(", ")}`,
      400
    );
  }
  return true;
};

// Validate conversation exists and user is participant
export const validateConversationAccess = async (
  conversationId,
  userId,
  Conversation
) => {
  validateObjectId(conversationId, "Conversation ID");

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (!conversation.participants.includes(userId)) {
    throw new AppError("Not a participant in this conversation", 403);
  }

  return conversation;
};

// Validate message content
export const validateMessageContent = (type, content, files) => {
  if (type === "text" && !content?.text) {
    throw new AppError("Message text is required", 400);
  }

  if (type === "media" && (!files || files.length === 0)) {
    throw new AppError("Media files are required", 400);
  }

  if (type === "share" && !content?.shared?.type) {
    throw new AppError("Share type is required", 400);
  }

  return true;
};

// Validate user existence
export const validateUserExists = async (userId, User) => {
  validateObjectId(userId, "User ID");

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

// Validate array of user IDs
export const validateUserIds = async (userIds, User) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new AppError("User IDs must be a non-empty array", 400);
  }

  for (const userId of userIds) {
    validateObjectId(userId, "User ID");
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(`User not found: ${userId}`, 404);
    }
  }

  return true;
};

// Validate file uploads
export const validateFileUploads = (files, maxFiles = 10, allowedMimes = []) => {
  if (!files || files.length === 0) {
    throw new AppError("No files uploaded", 400);
  }

  if (files.length > maxFiles) {
    throw new AppError(`Maximum ${maxFiles} files allowed`, 400);
  }

  if (allowedMimes.length > 0) {
    const invalidFiles = files.filter(
      (file) => !allowedMimes.some((mime) => file.mimetype.includes(mime))
    );

    if (invalidFiles.length > 0) {
      throw new AppError(
        `Invalid file type. Allowed: ${allowedMimes.join(", ")}`,
        400
      );
    }
  }

  return true;
};

// Validate pagination
export const validatePagination = (page = 1, limit = 20) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 20));

  return {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum,
  };
};

// Validate search query
export const validateSearchQuery = (query, minLength = 1) => {
  if (!query || query.trim().length < minLength) {
    throw new AppError(
      `Search query must be at least ${minLength} character(s)`,
      400
    );
  }

  return query.trim();
};
