import React, { useState } from "react";
import { snackbar } from "../lib/snackbar";
import { RxCross2 } from "react-icons/rx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import logo from "../assets/logo.png";
import logo2 from "../assets/logo2.png";
import GoogleUsernameModal from "../components/GoogleUsernameModal";
import { setUserData } from "../redux/features/userSlice";
import { GoogleLogin } from "@react-oauth/google";
import api from "../lib/axios";
import { Sparkles, ShieldCheck, Check, Info, ArrowLeft } from "lucide-react";
import { useTheme } from "../lib/themeContext";
import { addLinkedAccount, setActiveAccountId } from "../lib/accountManager";
import VybeInput from "../components/VybeInput";



const SignUp = () => {
  const themeCtx = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const isAddAccountMode = searchParams.get("addAccount") === "true";
  const { userData } = useSelector((state) => state.user);
  const currentUserName = userData?.user?.userName || userData?.userName;

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const [requiresVerify, setRequiresVerify] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // Username suggestion state
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);

  // GOOGLE FLOW
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [googleUsername, setGoogleUsername] = useState("");

  const startTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Username Suggestion API call
  const fetchUsernameSuggestions = async (value) => {
    if (!value || value.length < 3) {
      setUsernameSuggestions([]);
      return;
    }

    try {
      const res = await api.get(`/auth/username/suggest?query=${value}`);
      if (res.data?.suggestions) {
        setUsernameSuggestions(res.data.suggestions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Normal Signup Handler
  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await api.post("/auth/signup", {
        name,
        userName,
        email,
        password,
      });

      if (result.data?.requiresVerification) {
        setRequiresVerify(true);
        startTimer();
        snackbar.success(result.data.message || "Verification code sent!");
      } else {
        dispatch(setUserData(result.data.user || result.data));
        addLinkedAccount(result.data.user || result.data);
        setActiveAccountId((result.data.user || result.data)?._id);
        snackbar.success(result.data.message || "Account created successfully!");
        setTimeout(() => navigate("/", { replace: true }), 500);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Sign up failed. Please try again.";
      setError(msg);
      snackbar.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      snackbar.error("Please enter a 6-digit verification code");
      return;
    }
    setIsLoading(true);
    setError("");

    try {
      const result = await api.post("/auth/signup/verify", {
        email,
        otp: otpCode,
      });

      dispatch(setUserData(result.data.user || result.data));
      addLinkedAccount(result.data.user || result.data);
      setActiveAccountId((result.data.user || result.data)?._id);
      snackbar.success(result.data.message || "Verification successful!");
      setTimeout(() => navigate("/", { replace: true }), 500);
    } catch (err) {
      const msg = err.response?.data?.message || "Verification failed. Please try again.";
      setError(msg);
      snackbar.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    setError("");

    try {
      await api.post("/auth/signup", {
        name,
        userName,
        email,
        password,
      });
      startTimer();
      snackbar.success("A new verification code has been sent!");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to resend code. Please try again.";
      setError(msg);
      snackbar.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Google Login Handler
  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;
      const res = await api.post("/auth/google", { credential: token });

      if (res.data.requiresUsername) {
        setGoogleUser(res.data.googleUser);
        setShowUsernameModal(true);
      } else {
        dispatch(setUserData(res.data.user || res.data));
        addLinkedAccount(res.data.user || res.data);
        setActiveAccountId((res.data.user || res.data)?._id);
        snackbar.success(`Welcome ${res.data.user?.name || res.data?.user?.userName}`);
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error(err);
      snackbar.error(err.response?.data?.message || "Google signup failed");
    }
  };

  const handleGoogleUsernameSubmit = async () => {
    if (!googleUsername) return snackbar.error("Username is required");
    setGoogleLoading(true);

    try {
      const res = await api.post("/auth/google/complete", {
        ...googleUser,
        userName: googleUsername,
      });

      dispatch(setUserData(res.data.user || res.data));
      addLinkedAccount(res.data.user || res.data);
      setActiveAccountId((res.data.user || res.data)?._id);
      snackbar.success("Account created via Google successfully");
      setShowUsernameModal(false);
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      snackbar.error(err.response?.data?.message || "Error completing signup");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-bg text-text flex flex-col justify-center items-center p-4 sm:p-6 overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* Dynamic Ambient Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Glassmorphic Card Container */}
      <div className="relative z-10 w-full max-w-4xl bg-surface/90 border border-border rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl flex flex-col lg:flex-row my-auto">
        
        {/* Left Side: Form Container */}
        <div className="w-full lg:w-[50%] p-6 sm:p-10 flex flex-col justify-center items-center space-y-5">
          
          {/* Logo & Header */}
          <div className="w-full flex flex-col items-center gap-1.5 text-center">
            {isAddAccountMode && currentUserName && (
              <button
                onClick={() => navigate("/", { replace: true })}
                className="self-start flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text transition cursor-pointer mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to @{currentUserName}
              </button>
            )}
            <img
              src={logo}
              alt="VYBE"
              className="h-9 w-auto object-contain transition-transform hover:scale-105 theme-logo-adaptive"
            />
            <p className="text-xs text-text-secondary font-medium max-w-xs leading-relaxed">
              {requiresVerify 
                ? `Enter the 6-digit confirmation code we sent to ${email}`
                : isAddAccountMode 
                  ? "Create a new account to link to your session" 
                  : "Sign up to see photos, videos, and stories from your friends."}
            </p>
          </div>

          {/* Form */}
          {requiresVerify ? (
            <form onSubmit={handleVerifyOtp} className="w-full space-y-4">
              <VybeInput
                id="otpCode"
                label="6-Digit Confirmation Code"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                required
                autoFocus
              />

              {/* Error Banner */}
              {error && (
                <div className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs animate-in fade-in duration-200">
                  <span className="font-medium">{error}</span>
                  <RxCross2 className="cursor-pointer hover:text-rose-600 transition" size={16} onClick={() => setError("")} />
                </div>
              )}

              {/* Primary Confirm Button */}
              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full h-12 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? <ClipLoader color="#ffffff" size={20} /> : "Confirm & Enter VYBE"}
              </button>

              {/* Resend and Back controls */}
              <div className="flex flex-col items-center gap-2 pt-2 text-xs">
                <button
                  type="button"
                  disabled={resendTimer > 0 || isLoading}
                  onClick={handleResendOtp}
                  className={`font-semibold transition ${resendTimer > 0 ? "text-text-muted cursor-not-allowed" : "text-rose-500 hover:text-rose-400 cursor-pointer hover:underline"}`}
                >
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend Code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequiresVerify(false);
                    setOtpCode("");
                    setError("");
                  }}
                  className="font-bold text-text-secondary hover:text-text hover:underline cursor-pointer transition"
                >
                  Go Back
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="w-full space-y-3.5">
              
              {/* Google Signup Button Top */}
              <div className="w-full flex justify-center mb-1">
                <GoogleLogin
                  onSuccess={handleGoogleLoginSuccess}
                  onError={() => snackbar.error("Google signup failed")}
                  theme={themeCtx.resolvedTheme === "dark" ? "filled_black" : "outline"}
                  shape="pill"
                  width="320"
                  text="signup_with"
                />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 text-xs text-text-muted my-2">
                <div className="h-[1px] bg-border flex-1" />
                <span className="font-bold uppercase tracking-widest text-[10px] text-text-muted">OR</span>
                <div className="h-[1px] bg-border flex-1" />
              </div>

              {/* Full Name */}
              <VybeInput
                id="name"
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              {/* Username with Live Suggestions */}
              <VybeInput
                id="userName"
                label="Username"
                type="text"
                value={userName}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "");
                  setUserName(val);
                  fetchUsernameSuggestions(val);
                }}
                required
                suggestions={usernameSuggestions}
                onSelectSuggestion={(s) => {
                  setUserName(s);
                  setUsernameSuggestions([]);
                }}
              />

              {/* Email */}
              <VybeInput
                id="email"
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {/* Password */}
              <VybeInput
                id="password"
                label="Password (min 6 chars)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isPassword
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                required
              />

              {/* Password Strength Bar */}
              {password.length > 0 && (
                <div className="px-1 space-y-1 animate-in fade-in duration-150">
                  <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        password.length < 6
                          ? "w-1/4 bg-rose-500"
                          : password.length < 9
                          ? "w-2/4 bg-amber-500"
                          : password.length < 12
                          ? "w-3/4 bg-blue-500"
                          : "w-full bg-emerald-500"
                      }`}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-semibold text-text-muted">
                    <span>Security Strength</span>
                    <span className={
                      password.length < 6 ? "text-rose-500" :
                      password.length < 9 ? "text-amber-500" :
                      password.length < 12 ? "text-blue-500" : "text-emerald-500"
                    }>
                      {password.length < 6 ? "Too Short" : password.length < 9 ? "Fair" : password.length < 12 ? "Good" : "Strong 🔒"}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs animate-in fade-in duration-200">
                  <span className="font-medium">{error}</span>
                  <RxCross2 className="cursor-pointer hover:text-rose-600 transition" size={16} onClick={() => setError("")} />
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !userName.trim() || !email.trim() || !password.trim()}
                className="w-full h-12 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center disabled:opacity-50 cursor-pointer mt-1"
              >
                {isLoading ? <ClipLoader color="#ffffff" size={20} /> : "Sign Up"}
              </button>

              {/* Sign In Switcher */}
              <div className="pt-2 text-center text-xs text-text-secondary">
                <span>Already have an account? </span>
                <span
                  onClick={() => navigate(isAddAccountMode ? "/signin?addAccount=true" : "/signin")}
                  className="font-bold text-rose-500 hover:text-rose-400 cursor-pointer hover:underline transition"
                >
                  Log in
                </span>
              </div>
            </form>
          )}
        </div>

        {/* Right Side: Feature Showcase Hero Panel (Desktop) */}
        <div className="w-[50%] bg-surface-inset hidden lg:flex flex-col items-center justify-center p-10 text-center border-l border-border space-y-6 relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-rose-500/5" />
          
          <img
            src={logo}
            alt="VYBE"
            className="w-36 object-contain relative z-10 drop-shadow-md theme-logo-adaptive"
          />
          
          <div className="space-y-2 relative z-10">
            <h2 className="text-xl font-bold tracking-tight text-text">Not Just An App, It's A VYBE</h2>
            <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
              Connect with friends, share reels & story highlights, and express yourself freely on VYBE.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs relative z-10 text-left">
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface border border-border shadow-xs hover:border-emerald-500/40 transition">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text">Privacy-First Data Protection</h4>
                <p className="text-[11px] text-text-secondary">Full cryptographic token auth</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface border border-border shadow-xs hover:border-purple-500/40 transition">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text">AI Powered Captions</h4>
                <p className="text-[11px] text-text-secondary">Smart translations & summaries</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Google Username Modal */}
      {showUsernameModal && (
        <GoogleUsernameModal
          googleUsername={googleUsername}
          setGoogleUsername={setGoogleUsername}
          usernameSuggestions={usernameSuggestions}
          setUsernameSuggestions={setUsernameSuggestions}
          googleLoading={googleLoading}
          handleSubmit={handleGoogleUsernameSubmit}
          onClose={() => setShowUsernameModal(false)}
          fetchUsernameSuggestions={fetchUsernameSuggestions}
        />
      )}
    </div>
  );
};

export default SignUp;
