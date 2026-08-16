import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Eye, Users, Heart, MessageCircle, Sparkles, BarChart2, Briefcase } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/features/userSlice";

export const ProfileInsightsModal = ({ isOpen, onClose, user, onAccountSwitched }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [currentType, setCurrentType] = useState(user?.professionalType || "personal");
  const [showPersonalWarning, setShowPersonalWarning] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (user?.professionalType) {
      setCurrentType(user.professionalType);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen) {
      fetchInsights();
    }
  }, [isOpen]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const res = await api.get("/user/insights");
      if (res.data.success) {
        setInsights(res.data.insights);
      }
    } catch {
      snackbar.error("Failed to load account insights.");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccountType = async (type) => {
    try {
      setSwitching(true);
      const category = type === "personal" ? "" : "Digital Creator";
      const res = await api.put("/user/switch-account-type", { 
        professionalType: type, 
        category,
        showCategory: type !== "personal"
      });
      if (res.data.success) {
        snackbar.success(res.data.message);
        setCurrentType(type);
        
        // Update Redux state with updated user data
        dispatch(setUserData({
          success: true,
          error: false,
          user: res.data.user
        }));

        if (onAccountSwitched) onAccountSwitched();
        fetchInsights();
      }
    } catch {
      snackbar.error("Failed to switch account mode.");
    } finally {
      setSwitching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-surface-overlay backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl bg-surface-inset border border-border rounded-3xl p-6 text-text shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center shadow-lg">
                <BarChart2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Professional Dashboard</h2>
                <p className="text-xs text-text-secondary">Account Reach & Performance Analytics</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface">
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="text-center py-16 text-text-muted">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Calculating account metrics...
            </div>
          ) : showPersonalWarning ? (
            <div className="py-6 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
                <X className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black">Switch to Personal Account?</h3>
                <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                  Professional dashboard insights, public contact email/phone, categories, and direction maps will be paused and hidden from your profile. They will not be deleted and can be restored if you switch back.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPersonalWarning(false)}
                  className="flex-1 py-3 rounded-xl border border-border text-xs font-bold hover:bg-surface transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleSwitchAccountType("personal");
                    setShowPersonalWarning(false);
                    onClose();
                  }}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 transition text-xs font-bold text-white shadow-lg rounded-xl"
                >
                  Yes, Switch Back
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Account Mode Selector */}
              <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Account Mode</p>
                <div className="grid grid-cols-3 gap-2">
                  {["personal", "creator", "business"].map((type) => (
                    <button
                      key={type}
                      disabled={switching}
                      onClick={() => {
                        if (type === "personal") {
                          setShowPersonalWarning(true);
                        } else {
                          handleSwitchAccountType(type);
                        }
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition capitalize ${
                        currentType === type
                          ? "bg-rose-600 text-white shadow"
                          : "bg-surface-inset border border-border text-text-secondary hover:text-text"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Creator Analytics Panel */}
              {currentType === "creator" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Weekly Reach Chart */}
                  <div className="p-5 bg-surface border border-border rounded-3xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Weekly Reach Trend</h4>
                        <p className="text-[10px] text-text-muted mt-0.5">Reach is up 18.4% compared to last week</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-rose-500">+{insights?.reachCount || 0}</p>
                        <p className="text-[9px] text-text-muted">Total Reached</p>
                      </div>
                    </div>
                    
                    {/* SVG Bar Chart */}
                    <div className="relative h-36 w-full flex items-end justify-between pt-4 px-2">
                      <div className="absolute inset-x-0 bottom-6 border-b border-border/40 pointer-events-none" />
                      <div className="absolute inset-x-0 bottom-20 border-b border-border/20 pointer-events-none" />
                      
                      {(() => {
                        const reachVal = insights?.reachCount || 0;
                        const mockDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                        const mockWeights = [0.12, 0.18, 0.15, 0.22, 0.16, 0.25, 0.12];
                        const chartBars = mockDays.map((day, idx) => {
                          const val = Math.round(reachVal * mockWeights[idx]) || Math.round(Math.random() * 20 + 5);
                          return { day, val };
                        });
                        const maxVal = Math.max(...chartBars.map(b => b.val), 10);
                        
                        return chartBars.map((bar, i) => {
                          const percent = Math.round((bar.val / maxVal) * 80) + 10;
                          return (
                            <div key={i} className="flex flex-col items-center gap-2 group flex-1">
                              <div className="relative w-7 sm:w-8 flex justify-center items-end h-24">
                                <div 
                                  style={{ height: `${percent}%` }}
                                  className="w-full bg-gradient-to-t from-rose-600 via-rose-500 to-purple-500 rounded-t-lg group-hover:from-rose-500 group-hover:to-purple-400 transition-all duration-300 shadow-md relative"
                                >
                                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface border border-border px-1.5 py-0.5 rounded text-[8px] font-bold text-text opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap shadow-xl z-20">
                                    {bar.val}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-text-secondary group-hover:text-text transition">
                                {bar.day}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-4 bg-surface/70 border border-border rounded-2xl space-y-1">
                      <div className="flex items-center justify-between text-rose-400">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-bold bg-rose-500/20 px-2 py-0.5 rounded-full">+18.4%</span>
                      </div>
                      <p className="text-xl font-extrabold text-text">{insights?.reachCount || 0}</p>
                      <p className="text-[11px] text-text-secondary font-medium">Accounts Reached</p>
                    </div>

                    <div className="p-4 bg-surface/70 border border-border rounded-2xl space-y-1">
                      <div className="flex items-center justify-between text-purple-400">
                        <Eye className="w-4 h-4" />
                        <span className="text-[10px] font-bold bg-purple-500/20 px-2 py-0.5 rounded-full">+24.1%</span>
                      </div>
                      <p className="text-xl font-extrabold text-text">{insights?.impressionsCount || 0}</p>
                      <p className="text-[11px] text-text-secondary font-medium">Impressions</p>
                    </div>

                    <div className="p-4 bg-surface/70 border border-border rounded-2xl space-y-1">
                      <div className="flex items-center justify-between text-emerald-400">
                        <Users className="w-4 h-4" />
                        <span className="text-[10px] font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full">+12.0%</span>
                      </div>
                      <p className="text-xl font-extrabold text-text">{insights?.profileVisits || 0}</p>
                      <p className="text-[11px] text-text-secondary font-medium">Profile Visits</p>
                    </div>
                  </div>

                  {/* Audience Breakdown */}
                  <div className="p-5 bg-surface border border-border rounded-3xl space-y-4">
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Audience Demographics</h4>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-pink-400">Female ({insights?.femalePercentage || 55}%)</span>
                        <span className="text-cyan-400">Male ({insights?.malePercentage || 45}%)</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-surface-inset overflow-hidden flex border border-border/40">
                        <div className="bg-gradient-to-r from-pink-500 to-rose-400 h-full transition-all duration-500" style={{ width: `${insights?.femalePercentage || 55}%` }} />
                        <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-500" style={{ width: `${insights?.malePercentage || 45}%` }} />
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <p className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">Top Cities</p>
                      {(insights?.locationsBreakdown || [
                        { city: "Delhi, India", percent: "38%" },
                        { city: "Mumbai, India", percent: "25%" },
                        { city: "Bangalore, India", percent: "20%" },
                        { city: "New York, USA", percent: "17%" }
                      ]).map((loc, idx) => (
                        <div key={idx} className="space-y-1 text-xs">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-text-secondary font-medium">{loc.city}</span>
                            <span className="text-text font-bold">{loc.percent}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-surface-inset overflow-hidden border border-border/30">
                            <div className="bg-gradient-to-r from-purple-500 to-rose-500 h-full rounded-full transition-all duration-500" style={{ width: loc.percent }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monetization Status widget */}
                  <div className="p-5 bg-gradient-to-r from-purple-500/10 to-rose-500/10 border border-purple-500/20 rounded-3xl space-y-3">
                    <div className="flex items-center gap-2 text-purple-400">
                      <Sparkles className="w-5 h-5" />
                      <h4 className="text-xs font-black uppercase tracking-wider">Monetization & Growth</h4>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-text-secondary font-medium">Subscription Fan Club status:</span>
                        <span className="text-emerald-400 font-bold">Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary font-medium">VYBE Creator Fund badge:</span>
                        <span className="text-rose-400 font-bold">Eligible</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Engagement */}
                  <div className="p-4 bg-surface border border-border rounded-2xl space-y-3">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Content Interactions</p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="flex items-center justify-between p-3 bg-surface-inset rounded-xl border border-border/80">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                          <span>Total Likes</span>
                        </div>
                        <span className="font-bold text-text">{insights?.totalLikes || 0}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-surface-inset rounded-xl border border-border/80">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-blue-400 fill-blue-400" />
                          <span>Comments</span>
                        </div>
                        <span className="font-bold text-text">{insights?.totalComments || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Business Analytics Panel */}
              {currentType === "business" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Profile Action Clicks Tracker */}
                  <div className="p-5 bg-surface border border-border rounded-3xl space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Profile Activity</h4>
                      <p className="text-[10px] text-text-muted mt-0.5">Real-time public action link taps on your profile</p>
                    </div>

                    <div className="space-y-3">
                      {[
                        { label: "Website Clicks", count: insights?.websiteTapsCount || 0, color: "from-blue-500 to-indigo-500" },
                        { label: "Contact Button Clicks", count: insights?.contactTapsCount || 0, color: "from-purple-500 to-pink-500" },
                        { label: "Directions Clicks", count: insights?.directionsTapsCount || 0, color: "from-emerald-500 to-teal-500" }
                      ].map((tap, idx) => {
                        const totalTaps = (insights?.websiteTapsCount || 0) + (insights?.contactTapsCount || 0) + (insights?.directionsTapsCount || 0) || 1;
                        const pct = Math.round((tap.count / totalTaps) * 100);
                        
                        return (
                          <div key={idx} className="space-y-1.5 text-xs">
                            <div className="flex justify-between font-bold">
                              <span className="text-text-secondary">{tap.label}</span>
                              <span className="text-text">{tap.count} ({pct}%)</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-surface-inset overflow-hidden border border-border/30">
                              <div 
                                className={`bg-gradient-to-r ${tap.color} h-full rounded-full transition-all duration-500`}
                                style={{ width: `${pct}%` }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reach/Visits Card */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-surface/70 border border-border rounded-2xl space-y-1">
                      <TrendingUp className="w-4 h-4 text-purple-400" />
                      <p className="text-xl font-extrabold text-text">{insights?.reachCount || 0}</p>
                      <p className="text-[11px] text-text-secondary font-medium">Business Reach</p>
                    </div>
                    <div className="p-4 bg-surface/70 border border-border rounded-2xl space-y-1">
                      <Eye className="w-4 h-4 text-teal-400" />
                      <p className="text-xl font-extrabold text-text">{insights?.profileVisits || 0}</p>
                      <p className="text-[11px] text-text-secondary font-medium">Profile Visits</p>
                    </div>
                  </div>

                  {/* Locations & City breakdown */}
                  <div className="p-5 bg-surface border border-border rounded-3xl space-y-4">
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Top Business Locations</h4>
                    
                    <div className="space-y-3">
                      {(insights?.locationsBreakdown || [
                        { city: "Delhi, India", percent: "38%" },
                        { city: "Mumbai, India", percent: "25%" },
                        { city: "Bangalore, India", percent: "20%" },
                        { city: "New York, USA", percent: "17%" }
                      ]).map((loc, idx) => (
                        <div key={idx} className="space-y-1 text-xs">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-text-secondary font-medium">{loc.city}</span>
                            <span className="text-text font-bold">{loc.percent}</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-surface-inset overflow-hidden border border-border/30">
                            <div className="bg-gradient-to-r from-teal-500 to-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: loc.percent }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProfileInsightsModal;
