import React from "react";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Clock } from "lucide-react";
import { formatCallDuration } from "../../lib/webrtcCore";
import { triggerHaptic } from "../../lib/interactiveEffects";

export const VybeCallLogBubble = ({ message, currentUserId, onCallBack }) => {
  const metadata = message.systemEventData?.metadata || {};
  const isInitiator = (message.sender?._id || message.sender)?.toString() === currentUserId?.toString();
  const callType = metadata.callType || (message.content?.text?.toLowerCase()?.includes("video") ? "video" : "voice");
  const isVideo = callType === "video";
  const duration = metadata.duration || 0;
  const isMissed = message.systemEvent === "call_missed" || metadata.status === "missed" || duration === 0;

  // Determine Title & Icons
  let title = "";
  let IconComponent = Phone;
  let iconColorClass = "text-text";
  let iconBgClass = "bg-surface-hover";

  if (isMissed) {
    if (isInitiator) {
      title = `Cancelled ${isVideo ? "video" : "voice"} call`;
      IconComponent = isVideo ? Video : PhoneOutgoing;
      iconColorClass = "text-zinc-400";
      iconBgClass = "bg-zinc-800/40";
    } else {
      title = `Missed ${isVideo ? "video" : "voice"} call`;
      IconComponent = isVideo ? Video : PhoneMissed;
      iconColorClass = "text-rose-500";
      iconBgClass = "bg-rose-500/10";
    }
  } else {
    if (isInitiator) {
      title = `Outgoing ${isVideo ? "video" : "voice"} call`;
      IconComponent = isVideo ? Video : PhoneOutgoing;
      iconColorClass = "text-emerald-400";
      iconBgClass = "bg-emerald-500/10";
    } else {
      title = `Incoming ${isVideo ? "video" : "voice"} call`;
      IconComponent = isVideo ? Video : PhoneIncoming;
      iconColorClass = "text-blue-400";
      iconBgClass = "bg-blue-500/10";
    }
  }

  const handleCallBack = (e) => {
    e.stopPropagation();
    triggerHaptic("medium");
    if (onCallBack) {
      onCallBack(callType);
    } else {
      const target = isInitiator
        ? message.systemEventData?.targetUser
        : message.sender;
      window.dispatchEvent(
        new CustomEvent("vybe:initiate-call", {
          detail: {
            type: callType,
            user: target,
            targetUserId: (target?._id || target?.id || target)?.toString(),
            conversationId: message.conversation?._id || message.conversation,
          },
        })
      );
    }
  };

  return (
    <div className="flex items-center justify-between gap-3.5 p-3 rounded-2xl bg-surface/90 border border-border/80 min-w-[220px] max-w-[320px] shadow-sm select-none">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBgClass} ${iconColorClass} shrink-0`}>
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-bold text-text leading-tight">{title}</span>
          <span className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1 font-medium">
            {!isMissed && duration > 0 ? (
              <>
                <Clock className="w-3 h-3 text-text-muted" />
                <span>{formatCallDuration(duration)}</span>
              </>
            ) : (
              <span>{isMissed ? "No answer" : "Ended"}</span>
            )}
          </span>
        </div>
      </div>

      <button
        onClick={handleCallBack}
        className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition cursor-pointer active:scale-95 shrink-0"
      >
        Call Back
      </button>
    </div>
  );
};

export default VybeCallLogBubble;
