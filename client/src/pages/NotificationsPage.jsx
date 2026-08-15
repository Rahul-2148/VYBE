import React, { useEffect, useState } from "react";
import { Heart, MessageSquare, UserPlus, ArrowLeft, Check, Bell, Settings, Phone, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import moment from "moment";
import { toast } from "sonner";
import dp from "../assets/dp3.png";
import FollowButton from "../components/FollowButton";
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
  const [activeTab, setActiveTab] = useState("activity"); // 'activity' or 'settings'
  const [settings, setSettings] = useState({
    pauseAll: false,
    likes: "everyone",
    comments: "everyone",
    newFollowers: true,
    directMessages: true,
  });

  async function fetchNotifications(pageNo = 1, append = false) {
    try {
      if (pageNo === 1) setLoading(true);
      let url = `/notification/feed?limit=30`;
      if (append && notifications.length > 0) {
        const oldestNotif = notifications[notifications.length - 1];
        url += `&before=${encodeURIComponent(oldestNotif.createdAt)}`;
      } else {
        url += `&page=${pageNo}`;
      }
      const res = await api.get(url);
      if (res.data.success) {
        const fetched = res.data.notifications || [];
        setNotifications((prev) => (append ? [...prev, ...fetched] : fetched));
        setHasMore(res.data.hasMore !== false && fetched.length === 30);
      }
    } catch (e) {
      toast.error("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchFollowRequests() {
    try {
      const res = await api.get("/user/follow-requests");
      if (res.data.success) {
        setRequests(res.data.requests || []);
      }
    } catch (e) {
      console.warn("NotificationsPage: fetchFollowRequests failed", e);
    }
  }

  async function markAsRead() {
    try {
      await api.post("/notification/read");
      dispatch(clearUnreadNotifications());
    } catch (e) {
      console.warn("NotificationsPage: markAsRead failed", e);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      await fetchNotifications(1);
      if (!active) return;
      await fetchFollowRequests();
      if (!active) return;
      await markAsRead();
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNotification = ({ notification }) => {
      setNotifications((prev) => [notification, ...prev]);
    };

    socket.on("notification-received", handleNotification);
    return () => socket.off("notification-received", handleNotification);
  }, []);

  const handleLoadMore = () => {
    triggerHaptic("light");
    const next = page + 1;
    setPage(next);
    fetchNotifications(next, true);
  };

  const handleAction = async (targetUserId, action) => {
    triggerHaptic("medium");
    try {
      const res = await api.post(`/user/follow-request/${targetUserId}`, { action });
      if (res.data.success) {
        toast.success(action === "accept" ? "Follow request accepted" : "Follow request declined");
        setRequests((prev) => prev.filter((u) => u._id !== targetUserId));
      }
    } catch (e) {
      toast.error("Action failed.");
    }
  };

  const handleSaveSettings = async (newSettings) => {
    triggerHaptic("light");
    setSettings(newSettings);
    try {
      await api.put("/user/notification-preferences", newSettings);
      toast.success("Preferences updated.");
    } catch {
      toast.error("Failed to update preferences.");
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
        <div className="space-y-6">
          {requests.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface border border-rose-500/30 rounded-3xl p-5 space-y-4 shadow-xl text-left relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent animate-instagram-light-bar" />

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
                      <NotificationItem key={item._id || i} notif={item} navigate={navigate} isFresh={!item.read} />
                    ))}
                  </div>
                </div>
              )}

              {earlierNotifs.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Earlier</h3>
                  <div className="space-y-2">
                    {earlierNotifs.map((item, i) => (
                      <NotificationItem key={item._id || i} notif={item} navigate={navigate} isFresh={false} />
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
    </div>
  );
};

const NotificationItem = ({ notif, navigate, isFresh }) => {
  const sender = notif.sender;
  if (!sender) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex items-center justify-between p-3.5 bg-surface/70 hover:bg-surface border rounded-2xl transition overflow-hidden ${
        isFresh ? "border-rose-500/40 shadow-sm" : "border-border/80"
      }`}
    >
      {isFresh && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent animate-instagram-light-bar" />
      )}

      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="relative shrink-0">
          <img
            src={sender.profileImage?.url || dp}
            alt=""
            className="w-10 h-10 rounded-full object-cover border border-border cursor-pointer shrink-0 interactive-tap"
            onClick={() => {
              triggerHaptic("light");
              navigate(`/profile/${sender.userName}`);
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
                navigate(`/profile/${sender.userName}`);
              }}
            >
              @{sender.userName}
            </span>{" "}
            {notif.type === "like" && "liked your post."}
            {notif.type === "comment" && `commented: "${notif.commentText}"`}
            {notif.type === "follow" && "started following you."}
            {notif.type === "mention" && "mentioned you in a caption."}
            {notif.type === "call" && `called you: ${notif.commentText || "Voice/Video Call"}`}
          </p>
          <p className="text-[10px] text-text-muted">{moment(notif.createdAt).fromNow()}</p>
        </div>
      </div>

      {notif.type === "follow" ? (
        <FollowButton
          targetUserId={sender._id}
          tailwind="px-4 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-full shadow shrink-0 ml-3 interactive-tap"
        />
      ) : notif.type === "call" ? (
        <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full shrink-0 ml-3">
          <Phone className="w-4 h-4" />
        </div>
      ) : notif.post?.media?.url ? (
        <img 
          src={notif.post.media.url} 
          alt="" 
          className="w-10 h-10 rounded-xl object-cover border border-border shrink-0 ml-3 cursor-pointer hover:scale-105 transition" 
          onClick={() => {
            triggerHaptic("light");
            if (notif.post?._id) navigate(`/post/${notif.post._id}`);
          }}
        />
      ) : null}
    </motion.div>
  );
};

export default NotificationsPage;
