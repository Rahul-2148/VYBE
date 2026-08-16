import { useSelector } from "react-redux";
import dp from "../assets/dp3.png";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import FollowButton from "./FollowButton";
import VerifiedBadge from "./VerifiedBadge";

const OtherUsers = ({ user }) => {
  const navigate = useNavigate();

  return (
    <div className="w-full flex items-center justify-between py-1.5 transition">
      <div 
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => {
          if (user?.userName) {
            navigate(`/profile/${user.userName}`);
          }
        }}
      >
        <div className="w-9 h-9 rounded-full overflow-hidden border border-border group-hover:border-rose-500 transition">
          <img
            src={user?.profileImage?.url || dp}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold text-text group-hover:underline truncate max-w-[120px] flex items-center gap-0.5">
            {user?.userName}
            {user?.isVerified && (
              <VerifiedBadge size="xs" />
            )}
            {user?.accountType === "private" && (
              <Lock className="w-3 h-3 text-text-muted ml-0.5 shrink-0" />
            )}
          </span>
          <span className="text-[11px] text-text-muted truncate max-w-[120px]">
            {user?.name || "Suggested for you"}
          </span>
        </div>
      </div>

      <FollowButton
        targetUserId={user?._id}
        targetUser={user}
        tailwind="px-3.5 py-1 bg-text text-bg text-xs font-bold rounded-full hover:opacity-90 transition cursor-pointer shadow-sm"
      />
    </div>
  );
};

export default OtherUsers;
