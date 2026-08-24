// client/src/components/CommunitySettingsModal.jsx
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Shield,
  Users,
  Hash,
  Copy,
  Trash2,
  LogOut,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  X,
  Lock,
  Globe,
  Plus,
  Check,
  Crown,
  UserMinus,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import api from "../lib/axios";
import { snackbar } from "../lib/snackbar";
import ConfirmDialogModal from "./ConfirmDialogModal";

const CATEGORIES = ["General", "Gaming", "Technology", "Music", "Education", "Entertainment", "Creator"];

export const CommunitySettingsModal = ({
  isOpen,
  community,
  currentUserId,
  onClose,
  onCommunityUpdated,
  onCommunityDeleted,
  onCommunityLeft,
}) => {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "channels" | "members" | "invites" | "danger"

  // Overview form
  const [name, setName] = useState(community?.name || "");
  const [description, setDescription] = useState(community?.description || "");
  const [category, setCategory] = useState(community?.category || "General");
  const [tags, setTags] = useState(Array.isArray(community?.tags) ? community.tags.join(", ") : "");
  const [welcomeMessage, setWelcomeMessage] = useState(community?.welcomeMessage || "");
  const [isPrivate, setIsPrivate] = useState(Boolean(community?.isPrivate));

  // Files
  const [iconFile, setIconFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(community?.icon?.url || community?.image?.url || "");
  const [bannerPreview, setBannerPreview] = useState(community?.banner?.url || "");

  // Members search
  const [memberSearch, setMemberSearch] = useState("");
  const [membersList, setMembersList] = useState(community?.members || []);

  // Saving state
  const [saving, setSaving] = useState(false);

  const iconInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const isOwner = (community?.owner?._id || community?.owner) === currentUserId;
  const currentMember = community?.members?.find(
    (m) => (m.user?._id || m.user)?.toString() === currentUserId?.toString()
  );
  const isAdmin = isOwner || currentMember?.roles?.includes("admin");

  const handleIconChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIconFile(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveOverview = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("description", description);
      formData.append("category", category);
      formData.append("tags", tags);
      formData.append("welcomeMessage", welcomeMessage);
      formData.append("isPrivate", isPrivate);

      if (iconFile) formData.append("icon", iconFile);
      if (bannerFile) formData.append("banner", bannerFile);

      const res = await api.put(`/community/${community._id}/update`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        snackbar.success("Community settings saved!");
        onCommunityUpdated?.(res.data.community);
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to update community");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateInvite = async () => {
    try {
      const res = await api.post(`/community/${community._id}/invite/regenerate`);
      if (res.data?.success) {
        snackbar.success("New invite code generated!");
        onCommunityUpdated?.({ ...community, inviteCode: res.data.inviteCode });
      }
    } catch {
      snackbar.error("Failed to generate new invite code");
    }
  };

  const handleUpdateRole = async (targetUserId, role) => {
    try {
      const res = await api.put(`/community/${community._id}/members/${targetUserId}/role`, { role });
      if (res.data?.success) {
        snackbar.success(`Role updated to ${role}`);
        setMembersList(res.data.community?.members || []);
        onCommunityUpdated?.(res.data.community);
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to change role");
    }
  };

  // Confirmation dialog state
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "Confirm",
    onConfirm: null,
  });

  const executeKickMember = async (targetUserId) => {
    try {
      const res = await api.delete(`/community/${community._id}/members/${targetUserId}`);
      if (res.data?.success) {
        snackbar.success("Member removed");
        setMembersList(res.data.community?.members || []);
        onCommunityUpdated?.(res.data.community);
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to kick member");
    } finally {
      setConfirmState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleKickMember = (targetUserId) => {
    setConfirmState({
      isOpen: true,
      title: "Remove Member",
      message: "Are you sure you want to remove this member from the server?",
      confirmLabel: "Remove Member",
      onConfirm: () => executeKickMember(targetUserId),
    });
  };

  const executeLeaveServer = async () => {
    try {
      const res = await api.post(`/community/${community._id}/leave`);
      if (res.data?.success) {
        snackbar.success(`Left ${community.name}`);
        onCommunityLeft?.(community._id);
        onClose?.();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to leave community");
    } finally {
      setConfirmState((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleLeaveServer = () => {
    setConfirmState({
      isOpen: true,
      title: `Leave ${community.name}`,
      message: `Are you sure you want to leave ${community.name}? You will need a new invite to rejoin.`,
      confirmLabel: "Leave Server",
      onConfirm: executeLeaveServer,
    });
  };

  const handleDeleteServer = async () => {
    try {
      const res = await api.delete(`/community/${community._id}`);
      if (res.data?.success) {
        snackbar.success("Community permanently deleted");
        onCommunityDeleted?.(community._id);
        onClose?.();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to delete community");
    }
  };

  const filteredMembers = membersList.filter((m) => {
    const q = memberSearch.toLowerCase();
    const u = m.user;
    return (
      u?.userName?.toLowerCase().includes(q) ||
      u?.name?.toLowerCase().includes(q)
    );
  });

  if (!isOpen || !community) return null;

  return (
    <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-surface border border-border w-full max-w-4xl h-[650px] max-h-[90vh] rounded-3xl shadow-2xl flex overflow-hidden relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text hover:bg-surface-inset rounded-full transition z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* SETTINGS LEFT SIDEBAR */}
        <div className="w-56 bg-surface-inset border-r border-border p-4 flex flex-col justify-between shrink-0">
          <div>
            <div className="px-3 py-2 mb-3">
              <span className="text-[11px] font-black text-text-muted uppercase tracking-wider">
                {community.name}
              </span>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab("overview")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-text-secondary hover:text-text hover:bg-surface"
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Overview</span>
              </button>

              <button
                onClick={() => setActiveTab("members")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "members"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-text-secondary hover:text-text hover:bg-surface"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Members & Roles</span>
              </button>

              <button
                onClick={() => setActiveTab("invites")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "invites"
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-text-secondary hover:text-text hover:bg-surface"
                }`}
              >
                <Copy className="w-4 h-4" />
                <span>Invite Codes</span>
              </button>
            </nav>
          </div>

          {/* Bottom actions */}
          <div className="pt-4 border-t border-border/80 space-y-1">
            {!isOwner && (
              <button
                onClick={handleLeaveServer}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Server</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => setActiveTab("danger")}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === "danger"
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : "text-rose-400 hover:bg-rose-500/10"
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Server</span>
              </button>
            )}
          </div>
        </div>

        {/* SETTINGS CONTENT VIEW */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 sm:p-8 hide-scrollbar">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <form onSubmit={handleSaveOverview} className="space-y-6 max-w-xl">
              <div>
                <h3 className="text-lg font-bold text-text mb-1">Server Overview</h3>
                <p className="text-xs text-text-muted">Customize your community branding, description, and visibility.</p>
              </div>

              {/* Banner & Avatar Upload */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Server Banner & Icon</label>
                
                {/* Banner container */}
                <div
                  onClick={() => bannerInputRef.current?.click()}
                  className="h-28 rounded-2xl bg-gradient-to-r from-purple-800 to-rose-700 relative overflow-hidden border border-border group cursor-pointer flex items-center justify-center"
                >
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="" className="w-full h-full object-cover" />
                  ) : null}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 text-white text-xs font-bold backdrop-blur-xs">
                    <Upload className="w-4 h-4" />
                    <span>Upload Banner</span>
                  </div>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerChange}
                  />
                </div>

                {/* Icon upload container */}
                <div className="flex items-center gap-4 pt-1">
                  <div
                    onClick={() => iconInputRef.current?.click()}
                    className="w-16 h-16 rounded-2xl bg-surface border-2 border-border overflow-hidden shadow-lg group cursor-pointer relative flex items-center justify-center shrink-0"
                  >
                    {iconPreview ? (
                      <img src={iconPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-black text-lg text-text">{name?.[0]?.toUpperCase()}</span>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white backdrop-blur-xs">
                      <Upload className="w-4 h-4" />
                    </div>
                    <input
                      ref={iconInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleIconChange}
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text block mb-0.5">Community Icon</span>
                    <span className="text-[11px] text-text-muted">Recommended size 512x512 PNG or JPG.</span>
                  </div>
                </div>
              </div>

              {/* Server Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Server Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-surface-inset border border-border rounded-xl px-3.5 py-2 text-xs text-text outline-none focus:border-primary transition"
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-surface-inset border border-border rounded-xl px-3.5 py-2 text-xs text-text outline-none focus:border-primary transition"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell people what this community is about..."
                  className="bg-surface-inset border border-border rounded-xl px-3.5 py-2 text-xs text-text outline-none focus:border-primary transition resize-none"
                />
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Discovery Tags (comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="gaming, valorant, friends, memes"
                  className="bg-surface-inset border border-border rounded-xl px-3.5 py-2 text-xs text-text outline-none focus:border-primary transition"
                />
              </div>

              {/* Welcome Message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">Welcome Message</label>
                <input
                  type="text"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="bg-surface-inset border border-border rounded-xl px-3.5 py-2 text-xs text-text outline-none focus:border-primary transition"
                />
              </div>

              {/* Privacy toggle */}
              <div className="flex items-center justify-between p-3.5 bg-surface-inset rounded-2xl border border-border">
                <div className="flex items-center gap-3">
                  {isPrivate ? <Lock className="w-5 h-5 text-amber-400" /> : <Globe className="w-5 h-5 text-emerald-400" />}
                  <div>
                    <span className="text-xs font-bold text-text block">
                      {isPrivate ? "Private Community" : "Public Community"}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {isPrivate
                        ? "Users can only join via invite code"
                        : "Discoverable in Public Explorer, anyone can join"}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="accent-primary w-4 h-4 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </form>
          )}

          {/* TAB 2: MEMBERS & ROLES */}
          {activeTab === "members" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-text mb-1">Members ({membersList.length})</h3>
                <p className="text-xs text-text-muted">Manage member permissions, assign roles, or remove users.</p>
              </div>

              <input
                type="text"
                placeholder="Filter members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full bg-surface-inset border border-border rounded-xl px-3.5 py-2 text-xs text-text outline-none focus:border-primary"
              />

              <div className="space-y-2 max-h-[420px] overflow-y-auto hide-scrollbar">
                {filteredMembers.map((m) => {
                  const user = m.user;
                  const isUserOwner = (community?.owner?._id || community?.owner)?.toString() === user?._id?.toString();
                  const isUserAdmin = m.roles?.includes("admin");
                  const isUserMod = m.roles?.includes("moderator");

                  return (
                    <div
                      key={user?._id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-surface-inset border border-border/80"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-surface border border-border flex items-center justify-center shrink-0">
                          {user?.profileImage?.url ? (
                            <img src={user.profileImage.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-text">{user?.userName?.[0]?.toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-text">@{user?.userName}</span>
                            {isUserOwner && <Crown className="w-3.5 h-3.5 text-amber-400" title="Owner" />}
                          </div>
                          <span className="text-[10px] text-text-muted">{user?.name}</span>
                        </div>
                      </div>

                      {/* Role selection dropdown / Kick */}
                      <div className="flex items-center gap-2">
                        {isOwner && !isUserOwner && (
                          <select
                            value={isUserAdmin ? "admin" : isUserMod ? "moderator" : "member"}
                            onChange={(e) => handleUpdateRole(user?._id, e.target.value)}
                            className="bg-surface border border-border rounded-lg px-2.5 py-1 text-xs text-text outline-none"
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}

                        {!isUserOwner && isAdmin && (
                          <button
                            onClick={() => handleKickMember(user?._id)}
                            className="p-1.5 hover:bg-rose-500/10 text-text-muted hover:text-rose-500 rounded-lg transition cursor-pointer"
                            title="Remove Member"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: INVITES */}
          {activeTab === "invites" && (
            <div className="space-y-6 max-w-lg">
              <div>
                <h3 className="text-lg font-bold text-text mb-1">Invite Codes</h3>
                <p className="text-xs text-text-muted">Share your invite code with friends to let them join your server.</p>
              </div>

              <div className="p-4 bg-surface-inset border border-border rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-wider block mb-1">
                    Server Invite Code
                  </span>
                  <span className="font-mono text-sm font-bold text-primary tracking-widest">
                    {community.inviteCode}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(community.inviteCode);
                      snackbar.success("Invite code copied!");
                    }}
                    className="p-2 bg-surface hover:bg-surface-hover border border-border rounded-xl text-text transition cursor-pointer"
                    title="Copy Code"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={handleRegenerateInvite}
                      className="p-2 bg-surface hover:bg-surface-hover border border-border rounded-xl text-text transition cursor-pointer"
                      title="Generate New Code"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DANGER ZONE */}
          {activeTab === "danger" && isOwner && (
            <div className="space-y-6 max-w-lg">
              <div>
                <h3 className="text-lg font-bold text-rose-500 mb-1">Danger Zone</h3>
                <p className="text-xs text-text-muted">
                  Permanently delete this community and all its channels, messages, and voice sessions. This action cannot be undone.
                </p>
              </div>

              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-400 block mb-0.5">Delete this Community</span>
                  <span className="text-[10px] text-text-muted">All messages and channels will be lost forever.</span>
                </div>
                <button
                  onClick={handleDeleteServer}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
                >
                  Delete Server
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Confirmation Dialog Modal */}
      <ConfirmDialogModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default CommunitySettingsModal;
