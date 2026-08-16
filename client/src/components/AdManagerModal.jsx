import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X, DollarSign, ExternalLink, Sparkles, Check } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";

export const AdManagerModal = ({ isOpen, onClose, onCampaignCreated }) => {
  const [title, setTitle] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [ctaType, setCtaType] = useState("Learn More");
  const [targetUrl, setTargetUrl] = useState("");
  const [budget, setBudget] = useState(50);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLaunchAd = async (e) => {
    e.preventDefault();
    if (!title || !mediaUrl || !targetUrl) {
      snackbar.error("Please fill in campaign title, media URL, and target link.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/monetization/ad/create", {
        title,
        mediaUrl,
        caption,
        ctaType,
        targetUrl,
        budget: Number(budget),
      });

      if (res.data.success) {
        snackbar.success(res.data.message);
        if (onCampaignCreated) onCampaignCreated(res.data.campaign);
        onClose();
      }
    } catch {
      snackbar.error("Failed to launch campaign.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-surface-inset border border-border rounded-3xl p-6 text-text shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Megaphone className="w-5 h-5 text-text" />
              </div>
              <div>
                <h2 className="text-lg font-bold">VYBE Ad Manager</h2>
                <p className="text-xs text-text-secondary">Launch Sponsored Feed Campaign</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleLaunchAd} className="space-y-4 text-xs">
            <div>
              <label className="block text-text-secondary font-semibold mb-1">Campaign Name</label>
              <input
                type="text"
                placeholder="e.g. Summer Collection Launch"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-surface border border-border p-3 rounded-xl text-text outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-semibold mb-1">Ad Image / Video URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full bg-surface border border-border p-3 rounded-xl text-text outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-semibold mb-1">Ad Caption</label>
              <textarea
                rows={2}
                placeholder="Write engaging promotional copy..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full bg-surface border border-border p-3 rounded-xl text-text outline-none focus:border-rose-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-text-secondary font-semibold mb-1">Call-To-Action (CTA)</label>
                <select
                  value={ctaType}
                  onChange={(e) => setCtaType(e.target.value)}
                  className="w-full bg-surface border border-border p-3 rounded-xl text-text outline-none focus:border-rose-500"
                >
                  {["Learn More", "Shop Now", "Sign Up", "Contact Us"].map((cta) => (
                    <option key={cta} value={cta}>
                      {cta}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-text-secondary font-semibold mb-1">Total Daily Budget (₹)</label>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-surface border border-border p-3 rounded-xl text-text outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-text-secondary font-semibold mb-1">Destination Target URL</label>
              <input
                type="url"
                placeholder="https://yourbrand.com/landing-page"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full bg-surface border border-border p-3 rounded-xl text-text outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-text font-bold rounded-2xl shadow-xl hover:opacity-95 transition mt-2"
            >
              {loading ? "Launching Campaign..." : "Launch Sponsored Ad Campaign"}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AdManagerModal;
