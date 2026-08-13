import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  initiateCall,
  respondToCall,
  getActiveCall,
  endCall,
  getCallHistory,
  getTurnCredentials,
} from "../controllers/call.controller.js";

const callRouter = express.Router();

callRouter.post("/initiate", isAuthenticated, initiateCall);
callRouter.post("/respond", isAuthenticated, respondToCall);
callRouter.get("/active", isAuthenticated, getActiveCall);
callRouter.post("/end", isAuthenticated, endCall);
callRouter.get("/history", isAuthenticated, getCallHistory);
callRouter.get("/turn-credentials", isAuthenticated, getTurnCredentials);

export default callRouter;
