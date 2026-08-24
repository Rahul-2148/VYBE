import { useEffect, useState } from "react";
import { snackbar } from "../lib/snackbar";
import { RxCross2 } from "react-icons/rx";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import logo from "../assets/logo.png";
import api from "../lib/axios";
import VybeInput from "../components/VybeInput";
import { Mail, ShieldCheck, Key } from "lucide-react";

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { token } = useParams(); // RESET LINK TOKEN
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAddAccountMode = searchParams.get("addAccount") === "true";

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
        setError("");

        const res = await api.post("/auth/verifyResetToken", { token });
        snackbar.success(res.data.message || "Reset link verified.");
        setStep(3);
      } catch (error) {
        const msg = error.response?.data?.message || "Invalid or expired reset link";
        setError(msg);
        snackbar.error(msg);
        navigate(isAddAccountMode ? "/forgot-password?addAccount=true" : "/forgot-password");
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token, navigate, isAddAccountMode]);

  // STEP 1 → Send Verification Email (Both OTP & Link)
  const handleStep1 = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const result = await api.post("/auth/sendOtp", { email });
      snackbar.success(result.data.message || "Verification code and link sent!");
      setStep(2);
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to send verification email.";
      snackbar.error(msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2 → Verify OTP
  const handleStep2 = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      snackbar.error("Please enter the 6-digit OTP code");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await api.post("/auth/verifyOtp", { email, otp });
      snackbar.success(result.data.message || "OTP verified successfully!");
      setStep(3);
    } catch (error) {
      const msg = error.response?.data?.message || "Invalid or expired OTP.";
      snackbar.error(msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3 → Reset Password
  const handleStep3 = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) {
      setError("Passwords do not match!");
      snackbar.error("Passwords do not match!");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const payload = token
        ? { token, password: newPass }
        : { email, password: newPass };

      const result = await api.post("/auth/resetPassword", payload);
      snackbar.success(result.data.message || "Password reset successfully!");
      setTimeout(() => navigate(isAddAccountMode ? "/signin?addAccount=true" : "/signin", { replace: true }), 1500);
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to reset password.";
      snackbar.error(msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-bg text-text flex flex-col justify-center items-center p-4 sm:p-6 overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* Dynamic Ambient Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[440px] bg-surface/90 border border-border rounded-3xl p-8 shadow-2xl backdrop-blur-2xl flex flex-col items-center space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <img
            src={logo}
            alt="VYBE"
            className="h-9 w-auto object-contain cursor-pointer transition-transform hover:scale-105 theme-logo-adaptive"
            onClick={() => navigate(isAddAccountMode ? "/signin?addAccount=true" : "/signin")}
          />
          <h2 className="text-xl font-bold tracking-tight text-text">
            {step === 3 ? "Create New Password" : "Trouble Logging In?"}
          </h2>
          <p className="text-xs text-text-secondary max-w-xs font-medium leading-relaxed">
            {step === 1 && "Enter your email address and we'll send you an OTP code and secure reset link."}
            {step === 2 && `Enter the 6-digit confirmation code we sent to ${email}`}
            {step === 3 && "Secure your account with a strong new password."}
          </p>
        </div>

        {/* STEP 1 — Enter Email */}
        {!token && step === 1 && (
          <form onSubmit={handleStep1} className="w-full space-y-5">
            <VybeInput
              id="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            {error && (
              <div className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs animate-in fade-in duration-200">
                <span className="font-medium">{error}</span>
                <RxCross2 className="cursor-pointer hover:text-rose-600 transition" size={16} onClick={() => setError("")} />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full h-12 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <ClipLoader color="#ffffff" size={20} /> : "Send Reset Code & Link"}
            </button>
          </form>
        )}

        {/* STEP 2 — Enter OTP */}
        {!token && step === 2 && (
          <form onSubmit={handleStep2} className="w-full space-y-5">
            <VybeInput
              id="otp"
              label="6-Digit Verification Code (OTP)"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              required
              autoFocus
            />

            {error && (
              <div className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs animate-in fade-in duration-200">
                <span className="font-medium">{error}</span>
                <RxCross2 className="cursor-pointer hover:text-rose-600 transition" size={16} onClick={() => setError("")} />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full h-12 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <ClipLoader color="#ffffff" size={20} /> : "Verify Code"}
            </button>

            {/* Helper Text */}
            <p className="text-[11px] text-text-muted text-center leading-relaxed">
              Don't want to use the OTP code? You can click the secure reset link directly from the email to reset your password.
            </p>

            <div className="flex flex-col items-center gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="font-bold text-rose-500 hover:text-rose-400 hover:underline cursor-pointer transition"
              >
                Change Email Address
              </button>
            </div>
          </form>
        )}

        {/* STEP 3 — Reset Password */}
        {step === 3 && (
          <form onSubmit={handleStep3} className="w-full space-y-4">
            <VybeInput
              id="newPass"
              label="New Password (min 6 chars)"
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              isPassword
              showPassword={showNewPassword}
              setShowPassword={setShowNewPassword}
              required
              autoFocus
            />

            <VybeInput
              id="confirmPass"
              label="Confirm Password"
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              isPassword
              showPassword={showConfirmPassword}
              setShowPassword={setShowConfirmPassword}
              required
            />

            {error && (
              <div className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs animate-in fade-in duration-200">
                <span className="font-medium">{error}</span>
                <RxCross2 className="cursor-pointer hover:text-rose-600 transition" size={16} onClick={() => setError("")} />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || newPass.length < 6 || confirmPass.length < 6}
              className="w-full h-12 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <ClipLoader color="#ffffff" size={20} /> : "Save New Password"}
            </button>
          </form>
        )}

        {/* Back to Sign In Footer */}
        {step !== 3 && (
          <div className="w-full pt-3 border-t border-border text-center">
            <span
              onClick={() => navigate(isAddAccountMode ? "/signin?addAccount=true" : "/signin")}
              className="text-xs font-bold text-rose-500 hover:text-rose-400 cursor-pointer hover:underline transition"
            >
              Back to Log In
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
