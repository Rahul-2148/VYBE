import React, { useState, useEffect } from "react";
import {
  X, Bell, BellOff, Archive, Search, Pin, Shield, UserMinus, Users,
  Image, Film, FileText, Link2, ChevronRight, VolumeX, Volume2,
  Clock, Trash2, Flag, Lock, Palette, ExternalLink, Download, Play, User
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toggleMuteInRedux, toggleArchiveInRedux, removeConversationInRedux, clearMessagesInRedux, updateConversationThemeInRedux, updateConversationDisappearingInRedux, toggleVanish } from "../redux/features/messageSlice";
import dp from "../assets/dp3.png";
import api from "../lib/axios";
import { snackbar } from "../lib/snackbar";
import moment from "moment";
import ChatThemePickerModal from "./ChatThemePickerModal";
import { MediaLightboxModal } from "./MediaLightboxModal";

const MEDIA_TABS = [
  { id: "image", label: "Photos", icon: <Image className="w-4 h-4" /> },
  { id: "video", label: "Videos", icon: <Film className="w-4 h-4" /> },
  { id: "file", label: "Files", icon: <FileText className="w-4 h-4" /> },
  { id: "link", label: "Links", icon: <Link2 className="w-4 h-4" /> },
];

const ChatInfoDrawer = ({ conversationId, isGroup, otherUser, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData } = useSelector((s) => s.user);
  const { conversations } = useSelector((s) => s.message);
  const currentUserId = userData?.user?._id || userData?._id;

  const conversation = conversations.find((c) => (c._id || c.conversationId)?.toString() === conversationId?.toString());

  const [activeMediaTab, setActiveMediaTab] = useState("image");
  const [sharedMedia, setSharedMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [details, setDetails] = useState(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [activeTheme, setActiveTheme] = useState(conversation?.theme || "default");
  const [lightboxData, setLightboxData] = useState({ open: false, url: null, type: "image" });

  // Fetch conversation details
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/conversation/details/${conversationId}`);
        if (res.data?.success) {
          setDetails(res.data.conversation);
        }
      } catch (err) {
        console.error("Failed to fetch conversation details", err);
      }
    };
    if (conversationId) fetchDetails();
  }, [conversationId]);

  // Fetch shared media
  useEffect(() => {
    const fetchMedia = async () => {
      setLoadingMedia(true);
      try {
        const res = await api.get(`/message/shared-media/${conversationId}?mediaType=${activeMediaTab}`);
        setSharedMedia(res.data?.messages || []);
      } catch {
        setSharedMedia([]);
      } finally {
        setLoadingMedia(false);
      }
    };
    if (conversationId) fetchMedia();
  }, [conversationId, activeMediaTab]);

  const handleMute = async () => {
    try {
      const res = await api.patch(`/conversation/mute/${conversationId}`);
      if (res.data?.success) {
        dispatch(toggleMuteInRedux({ conversationId, muted: res.data.muted }));
        snackbar.success(res.data.muted ? "Notifications muted" : "Notifications unmuted");
      }
    } catch {
      snackbar.error("Failed");
    }
  };

  const handleArchive = async () => {
    try {
      const res = await api.patch(`/conversation/archive/${conversationId}`);
      if (res.data?.success) {
        dispatch(toggleArchiveInRedux({ conversationId, archived: res.data.archived }));
        snackbar.success(res.data.archived ? "Chat archived" : "Chat unarchived");
      }
    } catch {
      snackbar.error("Failed");
    }
  };

  const handleDisappearing = async (duration) => {
    try {
      const res = await api.patch(`/conversation/disappearing/${conversationId}`, { duration });
      if (res.data?.success) {
        dispatch(updateConversationDisappearingInRedux({ conversationId, disappearingMessages: res.data.disappearingMessages }));
        snackbar.success(res.data.disappearingMessages?.enabled ? "Disappearing messages on" : "Disappearing messages off");
      }
    } catch {
      snackbar.error("Failed to update");
    }
  };

  const handleToggleVanishMode = async () => {
    try {
      const res = await api.patch(`/conversation/vanish/${conversationId}`);
      if (res.data?.success) {
        dispatch(toggleVanish(conversationId));
        snackbar.success(res.data.vanishMode ? "Vanish Mode turned ON 👻" : "Vanish Mode turned OFF");
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to toggle Vanish Mode");
    }
  };

  const handleDeleteChat = async () => {
    try {
      const res = await api.delete(`/conversation/delete/${conversationId}`);
      if (res.data?.success) {
        dispatch(removeConversationInRedux(conversationId));
        snackbar.success("Chat deleted 🗑️");
        onClose();
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to delete chat");
    }
  };

  const handleClearChat = async () => {
    try {
      const res = await api.delete(`/conversation/clear/${conversationId}`);
      if (res.data?.success) {
        dispatch(clearMessagesInRedux(conversationId));
        snackbar.success("Chat history cleared 🧹");
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to clear chat");
    }
  };

  const handleBlockUser = async () => {
    if (!otherUser?._id) return;
    try {
      const res = await api.patch(`/conversation/block/${conversationId}`);
      if (res.data?.success) {
        snackbar.success(res.data.blocked ? `Blocked @${otherUser?.userName} 🚫` : `Unblocked @${otherUser?.userName}`);
        onClose();
        window.location.href = "/messages";
      }
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to toggle block status");
    }
  };

  const isMuted = Boolean(conversation?.isMuted);
  const isArchived = Boolean(conversation?.isArchived);
  const rawMembers = details?.participants || conversation?.participants || [];
  const members = Array.isArray(rawMembers) ? rawMembers : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface-overlay backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md h-full bg-surface-inset border-l border-border flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-bold text-text">Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-surface-hover transition cursor-pointer">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Profile Section */}
        <div className="flex flex-col items-center py-6 px-5 border-b border-border">
          {isGroup ? (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[2px] mb-3">
              <div className="w-full h-full rounded-full bg-surface flex items-center justify-center">
                <Users className="w-8 h-8 text-purple-300" />
              </div>
            </div>
          ) : (
            <img
              src={otherUser?.profileImage?.url || dp}
              alt=""
              onClick={() => {
                if (otherUser?.userName) {
                  onClose();
                  navigate(`/profile/${otherUser.userName}`);
                }
              }}
              className="w-20 h-20 rounded-full object-cover mb-3 cursor-pointer hover:opacity-85 transition active:scale-95 border-2 border-border shadow-md"
              title={`View @${otherUser?.userName}'s profile`}
            />
          )}

          <h3 
            onClick={() => {
              if (!isGroup && otherUser?.userName) {
                onClose();
                navigate(`/profile/${otherUser.userName}`);
              }
            }}
            className={`text-lg font-bold text-text flex items-center gap-1.5 ${!isGroup ? "cursor-pointer hover:underline" : ""}`}
          >
            <span>{isGroup ? details?.groupName || "Group Chat" : otherUser?.name || otherUser?.userName || "User"}</span>
          </h3>

          {!isGroup && otherUser?.userName && (
            <p className="text-xs text-text-secondary mt-0.5">@{otherUser.userName}</p>
          )}

          {isGroup && details?.description && (
            <p className="text-xs text-text-muted mt-1 text-center max-w-[280px]">{details.description}</p>
          )}

          {!isGroup && otherUser && (
            <p className="text-xs text-text-muted mt-0.5">
              {otherUser.isOnline ? "Active now" : otherUser.lastSeen ? `Active ${moment(otherUser.lastSeen).fromNow()}` : "Offline"}
            </p>
          )}

          {!isGroup && otherUser?.userName && (
            <button
              onClick={() => {
                onClose();
                navigate(`/profile/${otherUser.userName}`);
              }}
              className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-surface hover:bg-surface-hover border border-border text-xs font-bold text-text transition cursor-pointer active:scale-95 shadow-sm"
            >
              <User className="w-3.5 h-3.5 text-primary" />
              <span>View Profile</span>
              <ExternalLink className="w-3 h-3 text-text-muted" />
            </button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-1 px-5 py-4 border-b border-border">
          <button
            onClick={handleMute}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-surface transition cursor-pointer"
          >
            {isMuted ? <Volume2 className="w-5 h-5 text-text-secondary" /> : <VolumeX className="w-5 h-5 text-text-secondary" />}
            <span className="text-[11px] text-text-muted">{isMuted ? "Unmute" : "Mute"}</span>
          </button>
          <button
            onClick={handleArchive}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-surface transition cursor-pointer"
          >
            <Archive className="w-5 h-5 text-text-secondary" />
            <span className="text-[11px] text-text-muted">{isArchived ? "Unarchive" : "Archive"}</span>
          </button>
          <button
            onClick={() => snackbar.success("Reported chat to safety team.")}
            className="flex flex-col items-center gap-1.5 py-3 rounded-xl hover:bg-surface transition cursor-pointer"
          >
            <Flag className="w-5 h-5 text-text-secondary" />
            <span className="text-[11px] text-text-muted">Report</span>
          </button>
        </div>

        {/* Disappearing Messages */}
        <div className="px-5 py-4 border-b border-border">
          {/* Disappearing Messages with duration picker */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 py-2">
              <Clock className="w-5 h-5 text-text-secondary" />
              <div>
                <p className="text-sm text-text font-medium">Disappearing messages</p>
                <p className="text-[11px] text-text-muted">
                  {conversation?.disappearingMessages?.enabled
                    ? `On (${conversation.disappearingMessages.duration <= 86400 ? "24 hours" : conversation.disappearingMessages.duration <= 604800 ? "7 days" : "90 days"})`
                    : "Off"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pl-8">
              {[
                { label: "24h", value: 86400 },
                { label: "7d", value: 604800 },
                { label: "90d", value: 7776000 },
              ].map((opt) => {
                const isActive = conversation?.disappearingMessages?.enabled && conversation.disappearingMessages.duration === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleDisappearing(opt.value)}
                    className={`px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                      isActive
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                        : "bg-surface text-text-secondary border border-border hover:bg-surface-hover hover:text-text"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
              {conversation?.disappearingMessages?.enabled && (
                <button
                  onClick={() => handleDisappearing(null)}
                  className="px-3.5 py-1.5 text-[11px] font-bold rounded-lg bg-surface text-red-400 border border-border hover:bg-red-500/10 hover:border-red-500/30 transition cursor-pointer"
                >
                  Off
                </button>
              )}
            </div>
          </div>

          {/* Vanish Mode Option */}
          <div className="flex items-center justify-between py-2 border-t border-border mt-3 pt-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-rose-400" />
              <div>
                <p className="text-sm text-text font-medium">Vanish mode</p>
                <p className="text-[11px] text-text-muted">Messages disappear when you close the chat.</p>
              </div>
            </div>
            <button
              onClick={handleToggleVanishMode}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                conversation?.vanishMode ? "bg-rose-500" : "bg-border-strong"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-text shadow ring-0 transition duration-200 ease-in-out ${
                  conversation?.vanishMode ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <button
            onClick={() => setShowThemePicker(true)}
            className="w-full flex items-center justify-between py-2 mt-2 cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-text font-medium">Theme & Customization</p>
                <p className="text-[11px] text-text-muted capitalize">{activeTheme || "Default Gradient"}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition" />
          </button>

          <button className="w-full flex items-center justify-between py-2 cursor-pointer group">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-text-secondary" />
              <div>
                <p className="text-sm text-text font-medium">Encryption</p>
                <p className="text-[11px] text-text-muted">Messages are end-to-end encrypted</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition" />
          </button>
        </div>

        {/* Group Members */}
        {isGroup && members.length > 0 && (
          <div className="px-5 py-4 border-b border-border">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
              Members · {members.length}
            </h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto hide-scrollbar">
              {members.map((m, idx) => {
                const memberObj = typeof m === "object" && m !== null ? m : { _id: m };
                const memberId = memberObj._id || memberObj.id || m;
                const isAdmin = details?.admins?.some((a) => a && (a.user?._id || a.user)?.toString() === memberId?.toString());
                const isOwnerRole = details?.admins?.some((a) => a && (a.user?._id || a.user)?.toString() === memberId?.toString() && a.role === "owner");

                return (
                  <div
                    key={memberId || idx}
                    onClick={() => {
                      if (memberObj.userName) {
                        onClose();
                        navigate(`/profile/${memberObj.userName}`);
                      }
                    }}
                    className="flex items-center gap-3 py-1.5 px-2 rounded-xl hover:bg-surface transition cursor-pointer group"
                    title={`View @${memberObj.userName || "User"}'s profile`}
                  >
                    <img
                      src={memberObj.profileImage?.url || dp}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-border group-hover:border-primary/50 transition"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text font-medium truncate group-hover:underline flex items-center gap-1">
                        <span>{memberObj.name || memberObj.userName || "User"}</span>
                        {memberId?.toString() === currentUserId?.toString() && <span className="text-text-muted text-xs font-normal">(You)</span>}
                      </p>
                      <p className="text-[11px] text-text-secondary truncate">
                        @{memberObj.userName || "user"}
                        {isOwnerRole && <span className="text-[10px] text-amber-400 font-semibold ml-2">Owner</span>}
                        {isAdmin && !isOwnerRole && <span className="text-[10px] text-blue-400 font-semibold ml-2">Admin</span>}
                      </p>
                    </div>
                    {memberObj.isOnline && (
                      <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shared Media */}
        <div className="px-5 py-4">
          <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
            Shared Media
          </h4>

          <div className="flex gap-1 mb-3 overflow-x-auto hide-scrollbar">
            {MEDIA_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveMediaTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                  activeMediaTab === tab.id
                    ? "bg-surface-hover text-text font-bold"
                    : "text-text-muted hover:text-text hover:bg-surface"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {loadingMedia ? (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-surface-hover rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (() => {
            const items = [];
            sharedMedia.forEach((msg) => {
              // 1. Direct media array in content.media
              if (Array.isArray(msg?.content?.media) && msg.content.media.length > 0) {
                msg.content.media.forEach((m, idx) => {
                  if (m && m.url) {
                    items.push({
                      id: `${msg._id}-${idx}`,
                      messageId: msg._id,
                      url: m.url,
                      type: m.type || msg.type || "image",
                      name: m.name || "Attachment",
                      size: m.size,
                      createdAt: msg.createdAt,
                    });
                  }
                });
              } else if (msg?.content?.media?.url) {
                items.push({
                  id: `${msg._id}-0`,
                  messageId: msg._id,
                  url: msg.content.media.url,
                  type: msg.content.media.type || msg.type || "image",
                  name: msg.content.media.name || "Attachment",
                  size: msg.content.media.size,
                  createdAt: msg.createdAt,
                });
              }

              // 2. Shared Data media (shared post, reel, story)
              const sharedUrl = msg?.content?.sharedData?.mediaUrl || msg?.sharedData?.mediaUrl;
              if (sharedUrl) {
                items.push({
                  id: `${msg._id}-shared`,
                  messageId: msg._id,
                  url: sharedUrl,
                  type: msg.type?.includes("reel") || msg.type?.includes("video") ? "video" : "image",
                  name: msg.content?.sharedData?.caption || "Shared Post",
                  createdAt: msg.createdAt,
                });
              }

              // 3. Link items
              if (activeMediaTab === "link") {
                const linkUrl = msg?.content?.linkPreview?.url || (msg?.content?.text?.match(/https?:\/\/[^\s]+/i)?.[0]);
                if (linkUrl) {
                  let hostname = "";
                  try {
                    hostname = new URL(linkUrl).hostname.replace(/^www\./, "");
                  } catch (e) {
                    hostname = linkUrl;
                  }
                  items.push({
                    id: `${msg._id}-link`,
                    messageId: msg._id,
                    url: linkUrl,
                    type: "link",
                    title: msg?.content?.linkPreview?.title || linkUrl,
                    description: msg?.content?.linkPreview?.description || "",
                    image: msg?.content?.linkPreview?.image || null,
                    siteName: msg?.content?.linkPreview?.siteName || hostname,
                    createdAt: msg.createdAt,
                  });
                }
              }
            });

            // Filter for current tab
            let displayItems = items;
            if (activeMediaTab === "image") {
              displayItems = items.filter((it) => it.type === "image" || it.type === "sticker" || !it.type);
            } else if (activeMediaTab === "video") {
              displayItems = items.filter((it) => it.type === "video");
            } else if (activeMediaTab === "file") {
              displayItems = items.filter((it) => it.type === "file" || it.type === "document" || it.type === "audio");
            } else if (activeMediaTab === "link") {
              displayItems = items.filter((it) => it.type === "link");
            }

            if (displayItems.length === 0) {
              return (
                <div className="text-center py-8">
                  <p className="text-xs text-text-muted">No shared {activeMediaTab}s yet</p>
                </div>
              );
            }

            if (activeMediaTab === "link") {
              return (
                <div className="space-y-2 max-h-[300px] overflow-y-auto hide-scrollbar">
                  {displayItems.map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-border transition group"
                    >
                      {item.image ? (
                        <img src={item.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-surface-inset flex items-center justify-center shrink-0">
                          <Link2 className="w-5 h-5 text-text-muted" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text truncate group-hover:text-blue-400 transition">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-text-muted truncate">{item.siteName}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-text-muted group-hover:text-text shrink-0 transition" />
                    </a>
                  ))}
                </div>
              );
            }

            if (activeMediaTab === "file") {
              return (
                <div className="space-y-2 max-h-[300px] overflow-y-auto hide-scrollbar">
                  {displayItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-surface border border-border hover:bg-surface-hover transition"
                    >
                      <div className="w-10 h-10 rounded-lg bg-surface-inset flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-rose-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text truncate">{item.name}</p>
                        <p className="text-[10px] text-text-muted">
                          {item.size ? `${(item.size / 1024).toFixed(1)} KB` : "Document"}
                        </p>
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="p-2 rounded-lg hover:bg-surface text-text-muted hover:text-text transition"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              );
            }

            return (
              <div className="grid grid-cols-3 gap-1 max-h-[350px] overflow-y-auto hide-scrollbar">
                {displayItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setLightboxData({ open: true, url: item.url, type: item.type === "video" ? "video" : "image" })}
                    className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition relative bg-surface border border-border/40 group"
                  >
                    {item.type === "video" ? (
                      <>
                        <video src={item.url} className="w-full h-full object-cover" muted preload="metadata" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white drop-shadow-md fill-white" />
                        </div>
                      </>
                    ) : (
                      <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Danger Zone */}
        <div className="px-5 py-4 mt-auto border-t border-border space-y-1">
          {!isGroup && (
            <>
              <button
                onClick={handleClearChat}
                className="w-full flex items-center gap-3 py-2 text-text hover:bg-surface/50 rounded-lg transition cursor-pointer px-2"
              >
                <Clock className="w-4.5 h-4.5 text-amber-500" />
                <span className="text-xs font-medium">Clear Chat History</span>
              </button>
              <button
                onClick={handleBlockUser}
                className="w-full flex items-center gap-3 py-2 text-red-400 hover:bg-surface/50 rounded-lg transition cursor-pointer px-2"
              >
                <Shield className="w-4.5 h-4.5" />
                <span className="text-xs font-medium">
                  {conversation?.blockedBy?.some((id) => id.toString() === currentUserId) ? "Unblock" : "Block"} @{otherUser?.userName || "User"}
                </span>
              </button>
              <button
                onClick={handleDeleteChat}
                className="w-full flex items-center gap-3 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer px-2 font-bold"
              >
                <Trash2 className="w-4.5 h-4.5" />
                <span className="text-xs">Delete Chat</span>
              </button>
            </>
          )}
          {isGroup && (
            <button
              onClick={handleDeleteChat}
              className="w-full flex items-center gap-3 py-3 text-red-400 hover:bg-surface/50 rounded-lg transition cursor-pointer px-2"
            >
              <UserMinus className="w-5 h-5" />
              <span className="text-sm font-medium">Leave & Delete Group</span>
            </button>
          )}
        </div>
      </div>

      {/* Theme Picker Modal */}
      <ChatThemePickerModal
        isOpen={showThemePicker}
        onClose={() => setShowThemePicker(false)}
        conversationId={conversationId}
        currentTheme={activeTheme}
        onThemeChanged={(newTheme) => {
          setActiveTheme(newTheme);
          dispatch(updateConversationThemeInRedux({ conversationId, theme: newTheme }));
        }}
      />

      {/* Fullscreen Media Lightbox */}
      <MediaLightboxModal
        isOpen={lightboxData.open}
        onClose={() => setLightboxData({ open: false, url: null, type: "image" })}
        mediaUrl={lightboxData.url}
        mediaType={lightboxData.type}
      />
    </div>
  );
};

export default ChatInfoDrawer;
