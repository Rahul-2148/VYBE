import React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  CheckCircle2,
  Radio,
  BellRing,
  UserCog,
  UserPlus,
  FileSpreadsheet,
  IndianRupee,
  LogOut,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useAdminSocket } from "../context/AdminSocketContext";
import { useSidebar } from "../context/SidebarContext";

/**
 * Navigation items — each nav link is gated by a permission.
 */
const ALL_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", path: "/", icon: LayoutDashboard, permission: null, section: "Overview" },
  { id: "users", label: "User Management", path: "/users", icon: Users, permission: "manage_users", section: "Operations" },
  { id: "moderation", label: "Content Moderation", path: "/moderation", icon: ShieldAlert, permission: "manage_reports", section: "Trust & Safety" },
  { id: "live-streams", label: "Live Stream Safety", path: "/live-streams", icon: Radio, permission: "manage_live_streams", section: "Trust & Safety" },
  { id: "verifications", label: "Verification Desk", path: "/verifications", icon: CheckCircle2, permission: "manage_verification", section: "Identity" },
  { id: "finance", label: "Finance & Revenue", path: "/finance", icon: IndianRupee, permission: "view_financials", section: "Monetization" },
  { id: "broadcasts", label: "System Broadcasts", path: "/broadcasts", icon: BellRing, permission: "system_broadcast", section: "Communications" },
  { id: "staff", label: "Staff & RBAC", path: "/staff", icon: UserCog, permission: "manage_staff", section: "Administration" },
  { id: "staff-register", label: "Register Staff", path: "/staff/register", icon: UserPlus, permission: "manage_staff", section: "Administration" },
  { id: "audit-logs", label: "Audit Logs", path: "/audit-logs", icon: FileSpreadsheet, permission: "view_audit_logs", section: "Administration" },
];

const ROLE_BADGES = {
  superadmin: { label: "Super Admin", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  admin: { label: "Admin", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  moderator: { label: "Moderator", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  support: { label: "Support", color: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  finance: { label: "Finance", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
};

const ROLE_ACCENT = {
  superadmin: { from: "from-purple-500", to: "to-indigo-600", shadow: "shadow-purple-500/20", ring: "border-purple-500/30", text: "text-purple-400" },
  admin: { from: "from-rose-500", to: "to-pink-600", shadow: "shadow-rose-500/20", ring: "border-rose-500/30", text: "text-rose-400" },
  moderator: { from: "from-amber-500", to: "to-orange-600", shadow: "shadow-amber-500/20", ring: "border-amber-500/30", text: "text-amber-400" },
  support: { from: "from-sky-500", to: "to-cyan-600", shadow: "shadow-sky-500/20", ring: "border-sky-500/30", text: "text-sky-400" },
  finance: { from: "from-emerald-500", to: "to-teal-600", shadow: "shadow-emerald-500/20", ring: "border-emerald-500/30", text: "text-emerald-400" },
};

export const Sidebar = () => {
  const { adminUser, logout, hasPermission } = useAdminAuth();
  const { pendingReportsCount, pendingVerificationsCount, activeStreamsCount } = useAdminSocket();
  const { isCollapsed, toggleSidebar, mobileOpen, closeMobileMenu } = useSidebar();
  const location = useLocation();
  const role = adminUser?.role || "admin";
  const roleBadge = ROLE_BADGES[role] || ROLE_BADGES.admin;
  const accent = ROLE_ACCENT[role] || ROLE_ACCENT.admin;

  // Filter nav items by user's actual permissions
  const visibleNavItems = ALL_NAV_ITEMS.filter(
    (item) => item.permission === null || hasPermission(item.permission)
  );

  // Group items by section
  const sections = {};
  visibleNavItems.forEach((item) => {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  });

  const getBadge = (itemId, collapsed = false) => {
    if (itemId === "moderation" && pendingReportsCount > 0) {
      return (
        <span className={`px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold animate-pulse ${
          collapsed ? "absolute -top-1 -right-1 text-[8px]" : "ml-auto text-[10px]"
        }`}>
          {pendingReportsCount}
        </span>
      );
    }
    if (itemId === "verifications" && pendingVerificationsCount > 0) {
      return (
        <span className={`px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold animate-pulse ${
          collapsed ? "absolute -top-1 -right-1 text-[8px]" : "ml-auto text-[10px]"
        }`}>
          {pendingVerificationsCount}
        </span>
      );
    }
    if (itemId === "live-streams" && activeStreamsCount > 0) {
      return collapsed ? (
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
      ) : (
        <span className="ml-auto flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          {activeStreamsCount} LIVE
        </span>
      );
    }
    return null;
  };

  // Nav list rendering logic
  const renderNavList = (collapsed = false, isMobile = false) => (
    <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 hide-scrollbar">
      {Object.entries(sections).map(([sectionName, items]) => (
        <div key={sectionName}>
          {!collapsed && (
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
              {sectionName}
            </p>
          )}
          <div className="space-y-0.5">
            {items.map((item) => {
              const Icon = item.icon;
              const isExact = location.pathname === item.path;
              const isSubMatch =
                item.path !== "/" &&
                location.pathname.startsWith(item.path + "/") &&
                !visibleNavItems.some(
                  (other) =>
                    other.path !== item.path &&
                    other.path.startsWith(item.path) &&
                    (location.pathname === other.path || location.pathname.startsWith(other.path + "/"))
                );
              const isActive = isExact || isSubMatch;

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={() => {
                    if (isMobile) closeMobileMenu();
                  }}
                  title={collapsed ? `${item.label} (${item.section})` : undefined}
                  className={`flex items-center rounded-xl text-[12.5px] font-medium transition-all duration-150 relative ${
                    collapsed
                      ? "justify-center p-2.5"
                      : "gap-3 px-3 py-2.5"
                  } ${
                    isActive
                      ? `bg-white/[0.08] text-white font-bold border border-white/[0.08]`
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? accent.text : "text-zinc-400"}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {getBadge(item.id, collapsed)}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* ================= 1. DESKTOP STICKY SIDEBAR (lg and up) ================= */}
      <aside
        className={`hidden lg:flex shrink-0 bg-[#0b0e14] border-r border-white/[0.06] flex-col h-screen sticky top-0 select-none z-40 transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-[72px]" : "w-[240px]"
        }`}
      >
        {/* Single Minimal Top Header */}
        <div className={`h-14 border-b border-white/[0.06] flex items-center transition-all ${
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-500 flex items-center justify-center font-black text-white text-xs shadow-md shadow-rose-500/20 shrink-0">
              V
            </div>
            {!isCollapsed && (
              <span className="font-black tracking-wider text-white text-sm font-['Outfit'] truncate">
                VYBE
              </span>
            )}
          </div>

          {/* Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className={`p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition cursor-pointer shrink-0 ${
              isCollapsed ? "hidden" : "block"
            }`}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Expand button when collapsed in slim header */}
        {isCollapsed && (
          <div className="py-2 flex justify-center border-b border-white/[0.04]">
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand Sidebar"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Desktop Navigation List */}
        {renderNavList(isCollapsed, false)}

        {/* Minimal Bottom User Profile & Quick Actions */}
        <div className="p-2 border-t border-white/[0.06] bg-[#090c12]/80 space-y-1">
          {!isCollapsed ? (
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between gap-2">
              <Link
                to="/profile"
                title={`${adminUser?.name || "Staff"} (@${adminUser?.userName || "staff"}) — Profile & Security`}
                className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-80 transition cursor-pointer"
              >
                <div className="relative shrink-0">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${accent.from} ${accent.to} flex items-center justify-center font-bold text-white text-xs overflow-hidden`}>
                    {adminUser?.profileImage?.url ? (
                      <img src={adminUser.profileImage.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{adminUser?.name?.charAt(0) || "A"}</span>
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0b0e14]" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate leading-tight" title={adminUser?.name}>
                    {adminUser?.name}
                  </p>
                  <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded border mt-0.5 ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-0.5 shrink-0">
                <a
                  href={
                    import.meta.env.VITE_USER_APP_URL ||
                    import.meta.env.VITE_CLIENT_URL ||
                    (import.meta.env.PROD ? "/" : "http://localhost:5173")
                  }
                  target="_blank"
                  rel="noreferrer"
                  title="Open User Web App"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05] transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <Link
                to="/profile"
                title={`${adminUser?.name || "Staff"} (@${adminUser?.userName || "staff"}) — Profile`}
                className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${accent.from} ${accent.to} flex items-center justify-center font-bold text-white text-xs overflow-hidden hover:opacity-80 transition cursor-pointer`}
              >
                {adminUser?.profileImage?.url ? (
                  <img src={adminUser.profileImage.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{adminUser?.name?.charAt(0) || "A"}</span>
                )}
              </Link>

              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ================= 2. MOBILE SLIDING DRAWER & BACKDROP (< lg) ================= */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Frosted Backdrop */}
          <div
            onClick={closeMobileMenu}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in"
          />

          {/* Sliding Drawer Content */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[#0b0e14] border-r border-white/[0.1] shadow-2xl flex flex-col z-50 animate-slide-right">
            {/* Mobile Drawer Top Header */}
            <div className="h-14 px-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-500 via-purple-600 to-amber-500 flex items-center justify-center font-black text-white text-xs shadow-md shadow-rose-500/20">
                  V
                </div>
                <span className="font-black tracking-wider text-white text-sm font-['Outfit']">
                  VYBE OPS
                </span>
              </div>

              <button
                type="button"
                onClick={closeMobileMenu}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/[0.04] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav list */}
            {renderNavList(false, true)}

            {/* Mobile Bottom Profile Card */}
            <div className="p-3 border-t border-white/[0.08] bg-[#090c12]">
              <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-between gap-2">
                <Link
                  to="/profile"
                  onClick={closeMobileMenu}
                  className="flex items-center gap-2.5 min-w-0 flex-1"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${accent.from} ${accent.to} flex items-center justify-center font-bold text-white text-xs overflow-hidden shrink-0`}>
                    {adminUser?.profileImage?.url ? (
                      <img src={adminUser.profileImage.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{adminUser?.name?.charAt(0) || "A"}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate leading-tight">
                      {adminUser?.name}
                    </p>
                    <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded border mt-0.5 ${roleBadge.color}`}>
                      {roleBadge.label}
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
