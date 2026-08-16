import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Key, ArrowRight, AlertCircle, X, CheckCircle2 } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";

export const TwoFactorModal = ({
  isOpen,
  onClose,
  pendingToken,
  onSuccess,
  mode = "challenge", // 'challenge' for login, 'setup' for enable 2FA
  qrCodeUrl,
  secret,
}) => {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen && inputRefs.current[0] && !useRecovery) {
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }
  }, [isOpen, useRecovery]);

  if (!isOpen) return null;

  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const newDigits = pastedData.split("");
      setDigits(newDigits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const code = useRecovery ? recoveryCode.trim() : digits.join("");

    if (!useRecovery && code.length !== 6) {
      snackbar.error("Please enter a valid 6-digit code.");
      return;
    }

    if (useRecovery && !code) {
      snackbar.error("Please enter a recovery code.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "challenge") {
        const res = await api.post("/auth/2fa/challenge", {
          pendingToken,
          code,
          isRecoveryCode: useRecovery,
        });

        if (res.data.success) {
          snackbar.success(res.data.message || "2FA Verification successful!");
          onSuccess(res.data);
          onClose();
        }
      } else if (mode === "setup") {
        const res = await api.post("/auth/2fa/verify", { code });
        if (res.data.success) {
          snackbar.success("2FA Enabled Successfully!");
          onSuccess(res.data);
          onClose();
        }
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface border border-border shadow-2xl text-text p-6"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-lg mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === "setup" ? "Set Up Two-Factor Auth" : "Two-Factor Security"}
            </h2>
            <p className="text-sm text-text-secondary mt-1 max-w-xs leading-relaxed">
              {mode === "setup"
                ? "Scan the QR code with Google Authenticator or Duo, then enter the 6-digit code below."
                : useRecovery
                ? "Enter one of your emergency backup recovery codes."
                : "Enter the 6-digit verification code from your authenticator app."}
            </p>
          </div>

          {/* QR Code Display for Setup Mode */}
          {mode === "setup" && qrCodeUrl && (
            <div className="flex flex-col items-center justify-center mb-6 p-4 rounded-2xl bg-surface border border-border shadow-xs">
              <img src={qrCodeUrl} alt="2FA QR Code" className="w-44 h-44 rounded-xl bg-card p-2 shadow" />
              <p className="text-xs text-text-muted mt-3 font-mono">Manual Key: {secret}</p>
            </div>
          )}

          {/* Verification Code Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!useRecovery ? (
              <div className="flex justify-between gap-2" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-2xl font-bold bg-surface border border-border focus:border-primary focus:ring-3 focus:ring-primary/10 rounded-2xl outline-none transition text-text shadow-xs"
                  />
                ))}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                  Recovery Code
                </label>
                <input
                  type="text"
                  placeholder="VYBE-XXXX-XXXX"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  className="w-full px-4 py-3.5 bg-surface border border-border focus:border-primary focus:ring-3 focus:ring-primary/10 rounded-2xl outline-none text-text font-mono text-center tracking-widest uppercase shadow-xs"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl transition shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{mode === "setup" ? "Confirm & Enable 2FA" : "Verify & Sign In"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {mode === "challenge" && (
                <button
                  type="button"
                  onClick={() => setUseRecovery(!useRecovery)}
                  className="w-full text-xs text-text-secondary hover:text-text transition py-1 text-center"
                >
                  {useRecovery ? "← Use 6-Digit Authenticator Code" : "Lost access? Use Recovery Code"}
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TwoFactorModal;
