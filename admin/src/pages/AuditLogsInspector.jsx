import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Shield,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import api from "../lib/api";
import { toast } from "../lib/toast";
import { useAdminSocket } from "../context/AdminSocketContext";

export const AuditLogsInspector = () => {
  const { socket } = useAdminSocket();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedDetails, setSelectedDetails] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get("/audit-logs", {
        params: {
          page,
          limit: 20,
          action: actionFilter,
          targetType: targetTypeFilter,
          search: search.trim(),
        },
      });
      if (res.data?.success) {
        setLogs(res.data.logs || []);
        setPagination(res.data.pagination || { total: 0, totalPages: 1 });
      }
    } catch {
      toast.error("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, targetTypeFilter]);

  // Real-time socket updates for live audit stream
  useEffect(() => {
    if (!socket) return;
    const handleNewAudit = (newLog) => {
      setLogs((prev) => [newLog, ...prev]);
    };
    socket.on("audit:new", handleNewAudit);
    return () => {
      socket.off("audit:new", handleNewAudit);
    };
  }, [socket]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleExportJSON = () => {
    if (logs.length === 0) return toast.error("No logs to export.");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const dl = document.createElement("a");
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `vybe_audit_trail_${Date.now()}.json`);
    dl.click();
  };

  const getActionPill = (action) => {
    if (action.includes("BAN") || action.includes("TERMINATED") || action.includes("DELETED")) {
      return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    }
    if (action.includes("VERIF") || action.includes("UNBAN")) {
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    }
    if (action.includes("ROLE") || action.includes("STAFF")) {
      return "bg-purple-500/20 text-purple-300 border-purple-500/40";
    }
    return "bg-zinc-800 text-zinc-300 border-zinc-700";
  };

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider">
              Compliance & Security
            </span>
            <span className="text-zinc-500 text-xs">•</span>
            <span className="text-zinc-400 text-xs">Immutable Ledger</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Security Audit Trail & Compliance
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Immutable cryptographic audit logs recording all staff operations, ban enforcements & privilege changes.
          </p>
        </div>

        <button
          onClick={handleExportJSON}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-bold border border-white/[0.08] transition cursor-pointer self-start"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit JSON</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action, target entity, or IP..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <select
            value={targetTypeFilter}
            onChange={(e) => {
              setTargetTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-zinc-300 focus:outline-none"
          >
            <option value="all" className="bg-[#0d111a]">All Target Entities</option>
            <option value="user" className="bg-[#0d111a]">Users</option>
            <option value="report" className="bg-[#0d111a]">Reports (SRT)</option>
            <option value="verification" className="bg-[#0d111a]">Verifications</option>
            <option value="liveStream" className="bg-[#0d111a]">Live Streams</option>
            <option value="staff" className="bg-[#0d111a]">Staff RBAC</option>
            <option value="system" className="bg-[#0d111a]">System Alerts</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden bg-[#0d111a]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] text-zinc-400 font-bold border-b border-white/[0.06]">
              <tr>
                <th className="p-3.5">Staff Admin</th>
                <th className="p-3.5">Action Executed</th>
                <th className="p-3.5">Target Entity</th>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-500">
                    No security audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-white/[0.02] transition font-mono">
                    {/* Admin */}
                    <td className="p-3.5 font-sans">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-rose-500 flex items-center justify-center font-bold text-white text-xs shrink-0 overflow-hidden">
                          {log.admin?.profileImage?.url ? (
                            <img src={log.admin.profileImage.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            log.admin?.name?.charAt(0) || "A"
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">@{log.admin?.userName || "admin"}</p>
                          <span className="text-[10px] text-zinc-500 capitalize">{log.admin?.role || "Staff"}</span>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${getActionPill(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="p-3.5 font-sans">
                      <span className="text-white font-bold block">{log.targetName || log.targetId || "N/A"}</span>
                      <span className="text-[10px] text-zinc-500 uppercase">{log.targetType}</span>
                    </td>

                    {/* IP */}
                    <td className="p-3.5 text-zinc-400 text-[11px] font-mono">
                      {log.ipAddress || "127.0.0.1"}
                    </td>

                    {/* Timestamp */}
                    <td className="p-3.5 text-zinc-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    {/* Details View */}
                    <td className="p-3.5 text-right font-sans">
                      <button
                        onClick={() => setSelectedDetails(log)}
                        className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition cursor-pointer"
                        title="View Context Payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-3.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
            <span>Page {pagination.page || 1} of {pagination.totalPages || 1} ({pagination.total} events)</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] font-bold text-zinc-300 disabled:opacity-30 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] font-bold text-zinc-300 disabled:opacity-30 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Payload Inspector Modal */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0d111a] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-black text-white font-['Outfit']">Audit Event Payload</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                className="p-1.5 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-bold uppercase text-[10px]">Action:</span>
                <span className="font-bold text-white font-mono">{selectedDetails.action}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-bold uppercase text-[10px]">Admin Operator:</span>
                <span className="font-bold text-zinc-300">@{selectedDetails.admin?.userName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 font-bold uppercase text-[10px]">IP & Host:</span>
                <span className="font-mono text-zinc-400">{selectedDetails.ipAddress}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase">Context Metadata JSON:</span>
              <pre className="p-3.5 rounded-2xl bg-zinc-950 border border-white/10 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56">
                {JSON.stringify(selectedDetails.details || {}, null, 2)}
              </pre>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDetails(null)}
              className="w-full py-3 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-2xl text-xs font-bold transition cursor-pointer"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsInspector;
