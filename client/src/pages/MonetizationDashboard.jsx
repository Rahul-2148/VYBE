import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  IndianRupee,
  Gift,
  Loader2,
  Megaphone,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { toast } from "sonner";
import AdManagerModal from "../components/AdManagerModal";
import api from "../lib/axios";
import { setUserData } from "../redux/features/userSlice";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const MonetizationDashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  const [monetization, setMonetization] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdModal, setShowAdModal] = useState(false);
  const [buyingPlanId, setBuyingPlanId] = useState(null);
  const [activeTab, setActiveTab] = useState("verification");
  const [withdrawing, setWithdrawing] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const handleWithdraw = async () => {
    try {
      setWithdrawing(true);
      const res = await api.post("/monetization/payout");
      if (res.data.success) {
        toast.success(res.data.message || "Payout processed successfully!");
        setMonetization(res.data.monetization);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to process withdrawal.");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSimulateEarning = async (type, amount) => {
    try {
      setSimulating(true);
      const res = await api.post("/monetization/test/simulate-earning", { type, amount });
      if (res.data.success) {
        toast.success(res.data.message || "Earning simulated!");
        setMonetization(res.data.monetization);
      }
    } catch {
      toast.error("Failed to simulate earning.");
    } finally {
      setSimulating(false);
    }
  };
  const fetchMonetizationData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/monetization/dashboard");
      if (res.data.success) {
        setMonetization(res.data.monetization);
        setCampaigns(res.data.campaigns || []);
      }
    } catch {
      toast.error("Failed to load monetization status.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPremiumPlans = async () => {
    try {
      const res = await api.get("/monetization/premium/plans");
      if (res.data?.success) {
        setPlans(res.data.plans || []);
      }
    } catch {
      toast.error("Failed to load premium plans.");
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      await fetchMonetizationData();
      if (!active) return;
      await fetchPremiumPlans();
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleBuyPlan = async (plan) => {
    try {
      setBuyingPlanId(plan.id);

      const orderRes = await api.post("/monetization/premium/order", { planId: plan.id });
      if (!orderRes.data?.success) {
        toast.error(orderRes.data?.message || "Could not create payment order.");
        return;
      }

      const { order, keyId, isMock } = orderRes.data;
      const user = userData?.user || userData;

      if (isMock || keyId === "mock_key_id") {
        toast.success("Development Mode: Simulating secure checkout...");
        // Directly call verification after a brief delay
        setTimeout(async () => {
          try {
            const verifyRes = await api.post("/monetization/premium/verify", {
              razorpay_order_id: order.id,
              razorpay_payment_id: `mock_pay_${Date.now()}`,
              razorpay_signature: "mock_signature",
              planId: plan.id,
            });

            if (verifyRes.data?.success) {
              toast.success("Premium membership activated successfully!");
              if (verifyRes.data.user) {
                dispatch(setUserData(verifyRes.data.user));
              }
              await fetchMonetizationData();
            }
          } catch (err) {
            console.warn("Simulated payment verification failed:", err);
            toast.error("Simulated payment verification failed.");
          } finally {
            setBuyingPlanId(null);
          }
        }, 1000);
        return;
      }

      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        toast.error("Razorpay checkout failed to load.");
        return;
      }

      const razorpay = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "VYBE Premium",
        description: `${plan.name} subscription`,
        order_id: order.id,
        prefill: {
          name: user?.name || "VYBE User",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#E1306C",
        },
        handler: async (response) => {
          try {
            const verifyRes = await api.post("/monetization/premium/verify", {
              ...response,
              planId: plan.id,
            });

            if (verifyRes.data?.success) {
              toast.success("Premium activated successfully.");
              if (verifyRes.data.user) {
                dispatch(setUserData(verifyRes.data.user));
              }
              await fetchMonetizationData();
            }
          } catch {
            toast.error("Payment verification failed.");
          }
        },
        modal: {
          ondismiss: () => setBuyingPlanId(null),
        },
      });

      razorpay.on("payment.failed", () => {
        toast.error("Payment failed. Try again.");
      });

      razorpay.open();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Unable to start checkout.");
    } finally {
      setBuyingPlanId(null);
    }
  };

  const activePremium = useMemo(() => {
    const verifiedUntil = userData?.user?.verifiedUntil || userData?.verifiedUntil;
    const isVerified = Boolean(userData?.user?.isVerified || userData?.isVerified);

    return {
      isVerified,
      verifiedPlan: userData?.user?.verifiedPlan || userData?.verifiedPlan || null,
      verifiedUntil,
    };
  }, [userData]);

  const planCards = plans.length > 0 ? plans : [];
  const tabs = [
    { id: "verification", label: "Verification", icon: ShieldCheck },
    { id: "benefits", label: "Benefits", icon: Star },
    { id: "ads", label: "Ads", icon: Megaphone },
  ];

  const verificationCopy = activePremium.isVerified
    ? "Your blue tick is active and the badge state is synced from the backend source of truth."
    : "Get the exact Instagram-style verified badge with a secure Razorpay checkout and server-side verification.";
  const verificationBadgeClass = activePremium.isVerified
    ? "border-blue-500/35 bg-blue-500/15 text-blue-300"
    : "border-border-strong bg-surface-hover text-text";

  return (
    <div className="mx-auto min-h-screen max-w-6xl space-y-6 bg-bg p-4 pb-24 text-text md:p-8">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="rounded-full p-2 text-text-secondary transition hover:bg-surface-hover hover:text-text">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Creator Monetization</h1>
            <p className="text-xs text-text-secondary">Blue tick verification, premium benefits, and sponsored ads in one dashboard.</p>
          </div>
        </div>

        <button
          onClick={() => setShowAdModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 px-4 py-2 text-xs font-bold shadow-lg transition hover:opacity-95"
        >
          <Plus className="h-4 w-4" />
          <span>Launch Sponsored Ad</span>
        </button>
      </div>

      <div className="sticky top-3 z-20 rounded-[1.5rem] border border-border bg-surface-overlay p-2 backdrop-blur-xl shadow-2xl shadow-black/20">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-bold transition ${
                  isActive ? "border-rose-500/40 bg-rose-500/10 text-text" : "border-border bg-surface-inset/60 text-text-secondary hover:border-border-strong hover:text-text"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-text-muted">Loading monetization status...</div>
      ) : (
        <>
          {activeTab === "verification" && (
            <section className="grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
              <div className="overflow-hidden rounded-[2rem] border border-border bg-surface-inset shadow-2xl shadow-black/30">
                <div className="border-b border-border bg-[radial-gradient(circle_at_top,_rgba(225,48,108,0.18),_transparent_45%)] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-full border ${activePremium.isVerified ? "border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 text-blue-300 shadow-lg shadow-blue-500/10" : "border-border bg-surface text-text-muted"}`}>
                          <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-black tracking-tight text-text sm:text-2xl">Meta Verified</h2>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${verificationBadgeClass}`}>
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-text shadow-sm shadow-blue-500/20">
                                <CheckCircle2 className="h-2.5 w-2.5 fill-current" />
                              </span>
                              <span>{activePremium.isVerified ? "Verified" : "Not verified"}</span>
                            </span>
                          </div>
                          <p className="mt-1 max-w-xl text-xs leading-5 text-text-secondary">{verificationCopy}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-border bg-surface-inset/80 px-3 py-1 text-[10px] font-semibold text-text">Protected checkout</span>
                        <span className="rounded-full border border-border bg-surface-inset/80 px-3 py-1 text-[10px] font-semibold text-text">Server-side verification</span>
                        <span className="rounded-full border border-border bg-surface-inset/80 px-3 py-1 text-[10px] font-semibold text-text">Auto expiry rollback</span>
                      </div>
                    </div>

                    <div className="min-w-[180px] rounded-[1.5rem] border border-border bg-bg/50 p-4">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-text-secondary">
                        <span>Current plan</span>
                        <Clock3 className="h-3.5 w-3.5" />
                      </div>
                      <div className="mt-2 text-lg font-black text-text">{activePremium.verifiedPlan || "No active plan"}</div>
                      <div className="mt-1 text-xs text-text-secondary">
                        {activePremium.isVerified && activePremium.verifiedUntil
                          ? `Valid until ${moment(activePremium.verifiedUntil).format("MMM D, YYYY")}`
                          : "Choose a plan below to verify your account."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
                  <div className="rounded-3xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between text-blue-400">
                      <ShieldCheck className="h-5 w-5" />
                      <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-300">Badge</span>
                    </div>
                    <p className="mt-4 text-3xl font-black text-text">Blue</p>
                    <p className="mt-1 text-xs text-text-secondary">Exact badge-style presentation users expect from Instagram.</p>
                  </div>

                  <div className="rounded-3xl border border-border bg-surface p-4">
                    <div className="flex items-center justify-between text-purple-400">
                      <Users className="h-5 w-5" />
                      <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold text-purple-300">Creator</span>
                    </div>
                    <p className="mt-4 text-3xl font-black text-text">{monetization?.subscribers?.length || 0}</p>
                    <p className="mt-1 text-xs text-text-secondary">Active subscriptions</p>
                  </div>

                  <div className="rounded-3xl border border-border bg-surface p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-emerald-400">
                        <IndianRupee className="h-5 w-5" />
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">Payout</span>
                      </div>
                      <p className="mt-4 text-3xl font-black text-text">₹{monetization?.totalEarnings?.toFixed(2) || "0.00"}</p>
                      <p className="mt-1 text-xs text-text-secondary">Monetization balance</p>
                    </div>
                    {monetization?.totalEarnings > 0 && (
                      <button
                        onClick={handleWithdraw}
                        disabled={withdrawing}
                        className="mt-3 w-full bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer"
                      >
                        {withdrawing ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : "Withdraw earnings"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Payout History */}
                <div className="rounded-[2rem] border border-border bg-surface-inset p-5 shadow-2xl mt-4">
                  <h3 className="text-sm font-bold text-text">Payout history</h3>
                  <p className="text-[11px] text-text-secondary mt-0.5">Track your withdrawn earnings and transaction transfers.</p>

                  <div className="mt-4 space-y-2">
                    {!monetization?.payoutHistory || monetization.payoutHistory.length === 0 ? (
                      <div className="py-6 text-center text-xs text-text-muted bg-surface/30 border border-border/50 rounded-2xl">
                        No payout transactions recorded yet.
                      </div>
                    ) : (
                      monetization.payoutHistory.map((payout, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border">
                          <div>
                            <p className="text-[11px] font-bold text-text">Payout processed</p>
                            <p className="text-[9px] text-text-muted">{moment(payout.date).format("MMM D, YYYY · h:mm a")}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-emerald-400">₹{payout.amount.toFixed(2)}</p>
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-300 capitalize">{payout.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Monetization Terms & Eligibility */}
                <div className="rounded-[2rem] border border-border bg-surface-inset p-5 shadow-2xl mt-4 space-y-4 text-left">
                  <div>
                    <h3 className="text-sm font-bold text-text">Eligibility & Terms</h3>
                    <p className="text-[11px] text-text-secondary mt-0.5 font-medium">Understand your monetization criteria and payouts revenue model.</p>
                  </div>

                  {/* Criteria Checklist */}
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider">Eligibility Checklist</p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-semibold">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>18+ Years Old</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>India Region</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>No Content Strikes</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>Active 30+ Days</span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Model terms */}
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider">Revenue Breakdown</p>
                    <ul className="space-y-1.5 text-[11px] text-text-secondary list-disc pl-4 font-medium">
                      <li>
                        <strong className="text-text">Creator Subscriptions</strong>: You receive <span className="text-purple-400 font-bold">70%</span> of monthly payments from your subscribers.
                      </li>
                      <li>
                        <strong className="text-text">Gifts & Tips</strong>: Creators keep <span className="text-pink-500 font-bold">80%</span> of digital tips sent to their posts or loop cards.
                      </li>
                      <li>
                        <strong className="text-text">Sponsored Ad Shares</strong>: Earning share is credited per click (₹0.17) and view (₹0.05) on ads served under your creator feed.
                      </li>
                    </ul>
                  </div>

                  {/* Payout policies */}
                  <div className="rounded-xl bg-surface p-3 text-[10px] text-text-muted border border-border font-medium">
                    <strong className="text-text">Payout Terms: </strong>
                    Minimum payout threshold is ₹100. Processed withdrawals are verified and deposited to registered accounts in 3-5 business days.
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-[2rem] border border-border bg-gradient-to-br from-card to-background-secondary p-5 shadow-2xl shadow-black/30 sm:p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] border border-rose-500/25 bg-rose-500/15 text-rose-400">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text">Verification plans</h3>
                      <p className="text-xs text-text-secondary">Simple monthly plans with premium and blue-tick options.</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {planCards.map((plan) => (
                      <div key={plan.id} className="rounded-[1.5rem] border border-border bg-surface-inset/85 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-bold text-text">{plan.name}</h4>
                              {plan.verified && <span className="rounded-full border border-blue-500/25 bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-300">Blue tick</span>}
                            </div>
                            <p className="mt-1 text-xs text-text-secondary">Instagram-style verified account package</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-text">₹{plan.amount}</div>
                            <div className="text-[10px] text-text-muted">/ month</div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {(plan.benefits || []).map((benefit) => (
                            <span key={benefit} className="rounded-full border border-border bg-bg px-2.5 py-1 text-[10px] font-semibold text-text">
                              {benefit}
                            </span>
                          ))}
                        </div>

                        {activePremium.verifiedPlan === plan.id || (plan.verified && activePremium.isVerified) ? (
                          <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 px-4 py-3 text-sm font-bold text-emerald-400 select-none">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Active Subscription</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleBuyPlan(plan)}
                            disabled={buyingPlanId === plan.id}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 px-4 py-3 text-sm font-bold text-text transition hover:opacity-95 disabled:opacity-70 cursor-pointer"
                          >
                            {buyingPlanId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            <span>{plan.verified ? "Buy Blue Tick" : `Buy ${plan.name}`}</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sandbox Testing Controls */}
                <div className="rounded-[2rem] border border-border bg-surface-inset p-5 shadow-2xl">
                  <h3 className="text-sm font-bold text-text flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-rose-500 animate-pulse" />
                    <span>Sandbox testing controls</span>
                  </h3>
                  <p className="text-[11px] text-text-secondary mt-1">Simulate earnings from gifts or subscriber payments to watch your balance increase in real time.</p>
                  
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSimulateEarning("gift", 250)}
                      disabled={simulating}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface hover:bg-surface-hover border border-border transition cursor-pointer text-center group"
                    >
                      <Gift className="h-5 w-5 text-rose-400 group-hover:scale-110 transition" />
                      <span className="text-[11px] font-bold text-text mt-1.5">Simulate gift</span>
                      <span className="text-[9px] text-text-muted mt-0.5">+₹250.00</span>
                    </button>

                    <button
                      onClick={() => handleSimulateEarning("subscriber", 499)}
                      disabled={simulating}
                      className="flex flex-col items-center justify-center p-3 rounded-2xl bg-surface hover:bg-surface-hover border border-border transition cursor-pointer text-center group"
                    >
                      <Users className="h-5 w-5 text-purple-400 group-hover:scale-110 transition" />
                      <span className="text-[11px] font-bold text-text mt-1.5">Simulate sub</span>
                      <span className="text-[9px] text-text-muted mt-0.5">+₹499.00</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "benefits" && (
            <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[2rem] border border-border bg-surface-inset p-5 shadow-2xl shadow-black/30 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] border border-rose-500/25 bg-rose-500/15 text-rose-400">
                    <Star className="h-6 w-6 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text">Premium benefits</h3>
                    <p className="text-xs text-text-secondary">Everything inside the tab system is designed for mobile-first use.</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-border bg-surface p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Identity</p>
                    <p className="mt-2 text-sm font-semibold text-text">Verified badge, profile trust, and the exact social proof look.</p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Support</p>
                    <p className="mt-2 text-sm font-semibold text-text">Priority support and premium account handling.</p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Discovery</p>
                    <p className="mt-2 text-sm font-semibold text-text">Priority ranking hooks and profile visibility upgrades.</p>
                  </div>
                  <div className="rounded-3xl border border-border bg-surface p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-text-muted">Trust</p>
                    <p className="mt-2 text-sm font-semibold text-text">Backend-verified payments with automatic rollback if unpaid.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-border bg-surface-inset p-5 shadow-2xl shadow-black/30 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-text">Plan catalog</h3>
                    <p className="text-xs text-text-secondary">Tap a plan in the verification tab to start checkout.</p>
                  </div>
                  <span className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold text-text">{planCards.length} plans</span>
                </div>

                <div className="mt-4 space-y-3">
                  {planCards.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-text">{plan.name}</span>
                          {plan.verified && <span className="rounded-full border border-blue-500/25 bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-300">Blue tick</span>}
                        </div>
                        <div className="mt-1 text-xs text-text-secondary">{plan.benefits?.length || 0} benefits included</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-text">₹{plan.amount}</div>
                        <div className="text-[10px] text-text-muted">/ month</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === "ads" && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-border bg-surface-inset p-5 shadow-2xl shadow-black/30 sm:p-6">
                <div>
                  <h3 className="text-lg font-bold text-text">Sponsored campaigns</h3>
                  <p className="text-xs text-text-secondary">Manage ads separately without mixing them into the blue-tick flow.</p>
                </div>

                <button
                  onClick={() => setShowAdModal(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 px-4 py-3 text-xs font-bold shadow-lg transition hover:opacity-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>Launch Sponsored Ad</span>
                </button>
              </div>

              <div className="space-y-3">
                {campaigns.length === 0 ? (
                  <div className="rounded-[2rem] border border-border bg-surface/50 py-12 text-center text-xs text-text-muted">
                    <Megaphone className="mx-auto mb-1 h-8 w-8 text-text-muted" />
                    <p className="font-bold text-text-secondary">No active ad campaigns</p>
                    <p>Launch your first sponsored campaign to reach millions across the feed.</p>
                  </div>
                ) : (
                  campaigns.map((camp) => (
                    <div key={camp._id} className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
                      <div className="flex items-center gap-3">
                        <img src={camp.mediaUrl} alt="" className="h-12 w-12 rounded-xl border border-border object-cover" />
                        <div>
                          <p className="text-sm font-bold text-text">{camp.title}</p>
                          <p className="text-xs text-text-secondary">
                            Budget: ₹{camp.budget} • Spent: ₹{camp.spent.toFixed(2)} • Clicks: {camp.clicks}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                          camp.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-surface-hover text-text-secondary"
                        }`}
                      >
                        {camp.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </>
      )}

      {showAdModal && (
        <AdManagerModal isOpen={showAdModal} onClose={() => setShowAdModal(false)} onCampaignCreated={() => fetchMonetizationData()} />
      )}
    </div>
  );
};

export default MonetizationDashboard;
