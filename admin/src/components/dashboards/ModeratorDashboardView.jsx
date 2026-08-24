import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, CheckCircle2, Trash2, UserX, AlertTriangle, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export const ModeratorDashboardView = ({ stats, recentReports }) => {
  return (
    <div className="space-y-6">
      {/* Moderator SRT Hero */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-amber-950/60 via-orange-950/40 to-rose-950/40 border border-amber-500/30 shadow-2xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Support Response Tool (SRT) & Safety Operations</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Trust & Safety Moderation Workspace
          </h1>
          <p className="text-xs md:text-sm text-zinc-300 max-w-2xl leading-relaxed">
            Review reported content queues, triage hate speech, nudity, harassment, enforce community guidelines, issue strikes, and execute Cloudinary take-downs.
          </p>
        </div>
      </div>

      {/* Safety Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Pending Triage Queue</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{stats?.pendingReports || 0}</div>
          <span className="text-[11px] text-amber-300 font-medium">Community safety flags awaiting action</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/15 to-rose-500/5 border border-rose-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Banned Offenders</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{stats?.totalBannedUsers || 0}</div>
          <span className="text-[11px] text-rose-300 font-medium">Suspended for severe violations</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Live Streams Moderation</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{stats?.activeLiveStreams || 0}</div>
          <span className="text-[11px] text-emerald-300 font-medium">Live rooms subject to monitoring</span>
        </div>
      </div>

      {/* Triage Queue Quick Feed */}
      <div className="p-6 rounded-3xl bg-[#0d111a] border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Priority Cases for Rapid Decision</h2>
          </div>
          <Link
            to="/moderation"
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <span>Open Full SRT Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(!recentReports || recentReports.length === 0) ? (
            <div className="col-span-2 py-12 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-xs font-bold text-white">All Clear! No pending reports.</p>
            </div>
          ) : (
            recentReports.map((report) => (
              <div
                key={report._id}
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 hover:border-amber-500/30 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{report.targetType}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {report.reason.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 font-medium line-clamp-2">
                  {report.description || "No description provided."}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[11px] text-zinc-400">
                  <span>Reported by @{report.reporter?.userName || "anonymous"}</span>
                  <Link
                    to="/moderation"
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-bold hover:bg-amber-500/25 transition"
                  >
                    Decide Case
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ModeratorDashboardView;
