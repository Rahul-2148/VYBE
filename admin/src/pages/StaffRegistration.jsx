import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Gavel,
  HeadphonesIcon,
  Wallet,
  Check,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Search,
  UserCheck,
  CheckCircle2,
  KeyRound,
  Sparkles,
  X,
  Phone,
} from "lucide-react";
import api from "../lib/api";
import { toast } from "../lib/toast";
import { useAdminAuth } from "../context/AdminAuthContext";

const ROLE_OPTIONS = [
  {
    value: "moderator",
    icon: Gavel,
    label: "Content Moderator",
    description: "Trust & Safety team — reviews reports, moderates content and live streams",
    gradient: "from-amber-500 to-orange-600",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-300",
  },
  {
    value: "support",
    icon: HeadphonesIcon,
    label: "Support Agent",
    description: "Handles verification requests and user identity checks",
    gradient: "from-sky-500 to-cyan-600",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    text: "text-sky-300",
  },
  {
    value: "finance",
    icon: Wallet,
    label: "Finance Manager",
    description: "Monitors revenue, creator monetization, and payout analytics",
    gradient: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
  },
  {
    value: "admin",
    icon: Shield,
    label: "Platform Admin",
    description: "Full operational access — users, content, broadcasts, analytics",
    gradient: "from-rose-500 to-pink-600",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-300",
  },
];

const AVAILABLE_PERMISSIONS = [
  { id: "manage_users", label: "User Management & Bans" },
  { id: "manage_reports", label: "Content Moderation (SRT)" },
  { id: "manage_verification", label: "Blue Check Reviews" },
  { id: "manage_live_streams", label: "Live Stream Safety" },
  { id: "system_broadcast", label: "System Broadcasts" },
  { id: "view_financials", label: "Monetization & Financials" },
  { id: "view_audit_logs", label: "Audit Logs Access" },
];

export const StaffRegistration = () => {
  const { isSuperAdmin } = useAdminAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("new"); // "new" or "promote"
  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // OTP Verification Step State
  const [step, setStep] = useState(1); // 1 = Details, 2 = Verify OTP
  const [otp, setOtp] = useState("");
  const [debugOtp, setDebugOtp] = useState("");

  // Promote mode — search existing users
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Live debounced search for candidates
  useEffect(() => {
    if (mode !== "promote" || selectedUser) return;
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get(`/staff/candidate-search?query=${encodeURIComponent(query)}`);
        if (res.data?.success) {
          setSearchResults(res.data.candidates || []);
        }
      } catch (err) {
        console.warn("Candidate search error:", err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, mode, selectedUser]);

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 p-8 rounded-3xl bg-[#0d111a] border border-white/10">
          <Shield className="w-16 h-16 text-rose-500 mx-auto" />
          <h2 className="text-xl font-black text-white font-['Outfit']">Super Admin Access Required</h2>
          <p className="text-sm text-zinc-400 max-w-sm">Only Super Admins can register new staff members.</p>
        </div>
      </div>
    );
  }

  const togglePermission = (permId) => {
    setPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  // Step 1: Send OTP to Candidate's Email or Promote Existing User
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedRole) {
      setError("Please select an operational role for this staff member.");
      return;
    }

    if (mode === "promote") {
      if (!selectedUser) {
        setError("Please search and select a candidate user to promote.");
        return;
      }
      // Direct promotion for existing users
      try {
        setSubmitting(true);
        const res = await api.post("/staff/register", {
          role: selectedRole,
          adminPermissions: permissions,
          existingUserId: selectedUser._id,
        });
        if (res.data?.success) {
          setSuccess(res.data.message);
          toast.success(res.data.message);
          setSelectedUser(null);
          setSelectedRole("");
          setPermissions([]);
          setSearchQuery("");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Promotion failed.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Validation for new staff account
    if (!name.trim() || !userName.trim() || !email.trim() || !password) {
      setError("All fields are required for new staff registration.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post("/staff/send-verification-otp", {
        name: name.trim(),
        userName: userName.trim(),
        email: email.trim(),
        role: selectedRole,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Authorization code dispatched to candidate email.");
        if (res.data.debugOtp) {
          setDebugOtp(res.data.debugOtp);
        }
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to dispatch authorization code.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Verify OTP and Finalize Registration
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit authorization code.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        name: name.trim(),
        userName: userName.trim(),
        email: email.trim(),
        password,
        role: selectedRole,
        adminPermissions: permissions,
        otp,
      };

      const res = await api.post("/staff/register", payload);

      if (res.data?.success) {
        setSuccess(res.data.message);
        toast.success(res.data.message);
        // Reset form
        setName("");
        setUserName("");
        setEmail("");
        setPassword("");
        setSelectedRole("");
        setPermissions([]);
        setOtp("");
        setStep(1);
        setDebugOtp("");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Verification and registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoleConfig = ROLE_OPTIONS.find((r) => r.value === selectedRole);

  return (
    <div className="space-y-6 max-w-3xl font-sans select-none">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/staff")}
          className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight font-['Outfit']">Register New Staff</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            Enterprise staff onboarding with genuine email & OTP authorization verification.
          </p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-white/[0.03] rounded-2xl border border-white/[0.06] w-fit">
        <button
          type="button"
          onClick={() => { setMode("new"); setSelectedUser(null); setError(""); setSuccess(""); setStep(1); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
            mode === "new" ? "bg-white/[0.1] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Create Verified Account
        </button>
        <button
          type="button"
          onClick={() => { setMode("promote"); setError(""); setSuccess(""); setStep(1); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
            mode === "promote" ? "bg-white/[0.1] text-white shadow-sm" : "text-zinc-400 hover:text-zinc-300"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Promote Existing User
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-bold text-emerald-300">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-300">{error}</p>
        </div>
      )}

      {/* ── STEP 1: Registration Form ── */}
      {step === 1 && (
        <form onSubmit={handleSendOtp} className="space-y-6 animate-fade-in">
          {/* Role Selection */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-black">1</span>
              Select Operational Role
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLE_OPTIONS.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.value;
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => { setSelectedRole(role.value); setError(""); }}
                    className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${role.bg} ${role.border} shadow-lg`
                        : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center shadow-md shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isSelected ? role.text : "text-zinc-300"}`}>{role.label}</p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed mt-0.5">{role.description}</p>
                    </div>
                    {isSelected && (
                      <div className={`ml-auto shrink-0 w-5 h-5 rounded-full bg-gradient-to-br ${role.gradient} flex items-center justify-center`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Details */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-black">2</span>
              {mode === "new" ? "Candidate Work Details & Email Verification" : "Find Candidate to Promote"}
            </p>

            {mode === "new" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400">Username</label>
                  <div className="relative">
                    <span className="text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">@</span>
                    <input
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value.replace(/\s/g, "").toLowerCase())}
                      placeholder="janedoe"
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400">Authentic Work Email (OTP Verified)</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 transition"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Fake & disposable email domains are blocked.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400">Initial Access Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full pl-10 pr-10 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-4">
                {/* Search Bar with Live Debounced Results */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate by name, @username, email, or phone number..."
                    className="w-full pl-10 pr-10 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 transition"
                  />
                  {searching && (
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                  {searchQuery && !searching && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Selected User Display */}
                {selectedUser && (
                  <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden text-sm">
                        {selectedUser.profileImage?.url ? (
                          <img src={selectedUser.profileImage.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          selectedUser.name?.charAt(0) || "U"
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-white truncate">{selectedUser.name}</p>
                          {selectedUser.isVerified && (
                            <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 text-[9px] font-bold">
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 truncate">@{selectedUser.userName} • {selectedUser.email}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 transition cursor-pointer"
                      title="Clear Selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Live Candidate Search Results */}
                {searchResults.length > 0 && !selectedUser && (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {searchResults.map((cand) => (
                      <button
                        key={cand._id}
                        type="button"
                        onClick={() => { setSelectedUser(cand); setSearchResults([]); }}
                        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-purple-500/30 transition text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden">
                            {cand.profileImage?.url ? (
                              <img src={cand.profileImage.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              cand.name?.charAt(0) || "U"
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-zinc-200 group-hover:text-white truncate">{cand.name}</p>
                              {cand.isVerified && (
                                <span className="px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 text-[8px] font-bold">
                                  Verified
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-500 truncate">@{cand.userName} • {cand.email}</p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 group-hover:bg-purple-500 text-purple-300 group-hover:text-white text-xs font-bold transition shrink-0">
                          Select
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.trim().length > 0 && !searching && searchResults.length === 0 && !selectedUser && (
                  <p className="text-xs text-zinc-500 text-center py-4">
                    No matching users found for "{searchQuery}". Check spelling or try email/phone.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Custom Permissions */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center text-[10px] font-black">3</span>
              Custom Permissions (Optional Overrides)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              {AVAILABLE_PERMISSIONS.map((perm) => {
                const isChecked = permissions.includes(perm.id);
                return (
                  <label
                    key={perm.id}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition ${
                      isChecked ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePermission(perm.id)}
                      className="rounded border-white/20 text-rose-500 focus:ring-0 cursor-pointer"
                    />
                    <span className={`text-xs font-medium ${isChecked ? "text-white" : "text-zinc-400"}`}>{perm.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={submitting || !selectedRole || (mode === "promote" && !selectedUser)}
            className={`w-full py-4 rounded-2xl text-sm font-bold shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${
              selectedRoleConfig
                ? `bg-gradient-to-r ${selectedRoleConfig.gradient} text-white hover:brightness-110`
                : "bg-zinc-800 text-zinc-400"
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{mode === "new" ? "Dispatching Authorization Code..." : "Promoting Staff..."}</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4.5 h-4.5" />
                <span>
                  {mode === "new"
                    ? `Send Verification Code to ${email || "Email"}`
                    : `Promote to ${selectedRoleConfig?.label || "Staff"}`}
                </span>
              </>
            )}
          </button>
        </form>
      )}

      {/* ── STEP 2: Candidate Email OTP Verification ── */}
      {step === 2 && (
        <form onSubmit={handleVerifyAndRegister} className="space-y-6 animate-fade-in-up">
          <div className="p-6 rounded-3xl bg-[#0d111a] border border-white/[0.08] shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-purple-500/20">
              <Mail className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white font-['Outfit']">Verify Candidate Work Email</h2>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                An authorization code has been dispatched to <span className="font-bold text-white">{email}</span>.
                Enter the 6-digit OTP code below to confirm email validity and grant {selectedRoleConfig?.label} privileges.
              </p>
            </div>

            {debugOtp && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs text-center font-mono">
                Dev Authorization Code: <span className="font-bold text-white tracking-widest">{debugOtp}</span>
              </div>
            )}

            <div className="max-w-xs mx-auto space-y-1.5 text-left">
              <label className="text-[11px] font-bold text-zinc-400 uppercase">6-Digit Authorization Code</label>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="w-full py-3.5 text-center tracking-[0.5em] font-mono text-xl font-black rounded-2xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-sm font-bold shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying & Creating Account...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorize & Create {selectedRoleConfig?.label}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-zinc-400 hover:text-white transition cursor-pointer"
              >
                Back to Edit Candidate Details
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default StaffRegistration;
