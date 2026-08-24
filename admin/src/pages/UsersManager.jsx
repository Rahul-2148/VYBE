import React, { useState, useEffect } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  UserX,
  UserCheck,
  Eye,
  AlertTriangle,
  Lock,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Smartphone,
  Globe,
  Trash2,
  Key,
  Flame,
  Film,
  Grid,
  IndianRupee,
  Ban,
  RotateCcw,
  LogOut,
  Loader2,
  Check,
} from "lucide-react";
import api from "../lib/api";
import { toast } from "../lib/toast";
import ConfirmModal from "../components/ConfirmModal";

export const UsersManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // User 360 Inspection Drawer State
  const [inspectUser, setInspectUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState("overview"); // "overview", "content", "sessions", "reports", "finance"

  // Ban Modal State
  const [banModalUser, setBanModalUser] = useState(null);
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState("7");
  const [banSubmitting, setBanSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users", {
        params: {
          page,
          limit: 15,
          search: search.trim(),
          role: roleFilter,
          status: statusFilter,
        },
      });
      if (res.data?.success) {
        setUsers(res.data.users || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch {
      toast.error("Failed to load user directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleInspectUser = async (user) => {
    setInspectUser(user);
    setActiveDetailTab("overview");
    try {
      setDetailLoading(true);
      const res = await api.get(`/users/${user._id}`);
      if (res.data?.success) {
        setUserDetail(res.data);
      }
    } catch {
      toast.error("Failed to load User 360 profile.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleVerify = async (userId) => {
    try {
      const res = await api.post(`/users/${userId}/verify`);
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchUsers();
        if (inspectUser?._id === userId) {
          setInspectUser((prev) => ({ ...prev, isVerified: res.data.isVerified }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle verified status.");
    }
  };

  const handleToggleShadowban = async (userId) => {
    try {
      const res = await api.post(`/users/${userId}/shadowban`);
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchUsers();
        if (inspectUser?._id === userId) {
          setInspectUser((prev) => ({ ...prev, isShadowBanned: res.data.isShadowBanned }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle shadowban.");
    }
  };

  const handleConfirmBan = async (e) => {
    e.preventDefault();
    if (!banModalUser) return;

    try {
      setBanSubmitting(true);
      const res = await api.post(`/users/${banModalUser._id}/ban`, {
        reason: banReason.trim() || "Violation of community guidelines",
        days: banDays === "permanent" ? null : banDays,
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setBanModalUser(null);
        setBanReason("");
        fetchUsers();
        if (inspectUser?._id === banModalUser._id) {
          handleInspectUser(banModalUser);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to execute ban.");
    } finally {
      setBanSubmitting(false);
    }
  };

  const handleUnban = async (userId) => {
    try {
      const res = await api.post(`/users/${userId}/unban`);
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchUsers();
        if (inspectUser?._id === userId) {
          handleInspectUser(inspectUser);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to lift ban.");
    }
  };

  // Confirm Modal state for administrative actions
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    variant: "danger",
    onConfirm: null,
  });

  const handleRevokeSession = async (userId, sessionId) => {
    try {
      const res = await api.post(`/users/${userId}/sessions/${sessionId}/revoke`);
      if (res.data?.success) {
        toast.success(res.data.message);
        if (inspectUser?._id === userId) {
          setUserDetail((prev) => ({
            ...prev,
            activeSessions: (prev.activeSessions || []).filter((s) => s._id !== sessionId),
          }));
        }
      }
    } catch (err) {
      toast.error("Failed to revoke session.");
    }
  };

  const executeRevokeAllSessions = async (userId) => {
    try {
      const res = await api.post(`/users/${userId}/sessions/revoke-all`);
      if (res.data?.success) {
        toast.success(res.data.message);
        if (inspectUser?._id === userId) {
          setUserDetail((prev) => ({ ...prev, activeSessions: [] }));
        }
      }
    } catch (err) {
      toast.error("Failed to revoke all sessions.");
    } finally {
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleRevokeAllSessions = (userId) => {
    setConfirmModal({
      isOpen: true,
      title: "Revoke All Device Sessions",
      message: "Are you sure you want to terminate all active logins for this user? They will be immediately signed out from all devices.",
      confirmLabel: "Terminate All Sessions",
      variant: "danger",
      onConfirm: () => executeRevokeAllSessions(userId),
    });
  };

  const executeResetProfile = async (userId, resetBio, resetAvatar) => {
    try {
      const res = await api.post(`/users/${userId}/reset-profile`, { resetBio, resetAvatar });
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchUsers();
        if (inspectUser?._id === userId) {
          handleInspectUser(inspectUser);
        }
      }
    } catch (err) {
      toast.error("Failed to sanitize profile.");
    } finally {
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleResetProfile = (userId, resetBio, resetAvatar) => {
    setConfirmModal({
      isOpen: true,
      title: "Sanitize User Profile",
      message: "Are you sure you want to sanitize this user's avatar and bio for community guideline compliance?",
      confirmLabel: "Sanitize Profile",
      variant: "warning",
      onConfirm: () => executeResetProfile(userId, resetBio, resetAvatar),
    });
  };

  const executeBulkAction = async (action) => {
    try {
      const res = await api.post("/users/bulk-action", {
        userIds: selectedUserIds,
        action,
        reason: "Administrative batch enforcement action",
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setSelectedUserIds([]);
        fetchUsers();
      }
    } catch (err) {
      toast.error("Bulk action failed.");
    } finally {
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleBulkAction = (action) => {
    if (selectedUserIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: `Execute Bulk ${action.toUpperCase()}`,
      message: `Are you sure you want to execute '${action}' across all ${selectedUserIds.length} selected accounts?`,
      confirmLabel: `Execute ${action}`,
      variant: action === "ban" ? "danger" : "warning",
      onConfirm: () => executeBulkAction(action),
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map((u) => u._id));
    }
  };

  const toggleSelectUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    if (users.length === 0) {
      toast.error("No users to export.");
      return;
    }
    const headers = ["ID", "Name", "Username", "Email", "Role", "Verified", "Banned", "Shadowbanned", "Joined"];
    const rows = users.map((u) => [
      u._id,
      `"${u.name}"`,
      `"@${u.userName}"`,
      u.email,
      u.role,
      u.isVerified ? "YES" : "NO",
      u.isBanned ? "YES" : "NO",
      u.isShadowBanned ? "YES" : "NO",
      new Date(u.createdAt).toISOString(),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vybe_users_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-extrabold uppercase tracking-wider">
              Directory & Enforcement
            </span>
            <span className="text-zinc-500 text-xs">•</span>
            <span className="text-zinc-400 text-xs">Identity Governance</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-['Outfit']">
            User 360 Management
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Full profile telemetry, security audits, active device sessions & sanction enforcement.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-bold border border-white/[0.08] transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export User List</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, @username, or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50"
            />
          </div>
        </form>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-white/20"
          >
            <option value="all" className="bg-[#0d111a]">All Statuses</option>
            <option value="verified" className="bg-[#0d111a]">Verified Only (Blue Tick)</option>
            <option value="unverified" className="bg-[#0d111a]">Unverified Only</option>
            <option value="banned" className="bg-[#0d111a]">Banned Accounts</option>
            <option value="shadowbanned" className="bg-[#0d111a]">Shadowbanned</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-white/20"
          >
            <option value="all" className="bg-[#0d111a]">All Roles</option>
            <option value="user" className="bg-[#0d111a]">Regular Users</option>
            <option value="moderator" className="bg-[#0d111a]">Moderators</option>
            <option value="support" className="bg-[#0d111a]">Support Agents</option>
            <option value="finance" className="bg-[#0d111a]">Finance Managers</option>
            <option value="admin" className="bg-[#0d111a]">Platform Admins</option>
            <option value="superadmin" className="bg-[#0d111a]">Super Admins</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Strip */}
      {selectedUserIds.length > 0 && (
        <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-gradient-to-r from-purple-950/60 to-rose-950/60 border border-purple-500/30 shadow-xl animate-fade-in-up">
          <span className="text-xs font-bold text-white">
            {selectedUserIds.length} account{selectedUserIds.length > 1 ? "s" : ""} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction("verify")}
              className="px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold hover:bg-sky-500/30 transition cursor-pointer"
            >
              Bulk Verify
            </button>
            <button
              onClick={() => handleBulkAction("shadowban")}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30 transition cursor-pointer"
            >
              Bulk Shadowban
            </button>
            <button
              onClick={() => handleBulkAction("ban")}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer flex items-center gap-1"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Bulk Ban</span>
            </button>
            <button
              onClick={() => setSelectedUserIds([])}
              className="p-1.5 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-[#0d111a]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] text-zinc-400 font-bold border-b border-white/[0.06]">
              <tr>
                <th className="p-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.length === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20 text-rose-500 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-3.5">User Identity</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Status & Badges</th>
                <th className="p-3.5">Strikes</th>
                <th className="p-3.5">Joined Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading user directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-500">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelected = selectedUserIds.includes(user._id);
                  return (
                    <tr
                      key={user._id}
                      className={`hover:bg-white/[0.02] transition ${
                        isSelected ? "bg-purple-950/20" : ""
                      }`}
                    >
                      <td className="p-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectUser(user._id)}
                          className="rounded border-white/20 text-rose-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Identity Column */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-rose-500 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
                            {user.profileImage?.url ? (
                              <img src={user.profileImage.url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              user.name?.charAt(0) || "U"
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-white truncate">{user.name}</p>
                              {user.isVerified && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate">@{user.userName}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Column */}
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                            user.role === "superadmin"
                              ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                              : user.role === "admin"
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : user.role === "moderator"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                              : user.role === "support"
                              ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                              : user.role === "finance"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-white/[0.04] text-zinc-400 border-white/[0.08]"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* Status & Badges Column */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {user.isBanned ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                              Banned
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-[10px] font-bold">
                              Active
                            </span>
                          )}

                          {user.isShadowBanned && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                              Shadowbanned
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Strikes Column */}
                      <td className="p-3.5 font-bold font-mono">
                        {user.strikes > 0 ? (
                          <span className="text-amber-400 font-bold">{user.strikes}</span>
                        ) : (
                          <span className="text-zinc-600">0</span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="p-3.5 text-zinc-500 font-mono text-[11px]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions Column */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleInspectUser(user)}
                            title="Inspect User 360 Profile"
                            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleVerify(user._id)}
                            title={user.isVerified ? "Revoke Verified Badge" : "Grant Verified Blue Badge"}
                            className={`p-2 rounded-xl border transition cursor-pointer ${
                              user.isVerified
                                ? "bg-sky-500/20 border-sky-500/40 text-sky-300"
                                : "bg-white/[0.04] border-white/[0.08] text-zinc-500 hover:text-sky-300"
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>

                          {user.isBanned ? (
                            <button
                              onClick={() => handleUnban(user._id)}
                              title="Lift Ban"
                              className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setBanModalUser(user)}
                              title="Ban User"
                              className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-3.5 border-t border-white/[0.06] text-xs">
            <p className="text-zinc-500">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total accounts)
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] text-zinc-300 font-bold disabled:opacity-30 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] text-zinc-300 font-bold disabled:opacity-30 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User 360 Deep Inspection Drawer */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-2xl h-full bg-[#0d111a] border-l border-white/[0.1] shadow-2xl flex flex-col animate-fade-in-up">
            {/* Drawer Header */}
            <div className="p-4 sm:p-6 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-purple-950/30 to-rose-950/20">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-purple-500 to-rose-500 flex items-center justify-center font-bold text-white text-lg sm:text-xl shrink-0 overflow-hidden border-2 border-white/20">
                  {inspectUser.profileImage?.url ? (
                    <img src={inspectUser.profileImage.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    inspectUser.name?.charAt(0)
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-white font-['Outfit'] truncate">{inspectUser.name}</h2>
                    {inspectUser.isVerified && <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">@{inspectUser.userName} • {inspectUser.email}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 text-[10px] font-bold uppercase">
                      {inspectUser.role}
                    </span>
                    {inspectUser.isBanned && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                        Banned
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectUser(null)}
                className="p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub Tabs — Smooth Horizontal Scroll on Mobile */}
            <div className="flex gap-2 px-4 sm:px-6 border-b border-white/[0.08] bg-white/[0.01] overflow-x-auto hide-scrollbar whitespace-nowrap">
              {[
                { id: "overview", label: "Overview & Strikes" },
                { id: "content", label: "Content Portfolio" },
                { id: "sessions", label: "Active Devices" },
                { id: "reports", label: "Violations History" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id)}
                  className={`py-3 px-3 text-xs font-bold transition cursor-pointer shrink-0 ${
                    activeDetailTab === tab.id
                      ? "text-white border-b-2 border-purple-500"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
              {detailLoading ? (
                <div className="py-20 text-center text-xs text-zinc-500">Loading profile telemetry...</div>
              ) : activeDetailTab === "overview" ? (
                /* Tab 1: Overview & Strikes */
                <div className="space-y-6">
                  {/* Account Quick Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">Posts</span>
                      <p className="text-lg font-black text-white">{userDetail?.posts?.length || 0}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">Reels</span>
                      <p className="text-lg font-black text-white">{userDetail?.reels?.length || 0}</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">Reports Against</span>
                      <p className="text-lg font-black text-rose-400">{userDetail?.reportsAgainstUser?.length || 0}</p>
                    </div>
                  </div>

                  {/* Bio & Details */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                    <p className="text-xs font-bold text-zinc-400 uppercase">Profile Details</p>
                    <p className="text-xs text-zinc-300 leading-relaxed italic">
                      "{userDetail?.user?.bio || "No bio text set."}"
                    </p>
                    <div className="pt-2 border-t border-white/[0.04] grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-zinc-500 block text-[10px]">User ID</span>
                        <span className="font-mono text-zinc-300 text-[11px]">{userDetail?.user?._id}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">Joined Date</span>
                        <span className="text-zinc-300 text-[11px]">{new Date(userDetail?.user?.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Strikes History */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-zinc-400 uppercase">Strikes & Warning Record</p>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        {userDetail?.user?.strikes || 0} Total Strikes
                      </span>
                    </div>

                    {(userDetail?.user?.strikeHistory || []).length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">No formal strikes issued against this account.</p>
                    ) : (
                      <div className="space-y-2">
                        {userDetail.user.strikeHistory.map((s, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between">
                            <div>
                              <p className="font-bold text-amber-300">{s.reason}</p>
                              <p className="text-[10px] text-zinc-400">{new Date(s.date).toLocaleDateString()}</p>
                            </div>
                            <span className="text-[9px] font-extrabold uppercase text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                              {s.severity || "warning"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Administrative Enforcement Controls */}
                  <div className="p-4 rounded-2xl bg-rose-500/8 border border-rose-500/20 space-y-3">
                    <p className="text-xs font-bold text-rose-300 uppercase">Enforcement Tools</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleResetProfile(inspectUser._id, true, true)}
                        className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-bold border border-white/10 transition cursor-pointer"
                      >
                        Sanitize Avatar & Bio
                      </button>
                      <button
                        onClick={() => handleToggleShadowban(inspectUser._id)}
                        className="p-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition cursor-pointer"
                      >
                        {inspectUser.isShadowBanned ? "Remove Shadowban" : "Enforce Shadowban"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : activeDetailTab === "content" ? (
                /* Tab 2: Content Portfolio */
                <div className="space-y-4">
                  <p className="text-xs font-bold text-zinc-400 uppercase">Recent Posts & Reels</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[...(userDetail?.posts || []), ...(userDetail?.reels || [])].map((item) => (
                      <div key={item._id} className="relative aspect-square rounded-xl overflow-hidden bg-black border border-white/[0.06] group">
                        {item.media?.url ? (
                          item.videoUrl || item.media.url.endsWith(".mp4") ? (
                            <video src={item.media.url} className="w-full h-full object-cover" />
                          ) : (
                            <img src={item.media.url} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600 p-2 text-center">
                            Text post
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center p-2 text-center">
                          <p className="text-[10px] text-white line-clamp-2">{item.caption || "No caption"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeDetailTab === "sessions" ? (
                /* Tab 3: Active Device Sessions */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-zinc-400 uppercase">Active Login Sessions</p>
                    <button
                      onClick={() => handleRevokeAllSessions(inspectUser._id)}
                      className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 transition cursor-pointer"
                    >
                      Revoke All Devices
                    </button>
                  </div>

                  {(userDetail?.activeSessions || []).length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-8 text-center">No active login sessions found.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {userDetail.activeSessions.map((session) => (
                        <div key={session._id} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <Smartphone className="w-4 h-4 text-purple-400 shrink-0" />
                            <div>
                              <p className="font-bold text-white">{session.deviceInfo || "Web Browser"}</p>
                              <p className="text-[10px] text-zinc-500">IP: {session.ipAddress} • Last active: {new Date(session.lastActive).toLocaleString()}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRevokeSession(inspectUser._id, session._id)}
                            className="p-1.5 text-zinc-400 hover:text-rose-400 transition cursor-pointer"
                            title="Revoke session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Tab 4: Violations History */
                <div className="space-y-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase">Community Reports Filed Against User</p>
                  {(userDetail?.reportsAgainstUser || []).length === 0 ? (
                    <p className="text-xs text-zinc-500 italic py-8 text-center">Clean record — No reports filed.</p>
                  ) : (
                    <div className="space-y-2">
                      {userDetail.reportsAgainstUser.map((r) => (
                        <div key={r._id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold text-rose-400 uppercase text-[10px] block">{r.reason}</span>
                            <p className="text-zinc-300 text-[11px]">"{r.description || "No extra description"}"</p>
                            <p className="text-[9px] text-zinc-500 mt-1">Status: {r.status} • {new Date(r.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ban Enforcement Modal */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d111a] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-['Outfit']">
                  Suspend Account @{banModalUser.userName}
                </h3>
                <p className="text-xs text-zinc-400">Enforce account lock and revoke all active login sessions.</p>
              </div>
            </div>

            <form onSubmit={handleConfirmBan} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">Sanction Duration</label>
                <select
                  value={banDays}
                  onChange={(e) => setBanDays(e.target.value)}
                  className="w-full p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-rose-500/50"
                >
                  <option value="1" className="bg-[#0d111a]">24 Hours Temporary Lock</option>
                  <option value="3" className="bg-[#0d111a]">3 Days Suspension</option>
                  <option value="7" className="bg-[#0d111a]">7 Days Suspension</option>
                  <option value="30" className="bg-[#0d111a]">30 Days Heavy Suspension</option>
                  <option value="permanent" className="bg-[#0d111a]">Permanent Ban (Account Termination)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">Violation Policy Reason</label>
                <textarea
                  required
                  rows={3}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="E.g. Repeated harassment, illicit promotions, hate speech..."
                  className="w-full p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBanModalUser(null)}
                  className="flex-1 py-3 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={banSubmitting}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {banSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Ban"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Administrative Confirmation Dialog */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default UsersManager;
