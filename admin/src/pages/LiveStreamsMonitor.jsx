import React, { useState, useEffect } from "react";
import {
  Radio,
  Users,
  AlertTriangle,
  X,
  CheckCircle2,
  ShieldOff,
  Loader2,
  Eye,
  Send,
} from "lucide-react";
import api from "../lib/api";
import { toast } from "../lib/toast";
import { useAdminSocket } from "../context/AdminSocketContext";
import ConfirmModal from "../components/ConfirmModal";

export const LiveStreamsMonitor = () => {
  const { socket } = useAdminSocket();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Intercept Modal
  const [interceptStream, setInterceptStream] = useState(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [sendingWarning, setSendingWarning] = useState(false);
  const [terminating, setTerminating] = useState(false);

  const fetchLiveStreams = async () => {
    try {
      setLoading(true);
      const res = await api.get("/live-streams");
      if (res.data?.success) {
        setStreams(res.data.streams || []);
      }
    } catch {
      toast.error("Failed to load live broadcasts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStreams();
    const interval = setInterval(fetchLiveStreams, 8000); // 8s poll fallback
    return () => clearInterval(interval);
  }, []);

  // Socket listener for live stream updates
  useEffect(() => {
    if (!socket) return;
    const handleStreamUpdate = () => {
      fetchLiveStreams();
    };
    socket.on("stream:updated", handleStreamUpdate);
    return () => {
      socket.off("stream:updated", handleStreamUpdate);
    };
  }, [socket]);

  const handleSendWarning = async (e) => {
    e.preventDefault();
    if (!interceptStream || !warningMessage.trim()) return;

    try {
      setSendingWarning(true);
      const res = await api.post(`/live-streams/${interceptStream._id}/warn`, {
        message: warningMessage.trim(),
      });
      if (res.data?.success) {
        toast.success("Warning banner sent to live room!");
        setWarningMessage("");
      }
    } catch (err) {
      toast.error("Failed to send warning.");
    } finally {
      setSendingWarning(false);
    }
  };

  // Killswitch Confirmation Modal
  const [killswitchModal, setKillswitchModal] = useState({ isOpen: false, streamId: null, reason: "" });

  const executeTerminateStream = async (streamId, reason) => {
    try {
      setTerminating(true);
      const res = await api.post(`/live-streams/${streamId}/terminate`, {
        reason: reason || "Broadcast terminated for safety violations",
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setInterceptStream(null);
        fetchLiveStreams();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to terminate stream.");
    } finally {
      setTerminating(false);
      setKillswitchModal({ isOpen: false, streamId: null, reason: "" });
    }
  };

  const handleTerminateStream = (streamId, reason) => {
    setKillswitchModal({
      isOpen: true,
      streamId,
      reason: reason || "Broadcast terminated for safety violations",
    });
  };

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold uppercase tracking-wider">
              Safety Telemetry
            </span>
            <span className="text-zinc-500 text-xs">•</span>
            <span className="text-zinc-400 text-xs">Real-time Broadcast Operations</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-['Outfit']">
            Live Stream Intercept & Safety
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Monitor on-air broadcasts, dispatch moderator warnings & execute emergency killswitches.
          </p>
        </div>

        {/* Live Counter Badge */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs font-black tracking-wider uppercase">
            {streams.length} Broadcast{streams.length === 1 ? "" : "s"} On-Air
          </span>
        </div>
      </div>

      {/* Streams Grid */}
      {loading && streams.length === 0 ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 font-bold">Scanning on-air live channels...</p>
        </div>
      ) : streams.length === 0 ? (
        <div className="p-16 text-center space-y-3 rounded-3xl bg-[#0d111a] border border-white/[0.06]">
          <Radio className="w-12 h-12 text-zinc-600 mx-auto" />
          <h3 className="text-base font-bold text-white font-['Outfit']">No Active Broadcasts</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            There are currently no active live streams on the platform. When a creator goes live, their feed will appear here instantly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {streams.map((stream) => (
            <div
              key={stream._id}
              className="p-5 rounded-3xl bg-[#0d111a] border border-rose-500/25 shadow-xl flex flex-col justify-between space-y-4 hover:border-rose-500/50 transition relative overflow-hidden group"
            >
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-rose-600/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>ON AIR</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-bold bg-white/[0.05] px-2.5 py-1 rounded-full border border-white/10">
                  <Users className="w-3.5 h-3.5 text-rose-400" />
                  <span>{stream.viewers?.length || stream.peakViewers || 1} viewers</span>
                </div>
              </div>

              {/* Host Info */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 to-purple-500 flex items-center justify-center font-bold text-white text-lg shrink-0 overflow-hidden border-2 border-rose-500/40">
                  {stream.host?.profileImage?.url ? (
                    <img src={stream.host.profileImage.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    stream.host?.name?.charAt(0) || "H"
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-white truncate">{stream.host?.name}</p>
                    {stream.host?.isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                  </div>
                  <p className="text-xs text-zinc-400">@{stream.host?.userName}</p>
                  <p className="text-[11px] text-zinc-300 font-bold truncate mt-0.5">"{stream.title || "Live Stream"}"</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  onClick={() => setInterceptStream(stream)}
                  className="py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-bold border border-white/[0.08] transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Intercept Feed</span>
                </button>
                <button
                  onClick={() => handleTerminateStream(stream._id)}
                  className="py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-600/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldOff className="w-3.5 h-3.5" />
                  <span>Killswitch</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Live Intercept Modal */}
      {interceptStream && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-3xl bg-[#0d111a] border border-rose-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-fade-in-up max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white font-['Outfit'] truncate">
                      Intercept: @{interceptStream.host?.userName}'s Live
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black animate-pulse shrink-0">
                      LIVE
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate">Stream Title: "{interceptStream.title || "Live Stream"}"</p>
                </div>
              </div>

              <button
                onClick={() => setInterceptStream(null)}
                className="p-2 rounded-xl bg-white/[0.04] text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Broadcast Live Room Visual Telemetry */}
              <div className="aspect-video rounded-2xl bg-black border border-white/[0.08] flex flex-col items-center justify-center p-4 sm:p-6 text-center space-y-3 relative overflow-hidden">
                <Radio className="w-10 sm:w-12 h-10 sm:h-12 text-rose-500 animate-pulse" />
                <div>
                  <p className="text-sm font-bold text-white">Live Room Telemetry Active</p>
                  <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs sm:max-w-md">
                    WebRTC signaling channel: {interceptStream._id}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono text-zinc-400 pt-2 flex-wrap justify-center">
                  <span>Viewers: {interceptStream.viewers?.length || 1}</span>
                  <span>•</span>
                  <span>Started: {new Date(interceptStream.startedAt || interceptStream.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* In-Stream Moderator Warning Form */}
              <form onSubmit={handleSendWarning} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-white">Broadcast Moderator In-Stream Warning</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Sends an overlay notification banner directly onto the host and all viewers' screens.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={warningMessage}
                    onChange={(e) => setWarningMessage(e.target.value)}
                    placeholder="E.g. Inappropriate language or content detected. Comply with guidelines."
                    className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
                  />
                  <button
                    type="submit"
                    disabled={sendingWarning}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs shadow-lg shadow-amber-500/20 hover:brightness-110 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {sendingWarning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Dispatch Warning</span>
                  </button>
                </div>
              </form>

              {/* Emergency Killswitch Bar */}
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-rose-300">Emergency Stream Teardown (Killswitch)</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Instantly forces WebSocket room closure and logs incident audit trail.
                  </p>
                </div>
                <button
                  onClick={() => handleTerminateStream(interceptStream._id, "Violations observed in live telemetry")}
                  disabled={terminating}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <ShieldOff className="w-4 h-4" />
                  <span>Execute Killswitch</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Killswitch Confirmation Dialog */}
      <ConfirmModal
        isOpen={killswitchModal.isOpen}
        title="Execute Emergency Killswitch"
        message="Are you sure you want to forcibly terminate this live broadcast? All viewers will be disconnected immediately and the event will be logged in the immutable security audit trail."
        confirmLabel="Execute Killswitch"
        variant="danger"
        loading={terminating}
        onConfirm={() => executeTerminateStream(killswitchModal.streamId, killswitchModal.reason)}
        onCancel={() => setKillswitchModal({ isOpen: false, streamId: null, reason: "" })}
      />
    </div>
  );
};

export default LiveStreamsMonitor;
