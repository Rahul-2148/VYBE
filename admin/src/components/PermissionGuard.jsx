import React from "react";
import { Navigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";

/**
 * PermissionGuard — Enforces fine-grained RBAC permission checks for a route.
 * If the authenticated staff member lacks the required permission, they are redirected
 * to their primary role workspace.
 */
export const PermissionGuard = ({ children, requiredPermission }) => {
  const { hasPermission, homePath } = useAdminAuth();

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to={homePath || "/"} replace />;
  }

  return children;
};

export default PermissionGuard;
