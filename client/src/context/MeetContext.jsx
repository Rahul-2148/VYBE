import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useMeetWebRTC } from "../hooks/useMeetWebRTC";
import { triggerHaptic } from "../lib/interactiveEffects";

const MeetContext = createContext(null);

export const useMeet = () => {
  const context = useContext(MeetContext);
  if (!context) {
    throw new Error("useMeet must be used within a MeetProvider");
  }
  return context;
};

/**
 * MeetProvider - Global Session Manager for Vybe Meet
 * Keeps WebRTC connection persistent across all app routes when minimized (PiP).
 */
export const MeetProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useSelector((s) => s.user || {});
  const currentUserId = userData?.user?._id || userData?._id;

  const [activeMeeting, setActiveMeeting] = useState(null); // { meetingId, roomTitle, isHost, hostUserId, lobbyOptions }
  const [isMinimized, setIsMinimized] = useState(false);

  // Active WebRTC hook attached to current meeting
  const rtc = useMeetWebRTC(
    activeMeeting?.meetingId || null,
    currentUserId,
    activeMeeting?.lobbyOptions || {}
  );

  const startMeeting = useCallback((sessionData) => {
    setActiveMeeting(sessionData);
    setIsMinimized(false);
  }, []);

  const minimizeMeeting = useCallback(() => {
    triggerHaptic("light");
    setIsMinimized(true);
    // If currently on the meet room page, navigate to home/feed "/"
    if (location.pathname.startsWith("/meet/")) {
      navigate("/");
    }
  }, [location.pathname, navigate]);

  const expandMeeting = useCallback(() => {
    triggerHaptic("medium");
    setIsMinimized(false);
    if (activeMeeting?.meetingId) {
      navigate(`/meet/${activeMeeting.meetingId}`);
    }
  }, [activeMeeting?.meetingId, navigate]);

  const leaveMeeting = useCallback(() => {
    triggerHaptic("heavy");
    rtc.leaveRoom();
    setActiveMeeting(null);
    setIsMinimized(false);
    if (location.pathname.startsWith("/meet/")) {
      navigate("/meet");
    }
  }, [rtc, location.pathname, navigate]);

  // Auto-sync isMinimized with route: when on meet page, expand; when browsing other routes with active meeting, minimize
  useEffect(() => {
    if (activeMeeting?.meetingId) {
      const isCurrentlyOnMeetPage = location.pathname === `/meet/${activeMeeting.meetingId}`;
      if (isCurrentlyOnMeetPage) {
        setIsMinimized(false);
      } else {
        setIsMinimized(true);
      }
    }
  }, [location.pathname, activeMeeting?.meetingId]);

  const value = {
    activeMeeting,
    isMinimized,
    rtc,
    startMeeting,
    minimizeMeeting,
    expandMeeting,
    leaveMeeting,
  };

  return (
    <MeetContext.Provider value={value}>
      {children}
    </MeetContext.Provider>
  );
};

export default MeetContext;
