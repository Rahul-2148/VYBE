import React, { useState } from "react";
import {
  X, Calendar, Mail, Phone, MapPin, ShieldCheck, CheckCircle2,
  Copy, ExternalLink, Link2, Info,
  Send, Loader2
} from "lucide-react";
import { snackbar } from "../lib/snackbar";
import moment from "moment";
import VerifiedBadge from "./VerifiedBadge";
import dp from "../assets/dp3.png";
import api from "../lib/axios";

const AboutAccountModal = ({ isOpen, onClose, user, isOwnProfile = false }) => {
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  if (!isOpen || !user) return null;

  const avatarUrl = user.profileImage?.url || user.avatarUrl || dp;
  const joinedDate = user.createdAt ? moment(user.createdAt).format("MMMM YYYY") : "Recently";
  const displayEmail = user.contactEmail || user.email || "";
  const displayPhone = user.contactPhone || "";
  const displayLocation = user.location || user.businessAddress || "";

  // Mask phone number for privacy
  const getMaskedPhone = (phone) => {
    if (!phone) return null;
    const clean = phone.toString().replace(/[\s-]/g, "");
    if (clean.startsWith("+")) {
      const cc = clean.slice(0, 3);
      const lastDigits = clean.slice(-2);
      return `${cc} ••••• ••${lastDigits}`;
    }
    if (clean.length > 4) {
      const first2 = clean.slice(0, 2);
      const last2 = clean.slice(-2);
      return `${first2}••••••${last2}`;
    }
    return "••••••" + clean;
  };

  const handleCopy = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    snackbar.success(`${label} copied to clipboard!`);
  };

  const handleCopyProfileLink = () => {
    const link = `${window.location.origin}/profile/${user.userName}`;
    navigator.clipboard.writeText(link);
    snackbar.success("Profile link copied!");
  };

  const handleRequestContact = async () => {
    if (requested || requesting || isOwnProfile) return;
    try {
      setRequesting(true);
      const res = await api.post(`/user/request-contact/${user._id}`);
      if (res.data?.success) {
        setRequested(true);
        snackbar.success(res.data?.message || `Contact request sent to @${user.userName}`);
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to send contact request");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-rose-400" />
            <h2 className="text-base font-bold text-white">About This Account</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto hide-scrollbar">
          {/* User Hero Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="relative h-20 w-20 rounded-full border-2 border-zinc-700 overflow-hidden bg-zinc-900">
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex items-center gap-1.5 justify-center">
              <h3 className="text-lg font-bold text-white">{user.name}</h3>
              {user.isVerified && <VerifiedBadge size="sm" />}
            </div>
            <p className="text-xs text-rose-400 font-semibold">@{user.userName}</p>
            {user.category && (
              <span className="inline-block rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-300">
                {user.category}
              </span>
            )}
          </div>

          {/* Account Details List */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/40 divide-y divide-zinc-900/60 overflow-hidden">
            {/* Email Address */}
            {displayEmail && (
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      Email Address
                    </div>
                    <a
                      href={`mailto:${displayEmail}`}
                      className="text-sm font-medium text-white hover:text-rose-400 transition hover:underline break-all"
                    >
                      {displayEmail}
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(displayEmail, "Email")}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                  title="Copy Email"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Masked Phone Number & Request Contact Button */}
            <div className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mt-0.5">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                    <span>Mobile Number</span>
                    {displayPhone ? (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-zinc-800 text-amber-300 font-semibold border border-zinc-700">
                        Masked
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-zinc-800 text-zinc-400 font-semibold border border-zinc-700">
                        Private
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-white tracking-wider mt-0.5 font-mono">
                    {displayPhone ? getMaskedPhone(displayPhone) : "Not publicly listed"}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    {displayPhone
                      ? "Phone number is protected. Request to get full details in chat."
                      : "User hasn't listed a public phone. You can send a contact request."}
                  </p>
                </div>
              </div>

              {!isOwnProfile && (
                <button
                  onClick={handleRequestContact}
                  disabled={requested || requesting}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm mt-1 ${
                    requested
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
                      : "bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:opacity-90 active:scale-95"
                  }`}
                  title="Request user to share contact number"
                >
                  {requesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : requested ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Requested</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Request</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Date Joined */}
            <div className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Date Joined
                </div>
                <div className="text-sm font-semibold text-white">{joinedDate}</div>
              </div>
            </div>

            {/* Account Status / Verification */}
            <div className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Account Status
                </div>
                <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <span>{user.isVerified ? "Verified Account" : "Active Member"}</span>
                  {user.isVerified && <CheckCircle2 className="w-4 h-4 text-rose-400" />}
                </div>
              </div>
            </div>

            {/* Location / Based In */}
            {displayLocation && (
              <div className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    Location
                  </div>
                  <div className="text-sm font-semibold text-white">{displayLocation}</div>
                </div>
              </div>
            )}

            {/* External Links */}
            {user.links && user.links.length > 0 && (
              <div className="p-4 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Websites & Links ({user.links.length})</span>
                </div>
                <div className="space-y-1.5">
                  {user.links.map((lnk, idx) => (
                    <a
                      key={idx}
                      href={lnk.url?.startsWith("http") ? lnk.url : `https://${lnk.url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-rose-300 hover:text-white transition group"
                    >
                      <span className="truncate">{lnk.title || lnk.url}</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile Actions */}
          <div className="space-y-2">
            <button
              onClick={handleCopyProfileLink}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-white transition border border-zinc-800 cursor-pointer"
            >
              <Copy className="w-4 h-4 text-zinc-400" />
              <span>Copy Profile Link</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutAccountModal;
