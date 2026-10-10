import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users, Sparkles, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import api from "../lib/axios";
import { snackbar } from "../lib/snackbar";
import dp from "../assets/dp3.png";

const JoinGroupInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchInfo = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/conversation/invite-info/${token}`);
        if (isMounted) {
          if (res.data?.success) {
            setGroupInfo(res.data.group);
          } else {
            setError(res.data?.message || "Invalid group invite link");
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || "Invite link has expired or is invalid");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (token) fetchInfo();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleJoin = async () => {
    if (joining) return;
    try {
      setJoining(true);
      const res = await api.post(`/conversation/join/${token}`);
      if (res.data?.success) {
        snackbar.success(`Joined ${groupInfo?.groupName || "group"}! 🎉`);
        navigate(`/messages/${res.data.conversationId}`);
      } else {
        snackbar.error(res.data?.message || "Failed to join group");
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Could not join group");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Gradient Spheres */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 translate-x-1/2 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-surface/90 border border-border/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 text-center animate-in fade-in zoom-in-95 duration-200">
        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-text-muted font-medium">Verifying invite...</p>
          </div>
        ) : error ? (
          <div className="py-8 space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-text">Invite Expired or Invalid</h2>
            <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
              {error}
            </p>
            <button
              onClick={() => navigate("/messages")}
              className="mt-4 px-6 py-2.5 rounded-2xl bg-surface border border-border text-xs font-bold hover:bg-surface-hover transition cursor-pointer"
            >
              Back to Messages
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative mx-auto w-24 h-24">
              <img
                src={groupInfo?.groupImage?.url || dp}
                alt={groupInfo?.groupName || "Group"}
                className="w-24 h-24 rounded-full object-cover border-4 border-surface shadow-xl"
              />
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold">
                <Sparkles className="w-3.5 h-3.5" /> Group Chat Invite
              </div>
              <h1 className="text-2xl font-black text-text tracking-tight">
                {groupInfo?.groupName || "Group Conversation"}
              </h1>
              {groupInfo?.description && (
                <p className="text-xs text-text-muted max-w-sm mx-auto line-clamp-2">
                  {groupInfo.description}
                </p>
              )}
            </div>

            {/* Member preview */}
            <div className="bg-surface-inset/60 border border-border/60 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2 overflow-hidden">
                  {(groupInfo?.members || []).map((m, idx) => (
                    <img
                      key={m._id || idx}
                      src={m.profileImage?.url || dp}
                      alt={m.userName || "member"}
                      className="inline-block h-7 w-7 rounded-full ring-2 ring-surface object-cover"
                    />
                  ))}
                </div>
                <span className="text-xs text-text-secondary font-semibold">
                  {groupInfo?.memberCount || 0} {groupInfo?.memberCount === 1 ? "member" : "members"}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Link
              </div>
            </div>

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:via-pink-500 hover:to-rose-500 text-white text-sm font-bold shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer disabled:opacity-60"
            >
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Joining Group...</span>
                </>
              ) : groupInfo?.isMember ? (
                <>
                  <span>Open Group Conversation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Accept Invite & Join</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinGroupInvitePage;
