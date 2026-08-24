import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Copy, Check, Wand2 } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";

export const AICaptionModal = ({ isOpen, onClose, onApplyCaption }) => {
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("aesthetic");
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [generatedHashtags, setGeneratedHashtags] = useState([]);
  const [generatedAltText, setGeneratedAltText] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/ai/generate-caption", { prompt, tone });
      if (res.data.success) {
        setGeneratedCaption(res.data.caption);
        setGeneratedHashtags(res.data.hashtags || []);
        setGeneratedAltText(res.data.altText || "");
      }
    } catch {
      snackbar.error("Failed to generate AI caption.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    const fullCaption = `${generatedCaption}\n\n${generatedHashtags.join(" ")}`;
    onApplyCaption({ caption: fullCaption, hashtags: generatedHashtags, altText: generatedAltText });
    snackbar.success("AI Caption inserted!");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-surface border border-border rounded-3xl p-6 text-text shadow-2xl space-y-6"
        >
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 via-pink-500 to-rose-600 flex items-center justify-center text-text shadow">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold">AI Caption Assistant</h3>
                <p className="text-xs text-text-secondary">Generate creative captions & trending hashtags instantly.</p>
              </div>
            </div>

            <button onClick={onClose} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Topic or Keyword</label>
              <input
                type="text"
                placeholder="e.g. Sunset beach workout, Coffee morning..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-4 py-3 bg-surface-inset border border-border rounded-xl outline-none text-text text-sm focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Vibe / Tone</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {["aesthetic", "creative", "witty", "professional", "hype"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition capitalize ${
                      tone === t
                        ? "bg-rose-600 border-rose-500 text-text shadow-lg"
                        : "bg-surface-inset border-border text-text-secondary hover:text-text"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-500 to-rose-600 hover:opacity-95 text-text font-semibold rounded-xl transition shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Magic Caption</span>
                </>
              )}
            </button>
          </form>

          {/* Generated Result Preview */}
          {generatedCaption && (
            <div className="space-y-3 p-4 bg-surface-inset rounded-2xl border border-border">
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">AI Suggestion</h4>
              <p className="text-sm text-text leading-relaxed">{generatedCaption}</p>

              <div className="flex flex-wrap gap-1.5 pt-2">
                {generatedHashtags.map((h, i) => (
                  <span key={i} className="text-[11px] bg-surface border border-border px-2 py-0.5 rounded-md text-text-secondary">
                    {h}
                  </span>
                ))}
              </div>

              <button
                onClick={handleApply}
                className="w-full mt-3 py-2.5 bg-rose-600 hover:bg-rose-500 text-text font-semibold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Use This Caption</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AICaptionModal;
