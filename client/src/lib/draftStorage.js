// client/src/lib/draftStorage.js
// Ultra-reliable Drafts Media Storage & Instant Thumbnail Generator for VYBE

const DB_NAME = "vybe_drafts_db";
const STORE_NAME = "draft_media";
const DB_VERSION = 1;

/**
 * Open or initialize IndexedDB for draft media binary persistence
 */
const openDraftsDB = () => {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return resolve(null);
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "draftId" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => {
      console.warn("IndexedDB open error:", e);
      resolve(null);
    };
  });
};

/**
 * Generate a compressed, lightweight JPEG data URL thumbnail from an image or video file
 * Keeps metadata payload < 60KB so it never fails on network / MongoDB limits
 */
export const generateDraftThumbnail = (fileOrBlob, maxDimension = 640) => {
  return new Promise((resolve) => {
    if (!fileOrBlob) return resolve("");

    const isVideo =
      fileOrBlob.type?.includes("video") ||
      fileOrBlob.name?.endsWith(".mp4") ||
      fileOrBlob.name?.endsWith(".mov") ||
      fileOrBlob.name?.endsWith(".webm");

    if (isVideo) {
      try {
        const video = document.createElement("video");
        video.preload = "auto";
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = "anonymous";
        const objectUrl = URL.createObjectURL(fileOrBlob);
        video.src = objectUrl;

        const cleanup = () => {
          URL.revokeObjectURL(objectUrl);
          video.remove();
        };

        const timeout = setTimeout(() => {
          cleanup();
          resolve("");
        }, 5000);

        video.onloadeddata = () => {
          // Seek to 0.5s or 0 to get a non-black frame
          video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
        };

        video.onseeked = () => {
          clearTimeout(timeout);
          try {
            const canvas = document.createElement("canvas");
            const w = video.videoWidth || 360;
            const h = video.videoHeight || 640;
            const scale = Math.min(1, maxDimension / Math.max(w, h));
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);

            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
            cleanup();
            resolve(dataUrl);
          } catch {
            cleanup();
            resolve("");
          }
        };

        video.onerror = () => {
          clearTimeout(timeout);
          cleanup();
          resolve("");
        };
      } catch {
        resolve("");
      }
      return;
    }

    // For Image files
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(fileOrBlob);
      img.src = objectUrl;

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        img.remove();
      };

      const timeout = setTimeout(() => {
        cleanup();
        resolve("");
      }, 4000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement("canvas");
          const w = img.naturalWidth || 400;
          const h = img.naturalHeight || 400;
          const scale = Math.min(1, maxDimension / Math.max(w, h));
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          cleanup();
          resolve(dataUrl);
        } catch {
          cleanup();
          resolve("");
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        cleanup();
        resolve("");
      };
    } catch {
      resolve("");
    }
  });
};

/**
 * Save actual original File/Blob binaries into local IndexedDB storage
 */
export const saveDraftMediaLocal = async (draftId, files) => {
  if (!draftId || !files || files.length === 0) return false;
  try {
    const db = await openDraftsDB();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const itemsToStore = files.map((f, idx) => ({
        index: idx,
        file: f.file || f,
        type: f.type || (f.file ? f.file.type : "image"),
        altText: f.altText || "",
        aspectRatio: f.aspectRatio || "aspect-square",
      }));

      store.put({
        draftId: String(draftId),
        savedAt: Date.now(),
        items: itemsToStore,
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn("saveDraftMediaLocal error:", err);
    return false;
  }
};

/**
 * Retrieve original File/Blob binaries from local IndexedDB storage
 */
export const getDraftMediaLocal = async (draftId) => {
  if (!draftId) return null;
  try {
    const db = await openDraftsDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(String(draftId));

      req.onsuccess = () => {
        if (req.result && req.result.items) {
          resolve(req.result.items);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("getDraftMediaLocal error:", err);
    return null;
  }
};

/**
 * Delete draft binaries from IndexedDB when draft is published or discarded
 */
export const deleteDraftMediaLocal = async (draftId) => {
  if (!draftId) return;
  try {
    const db = await openDraftsDB();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(String(draftId));
  } catch (err) {
    console.warn("deleteDraftMediaLocal error:", err);
  }
};

export default {
  generateDraftThumbnail,
  saveDraftMediaLocal,
  getDraftMediaLocal,
  deleteDraftMediaLocal,
};
