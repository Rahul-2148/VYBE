import { SmilePlus, MapPin, ExternalLink, Heart, CornerUpLeft, CornerUpRight, Pin, EllipsisVertical, Clock, Trash2, Phone, Copy, Send, CheckCircle2 } from "lucide-react";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { snackbar } from "../lib/snackbar";
import api from "../lib/axios";
import { removeMessage, updateMessage } from "../redux/features/messageSlice";
import SharedContentCard from "./SharedContentCard";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import MediaLightboxModal from "./MediaLightboxModal";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";

import { getChatThemeById } from "../lib/chatThemes";

const EMOJIS = ["❤️", "😂", "🔥", "👍", "😢", "🙏", "👏", "🎉", "✨", "💯"];

const ReceiverMessage = ({ message, setReplyTo, isGrouped, isLastInGroup, onForwardMessage }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);
  const { conversations } = useSelector((state) => state.message);

  const convId = typeof message.conversation === "object" && message.conversation !== null
    ? message.conversation._id || message.conversation.id
    : message.conversation;
  const currentConv = conversations.find((c) => (c._id || c.conversationId)?.toString() === convId?.toString());
  const activeTheme = currentConv?.theme || "default";
  const themeObj = getChatThemeById(activeTheme);
  const receiverBubbleClass = themeObj.receiverBubble || "bg-surface/90 text-text border border-border shadow-xs backdrop-blur-md";

  const [showOptions, setShowOptions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [lightboxData, setLightboxData] = useState({ open: false, url: null, type: "image" });
  const [contactShared, setContactShared] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declined, setDeclined] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const isContactRequest = message.type === "contact_request" || 
    (typeof message.content?.text === "string" && (
      message.content.text.includes("Contact Request") || 
      message.content.text.includes("requested to view your phone number") ||
      message.content.text.includes("requested your contact phone number")
    ));

  const isContactDecline = message.type === "contact_decline" || 
    (typeof message.content?.text === "string" && message.content.text.includes("Declined contact request"));

  const isContactCard = message.type === "contact" || 
    Boolean(message.content?.contactData?.phone);

  const handleShareContactBack = async () => {
    if (contactShared) return;
    try {
      const myPhone = userData?.user?.contactPhone || prompt("Enter your phone number to share in chat:");
      if (!myPhone) return;

      await api.post("/message/send", {
        conversationId: message.conversation,
        type: "contact",
        text: `Shared verified contact number`,
        contactData: {
          name: userData?.user?.name || "User",
          phone: myPhone,
        },
      });

      setContactShared(true);
      snackbar.success("Phone number shared successfully in chat!");
    } catch (e) {
      snackbar.error("Failed to share contact number");
    }
  };

  const handleDeclineContact = async () => {
    if (declined || isDeclining) return;
    try {
      setIsDeclining(true);
      const note = declineReason.trim();
      const messageText = note 
        ? `Declined contact request: "${note}"` 
        : `Declined contact request.`;

      await api.post("/message/send", {
        conversationId: message.conversation,
        type: "contact_decline",
        text: messageText,
        sharedData: {
          reason: note || "No reason provided",
        },
      });

      setDeclined(true);
      setShowDeclineForm(false);
      snackbar.info("Contact request declined with comment.");
    } catch (e) {
      snackbar.error("Failed to decline request");
    } finally {
      setIsDeclining(false);
    }
  };

  const handleDoubleClick = async () => {
    triggerHaptic("like");
    microAudio.playPop();
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1000);
    try {
      const res = await api.post(`/message/react/${message._id}`, { emoji: "❤️" });
      dispatch(updateMessage(res.data.message));
    } catch (e) {
      console.warn("ReceiverMessage: double-click react failed", e);
    }
  };

  // Refs
  const optionsRef = useRef(null);
  const reactionsRef = useRef(null);
  const reactionButtonRef = useRef(null);
  const messageRef = useRef(null);

  const isSharedContent = Boolean(
    message.type?.startsWith("shared_") ||
    message.type === "share" ||
    message.content?.sharedData ||
    message.sharedData
  );

  const mediaList = isSharedContent
    ? []
    : Array.isArray(message.content?.media)
    ? message.content.media
    : message.content?.media
    ? [message.content.media]
    : message.type === "sticker" && (message.content?.mediaUrl || message.mediaUrl)
    ? [{ url: message.content?.mediaUrl || message.mediaUrl, type: "sticker" }]
    : [];

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        optionsRef.current &&
        !optionsRef.current.contains(event.target) &&
        !event.target.closest("[data-options-trigger]")
      ) {
        setShowOptions(false);
      }

      if (
        reactionsRef.current &&
        !reactionsRef.current.contains(event.target) &&
        reactionButtonRef.current &&
        !reactionButtonRef.current.contains(event.target)
      ) {
        setShowReactions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = async () => {
    try {
      await api.delete(`/message/${message._id}`);
      dispatch(removeMessage(message._id));
      setShowOptions(false);
    } catch (e) {
      console.warn("ReceiverMessage: handleDelete failed", e);
    }
  };

  const handlePin = async () => {
    try {
      const res = await api.post(`/message/pin/${message._id}`);
      if (res.data.success) {
        dispatch(updateMessage({ ...message, isPinned: res.data.isPinned }));
      }
    } catch (e) {
      console.warn("ReceiverMessage: pin/unpin failed", e);
    }
    setShowOptions(false);
  };

  const handleReact = async (emoji) => {
    try {
      const res = await api.post(`/message/react/${message._id}`, { emoji });
      dispatch(updateMessage(res.data.message));
      setShowReactions(false);
    } catch (e) {
      console.warn("ReceiverMessage: handleReact failed", e);
    }
  };

  if (message.deletedForEveryone) {
    return (
      <div className="mr-auto text-xs text-text-muted my-1.5 italic px-3 py-1.5 bg-surface-hover rounded-2xl border border-border">
        This message was deleted
      </div>
    );
  }

  const highlight =
    window.__search &&
    message.content?.text
      ?.toLowerCase()
      .includes(window.__search.toLowerCase());

  const renderReplyChain = (reply) => {
    if (!reply) return null;

    return (
      <div
        className="cursor-pointer rounded-xl px-3 py-1.5 mb-1.5 border-l-4 border-primary bg-surface-hover/80 hover:bg-surface-hover transition text-text"
        onClick={() => {
          const el = document.getElementById(`msg-${reply._id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("flash-highlight");
            setTimeout(() => el.classList.remove("flash-highlight"), 1500);
          }
        }}
      >
        <span className="text-[11px] font-bold text-primary block">
          {reply?.sender?.userName || "User"}
        </span>
        <span className="text-xs text-text-secondary truncate block">
          {reply.content?.text || "Media"}
        </span>
      </div>
    );
  };

  return (
    <div className="relative group/msg flex items-center justify-start my-0.5">
      {/* Floating Emoji Reactions Bar (Responsive & Glassmorphic) */}
      {showReactions && (
        <div
          ref={reactionsRef}
          className="absolute -top-11 left-0 sm:left-auto sm:left-1/2 sm:-translate-x-1/2 z-50 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700/80 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl px-2 py-1 flex items-center gap-1 max-w-[92vw] overflow-x-auto hide-scrollbar animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {EMOJIS.map((e, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleReact(e);
              }}
              className="flex-shrink-0 text-xl hover:scale-130 active:scale-90 transition-transform duration-150 cursor-pointer p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
              style={{ minWidth: "30px", textAlign: "center" }}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div
        ref={messageRef}
        onDoubleClick={handleDoubleClick}
        className={`relative mr-auto max-w-[88%] sm:max-w-[70%] md:max-w-[60%] px-4 py-2.5 rounded-3xl flex flex-col gap-1 cursor-pointer select-none transition-all duration-200 ${
          highlight
            ? "bg-yellow-500/20 rounded-3xl ring-2 ring-yellow-400"
            : receiverBubbleClass
        }`}
      >
        {/* Forwarded indicator */}
        {message.isForwarded && (
          <div className="flex items-center gap-1 text-[10px] text-text-muted font-medium">
            <CornerUpRight className="w-3 h-3" />
            <span>Forwarded</span>
          </div>
        )}

        {/* Double Tap Floating Heart Overlay */}
        {showHeart && (
          <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
            <Heart className="w-12 h-12 text-rose-500 fill-rose-500 animate-ping drop-shadow-lg" />
          </div>
        )}

        {/* REPLY PREVIEW */}
        {message.replyTo && renderReplyChain(message.replyTo)}

        {/* CONTACT REQUEST CARD */}
        {isContactRequest && (
          <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-500/15 via-rose-500/15 to-purple-500/15 border-2 border-amber-500/40 space-y-3 min-w-[270px] max-w-[340px] my-1 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <div className="p-1.5 rounded-xl bg-amber-500/20 shadow-inner">
                  <Phone className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Contact Request</span>
              </div>
              {declined ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Declined ✕
                </span>
              ) : contactShared ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Shared ✓
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  Pending
                </span>
              )}
            </div>

            <p className="text-xs text-text leading-relaxed">
              <strong
                onClick={() => {
                  if (message.sender?.userName) navigate(`/profile/${message.sender.userName}`);
                }}
                className="text-rose-400 font-bold hover:underline cursor-pointer"
                title={`View @${message.sender?.userName || "User"}'s profile`}
              >
                @{message.sender?.userName || "User"}
              </strong> requested to view your phone number.
            </p>

            {declined ? (
              <div className="text-[11px] text-zinc-300 italic bg-black/30 p-2.5 rounded-xl border border-zinc-800">
                You declined this request {declineReason ? `("${declineReason}")` : ""}.
              </div>
            ) : contactShared ? (
              <div className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/15 p-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>You shared your contact number ✓</span>
              </div>
            ) : !showDeclineForm ? (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleShareContactBack}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:opacity-95 active:scale-95 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Share My Number</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeclineForm(true)}
                  className="py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border border-rose-500/40 bg-zinc-900/90 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 cursor-pointer shadow-sm active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Deny ✕</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1 p-2.5 bg-black/40 rounded-xl border border-zinc-700/80 animate-in fade-in duration-200">
                <div className="text-[11px] font-bold text-zinc-200 flex items-center justify-between">
                  <span>Deny with optional reason:</span>
                  <button 
                    type="button" 
                    onClick={() => setShowDeclineForm(false)} 
                    className="text-[10px] text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Please reach out via email or DM instead"
                  className="w-full text-xs p-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 outline-none focus:border-rose-500"
                />
                <div className="flex flex-wrap gap-1">
                  {["Prefer DM 💬", "Email only ✉️", "Friends only 🔒", "Busy now ⏳"].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setDeclineReason(chip)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition ${
                        declineReason === chip
                          ? "bg-rose-500/30 border-rose-500 text-rose-300 font-bold"
                          : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDeclineContact}
                    disabled={isDeclining}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isDeclining ? "Declining..." : "Confirm Deny ✕"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeclineForm(false)}
                    className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTACT DECLINED CARD */}
        {isContactDecline && (
          <div className="rounded-2xl p-4 bg-zinc-900/80 border border-rose-500/20 space-y-2 min-w-[220px] my-1">
            <div className="flex items-center gap-2 text-rose-400">
              <div className="p-1.5 rounded-xl bg-rose-500/10">
                <X className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider">Request Declined</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {message.content?.text || "Contact request was declined."}
            </p>
          </div>
        )}

        {/* CONTACT CARD */}
        {isContactCard && (
          <div className="rounded-2xl p-4 bg-surface-hover/80 border border-border/90 space-y-2.5 min-w-[220px] my-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Contact Card</div>
                <div className="text-xs font-bold text-text">{message.content?.contactData?.name || "User"}</div>
              </div>
            </div>
            <div className="text-sm font-mono font-bold text-rose-400 tracking-wider">
              {message.content?.contactData?.phone || "No phone listed"}
            </div>
            {message.content?.contactData?.phone && (
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={`tel:${message.content?.contactData?.phone}`}
                  className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl text-center transition"
                >
                  Call
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(message.content?.contactData?.phone);
                    snackbar.success("Phone number copied!");
                  }}
                  className="p-1.5 rounded-xl bg-surface border border-border text-text-muted hover:text-white transition cursor-pointer"
                  title="Copy Phone"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* SHARED CONTENT CARD */}
        {(message.type?.startsWith("shared_") || message.content?.sharedData) && (
          <SharedContentCard
            sharedData={message.content?.sharedData || message.sharedData}
            type={message.type || "shared_post"}
          />
        )}

        {/* MEDIA */}
        {mediaList.map((m, i) => {
          if (m.type === "sticker" || message.type === "sticker") {
            return (
              <img
                key={i}
                src={m.url}
                alt="Sticker"
                className="w-36 h-36 object-contain drop-shadow-md select-none hover:scale-105 transition-transform my-1"
              />
            );
          }
          if (m.type === "image" || m.type === "gif") {
            return (
              <img
                key={i}
                src={m.url}
                onClick={(e) => { e.stopPropagation(); setLightboxData({ open: true, url: m.url, type: "image" }); }}
                className="rounded-2xl max-h-[280px] w-full object-cover cursor-pointer hover:opacity-95 transition my-1 shadow-sm"
                alt="Attachment"
              />
            );
          }
          if (m.type === "video") {
            return (
              <video
                key={i}
                controls
                onClick={(e) => { e.stopPropagation(); setLightboxData({ open: true, url: m.url, type: "video" }); }}
                className="rounded-2xl max-h-[300px] w-full cursor-pointer my-1 shadow-sm"
              >
                <source src={m.url} />
              </video>
            );
          }
          if (m.type === "document") {
            return (
              <a
                key={i}
                href={m.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline text-text flex items-center gap-1.5 py-1 font-medium"
              >
                ðŸ“„ {m.name || "Document"}
              </a>
            );
          }
          return null;
        })}

        {/* TEXT */}
        {!(isContactRequest || isContactDecline || isContactCard) && (message.type === "text" || message.content?.text) && message.content?.text?.trim() && (
          <p className="text-sm text-text break-words leading-relaxed font-normal">
            {message.content?.text}
            {message.edited && (
              <span className="text-[10px] ml-1.5 text-text-muted italic">(edited)</span>
            )}
          </p>
        )}

        {/* REACTIONS DISPLAY */}
        {message.reactions?.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-0.5">
            {message.reactions.map((r, i) => (
              <span
                key={i}
                className="text-xs bg-surface-hover text-text border border-border px-2 py-0.5 rounded-full"
              >
                {r.emoji}
              </span>
            ))}
          </div>
        )}

        {/* TIME */}
        <div className="flex items-center gap-1 self-end mt-0.5">
          {message.edited && <span className="text-[9px] text-text-muted">edited</span>}
          <span className="text-[10px] font-medium text-text-muted">
            {moment(message.createdAt).format("h:mm A")}
          </span>
          {message.isPinned && <Pin size={10} className="text-amber-400 transform rotate-45" />}
          {message.disappear?.enabled && <Clock size={10} className="text-amber-400" />}
        </div>

        {/* REACTION BUTTON (visible on hover / active / touch) */}
        <button
          ref={reactionButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            setShowReactions(!showReactions);
          }}
          className={`absolute -right-8 bottom-1 cursor-pointer bg-surface/90 hover:bg-surface border border-border p-1.5 rounded-full shadow-md transition-all duration-200 ${
            showReactions
              ? "text-primary scale-110 ring-2 ring-primary/40 opacity-100"
              : "text-text-muted hover:text-text hover:scale-110 opacity-0 group-hover/msg:opacity-100 focus:opacity-100"
          }`}
          style={{ zIndex: 10 }}
          title="React"
        >
          <SmilePlus size={14} />
        </button>

        {/* REPLY, FORWARD & OPTIONS BUTTONS */}
        <div className="absolute top-1 right-2 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity">
          <button
            onClick={() => setReplyTo(message)}
            className="p-1 text-text-muted hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
            title="Reply"
          >
            <CornerUpLeft size={14} />
          </button>
          {onForwardMessage && (
            <button
              onClick={() => onForwardMessage(message)}
              className="p-1 text-text-muted hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
              title="Forward"
            >
              <CornerUpRight size={14} />
            </button>
          )}
          <button
            data-options-trigger="true"
            onClick={() => setShowOptions(!showOptions)}
            className="p-1 text-text-muted hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer"
            title="More options"
          >
            <EllipsisVertical size={14} />
          </button>
        </div>

        {/* OPTIONS DROPDOWN */}
        {showOptions && (
          <div
            ref={optionsRef}
            className="absolute top-6 right-2 bg-surface rounded-2xl shadow-2xl text-xs z-50 overflow-hidden min-w-[150px] border border-border py-1 animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              onClick={() => {
                setReplyTo(message);
                setShowOptions(false);
              }}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text transition-colors cursor-pointer"
            >
              <CornerUpLeft size={14} className="text-text-secondary" /> Reply
            </button>
            {onForwardMessage && (
              <button
                onClick={() => {
                  onForwardMessage(message);
                  setShowOptions(false);
                }}
                className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text transition-colors cursor-pointer"
              >
                <CornerUpRight size={14} className="text-text-secondary" /> Forward
              </button>
            )}
            <button
              onClick={handlePin}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-surface-hover w-full text-left text-text transition-colors cursor-pointer"
            >
              <Pin size={14} className="text-text-secondary" /> {message.isPinned ? "Unpin" : "Pin"}
            </button>
            <div className="border-t border-border my-1" />
            <button
              onClick={handleDelete}
              className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-red-500/10 w-full text-left text-red-500 transition-colors cursor-pointer font-medium"
            >
              <Trash2 size={14} /> Delete for me
            </button>
          </div>
        )}
      </div>

      {/* Full-Screen Media Lightbox Modal */}
      {lightboxData.open && (
        <MediaLightboxModal
          isOpen={lightboxData.open}
          onClose={() => setLightboxData({ open: false, url: null, type: "image" })}
          mediaUrl={lightboxData.url}
          mediaType={lightboxData.type}
        />
      )}
    </div>
  );
};

export default ReceiverMessage;

