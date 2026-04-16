import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { SERVER_URL } from "../App";
import ChatListItem from "../components/ChatListItem";

const Messages = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${SERVER_URL}/api/v1/message/conversations`, {
        withCredentials: true,
      })
      .then((res) => {
        setConversations(res.data.conversations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="w-full min-h-screen bg-black">
      <div className="h-[80px] flex items-center gap-4 px-5 text-white">
        <MdOutlineKeyboardBackspace
          className="w-6 h-6 cursor-pointer lg:hidden"
          onClick={() => navigate("/")}
        />
        <h1 className="text-xl font-semibold">Messages</h1>
      </div>

      <div className="flex flex-col">
        {loading && (
          <p className="text-gray-400 text-center mt-10">Loading chats…</p>
        )}

        {!loading && conversations.length === 0 && (
          <p className="text-gray-400 text-center mt-10">
            No conversations yet
          </p>
        )}

        {conversations.map((chat) => (
          <ChatListItem
            key={chat._id}
            chat={chat}
            unreadCount={chat?.unreadCount || 0}
          />
        ))}
      </div>
    </div>
  );
};

export default Messages;
