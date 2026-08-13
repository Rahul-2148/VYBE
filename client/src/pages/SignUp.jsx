import React, { useState } from "react";
import { toast } from "sonner";
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
        toast.success(result.data.message || "Verification code sent!");
      } else {
        dispatch(setUserData(result.data.user || result.data));
        addLinkedAccount(result.data.user || result.data);
        setActiveAccountId((result.data.user || result.data)?._id);
        toast.success(result.data.message || "Account created successfully!");
        setTimeout(() => navigate("/", { replace: true }), 500);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Sign up failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error("Please enter a 6-digit verification code");
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
      toast.success(result.data.message || "Verification successful!");
      setTimeout(() => navigate("/", { replace: true }), 500);
    } catch (err) {
      const msg = err.response?.data?.message || "Verification failed. Please try again.";
      setError(msg);
      toast.error(msg);
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
      toast.success("A new verification code has been sent!");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to resend code. Please try again.";
      setError(msg);
      toast.error(msg);
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
        toast.success(`Welcome ${res.data.user?.name || res.data?.user?.userName}`);
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Google signup failed");
    }
  };

  const handleGoogleUsernameSubmit = async () => {
    if (!googleUsername) return toast.error("Username is required");
    setGoogleLoading(true);

    try {
      const res = await api.post("/auth/google/complete", {
        ...googleUser,
        userName: googleUsername,
      });

      dispatch(setUserData(res.data.user || res.data));
      addLinkedAccount(res.data.user || res.data);
      setActiveAccountId((res.data.user || res.data)?._id);
      toast.success("Account created via Google successfully");
      setShowUsernameModal(false);
      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error completing signup");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-bg text-text flex flex-col justify-center items-center p-4 selection:bg-rose-500 selection:text-text">
      {/* Outer Card Container */}
      <div className="w-full max-w-4xl bg-surface-inset/90 border border-border/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row my-auto">
        
        {/* Left Side: Form */}
        <div className="w-full lg:w-[50%] p-8 sm:p-10 flex flex-col justify-center items-center space-y-5">
          
          {/* Logo Header */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            {isAddAccountMode && currentUserName && (
              <button
                onClick={() => navigate("/", { replace: true })}
                className="self-start flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text transition cursor-pointer mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to @{currentUserName}
              </button>
            )}
            <img src={logo2} alt="VYBE" className="h-10 object-contain" style={{ filter: themeCtx.resolvedTheme === "dark" ? "none" : "invert(1)" }} />
            <p className="text-xs text-text-secondary font-medium max-w-xs">
              {requiresVerify 
                ? `Enter the 6-digit confirmation code we sent to ${email}`
                : isAddAccountMode 
                  ? "Create a new account to add" 
                  : "Sign up to see photos, videos, and stories from your friends."}
            </p>
          </div>

          {/* Form */}
          {requiresVerify ? (
            <form onSubmit={handleVerifyOtp} className="w-full space-y-4">
              <VybeInput
                id="otpCode"
                label="Confirmation Code"
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                required
              />

              {/* Error Banner */}
              {error && (
                <div className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  <span>{error}</span>
                  <RxCross2 className="cursor-pointer hover:text-text" size={16} onClick={() => setError("")} />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full h-11 bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:opacity-95 text-text font-semibold text-sm rounded-xl transition shadow-lg flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? <ClipLoader color="white" size={20} /> : "Confirm"}
              </button>

              {/* Resend and Back controls */}
              <div className="flex flex-col items-center gap-2 pt-2 text-xs">
                <button
                  type="button"
                  disabled={resendTimer > 0 || isLoading}
                  onClick={handleResendOtp}
                  className={`font-semibold ${resendTimer > 0 ? "text-text-muted cursor-not-allowed" : "text-rose-500 hover:text-rose-400 cursor-pointer hover:underline"}`}
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
                  className="font-bold text-text-secondary hover:text-text hover:underline cursor-pointer"
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
                  onError={() => toast.error("Google signup failed")}
                  theme="filled_black"
                  shape="pill"
                  width="320"
                  text="signup_with"
                />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 text-xs text-text-muted my-1">
                <div className="h-[1px] bg-surface-hover flex-1" />
                <span className="font-semibold uppercase tracking-widest text-[10px]">OR</span>
                <div className="h-[1px] bg-surface-hover flex-1" />
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

              {/* Error Banner */}
              {error && (
                <div className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  <span>{error}</span>
                  <RxCross2 className="cursor-pointer hover:text-text" size={16} onClick={() => setError("")} />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !userName.trim() || !email.trim() || !password.trim()}
                className="w-full h-11 bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600 hover:opacity-95 text-text font-semibold text-sm rounded-xl transition shadow-lg flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? <ClipLoader color="white" size={20} /> : "Sign Up"}
              </button>

              {/* Sign In Redirect */}
              <div className="pt-2 text-center text-xs text-text-secondary">
                <span>Have an account? </span>
                <span
                  onClick={() => navigate(isAddAccountMode ? "/signin?addAccount=true" : "/signin")}
                  className="font-bold text-rose-500 hover:text-rose-400 cursor-pointer hover:underline"
                >
                  Log in
                </span>
              </div>
            </form>
          )}
        </div>

        {/* Right Side: Feature Showcase Panel */}
        <div className="w-[50%] bg-gradient-to-br from-card via-background-secondary to-background hidden lg:flex flex-col items-center justify-center p-10 text-center border-l border-border/80 space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-purple-500/5 blur-3xl rounded-full" />
          
          <img src={logo} alt="VYBE" className="w-32 object-contain relative z-10" style={{ filter: themeCtx.resolvedTheme === "dark" ? "none" : "invert(1)" }} />
          
          <div className="space-y-2 relative z-10">
            <h2 className="text-xl font-bold tracking-tight text-text">Not Just A Platform, It's A VYBE</h2>
            <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
              Connect with friends, share reels & story highlights, and express yourself with full Meta-parity.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full max-w-xs relative z-10 text-left">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface/60 border border-border">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-text font-medium">Privacy-First Data Protection</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface/60 border border-border">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-text font-medium">AI-Powered Captions & Translations</span>
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
