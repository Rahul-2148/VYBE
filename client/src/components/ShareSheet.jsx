import { X, Link2, Share2, PlusCircle } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "react-hot-toast";
import dp from "../assets/dp3.png";

const ShareSheet = ({ open, onClose, loop, following = [] }) => {
  if (!open || !loop?._id) return null;

  const shareUrl = `${window.location.origin}/reel/${loop._id}`;

  const systemShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Check this reel",
          text: loop.caption || "",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(
      `Check this reel 👀\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div
      className="fixed inset-0 z-[500] bg-black/60"
      onClick={onClose}
    >
      <div
        className="absolute bottom-0 w-full bg-[#121212] rounded-t-3xl p-4 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-500 rounded-full mx-auto mb-3" />

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-semibold">Share</h2>
          <X
            className="text-white cursor-pointer"
            onClick={onClose}
          />
        </div>

        {/* Following users */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {following.length === 0 && (
            <p className="text-gray-400 text-sm">
              No following users
            </p>
          )}

          {following.map((user) => (
            <div
              key={user._id}
              className="flex flex-col items-center min-w-[64px] cursor-pointer active:scale-90 transition"
              onClick={() => {
                // 🔥 DM forward API later
                toast.success(`Sent to ${user.userName}`);
              }}
            >
              <img
                src={user.profileImage?.url || dp}
                alt={user.userName}
                className="w-14 h-14 rounded-full object-cover border border-gray-700"
              />
              <span className="text-xs text-white truncate mt-1 max-w-[60px]">
                {user.userName}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-4 gap-4 mt-4 text-center text-white">
          {/* Add to story */}
          <button
            onClick={() =>
              toast("Story feature coming soon 👀")
            }
            className="flex flex-col items-center gap-1 active:scale-90 transition"
          >
            <div className="w-12 h-12 rounded-full bg-[#1f1f1f] flex items-center justify-center">
              <PlusCircle size={20} />
            </div>
            <p className="text-xs text-gray-300">Add to story</p>
          </button>

          {/* WhatsApp */}
          <button
            onClick={shareOnWhatsApp}
            className="flex flex-col items-center gap-1 active:scale-90 transition"
          >
            <div className="w-12 h-12 rounded-full bg-[#1f1f1f] flex items-center justify-center">
              <FaWhatsapp size={20} />
            </div>
            <p className="text-xs text-gray-300">WhatsApp</p>
          </button>

          {/* System Share */}
          <button
            onClick={systemShare}
            className="flex flex-col items-center gap-1 active:scale-90 transition"
          >
            <div className="w-12 h-12 rounded-full bg-[#1f1f1f] flex items-center justify-center">
              <Share2 size={20} />
            </div>
            <p className="text-xs text-gray-300">Share</p>
          </button>

          {/* Copy link */}
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(shareUrl);
              toast.success("Link copied");
            }}
            className="flex flex-col items-center gap-1 active:scale-90 transition"
          >
            <div className="w-12 h-12 rounded-full bg-[#1f1f1f] flex items-center justify-center">
              <Link2 size={20} />
            </div>
            <p className="text-xs text-gray-300">Copy link</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareSheet;
