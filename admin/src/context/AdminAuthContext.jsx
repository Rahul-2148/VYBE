import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import api from "../lib/api";
import { toast } from "../lib/toast";

const AdminAuthContext = createContext(null);

/**
 * RBAC Permission Matrix — identical to Instagram/Meta internal ops.
 * Each role has fixed default permissions.
 * Super Admin/Admin override everything.
 * Individual custom permissions via `adminPermissions` array can extend role defaults.
 */
const ROLE_PERMISSIONS = {
  superadmin: [
    "manage_users",
    "manage_reports",
    "manage_verification",
    "system_broadcast",
    "view_financials",
    "manage_staff",
    "view_audit_logs",
    "manage_live_streams",
  ],
  admin: [
    "manage_users",
    "manage_reports",
    "manage_verification",
    "system_broadcast",
    "view_financials",
    "view_audit_logs",
    "manage_live_streams",
  ],
  moderator: ["manage_reports", "manage_live_streams"],
  support: ["manage_verification"],
  finance: ["view_financials"],
};

/**
 * Role-specific home paths — when a moderator logs in, they land on /moderation, not /.
 */
export const ROLE_HOME_PATHS = {
  superadmin: "/",
  admin: "/",
  moderator: "/moderation",
  support: "/verifications",
  finance: "/finance",
};

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentAdmin = async () => {
    try {
      const res = await api.get("/me");
      if (res.data?.success && res.data?.user) {
        setAdminUser(res.data.user);
      } else {
        setAdminUser(null);
      }
    } catch {
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentAdmin();
  }, []);

  const login = async (emailOrUsername, password) => {
    try {
      const res = await api.post("/login", { emailOrUsername, password });
      if (res.data?.success && res.data?.user) {
        setAdminUser(res.data.user);
        const roleName =
          res.data.user.role === "superadmin"
            ? "Super Admin"
            : res.data.user.role === "admin"
            ? "Platform Admin"
            : res.data.user.role === "moderator"
            ? "Trust & Safety Moderator"
            : res.data.user.role === "support"
            ? "Support Agent"
            : res.data.user.role === "finance"
            ? "Finance Manager"
            : "Staff";
        toast.success(`Authenticated as ${roleName}. Welcome, ${res.data.user.name}.`);
        return { success: true, role: res.data.user.role };
      }
      return { success: false, message: res.data?.message || "Login failed" };
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid administrative credentials.";
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const googleLogin = async (credential) => {
    try {
      const res = await api.post("/auth/google", { credential });
      if (res.data?.success && res.data?.user) {
        setAdminUser(res.data.user);
        toast.success(`Authenticated with Google Workspace. Welcome, ${res.data.user.name}.`);
        return { success: true, role: res.data.user.role };
      }
      return { success: false, message: res.data?.message || "Google login failed" };
    } catch (err) {
      const msg = err.response?.data?.message || "Google Workspace authentication failed.";
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const updateAdminUser = (updatedData) => {
    setAdminUser((prev) => (prev ? { ...prev, ...updatedData } : updatedData));
  };

  const logout = async () => {
    try {
      await api.post("/logout");
    } catch (e) {
      console.warn("Logout request error:", e);
    } finally {
      setAdminUser(null);
      window.location.href = "/login";
    }
  };

  /**
   * Checks if the current admin has a specific permission.
   * 1. Check role-level defaults from ROLE_PERMISSIONS.
   * 2. Check custom overrides from adminPermissions array.
   */
  const hasPermission = (permission) => {
    if (!adminUser) return false;
    const role = adminUser.role;
    // Role defaults
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    if (rolePerms.includes(permission)) return true;
    // Custom overrides set by super admin
    if ((adminUser.adminPermissions || []).includes(permission)) return true;
    return false;
  };

  const isSuperAdmin = adminUser?.role === "superadmin";
  const isAdmin = adminUser?.role === "admin" || isSuperAdmin;
  const homePath = ROLE_HOME_PATHS[adminUser?.role] || "/";

  const contextValue = useMemo(
    () => ({
      adminUser,
      loading,
      login,
      googleLogin,
      updateAdminUser,
      logout,
      hasPermission,
      isSuperAdmin,
      isAdmin,
      homePath,
      refetchAdmin: fetchCurrentAdmin,
    }),
    [adminUser, loading]
  );

  return (
    <AdminAuthContext.Provider value={contextValue}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};
