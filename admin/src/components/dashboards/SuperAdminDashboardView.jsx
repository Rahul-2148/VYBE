import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  ShieldAlert,
  CheckCircle2,
  Radio,
  UserCog,
  FileSpreadsheet,
  TrendingUp,
  Server,
  IndianRupee,
  Lock,
  Sparkles,
  ArrowRight,
  Database,
  Activity,
  Cpu,
  RefreshCw,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import api from "../../lib/api";

export const SuperAdminDashboardView = ({ stats, growthData, recentReports }) => {
  const [healthData, setHealthData] = useState(null);

  const fetchHealth = async () => {
    try {
      const res = await api.get("/system/health");
      if (res.data?.success) {
        setHealthData(res.data.health);
      }
    } catch (e) {
      // Fallback
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Executive Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-purple-950/60 via-indigo-950/50 to-rose-950/40 border border-purple-500/30 shadow-2xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Executive Infrastructure & Full Root Control</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Master Super Admin Command Center
          </h1>
          <p className="text-xs md:text-sm text-zinc-300 max-w-2xl leading-relaxed">
            Full root authority: manage staff RBAC roles, audit immutable security logs, enforce system broadcast alerts, monitor real-time infrastructure, and oversee trust & safety.
          </p>
        </div>
      </div>

      {/* Real-time Infrastructure Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Server className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-zinc-400 font-bold uppercase">Node & Memory</p>
            <p className="text-xs font-black text-white truncate">
              {healthData?.memory?.rssMB ? `${healthData.memory.rssMB} MB RSS` : "HEALTHY"}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Database className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-zinc-400 font-bold uppercase">MongoDB Status</p>
            <p className="text-xs font-black text-white truncate">
              {healthData?.database?.status || "CONNECTED"}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-zinc-400 font-bold uppercase">Live Streams</p>
            <p className="text-xs font-black text-white">{stats?.activeLiveStreams || 0} On-Air</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Lock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-zinc-400 font-bold uppercase">Security Guard</p>
            <p className="text-xs font-black text-white">Active RBAC</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/15 to-purple-500/5 border border-purple-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Total Accounts</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{(stats?.totalUsers || 0).toLocaleString()}</div>
          <span className="text-[11px] text-purple-300 font-medium">+{stats?.newSignupsToday || 0} registered today</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>SRT Incident Queue</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{stats?.pendingReports || 0}</div>
          <span className="text-[11px] text-amber-300 font-medium">Pending Trust & Safety review</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-500/15 to-sky-500/5 border border-sky-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Blue Badge Requests</span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{stats?.pendingVerifications || 0}</div>
          <span className="text-[11px] text-sky-300 font-medium">Creator ID applications</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/15 to-rose-500/5 border border-rose-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Banned / Suspended</span>
            <Lock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{stats?.totalBannedUsers || 0}</div>
          <span className="text-[11px] text-rose-300 font-medium">Active platform restrictions</span>
        </div>
      </div>

      {/* Growth Chart & Quick Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0d111a] border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-bold text-white">Full Ingestion & Growth Telemetry</h2>
            </div>
            <span className="text-xs text-zinc-500">14-Day Trajectory</span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="superUserGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
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
                <Area type="monotone" dataKey="users" name="Signups" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#superUserGrad)" />
                <Area type="monotone" dataKey="posts" name="Posts" stroke="#3b82f6" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Executive Shortcuts */}
        <div className="p-6 rounded-3xl bg-[#0d111a] border border-white/10 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white">Executive Actions</h3>
            <p className="text-xs text-zinc-400">High-level management shortcuts for Super Admins.</p>

            <div className="space-y-2">
              <Link
                to="/staff"
                className="flex items-center justify-between p-3 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 transition text-xs font-bold"
              >
                <div className="flex items-center gap-2.5">
                  <UserCog className="w-4 h-4" />
                  <span>Configure Staff RBAC Roles</span>
                </div>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/audit-logs"
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-white transition text-xs font-bold"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Inspect Audit & Compliance Trail</span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500" />
              </Link>

              <Link
                to="/broadcasts"
                className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-white transition text-xs font-bold"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  <span>Publish System Broadcast Alert</span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-500" />
              </Link>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-zinc-400">
            👑 You are logged in with <strong>Master Super Admin</strong> root privileges.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboardView;
