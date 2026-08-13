import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ArrowLeft, Search, Pin, MessageSquare, Users, Send, Edit, X, Archive, Bell, BellOff, Trash2, Volume2, VolumeX, SlidersHorizontal, CheckCircle, MessageCircleReply, Star, UserCheck, UserPlus, Flag } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import ChatListItem from "../components/ChatListItem";
import CreateGroupModal from "../components/CreateGroupModal";
import NotesBar from "../components/NotesBar";
import MessageArea from "./MessageArea";
import api from "../lib/axios";
import { setConversations, setSelectedChatUser, togglePinInRedux, toggleMuteInRedux, toggleArchiveInRedux, removeConversationInRedux } from "../redux/features/messageSlice";
import { toast } from "sonner";

const INBOX_TABS = [
  { id: "primary", label: "Primary", icon: "💬" },
  { id: "general", label: "General", icon: "👥" },
  { id: "requests", label: "Requests", icon: "📩" },
];

const FILTER_OPTIONS = [
  { id: "all", label: "All", icon: null },
  { id: "unread", label: "Unread", icon: "🔵" },
  { id: "unanswered", label: "Unanswered", icon: "💬" },
  { id: "groups", label: "Groups", icon: "👥" },
  { id: "verified", label: "Verified", icon: "✓" },
  { id: "following", label: "Following", icon: "👤" },
  { id: "flagged", label: "Flagged", icon: "🚩" },
];

/* ============ SKELETON LOADER ============ */
const ChatSkeleton = () => (
  <div className="animate-pulse flex items-center gap-3.5 px-4 py-3.5">
    <div className="w-13 h-13 rounded-full bg-surface-hover shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3.5 bg-surface-hover rounded-full w-3/5" />
      <div className="h-2.5 bg-surface-hover/60 rounded-full w-4/5" />
    </div>
    <div className="h-2.5 bg-surface-hover rounded w-8 shrink-0" />
  </div>
);

/* ============ FILTER DROPDOWN ============ */
const FilterDropdown = ({ isOpen, onClose, activeFilter, onSelectFilter }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border rounded-2xl shadow-2xl py-2 min-w-[200px] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
        <p className="px-4 py-1.5 text-[10px] font-black text-text-muted uppercase tracking-widest">Filter messages</p>
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => { onSelectFilter(filter.id); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition cursor-pointer ${
              activeFilter === filter.id
                ? "text-text bg-surface-hover"
                : "text-text-secondary hover:text-text hover:bg-surface-hover/60"
            }`}
          >
            {filter.icon && <span className="text-sm">{filter.icon}</span>}
            <span>{filter.label}</span>
            {activeFilter === filter.id && (
              <CheckCircle className="w-3.5 h-3.5 text-blue-400 ml-auto" />
            )}
          </button>
        ))}
      </div>
    </>
  );
};

/* ============ CONTEXT MENU ============ */
const ConversationContextMenu = ({ position, chat, onClose, onAction }) => {
  if (!position) return null;

  const actions = [
    { id: "pin", label: chat.isPinned ? "Unpin" : "Pin", icon: <Pin className="w-4 h-4" />, color: "text-yellow-400" },
    { id: "mute", label: chat.isMuted ? "Unmute" : "Mute", icon: chat.isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />, color: "text-blue-400" },
    { id: "archive", label: chat.isArchived ? "Unarchive" : "Archive", icon: <Archive className="w-4 h-4" />, color: "text-purple-400" },
    { id: "delete", label: "Delete Chat", icon: <Trash2 className="w-4 h-4" />, color: "text-red-400" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-surface border border-border rounded-2xl shadow-2xl py-2 min-w-[180px] backdrop-blur-xl"
        style={{ top: position.y, left: Math.min(position.x, window.innerWidth - 200) }}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => { onAction(action.id, chat); onClose(); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium hover:bg-surface-hover transition cursor-pointer ${action.color}`}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};

export const Messages = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((s) => s.user);
  const { conversations, selectedChatUser } = useSelector((s) => s.message);
  const currentUserId = userData?.user?._id || userData?._id;

  const [activeTab, setActiveTab] = useState("primary");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/message/conversations");
      if (res.data?.conversations) {
        dispatch(setConversations(res.data.conversations));
      }
    } catch (err) {
      console.warn(err);
      toast.error("Failed to load conversations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      await fetchConversations();
      if (!active) return;
    })();
    return () => {
      active = false;
    };
  }, []);

  // Sync active conversation from URL parameter
  useEffect(() => {
    if (!conversationId) return;

    if (
      selectedChatUser?.conversationId === conversationId &&
      selectedChatUser?.user?.userName &&
      selectedChatUser?.user?.userName !== "Chat" &&
      selectedChatUser?.user?.userName !== "User"
    ) {
      return;
    }

    if (conversations.length > 0) {
      const match = conversations.find((c) => (c._id || c.conversationId) === conversationId);
      if (match) {
        const isGroup = Boolean(match.isGroup);
        const participant = match.participant || match.participants?.find((p) => (p?._id || p)?.toString() !== currentUserId?.toString());
        dispatch(
          setSelectedChatUser({
            conversationId: match._id || match.conversationId,
            user: isGroup
              ? { isGroup: true, groupName: match.groupName || match.name, _id: match._id, participants: match.participants, admins: match.admins }
              : participant || { _id: conversationId, userName: "User" },
          })
        );
        return;
      }
    }

    // Set optimistic selected chat user while loading details
    dispatch(
      setSelectedChatUser({
        conversationId,
        user: { _id: conversationId, userName: "Chat" },
      })
    );

    // Fetch details directly if not in inbox array
    api.get(`/conversation/details/${conversationId}`).then((res) => {
      if (res.data?.conversation) {
        const conv = res.data.conversation;
        const isGroup = Boolean(conv.isGroup);
        const participant = conv.participant || conv.participants?.find((p) => (p?._id || p)?.toString() !== currentUserId?.toString());
        dispatch(
          setSelectedChatUser({
            conversationId: conv._id,
            user: isGroup
              ? { isGroup: true, groupName: conv.groupName || conv.name, _id: conv._id, participants: conv.participants, admins: conv.admins }
              : participant || { _id: conversationId, userName: "User" },
          })
        );
      }
    }).catch(() => {});
  }, [conversationId, conversations, currentUserId, dispatch]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let result = conversations;

    // Tab filtering
    if (activeTab === "primary") {
      result = result.filter((c) => !c.isGroup && !c.isArchived && c.requestStatus !== "pending");
    } else if (activeTab === "general") {
      result = result.filter((c) => c.isGroup && !c.isArchived);
    } else if (activeTab === "requests") {
      result = result.filter((c) => c.requestStatus === "pending");
    }

    // Archive filter
    if (showArchived) {
      result = conversations.filter((c) => c.isArchived);
    }

    // Advanced filter
    if (activeFilter !== "all") {
      switch (activeFilter) {
        case "unread":
          result = result.filter((c) => (c.unreadCount || 0) > 0);
          break;
        case "unanswered": {
          result = result.filter((c) => {
            const lastSender = c.lastMessage?.sender?._id || c.lastMessage?.sender;
            return lastSender && lastSender.toString() !== currentUserId?.toString();
          });
          break;
        }
        case "groups":
          result = result.filter((c) => c.isGroup);
          break;
        case "verified":
          result = result.filter((c) => {
            const p = c.participant;
            return p?.isVerified;
          });
          break;
        case "following":
          result = result.filter((c) => {
            const following = userData?.user?.following || userData?.following || [];
            const participantId = c.participant?._id;
            return participantId && following.includes(participantId);
          });
          break;
        case "flagged":
          result = result.filter((c) => c.isFlagged);
          break;
        default:
          break;
      }
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((c) => {
        const isGroup = Boolean(c.isGroup);
        const participant = c.participant || c.participants?.find((p) => (p?._id || p)?.toString() !== currentUserId?.toString());
        const titleMatch = isGroup
          ? (c.groupName || c.name || "").toLowerCase().includes(query)
          : (participant?.userName || participant?.name || "").toLowerCase().includes(query);
        const messageMatch = (c.lastMessage?.content?.text || "").toLowerCase().includes(query);
        return titleMatch || messageMatch;
      });
    }

    return result;
  }, [conversations, activeTab, activeFilter, searchQuery, currentUserId, showArchived, userData]);

  const pinnedConversations = filteredConversations.filter((c) => c.isPinned);
  const unpinnedConversations = filteredConversations.filter((c) => !c.isPinned);
  const archivedCount = conversations.filter((c) => c.isArchived).length;
  const requestCount = conversations.filter((c) => c.requestStatus === "pending").length;

  const isChatActive = Boolean(conversationId || selectedChatUser?.conversationId);

  // Context menu actions
  const handleContextAction = useCallback(async (actionId, chat) => {
    try {
      if (actionId === "pin") {
        const res = await api.patch(`/conversation/pin/${chat._id}`);
        if (res.data.success) {
          dispatch(togglePinInRedux({ conversationId: chat._id, pinned: res.data.pinned }));
          toast.success(res.data.pinned ? "Chat pinned" : "Chat unpinned");
        }
      } else if (actionId === "mute") {
        const res = await api.patch(`/conversation/mute/${chat._id}`);
        if (res.data.success) {
          dispatch(toggleMuteInRedux({ conversationId: chat._id, muted: res.data.muted }));
          toast.success(res.data.muted ? "Chat muted" : "Chat unmuted");
        }
      } else if (actionId === "archive") {
        const res = await api.patch(`/conversation/archive/${chat._id}`);
        if (res.data.success) {
          dispatch(toggleArchiveInRedux({ conversationId: chat._id, archived: res.data.archived }));
          toast.success(res.data.archived ? "Chat archived" : "Chat unarchived");
        }
      } else if (actionId === "delete") {
        if (!window.confirm("Are you sure you want to delete this conversation?")) return;
        const res = await api.delete(`/conversation/delete/${chat._id}`);
        if (res.data.success) {
          dispatch(removeConversationInRedux(chat._id));
          toast.success("Conversation deleted");
        }
      }
    } catch (err) {
      console.warn("Conversation action failed:", err);
      toast.error("Action failed");
    }
  }, [dispatch]);

  const handleContextMenu = useCallback((e, chat) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, chat });
  }, []);

  return (
    <div className="w-full h-screen bg-bg text-text flex overflow-hidden">
      {/* LEFT INBOX SIDEBAR */}
      <div className={`w-full md:w-96 lg:w-[420px] h-full flex flex-col border-r border-border/80 bg-bg shrink-0 ${
        isChatActive ? "hidden md:flex" : "flex"
      }`}>
        {/* Sticky Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between bg-bg/95 backdrop-blur-xl z-10 border-b border-border/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-1.5 rounded-full hover:bg-surface-hover/80 transition cursor-pointer md:hidden"
            >
              <ArrowLeft className="w-5 h-5 text-text" />
            </button>
            <h1 className="text-xl font-extrabold tracking-tight text-text flex items-center gap-2">
              <span>{userData?.user?.userName || "Messages"}</span>
              <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="p-2.5 text-text-secondary hover:text-text rounded-xl hover:bg-surface-hover/80 transition cursor-pointer"
              title="New Message"
            >
              <Edit className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notes Bar */}
        <NotesBar />

        {/* Search Bar */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface/80 border border-border/50 pl-10 pr-4 py-2.5 rounded-xl text-sm text-text outline-none focus:border-border-strong transition placeholder:text-text-muted"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Filters with Filter Icon */}
        <div className="px-4 flex items-center gap-1 pb-2 relative">
          {/* Filter icon button — Instagram style */}
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`p-2 rounded-xl transition cursor-pointer shrink-0 ${
              activeFilter !== "all"
                ? "text-blue-400 bg-blue-500/10 border border-blue-500/30"
                : "text-text-muted hover:text-text hover:bg-surface/50"
            }`}
            title="Filter conversations"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <FilterDropdown
            isOpen={showFilterDropdown}
            onClose={() => setShowFilterDropdown(false)}
            activeFilter={activeFilter}
            onSelectFilter={setActiveFilter}
          />

          {INBOX_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowArchived(false); }}
              className={`text-xs font-bold transition px-4 py-2 rounded-xl cursor-pointer relative ${
                activeTab === tab.id && !showArchived
                  ? "text-text bg-surface-hover shadow-sm"
                  : "text-text-muted hover:text-text hover:bg-surface/50"
              }`}
            >
              {tab.label}
              {tab.id === "requests" && requestCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[9px] font-bold rounded-full flex items-center justify-center">
                  {requestCount}
                </span>
              )}
            </button>
          ))}

          {/* Active filter indicator */}
          {activeFilter !== "all" && (
            <button
              onClick={() => setActiveFilter("all")}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition cursor-pointer"
            >
              <span className="capitalize">{activeFilter}</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Conversations Scroll List */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {/* Archived chats toggle */}
          {archivedCount > 0 && !showArchived && activeTab === "primary" && (
            <button
              onClick={() => setShowArchived(true)}
              className="w-full flex items-center gap-3 px-5 py-3 text-xs font-semibold text-text-secondary hover:text-text hover:bg-surface/50 transition cursor-pointer border-b border-border/50"
            >
              <Archive className="w-4 h-4 text-purple-400" />
              <span>Archived Chats</span>
              <span className="ml-auto text-[10px] bg-surface-hover px-2 py-0.5 rounded-full">{archivedCount}</span>
            </button>
          )}

          {showArchived && (
            <button
              onClick={() => setShowArchived(false)}
              className="w-full flex items-center gap-3 px-5 py-3 text-xs font-semibold text-text-secondary hover:text-text hover:bg-surface/50 transition cursor-pointer border-b border-border/50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Inbox</span>
            </button>
          )}

          {/* Pinned Chats */}
          {pinnedConversations.length > 0 && !showArchived && (
            <div className="mb-1">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 uppercase tracking-widest px-5 py-2">
                <Pin className="w-3 h-3 transform rotate-45" />
                <span>Pinned</span>
              </div>
              {pinnedConversations.map((chat) => (
                <ChatListItem
                  key={chat._id}
                  chat={chat}
                  onContextMenu={(e) => handleContextMenu(e, chat)}
                />
              ))}
            </div>
          )}

          {/* Regular Messages */}
          <div>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <ChatSkeleton key={i} />)
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-20 px-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mx-auto">
                  {activeTab === "requests" ? (
                    <Bell className="w-7 h-7 text-text-muted" />
                  ) : showArchived ? (
                    <Archive className="w-7 h-7 text-text-muted" />
                  ) : activeFilter !== "all" ? (
                    <SlidersHorizontal className="w-7 h-7 text-text-muted" />
                  ) : (
                    <MessageSquare className="w-7 h-7 text-text-muted" />
                  )}
                </div>
                <p className="text-sm font-semibold text-text-secondary">
                  {activeTab === "requests" ? "No message requests" : showArchived ? "No archived chats" : activeFilter !== "all" ? `No ${activeFilter} messages` : "No messages yet"}
                </p>
                <p className="text-xs text-text-muted">
                  {activeTab === "requests"
                    ? "Message requests from people you don't follow will appear here."
                    : showArchived
                    ? "Chats you archive will appear here."
                    : activeFilter !== "all"
                    ? "Try a different filter or start a conversation."
                    : "Start a conversation with someone!"}
                </p>
              </div>
            ) : (
              unpinnedConversations.map((chat) => (
                <ChatListItem
                  key={chat._id}
                  chat={chat}
                  onContextMenu={(e) => handleContextMenu(e, chat)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* RIGHT MAIN CHAT PANE */}
      <div className={`flex-1 h-full flex-col bg-bg ${
        isChatActive ? "flex" : "hidden md:flex"
      }`}>
        {isChatActive ? (
          <MessageArea />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-5">
            <div className="w-24 h-24 rounded-full border-2 border-border flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 flex items-center justify-center text-white">
                <Send className="w-9 h-9 -rotate-12 translate-x-0.5" strokeWidth={1.5} />
              </div>
            </div>
            <div className="space-y-2 max-w-sm">
              <h2 className="text-xl font-bold text-text tracking-tight">Your Messages</h2>
              <p className="text-sm text-text-muted leading-relaxed">
                Send a message to start a chat.
              </p>
            </div>
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 font-semibold text-sm rounded-lg transition cursor-pointer"
            >
              Send message
            </button>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ConversationContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          chat={contextMenu.chat}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal
          isOpen={showCreateGroupModal}
          onClose={() => setShowCreateGroupModal(false)}
          onGroupCreated={() => fetchConversations()}
        />
      )}
    </div>
  );
};

export default Messages;
