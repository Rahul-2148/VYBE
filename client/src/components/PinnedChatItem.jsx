import { Pin } from "lucide-react";
import ChatListItem from "./ChatListItem";

const PinnedChatItem = ({ chat, unreadCount }) => {
  return (
    <div className="relative">
      <ChatListItem chat={chat} unreadCount={unreadCount} />
      <Pin
        size={14}
        className="absolute top-3 right-4 text-text-secondary"
      />
    </div>
  );
};

export default PinnedChatItem;
