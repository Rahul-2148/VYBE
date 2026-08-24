import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSocket } from "../../lib/socket";

export const FloatingReactions = ({ room }) => {
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !room) return;

    const handleReaction = (data) => {
      const id = data.id || `${Date.now()}_${Math.random()}`;
      const newReaction = {
        id,
        emoji: data.emoji,
        userName: data.userName,
        x: Math.random() * 60 + 20, // random start horizontal position (20% to 80%)
      };

      setReactions((prev) => [...prev.slice(-20), newReaction]);

      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2500);
    };

    socket.on("call:reaction-received", handleReaction);
    return () => {
      socket.off("call:reaction-received", handleReaction);
    };
  }, [room]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: "85vh", x: `${r.x}vw`, scale: 0.6, rotate: 0 }}
            animate={{
              opacity: [1, 1, 0.9, 0],
              y: "-10vh",
              x: `${r.x + (Math.random() * 20 - 10)}vw`,
              scale: [0.6, 1.3, 1.1, 0.9],
              rotate: (Math.random() - 0.5) * 40,
            }}
            transition={{ duration: 2.4, ease: "easeOut" }}
            className="absolute flex items-center gap-1.5 drop-shadow-2xl select-none"
          >
            <span className="text-3xl sm:text-4xl filter drop-shadow-md">{r.emoji}</span>
            {r.userName && (
              <span className="bg-black/60 backdrop-blur-md text-[10px] text-white font-bold px-2 py-0.5 rounded-full border border-white/10 shadow-sm">
                @{r.userName}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default FloatingReactions;
