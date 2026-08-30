import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FolderPlus, Bookmark, Plus, Check, X } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";

export const CollectionsModal = ({ isOpen, onClose, postId, reelId }) => {
  const [collections, setCollections] = useState([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCollections = async () => {
    try {
      const res = await api.get("/post/collections");
      if (res.data?.success) {
        setCollections(res.data.collections || []);
      }
    } catch {
      snackbar.error("Failed to load collections.");
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    if (isOpen) {
      api
        .get("/post/collections")
        .then((res) => {
          if (isSubscribed && res.data?.success) {
            setCollections(res.data.collections || []);
          }
        })
        .catch(() => {
          if (isSubscribed) {
            snackbar.error("Failed to load collections.");
          }
        });
    }
    return () => {
      isSubscribed = false;
    };
  }, [isOpen]);

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      setLoading(true);
      const res = await api.post("/post/collections", { name: newCollectionName.trim() });
      if (res.data?.success) {
        snackbar.success(`Collection "${res.data.collection.name}" created!`);
        setCollections((prev) => [...prev, res.data.collection]);
        setNewCollectionName("");
        setShowCreate(false);
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to create collection.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCollection = async (collectionId) => {
    try {
      const res = await api.post("/post/collections/add-post", { collectionId, postId, reelId });
      if (res.data?.success) {
        snackbar.success("Updated collection!");
        fetchCollections();
      }
    } catch {
      snackbar.error("Failed to update collection.");
    }
  };

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="collections-backdrop"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              onClose?.();
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[1200] flex items-end justify-center p-0 bg-black/75 backdrop-blur-md select-none"
        >
          <motion.div
            key="collections-sheet"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            dragSnapToOrigin
            onDragEnd={(e, info) => {
              if (info.offset.y > 60 || info.velocity.y > 300) {
                onClose?.();
              }
            }}
            className="relative w-full max-w-lg md:max-w-xl bg-surface/98 backdrop-blur-2xl border-t border-x border-border rounded-t-[28px] md:rounded-t-[32px] rounded-b-none shadow-[0_-12px_45px_rgba(0,0,0,0.85)] p-5 text-text max-h-[70vh] flex flex-col space-y-4 overflow-hidden"
          >
            {/* Top Drag Handle Notch */}
            <div
              className="w-10 h-1 bg-border-strong rounded-full opacity-60 mx-auto cursor-pointer hover:opacity-100 transition shrink-0"
              onClick={onClose}
            />

            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-text shadow">
                  <Bookmark className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text">Save to Collection</h3>
                  <p className="text-[11px] text-text-secondary">Organize saved posts into custom folders.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
                title="Close"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* New Collection trigger */}
            {!showCreate ? (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="w-full py-2.5 bg-surface-inset hover:bg-surface-hover border border-border rounded-2xl text-xs font-semibold text-rose-400 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Collection</span>
              </button>
            ) : (
              <form onSubmit={handleCreateCollection} className="flex gap-2 shrink-0">
                <input
                  type="text"
                  placeholder="Collection name (e.g. Travel, Inspiration)"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-surface-inset border border-border rounded-xl outline-none text-text text-xs focus:border-rose-500 transition"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !newCollectionName.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-text font-semibold rounded-xl text-xs shadow transition cursor-pointer"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </form>
            )}

            {/* Collections List */}
            <div className="space-y-2 overflow-y-auto max-h-56 pr-1 hide-scrollbar">
              {collections.length === 0 ? (
                <p className="text-xs text-text-muted text-center py-6">No custom collections yet.</p>
              ) : (
                collections.map((col, idx) => {
                  const inCol =
                    (postId && col.posts?.some((p) => (p?._id || p)?.toString() === postId?.toString())) ||
                    (reelId && col.reels?.some((r) => (r?._id || r)?.toString() === reelId?.toString()));
                  const totalItems = (col.posts?.length || 0) + (col.reels?.length || 0);

                  return (
                    <div
                      key={col._id || `col_${idx}`}
                      onClick={() => handleAddToCollection(col._id)}
                      className="flex items-center justify-between p-3 bg-surface-inset border border-border/80 rounded-2xl cursor-pointer hover:border-border-strong transition"
                    >
                      <div className="flex items-center gap-3">
                        <FolderPlus className="w-5 h-5 text-amber-400" />
                        <div>
                          <p className="text-xs font-bold text-text">{col.name}</p>
                          <span className="text-[10px] text-text-muted">
                            {totalItems} {totalItems === 1 ? "item" : "items"}
                          </span>
                        </div>
                      </div>

                      {inCol && <Check className="w-4.5 h-4.5 text-emerald-400" />}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CollectionsModal;

