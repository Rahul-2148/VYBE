import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FileText, UserCheck, ShieldQuestion, ArrowRight, Sparkles, User } from "lucide-react";

export const SupportDashboardView = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Support Hero */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-sky-950/60 via-cyan-950/40 to-blue-950/40 border border-sky-500/30 shadow-2xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Creator Identity & Support Desk</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-['Outfit']">
            User Support & Verification Hub
          </h1>
          <p className="text-xs md:text-sm text-zinc-300 max-w-2xl leading-relaxed">
            Inspect Government ID proof documents, validate creator categories, award official blue check badges, and help users resolve account access issues.
          </p>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 border border-sky-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Pending Blue Tick Requests</span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{stats?.pendingVerifications || 0}</div>
          <span className="text-[11px] text-sky-300 font-medium">Awaiting document inspection</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Verified Creators</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{stats?.totalVerifiedUsers || 0}</div>
          <span className="text-[11px] text-emerald-300 font-medium">Active badge holders</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-indigo-500/5 border border-indigo-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Total Accounts Assisted</span>
            <User className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{(stats?.totalUsers || 0).toLocaleString()}</div>
          <span className="text-[11px] text-indigo-300 font-medium">Registered community</span>
        </div>
      </div>

      {/* Action Tile */}
      <div className="p-6 rounded-3xl bg-[#0d111a] border border-white/10 shadow-xl flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">Review Pending Blue Check Documents</h3>
          <p className="text-xs text-zinc-400 mt-1">Inspect uploaded passports, national IDs, and driver's licenses.</p>
        </div>
        <Link
          to="/verifications"
          className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-sky-500/25"
        >
          <span>Open Verification Desk</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default SupportDashboardView;
