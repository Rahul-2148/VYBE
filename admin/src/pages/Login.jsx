import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  User,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Crown,
  Shield,
  Gavel,
  HeadphonesIcon,
  Wallet,
  ChevronDown,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import { useAdminAuth, ROLE_HOME_PATHS } from "../context/AdminAuthContext";

const ROLES = [
  {
    value: "superadmin",
    icon: Crown,
    label: "Super Admin",
    subtitle: "Full root access to entire platform",
    gradient: "from-purple-500 to-indigo-600",
    bg: "bg-purple-500/10 border-purple-500/30",
    text: "text-purple-300",
    glow: "shadow-purple-500/25",
    ring: "ring-purple-500/30",
  },
  {
    value: "admin",
    icon: Shield,
    label: "Platform Admin",
    subtitle: "Users, content, analytics & operations",
    gradient: "from-rose-500 to-pink-600",
    bg: "bg-rose-500/10 border-rose-500/30",
    text: "text-rose-300",
    glow: "shadow-rose-500/25",
    ring: "ring-rose-500/30",
  },
  {
    value: "moderator",
    icon: Gavel,
    label: "Moderator",
    subtitle: "Trust & Safety — reports, live streams",
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-300",
    glow: "shadow-amber-500/25",
    ring: "ring-amber-500/30",
  },
  {
    value: "support",
    icon: HeadphonesIcon,
    label: "Support Agent",
    subtitle: "Verification requests & user identity",
    gradient: "from-sky-500 to-cyan-600",
    bg: "bg-sky-500/10 border-sky-500/30",
    text: "text-sky-300",
    glow: "shadow-sky-500/25",
    ring: "ring-sky-500/30",
  },
  {
    value: "finance",
    icon: Wallet,
    label: "Finance Manager",
    subtitle: "Revenue, monetization & payouts",
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-300",
    glow: "shadow-emerald-500/25",
    ring: "ring-emerald-500/30",
  },
];

export const Login = () => {
  const { login, googleLogin, adminUser, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1 = role select, 2 = credentials

  // Already logged in — redirect
  useEffect(() => {
    if (adminUser && !authLoading) {
      const home = ROLE_HOME_PATHS[adminUser.role] || "/";
      navigate(home, { replace: true });
    }
  }, [adminUser, authLoading, navigate]);

  const handleRoleSelect = (roleValue) => {
    setSelectedRole(roleValue);
    setError("");
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError("");
    setPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setSubmitting(true);
    setError("");

    const res = await login(emailOrUsername, password);
    setSubmitting(false);

    if (res.success) {
      const home = ROLE_HOME_PATHS[res.role] || "/";
      navigate(home, { replace: true });
    } else {
      setError(res.message || "Invalid administrative credentials.");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!credentialResponse.credential) {
      setError("Google authentication failed.");
      return;
    }

    setSubmitting(true);
    setError("");

    const res = await googleLogin(credentialResponse.credential);
    setSubmitting(false);

    if (res.success) {
      const home = ROLE_HOME_PATHS[res.role] || "/";
      navigate(home, { replace: true });
    } else {
      setError(res.message || "Access denied: Account lacks staff privileges.");
    }
  };

  const activeRole = ROLES.find((r) => r.value === selectedRole);

  return (
    <div className="min-h-screen bg-[#07090e] text-[#f3f4f6] flex items-center justify-center p-4 select-none font-sans relative overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-purple-600/10 via-rose-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-500 shadow-2xl shadow-purple-500/25 mb-3">
            <span className="font-black text-white text-xl font-['Outfit']">V</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white font-['Outfit']">
            VYBE Operations Suite
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Industry Grade Staff Portal & Incident Management
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-300 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* STEP 1 — Role Selector */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="text-center mb-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                Select Your Operational Role
              </p>
              <p className="text-[11px] text-zinc-600">
                You will be routed to your authorized workspace
              </p>
            </div>

            <div className="grid gap-2.5">
              {ROLES.map((role) => {
                const Icon = role.icon;
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleRoleSelect(role.value)}
                    className="group relative flex items-center gap-4 p-4 rounded-2xl bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.15] transition-all duration-200 text-left cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center shadow-lg ${role.glow} group-hover:scale-105 transition`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-white transition">
                          {role.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{role.subtitle}</p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white group-hover:translate-x-0.5 transition" />
                  </button>
                );
              })}
            </div>

            {/* Google SSO on Step 1 */}
            <div className="pt-3 border-t border-white/[0.06] space-y-3">
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google Sign-In failed")}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="signin_with"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 px-1">
                <Link to="/forgot-password" className="hover:text-purple-400 transition font-medium">
                  Forgot Password?
                </Link>
                <span>Authorized Personnel Only</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 — Credentials */}
        {step === 2 && activeRole && (
          <div className="space-y-5 animate-fade-in-up">
            {/* Selected Role Badge */}
            <button
              onClick={handleBack}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border ${activeRole.bg} cursor-pointer hover:brightness-110 transition`}
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeRole.gradient} flex items-center justify-center shadow-md`}
              >
                {React.createElement(activeRole.icon, { className: "w-5 h-5 text-white" })}
              </div>
              <div className="flex-1 text-left">
                <p className={`text-sm font-bold ${activeRole.text}`}>
                  Signing in as {activeRole.label}
                </p>
                <p className="text-[11px] text-zinc-500">Tap to change role</p>
              </div>
              <Check className={`w-5 h-5 ${activeRole.text}`} />
            </button>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Email or Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-600 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={emailOrUsername}
                    onChange={(e) => {
                      setEmailOrUsername(e.target.value);
                      setError("");
                    }}
                    placeholder="admin@vybe.com or @superadmin"
                    autoComplete="username"
                    autoFocus
                    className="w-full pl-11 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-600 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full pl-11 pr-12 py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-4 rounded-2xl text-sm font-bold shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] bg-gradient-to-r ${activeRole.gradient} text-white hover:brightness-110 ${activeRole.glow}`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign In as {activeRole.label}</span>
                  </>
                )}
              </button>
            </form>

            {/* Google Login on Step 2 as Alternative */}
            <div className="pt-2 flex flex-col items-center gap-3">
              <div className="w-full flex items-center gap-3">
                <div className="flex-1 h-[1px] bg-white/[0.08]" />
                <span className="text-[11px] text-zinc-500 font-bold uppercase">or</span>
                <div className="flex-1 h-[1px] bg-white/[0.08]" />
              </div>

              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google Sign-In failed")}
                theme="filled_black"
                shape="pill"
                size="medium"
                text="signin_with"
              />
            </div>

            {/* Footer */}
            <div className="text-center pt-2">
              <p className="text-[10px] text-zinc-700">
                🔒 Encrypted • All sessions monitored • Unauthorized access logged
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
