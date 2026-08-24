import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  MessageSquare,
  Film,
  Grid,
  Radio,
  User,
  Check,
  X,
  Loader2,
  Eye,
  Sparkles,
  Search,
  Download,
  Flame,
} from "lucide-react";
import api from "../lib/api";
import { toast } from "../lib/toast";
import { useAdminSocket } from "../context/AdminSocketContext";
import ConfirmModal from "../components/ConfirmModal";

export const ContentModerator = () => {
  const { socket } = useAdminSocket();
  const [activeTab, setActiveTab] = useState("queue"); // "queue", "resolved", "ai-logs"
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // AI Moderation Logs state
  const [aiLogs, setAiLogs] = useState([]);
  const [aiLogsLoading, setAiLogsLoading] = useState(false);

  // Selected reports for batch operations
  const [selectedIds, setSelectedIds] = useState([]);

  // Inspection Drawer & Modal State
  const [inspectingReport, setInspectingReport] = useState(null);
  const [resolutionAction, setResolutionAction] = useState("content_deleted");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get("/reports", {
        params: {
          status: statusFilter,
          targetType: typeFilter,
          page,
          limit: 15,
        },
      });
      if (res.data?.success) {
        setReports(res.data.reports || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch {
      toast.error("Failed to load moderation reports.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAiLogs = async () => {
    try {
      setAiLogsLoading(true);
      const res = await api.get("/moderation-logs");
      if (res.data?.success) {
        setAiLogs(res.data.logs || []);
      }
    } catch {
      toast.error("Failed to load automated moderation scans.");
    } finally {
      setAiLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "ai-logs") {
      fetchAiLogs();
    } else {
      fetchReports();
    }
  }, [statusFilter, typeFilter, page, activeTab]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewReport = (newReport) => {
      if (statusFilter === "pending" || statusFilter === "all") {
        setReports((prev) => [newReport, ...prev]);
      }
    };

    const handleResolved = ({ reportId }) => {
      setReports((prev) => prev.filter((r) => r._id !== reportId));
      if (inspectingReport?._id === reportId) {
        setInspectingReport(null);
      }
    };

    socket.on("report:new", handleNewReport);
    socket.on("report:resolved", handleResolved);

    return () => {
      socket.off("report:new", handleNewReport);
      socket.off("report:resolved", handleResolved);
    };
  }, [socket, statusFilter, inspectingReport]);

  const handleInspect = (report) => {
    setInspectingReport(report);
    setResolutionAction("content_deleted");
    setResolutionNotes("");
  };

  const handleConfirmResolution = async (e) => {
    e.preventDefault();
    if (!inspectingReport) return;

    try {
      setResolving(true);
      const res = await api.post(`/reports/${inspectingReport._id}/resolve`, {
        action: resolutionAction,
        resolutionNotes: resolutionNotes.trim(),
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setInspectingReport(null);
        fetchReports();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resolve report.");
    } finally {
      setResolving(false);
    }
  };

  // Confirm Dialog State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, title: "", message: "" });

  const executeBulkAction = async (action) => {
    try {
      const res = await api.post("/reports/bulk-resolve", {
        reportIds: selectedIds,
        action,
        resolutionNotes: `Bulk action performed via SRT desk`,
      });

      if (res.data?.success) {
        toast.success(res.data.message);
        setSelectedIds([]);
        fetchReports();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk resolution failed.");
    } finally {
      setConfirmModal({ isOpen: false, action: null, title: "", message: "" });
    }
  };

  const handleBulkAction = (action) => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      action,
      title: action === "content_deleted" ? "Bulk Take-Down Content" : "Bulk Dismiss Reports",
      message: `Are you sure you want to execute '${action === "content_deleted" ? "Take Down & Delete" : "Dismiss"}' on ${selectedIds.length} selected incidents? This action will be audited.`,
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === reports.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(reports.map((r) => r._id));
    }
  };

  const toggleSelectId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    if (reports.length === 0) {
      toast.error("No reports to export.");
      return;
    }
    const headers = ["ID", "TargetType", "Reason", "Status", "ReportedUser", "Reporter", "CreatedAt"];
    const rows = reports.map((r) => [
      r._id,
      r.targetType,
      r.reason,
      r.status,
      r.reportedUser?.userName || "Unknown",
      r.reporter?.userName || "Unknown",
      new Date(r.createdAt).toISOString(),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vybe_moderation_reports_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getReasonPill = (reason) => {
    switch (reason) {
      case "hate_speech":
      case "violence":
      case "suicide_self_harm":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "nudity":
      case "harassment":
      case "copyright":
      case "fraud":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "reel":
        return <Film className="w-4 h-4 text-purple-400" />;
      case "post":
        return <Grid className="w-4 h-4 text-rose-400" />;
      case "story":
        return <Flame className="w-4 h-4 text-amber-400" />;
      case "liveStream":
        return <Radio className="w-4 h-4 text-emerald-400" />;
      case "user":
        return <User className="w-4 h-4 text-sky-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-zinc-400" />;
    }
  };

  const filteredReports = reports.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.reportedUser?.userName?.toLowerCase().includes(q) ||
      r.reporter?.userName?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold uppercase tracking-wider">
              SRT Command Desk
            </span>
            <span className="text-zinc-500 text-xs">•</span>
            <span className="text-zinc-400 text-xs">Trust & Safety Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Single Review Tool (SRT)
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time incident queue, content triage, sensitive blur flags & account sanctions.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-bold border border-white/[0.08] transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Tabs — Fluid Horizontal Scroll */}
      <div className="flex gap-2 border-b border-white/[0.08] pb-1 overflow-x-auto hide-scrollbar whitespace-nowrap">
        <button
          onClick={() => { setActiveTab("queue"); setStatusFilter("pending"); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            activeTab === "queue"
              ? "bg-white/[0.06] text-white border-b-2 border-rose-500"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Active Incident Queue</span>
          {pagination.total > 0 && activeTab === "queue" && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black">
              {pagination.total}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab("resolved"); setStatusFilter("resolved"); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            activeTab === "resolved"
              ? "bg-white/[0.06] text-white border-b-2 border-emerald-500"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Resolved Triage Archive</span>
        </button>

        <button
          onClick={() => setActiveTab("ai-logs")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition cursor-pointer shrink-0 ${
            activeTab === "ai-logs"
              ? "bg-white/[0.06] text-white border-b-2 border-purple-500"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>AI Automated Safety Logs</span>
        </button>
      </div>

      {activeTab !== "ai-logs" ? (
        <>
          {/* Filters & Search Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by user, reporter, reason..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50"
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
              <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
                {["all", "post", "reel", "story", "liveStream", "user"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition cursor-pointer ${
                      typeFilter === t ? "bg-white/[0.1] text-white" : "text-zinc-400 hover:text-zinc-300"
                    }`}
                  >
                    {t === "all" ? "All Content" : t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bulk Selection Action Bar (when items selected) */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-3 px-4 rounded-2xl bg-gradient-to-r from-rose-950/60 to-purple-950/60 border border-rose-500/30 shadow-xl animate-fade-in-up">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                <span className="text-xs font-bold text-white">
                  {selectedIds.length} incident{selectedIds.length > 1 ? "s" : ""} selected for batch action
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction("dismiss")}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 text-xs font-bold border border-white/10 transition cursor-pointer"
                >
                  Bulk Dismiss
                </button>
                <button
                  onClick={() => handleBulkAction("content_deleted")}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bulk Take-Down</span>
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Reports Grid */}
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
              <p className="text-xs text-zinc-500 font-bold">Streaming Incident Queue...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="p-16 text-center space-y-3 rounded-3xl bg-[#0d111a] border border-white/[0.06]">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white font-['Outfit']">All Clear — No Pending Incidents</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                The Trust & Safety report queue has been fully reviewed. New incoming user reports will populate here in real-time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((report) => {
                const isSelected = selectedIds.includes(report._id);
                return (
                  <div
                    key={report._id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative group ${
                      isSelected
                        ? "bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-500/10"
                        : "bg-[#0d111a] border-white/[0.06] hover:border-white/[0.15]"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Top bar: Select Checkbox, Type & Reason */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectId(report._id)}
                            className="rounded border-white/20 text-rose-500 focus:ring-0 cursor-pointer"
                          />
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-bold text-zinc-300">
                            {getTypeIcon(report.targetType)}
                            <span className="capitalize">{report.targetType}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getReasonPill(report.reason)}`}>
                          {report.reason?.replace(/_/g, " ")}
                        </span>
                      </div>

                      {/* Content Preview Snippet */}
                      <div className="p-3 rounded-xl bg-black/40 border border-white/[0.04] space-y-2">
                        {report.targetContent?.media?.url ? (
                          <div className="relative h-28 rounded-lg overflow-hidden bg-zinc-900 flex items-center justify-center">
                            {report.targetType === "reel" ? (
                              <video
                                src={report.targetContent.media.url}
                                className="w-full h-full object-cover"
                                muted
                              />
                            ) : (
                              <img
                                src={report.targetContent.media.url}
                                alt="Reported Media"
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-2">
                              <p className="text-[10px] text-zinc-200 line-clamp-1">
                                {report.targetContent.caption || "No caption text"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-300 italic line-clamp-2">
                            "{report.description || report.targetContent?.caption || "No extra description provided."}"
                          </p>
                        )}
                      </div>

                      {/* User Context: Reporter vs Reported User */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-white/[0.05]">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase">Reported User</p>
                          <p className="text-xs font-bold text-rose-300 truncate">
                            @{report.reportedUser?.userName || "unknown"}
                          </p>
                          {report.reportedUser?.strikes > 0 && (
                            <span className="text-[9px] font-bold text-amber-400">
                              ⚠️ {report.reportedUser.strikes} previous strike{report.reportedUser.strikes > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase">Filed By</p>
                          <p className="text-xs font-bold text-zinc-300 truncate">
                            @{report.reporter?.userName || "anonymous"}
                          </p>
                          <p className="text-[9px] text-zinc-500">
                            {new Date(report.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Review & Triage CTA */}
                    <button
                      onClick={() => handleInspect(report)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-purple-500/20 hover:from-rose-500/30 hover:to-purple-500/30 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Launch SRT Triage</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
              <p className="text-xs text-zinc-500">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total reports)
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] text-xs font-bold text-zinc-300 disabled:opacity-30 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] text-xs font-bold text-zinc-300 disabled:opacity-30 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* AI Automated Moderation Logs View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Automated computer vision & NLP content moderation scans executed at upload time.
            </p>
          </div>

          {aiLogsLoading ? (
            <div className="py-20 text-center text-xs text-zinc-500">Loading AI scans...</div>
          ) : aiLogs.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#0d111a] border border-white/[0.06] text-xs text-zinc-500">
              No automated moderation trigger logs recorded yet.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-[#0d111a]">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.03] text-zinc-400 font-bold border-b border-white/[0.06]">
                  <tr>
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Content Type</th>
                    <th className="p-3.5">Trigger Reason</th>
                    <th className="p-3.5">Confidence Score</th>
                    <th className="p-3.5">Automated Action</th>
                    <th className="p-3.5">Author</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {aiLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3.5 text-zinc-500 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-bold text-white capitalize">{log.contentType || "post"}</td>
                      <td className="p-3.5 text-rose-300 font-bold">{log.flaggedReason || "NSFW / Hate Speech"}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono font-bold text-[10px]">
                          {log.confidence ? `${Math.round(log.confidence * 100)}%` : "98.4%"}
                        </span>
                      </td>
                      <td className="p-3.5 text-zinc-300 capitalize">{log.actionTaken || "Flagged for review"}</td>
                      <td className="p-3.5 text-zinc-400">@{log.user?.userName || "unknown"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SRT Interactive Triage Inspection Modal */}
      {inspectingReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#0d111a] border border-rose-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white font-['Outfit']">
                    SRT Incident #{inspectingReport._id.slice(-6)}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Review reported media, analyze user risk dossier, and execute moderation sanctions.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectingReport(null)}
                className="p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Split Screen Preview vs Resolution Form */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Media & Context (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Reported Media Asset
                    </span>
                    <span className="text-xs font-bold text-rose-400 capitalize">
                      {inspectingReport.targetType}
                    </span>
                  </div>

                  {/* Render video or image */}
                  {inspectingReport.targetContent?.media?.url ? (
                    <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-[340px]">
                      {inspectingReport.targetType === "reel" ? (
                        <video
                          src={inspectingReport.targetContent.media.url}
                          controls
                          className="w-full max-h-[340px] object-contain rounded-lg"
                        />
                      ) : (
                        <img
                          src={inspectingReport.targetContent.media.url}
                          alt="Reported Asset"
                          className="w-full max-h-[340px] object-contain rounded-lg"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-zinc-500 bg-white/[0.02] rounded-xl">
                      Media already removed or text-only payload.
                    </div>
                  )}

                  {/* Caption & Metadata */}
                  {inspectingReport.targetContent?.caption && (
                    <div className="p-3 rounded-xl bg-white/[0.03] text-xs text-zinc-200">
                      <p className="font-bold text-zinc-400 text-[10px] uppercase mb-1">Author's Caption</p>
                      <p className="leading-relaxed">"{inspectingReport.targetContent.caption}"</p>
                    </div>
                  )}
                </div>

                {/* Reporter Accusation Box */}
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <p className="text-xs font-bold text-rose-300">
                      Violation Reported: {inspectingReport.reason?.replace(/_/g, " ")?.toUpperCase()}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-300">
                    "{inspectingReport.description || "The reporter indicated this content violates community guidelines."}"
                  </p>
                </div>
              </div>

              {/* Right Column: User Risk Dossier & Decision Matrix (5 cols) */}
              <div className="md:col-span-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Reported Author Profile Card */}
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Author Risk Dossier
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-rose-500 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
                        {inspectingReport.reportedUser?.profileImage?.url ? (
                          <img src={inspectingReport.reportedUser.profileImage.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          inspectingReport.reportedUser?.name?.charAt(0) || "U"
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">
                          {inspectingReport.reportedUser?.name}
                        </p>
                        <p className="text-xs text-zinc-400">@{inspectingReport.reportedUser?.userName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-white/[0.04]">
                      <div className="p-2 rounded-lg bg-white/[0.02]">
                        <span className="text-[10px] text-zinc-500 block">Total Strikes</span>
                        <span className="font-bold text-amber-400 text-sm">
                          {inspectingReport.reportedUser?.strikes || 0}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/[0.02]">
                        <span className="text-[10px] text-zinc-500 block">Account Status</span>
                        <span className="font-bold text-emerald-400 text-sm">
                          {inspectingReport.reportedUser?.isBanned ? "Banned" : "Active"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Decision Options */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Enforcement Action
                    </label>
                    <select
                      value={resolutionAction}
                      onChange={(e) => setResolutionAction(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.1] rounded-xl text-xs text-white focus:outline-none focus:border-rose-500/50"
                    >
                      <option value="content_deleted" className="bg-[#0d111a]">Take Down Content (Delete Asset)</option>
                      <option value="user_warned" className="bg-[#0d111a]">Issue Formal Strike & Warning</option>
                      <option value="user_banned" className="bg-[#0d111a]">Suspend & Ban Creator Account</option>
                      <option value="dismiss" className="bg-[#0d111a]">Dismiss Incident (Within Guidelines)</option>
                    </select>
                  </div>

                  {/* Resolution Notes */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Internal Moderation Rationale
                    </label>
                    <textarea
                      rows={3}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Add reason for audit log..."
                      className="w-full p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50"
                    />
                  </div>
                </div>

                {/* Confirm Button */}
                <button
                  onClick={handleConfirmResolution}
                  disabled={resolving}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-purple-600 hover:brightness-110 text-white font-bold text-xs shadow-xl shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {resolving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Execute Sanction Decision</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel="Execute Action"
        variant={confirmModal.action === "content_deleted" ? "danger" : "warning"}
        onConfirm={() => executeBulkAction(confirmModal.action)}
        onCancel={() => setConfirmModal({ isOpen: false, action: null, title: "", message: "" })}
      />
    </div>
  );
};

export default ContentModerator;
