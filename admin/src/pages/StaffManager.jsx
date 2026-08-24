import React, { useState, useEffect } from "react";
import {
  UserPlus,
  Shield,
  Trash2,
  Edit2,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { toast } from "../lib/toast";
import { useAdminAuth } from "../context/AdminAuthContext";
import ConfirmModal from "../components/ConfirmModal";

const AVAILABLE_PERMISSIONS = [
  { id: "manage_users", label: "User Management & Actions" },
  { id: "manage_reports", label: "Content Moderation Desk" },
  { id: "manage_live_streams", label: "Live Stream Monitoring & Intercept" },
  { id: "manage_verification", label: "Identity Verification & Badges" },
  { id: "manage_staff", label: "Staff & RBAC Administration" },
  { id: "system_broadcast", label: "System Broadcasts & Push" },
  { id: "view_financials", label: "Monetization & Financials" },
  { id: "view_audit_logs", label: "Audit Logs Access" },
];

export const StaffManager = () => {
  const { isSuperAdmin, adminUser } = useAdminAuth();
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Role Modal
  const [editingStaff, setEditingStaff] = useState(null);
  const [editRole, setEditRole] = useState("moderator");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [saving, setSaving] = useState(false);

  // Demote Confirm Modal State
  const [demoteModal, setDemoteModal] = useState({ isOpen: false, staffId: null });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get("/staff");
      if (res.data?.success) {
        setStaffList(res.data.staff || []);
      }
    } catch {
      toast.error("Failed to load staff list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchStaff();
    }
  }, [isSuperAdmin]);

  const handleOpenEdit = (staff) => {
    setEditingStaff(staff);
    setEditRole(staff.role || "moderator");
    setSelectedPermissions(staff.adminPermissions || []);
  };

  const handleTogglePermission = (permId) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!editingStaff) return;

    try {
      setSaving(true);
      const res = await api.patch(`/staff/${editingStaff._id}`, {
        role: editRole,
        adminPermissions: selectedPermissions,
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setEditingStaff(null);
        fetchStaff();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update staff.");
    } finally {
      setSaving(false);
    }
  };

  const executeDemote = async (staffId) => {
    try {
      const res = await api.delete(`/staff/${staffId}`);
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchStaff();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to demote staff.");
    } finally {
      setDemoteModal({ isOpen: false, staffId: null });
    }
  };

  const handleDemote = (staffId) => {
    setDemoteModal({ isOpen: true, staffId });
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-12 text-center space-y-3 bg-[#0d111a] rounded-3xl border border-white/10">
        <Shield className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Super Admin Access Only</h2>
        <p className="text-xs text-zinc-400">Only the Master Super Admin can configure staff roles and RBAC security policies.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-['Outfit']">Staff & Role-Based Access (RBAC)</h1>
          <p className="text-xs text-zinc-400">Manage internal operational privileges, moderators, and support team members.</p>
        </div>

        <button
          onClick={() => navigate("/staff/register")}
          className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Onboard New Staff</span>
        </button>
      </div>

      {/* Staff Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-zinc-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-500 mb-2" />
            <p className="text-xs font-mono">Loading operations personnel...</p>
          </div>
        ) : staffList.length === 0 ? (
          <div className="col-span-full py-16 text-center text-zinc-500 text-xs">
            No secondary staff members configured.
          </div>
        ) : (
          staffList.map((member) => (
            <div
              key={member._id}
              className="p-5 rounded-3xl bg-[#0d111a] border border-white/[0.06] hover:border-purple-500/30 transition shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-rose-600 flex items-center justify-center font-bold text-white text-base">
                      {member.name?.charAt(0) || "S"}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {member.name}
                        {member.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                      </h3>
                      <p className="text-[11px] text-zinc-400 font-mono">@{member.userName}</p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      member.role === "superadmin"
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                        : member.role === "admin"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {member.role}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Assigned Privileges</p>
                  <div className="flex flex-wrap gap-1">
                    {member.adminPermissions?.length > 0 ? (
                      member.adminPermissions.map((perm) => (
                        <span
                          key={perm}
                          className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] text-zinc-300 border border-white/[0.06]"
                        >
                          {perm.replace("manage_", "").replace("view_", "").replace(/_/g, " ")}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-500 italic">No specific permissions</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-500">{member.email}</span>
                {member._id !== adminUser?._id && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(member)}
                      className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition cursor-pointer"
                      title="Edit RBAC Permissions"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDemote(member._id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                      title="Demote to Regular User"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit RBAC Permissions Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0d111a] border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-black text-white font-['Outfit']">Configure Staff Role & Privileges</h3>
                <p className="text-xs text-zinc-400">Updating authorizations for @{editingStaff.userName}</p>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">Operational Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/50"
                >
                  <option value="moderator" className="bg-[#0d111a]">Moderator (Trust & Safety)</option>
                  <option value="support" className="bg-[#0d111a]">Support Agent (User 360)</option>
                  <option value="finance" className="bg-[#0d111a]">Finance Manager (Monetization & Payouts)</option>
                  <option value="admin" className="bg-[#0d111a]">Platform Admin (Full Operations Access)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">Delegated RBAC Privileges</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                  {AVAILABLE_PERMISSIONS.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        onClick={() => handleTogglePermission(perm.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isChecked
                            ? "bg-purple-950/20 border-purple-500/40 text-white"
                            : "bg-white/[0.02] border-white/[0.04] text-zinc-400 hover:bg-white/[0.04]"
                        }`}
                      >
                        <span className="text-xs font-semibold">{perm.label}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="accent-purple-500 w-4 h-4 rounded"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="flex-1 py-3 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Privileges</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Demote Confirmation Modal */}
      <ConfirmModal
        isOpen={demoteModal.isOpen}
        title="Demote Staff Member"
        message="Are you sure you want to revoke this staff member's administrative credentials? Their role will be reset to a regular user."
        confirmLabel="Demote Staff"
        variant="danger"
        onConfirm={() => executeDemote(demoteModal.staffId)}
        onCancel={() => setDemoteModal({ isOpen: false, staffId: null })}
      />
    </div>
  );
};

export default StaffManager;
