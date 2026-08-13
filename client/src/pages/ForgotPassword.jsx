import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RxCross2 } from "react-icons/rx";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import logo2 from "../assets/logo2.png";
import api from "../lib/axios";
import { useTheme } from "../lib/themeContext";
import VybeInput from "../components/VybeInput";
import { Mail, ShieldCheck, Key } from "lucide-react";

const ForgotPassword = () => {
  const themeCtx = useTheme();
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
        toast.success(res.data.message || "Reset link verified.");
        setStep(3);
      } catch (error) {
        const msg = error.response?.data?.message || "Invalid or expired reset link";
        setError(msg);
        toast.error(msg);
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
      toast.success(result.data.message || "Verification code and link sent!");
      setStep(2);
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to send verification email.";
      toast.error(msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2 → Verify OTP
  const handleStep2 = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP code");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await api.post("/auth/verifyOtp", { email, otp });
      toast.success(result.data.message || "OTP verified successfully!");
      setStep(3);
    } catch (error) {
      const msg = error.response?.data?.message || "Invalid or expired OTP.";
      toast.error(msg);
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
      toast.error("Passwords do not match!");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      const payload = token
        ? { token, password: newPass }
        : { email, password: newPass };

      const result = await api.post("/auth/resetPassword", payload);
      toast.success(result.data.message || "Password reset successfully!");
      setTimeout(() => navigate(isAddAccountMode ? "/signin?addAccount=true" : "/signin"), 1500);
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to reset password.";
      toast.error(msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-bg text-text flex flex-col justify-center items-center p-4 selection:bg-rose-500 selection:text-text">
      <div className="w-full max-w-[440px] bg-surface-inset/90 border border-border/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-purple-500/5 blur-3xl rounded-full" />
        
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-1.5 text-center relative z-10">
          <img
            src={logo2}
            alt="VYBE"
            className="h-10 object-contain cursor-pointer"
            onClick={() => navigate(isAddAccountMode ? "/signin?addAccount=true" : "/signin")}
            style={{ filter: themeCtx.resolvedTheme === "dark" ? "none" : "invert(1)" }}
          />
          <h2 className="text-xl font-bold tracking-tight text-text">
            {step === 3 ? "Create New Password" : "Trouble Logging In?"}
          </h2>
          <p className="text-xs text-text-secondary max-w-xs font-medium">
            {step === 1 && "Enter your email address and we'll send you an OTP code and secure reset link."}
            {step === 2 && `Enter the 6-digit confirmation code we sent to ${email}`}
            {step === 3 && "Secure your account with a new password."}
          </p>
        </div>

        {/* STEP 1 — Enter Email */}
        {!token && step === 1 && (
          <form onSubmit={handleStep1} className="w-full space-y-5 relative z-10">
            <VybeInput
              id="email"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {error && (
              <div className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <span>{error}</span>
                <RxCross2 className="cursor-pointer hover:text-text" size={16} onClick={() => setError("")} />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full h-11 bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:opacity-95 text-text font-semibold text-sm rounded-xl transition shadow-lg flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <ClipLoader color="white" size={20} /> : "Reset Password"}
            </button>
          </form>
        )}

        {/* STEP 2 — Enter OTP */}
        {!token && step === 2 && (
          <form onSubmit={handleStep2} className="w-full space-y-5 relative z-10">
            <VybeInput
              id="otp"
              label="Verification Code (OTP)"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              required
            />

            {error && (
              <div className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <span>{error}</span>
                <RxCross2 className="cursor-pointer hover:text-text" size={16} onClick={() => setError("")} />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full h-11 bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:opacity-95 text-text font-semibold text-sm rounded-xl transition shadow-lg flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <ClipLoader color="white" size={20} /> : "Verify Code"}
            </button>

            {/* Helper Text */}
            <p className="text-[10px] text-text-muted text-center leading-relaxed">
              Don't want to use the OTP code? You can click the secure reset link directly from the email to reset your password.
            </p>

            <div className="flex flex-col items-center gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="font-bold text-rose-500 hover:text-rose-400 hover:underline cursor-pointer"
              >
                Change Email Address
              </button>
            </div>
          </form>
        )}

        {/* STEP 3 — Reset Password */}
        {step === 3 && (
          <form onSubmit={handleStep3} className="w-full space-y-4 relative z-10">
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
              <div className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <span>{error}</span>
                <RxCross2 className="cursor-pointer hover:text-text" size={16} onClick={() => setError("")} />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || newPass.length < 6 || confirmPass.length < 6}
              className="w-full h-11 bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:opacity-95 text-text font-semibold text-sm rounded-xl transition shadow-lg flex items-center justify-center disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? <ClipLoader color="white" size={20} /> : "Reset Password"}
            </button>
          </form>
        )}

        {/* Back to Sign In Footer */}
        {step !== 3 && (
          <div className="w-full pt-2 border-t border-border/80 text-center relative z-10">
            <span
              onClick={() => navigate(isAddAccountMode ? "/signin?addAccount=true" : "/signin")}
              className="text-xs font-bold text-rose-500 hover:text-rose-400 cursor-pointer hover:underline"
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
