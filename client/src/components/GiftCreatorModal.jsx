import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Heart, Sparkles, X, Check } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/axios";

export const GiftCreatorModal = ({ isOpen, onClose, creator }) => {
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendGift = async () => {
    try {
      setLoading(true);
      const res = await api.post("/monetization/gift", {
        creatorId: creator?._id,
        amount: selectedAmount,
      });

      if (res.data.success) {
        toast.success(res.data.message);
        onClose();
      }
    } catch {
      toast.error("Failed to send gift tip.");
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
          className="relative w-full max-w-sm bg-surface-inset border border-border rounded-3xl p-6 text-text shadow-2xl space-y-6 text-center"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-rose-500" />
              <span className="font-bold text-sm">Send Creator Gift</span>
            </div>
            <button onClick={onClose} className="p-1 text-text-secondary hover:text-text rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-text shadow-xl mx-auto">
              <Gift className="w-8 h-8 animate-bounce" />
            </div>
            <h3 className="font-extrabold text-base text-text">Support @{creator?.userName || "Creator"}</h3>
            <p className="text-xs text-text-secondary">Send digital gems & tip appreciation directly to creator's payout balance.</p>
          </div>

          {/* Amount Options */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 5, 10, 25, 50, 100].map((amt) => (
              <button
                key={amt}
                onClick={() => setSelectedAmount(amt)}
                className={`py-3 rounded-2xl font-extrabold text-xs transition border ${
                  selectedAmount === amt
                    ? "bg-rose-600 border-rose-500 text-text shadow-lg scale-105"
                    : "bg-surface border-border text-text hover:text-text"
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>

          <button
            onClick={handleSendGift}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-text font-bold rounded-2xl shadow-xl hover:opacity-95 transition"
          >
            {loading ? "Sending Gift..." : `Send $${selectedAmount} Gift Tip`}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GiftCreatorModal;
