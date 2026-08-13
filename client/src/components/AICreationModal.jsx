import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/axios";

export const AICreationModal = ({ isOpen, onClose, mode = "caption", onSelectResult }) => {
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("aesthetic");
  const [generatedResult, setGeneratedResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    try {
      setLoading(true);
      if (mode === "caption") {
        const res = await api.post("/ai/generate-caption", { prompt, tone });
        if (res.data.success) {
          setGeneratedResult(res.data);
        }
      } else if (mode === "bio") {
        const res = await api.post("/ai/generate-bio", { profession: prompt || "Creator", vibe: tone });
        if (res.data.success) {
          setGeneratedResult({ bio: res.data.bio });
        }
      }
    } catch {
      toast.error("AI Generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleUseResult = (text) => {
    if (onSelectResult) onSelectResult(text);
    toast.success("Applied to input!");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-surface-inset border border-border rounded-3xl p-6 text-text shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-text animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Meta AI Assistant</h2>
                <p className="text-xs text-text-secondary">
                  {mode === "caption" ? "Generate captions & hashtags" : "Generate creative profile bio"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-text-secondary font-semibold mb-1">
                {mode === "caption" ? "Describe your photo / vibe" : "Profession / Interests"}
              </label>
              <input
                type="text"
                placeholder={mode === "caption" ? "e.g. sunset, coffee, travel..." : "e.g. Photographer, Tech enthusiast..."}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-surface border border-border p-3 rounded-xl outline-none text-text focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-semibold mb-1">Tone & Vibe</label>
              <div className="grid grid-cols-3 gap-2">
                {["aesthetic", "creative", "witty", "professional", "hype"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`py-2 px-3 rounded-xl font-bold transition capitalize ${
                      tone === t ? "bg-rose-600 text-text shadow" : "bg-surface text-text-secondary hover:text-text"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-text font-bold rounded-xl shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Magic</span>
                </>
              )}
            </button>
          </div>

          {/* Results Display */}
          {generatedResult && (
            <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
              <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Generated Output</p>

              {mode === "caption" ? (
                <div className="space-y-2 text-xs">
                  <p className="text-text font-medium whitespace-pre-wrap">{generatedResult.caption}</p>
                  <p className="text-rose-400 font-mono text-[11px]">{generatedResult.hashtags?.join(" ")}</p>
                  <button
                    onClick={() => handleUseResult(`${generatedResult.caption}\n\n${generatedResult.hashtags?.join(" ")}`)}
                    className="w-full py-2 bg-rose-600 font-bold rounded-xl text-text mt-2"
                  >
                    Use Caption & Hashtags
                  </button>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <p className="text-text font-medium whitespace-pre-wrap">{generatedResult.bio}</p>
                  <button onClick={() => handleUseResult(generatedResult.bio)} className="w-full py-2 bg-rose-600 font-bold rounded-xl text-text mt-2">
                    Use Bio
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AICreationModal;
