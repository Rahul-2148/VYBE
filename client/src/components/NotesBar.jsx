import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Music, X, Sparkles, Trash2, Send } from "lucide-react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import api from "../lib/axios";
import dp from "../assets/dp3.png";

export const NotesBar = () => {
  const { userData } = useSelector((s) => s.user);
  const currentUser = userData?.user || userData;

  const [notes, setNotes] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [musicTitle, setMusicTitle] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchNotes = async () => {
    try {
      const res = await api.get("/note");
      if (res.data?.notes) {
        setNotes(res.data.notes);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const myNote = notes.find(
    (n) => (n.user?._id || n.user)?.toString() === (currentUser?._id)?.toString()
  );

  const friendNotes = notes.filter(
    (n) => (n.user?._id || n.user)?.toString() !== (currentUser?._id)?.toString()
  );

  const handlePostNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    try {
      setPosting(true);
      const res = await api.post("/note", {
        text: noteText.trim(),
        musicTitle: musicTitle.trim(),
      });

      if (res.data.success) {
        toast.success("Note shared! ✨");
        setShowNoteModal(false);
        setNoteText("");
        setMusicTitle("");
        fetchNotes();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post note.");
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteMyNote = async () => {
    try {
      await api.delete("/note");
      toast.success("Note deleted.");
      setShowNoteModal(false);
      fetchNotes();
    } catch {
      toast.error("Failed to delete note.");
    }
  };

  return (
    <div className="py-2 border-b border-border">
      <div className="flex items-center gap-4 overflow-x-auto px-4 hide-scrollbar">
        {/* MY NOTE (ALWAYS FIRST) */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group" onClick={() => setShowNoteModal(true)}>
          <div className="relative">
            {/* Note Bubble Above Avatar */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface border border-border-strong/60 px-2.5 py-1 rounded-2xl shadow-lg whitespace-nowrap max-w-[100px] text-center z-10">
              {myNote ? (
                <p className="text-[10px] font-semibold text-text truncate max-w-[90px]">{myNote.text}</p>
              ) : (
                <p className="text-[9px] font-bold text-text-secondary">Share note...</p>
              )}
              {/* Bubble Tail */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface border-b border-r border-border-strong/60 transform rotate-45" />
            </div>

            <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-purple-500 to-pink-500 shadow-md transition group-hover:scale-105">
              <img
                src={currentUser?.profileImage?.url || dp}
                alt=""
                className="w-full h-full rounded-full object-cover border border-bg"
              />
            </div>

            {!myNote && (
              <div className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-rose-600 rounded-full border-2 border-bg flex items-center justify-center text-text shadow">
                <Plus className="w-3 h-3" />
              </div>
            )}
          </div>

          <span className="text-[11px] font-semibold text-text truncate max-w-[64px]">Your note</span>
        </div>

        {/* FRIEND NOTES */}
        {friendNotes.map((note) => {
          const userObj = note.user;
          return (
            <div key={note._id} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group">
              <div className="relative">
                {/* Note Bubble */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface/95 border border-border-strong/70 px-2.5 py-1 rounded-2xl shadow-xl whitespace-nowrap max-w-[110px] text-center z-10">
                  <p className="text-[10px] font-bold text-text truncate max-w-[95px]">{note.text}</p>
                  {note.music?.title && (
                    <p className="text-[8px] text-pink-400 font-semibold flex items-center justify-center gap-0.5 truncate">
                      <Music className="w-2.5 h-2.5 shrink-0" />
                      <span>{note.music.title}</span>
                    </p>
                  )}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface border-b border-r border-border-strong/70 transform rotate-45" />
                </div>

                <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 shadow-md transition group-hover:scale-105">
                  <img
                    src={userObj?.profileImage?.url || dp}
                    alt=""
                    className="w-full h-full rounded-full object-cover border border-bg"
                  />
                </div>

                {userObj?.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-bg rounded-full shadow" />
                )}
              </div>

              <span className="text-[11px] font-semibold text-text truncate max-w-[64px]">{userObj?.userName || "User"}</span>
            </div>
          );
        })}
      </div>

      {/* CREATE / UPDATE NOTE MODAL */}
      <AnimatePresence>
        {showNoteModal && (
          <div className="fixed inset-0 z-[650] bg-surface-overlay backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-surface-inset border border-border rounded-3xl p-5 text-text shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-pink-500" />
                  <h3 className="text-sm font-bold">{myNote ? "Update Your Note" : "New Note"}</h3>
                </div>
                <button onClick={() => setShowNoteModal(false)} className="p-1 rounded-full text-text-secondary hover:text-text">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePostNote} className="space-y-3">
                {/* Note Bubble Preview Card */}
                <div className="bg-gradient-to-br from-card to-background-secondary border border-border rounded-2xl p-4 text-center relative overflow-hidden">
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-2">Note Preview (60 chars)</p>
                  <p className="text-sm font-bold text-text min-h-[24px]">{noteText || myNote?.text || "Share a thought..."}</p>
                </div>

                <input
                  type="text"
                  maxLength={60}
                  placeholder="Share what's on your mind... (max 60 chars)"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full bg-surface border border-border px-4 py-2.5 rounded-xl text-xs text-text outline-none focus:border-pink-500"
                  autoFocus
                  required
                />

                <div className="relative">
                  <Music className="w-4 h-4 text-pink-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Add a song title (optional)"
                    value={musicTitle}
                    onChange={(e) => setMusicTitle(e.target.value)}
                    className="w-full bg-surface border border-border pl-9 pr-4 py-2.5 rounded-xl text-xs text-text outline-none focus:border-pink-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  {myNote && (
                    <button
                      type="button"
                      onClick={handleDeleteMyNote}
                      className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition cursor-pointer"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={posting || !noteText.trim()}
                    className="flex-1 py-2.5 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 font-bold rounded-xl text-xs shadow-lg transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{myNote ? "Update Note" : "Share Note"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotesBar;
