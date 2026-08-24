import React, { useEffect, useState, useCallback } from "react";
import { Heart, MessageSquare, ArrowLeft, Bell, Phone, Sparkles, X, CheckCheck, Trash2, UserPlus, AtSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import moment from "moment";
import { snackbar } from "../lib/snackbar";
import dp from "../assets/dp3.png";
import FollowButton from "../components/FollowButton";
import Navbar from "../components/Navbar";
import ConfirmDialogModal from "../components/ConfirmDialogModal";
import api from "../lib/axios";
import { getSocket } from "../lib/socket";
import { triggerHaptic } from "../lib/interactiveEffects";
import { clearUnreadNotifications } from "../redux/features/notificationSlice";

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [notifications, setNotifications] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [clearing, setClearing] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [activeTab, setActiveTab] = useState("activity"); // 'activity' or 'settings'
  const [settings, setSettings] = useState({
    pauseAll: false,
    likes: "everyone",
    comments: "everyone",
    newFollowers: true,
    directMessages: true,
  });

  const fetchNotifications = useCallback(async (pageNo = 1, append = false, filterType = selectedFilter) => {
    try {
      if (pageNo === 1 && !append) setLoading(true);
      const filterQuery = filterType && filterType !== "all" ? `&type=${filterType}` : "";
      const url = `/notification/feed?limit=30&page=${pageNo}${filterQuery}`;
      const res = await api.get(url);
      if (res.data?.success) {
        const fetched = res.data.notifications || [];
        setNotifications((prev) => (append ? [...prev, ...fetched] : fetched));
        setHasMore(res.data.hasMore !== false && fetched.length === 30);
      }
    } catch {
      snackbar.error("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [selectedFilter]);

  const fetchFollowRequests = useCallback(async () => {
    try {
      const res = await api.get("/user/follow-requests");
      if (res.data?.success) {
        setRequests(res.data.requests || []);
      }
    } catch (e) {
      console.warn("NotificationsPage: fetchFollowRequests failed", e);
    }
  }, []);

  const markAsRead = useCallback(async () => {
    try {
      await api.post("/notification/read");
      dispatch(clearUnreadNotifications());
    } catch (e) {
      console.warn("NotificationsPage: markAsRead failed", e);
    }
  }, [dispatch]);

  useEffect(() => {
    let active = true;
    const initData = async () => {
      await fetchNotifications(1, false);
      if (!active) return;
      await fetchFollowRequests();
      if (!active) return;
      await markAsRead();
    };
    initData();
    return () => {
      active = false;
    };
  }, [fetchNotifications, fetchFollowRequests, markAsRead]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNotification = (data) => {
      const notif = data?.notification || data;
      if (notif && notif._id) {
        setNotifications((prev) => {
          if (prev.some((n) => n._id === notif._id)) return prev;
          return [notif, ...prev];
        });
        if (notif.type === "follow_request" && notif.sender) {
          setRequests((prev) => {
            const senderObj = typeof notif.sender === "object" ? notif.sender : { _id: notif.sender };
            if (prev.some((u) => (u._id || u).toString() === senderObj._id.toString())) return prev;
            return [senderObj, ...prev];
          });
        }
      }
    };

    socket.on("notification-received", handleNotification);
    socket.on("new-notification", handleNotification);
    socket.on("notification:received", handleNotification);

    return () => {
      socket.off("notification-received", handleNotification);
      socket.off("new-notification", handleNotification);
      socket.off("notification:received", handleNotification);
    };
  }, []);

  const handleLoadMore = () => {
    triggerHaptic("light");
    const next = page + 1;
    setPage(next);
    fetchNotifications(next, true, selectedFilter);
  };

  const handleAction = async (targetUserId, action) => {
    triggerHaptic("medium");
    try {
      const res = await api.post(`/user/follow-request/${targetUserId}`, {
        action,
        senderId: targetUserId,
      });
      if (res.data?.success) {
        snackbar.success(action === "accept" ? "Follow request accepted" : "Follow request declined");
        setRequests((prev) => prev.filter((u) => (u._id || u).toString() !== targetUserId.toString()));
      }
    } catch {
      snackbar.error("Action failed.");
    }
  };

  const handleClearAll = async () => {
    triggerHaptic("medium");
    if (notifications.length === 0) {
      setShowClearConfirmModal(false);
      return;
    }
    try {
      setClearing(true);
      const filterQuery = selectedFilter !== "all" ? `?type=${selectedFilter}` : "";
      const res = await api.delete(`/notification/clear-all${filterQuery}`);
      if (res.data?.success) {
        snackbar.success(selectedFilter === "all" ? "All notifications cleared" : `${selectedFilter} notifications cleared`);
        setNotifications([]);
      }
    } catch {
      snackbar.error("Failed to clear notifications");
    } finally {
      setClearing(false);
      setShowClearConfirmModal(false);
    }
  };


  const handleDeleteNotification = async (notificationId, e) => {
    if (e) e.stopPropagation();
    triggerHaptic("light");
    setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    try {
      await api.delete(`/notification/${notificationId}`);
    } catch (err) {
      console.warn("Delete notification failed:", err);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    triggerHaptic("light");
    setSettings(newSettings);
    try {
      await api.put("/user/notification-preferences", newSettings);
      snackbar.success("Preferences updated.");
    } catch {
      snackbar.error("Failed to update preferences.");
    }
  };

  const todayNotifs = notifications.filter((n) => moment(n.createdAt).isSame(moment(), "day"));
  const earlierNotifs = notifications.filter((n) => !moment(n.createdAt).isSame(moment(), "day"));

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-8 max-w-3xl mx-auto space-y-6 select-none">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              triggerHaptic("light");
              navigate(-1);
            }} 
            className="p-2 text-text-secondary hover:text-text rounded-full hover:bg-surface-hover transition cursor-pointer interactive-tap"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Notifications & Activity</h1>
            <p className="text-xs text-text-secondary">Stay updated with your community in real time</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("activity");
            }}
            className={`py-1.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer interactive-tap ${
              activeTab === "activity" ? "bg-rose-600 text-white shadow-lg" : "text-text-secondary hover:text-text bg-surface border border-border"
            }`}
          >
            Activity Feed
          </button>
          <button
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("settings");
            }}
            className={`py-1.5 px-4 rounded-xl text-xs font-bold transition cursor-pointer interactive-tap ${
              activeTab === "settings" ? "bg-rose-600 text-white shadow-lg" : "text-text-secondary hover:text-text bg-surface border border-border"
            }`}
          >
            Preferences
          </button>
        </div>
      </div>

      {activeTab === "activity" ? (
        <div className="space-y-4">
          {/* Category Filter Chips & Batch Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-1">
              {[
                { id: "all", label: "All" },
                { id: "likes", label: "Likes", icon: Heart },
                { id: "comments", label: "Comments", icon: MessageSquare },
                { id: "follows", label: "Follows", icon: UserPlus },
                { id: "mentions", label: "Mentions", icon: AtSign },
                { id: "calls", label: "Calls", icon: Phone },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = selectedFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setSelectedFilter(tab.id);
                      setPage(1);
                      fetchNotifications(1, false, tab.id);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-rose-600 text-white shadow-md shadow-rose-600/20 font-bold scale-105"
                        : "bg-surface hover:bg-surface-hover text-text-secondary hover:text-text border border-border"
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Actions: Mark Read & Clear All (Animated Hide/Show) */}
            <AnimatePresence mode="wait">
              {notifications.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, x: 8 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.92, x: 8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex items-center gap-2 shrink-0"
                >
                  <button
                    type="button"
                    onClick={markAsRead}
                    className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-surface-hover text-text-secondary hover:text-text border border-border text-[11px] font-medium transition cursor-pointer flex items-center gap-1 active:scale-95"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mark Read</span>
                  </button>

                  <button
                    type="button"
                    disabled={clearing}
                    onClick={() => setShowClearConfirmModal(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-surface hover:bg-rose-500/10 text-rose-400 border border-border text-[11px] font-medium transition cursor-pointer flex items-center gap-1 active:scale-95"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{clearing ? "Clearing..." : "Clear All"}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {requests.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-rose-500/30 rounded-3xl p-5 space-y-4 shadow-xl text-left relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent animate-vybe-light-bar" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-sm font-bold text-text">Follow Requests</span>
                </div>
                <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-400">
                  {requests.length} pending
                </span>
              </div>

              <div className="divide-y divide-border/50">
                {requests.map((reqUser) => (
                  <div key={reqUser._id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={reqUser.profileImage?.url || dp}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-border cursor-pointer shrink-0 interactive-tap"
                        onClick={() => {
                          triggerHaptic("light");
                          navigate(`/profile/${reqUser.userName}`);
                        }}
                      />
                      <div className="text-xs truncate">
                        <p
                          className="font-bold text-text truncate cursor-pointer hover:underline"
                          onClick={() => {
                            triggerHaptic("light");
                            navigate(`/profile/${reqUser.userName}`);
                          }}
                        >
                          @{reqUser.userName}
                        </p>
                        <p className="text-[10px] text-text-secondary truncate">{reqUser.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <button
                        onClick={() => handleAction(reqUser._id, "accept")}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer interactive-tap"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleAction(reqUser._id, "decline")}
                        className="px-3.5 py-1.5 bg-surface-inset hover:bg-surface border border-border text-text-secondary font-bold text-xs rounded-xl transition cursor-pointer interactive-tap"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {loading ? (
            <div className="text-center py-20 text-text-muted">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading activity feed...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-20 text-text-muted text-sm space-y-2">
              <Bell className="w-10 h-10 mx-auto text-text-muted mb-2 animate-bounce" />
              <p className="font-bold text-text-secondary">No activity yet</p>
              <p className="text-xs">When people like your posts, comment, or follow you, you'll see it here.</p>
            </div>
          ) : (
            <>
              {todayNotifs.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Today
                  </h3>
                  <div className="space-y-2">
                    {todayNotifs.map((item, i) => (
                      <NotificationItem
                        key={item._id || i}
                        notif={item}
                        navigate={navigate}
                        isFresh={!item.read && !item.isRead}
                        onFollowChange={() => fetchNotifications(1, false)}
                        onDelete={(e) => handleDeleteNotification(item._id, e)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {earlierNotifs.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Earlier</h3>
                  <div className="space-y-2">
                    {earlierNotifs.map((item, i) => (
                      <NotificationItem
                        key={item._id || i}
                        notif={item}
                        navigate={navigate}
                        isFresh={false}
                        onFollowChange={() => fetchNotifications(1, false)}
                        onDelete={(e) => handleDeleteNotification(item._id, e)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  className="w-full py-2.5 bg-surface hover:bg-surface-hover border border-border text-text text-xs font-bold rounded-2xl transition cursor-pointer interactive-tap"
                >
                  Load More Activities
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6 bg-surface border border-border rounded-3xl p-6">
          <h3 className="text-lg font-bold">Push Notification Settings</h3>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-surface-inset rounded-2xl border border-border">
              <div>
                <p className="font-bold text-text">Pause All Notifications</p>
                <p className="text-text-secondary">Temporarily mute all push notifications.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.pauseAll}
                onChange={(e) => handleSaveSettings({ ...settings, pauseAll: e.target.checked })}
                className="w-5 h-5 accent-rose-500 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-inset rounded-2xl border border-border">
              <div>
                <p className="font-bold text-text">New Followers</p>
                <p className="text-text-secondary">Notify when someone follows your account.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.newFollowers}
                onChange={(e) => handleSaveSettings({ ...settings, newFollowers: e.target.checked })}
                className="w-5 h-5 accent-rose-500 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-inset rounded-2xl border border-border">
              <div>
                <p className="font-bold text-text">Direct Messages</p>
                <p className="text-text-secondary">Notify on new incoming direct messages.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.directMessages}
                onChange={(e) => handleSaveSettings({ ...settings, directMessages: e.target.checked })}
                className="w-5 h-5 accent-rose-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <Navbar />

      {/* Confirmation Dialog Modal */}
      <ConfirmDialogModal
        isOpen={showClearConfirmModal}
        title={selectedFilter === "all" ? "Clear All Notifications?" : `Clear ${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Notifications?`}
        message={`Are you sure you want to permanently clear ${selectedFilter === "all" ? "all your notifications" : `all ${selectedFilter} notifications`}? This action cannot be undone.`}
        confirmLabel="Clear All"
        cancelLabel="Cancel"
        loading={clearing}
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirmModal(false)}
      />
    </div>
  );
};

const NotificationItem = ({ notif, navigate, isFresh, onFollowChange, onDelete }) => {

  if (!notif) return null;
  const sender = typeof notif.sender === "object" && notif.sender !== null ? notif.sender : null;
  if (!sender) return null;

  const senderName = sender.userName || sender.name || "user";
  const senderAvatar = sender.profileImage?.url || (typeof sender.profileImage === "string" ? sender.profileImage : dp);

  const mediaThumb =
    notif.post?.media?.url ||
    (typeof notif.post?.media === "string" ? notif.post.media : null) ||
    notif.post?.mediaItems?.[0]?.url ||
    notif.reel?.media?.url ||
    (typeof notif.reel?.media === "string" ? notif.reel.media : null) ||
    null;

  const postTargetId = notif.post?._id || (typeof notif.post === "string" ? notif.post : null);
  const reelTargetId = notif.reel?._id || (typeof notif.reel === "string" ? notif.reel : null);

  const handleMediaClick = () => {
    triggerHaptic("light");
    if (postTargetId) navigate(`/post/${postTargetId}`);
    else if (reelTargetId) navigate(`/reel/${reelTargetId}`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex items-center justify-between p-3.5 bg-surface/70 hover:bg-surface border rounded-2xl transition overflow-hidden ${
        isFresh ? "border-rose-500/40 shadow-sm" : "border-border/80"
      }`}
    >
      {isFresh && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent animate-vybe-light-bar" />
      )}

      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="relative shrink-0">
          <img
            src={senderAvatar}
            alt=""
            className="w-10 h-10 rounded-full object-cover border border-border cursor-pointer shrink-0 interactive-tap"
            onClick={() => {
              triggerHaptic("light");
              navigate(`/profile/${senderName}`);
            }}
          />
          {isFresh && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-surface animate-ping" />
          )}
        </div>
        <div className="text-xs truncate space-y-0.5">
          <p className="text-text font-medium truncate">
            <span 
              className="font-bold cursor-pointer hover:underline" 
              onClick={() => {
                triggerHaptic("light");
                navigate(`/profile/${senderName}`);
              }}
            >
              @{senderName}
            </span>{" "}
            {notif.type === "like" && "liked your post."}
            {notif.type === "comment" && `commented: "${notif.commentText || "nice!"}"`}
            {notif.type === "follow" && "started following you."}
            {notif.type === "follow_accept" && "accepted your follow request."}
            {notif.type === "mention" && "mentioned you in a caption."}
            {notif.type === "contact_request" && "requested your contact phone number."}
            {notif.type === "call" && `called you: ${notif.commentText || "Voice/Video Call"}`}
          </p>
          <p className="text-[10px] text-text-muted">{moment(notif.createdAt).fromNow()}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {notif.type === "follow" || notif.type === "follow_accept" ? (
          <FollowButton
            targetUserId={sender._id}
            isFollowerProp={notif.type === "follow"}
            onFollowChange={onFollowChange}
          />
        ) : notif.type === "contact_request" ? (
          <button
            onClick={() => {
              triggerHaptic("light");
              navigate("/messages", { state: { targetUser: sender } });
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90 text-white font-bold text-xs rounded-full shadow shrink-0 ml-3 interactive-tap cursor-pointer"
            title="Open Chat to reply or share contact"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
        ) : notif.type === "call" ? (
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full shrink-0 ml-3">
            <Phone className="w-4 h-4" />
          </div>
        ) : mediaThumb ? (
          <img 
            src={mediaThumb} 
            alt="" 
            className="w-10 h-10 rounded-xl object-cover border border-border shrink-0 ml-3 cursor-pointer hover:scale-105 transition" 
            onClick={handleMediaClick}
          />
        ) : null}

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default NotificationsPage;
