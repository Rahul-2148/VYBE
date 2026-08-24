import React, { useState, useEffect } from "react";
import {
  IndianRupee,
  TrendingUp,
  Users,
  CreditCard,
  Sparkles,
  ArrowUpRight,
  Check,
  X,
  Clock,
  Loader2,
  Download,
  Wallet,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import api from "../../lib/api";
import { toast } from "../../lib/toast";

export const FinanceDashboardView = () => {
  const [financeData, setFinanceData] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // "overview", "payouts", "creators"
  const [processingPayoutId, setProcessingPayoutId] = useState(null);

  const fetchFinance = async () => {
    try {
      setLoading(true);
      const [statsRes, payoutsRes] = await Promise.all([
        api.get("/finance-stats"),
        api.get("/finance/payouts").catch(() => ({ data: { payouts: [] } })),
      ]);

      if (statsRes.data?.success) {
        setFinanceData(statsRes.data);
      }
      if (payoutsRes.data?.success) {
        setPayouts(payoutsRes.data.payouts || []);
      }
    } catch {
      toast.error("Failed to load financial statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, []);

  const handleProcessPayout = async (monetizationId, payoutId, status) => {
    try {
      setProcessingPayoutId(payoutId);
      const res = await api.post(`/finance/payouts/${monetizationId}/${payoutId}/process`, {
        status,
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        fetchFinance();
      }
    } catch (err) {
      toast.error("Failed to update payout status.");
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const stats = financeData?.stats;

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Finance Hero */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-emerald-950/60 via-teal-950/40 to-cyan-950/40 border border-emerald-500/30 shadow-2xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Creator Economy & Revenue Studio</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Finance & Creator Monetization
          </h1>
          <p className="text-xs md:text-sm text-zinc-300 max-w-2xl leading-relaxed">
            Monitor gross creator earnings, subscription pools, withdrawal requests, and in-app advertisement revenue in Indian Rupees (INR ₹).
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Gross Creator Volume</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">
            ₹{(stats?.totalGrossRevenue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-300 font-medium">Platform creator earnings</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 border border-cyan-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Monetized Creators</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{stats?.totalMonetizedCreators || 0}</div>
          <span className="text-[11px] text-cyan-300 font-medium">Active verified partners</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-500/15 to-teal-500/5 border border-teal-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Active Subscribers</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{stats?.totalSubscribers || 0}</div>
          <span className="text-[11px] text-teal-300 font-medium">Supporter accounts</span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-indigo-500/5 border border-indigo-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-bold">
            <span>Running Campaigns</span>
            <CreditCard className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white font-['Outfit']">{stats?.totalCampaigns || 0}</div>
          <span className="text-[11px] text-indigo-300 font-medium">Sponsored creator ads</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-white/[0.08] pb-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "overview"
              ? "bg-white/[0.06] text-white border-b-2 border-emerald-500"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Top Earning Creators
        </button>
        <button
          onClick={() => setActiveTab("payouts")}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition cursor-pointer ${
            activeTab === "payouts"
              ? "bg-white/[0.06] text-white border-b-2 border-cyan-500"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Payouts & Withdrawal Queue
        </button>
      </div>

      {activeTab === "overview" ? (
        /* Top Creators Table */
        <div className="rounded-3xl bg-[#0d111a] border border-white/10 overflow-hidden shadow-xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white font-['Outfit']">Creator Monetization Leaderboard</h3>
          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Loading financial ledger...</div>
          ) : (!financeData?.monetizedCreators || financeData.monetizedCreators.length === 0) ? (
            <p className="text-xs text-zinc-500 italic py-8 text-center">No creator subscriptions recorded yet.</p>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {financeData.monetizedCreators.map((m) => (
                <div key={m._id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-white overflow-hidden">
                      {m.creator?.profileImage?.url ? (
                        <img src={m.creator.profileImage.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        m.creator?.name?.charAt(0) || "C"
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{m.creator?.name}</p>
                      <p className="text-[11px] text-zinc-400">@{m.creator?.userName}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400">₹{(m.totalEarnings || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    <p className="text-[10px] text-zinc-500">{m.subscribers?.length || 0} active subscribers</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Payouts Queue */
        <div className="rounded-3xl bg-[#0d111a] border border-white/10 overflow-hidden shadow-xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white font-['Outfit']">Creator Payout Withdrawal Requests</h3>
          {payouts.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">No pending payout withdrawal requests.</div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {payouts.map((p) => (
                <div key={p._id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">@{p.creator?.userName || "creator"}</p>
                    <p className="text-[11px] text-zinc-400">Requested: ₹{p.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })} • {new Date(p.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.status === "paid"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FinanceDashboardView;
