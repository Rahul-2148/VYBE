import { Highlight } from "../models/highlight.model.js";
import { Story } from "../models/story.model.js";
import uploadOnCloudinary from "../config/cloudinary.js";
import deleteFromCloudinary from "../config/deleteFromCloudinary.js";

/**
 * Service for managing Story Highlights (Creation, Cover updates, Reordering, Deletion)
 */

export const createHighlightCollection = async ({ title, authorId, storyIds, coverFile, category }) => {
  let coverImage = null;

  if (coverFile) {
    const uploaded = await uploadOnCloudinary(coverFile.path, "VYBE/highlights");
    coverImage = { url: uploaded.url, public_id: uploaded.public_id };
  } else if (storyIds && storyIds.length > 0) {
    // Default cover to the first story's media URL
    const firstStory = await Story.findById(storyIds[0]);
    if (firstStory?.media) {
      coverImage = { url: firstStory.media.url, public_id: "" };
    }
  }

  const highlight = await Highlight.create({
    title,
    author: authorId,
    stories: storyIds || [],
    coverImage,
    category: category || "General",
  });

  return await Highlight.findById(highlight._id).populate("stories");
};

export const updateHighlightCover = async (highlightId, authorId, coverFile) => {
  const highlight = await Highlight.findOne({ _id: highlightId, author: authorId });
  if (!highlight) {
    throw new Error("Highlight collection not found or unauthorized");
  }

  if (highlight.coverImage?.public_id) {
    try {
      await deleteFromCloudinary(highlight.coverImage.public_id);
    } catch {}
  }

  const uploaded = await uploadOnCloudinary(coverFile.path, "VYBE/highlights");
  highlight.coverImage = { url: uploaded.url, public_id: uploaded.public_id };
  await highlight.save();

  return highlight;
};

export const reorderHighlights = async (authorId, orderedHighlightIds) => {
  const updates = orderedHighlightIds.map((id, index) =>
    Highlight.updateOne({ _id: id, author: authorId }, { $set: { order: index } })
  );
  await Promise.all(updates);
  return { success: true, message: "Highlights order updated" };
};

export const deleteHighlightCollection = async (highlightId, authorId) => {
  const highlight = await Highlight.findOne({ _id: highlightId, author: authorId });
  if (!highlight) {
    throw new Error("Highlight not found or unauthorized");
  }

  if (highlight.coverImage?.public_id) {
    try {
      await deleteFromCloudinary(highlight.coverImage.public_id);
    } catch {}
  }

  await Highlight.findByIdAndDelete(highlightId);
  return { success: true, message: "Highlight collection deleted" };
};
