import React, { useState, useEffect } from "react";
import {
  User,
  Shield,
  Key,
  Smartphone,
  CheckCircle2,
  LogOut,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  History,
  Laptop,
  Mail,
  KeyRound,
  X,
} from "lucide-react";
import api from "../lib/api";
import { toast } from "../lib/toast";
import { useAdminAuth } from "../context/AdminAuthContext";
import ConfirmModal from "../components/ConfirmModal";

const PERMISSION_METADATA = {
  manage_users: { title: "User Management & 360", desc: "Inspect user records, enforce account bans, and reset profiles." },
  manage_reports: { title: "Content Moderation (SRT)", desc: "Triage content violations, execute sanctions, and delete content." },
  manage_live_streams: { title: "Live Telemetry & Safety", desc: "Monitor active streams, dispatch in-room warnings, and execute killswitches." },
  manage_verification: { title: "Identity & Blue Badge", desc: "Review government IDs, verify public figures, and grant blue checkmarks." },
  view_financials: { title: "Finance & Revenue", desc: "Inspect platform revenue, track monetization subscriptions, and process creator payouts." },
  system_broadcast: { title: "System Broadcasts", desc: "Dispatch omnichannel emergency announcements and platform notifications." },
  manage_staff: { title: "Staff & RBAC Administration", desc: "Register staff, delegate granular permissions, and modify roles." },
  view_audit_logs: { title: "Security Audit Trail", desc: "Inspect immutable security logs, system telemetry, and staff actions." },
};

const ROLE_BADGES = {
  superadmin: { label: "Super Admin", color: "bg-purple-500/15 text-purple-300 border-purple-500/40" },
  admin: { label: "Platform Admin", color: "bg-rose-500/15 text-rose-300 border-rose-500/40" },
  moderator: { label: "Trust & Safety Moderator", color: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  support: { label: "Support Agent", color: "bg-sky-500/15 text-sky-300 border-sky-500/40" },
  finance: { label: "Finance Manager", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
};

export const AdminProfile = () => {
  const { adminUser, updateAdminUser, hasPermission } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("profile"); // "profile", "security", "sessions", "permissions", "audit"
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile Form
  const [name, setName] = useState(adminUser?.name || "");
  const [bio, setBio] = useState(adminUser?.bio || "");
  const [phoneNumber, setPhoneNumber] = useState(adminUser?.phoneNumber || "");

  // Email Change State
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState(1); // 1 = Input New Email, 2 = Verify OTP
  const [emailLoading, setEmailLoading] = useState(false);
  const [debugEmailOtp, setDebugEmailOtp] = useState("");

  // Password Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Telemetry Data
  const [sessions, setSessions] = useState([]);
  const [audits, setAudits] = useState([]);

  // Modals
  const [revokeModal, setRevokeModal] = useState({ isOpen: false, sessionId: null, isAll: false });

  const fetchProfileData = async () => {
    try {
      const res = await api.get("/profile/data");
      if (res.data?.success) {
        const p = res.data.profile;
        if (p.user) {
          setName(p.user.name || "");
          setBio(p.user.bio || "");
          setPhoneNumber(p.user.phoneNumber || "");
          updateAdminUser(p.user);
        }
        setSessions(p.sessions || []);
        setAudits(p.recentAudits || []);
      }
    } catch {
      toast.error("Failed to load profile telemetry.");
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const res = await api.put("/profile/update", { name, bio, phoneNumber });
      if (res.data?.success) {
        toast.success(res.data.message || "Profile updated successfully.");
        if (res.data.user) {
          updateAdminUser(res.data.user);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Step 1: Send OTP to new email address
  const handleSendEmailOtp = async (e) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Please enter a valid new email address.");
      return;
    }

    try {
      setEmailLoading(true);
      const res = await api.post("/profile/send-email-otp", { newEmail });
      if (res.data?.success) {
        toast.success(res.data.message || "Verification code sent to your new email.");
        if (res.data.debugOtp) {
          setDebugEmailOtp(res.data.debugOtp);
        }
        setEmailStep(2);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send verification code.");
    } finally {
      setEmailLoading(false);
    }
  };

  // Step 2: Verify OTP and finalize email update
  const handleVerifyEmailChange = async (e) => {
    e.preventDefault();
    if (!emailOtp || emailOtp.length !== 6) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }

    try {
      setEmailLoading(true);
      const res = await api.post("/profile/verify-email-change", {
        newEmail,
        otp: emailOtp,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Email address updated successfully.");
        if (res.data.user) {
          updateAdminUser(res.data.user);
        }
        setNewEmail("");
        setEmailOtp("");
        setEmailStep(1);
        setDebugEmailOtp("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to verify new email.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }

    try {
      setChangingPassword(true);
      const res = await api.post("/profile/change-password", { currentPassword, newPassword });
      if (res.data?.success) {
        toast.success("Security password changed successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const executeRevokeSession = async () => {
    try {
      if (revokeModal.isAll) {
        const res = await api.delete("/profile/sessions/revoke-others");
        if (res.data?.success) {
          toast.success("Logged out from all other active devices.");
          fetchProfileData();
        }
      } else if (revokeModal.sessionId) {
        const res = await api.delete(`/profile/sessions/${revokeModal.sessionId}`);
        if (res.data?.success) {
          toast.success("Remote session revoked.");
          fetchProfileData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to revoke session.");
    } finally {
      setRevokeModal({ isOpen: false, sessionId: null, isAll: false });
    }
  };

  const role = adminUser?.role || "admin";
  const roleBadge = ROLE_BADGES[role] || ROLE_BADGES.admin;

  return (
    <div className="space-y-6 select-none font-sans">
      {/* ── Top Hero Profile Banner ── */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0f1420] via-[#131929] to-[#0c101a] border border-white/[0.08] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-500 flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-purple-500/20 overflow-hidden border-2 border-white/20">
                {adminUser?.profileImage?.url ? (
                  <img src={adminUser.profileImage.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{adminUser?.name?.charAt(0) || "A"}</span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-[#0f1420]" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-['Outfit']">
                  {adminUser?.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${roleBadge.color}`}>
                  {roleBadge.label}
                </span>
                {adminUser?.isVerified && (
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold">
                    Official Staff
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 font-mono">@{adminUser?.userName} • {adminUser?.email}</p>
              <p className="text-[11px] text-zinc-500">
                Staff ID: <span className="font-mono text-zinc-400">{adminUser?._id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Active Sessions</p>
              <p className="text-base font-black text-white font-mono">{sessions.length} Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.08] pb-1 overflow-x-auto hide-scrollbar">
        {[
          { id: "profile", label: "Profile & Identity", icon: User },
          { id: "email", label: "Change Email & OTP", icon: Mail },
          { id: "security", label: "Security & Credentials", icon: Key },
          { id: "sessions", label: "Active Sessions", icon: Smartphone, count: sessions.length },
          { id: "permissions", label: "Assigned RBAC Privileges", icon: Shield },
          { id: "audit", label: "Operator Audit Trail", icon: History, count: audits.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                isActive
                  ? "bg-white/[0.1] text-white border border-white/[0.12] shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/[0.08] text-zinc-300 text-[10px] font-mono">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Profile & Identity ── */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-6 rounded-3xl bg-[#0d111a] border border-white/[0.08] shadow-xl space-y-5">
            <div>
              <h2 className="text-base font-black text-white font-['Outfit']">Operator Information</h2>
              <p className="text-xs text-zinc-400">Update your public staff name, bio notes, and emergency contact phone.</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Full Display Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Username (Fixed)</label>
                  <input
                    type="text"
                    disabled
                    value={adminUser?.userName || ""}
                    className="w-full p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-zinc-500 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">Emergency Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase">Current Staff Email</label>
                    <button
                      type="button"
                      onClick={() => setActiveTab("email")}
                      className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition"
                    >
                      Change Email →
                    </button>
                  </div>
                  <input
                    type="email"
                    disabled
                    value={adminUser?.email || ""}
                    className="w-full p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-zinc-400 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">Bio / Operator Notes</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="E.g. Lead Operations & Trust Safety Specialist"
                  className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Profile Updates</span>
                </button>
              </div>
            </form>
          </div>

          <div className="p-6 rounded-3xl bg-[#0d111a] border border-white/[0.08] shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white font-['Outfit']">Identity Verification</h3>
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <p className="text-[11px] font-bold text-zinc-300">Staff Hierarchy Level</p>
                <p className="text-xs font-mono text-purple-300 font-bold uppercase">{role}</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <p className="text-[11px] font-bold text-zinc-300">Administrative Status</p>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authorized Operations Personnel</span>
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                <p className="text-[11px] font-bold text-zinc-300">Email Verification Status</p>
                <p className="text-xs font-mono text-emerald-400 font-bold">
                  {adminUser?.isEmailVerified ? "✓ Confirmed & Verified" : "Pending Verification"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Change Administrative Email with OTP ── */}
      {activeTab === "email" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[#0d111a] border border-white/[0.08] shadow-xl space-y-5">
            <div>
              <h2 className="text-base font-black text-white font-['Outfit']">Update Administrative Email</h2>
              <p className="text-xs text-zinc-400">
                Replace your existing account email with your real email address via 2-step OTP confirmation.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-500">Current Registered Email</p>
                <p className="text-xs font-mono font-bold text-zinc-300">{adminUser?.email}</p>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                Active
              </span>
            </div>

            {debugEmailOtp && emailStep === 2 && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs text-center font-mono">
                Dev Verification Code: <span className="font-bold text-white tracking-widest">{debugEmailOtp}</span>
              </div>
            )}

            {emailStep === 1 ? (
              <form onSubmit={handleSendEmailOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">New Official Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="yourname@gmail.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">Disposable and fake email domains are rejected.</p>
                </div>

                <button
                  type="submit"
                  disabled={emailLoading || !newEmail}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  <span>Send OTP to New Email</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailChange} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">
                    Enter 6-Digit Code Dispatched to {newEmail}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    placeholder="123456"
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ""))}
                    className="w-full py-3.5 text-center tracking-[0.5em] font-mono text-lg font-black rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={emailLoading || emailOtp.length !== 6}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Confirm & Update Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmailStep(1)}
                    className="w-full py-1 text-[11px] text-zinc-400 hover:text-white transition text-center cursor-pointer"
                  >
                    Change target email address
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="p-6 rounded-3xl bg-[#0d111a] border border-white/[0.08] shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white font-['Outfit']">Email Security Guidelines</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-1">
                <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
                  <Shield className="w-4 h-4" />
                  <span>Verified Identity Requirement</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Operational accounts must have a real, accessible email address for security notifications, password recovery, and incident escalations.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Audit Trail Record</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Changing administrative email creates an immutable log in the audit trail with IP address and timestamp.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Security & Credentials ── */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[#0d111a] border border-white/[0.08] shadow-xl space-y-5">
            <div>
              <h2 className="text-base font-black text-white font-['Outfit']">Change Operations Password</h2>
              <p className="text-xs text-zinc-400">Update your console access credentials. Minimum 6 characters required.</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full p-3 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter strong new password"
                    className="w-full p-3 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>

          <div className="p-6 rounded-3xl bg-[#0d111a] border border-white/[0.08] shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white font-['Outfit']">Security Hardening & Guidelines</h3>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Administrative Security Policy</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Never share your operator credentials. Password changes automatically record an immutable security audit event.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-1">
                <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
                  <Shield className="w-4 h-4" />
                  <span>Google Workspace Single Sign-On (SSO)</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  You can seamlessly sign in using your authorized organization Google account on the login screen.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 4: Active Sessions ── */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white font-['Outfit']">Logged In Device Sessions</h2>
              <p className="text-xs text-zinc-400">View and revoke active authorization tokens across your devices.</p>
            </div>
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={() => setRevokeModal({ isOpen: true, sessionId: null, isAll: true })}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Revoke All Other Devices</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map((sess, idx) => (
              <div
                key={sess._id}
                className="p-4 rounded-2xl bg-[#0d111a] border border-white/[0.08] shadow-lg flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white truncate">
                        {sess.deviceInfo || sess.browser || "Operations Browser"}
                      </p>
                      {idx === 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold border border-emerald-500/30">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-zinc-400">IP: {sess.ipAddress || "0.0.0.0"}</p>
                    <p className="text-[10px] text-zinc-500">
                      Logged in: {new Date(sess.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={() => setRevokeModal({ isOpen: true, sessionId: sess._id, isAll: false })}
                    className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Revoke session"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 5: Assigned RBAC Privileges ── */}
      {activeTab === "permissions" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-black text-white font-['Outfit']">Assigned Operational Permissions</h2>
            <p className="text-xs text-zinc-400">
              Role-Based Access Control matrix determining your authorizations in the VYBE Operations Suite.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(PERMISSION_METADATA).map(([key, meta]) => {
              const isGranted = hasPermission(key);
              return (
                <div
                  key={key}
                  className={`p-4 rounded-2xl border transition-all ${
                    isGranted
                      ? "bg-purple-950/10 border-purple-500/30"
                      : "bg-white/[0.02] border-white/[0.04] opacity-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isGranted ? "bg-emerald-400" : "bg-zinc-600"
                          }`}
                        />
                        <p className="text-xs font-bold text-white">{meta.title}</p>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{meta.desc}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase shrink-0 ${
                        isGranted
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {isGranted ? "Granted" : "Restricted"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab 6: Operator Audit Trail ── */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-black text-white font-['Outfit']">Recent Operator Activity</h2>
            <p className="text-xs text-zinc-400">Immutable audit log records of actions performed by this account.</p>
          </div>

          <div className="rounded-3xl bg-[#0d111a] border border-white/[0.08] shadow-xl overflow-hidden">
            {audits.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">No recent operator logs recorded.</div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {audits.map((log) => (
                  <div key={log._id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-purple-400 shrink-0">
                        <History className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-bold text-white font-mono">{log.action}</p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          Target: {log.targetType} {log.targetName ? `(@${log.targetName})` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-mono text-zinc-500">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-zinc-600 font-mono">{log.ipAddress || "0.0.0.0"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Revoke Session Confirmation Modal ── */}
      <ConfirmModal
        isOpen={revokeModal.isOpen}
        title={revokeModal.isAll ? "Revoke All Other Devices" : "Revoke Remote Session"}
        message={
          revokeModal.isAll
            ? "Are you sure you want to sign out from all other active devices? You will remain signed in only on this browser."
            : "Are you sure you want to revoke authorization for this device? It will be logged out immediately."
        }
        confirmLabel="Revoke Device"
        variant="danger"
        onConfirm={executeRevokeSession}
        onCancel={() => setRevokeModal({ isOpen: false, sessionId: null, isAll: false })}
      />
    </div>
  );
};

export default AdminProfile;
