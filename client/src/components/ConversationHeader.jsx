import dp from "../assets/dp3.png";
import moment from "moment";
import { MdOutlineKeyboardBackspace } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ConversationHeader = ({ chat }) => {
  const navigate = useNavigate();
  const { onlineUsers, lastSeenMap } = useSelector((s) => s.message);

  const isGroup = chat?.isGroup;
  const otherUser = chat?.user;

  const isOnline =
    !isGroup && otherUser && onlineUsers.includes(otherUser._id);

  const lastSeen =
    !isGroup &&
    lastSeenMap[otherUser?._id] &&
    moment(lastSeenMap[otherUser._id]).fromNow();

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-800">
      <MdOutlineKeyboardBackspace
        className="text-white w-6 h-6 cursor-pointer lg:hidden"
        onClick={() => navigate("/messages")}
      />

      <img
        src={
          isGroup
            ? chat?.groupImage?.url || dp
            : otherUser?.profileImage?.url || dp
        }
        className="w-10 h-10 rounded-full"
      />

      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate">
          {isGroup ? chat?.groupName : otherUser?.userName}
        </p>

        {!isGroup && (
          <p className="text-xs text-gray-400">
            {isOnline ? "Online" : lastSeen ? `Last seen ${lastSeen}` : ""}
          </p>
        )}
      </div>
    </div>
  );
};

export default ConversationHeader;
