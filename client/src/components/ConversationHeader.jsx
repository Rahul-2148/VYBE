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

  const handleProfileClick = (e) => {
    e.stopPropagation();
    if (!isGroup && otherUser?.userName) {
      navigate(`/profile/${otherUser.userName}`);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg/95 backdrop-blur-md">
      <MdOutlineKeyboardBackspace
        className="text-text w-6 h-6 cursor-pointer lg:hidden"
        onClick={() => navigate("/messages")}
      />

      <img
        src={
          isGroup
            ? chat?.groupImage?.url || dp
            : otherUser?.profileImage?.url || dp
        }
        alt=""
        onClick={handleProfileClick}
        className={`w-10 h-10 rounded-full object-cover border border-border ${
          !isGroup ? "cursor-pointer hover:opacity-85 transition active:scale-95" : ""
        }`}
        title={!isGroup ? `View @${otherUser?.userName}'s profile` : undefined}
      />

      <div
        className={`flex-1 min-w-0 ${!isGroup ? "cursor-pointer group" : ""}`}
        onClick={handleProfileClick}
      >
        <p className="text-text font-semibold text-sm truncate group-hover:underline">
          {isGroup ? chat?.groupName : otherUser?.userName}
        </p>

        {!isGroup && (
          <p className="text-xs text-text-secondary truncate">
            {isOnline ? "Online" : lastSeen ? `Last seen ${lastSeen}` : ""}
          </p>
        )}
      </div>
    </div>
  );
};

export default ConversationHeader;
