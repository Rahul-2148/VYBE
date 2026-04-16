import { motion, AnimatePresence } from "framer-motion";

const InfoSheet = ({ isOpen, onClose, user, onOpenQR, hideQR = false }) => {
  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full bg-white rounded-t-3xl p-6 pb-8"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-5" />

            {/* QR Button */}
            {!hideQR && (
              <button
                className="w-full py-3 rounded-xl from-blue-400 to-blue-600 bg-gradient-to-br hover:from-blue-600 hover:to-blue-400 text-white font-medium mb-6"
                onClick={() => {
                  onClose();
                  onOpenQR();
                }}
              >
                View QR Code
              </button>
            )}

            {/* Details */}
            <div className="space-y-2 text-[15px] text-gray-700">
              {user.gender && <div>👤 Gender: {user.gender}</div>}
              {user.age && <div>🎂 Age: {user.age}</div>}
              {user.location && <div>📍 Location: {user.location}</div>}
              {user.accountType && <div>🔒 Account: {user.accountType}</div>}
            </div>

            {/* Links */}
            {user.links?.length > 0 && (
              <div className="mt-5">
                <div className="text-[14px] font-semibold mb-2">🔗 Links</div>
                <div className="flex flex-wrap gap-2">
                  {user.links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-full bg-gray-100 text-[14px] text-gray-700 hover:bg-gray-200 transition"
                    >
                      {link.platform || "Link"}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InfoSheet;
