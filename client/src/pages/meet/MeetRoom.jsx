import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../lib/axios";
import { snackbar } from "../../lib/snackbar";
import MeetLobby from "./MeetLobby";
import MeetRoomView from "../../components/meet/MeetRoomView";
import { useMeet } from "../../context/MeetContext";

export const MeetRoom = () => {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { userData } = useSelector((s) => s.user);

  const { activeMeeting, startMeeting, minimizeMeeting, leaveMeeting, rtc } = useMeet();

  const [meeting, setMeeting] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch Meeting Information
  useEffect(() => {
    if (!meetingId) return;
    let active = true;

    const fetchMeeting = async () => {
      try {
        const res = await api.get(`/meet/${meetingId}`);
        if (!active) return;

        if (res.data?.success && res.data.meeting) {
          setMeeting(res.data.meeting);
          setIsHost(res.data.isHost);
        } else {
          setError("Meeting not found");
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || "Invalid or expired meeting code");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchMeeting();
    return () => {
      active = false;
    };
  }, [meetingId]);

  const handleJoinFromLobby = async (options) => {
    try {
      await api.post(`/meet/${meetingId}/join`);
      startMeeting({
        meetingId,
        roomTitle: meeting?.title || "VYBE Meeting",
        isHost,
        hostUserId: meeting?.host?._id || meeting?.host || null,
        lobbyOptions: options,
      });
    } catch (err) {
      snackbar.error(err.response?.data?.message || "Failed to join meeting");
    }
  };

  if (isLoading && !activeMeeting) {
    return (
      <div className="w-screen h-screen bg-[#202124] flex flex-col items-center justify-center gap-3 text-white">
        <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-zinc-400 font-medium">Connecting to meeting...</span>
      </div>
    );
  }

  if ((error || !meeting) && !activeMeeting) {
    return (
      <div className="w-screen h-screen bg-[#202124] flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl font-black">
          !
        </div>
        <h2 className="text-xl font-bold text-white">Couldn't join meeting</h2>
        <p className="text-xs text-zinc-400 max-w-sm">{error || "This meeting does not exist or has expired."}</p>
        <button
          onClick={() => navigate("/meet")}
          className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
        >
          Return to Meet Home
        </button>
      </div>
    );
  }

  // Pre-join Lobby State (if not currently in this active meeting session)
  const isCurrentlyInThisMeeting = activeMeeting?.meetingId === meetingId;
  if (!isCurrentlyInThisMeeting) {
    return (
      <div className="w-screen h-screen bg-[#202124] flex items-center justify-center overflow-y-auto">
        <MeetLobby
          meeting={meeting}
          meetingId={meetingId}
          isHost={isHost}
          currentUser={userData?.user || userData}
          onJoinMeeting={handleJoinFromLobby}
        />
      </div>
    );
  }

  // Active In-Meeting Room View
  return (
    <MeetRoomView
      meetingId={meetingId}
      roomTitle={activeMeeting.roomTitle || meeting?.title || "VYBE Meeting"}
      isHost={activeMeeting.isHost ?? isHost}
      hostUserId={activeMeeting.hostUserId || meeting?.host?._id || meeting?.host || null}
      localStream={rtc.localStream}
      screenStream={rtc.screenStream}
      peers={rtc.peers}
      isMuted={rtc.isMuted}
      isVideoOff={rtc.isVideoOff}
      isScreenSharing={rtc.isScreenSharing}
      isHandRaised={rtc.isHandRaised}
      handRaisedAt={rtc.handRaisedAt}
      activeSpeaker={rtc.activeSpeaker}
      connectionQuality={rtc.connectionQuality}
      videoFilter={rtc.videoFilter}
      onChangeVideoFilter={rtc.changeVideoFilter}
      audioInputDevices={rtc.audioInputDevices}
      videoDevices={rtc.videoDevices}
      audioOutputDevices={rtc.audioOutputDevices}
      selectedAudioInput={rtc.selectedAudioInput}
      setSelectedAudioInput={rtc.setSelectedAudioInput}
      selectedVideo={rtc.selectedVideo}
      setSelectedVideo={rtc.setSelectedVideo}
      selectedAudioOutput={rtc.selectedAudioOutput}
      setSelectedAudioOutput={rtc.setSelectedAudioOutput}
      onToggleMute={rtc.toggleMute}
      onToggleVideo={rtc.toggleVideo}
      onFlipCamera={rtc.flipCamera}
      isFrontCamera={rtc.isFrontCamera}
      onToggleScreenShare={rtc.toggleScreenShare}
      onToggleHand={rtc.toggleHand}
      onMinimize={minimizeMeeting}
      onEndCall={leaveMeeting}
    />
  );
};

export default MeetRoom;
