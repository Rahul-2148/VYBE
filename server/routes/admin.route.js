import express from "express";
import isAdminAuthenticated from "../middlewares/adminAuthenticated.js";
import { isAdmin, isSuperAdmin, requirePermission } from "../middlewares/adminAuth.js";
import {
  adminLogin,
  adminGoogleLogin,
  adminForgotPassword,
  adminVerifyForgotOtp,
  adminResetPassword,
  adminChangePassword,
  adminUpdateProfile,
  adminSendEmailChangeOtp,
  adminVerifyEmailChange,
  adminGetProfileData,
  adminRevokeSession,
  adminRevokeAllOtherSessions,
  getAdminMe,
  adminLogout,
  sendStaffVerificationOtp,
  searchStaffCandidates,
  registerStaffMember,
  getDashboardOverview,
  getFinanceStats,
  getGrowthAnalytics,
  getAdminUsers,
  getAdminUserDetail,
  getUserSessions,
  revokeUserSession,
  revokeAllUserSessions,
  resetUserProfile,
  bulkUserAction,
  banUser,
  unbanUser,
  toggleShadowban,
  toggleVerifyBadge,
  getStaffList,
  updateStaffMember,
  removeStaffMember,
  getReportedContentQueue,
  resolveReport,
  bulkResolveReports,
  getAIModerationLogs,
  getVerificationRequests,
  processVerificationRequest,
  getActiveLiveStreams,
  terminateLiveStream,
  sendLiveStreamWarning,
  createSystemAnnouncement,
  getSystemAnnouncements,
  deleteSystemAnnouncement,
  getPayoutsList,
  processPayout,
  getAuditLogs,
  getSystemHealth,
} from "../controllers/admin.controller.js";

const adminRouter = express.Router();

// 1. Authentication & Recovery (public)
adminRouter.post("/login", adminLogin);
adminRouter.post("/auth/google", adminGoogleLogin);
adminRouter.post("/auth/forgot-password", adminForgotPassword);
adminRouter.post("/auth/verify-otp", adminVerifyForgotOtp);
adminRouter.post("/auth/reset-password", adminResetPassword);
adminRouter.get("/me", isAdminAuthenticated, isAdmin, getAdminMe);
adminRouter.post("/logout", isAdminAuthenticated, isAdmin, adminLogout);

// 1.1 Admin Profile & Security (Authenticated)
adminRouter.get("/profile/data", isAdminAuthenticated, isAdmin, adminGetProfileData);
adminRouter.put("/profile/update", isAdminAuthenticated, isAdmin, adminUpdateProfile);
adminRouter.post("/profile/send-email-otp", isAdminAuthenticated, isAdmin, adminSendEmailChangeOtp);
adminRouter.post("/profile/verify-email-change", isAdminAuthenticated, isAdmin, adminVerifyEmailChange);
adminRouter.post("/profile/change-password", isAdminAuthenticated, isAdmin, adminChangePassword);
adminRouter.delete("/profile/sessions/revoke-others", isAdminAuthenticated, isAdmin, adminRevokeAllOtherSessions);
adminRouter.delete("/profile/sessions/:sessionId", isAdminAuthenticated, isAdmin, adminRevokeSession);

// 2. Dashboard Stats & Analytics
adminRouter.get("/overview", isAdminAuthenticated, isAdmin, getDashboardOverview);
adminRouter.get("/finance-stats", isAdminAuthenticated, isAdmin, getFinanceStats);
adminRouter.get("/growth-analytics", isAdminAuthenticated, isAdmin, getGrowthAnalytics);
adminRouter.get("/system/health", isAdminAuthenticated, isAdmin, getSystemHealth);

// 3. User Management & Deep Inspection
adminRouter.get("/users", isAdminAuthenticated, isAdmin, requirePermission("manage_users"), getAdminUsers);
adminRouter.post("/users/bulk-action", isAdminAuthenticated, isAdmin, requirePermission("manage_users"), bulkUserAction);
adminRouter.get("/users/:userId", isAdminAuthenticated, isAdmin, requirePermission("manage_users"), getAdminUserDetail);
adminRouter.get("/users/:userId/sessions", isAdminAuthenticated, isAdmin, requirePermission("manage_users"), getUserSessions);
adminRouter.post("/users/:userId/sessions/:sessionId/revoke", isAdminAuthenticated, isAdmin, requirePermission("manage_users"), revokeUserSession);
adminRouter.post("/users/:userId/sessions/revoke-all", isAdminAuthenticated, isAdmin, requirePermission("manage_users"), revokeAllUserSessions);
adminRouter.post("/users/:userId/reset-profile", isAdminAuthenticated, isAdmin, requirePermission("manage_users"), resetUserProfile);
adminRouter.post("/users/:userId/ban", isAdminAuthenticated, isAdmin, requirePermission("manage_users"), banUser);
adminRouter.post("/users/:userId/unban", isAdminAuthenticated, isAdmin, requirePermission("manage_users"), unbanUser);
adminRouter.post("/users/:userId/shadowban", isAdminAuthenticated, isAdmin, requirePermission("manage_users"), toggleShadowban);
adminRouter.post("/users/:userId/verify", isAdminAuthenticated, isAdmin, requirePermission("manage_verification"), toggleVerifyBadge);

// 4. Staff & RBAC Management (Super Admin)
adminRouter.post("/staff/send-verification-otp", isAdminAuthenticated, isAdmin, isSuperAdmin, sendStaffVerificationOtp);
adminRouter.get("/staff/candidate-search", isAdminAuthenticated, isAdmin, isSuperAdmin, searchStaffCandidates);
adminRouter.post("/staff/register", isAdminAuthenticated, isAdmin, isSuperAdmin, registerStaffMember);
adminRouter.get("/staff", isAdminAuthenticated, isAdmin, isSuperAdmin, getStaffList);
adminRouter.patch("/staff/:userId", isAdminAuthenticated, isAdmin, isSuperAdmin, updateStaffMember);
adminRouter.delete("/staff/:userId", isAdminAuthenticated, isAdmin, isSuperAdmin, removeStaffMember);

// 5. Content Moderation & Reports (SRT)
adminRouter.get("/reports", isAdminAuthenticated, isAdmin, requirePermission("manage_reports"), getReportedContentQueue);
adminRouter.post("/reports/bulk-resolve", isAdminAuthenticated, isAdmin, requirePermission("manage_reports"), bulkResolveReports);
adminRouter.post("/reports/:reportId/resolve", isAdminAuthenticated, isAdmin, requirePermission("manage_reports"), resolveReport);
adminRouter.get("/moderation-logs", isAdminAuthenticated, isAdmin, requirePermission("manage_reports"), getAIModerationLogs);

// 6. Verification Requests
adminRouter.get("/verification-requests", isAdminAuthenticated, isAdmin, requirePermission("manage_verification"), getVerificationRequests);
adminRouter.post("/verification-requests/:requestId/process", isAdminAuthenticated, isAdmin, requirePermission("manage_verification"), processVerificationRequest);

// 7. Live Streams Monitor & Control
adminRouter.get("/live-streams", isAdminAuthenticated, isAdmin, requirePermission("manage_live_streams"), getActiveLiveStreams);
adminRouter.post("/live-streams/:streamId/terminate", isAdminAuthenticated, isAdmin, requirePermission("manage_reports"), terminateLiveStream);
adminRouter.post("/live-streams/:streamId/warn", isAdminAuthenticated, isAdmin, requirePermission("manage_reports"), sendLiveStreamWarning);

// 8. System Broadcasts & Alerts
adminRouter.post("/broadcasts", isAdminAuthenticated, isAdmin, requirePermission("system_broadcast"), createSystemAnnouncement);
adminRouter.get("/broadcasts", isAdminAuthenticated, isAdmin, getSystemAnnouncements);
adminRouter.delete("/broadcasts/:announcementId", isAdminAuthenticated, isAdmin, requirePermission("system_broadcast"), deleteSystemAnnouncement);

// 9. Finance & Creator Monetization
adminRouter.get("/finance/payouts", isAdminAuthenticated, isAdmin, requirePermission("view_financials"), getPayoutsList);
adminRouter.post("/finance/payouts/:monetizationId/:payoutId/process", isAdminAuthenticated, isAdmin, requirePermission("view_financials"), processPayout);

// 10. Audit Logs History
adminRouter.get("/audit-logs", isAdminAuthenticated, isAdmin, requirePermission("view_audit_logs"), getAuditLogs);

export default adminRouter;
