import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderPlus, Bookmark, Plus, Check, X } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";

export const CollectionsModal = ({ isOpen, onClose, postId, reelId }) => {
  const [collections, setCollections] = useState([]);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await api.get("/post/collections");
      if (res.data.success) {
        setCollections(res.data.collections || []);
      }
    } catch {
      snackbar.error("Failed to load collections.");
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (isOpen) {
      api
        .get("/post/collections")
        .then((res) => {
          if (isMounted && res.data.success) {
            setCollections(res.data.collections || []);
          }
        })
        .catch(() => {
          if (isMounted) snackbar.error("Failed to load collections.");
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      setLoading(true);
      const res = await api.post("/post/collections", { name: newCollectionName });
      if (res.data.success) {
        snackbar.success(`Collection "${res.data.collection.name}" created!`);
        setCollections([...collections, res.data.collection]);
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
      if (res.data.success) {
        snackbar.success("Updated collection!");
        fetchCollections();
      }
    } catch {
      snackbar.error("Failed to update collection.");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-surface border border-border rounded-3xl p-6 text-text shadow-2xl space-y-6"
        >
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-text shadow">
                <Bookmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Save to Collection</h3>
                <p className="text-xs text-text-secondary">Organize saved posts into custom folders.</p>
              </div>
            </div>

            <button onClick={onClose} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Collection trigger */}
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full py-3 bg-surface-inset hover:bg-surface-hover border border-border rounded-2xl text-xs font-semibold text-rose-400 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Collection</span>
            </button>
          ) : (
            <form onSubmit={handleCreateCollection} className="flex gap-2">
              <input
                type="text"
                placeholder="Collection name (e.g. Travel, Inspiration)"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-surface-inset border border-border rounded-xl outline-none text-text text-xs"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 bg-rose-600 text-text font-semibold rounded-xl text-xs shadow hover:bg-rose-500"
              >
                Save
              </button>
            </form>
          )}

          {/* Collections List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {collections.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-6">No custom collections yet.</p>
            ) : (
              collections.map((col) => {
                const inCol =
                  (postId && col.posts?.some((p) => (p._id || p) === postId)) ||
                  (reelId && col.reels?.some((r) => (r._id || r) === reelId));
                return (
                  <div
                    key={col._id}
                    onClick={() => handleAddToCollection(col._id)}
                    className="flex items-center justify-between p-3.5 bg-surface-inset border border-border/80 rounded-2xl cursor-pointer hover:border-border-strong transition"
                  >
                    <div className="flex items-center gap-3">
                      <FolderPlus className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="text-sm font-bold text-text">{col.name}</p>
                        <span className="text-[10px] text-text-muted">{col.posts?.length || 0} items</span>
                      </div>
                    </div>

                    {inCol && <Check className="w-5 h-5 text-emerald-400" />}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CollectionsModal;
