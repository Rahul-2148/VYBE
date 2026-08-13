#!/usr/bin/env node
import { io as Client } from "socket.io-client";

const SERVER = process.env.SERVER_URL || "http://localhost:8000";
const TIMEOUT = 8000;

const waitFor = (ms) => new Promise((r) => setTimeout(r, ms));

const connectUser = (userId) => {
  const socket = Client(SERVER, {
    auth: { userId },
    transports: ["websocket"],
    reconnection: false,
  });
  return socket;
};

const run = async () => {
  console.log("E2E Smoke: connecting two test sockets (userA,userB)");
  const a = connectUser("userA");
  const b = connectUser("userB");

  const results = [];

  const onceWithTimeout = (socket, ev, timeout = TIMEOUT) =>
    new Promise((resolve, reject) => {
      const to = setTimeout(() => {
        socket.off(ev, on);
        reject(new Error(`Timeout waiting for ${ev}`));
      }, timeout);
      const on = (data) => {
        clearTimeout(to);
        resolve(data);
      };
      socket.once(ev, on);
    });

  try {
    await Promise.all([
      new Promise((res) => a.once("connect", res)),
      new Promise((res) => b.once("connect", res)),
    ]);
    console.log("Both sockets connected");

    // Live stream flow
    const streamId = `smoke_stream_${Date.now()}`;

    const bLivePromise = onceWithTimeout(b, "live-broadcast-started");
    a.emit("start-live-stream", { streamId, title: "Smoke Test Stream" });
    const liveStarted = await bLivePromise;
    console.log("live-broadcast-started received by B", liveStarted?.streamId === streamId);
    results.push(liveStarted?.streamId === streamId);

    // join flow
    const aViewerJoined = onceWithTimeout(a, "live-viewer-joined");
    b.emit("join-live-stream", { streamId });
    const viewerJoined = await aViewerJoined;
    console.log("live-viewer-joined on A", !!viewerJoined?.userId);
    results.push(!!viewerJoined?.userId);

    // live comment
    const aCommentPromise = onceWithTimeout(a, "live-comment-received");
    const commentText = "hello from smoke test";
    b.emit("send-live-comment", { streamId, comment: commentText });
    const commentReceived = await aCommentPromise;
    console.log("live-comment-received on A", commentReceived?.comment === commentText);
    results.push(commentReceived?.comment === commentText);

    // loop-like toggle (broadcast)
    const aLoopPromise = onceWithTimeout(a, "loop-like-updated");
    const bLoopPromise = onceWithTimeout(b, "loop-like-updated");
    a.emit("loop-like-toggle", { loopId: "loop123", userId: "userA", isLiked: true, likesCount: 1 });
    const [aLoop, bLoop] = await Promise.all([aLoopPromise, bLoopPromise]);
    console.log("loop-like-updated received by both", !!aLoop && !!bLoop);
    results.push(!!aLoop && !!bLoop);

    // call invite flow
    const bInvitePromise = onceWithTimeout(b, "call:invite-received");
    const aCallStatusPromise = onceWithTimeout(a, "call:status");
    a.emit("call:invite", {
      room: `call_room_smoke_${Date.now()}`,
      userToCall: "userB",
      type: "direct",
      callerName: "userA",
      callerAvatar: "",
    });

    const [inviteReceived, callStatus] = await Promise.all([bInvitePromise, aCallStatusPromise]);
    console.log("call invite received on B", !!inviteReceived?.from);
    console.log("call status on A", callStatus?.status);
    results.push(!!inviteReceived?.from && !!callStatus?.status);

    // clean up
    a.disconnect();
    b.disconnect();

    const allPassed = results.every(Boolean);
    console.log(`E2E Smoke Completed. Passed: ${results.filter(Boolean).length}/${results.length}`);
    process.exit(allPassed ? 0 : 2);
  } catch (err) {
    console.error("E2E Smoke error:", err.message || err);
    try {
      a.disconnect();
      b.disconnect();
    } catch {}
    process.exit(3);
  }
};

run();
