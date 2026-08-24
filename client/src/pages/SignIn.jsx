import React, { useState } from "react";
import { snackbar } from "../lib/snackbar";
import { RxCross2 } from "react-icons/rx";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import logo from "../assets/logo.png";
import { setUserData } from "../redux/features/userSlice";
import { GoogleLogin } from "@react-oauth/google";
import api from "../lib/axios";
import TwoFactorModal from "../components/TwoFactorModal";
import GoogleUsernameModal from "../components/GoogleUsernameModal";
import { Sparkles, Mail, ArrowLeft, ShieldCheck, Zap } from "lucide-react";
import { useTheme } from "../lib/themeContext";
import { addLinkedAccount, setActiveAccountId } from "../lib/accountManager";
import VybeInput from "../components/VybeInput";



const SignIn = () => {
  const themeCtx = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const isAddAccountMode = searchParams.get("addAccount") === "true";
  const { userData } = useSelector((state) => state.user);
  const currentUserName = userData?.user?.userName || userData?.userName;

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 2FA state
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [pendingToken, setPendingToken] = useState("");

  // Google flow modal state
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [googleUser, setGoogleUser] = useState(null);
  const [googleUsername, setGoogleUsername] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState([]);

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

  // Magic Link state
  const [isMagicLinkMode, setIsMagicLinkMode] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicSubmitted, setMagicSubmitted] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Use add-account-login endpoint when adding a new account
      const endpoint = isAddAccountMode ? "/auth/add-account-login" : "/auth/signin";
      const res = await api.post(endpoint, {
        userName,
        password,
        rememberMe,
      });

      if (res.data.requiresTwoFactor) {
        setPendingToken(res.data.pendingToken);
        setRequiresTwoFactor(true);
        setIsLoading(false);
        return;
      }

      const loggedInUser = res.data.user || res.data;
      dispatch(setUserData(loggedInUser));

      // Sync account to multi-account registry
      addLinkedAccount(loggedInUser);
      setActiveAccountId(loggedInUser._id);

      snackbar.success(res.data.message || `Welcome back ${loggedInUser?.name || loggedInUser?.userName}`);
      setTimeout(() => navigate("/", { replace: true }), 400);
    } catch (err) {
      const msg = err.response?.data?.message || "Sign in failed. Check your credentials.";
      setError(msg);
      snackbar.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorSuccess = (data) => {
    if (data.user) {
      dispatch(setUserData(data.user));
      addLinkedAccount(data.user);
      setActiveAccountId(data.user._id);
    }
    setTimeout(() => navigate("/", { replace: true }), 400);
  };

  const handleRequestMagicLink = async (e) => {
    e.preventDefault();
    if (!magicEmail) {
      snackbar.error("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post("/auth/magic-link/request", { email: magicEmail });
      snackbar.success(res.data.message || "Magic Link sent to your inbox!");
      setMagicSubmitted(true);
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to send Magic Link.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      const token = credentialResponse.credential;
      const res = await api.post("/auth/google", { credential: token });

      if (res.data.requiresUsername) {
        setGoogleUser(res.data.googleUser);
        setShowUsernameModal(true);
        return;
      }

      dispatch(setUserData(res.data.user || res.data));
      addLinkedAccount(res.data.user || res.data);
      setActiveAccountId((res.data.user || res.data)?._id);
      snackbar.success(`Welcome back ${res.data.user?.name || res.data?.user?.userName}`);
      navigate("/", { replace: true });
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Google login failed");
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
      snackbar.success("Welcome to VYBE!");
      setShowUsernameModal(false);
      navigate("/", { replace: true });
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Error completing signup");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-bg text-text flex flex-col justify-center items-center p-4 sm:p-6 overflow-x-hidden selection:bg-rose-500 selection:text-white">
      {/* Dynamic Ambient Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Glassmorphic Card Container */}
      <div className="relative z-10 w-full max-w-4xl bg-surface/90 border border-border rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl flex flex-col lg:flex-row my-auto">
        
        {/* Left Side: Form Container */}
        <div className="w-full lg:w-[50%] p-6 sm:p-10 flex flex-col justify-center items-center space-y-6">
          
          {/* Logo & Header */}
          <div className="w-full flex flex-col items-center gap-2 text-center">
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
            <p className="text-xs text-text-secondary font-medium tracking-tight">
              {isAddAccountMode ? "Add another account to your session" : "Sign in to connect, share & explore"}
            </p>
          </div>

          {!isMagicLinkMode ? (
            <form onSubmit={handleSignIn} className="w-full space-y-4">
              
              {/* Spacious Floating-Label Inputs */}
              <VybeInput
                id="userName"
                label="Phone number, username, or email"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />

              <VybeInput
                id="password"
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isPassword
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                required
              />

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs px-1 text-text-secondary">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-border-strong bg-surface text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <span className="group-hover:text-text transition">Remember login info</span>
                </label>

                <span
                  onClick={() => navigate(isAddAccountMode ? "/forgot-password?addAccount=true" : "/forgot-password")}
                  className="font-semibold text-rose-500 hover:text-rose-400 hover:underline cursor-pointer transition"
                >
                  Forgot password?
                </span>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs animate-in fade-in duration-200">
                  <span className="font-medium">{error}</span>
                  <RxCross2 className="cursor-pointer hover:text-rose-600 transition" size={16} onClick={() => setError("")} />
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !userName.trim() || !password.trim()}
                className="w-full h-12 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? <ClipLoader color="#ffffff" size={20} /> : "Log In"}
              </button>

              {/* Magic Link Switcher */}
              <button
                type="button"
                onClick={() => setIsMagicLinkMode(true)}
                className="w-full h-11 bg-surface hover:bg-surface-hover text-text border border-border font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-rose-500" />
                <span>Log in with Magic Link 🪄</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 text-xs text-text-muted my-3">
                <div className="h-[1px] bg-border flex-1" />
                <span className="font-bold uppercase tracking-widest text-[10px] text-text-muted">OR</span>
                <div className="h-[1px] bg-border flex-1" />
              </div>

              {/* Google Button Wrapper */}
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleLoginSuccess}
                  onError={() => snackbar.error("Google login failed")}
                  theme={themeCtx.resolvedTheme === "dark" ? "filled_black" : "outline"}
                  shape="pill"
                  width="320"
                />
              </div>

              {/* Sign Up Switcher */}
              <div className="pt-2 text-center text-xs text-text-secondary">
                <span>Don't have an account? </span>
                <span
                  onClick={() => navigate(isAddAccountMode ? "/signup?addAccount=true" : "/signup")}
                  className="font-bold text-rose-500 hover:text-rose-400 cursor-pointer hover:underline transition"
                >
                  Sign up
                </span>
              </div>
            </form>
          ) : (
            /* Magic Link View */
            <div className="w-full space-y-5">
              <button
                onClick={() => setIsMagicLinkMode(false)}
                className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to password login
              </button>

              {!magicSubmitted ? (
                <form onSubmit={handleRequestMagicLink} className="space-y-4">
                  <div className="text-center space-y-1.5">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto shadow-xs">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-text">Passwordless Login</h3>
                    <p className="text-xs text-text-secondary">
                      Enter your email address and we'll send you an instant login link.
                    </p>
                  </div>

                  <VybeInput
                    id="magicEmail"
                    label="Email address"
                    type="email"
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    required
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !magicEmail.trim()}
                    className="w-full h-12 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? <ClipLoader color="#ffffff" size={20} /> : "Send Magic Link 🪄"}
                  </button>
                </form>
              ) : (
                <div className="text-center space-y-3 py-4 animate-in fade-in duration-200">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-xs">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-text">Check your email</h3>
                  <p className="text-xs text-text-secondary">
                    We sent a Magic Login Link to <strong className="text-text">{magicEmail}</strong>.
                  </p>
                  <button
                    onClick={() => setMagicSubmitted(false)}
                    className="text-xs text-rose-500 font-semibold hover:underline cursor-pointer transition"
                  >
                    Resend link or use another email
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Feature Showcase Hero Panel (Desktop) */}
        <div className="w-[50%] bg-surface-inset hidden lg:flex flex-col items-center justify-center p-10 text-center border-l border-border space-y-6 relative overflow-hidden">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-pink-500/5 to-purple-500/5" />
          
          <img
            src={logo}
            alt="VYBE"
            className="w-36 object-contain relative z-10 drop-shadow-md theme-logo-adaptive"
          />
          
          <div className="space-y-2 relative z-10">
            <h2 className="text-xl font-bold tracking-tight text-text">Welcome back to VYBE</h2>
            <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
              Experience 60 FPS real-time feeds, ultra-smooth Stories & DMs, and end-to-end account security.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs relative z-10 text-left">
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface border border-border shadow-xs hover:border-primary/40 transition">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text">Real-Time Messaging</h4>
                <p className="text-[11px] text-text-secondary">Instant delivery with WebSockets</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface border border-border shadow-xs hover:border-pink-500/40 transition">
              <div className="w-8 h-8 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text">Two-Factor Authentication</h4>
                <p className="text-[11px] text-text-secondary">Hardware & app-based protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Challenge Modal */}
      {requiresTwoFactor && (
        <TwoFactorModal
          isOpen={requiresTwoFactor}
          onClose={() => setRequiresTwoFactor(false)}
          pendingToken={pendingToken}
          mode="challenge"
          onSuccess={handleTwoFactorSuccess}
        />
      )}

      {/* Google Username Complete Modal */}
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

export default SignIn;
