import React, { useState } from "react";
import { X, Search, Mic, MicOff, Video, VideoOff, Crown, VolumeX, Shield, UserPlus, Hand, Check } from "lucide-react";
import { snackbar } from "../lib/snackbar";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";
import dp from "../assets/dp3.png";

export const CallPeopleSidebar = ({
  isOpen,
  onClose,
  myUserId,
  myUserName,
  myAvatar,
  callerName,
  callerAvatar,
  peers = {},
  isHost,
  hostUserId,
  isMuted,
  isVideoOff,
  isHandRaised,
  raisedHandsList = [],
  onMuteAll,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  // Deduplicate and filter out self
  const uniquePeerMap = new Map();
  Object.entries(peers || {}).forEach(([sid, data]) => {
    if (!data) return;
    const uid = (data.userId || sid)?.toString();
    if (myUserId && uid === myUserId?.toString()) return;
    if (!uniquePeerMap.has(uid)) {
      uniquePeerMap.set(uid, [sid, data]);
    }
  });
  const peerList = Array.from(uniquePeerMap.values());
  const totalCount = Math.max(1 + peerList.length, callerName ? 2 : 1);

  const filteredPeerList = peerList.filter(([, peerData]) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      peerData.userName?.toLowerCase().includes(q) ||
      peerData.name?.toLowerCase().includes(q)
    );
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      triggerHaptic("success");
      microAudio?.playPop?.();
      snackbar.success("Meeting invite link copied to clipboard! 📋");
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      snackbar.error("Could not copy link");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f20] text-white select-none overflow-hidden font-sans border-l border-zinc-700/80">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-700/80 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white tracking-wide">People</h3>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold">
            {totalCount}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Add People Action (Visual & Tactile Copied Feedback) */}
      <div className="p-3 border-b border-zinc-700/60 shrink-0">
        <button
          type="button"
          onClick={handleCopyLink}
          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow ${
            isCopied
              ? "bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/20 scale-[0.98]"
              : "bg-blue-600 hover:bg-blue-500 text-white active:scale-95"
          }`}
        >
          {isCopied ? (
            <>
              <Check className="w-4 h-4 text-white animate-in zoom-in-75 duration-200" />
              <span>Link Copied! ✓</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Copy Joining Info</span>
            </>
          )}
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pt-3 shrink-0">
        <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for people..."
            className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-zinc-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-zinc-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 hide-scrollbar">
        {/* Self */}
        {(!searchQuery || "you".includes(searchQuery.toLowerCase()) || myUserName?.toLowerCase().includes(searchQuery.toLowerCase())) && (() => {
          const selfQIndex = raisedHandsList?.findIndex((h) => h.isSelf);
          const selfQ = selfQIndex !== -1 && selfQIndex !== undefined ? selfQIndex + 1 : null;
          const isSelfHost = isHost || (hostUserId && myUserId?.toString() === hostUserId.toString());
          return (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#28292a] border border-zinc-700/60">
              <div className="flex items-center gap-3">
                <img
                  src={myAvatar || dp}
                  alt="You"
                  onError={(e) => { e.target.src = dp; }}
                  className="w-9 h-9 rounded-full object-cover border border-white/20 shadow-xs"
                />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white">You</span>
                    {isSelfHost && (
                      <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-semibold border border-zinc-700/80 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span>Host</span>
                      </span>
                    )}
                    {isHandRaised && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#1a73e8] text-white text-[10px] font-black flex items-center gap-1 shadow-xs animate-in zoom-in-75">
                        <span>✋</span>
                        <span>{selfQ || 1}</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    {myUserName?.startsWith("@") ? myUserName : `@${myUserName || "You"}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-zinc-400">
                {isMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                {isVideoOff ? <VideoOff className="w-4 h-4 text-rose-400" /> : <Video className="w-4 h-4 text-emerald-400" />}
              </div>
            </div>
          );
        })()}

        {/* Invited / Connecting Peer (If 1-on-1 and not connected yet) */}
        {peerList.length === 0 && callerName && (
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#28292a] border border-zinc-700/60">
            <div className="flex items-center gap-3">
              <img
                src={callerAvatar || dp}
                alt={callerName}
                onError={(e) => { e.target.src = dp; }}
                className="w-9 h-9 rounded-full object-cover border border-white/20 shadow-xs animate-pulse"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">
                    {callerName.startsWith("@") ? callerName : `@${callerName}`}
                  </span>
                </div>
                <span className="text-[10px] text-blue-400 font-medium animate-pulse">Connecting...</span>
              </div>
            </div>
          </div>
        )}

        {/* Empty State when in Room Session and No other participants yet */}
        {peerList.length === 0 && !callerName && (
          <div className="text-center py-8 px-4 space-y-2 border border-dashed border-zinc-700/60 rounded-2xl bg-zinc-800/20">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-white">Waiting for others to join</p>
            <p className="text-[11px] text-zinc-400 max-w-[200px] mx-auto">
              Share the meeting link or invite participants to start collaborating.
            </p>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`mt-2 text-xs font-semibold underline underline-offset-2 cursor-pointer flex items-center justify-center gap-1 mx-auto transition-colors ${
                isCopied ? "text-emerald-400 font-bold" : "text-blue-400 hover:text-blue-300"
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied to clipboard! ✓</span>
                </>
              ) : (
                <span>Copy Meeting Link</span>
              )}
            </button>
          </div>
        )}

        {/* Search empty result */}
        {searchQuery && filteredPeerList.length === 0 && (
          <p className="text-xs text-zinc-500 text-center py-4">No participants matching &quot;{searchQuery}&quot;</p>
        )}

        {/* Peers List */}
        {filteredPeerList.map(([socketId, peerData]) => {
          const peerAvatar = peerData.profilePicture || callerAvatar || dp;
          const rawName = peerData.userName || peerData.name || callerName || "Participant";
          const displayPName = rawName.startsWith("@") ? rawName : `@${rawName}`;
          const peerQIndex = raisedHandsList?.findIndex(
            (h) => (h.userId && (h.userId?.toString() === peerData.userId?.toString() || h.userId?.toString() === socketId?.toString()))
          );
          const peerQ = peerQIndex !== -1 && peerQIndex !== undefined ? peerQIndex + 1 : null;

          const isPeerHost = (hostUserId && peerData.userId?.toString() === hostUserId.toString()) || peerData.isHost;

          return (
            <div
              key={socketId}
              className="flex items-center justify-between p-2.5 rounded-2xl bg-[#28292a] border border-zinc-700/60"
            >
              <div className="flex items-center gap-3">
                <img
                  src={peerAvatar}
                  alt={rawName}
                  onError={(e) => { e.target.src = dp; }}
                  className="w-9 h-9 rounded-full object-cover border border-white/20 shadow-xs"
                />
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white">{displayPName}</span>
                    {isPeerHost && (
                      <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-[10px] font-semibold border border-zinc-700/80 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span>Host</span>
                      </span>
                    )}
                    {peerData.handRaised && (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#1a73e8] text-white text-[10px] font-black flex items-center gap-1 shadow-xs animate-in zoom-in-75">
                        <span>✋</span>
                        <span>{peerQ || 1}</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400">
                    {peerData.name && peerData.userName ? peerData.name : "Participant"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-zinc-400">
                {peerData.muted ? (
                  <MicOff className="w-4 h-4 text-rose-400" />
                ) : (
                  <Mic className="w-4 h-4 text-emerald-400" />
                )}
                {peerData.videoOff ? (
                  <VideoOff className="w-4 h-4 text-rose-400" />
                ) : (
                  <Video className="w-4 h-4 text-emerald-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Host Action: Mute All */}
      {isHost && (
        <div className="p-3 border-t border-zinc-700/60 shrink-0">
          <button
            type="button"
            onClick={onMuteAll}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-zinc-700"
          >
            <VolumeX className="w-4 h-4" />
            <span>Mute All</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CallPeopleSidebar;
