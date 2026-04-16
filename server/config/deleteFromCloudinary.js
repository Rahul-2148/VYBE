import { v2 as cloudinary } from "cloudinary";

const deleteFromCloudinary = async (publicId, type = "auto") => {
  try {
    if (!publicId) return { success: false, message: "No publicId provided" };

    if (type === "auto") type = undefined;

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: type,
    });

    if (result.result === "ok") {
      return { success: true, message: "Deleted successfully ✔" };
    }

    return {
      success: false,
      message: "Cloudinary delete failed",
      response: result,
    };
  } catch (error) {
    console.log("Cloudinary delete error:", error.message);
    return { success: false, message: error.message };
  }
};

export default deleteFromCloudinary;
