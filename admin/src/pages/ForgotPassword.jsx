import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Mail, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, KeyRound } from "lucide-react";
import api from "../lib/api";
import { toast } from "../lib/toast";

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1 = Request OTP, 2 = Verify OTP
  const [loading, setLoading] = useState(false);
  const [debugOtp, setDebugOtp] = useState("");

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your registered staff email.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/forgot-password", { email });
      if (res.data?.success) {
        toast.success(res.data.message || "Recovery code sent to your email.");
        if (res.data.debugOtp) {
          setDebugOtp(res.data.debugOtp);
        }
        setStep(2);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send recovery code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit recovery code.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/verify-otp", { email, otp });
      if (res.data?.success) {
        toast.success("Security code verified.");
        const token = res.data.resetToken;
        if (token) {
          navigate(`/reset-password/${token}`);
        } else {
          navigate(`/reset-password?email=${encodeURIComponent(email)}`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired recovery code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f3f4f6] flex items-center justify-center p-4 select-none font-sans relative overflow-hidden">
      {/* Glow Backdrops */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0d111a] border border-white/[0.08] rounded-3xl p-8 shadow-2xl space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-500 flex items-center justify-center mx-auto text-white font-black text-lg shadow-xl shadow-purple-500/20 font-['Outfit']">
            V
          </div>
          <h1 className="text-xl font-black text-white tracking-tight font-['Outfit']">
            {step === 1 ? "Staff Account Recovery" : "Verify Security Code"}
          </h1>
          <p className="text-xs text-zinc-400">
            {step === 1
              ? "Enter your registered operations email to receive a 6-digit recovery code."
              : `Enter the 6-digit code dispatched to ${email}.`}
          </p>
        </div>

        {debugOtp && step === 2 && (
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs text-center font-mono">
            Dev Code: <span className="font-bold text-white tracking-widest">{debugOtp}</span>
          </div>
        )}

        {/* Step 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase">Registered Staff Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="admin@vybe.app"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              <span>Send Recovery Code</span>
            </button>
          </form>
        )}

        {/* Step 2: Enter OTP */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase">6-Digit OTP Code</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full py-3 text-center tracking-[0.5em] font-mono text-base font-black rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Verify & Continue</span>
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-2 text-[11px] text-zinc-400 hover:text-white transition text-center cursor-pointer"
            >
              Didn't get code? Resend with another email
            </button>
          </form>
        )}

        {/* Back to Login Link */}
        <div className="pt-2 text-center border-t border-white/[0.06]">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Operations Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
