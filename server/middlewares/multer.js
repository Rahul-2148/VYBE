import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Never trust a client-supplied filename for a server-side filesystem path.
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExtension = /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : "";
    cb(null, crypto.randomUUID() + safeExtension);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: Math.min(
      Math.max(Number.parseInt(process.env.MAX_FILE_SIZE || "1073741824", 10) || 1073741824, 1),
      1024 * 1024 * 1024
    ),
    files: 10,
    fields: 100,
    parts: 110,
  }, // Configurable up to 1GB per file; also cap multipart counts.
});
// Trigger nodemon reload

