import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  User,
  Eye,
  Check,
  X,
  Loader2,
  Sparkles,
  ShieldCheck,
  Search,
  Download,
  AlertTriangle,
  ZoomIn,
} from "lucide-react";
import api from "../lib/api";
import { toast } from "../lib/toast";
import { useAdminSocket } from "../context/AdminSocketContext";

export const VerificationManager = () => {
  const { socket } = useAdminSocket();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Inspect / Action Modal State
  const [inspectRequest, setInspectRequest] = useState(null);
  const [previewDocUrl, setPreviewDocUrl] = useState(null);
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get("/verification-requests", {
        params: { status: statusFilter },
      });
      if (res.data?.success) {
        setRequests(res.data.requests || []);
      }
    } catch {
      toast.error("Failed to load verification applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;
    const handleNewVerification = (newReq) => {
      if (statusFilter === "pending" || statusFilter === "all") {
        setRequests((prev) => [newReq, ...prev]);
      }
    };
    const handleProcessed = ({ requestId }) => {
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
      if (inspectRequest?._id === requestId) setInspectRequest(null);
    };

    socket.on("verification:new", handleNewVerification);
    socket.on("verification:processed", handleProcessed);

    return () => {
      socket.off("verification:new", handleNewVerification);
      socket.off("verification:processed", handleProcessed);
    };
  }, [socket, statusFilter, inspectRequest]);

  const handleApprove = async (requestId) => {
    try {
      setProcessingId(requestId);
      const res = await api.post(`/verification-requests/${requestId}/process`, {
        status: "approved",
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setInspectRequest(null);
        fetchRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve verification.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectModalReq) return;

    try {
      setProcessingId(rejectModalReq._id);
      const res = await api.post(`/verification-requests/${rejectModalReq._id}/process`, {
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setRejectModalReq(null);
        setInspectRequest(null);
        setRejectionReason("");
        fetchRequests();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject verification.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.user?.userName?.toLowerCase().includes(q) ||
      r.user?.name?.toLowerCase().includes(q) ||
      r.fullName?.toLowerCase().includes(q) ||
      r.category?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-extrabold uppercase tracking-wider">
              Identity Verification Desk
            </span>
            <span className="text-zinc-500 text-xs">•</span>
            <span className="text-zinc-400 text-xs">Official Blue Badges</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Blue Badge Verification Hub
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Audit government IDs, inspect public notoriety, and grant official verified blue badges.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          {["pending", "approved", "rejected", "all"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                statusFilter === st
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-500/25"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
        <Search className="w-4 h-4 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter applications by creator name, @handle, or category..."
          className="w-full bg-transparent text-xs text-white placeholder:text-zinc-600 focus:outline-none"
        />
      </div>

      {/* Applications Grid */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-bold">Loading verification desk applications...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-16 text-center space-y-3 rounded-3xl bg-[#0d111a] border border-white/[0.06]">
          <ShieldCheck className="w-12 h-12 text-sky-400 mx-auto" />
          <h3 className="text-base font-bold text-white font-['Outfit']">No Verification Applications</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            There are currently no {statusFilter !== "all" ? statusFilter : ""} verification applications in the queue.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRequests.map((req) => (
            <div
              key={req._id}
              className="p-5 rounded-3xl bg-[#0d111a] border border-white/[0.06] hover:border-sky-500/30 shadow-xl flex flex-col justify-between space-y-4 transition group"
            >
              <div className="space-y-3">
                {/* Header: Category Badge & Status */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/25 text-[10px] font-extrabold uppercase">
                    {req.category || "Creator"}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      req.status === "approved"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : req.status === "rejected"
                        ? "bg-rose-500/20 text-rose-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                {/* Applicant Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-lg shrink-0 overflow-hidden border-2 border-sky-500/30">
                    {req.user?.profileImage?.url ? (
                      <img src={req.user.profileImage.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      req.user?.name?.charAt(0) || "U"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{req.fullName || req.user?.name}</p>
                    <p className="text-xs text-zinc-400">@{req.user?.userName}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Doc: <span className="text-zinc-300 font-bold capitalize">{req.documentType}</span>
                    </p>
                  </div>
                </div>

                {/* Additional context */}
                {req.additionalInfo && (
                  <p className="text-xs text-zinc-300 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04] italic line-clamp-2">
                    "{req.additionalInfo}"
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
                <button
                  onClick={() => setInspectRequest(req)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-bold border border-white/[0.08] transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect ID</span>
                </button>

                {req.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleApprove(req._id)}
                      disabled={processingId === req._id}
                      className="p-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white border border-sky-500/40 text-xs font-bold transition cursor-pointer"
                      title="Grant Blue Badge"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRejectModalReq(req)}
                      disabled={processingId === req._id}
                      className="p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition cursor-pointer"
                      title="Reject Application"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inspect Document Modal */}
      {inspectRequest && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-2xl bg-[#0d111a] border border-sky-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5 animate-fade-in-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-['Outfit']">
                    Identity Dossier: @{inspectRequest.user?.userName}
                  </h3>
                  <p className="text-xs text-zinc-400">Official legal name: {inspectRequest.fullName}</p>
                </div>
              </div>

              <button
                onClick={() => setInspectRequest(null)}
                className="p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Image Zoom Box */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-zinc-400 uppercase">Government Document Image</p>
              {inspectRequest.documentImages?.[0]?.url ? (
                <div className="rounded-2xl overflow-hidden bg-black border border-white/[0.1] max-h-[320px] flex items-center justify-center relative group">
                  <img
                    src={inspectRequest.documentImages[0].url}
                    alt="ID Document"
                    className="w-full max-h-[320px] object-contain"
                  />
                  <a
                    href={inspectRequest.documentImages[0].url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/80 text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Open High-Res</span>
                  </a>
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-zinc-500 bg-white/[0.02] rounded-2xl">
                  No document attachment present.
                </div>
              )}
            </div>

            {/* Decision Controls */}
            {inspectRequest.status === "pending" && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setRejectModalReq(inspectRequest)}
                  className="flex-1 py-3 rounded-2xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-600/30 text-xs font-bold transition cursor-pointer"
                >
                  Reject Application
                </button>
                <button
                  onClick={() => handleApprove(inspectRequest._id)}
                  disabled={processingId === inspectRequest._id}
                  className="flex-1 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-lg shadow-sky-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Grant Official Blue Tick</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0d111a] border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-5 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white font-['Outfit']">Reject Verification</h3>
                <p className="text-xs text-zinc-400">Notify @{rejectModalReq.user?.userName} of the rejection reason.</p>
              </div>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">Rejection Reason</label>
                <textarea
                  rows={3}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="E.g. Document image was illegible, name on ID does not match account..."
                  className="w-full p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalReq(null)}
                  className="flex-1 py-3 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectModalReq._id}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationManager;
