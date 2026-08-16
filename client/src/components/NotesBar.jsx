import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Music, X, Sparkles, Trash2, Send, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useSelector } from "react-redux";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import StoryMusicPickerModal from "./StoryMusicPickerModal";
import dp from "../assets/dp3.png";

export const NotesBar = () => {
  const { userData } = useSelector((s) => s.user);
  const currentUser = userData?.user || userData;

  const [notes, setNotes] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [posting, setPosting] = useState(false);

  // Active Note Sound Playback Modal
  const [activePlayingNote, setActivePlayingNote] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef(null);

  const fetchNotes = async () => {
    try {
      const res = await api.get("/note");
      if (res.data?.notes) {
        setNotes(res.data.notes);
      }
    } catch (e) {
      console.warn("NotesBar: fetchNotes failed", e);
    }
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
        music: selectedMusic || null,
        musicTitle: selectedMusic?.title || "",
        musicArtist: selectedMusic?.artist || "",
      });

      if (res.data.success) {
        snackbar.success("Note shared with music! ✨");
        setShowNoteModal(false);
        setNoteText("");
        setSelectedMusic(null);
        fetchNotes();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to post note.");
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteMyNote = async () => {
    try {
      await api.delete("/note");
      snackbar.success("Note deleted.");
      setShowNoteModal(false);
      fetchNotes();
    } catch (e) {
      console.warn("NotesBar: handleDeleteMyNote failed", e);
      snackbar.error("Failed to delete note.");
    }
  };

  // Play Friend's Note Audio Snippet
  const handleNoteClick = (note) => {
    if (!note) return;

    if (note.music?.audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(note.music.audioUrl);
      audio.currentTime = note.music.startTime || 0;
      audio.play().catch(() => null);

      audio.onended = () => {
        setIsPlayingAudio(false);
      };

      audioRef.current = audio;
      setIsPlayingAudio(true);
      setActivePlayingNote(note);
    } else {
      setActivePlayingNote(note);
    }
  };

  const closeNotePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
    setActivePlayingNote(null);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="py-2.5 border-b border-border">
      <div className="flex items-center gap-4 overflow-x-auto px-4 hide-scrollbar">
        {/* MY NOTE (ALWAYS FIRST) */}
        <div
          className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
          onClick={() => {
            if (myNote) {
              setNoteText(myNote.text);
              setSelectedMusic(myNote.music || null);
            }
            setShowNoteModal(true);
          }}
        >
          <div className="relative">
            {/* Note Bubble Above Avatar */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface/95 border border-border-strong/70 px-2.5 py-1 rounded-2xl shadow-xl whitespace-nowrap max-w-[110px] text-center z-10">
              {myNote ? (
                <div>
                  <p className="text-[10px] font-bold text-text truncate max-w-[95px]">{myNote.text}</p>
                  {myNote.music?.title && (
                    <p className="text-[8px] text-rose-400 font-semibold flex items-center justify-center gap-1 truncate">
                      <Music className="w-2.5 h-2.5 shrink-0 animate-spin-slow" />
                      <span>{myNote.music.title}</span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[9px] font-bold text-text-secondary">Share note...</p>
              )}
              {/* Bubble Tail */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-surface border-b border-r border-border-strong/70 transform rotate-45" />
            </div>

            <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-purple-500 via-rose-500 to-pink-500 shadow-md transition group-hover:scale-105">
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
            <div
              key={note._id}
              onClick={() => handleNoteClick(note)}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
            >
              <div className="relative">
                {/* Note Bubble */}
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface/95 border border-border-strong/70 px-2.5 py-1 rounded-2xl shadow-xl whitespace-nowrap max-w-[110px] text-center z-10">
                  <p className="text-[10px] font-bold text-text truncate max-w-[95px]">{note.text}</p>
                  {note.music?.title && (
                    <p className="text-[8px] text-pink-400 font-semibold flex items-center justify-center gap-1 truncate">
                      <Music className="w-2.5 h-2.5 shrink-0 animate-spin-slow" />
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

              <span className="text-[11px] font-semibold text-text truncate max-w-[64px]">
                {userObj?.userName || "User"}
              </span>
            </div>
          );
        })}
      </div>

      {/* FRIEND NOTE AUDIO PLAYBACK MODAL */}
      <AnimatePresence>
        {activePlayingNote && (
          <div
            className="fixed inset-0 z-[650] bg-surface-overlay backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeNotePlayback}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-surface border border-border rounded-3xl p-5 text-text shadow-2xl space-y-4 text-center"
            >
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold text-text-secondary">
                  @{activePlayingNote.user?.userName}'s Note
                </span>
                <button onClick={closeNotePlayback} className="p-1 text-text-muted hover:text-text rounded-full hover:bg-surface-hover">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-2">
                <p className="text-base font-extrabold text-text leading-relaxed">
                  "{activePlayingNote.text}"
                </p>
              </div>

              {/* Soundtrack Preview Card */}
              {activePlayingNote.music && (
                <div className="bg-surface-hover border border-border p-3 rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 text-left min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center animate-spin-slow shrink-0 shadow-xs">
                      <Music className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-primary truncate">
                        {activePlayingNote.music.title}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        {activePlayingNote.music.artist || "Soundtrack"}
                      </p>
                    </div>
                  </div>

                  {activePlayingNote.music.audioUrl && (
                    <button
                      onClick={() => {
                        if (audioRef.current) {
                          if (isPlayingAudio) {
                            audioRef.current.pause();
                            setIsPlayingAudio(false);
                          } else {
                            audioRef.current.play().catch(() => null);
                            setIsPlayingAudio(true);
                          }
                        }
                      }}
                      className="p-2 bg-surface hover:bg-surface-hover text-text rounded-full transition shadow-xs cursor-pointer border border-border"
                      title={isPlayingAudio ? "Pause" : "Play"}
                    >
                      {isPlayingAudio ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT NOTE MODAL */}
      <AnimatePresence>
        {showNoteModal && (
          <div
            className="fixed inset-0 z-[600] bg-surface-overlay backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowNoteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-surface border border-border rounded-3xl p-5 text-text shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-bold text-text">{myNote ? "Update Your Note" : "New Note"}</h3>
                </div>
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="p-1 rounded-full text-text-muted hover:text-text hover:bg-surface-hover transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePostNote} className="space-y-3">
                {/* Note Bubble Preview Card */}
                <div className="bg-surface-hover border border-border rounded-2xl p-4 text-center relative overflow-hidden shadow-xs">
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-2">
                    Note Preview (60 chars)
                  </p>
                  <p className="text-sm font-bold text-text min-h-[24px]">
                    {noteText || myNote?.text || "Share a thought..."}
                  </p>

                  {selectedMusic && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-surface border border-primary/30 rounded-full text-[10px] text-primary shadow-xs">
                      <Music className="w-3 h-3 text-primary animate-spin-slow" />
                      <span className="font-bold">{selectedMusic.title}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedMusic(null)}
                        className="ml-1 text-text-muted hover:text-text"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  maxLength={60}
                  placeholder="Share what's on your mind... (max 60 chars)"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full bg-surface border border-border px-4 py-2.5 rounded-xl text-xs text-text placeholder:text-text-muted outline-none focus:border-primary transition shadow-xs"
                  autoFocus
                  required
                />

                {/* Music Picker Trigger Button */}
                <button
                  type="button"
                  onClick={() => setShowMusicPicker(true)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-surface hover:bg-surface-hover border border-border rounded-xl text-xs text-text transition cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-primary" />
                    <span className="font-bold">
                      {selectedMusic ? `${selectedMusic.title} - ${selectedMusic.artist}` : "Attach Soundtrack"}
                    </span>
                  </div>
                  <span className="text-[10px] text-primary font-bold">
                    {selectedMusic ? "Change" : "Add"}
                  </span>
                </button>

                <div className="flex gap-2 pt-2">
                  {myNote && (
                    <button
                      type="button"
                      onClick={handleDeleteMyNote}
                      className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl transition cursor-pointer"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={posting || !noteText.trim()}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-hover font-bold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 text-white hover:scale-105 active:scale-95"
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

      {/* Universal Music Picker Modal */}
      {showMusicPicker && (
        <StoryMusicPickerModal
          open={showMusicPicker}
          onClose={() => setShowMusicPicker(false)}
          selectedMusic={selectedMusic}
          contentContext={{
            caption: noteText,
            theme: "note",
          }}
          onSelectMusic={(track) => {
            setSelectedMusic(track);
            snackbar.success(`Attached "${track.title}" to your note! 🎵`);
          }}
        />
      )}
    </div>
  );
};

export default NotesBar;
