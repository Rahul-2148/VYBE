import "dotenv/config";
import http from "http";
import connectDB from "./config/db.js";
import app from "./app.js";
import { initializeSocket } from "./socket.js";

const PORT = process.env.PORT || 8000;
const server = http.createServer(app);

const startServer = async () => {
  try {
    await connectDB();
    initializeSocket(server);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
