import React from "react";
import dp from "../assets/dp3.png";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedChatUser } from "../redux/features/messageSlice";
import { useNavigate } from "react-router-dom";
import { Users, Pin, VolumeX, CheckCheck, Check, Image as ImageIcon, Clock } from "lucide-react";
import moment from "moment";

export const ChatListItem = ({ chat, onContextMenu }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userData } = useSelector((s) => s.user);
  const { selectedChatUser, typingUsers } = useSelector((s) => s.message);
  const currentUserId = userData?.user?._id || userData?._id;

  if (!chat) return null;

  const isGroup = Boolean(chat.isGroup);
  const participant = chat.participant || chat.participants?.find((p) => (p?._id || p)?.toString() !== currentUserId?.toString());

  const avatar = isGroup
    ? chat.groupImage?.url || chat.avatar || null
    : participant?.profileImage?.url || dp;

  const title = isGroup ? chat.groupName || chat.name || "Group Chat" : participant?.userName || participant?.name || "User";
  const isOnline = !isGroup && Boolean(participant?.isOnline);
  const isSelected = selectedChatUser?.conversationId === chat._id;
  const unreadCount = chat.unreadCount || 0;

  // Typing indicator for this conversation
  const conversationTyping = typingUsers?.[chat._id];
  const isTyping = conversationTyping && conversationTyping.length > 0;

  // Delivery status icon
  const getStatusIcon = () => {
    const msg = chat.lastMessage;
    if (!msg) return null;

    const isMine = (msg.sender?._id || msg.sender)?.toString() === currentUserId?.toString();
    if (!isMine) return null;

    if (msg.status === "seen") {
      return <CheckCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
    if (msg.status === "delivered") {
      return <CheckCheck className="w-3.5 h-3.5 text-text-muted shrink-0" />;
    }
    if (msg.status === "sent") {
      return <Check className="w-3.5 h-3.5 text-text-muted shrink-0" />;
    }
    if (msg.status === "sending") {
      return <Clock className="w-3 h-3 text-text-muted shrink-0" />;
    }
    return <Check className="w-3.5 h-3.5 text-text-muted shrink-0" />;
  };

  // Format last message
  const formatLastMessage = () => {
    if (isTyping) return null; // Will show typing indicator instead

    if (!chat.lastMessage) return "Tap to start chatting";

    const msg = chat.lastMessage;
    const isMine = (msg.sender?._id || msg.sender)?.toString() === currentUserId?.toString();
    const prefix = isMine ? "You: " : isGroup && msg.sender?.userName ? `${msg.sender.userName}: ` : "";

    if (msg.deletedForEveryone) return `${prefix}Message deleted`;
    if (msg.type === "system") return msg.content?.text || "System message";
    if (msg.type === "image" || msg.content?.media?.[0]?.type === "image") return `${prefix}Sent a photo`;
    if (msg.type === "video" || msg.content?.media?.[0]?.type === "video") return `${prefix}Sent a video`;
    if (msg.type === "voice" || msg.content?.voiceDuration) return `${prefix}Voice message`;
    if (msg.type === "location" || msg.content?.locationData) return `${prefix}Shared a location`;
    if (msg.type === "gif") return `${prefix}Sent a GIF`;
    if (msg.isForwarded) return `${prefix}Forwarded message`;
    if (msg.type?.startsWith("shared_")) return `${prefix}Shared a post`;

    const text = msg.content?.text || msg.text || "Message";
    return prefix + (text.length > 40 ? text.slice(0, 40) + "…" : text);
  };

  // Time display
  const getTimeDisplay = () => {
    const timestamp = chat.lastMessage?.createdAt || chat.updatedAt;
    if (!timestamp) return "";

    const m = moment(timestamp);
    const now = moment();

    if (m.isSame(now, "day")) return m.format("h:mm A");
    if (m.isSame(now.subtract(1, "day"), "day")) return "Yesterday";
    if (m.isSame(now, "week")) return m.format("ddd");
    return m.format("MMM D");
  };

  const handleSelectChat = () => {
    dispatch(
      setSelectedChatUser({
        conversationId: chat._id,
        user: isGroup
          ? { isGroup: true, groupName: title, _id: chat._id, participants: chat.participants, admins: chat.admins, avatar: chat.avatar }
          : participant,
      })
    );
    navigate(`/messages/${chat._id}`);
  };

  return (
    <div
      onClick={handleSelectChat}
      onContextMenu={onContextMenu}
      className={`relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-100 ${
        isSelected
          ? "bg-surface-hover/80"
          : "hover:bg-surface/60"
      }`}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {isGroup ? (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-[2px]">
            {avatar ? (
              <img src={avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full rounded-full bg-surface flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-300" />
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <img src={avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
            {isOnline && (
              <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-[2.5px] border-bg rounded-full" />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={`text-[14px] truncate ${unreadCount > 0 ? "font-bold text-text" : "font-semibold text-text"}`}>
              {title}
            </p>
            {chat.isMuted && <VolumeX className="w-3.5 h-3.5 text-text-muted shrink-0" />}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {getStatusIcon()}
            <span className={`text-xs ${unreadCount > 0 ? "font-bold text-text" : "text-text-muted"}`}>
              {getTimeDisplay()}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex-1 min-w-0">
            {isTyping ? (
              <p className="text-xs font-semibold text-green-400 flex items-center gap-1">
                <span>typing</span>
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </p>
            ) : (
              <p className={`text-xs truncate ${unreadCount > 0 ? "font-semibold text-text" : "text-text-muted"}`}>
                {formatLastMessage()}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {chat.isPinned && <Pin className="w-3 h-3 text-text-muted transform rotate-45" />}
            {unreadCount > 0 && (
              <div className="bg-blue-500 text-text font-bold text-[10px] min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatListItem;
