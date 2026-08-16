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

    // Optimize format & quality for both images and videos
    let finalUrl = result.secure_url;
    if (result.resource_type === "image" && finalUrl.includes("/upload/")) {
      finalUrl = finalUrl.replace("/upload/", "/upload/f_auto,q_auto/");
    } else if (result.resource_type === "video" && finalUrl.includes("/upload/")) {
      finalUrl = finalUrl.replace("/upload/", "/upload/f_auto,q_auto:best,vc_auto/");
    }

    return {
      url: finalUrl,
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
