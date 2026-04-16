import { io } from "socket.io-client";

let socketInstance = null;

export const getSocket = () => {
  if (socketInstance) return socketInstance;

  socketInstance = io(import.meta.env.VITE_SERVER_URL, {
    withCredentials: true,
    transports: ["websocket", "polling"],
  });

  return socketInstance;
};

export const disconnectSocket = () => {
  if (!socketInstance) return;
  socketInstance.disconnect();
  socketInstance = null;
};
