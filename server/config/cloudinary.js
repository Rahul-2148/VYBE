import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const uploadOnCloudinary = async (file, folder) => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const isBase64 = typeof file === "string" && file.startsWith("data:");

    const result = await cloudinary.uploader.upload(file, {
      resource_type: "auto",
      folder: folder, // fully dynamic
    });

    // Delete local file only if real file path exists
    if (!isBase64 && fs.existsSync(file)) {
      fs.unlinkSync(file);
    }

    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    const isBase64 = typeof file === "string" && file.startsWith("data:");

    if (!isBase64 && fs.existsSync(file)) {
      fs.unlinkSync(file);
    }

    console.log(error);
    throw error;
  }
};

export default uploadOnCloudinary;
