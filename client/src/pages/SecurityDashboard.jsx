// client/src/pages/SecurityDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  Globe,
  LogOut,
  Key,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Lock,
  RefreshCw,
  ChevronRight,
  Shield,
  Send,
  ArrowLeft,
  Eye,
  EyeOff,
  Fingerprint,
  Mail,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Check,
  X,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Users,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import TwoFactorModal from "../components/TwoFactorModal";
import AccountSwitcherModal from "../components/AccountSwitcherModal";
import { setUserData } from "../redux/features/userSlice";
import { getLinkedAccounts } from "../lib/accountManager";
import moment from "moment";

// Security Score Calculator
const calculateSecurityScore = (user, sessions) => {
  let score = 30; // Base score
  if (user?.twoFactorEnabled) score += 35;
  if (user?.email) score += 10;
  if (sessions && sessions.length > 0 && sessions.length <= 3) score += 10;
  if (user?.profileImage?.url) score += 5;
  score += 10; // Active password
  return Math.min(score, 100);
};

const getScoreColor = (score) => {
  if (score >= 80) return { bg: "from-emerald-500 to-teal-600", text: "text-emerald-400", label: "Strong" };
  if (score >= 50) return { bg: "from-amber-500 to-orange-600", text: "text-amber-400", label: "Moderate" };
  return { bg: "from-rose-500 to-red-600", text: "text-rose-400", label: "Weak" };
};

export const SecurityDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const currentReduxUser = userData?.user || userData;

  const [user, setUser] = useState(currentReduxUser || null);
  const [sessions, setSessions] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loading, setLoading] = useState(!currentReduxUser);
  const [refreshing, setRefreshing] = useState(false);
  const [spinAngle, setSpinAngle] = useState(0);

  // Accounts Center state
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState([]);

  // 2FA Modal states
  const [is2FaModalOpen, setIs2FaModalOpen] = useState(false);
  const [twoFaSetupData, setTwoFaSetupData] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [showRecoveryCodesModal, setShowRecoveryCodesModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showDisablePassword, setShowDisablePassword] = useState(false);

  // Change Password Modal states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrPass, setShowCurrPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // VYBE Privacy & DM Controls
  const [savedLoginInfo, setSavedLoginInfo] = useState(true);
  const [isPrivateAccount, setIsPrivateAccount] = useState(
    currentReduxUser?.accountType === "private" || false
  );
  const [privacySettings, setPrivacySettings] = useState({
    allowMessagesFrom: "everyone",
    allowStoryRepliesFrom: "everyone",
    allowPostSharingToDM: "everyone",
    messageRequestPermission: "requests",
  });

  // AI Algorithm Insights state
  const [aiInsights, setAiInsights] = useState({ topInterests: [], hasSocialGraphBleed: false });

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    accounts: true,
    checkup: true,
    passAndSec: true,
    aiAlgorithm: true,
    sessions: true,
    privacy: true,
    logs: true,
  });

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const fetchData = useCallback(async (isManual = false) => {
    const startTime = Date.now();
    try {
      setRefreshing(true);
      const [userRes, sessionsRes, logsRes, privacyRes, aiRes] = await Promise.all([
        api.get("/user/current-user").catch(() => null),
        api.get("/auth/sessions").catch(() => null),
        api.get("/auth/security-logs").catch(() => null),
        api.get("/user/privacy-settings").catch(() => null),
        api.get("/user/recommendation-insights").catch(() => null),
      ]);

      if (aiRes?.data?.success) {
        setAiInsights({
          topInterests: aiRes.data.topInterests || [],
          hasSocialGraphBleed: Boolean(aiRes.data.hasSocialGraphBleed),
        });
      }

      if (userRes?.data?.user) {
        setUser(userRes.data.user);
        dispatch(setUserData(userRes.data.user));
        setIsPrivateAccount(userRes.data.user.accountType === "private");
      }
      if (privacyRes?.data?.privacySettings) {
        setPrivacySettings(privacyRes.data.privacySettings);
      }
      if (sessionsRes?.data?.sessions) {
        setSessions(sessionsRes.data.sessions);
      }
      if (logsRes?.data?.logs) {
        setSecurityLogs(logsRes.data.logs);
      }

      setLinkedAccounts(getLinkedAccounts());

      // On manual click, hold spin animation for at least 700ms so rotation is clearly visible and satisfying
      if (isManual) {
        const elapsed = Date.now() - startTime;
        if (elapsed < 700) {
          await new Promise((resolve) => setTimeout(resolve, 700 - elapsed));
        }
        snackbar.success("Security & Accounts status refreshed! 🛡️");
      }
    } catch (err) {
      console.warn("Failed to load security center data:", err);
      if (isManual) snackbar.error("Failed to refresh security status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.get("/user/current-user").catch(() => null),
      api.get("/auth/sessions").catch(() => null),
      api.get("/auth/security-logs").catch(() => null),
      api.get("/user/privacy-settings").catch(() => null),
    ])
      .then(([userRes, sessionsRes, logsRes, privacyRes]) => {
        if (!isMounted) return;
        if (userRes?.data?.user) {
          setUser(userRes.data.user);
          dispatch(setUserData(userRes.data.user));
          setIsPrivateAccount(userRes.data.user.accountType === "private");
        }
        if (privacyRes?.data?.privacySettings) {
          setPrivacySettings(privacyRes.data.privacySettings);
        }
        if (sessionsRes?.data?.sessions) {
          setSessions(sessionsRes.data.sessions);
        }
        if (logsRes?.data?.logs) {
          setSecurityLogs(logsRes.data.logs);
        }
        setLinkedAccounts(getLinkedAccounts());
      })
      .catch((err) => {
        if (isMounted) console.warn("Failed to load security center data:", err);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  const handleUpdatePrivacySetting = async (key, value) => {
    const updated = { ...privacySettings, [key]: value };
    setPrivacySettings(updated);
    try {
      const res = await api.patch("/user/privacy-settings", { [key]: value });
      if (res.data?.success) {
        snackbar.success("Privacy setting updated! ✨");
      }
    } catch {
      snackbar.error("Failed to update privacy setting.");
    }
  };

  const handleTogglePrivateAccount = async () => {
    const nextVal = !isPrivateAccount;
    const newType = nextVal ? "private" : "public";
    setIsPrivateAccount(nextVal);
    try {
      const res = await api.patch("/user/privacy-settings", { accountType: newType });
      if (res.data?.success) {
        snackbar.success(`Account set to ${newType}!`);
        if (user) {
          const updatedUser = { ...user, accountType: newType };
          setUser(updatedUser);
          dispatch(setUserData(updatedUser));
        }
      }
    } catch {
      setIsPrivateAccount(!nextVal);
      snackbar.error("Failed to update account privacy");
    }
  };

  const handleStart2FaSetup = async () => {
    try {
      const res = await api.post("/auth/2fa/setup");
      if (res.data?.success) {
        setTwoFaSetupData(res.data);
        setIs2FaModalOpen(true);
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to initiate 2FA setup.");
    }
  };

  const handle2FaSetupSuccess = (data) => {
    if (data.recoveryCodes) {
      setRecoveryCodes(data.recoveryCodes);
      setShowRecoveryCodesModal(true);
    }
    fetchData();
  };

  const handleDisable2Fa = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/2fa/disable", {
        password: disablePassword,
        code: disableCode,
      });

      if (res.data?.success) {
        snackbar.success("2FA Disabled Successfully");
        setShowDisableModal(false);
        setDisablePassword("");
        setDisableCode("");
        fetchData();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to disable 2FA.");
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      snackbar.error("New passwords do not match!");
      return;
    }
    if (newPassword.length < 6) {
      snackbar.error("New password must be at least 6 characters.");
      return;
    }

    try {
      setChangingPassword(true);
      const res = await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (res.data?.success) {
        snackbar.success("Password updated successfully! ✨");
        setShowChangePasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        fetchData();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to update password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      const res = await api.delete(`/auth/sessions/${sessionId}`);
      if (res.data?.success) {
        snackbar.success("Remote device logged out successfully.");
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        api.get("/auth/security-logs").then((resLogs) => {
          if (resLogs.data?.logs) setSecurityLogs(resLogs.data.logs);
        }).catch(() => {});
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to revoke session.");
    }
  };

  const handleRevokeAllOthers = async () => {
    try {
      const res = await api.delete("/auth/sessions/revoke-others");
      if (res.data?.success) {
        snackbar.success("Logged out from all other devices! 🔒");
        setSessions((prev) => prev.filter((s) => s.isCurrentSession));
        fetchData();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to revoke all sessions.");
    }
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    snackbar.success("Recovery codes copied to clipboard!");
  };

  const formatEventName = (eventType) => {
    switch (eventType) {
      case "login_success": return "Successful Login";
      case "login_failed": return "Failed Login Attempt";
      case "2fa_enabled": return "2FA Activated";
      case "2fa_disabled": return "2FA Deactivated";
      case "2fa_prompt": return "2FA Code Required";
      case "password_changed": return "Password Updated";
      case "session_revoked": return "Device Session Revoked";
      case "all_sessions_revoked": return "All Other Devices Logged Out";
      case "suspicious_login_detected": return "Suspicious Activity Detected";
      default: return eventType.replace(/_/g, " ");
    }
  };

  const getEventIcon = (eventType) => {
    if (eventType.includes("failed") || eventType.includes("suspicious")) return <AlertTriangle className="w-4 h-4" />;
    if (eventType.includes("2fa")) return <Shield className="w-4 h-4" />;
    if (eventType.includes("password")) return <Key className="w-4 h-4" />;
    if (eventType.includes("session") || eventType.includes("revoked")) return <LogOut className="w-4 h-4" />;
    return <CheckCircle2 className="w-4 h-4" />;
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-6 select-none">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-text-secondary">Loading Accounts Center & Security...</p>
        </div>
      </div>
    );
  }

  const securityScore = calculateSecurityScore(user, sessions);
  const scoreConfig = getScoreColor(securityScore);

  return (
    <div className="min-h-screen bg-bg text-text pb-12 select-none">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-40 bg-bg/90 backdrop-blur-xl border-b border-border/80">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-surface transition cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-text" />
            </button>
            <h1 className="text-base font-bold tracking-tight">Accounts Center & Security</h1>
          </div>

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              setSpinAngle((prev) => prev + 360);
              fetchData(true);
            }}
            disabled={refreshing}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface transition cursor-pointer text-text-secondary hover:text-text shrink-0"
            title="Refresh Security Status"
          >
            <motion.div
              animate={{ rotate: spinAngle }}
              transition={{ duration: 0.8, ease: [0.34, 1.4, 0.64, 1] }}
              className="flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 text-text-secondary hover:text-primary transition-colors" />
            </motion.div>
          </motion.button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* VYBE Accounts Center Banner */}
        <div className="p-4 bg-surface/60 border border-border rounded-2xl flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-500 flex items-center justify-center shrink-0 shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-text">VYBE Accounts Center</p>
              <p className="text-[11px] text-text-secondary truncate">
                Logged in as <span className="text-text font-bold">@{user?.userName || "user"}</span> · {linkedAccounts.length} Linked Account{linkedAccounts.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAccountSwitcher(true)}
            className="px-3.5 py-1.5 rounded-xl bg-surface-hover hover:bg-surface-active text-text text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-border shrink-0"
          >
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>Switch Account</span>
          </button>
        </div>

        {/* Security Health Score Card */}
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${scoreConfig.bg} p-6 shadow-2xl text-white`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-lg" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-lg" />

          <div className="relative flex items-center justify-between">
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/80">Security Health Index</p>
              <h2 className="text-3xl font-black text-white">{securityScore}%</h2>
              <p className="text-xs font-bold text-white/90">{scoreConfig.label} Account Protection</p>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSpinAngle((prev) => prev + 360);
                  fetchData(true);
                }}
                disabled={refreshing}
                className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors cursor-pointer backdrop-blur-md border border-white/20 shrink-0 select-none disabled:opacity-80 shadow-xs"
              >
                <motion.div
                  animate={{ rotate: spinAngle }}
                  transition={{ duration: 0.8, ease: [0.34, 1.4, 0.64, 1] }}
                  className="flex items-center justify-center shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                </motion.div>
                <span>Refresh Security Status</span>
              </motion.button>
            </div>

            <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/30 backdrop-blur-md flex items-center justify-center shadow-inner">
              {securityScore >= 80 ? (
                <ShieldCheck className="w-10 h-10 text-white" />
              ) : (
                <ShieldAlert className="w-10 h-10 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* SECTION 1: VYBE Security Checkup Checklist */}
        <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
          <button
            onClick={() => toggleSection("checkup")}
            className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-surface-hover/30 transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-text">Security Checkup</h3>
                <p className="text-[10px] text-text-muted">Essential account security verification steps</p>
              </div>
            </div>
            {expandedSections.checkup ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
          </button>

          <AnimatePresence>
            {expandedSections.checkup && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2">
                  {/* 1. Password */}
                  <div className="flex items-center justify-between p-3 bg-surface-inset border border-border/80 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Key className="w-4 h-4 text-emerald-400" />
                      <div>
                        <p className="text-xs font-semibold text-text">Password</p>
                        <p className="text-[10px] text-text-muted">Encrypted password active</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">Secure</span>
                  </div>

                  {/* 2. Email */}
                  <div className="flex items-center justify-between p-3 bg-surface-inset border border-border/80 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-cyan-400" />
                      <div>
                        <p className="text-xs font-semibold text-text">Email Address</p>
                        <p className="text-[10px] text-text-muted">{user?.email || "Email configured"}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20">Verified</span>
                  </div>

                  {/* 3. 2FA */}
                  <div className="flex items-center justify-between p-3 bg-surface-inset border border-border/80 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Fingerprint className={`w-4 h-4 ${user?.twoFactorEnabled ? "text-emerald-400" : "text-amber-400"}`} />
                      <div>
                        <p className="text-xs font-semibold text-text">Two-Factor Authentication</p>
                        <p className="text-[10px] text-text-muted">{user?.twoFactorEnabled ? "Authenticator app active" : "Not enabled yet"}</p>
                      </div>
                    </div>
                    {user?.twoFactorEnabled ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">Active</span>
                    ) : (
                      <button onClick={handleStart2FaSetup} className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer">Turn On</button>
                    )}
                  </div>

                  {/* 4. Login Activity */}
                  <div className="flex items-center justify-between p-3 bg-surface-inset border border-border/80 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-4 h-4 text-purple-400" />
                      <div>
                        <p className="text-xs font-semibold text-text">Active Devices</p>
                        <p className="text-[10px] text-text-muted">{sessions.length} monitored session{sessions.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">Protected</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SECTION 2: Password & Security Actions */}
        <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
          <button
            onClick={() => toggleSection("passAndSec")}
            className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-surface-hover/30 transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                <Lock className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-text">Password & Authentication</h3>
                <p className="text-[10px] text-text-muted">Change password, 2FA & saved login credentials</p>
              </div>
            </div>
            {expandedSections.passAndSec ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
          </button>

          <AnimatePresence>
            {expandedSections.passAndSec && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {/* Change Password Option */}
                  <button
                    onClick={() => setShowChangePasswordModal(true)}
                    className="w-full flex items-center justify-between p-3.5 bg-surface-inset border border-border/80 rounded-xl hover:bg-surface-hover/50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Key className="w-4.5 h-4.5 text-rose-400" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-text">Change Password</p>
                        <p className="text-[10px] text-text-muted">Update your account login password</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </button>

                  {/* 2FA Option */}
                  <div className="p-3.5 bg-surface-inset border border-border/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Fingerprint className="w-4.5 h-4.5 text-emerald-400" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-text">Two-Factor Authentication (2FA)</p>
                          <p className="text-[10px] text-text-muted">{user?.twoFactorEnabled ? "Authenticator app verification enabled" : "Add an extra layer of protection"}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase ${
                        user?.twoFactorEnabled ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-surface-hover text-text-secondary"
                      }`}>
                        {user?.twoFactorEnabled ? "On" : "Off"}
                      </span>
                    </div>
                    {user?.twoFactorEnabled ? (
                      <button
                        onClick={() => setShowDisableModal(true)}
                        className="w-full py-2 bg-surface hover:bg-surface-hover text-rose-400 border border-border rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Turn Off 2FA
                      </button>
                    ) : (
                      <button
                        onClick={handleStart2FaSetup}
                        className="w-full py-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
                      >
                        Turn On 2FA
                      </button>
                    )}
                  </div>

                  {/* Saved Login Info */}
                  <div className="flex items-center justify-between p-3.5 bg-surface-inset border border-border/80 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-4.5 h-4.5 text-blue-400" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-text">Saved Login Info</p>
                        <p className="text-[10px] text-text-muted">Remember login credentials on this browser</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSavedLoginInfo(!savedLoginInfo);
                        snackbar.success(savedLoginInfo ? "Saved login info turned off" : "Saved login info turned on");
                      }}
                      className="cursor-pointer"
                    >
                      {savedLoginInfo ? (
                        <ToggleRight className="w-7 h-7 text-rose-500" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-text-muted" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SECTION 3: Account Privacy & Controls */}
        <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
          <button
            onClick={() => toggleSection("privacy")}
            className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-surface-hover/30 transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-text">Account Privacy & DM Controls</h3>
                <p className="text-[10px] text-text-muted">Private account, interactions & story replies</p>
              </div>
            </div>
            {expandedSections.privacy ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
          </button>

          <AnimatePresence>
            {expandedSections.privacy && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {/* Private Account Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-surface-inset border border-border/80 rounded-xl">
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-4.5 h-4.5 text-amber-400" />
                      <div className="text-left">
                        <p className="text-xs font-bold text-text">Private Account</p>
                        <p className="text-[10px] text-text-muted">Only approved followers can see your posts and stories</p>
                      </div>
                    </div>
                    <button
                      onClick={handleTogglePrivateAccount}
                      className="cursor-pointer"
                    >
                      {isPrivateAccount ? (
                        <ToggleRight className="w-7 h-7 text-amber-500" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-text-muted" />
                      )}
                    </button>
                  </div>

                  {/* Direct Messages Permission */}
                  <div className="p-3.5 bg-surface-inset border border-border/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Send className="w-4.5 h-4.5 text-blue-400" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-text">Who Can Send You Direct Messages</p>
                          <p className="text-[10px] text-text-muted">Control incoming message requests</p>
                        </div>
                      </div>
                    </div>
                    <select
                      value={privacySettings.allowMessagesFrom || "everyone"}
                      onChange={(e) => handleUpdatePrivacySetting("allowMessagesFrom", e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="followers">Your Followers Only</option>
                      <option value="following">People You Follow Only</option>
                      <option value="no_one">No One (Block All DMs)</option>
                    </select>
                  </div>

                  {/* Story Replies */}
                  <div className="p-3.5 bg-surface-inset border border-border/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-4.5 h-4.5 text-purple-400" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-text">Story Replies</p>
                          <p className="text-[10px] text-text-muted">Control who can reply to your stories</p>
                        </div>
                      </div>
                    </div>
                    <select
                      value={privacySettings.allowStoryRepliesFrom || "everyone"}
                      onChange={(e) => handleUpdatePrivacySetting("allowStoryRepliesFrom", e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="following">People You Follow Only</option>
                      <option value="off">Off (Disable Story Replies)</option>
                    </select>
                  </div>

                  {/* Post & Reel Sharing to DM */}
                  <div className="p-3.5 bg-surface-inset border border-border/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sliders className="w-4.5 h-4.5 text-emerald-400" />
                        <div className="text-left">
                          <p className="text-xs font-bold text-text">Post & Reel Sharing in DMs</p>
                          <p className="text-[10px] text-text-muted">Allow others to send you shared posts or reels in DMs</p>
                        </div>
                      </div>
                    </div>
                    <select
                      value={privacySettings.allowPostSharingToDM || "everyone"}
                      onChange={(e) => handleUpdatePrivacySetting("allowPostSharingToDM", e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="followers">Your Followers Only</option>
                      <option value="following">People You Follow Only</option>
                      <option value="no_one">Don't Accept Shared Posts</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SECTION 4: AI Recommendations & Latent Interest Vectors */}
        <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
          <button
            onClick={() => toggleSection("aiAlgorithm")}
            className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-surface-hover/30 transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-text">AI Recommendation Vectors</h3>
                <p className="text-[10px] text-text-muted">Learned interests, dwell tracking & social graph bleed</p>
              </div>
            </div>
            {expandedSections.aiAlgorithm ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
          </button>

          <AnimatePresence>
            {expandedSections.aiAlgorithm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  <div className="p-3 bg-surface-inset border border-border/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-text flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        Top Latent Interest Topics
                      </p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {aiInsights.hasSocialGraphBleed ? "Social Graph Bleed Active" : "Direct Tracking Only"}
                      </span>
                    </div>

                    {aiInsights.topInterests && aiInsights.topInterests.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {aiInsights.topInterests.map((item, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-semibold bg-surface border border-border/90 text-text-secondary px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs"
                          >
                            <span className="text-purple-400 font-bold">#{item.topic}</span>
                            <span className="text-[9px] text-text-muted font-mono">{Math.round(item.score)}%</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-text-muted italic py-1">
                        No high-affinity topic clusters recorded yet. Browse reels and posts for tailored recommendations.
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-surface-inset border border-border/80 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-text">Dwell-Time Latent Learning</p>
                      <p className="text-[10px] text-text-muted">Calculates intent from 1.5s+ pauses and re-watches</p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      Real-Time Active
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SECTION 5: Where You're Logged In (Active Sessions) */}
        <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
          <button
            onClick={() => toggleSection("sessions")}
            className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-surface-hover/30 transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-text">Where You're Logged In</h3>
                <p className="text-[10px] text-text-muted">{sessions.length} active device session{sessions.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sessions.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRevokeAllOthers(); }}
                  className="text-[10px] text-rose-400 font-bold hover:underline cursor-pointer mr-2"
                >
                  Log Out All Others
                </button>
              )}
              {expandedSections.sessions ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
            </div>
          </button>

          <AnimatePresence>
            {expandedSections.sessions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2.5">
                  {sessions.map((session) => (
                    <div key={session.id} className="p-3 bg-surface-inset border border-border/80 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-surface mt-0.5 shrink-0 border border-border">
                          {session.os?.toLowerCase().includes("android") || session.os?.toLowerCase().includes("ios") ? (
                            <Smartphone className="w-4.5 h-4.5 text-pink-400" />
                          ) : (
                            <Laptop className="w-4.5 h-4.5 text-cyan-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-text">
                              {session.deviceInfo || "Web Browser"} ({session.os || "OS"})
                            </p>
                            {session.isCurrentSession && (
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                This Device
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-text-muted">
                            {session.browser} · {session.ipAddress}
                          </p>
                          <p className="text-[9px] text-text-muted mt-0.5">
                            Last active: {moment(session.lastActive).fromNow()}
                          </p>
                        </div>
                      </div>

                      {!session.isCurrentSession && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SECTION 5: Security & Login Audit Logs */}
        <div className="rounded-2xl bg-surface border border-border overflow-hidden shadow-xs">
          <button
            onClick={() => toggleSection("logs")}
            className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-surface-hover/30 transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-text">Security & Login History</h3>
                <p className="text-[10px] text-text-muted">{securityLogs.length} recent event{securityLogs.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            {expandedSections.logs ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
          </button>

          <AnimatePresence>
            {expandedSections.logs && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2">
                  {securityLogs.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-4">No security events recorded yet.</p>
                  ) : (
                    securityLogs.map((log) => {
                      const isDanger = log.eventType.includes("failed") || log.eventType.includes("suspicious");
                      return (
                        <div
                          key={log._id}
                          className="flex items-center justify-between p-3 rounded-xl bg-surface-inset border border-border/80"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-1.5 rounded-lg shrink-0 ${
                              isDanger ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
                            }`}>
                              {getEventIcon(log.eventType)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-xs text-text truncate">{formatEventName(log.eventType)}</p>
                              <p className="text-[10px] text-text-muted truncate">
                                {log.deviceInfo} · {log.ipAddress}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] text-text-muted shrink-0 ml-2">{moment(log.createdAt).fromNow()}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Account Switcher Modal */}
      {showAccountSwitcher && (
        <AccountSwitcherModal
          isOpen={showAccountSwitcher}
          onClose={() => setShowAccountSwitcher(false)}
        />
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 text-text space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Key className="w-5 h-5 text-rose-500" />
                Change Password
              </h3>
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="p-1 rounded-full text-text-secondary hover:text-text hover:bg-surface-hover transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1 uppercase">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-inset border border-border rounded-xl text-xs text-text outline-none focus:border-rose-500 pr-10"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrPass(!showCurrPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
                  >
                    {showCurrPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1 uppercase">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-surface-inset border border-border rounded-xl text-xs text-text outline-none focus:border-rose-500 pr-10"
                    placeholder="Minimum 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1 uppercase">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface-inset border border-border rounded-xl text-xs text-text outline-none focus:border-rose-500"
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="flex-1 py-2.5 bg-surface-hover hover:bg-surface-active font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl text-xs shadow-lg transition active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {changingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {is2FaModalOpen && twoFaSetupData && (
        <TwoFactorModal
          isOpen={is2FaModalOpen}
          onClose={() => setIs2FaModalOpen(false)}
          mode="setup"
          qrCodeUrl={twoFaSetupData.qrCodeUrl}
          secret={twoFaSetupData.secret}
          onSuccess={handle2FaSetupSuccess}
        />
      )}

      {/* Recovery Codes Display Modal */}
      {showRecoveryCodesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 text-text space-y-5 shadow-2xl"
          >
            <div className="text-center">
              <Key className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-lg font-bold">Recovery Codes</h3>
              <p className="text-[10px] text-text-secondary mt-1">
                Save these in a safe place. If you lose access to your authenticator app, use one of these codes to sign in.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 bg-surface-inset border border-border rounded-2xl font-mono text-center text-xs font-bold tracking-wider text-rose-300">
              {recoveryCodes.map((code, idx) => (
                <div key={idx} className="p-2 bg-surface rounded-xl border border-border">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyRecoveryCodes}
                className="flex-1 py-3 bg-surface-hover hover:bg-surface-active font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
              <button
                onClick={() => setShowRecoveryCodesModal(false)}
                className="flex-1 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                I've Saved Them
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 text-text space-y-5 shadow-2xl"
          >
            <div>
              <h3 className="text-lg font-bold">Disable 2FA</h3>
              <p className="text-[10px] text-text-secondary mt-1">
                Enter your password and current authenticator code to confirm.
              </p>
            </div>

            <form onSubmit={handleDisable2Fa} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-text-muted mb-1 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type={showDisablePassword ? "text" : "password"}
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-inset border border-border rounded-xl outline-none text-text text-xs focus:border-rose-500 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowDisablePassword(!showDisablePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
                  >
                    {showDisablePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-text-muted mb-1 uppercase tracking-wider">6-Digit Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-inset border border-border rounded-xl outline-none text-text font-mono text-center tracking-widest text-xs focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDisableModal(false)}
                  className="flex-1 py-2.5 bg-surface-hover hover:bg-surface-active font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Confirm Disable
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;
