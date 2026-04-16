import dp from "../assets/dp3.png";
import { useDispatch } from "react-redux";
import { setSelectedChatUser } from "../redux/features/messageSlice";
import { useNavigate } from "react-router-dom";

const ChatListItem = ({ chat, unreadCount }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  if (!chat?.participant) return null;

  return (
    <div
      onClick={() => {
        dispatch(
          setSelectedChatUser({
            conversationId: chat._id,
            user: chat.participant,
          })
        );
        navigate("/messageArea");
      }}
      className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 cursor-pointer"
    >
      <img
        src={chat.participant.profileImage?.url || dp}
        className="w-12 h-12 rounded-full object-cover"
      />

      <div className="flex-1">
        <p className="text-white font-semibold">{chat.participant.userName}</p>

        <p
          className={`text-sm truncate ${
            unreadCount > 0 ? "font-semibold text-white" : "text-gray-400"
          }`}
        >
          {chat?.lastMessage?.type === "image"
            ? "📸 Photo"
            : chat?.lastMessage?.content?.text || "Start chatting"}
        </p>
      </div>

      {unreadCount > 0 && (
        <div className="bg-pink-500 text-white text-xs min-w-[18px] h-[18px]
                        flex items-center justify-center rounded-full">
          {unreadCount}
        </div>
      )}
    </div>
  );
};

export default ChatListItem;
