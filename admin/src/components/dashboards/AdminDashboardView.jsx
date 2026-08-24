import React from "react";
import { Link } from "react-router-dom";
import { Users, Film, ShieldAlert, CheckCircle2, Radio, BellRing, Sparkles, ArrowRight } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export const AdminDashboardView = ({ stats, growthData, recentReports }) => {
  return (
    <div className="space-y-6">
      {/* Platform Admin Hero */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-rose-950/50 via-pink-950/40 to-purple-950/40 border border-rose-500/30 shadow-2xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            <span>Platform Operations & User Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Platform Admin Hub
          </h1>
          <p className="text-xs md:text-sm text-zinc-300 max-w-2xl leading-relaxed">
            Manage daily platform health, oversee content publishing, handle user strikes and bans, review verification workflows, and broadcast announcements.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Total Community</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{(stats?.totalUsers || 0).toLocaleString()}</div>
          <span className="text-[11px] text-blue-300 font-medium">+{stats?.newSignupsToday || 0} today</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Posts & Reels</span>
            <Film className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{((stats?.totalPosts || 0) + (stats?.totalReels || 0)).toLocaleString()}</div>
          <span className="text-[11px] text-emerald-300 font-medium">Published content</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Reported Flags</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{stats?.pendingReports || 0}</div>
          <span className="text-[11px] text-amber-300 font-medium">Requires attention</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/15 to-rose-500/5 border border-rose-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Live Streams</span>
            <Radio className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{stats?.activeLiveStreams || 0}</div>
          <span className="text-[11px] text-rose-300 font-medium">Broadcasting now</span>
        </div>
      </div>

      {/* Main Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0d111a] border border-white/10 shadow-xl space-y-4">
          <h2 className="text-base font-bold text-white">Daily Community Activity</h2>
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminPostGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e1306c" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#e1306c" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#181d28",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: "#ffffff",
                  }}
                />
                <Area type="monotone" dataKey="posts" name="Posts" stroke="#e1306c" strokeWidth={2} fillOpacity={1} fill="url(#adminPostGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-[#0d111a] border border-white/10 shadow-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white">Admin Operations</h3>
            <Link
              to="/users"
              className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-white transition text-xs font-bold"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Search & Manage Users</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500" />
            </Link>

            <Link
              to="/broadcasts"
              className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-white transition text-xs font-bold"
            >
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-400" />
                <span>Send Push Broadcasts</span>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500" />
            </Link>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-zinc-400">
            ⚡ Platform Admin privileges active.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardView;
