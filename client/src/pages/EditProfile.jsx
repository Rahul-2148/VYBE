import { useRef, useState } from "react";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import dp from "../assets/dp3.png";
import { setProfileData, setUserData } from "../redux/features/userSlice";
import { ClipLoader } from "react-spinners";
import { snackbar } from "../lib/snackbar";
import { Link2, Trash2, Plus, User, Lock, Sliders, Palette, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import api from "../lib/axios";
import { useTheme } from "../lib/themeContext";
import VybeInput from "../components/VybeInput";

const CATEGORIES = [
  "Digital Creator",
  "Artist",
  "Photographer",
  "Software Engineer",
  "Entrepreneur",
  "Blogger & Writer",
  "Gamer & Streamer",
  "Musician",
  "Fitness Coach",
];

const SETTINGS_TABS = [
  { id: "profile", label: "Edit Profile", icon: <User className="w-4 h-4" /> },
  { id: "password", label: "Change Password", icon: <Lock className="w-4 h-4" /> },
  { id: "suggestions", label: "Content Suggestions", icon: <Sliders className="w-4 h-4" /> },
  { id: "appearance", label: "Appearance Theme", icon: <Palette className="w-4 h-4" /> },
];

const EditProfile = () => {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const { theme, setTheme } = useTheme();

  // Settings Dashboard Tab States
  const [activeTab, setActiveTab] = useState("profile");
  const [activeMobileTab, setActiveMobileTab] = useState(null);
  const [isContactSectionOpen, setIsContactSectionOpen] = useState(false);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const imageInput = useRef(null);

  const [frontendImage, setFrontendImage] = useState(
    userData?.user?.profileImage?.url || dp
  );
  const [backendImage, setBackendImage] = useState(null);

  const [formFields, setFormFields] = useState({
    name: userData?.user?.name || "",
    userName: userData?.user?.userName || "",
    bio: userData?.user?.bio || "",
    profession: userData?.user?.profession || "",
    category: userData?.user?.category || "Digital Creator",
    professionalType: userData?.user?.professionalType || "personal",
    showCategory: userData?.user?.showCategory !== false,
    contactEmail: userData?.user?.contactEmail || "",
    contactPhone: userData?.user?.contactPhone || "",
    businessAddress: userData?.user?.businessAddress || "",
    showContactInfo: userData?.user?.showContactInfo !== false,
    gender: userData?.user?.gender || "male",
    age: userData?.user?.age || "",
    location: userData?.user?.location || "",
    website: userData?.user?.website || "",
    accountType: userData?.user?.accountType || "public",
    sensitiveContentFilter: userData?.user?.sensitiveContentFilter || "medium",
    snoozeSuggestedPosts: userData?.user?.snoozeSuggestedPosts || false,
  });

  const [links, setLinks] = useState(userData?.user?.links || []);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLink, setNewLink] = useState({
    title: "",
    url: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackendImage(file);
      setFrontendImage(URL.createObjectURL(file));
    }
  };

  const handleAddLink = () => {
    if (!newLink.url.trim()) return;

    setLinks([...links, { title: newLink.title.trim() || "Link", url: newLink.url.trim() }]);
    setNewLink({ title: "", url: "" });
    setShowAddLink(false);
  };

  const handleRemoveLink = (index) => {
    const updated = [...links];
    updated.splice(index, 1);
    setLinks(updated);
  };

  const handleEditProfile = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", formFields.name);
      formData.append("userName", formFields.userName);
      formData.append("bio", formFields.bio);
      formData.append("profession", formFields.profession);
      formData.append("category", formFields.category);
      formData.append("professionalType", formFields.professionalType);
      formData.append("showCategory", formFields.showCategory);
      formData.append("contactEmail", formFields.contactEmail);
      formData.append("contactPhone", formFields.contactPhone);
      formData.append("businessAddress", formFields.businessAddress);
      formData.append("showContactInfo", formFields.showContactInfo);
      formData.append("gender", formFields.gender);
      formData.append("age", formFields.age);
      formData.append("location", formFields.location);
      formData.append("website", formFields.website);
      formData.append("accountType", formFields.accountType);
      formData.append("sensitiveContentFilter", formFields.sensitiveContentFilter);
      formData.append("snoozeSuggestedPosts", formFields.snoozeSuggestedPosts);
      formData.append("links", JSON.stringify(links));

      if (backendImage) formData.append("profileImage", backendImage);

      const result = await api.put("/user/edit-profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (result.data.success) {
        dispatch(setUserData(result.data));
        dispatch(setProfileData(result.data));
        snackbar.success(result.data.message || "Profile updated!");
        navigate(`/profile/${formFields.userName}`);
      }
    } catch (error) {
      snackbar.error(error.response?.data?.message || "Failed to update profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      snackbar.error("All password fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      snackbar.error("New passwords do not match!");
      return;
    }
    if (newPassword.length < 6) {
      snackbar.error("New password must be at least 6 characters");
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      if (res.data?.success) {
        snackbar.success(res.data.message || "Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        snackbar.error(res.data?.message || "Failed to update password.");
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to update password.");
    } finally {
      setIsChangingPass(false);
    }
  };

  // Render Sub-Forms
  const renderEditProfileForm = () => (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Avatar Upload */}
      <div className="flex flex-col items-center gap-3 border-b border-border pb-6">
        <div className="w-24 h-24 rounded-full border-2 border-border overflow-hidden relative group cursor-pointer" onClick={() => imageInput.current.click()}>
          <img src={frontendImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-surface-overlay opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] font-bold">
            Change Photo
          </div>
        </div>
        <input ref={imageInput} type="file" accept="image/*" onChange={handleImage} className="hidden" />
        <p className="text-[11px] text-text-muted">Click photo to upload new profile image</p>
      </div>

      <div className="space-y-4 text-xs">
        <div>
          <label className="block text-text-secondary font-semibold mb-1">Full Name</label>
          <input
            type="text"
            name="name"
            value={formFields.name}
            onChange={handleChange}
            className="w-full bg-surface border border-border p-3 rounded-xl outline-none text-text focus:border-primary focus:ring-2 focus:ring-primary/10 transition shadow-xs"
          />
        </div>

        <div>
          <label className="block text-text-secondary font-semibold mb-1">Username</label>
          <input
            type="text"
            name="userName"
            value={formFields.userName}
            onChange={handleChange}
            className="w-full bg-surface border border-border p-3 rounded-xl outline-none text-text focus:border-primary focus:ring-2 focus:ring-primary/10 transition shadow-xs"
          />
        </div>

        <div>
          <label className="block text-text-secondary font-semibold mb-1">Professional Account Type</label>
          <select
            name="professionalType"
            value={formFields.professionalType}
            onChange={(e) => {
              const val = e.target.value;
              setFormFields((prev) => ({
                ...prev,
                professionalType: val,
                ...(val === "personal" ? { category: "", professionalCategoryLabel: "", contactEmail: "", contactPhone: "", businessAddress: "", showContactInfo: false, showCategory: false } : {}),
              }));
            }}
            className="w-full bg-surface border border-border p-3 rounded-xl outline-none text-text focus:border-primary focus:ring-2 focus:ring-primary/10 transition shadow-xs cursor-pointer"
          >
            <option value="personal">Personal Account</option>
            <option value="creator">Creator (Content Creator, Influencer, Artist)</option>
            <option value="business">Business (Local Business, Brand, Company)</option>
          </select>
        </div>

        {formFields.professionalType !== "personal" && (
          <>
            <div>
              <label className="block text-text-secondary font-semibold mb-1">Professional Category</label>
              <select
                name="category"
                value={formFields.category}
                onChange={(e) => setFormFields((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full bg-surface border border-border p-3 rounded-xl outline-none text-text focus:border-primary focus:ring-2 focus:ring-primary/10 transition shadow-xs cursor-pointer"
              >
                <option value="">Select a category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-surface/40 border border-border rounded-xl">
              <div>
                <label className="block font-bold text-text text-[11px] sm:text-xs">Show Category Label</label>
                <span className="text-[9px] sm:text-[10px] text-text-muted">Display your selected category on your profile</span>
              </div>
              <input
                type="checkbox"
                name="showCategory"
                checked={formFields.showCategory}
                onChange={(e) => setFormFields((prev) => ({ ...prev, showCategory: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
            </div>
          </>
        )}

        {/* Contact Options — Available for all accounts */}
        <div className="border-t border-border/40 pt-4 mt-2">
          <button
            type="button"
            onClick={() => setIsContactSectionOpen(!isContactSectionOpen)}
            className="w-full flex items-center justify-between py-2 text-left hover:opacity-80 transition cursor-pointer"
          >
            <div>
              <span className="font-bold text-text text-xs uppercase tracking-wider block">Contact & Privacy Options</span>
              <span className="text-[10px] text-text-muted">Manage your public email and masked phone number</span>
            </div>
            {isContactSectionOpen ? (
              <ChevronUp className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            )}
          </button>

          {isContactSectionOpen && (
            <div className="space-y-4 mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <div>
                <label className="block text-text-secondary font-semibold mb-1">Public / Contact Email</label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formFields.contactEmail}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="w-full bg-surface border border-border p-3 rounded-xl outline-none text-text focus:border-primary focus:ring-2 focus:ring-primary/10 transition shadow-xs"
                />
              </div>

              <div>
                <label className="block text-text-secondary font-semibold mb-1">Contact Phone Number (Masked by default)</label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formFields.contactPhone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                  className="w-full bg-surface border border-border p-3 rounded-xl outline-none text-text focus:border-primary focus:ring-2 focus:ring-primary/10 transition shadow-xs"
                />
                <span className="text-[10px] text-text-muted mt-1 block">
                  Your phone is safely masked on your profile (e.g. +91 98••••••10). Other users can request your full number.
                </span>
              </div>

              {formFields.professionalType === "business" && (
                <div>
                  <label className="block text-text-secondary font-semibold mb-1">Business Address</label>
                  <input
                    type="text"
                    name="businessAddress"
                    value={formFields.businessAddress}
                    onChange={handleChange}
                    placeholder="Connaught Place, New Delhi, Delhi"
                    className="w-full bg-surface border border-border p-3 rounded-xl outline-none text-text focus:border-primary focus:ring-2 focus:ring-primary/10 transition shadow-xs"
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-3.5 bg-surface/40 border border-border rounded-xl">
                <div>
                  <label className="block font-bold text-text text-[11px] sm:text-xs">Show Contact Info</label>
                  <span className="text-[9px] sm:text-[10px] text-text-muted">Display your contact details on your profile</span>
                </div>
                <input
                  type="checkbox"
                  name="showContactInfo"
                  checked={formFields.showContactInfo}
                  onChange={(e) => setFormFields((prev) => ({ ...prev, showContactInfo: e.target.checked }))}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-text-secondary font-semibold mb-1">Bio</label>
          <textarea
            name="bio"
            rows={3}
            value={formFields.bio}
            onChange={handleChange}
            className="w-full bg-surface border border-border p-3 rounded-xl outline-none text-text focus:border-primary focus:ring-2 focus:ring-primary/10 transition shadow-xs"
          />
        </div>

        {/* Account Privacy Toggle */}
        <div className="p-4 bg-surface/60 border border-border rounded-2xl space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <label className="block text-xs font-bold text-text">Private Account</label>
                <span className="text-[10px] text-text-muted">
                  {formFields.professionalType !== "personal"
                    ? "Professional accounts are public. Switch to personal mode to make your account private."
                    : "When your account is private, only accepted followers can view your posts and reels."}
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              name="accountType"
              disabled={formFields.professionalType !== "personal"}
              checked={formFields.accountType === "private"}
              onChange={(e) =>
                setFormFields((prev) => ({
                  ...prev,
                  accountType: e.target.checked ? "private" : "public",
                }))
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer disabled:opacity-40"
            />
          </div>
        </div>

        {/* Multiple Bio Links */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-text-secondary font-semibold">Multiple Bio Links</label>
            <button onClick={() => setShowAddLink(!showAddLink)} className="text-primary font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              Add Link
            </button>
          </div>

          {showAddLink && (
            <div className="p-3 bg-surface border border-border rounded-2xl space-y-2 animate-in fade-in duration-200 shadow-xs">
              <input
                type="text"
                placeholder="Link Title (e.g. Portfolio)"
                value={newLink.title}
                onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                className="w-full bg-surface-hover border border-border p-2.5 rounded-xl text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
              <input
                type="url"
                placeholder="URL (https://...)"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                className="w-full bg-surface-hover border border-border p-2.5 rounded-xl text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
              />
              <button onClick={handleAddLink} className="w-full py-2 bg-primary hover:bg-primary-hover font-bold rounded-xl text-white shadow-sm transition cursor-pointer">
                Add Bio Link
              </button>
            </div>
          )}

          <div className="space-y-2">
            {links.map((link, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-surface border border-border rounded-xl">
                <div className="flex items-center gap-2 truncate">
                  <Link2 className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="font-bold text-text truncate">{link.title || "Link"}</span>
                  <span className="text-text-muted truncate text-[11px]">{link.url}</span>
                </div>
                <button onClick={() => handleRemoveLink(idx)} className="p-1 text-text-muted hover:text-rose-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          onClick={handleEditProfile}
          disabled={isLoading}
          className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 font-bold text-xs rounded-xl hover:opacity-95 shadow transition flex items-center justify-center min-w-[100px]"
        >
          {isLoading ? <ClipLoader size={14} color="#fff" /> : "Save Profile"}
        </button>
      </div>
    </div>
  );

  const renderChangePasswordForm = () => (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-text">Change Password</h2>
        <p className="text-[11px] text-text-muted">Choose a strong, secure password containing letters, numbers, and special characters.</p>
      </div>
      <form onSubmit={handleChangePassword} className="space-y-4">
        <VybeInput
          id="currentPassword"
          label="Current Password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          isPassword
          showPassword={showCurrentPass}
          setShowPassword={setShowCurrentPass}
          required
        />
        <VybeInput
          id="newPassword"
          label="New Password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          isPassword
          showPassword={showNewPass}
          setShowPassword={setShowNewPass}
          required
        />
        <VybeInput
          id="confirmPassword"
          label="Confirm New Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          isPassword
          showPassword={showConfirmPass}
          setShowPassword={setShowConfirmPass}
          required
        />

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isChangingPass || !currentPassword || !newPassword || !confirmPassword}
            className="px-6 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-95 font-bold text-xs rounded-xl shadow transition flex items-center justify-center disabled:opacity-50 cursor-pointer text-text"
          >
            {isChangingPass ? <ClipLoader size={14} color="#fff" /> : "Update Password"}
          </button>
        </div>
      </form>
    </div>
  );

  const renderContentSuggestionsForm = () => (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-text">Suggested Content Preferences</h2>
        <p className="text-[11px] text-text-muted">Control explicit recommendations and adjust suggested feeds from reels and posts.</p>
      </div>

      {/* Sensitive Content Control */}
      <div className="space-y-2 pt-2">
        <label className="block text-text font-bold text-[13px]">Sensitive Content Filter</label>
        <p className="text-[11px] text-text-muted leading-tight mb-3">
          Choose how much sensitive content (like explicit, scary or violent suggestions) you want to see.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "low", label: "Less (Low)", desc: "Show fewer sensitive posts" },
            { id: "medium", label: "Standard (Medium)", desc: "Show standard posts" },
            { id: "high", label: "More (High)", desc: "Show more sensitive posts" },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFormFields(prev => ({ ...prev, sensitiveContentFilter: opt.id }))}
              className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer select-none ${
                formFields.sensitiveContentFilter === opt.id
                  ? "border-rose-500 bg-rose-500/5 shadow-sm font-bold"
                  : "border-border bg-surface hover:bg-surface-hover"
              }`}
            >
              <span className="font-bold text-text mb-0.5 text-[11px]">{opt.label}</span>
              <span className="text-[9px] text-text-muted leading-tight">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Snooze Suggested Posts */}
      <div className="flex items-center justify-between gap-4 p-4 bg-surface border border-border rounded-2xl">
        <div className="flex-1 min-w-0">
          <span className="block font-bold text-text text-[13px]">Snooze Suggested Posts</span>
          <span className="block text-[10px] text-text-muted mt-0.5 leading-tight">
            {formFields.snoozeSuggestedPosts 
              ? "Suggested content is snoozed in feed for 30 days." 
              : "Snooze suggested posts in your feed for 30 days."}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setFormFields(prev => ({ ...prev, snoozeSuggestedPosts: !prev.snoozeSuggestedPosts }))}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
            formFields.snoozeSuggestedPosts ? "bg-rose-600" : "bg-border-strong"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-text shadow ring-0 transition duration-200 ease-in-out ${
              formFields.snoozeSuggestedPosts ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          onClick={handleEditProfile}
          disabled={isLoading}
          className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-600 font-bold text-xs rounded-xl hover:opacity-95 shadow transition flex items-center justify-center min-w-[100px]"
        >
          {isLoading ? <ClipLoader size={14} color="#fff" /> : "Save Preferences"}
        </button>
      </div>
    </div>
  );

  const renderAppearanceForm = () => (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-text">Theme & Color Palette</h2>
        <p className="text-[11px] text-text-muted">Choose your preferred style for the interface. Changes apply instantly.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { id: "light", label: "Light", desc: "Classic light look" },
          { id: "dark", label: "Dark", desc: "Sleek dark look" },
          { id: "system", label: "System", desc: "Device match" },
        ].map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer select-none ${
              theme === opt.id
                ? "border-rose-500 bg-rose-500/5 shadow-sm font-bold"
                : "border-border bg-surface hover:bg-surface-hover"
            }`}
          >
            <span className="font-bold text-text mb-0.5 text-[11px]">{opt.label}</span>
            <span className="text-[9px] text-text-muted leading-tight">{opt.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const getActiveTabContent = (tabId) => {
    switch (tabId) {
      case "profile":
        return renderEditProfileForm();
      case "password":
        return renderChangePasswordForm();
      case "suggestions":
        return renderContentSuggestionsForm();
      case "appearance":
        return renderAppearanceForm();
      default:
        return renderEditProfileForm();
    }
  };

  return (
    <div className="w-full min-h-screen bg-bg text-text p-4 md:p-8 max-w-5xl mx-auto space-y-6 select-none animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <button onClick={() => navigate(-1)} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer">
          <MdOutlineKeyboardBackspace className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-black tracking-wider uppercase bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 bg-clip-text text-transparent">Settings & Preferences</h1>
        <div className="w-10 h-10" />
      </div>

      {/* Settings Grid Panel */}
      <div className="flex flex-col md:flex-row min-h-[500px] border border-border bg-surface rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Desktop Sidebar & Mobile Menu List */}
        <div className={`w-full md:w-64 border-r-0 md:border-r border-b md:border-b-0 border-border p-4 space-y-1 bg-surface-hover/10 shrink-0 ${
          activeMobileTab !== null ? "hidden md:block" : "block"
        }`}>
          <p className="px-3.5 py-2 text-[10px] font-black text-text-muted uppercase tracking-widest">Account Settings</p>
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setActiveMobileTab(tab.id);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-pink-500/10 to-rose-600/10 text-rose-500 border border-rose-500/20"
                  : "text-text-secondary hover:bg-surface hover:text-text border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={activeTab === tab.id ? "text-rose-500" : "text-text-secondary"}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted/60 md:hidden" />
            </button>
          ))}
        </div>

        {/* Content Pane */}
        <div className={`flex-1 p-6 md:p-8 space-y-6 bg-surface/40 backdrop-blur-xl ${
          activeMobileTab === null ? "hidden md:block" : "block"
        }`}>
          {/* Mobile Back to Settings Menu link */}
          {activeMobileTab !== null && (
            <button
              onClick={() => setActiveMobileTab(null)}
              className="flex items-center gap-2 text-rose-500 font-bold text-xs hover:underline mb-4 md:hidden"
            >
              <MdOutlineKeyboardBackspace className="w-4 h-4" />
              <span>Back to Settings</span>
            </button>
          )}

          {getActiveTabContent(activeTab)}
        </div>

      </div>
    </div>
  );
};

export default EditProfile;
