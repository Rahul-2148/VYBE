import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
  createMeeting,
  getMeetingInfo,
  joinMeeting,
  endMeeting,
  updateMeetingSettings,
  getRecentMeetings,
  removeRecentMeeting,
  clearAllRecentMeetings,
} from "../controllers/meeting.controller.js";

const meetingRouter = express.Router();

meetingRouter.post("/create", isAuthenticated, createMeeting);
meetingRouter.get("/history", isAuthenticated, getRecentMeetings);
meetingRouter.delete("/history/clear-all", isAuthenticated, clearAllRecentMeetings);
meetingRouter.delete("/history/:meetingId", isAuthenticated, removeRecentMeeting);
meetingRouter.get("/:meetingId", isAuthenticated, getMeetingInfo);
meetingRouter.post("/:meetingId/join", isAuthenticated, joinMeeting);
meetingRouter.post("/:meetingId/end", isAuthenticated, endMeeting);
meetingRouter.patch("/:meetingId/settings", isAuthenticated, updateMeetingSettings);

export default meetingRouter;
