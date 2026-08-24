import { User } from "../models/user.model.js";

export const STAFF_ROLES = ["moderator", "support", "finance", "admin", "superadmin"];

/**
 * Middleware: Verify that authenticated user has a staff/admin role
 */
export const isAdmin = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Authentication required.",
      });
    }

    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Account not found.",
      });
    }

    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "Account has been suspended.",
      });
    }

    if (!user.role || !STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "Access denied. Insufficient administrative privileges.",
      });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Admin authorization error: ${error.message}`,
    });
  }
};

/**
 * Middleware: Verify that user is Super Admin
 */
export const isSuperAdmin = async (req, res, next) => {
  try {
    if (!req.adminUser) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Authentication required.",
      });
    }

    if (req.adminUser.role !== "superadmin") {
      return res.status(403).json({
        success: false,
        error: true,
        message: "Super Admin privileges required for this action.",
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: true,
      message: `Super Admin authorization error: ${error.message}`,
    });
  }
};

/**
 * Middleware Factory: Verify that user has a specific granular permission OR is Super Admin
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.adminUser) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Authentication required.",
      });
    }

    // Super Admin has all permissions
    if (req.adminUser.role === "superadmin") {
      return next();
    }

    // Admin has standard elevated permissions
    if (req.adminUser.role === "admin") {
      return next();
    }

    // Role-specific defaults — mirror the RBAC matrix in AdminAuthContext
    if (permission === "manage_reports" && req.adminUser.role === "moderator") {
      return next();
    }
    if (permission === "manage_live_streams" && req.adminUser.role === "moderator") {
      return next();
    }
    if (permission === "manage_verification" && (req.adminUser.role === "support" || req.adminUser.role === "moderator")) {
      return next();
    }
    if (permission === "view_financials" && req.adminUser.role === "finance") {
      return next();
    }

    // Explicit custom permission array check
    const permissions = req.adminUser.adminPermissions || [];
    if (permissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: true,
      message: `Missing required permission: '${permission}'.`,
    });
  };
};
