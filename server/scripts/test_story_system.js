import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

const API_BASE = "http://localhost:8000/api/v1";
const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/VYBE";

class TestClient {
  constructor() {
    this.cookies = {};
    this.token = "";
  }

  async request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const cookieHeader = Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
      body: options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : undefined,
    });

    // Capture set-cookie
    const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")].filter(Boolean);
    for (const c of setCookie) {
      if (c) {
        const [pair] = c.split(";");
        const [k, v] = pair.split("=");
        if (k && v) this.cookies[k.trim()] = v.trim();
      }
    }

    let data;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    return {
      status: res.status,
      ok: res.ok,
      data,
    };
  }

  get(path) {
    return this.request(path, { method: "GET" });
  }

  post(path, body) {
    return this.request(path, { method: "POST", body });
  }

  delete(path) {
    return this.request(path, { method: "DELETE" });
  }
}

const runStoryEndToEndTests = async () => {
  console.log("=================================================================");
  console.log("   VYBE STORY SYSTEM — FULL RUNTIME END-TO-END VERIFICATION      ");
  console.log("=================================================================\n");

  await mongoose.connect(MONGO_URI);
  console.log("  Connected to MongoDB Atlas for verification assistance.\n");

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
  };

  const test = async (name, fn) => {
    results.total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      results.passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Reason: ${err.message}`);
      results.failed++;
      results.errors.push({ name, error: err.message });
    }
  };

  const clientA = new TestClient();
  const clientB = new TestClient();

  const randomStr = Math.random().toString(36).substring(7);
  const userAData = {
    userName: `author_${randomStr}`,
    email: `author_${randomStr}@gmail.com`,
    password: "Password123!",
    name: "Story Author",
  };
  const userBData = {
    userName: `viewer_${randomStr}`,
    email: `viewer_${randomStr}@gmail.com`,
    password: "Password123!",
    name: "Story Viewer",
  };

  let userAId = "";
  let userBId = "";
  let publicStoryId = "";
  let closeFriendsStoryId = "";
  let highlightId = "";

  // 1. Account Setup
  await test("1. Register Account A (Author)", async () => {
    const res = await clientA.post("/auth/signup", userAData);
    if (!res.data?.success) throw new Error(res.data?.message || `Registration failed with status ${res.status}`);
    
    // Auto-verify email in MongoDB
    const user = await mongoose.connection.db.collection("users").findOne({ email: userAData.email });
    if (!user) throw new Error("User record not found in MongoDB");
    userAId = user._id.toString();
    await mongoose.connection.db.collection("users").updateOne(
      { _id: user._id },
      { $set: { isEmailVerified: true, otp: null, otpExpiresAt: null } }
    );
  });

  await test("2. Login Account A and capture session", async () => {
    const res = await clientA.post("/auth/signin", {
      userName: userAData.userName,
      password: userAData.password,
    });
    if (!res.data?.success) throw new Error(res.data?.message || `Login failed with status ${res.status}`);
    clientA.token = res.data.token || "";
    userAId = res.data.user?._id || userAId;
  });

  await test("3. Register Account B (Viewer)", async () => {
    const res = await clientB.post("/auth/signup", userBData);
    if (!res.data?.success) throw new Error(res.data?.message || `Registration failed with status ${res.status}`);
    
    // Auto-verify email in MongoDB
    const user = await mongoose.connection.db.collection("users").findOne({ email: userBData.email });
    if (!user) throw new Error("User record not found in MongoDB");
    userBId = user._id.toString();
    await mongoose.connection.db.collection("users").updateOne(
      { _id: user._id },
      { $set: { isEmailVerified: true, otp: null, otpExpiresAt: null } }
    );
  });

  await test("4. Login Account B and capture session", async () => {
    const res = await clientB.post("/auth/signin", {
      userName: userBData.userName,
      password: userBData.password,
    });
    if (!res.data?.success) throw new Error(res.data?.message || `Login failed with status ${res.status}`);
    clientB.token = res.data.token || "";
    userBId = res.data.user?._id || userBId;
  });

  await test("5. Account B follows Account A", async () => {
    const res = await clientB.get(`/user/follow/${userAId}`);
    if (!res.data?.success) throw new Error("Failed to follow Author");
  });

  // 2. Story Creation & Stickers
  await test("6. Account A creates Public Story with full interactive stickers (Poll, Quiz, Question, Slider, Countdown)", async () => {
    const stickers = [
      {
        type: "poll",
        position: { x: 50, y: 30 },
        scale: 1,
        poll: {
          question: "Do you like the new VYBE Story system?",
          options: [{ optionText: "Love it! 🔥" }, { optionText: "Obsessed! ✨" }],
        },
      },
      {
        type: "quiz",
        position: { x: 50, y: 50 },
        scale: 1,
        quiz: {
          question: "What is the speed of VYBE stories?",
          options: ["Fast", "Ultra Fast", "Instant"],
          correctOptionIndex: 2,
        },
      },
      {
        type: "question",
        position: { x: 50, y: 65 },
        scale: 1,
        question: {
          prompt: "Ask me anything about the update!",
        },
      },
      {
        type: "slider",
        position: { x: 50, y: 80 },
        scale: 1,
        slider: {
          question: "Rate the UI design",
          emoji: "🔥",
        },
      },
      {
        type: "countdown",
        position: { x: 50, y: 15 },
        scale: 1,
        countdown: {
          title: "Next Feature Drop",
          targetDate: new Date(Date.now() + 86400000),
        },
      },
    ];

    const res = await clientA.post("/story/upload", {
      mediaType: "text",
      mediaUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080",
      caption: "Public story with interactive stickers!",
      visibleTo: "public",
      stickers: JSON.stringify(stickers),
    });

    if (!res.data?.success || !res.data?.story?._id) {
      throw new Error(res.data?.message || "Failed to publish public story");
    }
    publicStoryId = res.data.story._id;
  });

  await test("7. Account A creates Close Friends Only Story", async () => {
    const res = await clientA.post("/story/upload", {
      mediaType: "text",
      mediaUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1080",
      caption: "Super secret Close Friends story ⭐️",
      visibleTo: "closeFriends",
    });

    if (!res.data?.success || !res.data?.story?._id) {
      throw new Error(res.data?.message || "Failed to publish Close Friends story");
    }
    closeFriendsStoryId = res.data.story._id;
  });

  // 3. Security & Visibility Enforcement
  await test("8. Security Check: Account B feeds should NOT contain Close Friends story prior to being added", async () => {
    const res = await clientB.get("/story/feed");
    if (!res.data?.success) throw new Error("Failed to fetch stories feed for Account B");
    
    const authorGroup = res.data.feed?.find(g => g.author?._id === userAId);
    if (!authorGroup) throw new Error("Author group not found in follower's feed");

    const cfStory = authorGroup.stories?.find(s => s._id === closeFriendsStoryId);
    if (cfStory) {
      throw new Error("SECURITY VIOLATION: Close Friends story leaked to non-close-friend!");
    }
    if (authorGroup.hasCloseFriendsStory) {
      throw new Error("SECURITY VIOLATION: hasCloseFriendsStory flag leaked!");
    }
  });

  await test("9. Account A adds Account B to Close Friends", async () => {
    const res = await clientA.post(`/story/close-friends/toggle/${userBId}`);
    if (!res.data?.success) throw new Error("Failed to toggle Close Friends");
  });

  await test("10. Security Check: Account B feed NOW contains Close Friends story with green badge flag", async () => {
    const res = await clientB.get("/story/feed");
    if (!res.data?.success) throw new Error("Failed to fetch stories feed for Account B");
    
    const authorGroup = res.data.feed?.find(g => g.author?._id === userAId);
    if (!authorGroup) throw new Error("Author group not found in feed");

    const cfStory = authorGroup.stories?.find(s => s._id === closeFriendsStoryId);
    if (!cfStory) {
      throw new Error("Close Friends story missing after adding user to Close Friends list");
    }
    if (!authorGroup.hasCloseFriendsStory) {
      throw new Error("hasCloseFriendsStory flag not set to true");
    }
  });

  // 4. Viewer Interactions
  await test("11. Account B views Public Story (/story/view/:storyId)", async () => {
    const res = await clientB.post(`/story/view/${publicStoryId}`);
    if (!res.data?.success) throw new Error("Failed to record story view");
  });

  await test("12. Account B likes Public Story (/story/like/:storyId)", async () => {
    const res = await clientB.post(`/story/like/${publicStoryId}`);
    if (!res.data?.success || !res.data.isLiked) throw new Error("Failed to like story");
  });

  await test("13. Account B reacts with Emoji 🔥 (/story/react/:storyId)", async () => {
    const res = await clientB.post(`/story/react/${publicStoryId}`, { emoji: "🔥" });
    if (!res.data?.success) throw new Error("Failed to react with emoji");
  });

  await test("14. Account B votes on Poll Option 0 (/story/poll/:storyId/vote)", async () => {
    const res = await clientB.post(`/story/poll/${publicStoryId}/vote`, { optionIndex: 0 });
    if (!res.data?.success || !res.data.pollVotes?.some(v => (v.user?._id || v.user)?.toString() === userBId)) {
      throw new Error("Poll vote was not persisted");
    }
  });

  await test("15. Account B answers Quiz with Option 2 (Correct) (/story/quiz/:storyId/answer)", async () => {
    const res = await clientB.post(`/story/quiz/${publicStoryId}/answer`, { optionIndex: 2 });
    if (!res.data?.success || res.data.isCorrect !== true) {
      throw new Error("Quiz answer was not evaluated or persisted properly");
    }
  });

  await test("16. Account B submits Question Response (/story/question/:storyId/submit)", async () => {
    const res = await clientB.post(`/story/question/${publicStoryId}/submit`, {
      responseText: "The new story animations are amazing!",
    });
    if (!res.data?.success || !res.data.questionResponses?.some(r => r.responseText.includes("amazing"))) {
      throw new Error("Question response was not persisted");
    }
  });

  await test("17. Account B submits Slider Response at 95% (/story/slider/:storyId/respond)", async () => {
    const res = await clientB.post(`/story/slider/${publicStoryId}/respond`, { value: 95 });
    if (!res.data?.success || !res.data.sliderResponses?.some(r => r.value === 95)) {
      throw new Error("Slider response was not persisted");
    }
  });

  await test("18. Account B replies to Story via DM (/story/reply/:storyId)", async () => {
    const res = await clientB.post(`/story/reply/${publicStoryId}`, {
      message: "Check out this story!",
      text: "Check out this story!",
    });
    if (!res.data?.success) throw new Error("Failed to send Story DM reply");
  });

  // 5. Author Activity Sheet & Analytics Aggregation
  await test("19. Account A queries Story Analytics & Activity (/story/analytics/:storyId)", async () => {
    const res = await clientA.get(`/story/analytics/${publicStoryId}`);
    if (!res.data?.success) throw new Error("Failed to fetch story analytics");

    const data = res.data.analytics;
    if (data.metrics.uniqueViewers < 1) throw new Error("uniqueViewers count inaccurate");
    if (data.metrics.totalLikes < 1) throw new Error("totalLikes count inaccurate");
    if (data.metrics.totalReactions < 1) throw new Error("totalReactions count inaccurate");
    if (!data.reactionBreakdown?.["🔥"]) throw new Error("Emoji breakdown missing 🔥 reaction");

    const pollMetric = data.stickerAnalytics.find(s => s.type === "poll");
    if (!pollMetric || pollMetric.totalVotes < 1) throw new Error("Poll analytics missing votes");

    const quizMetric = data.stickerAnalytics.find(s => s.type === "quiz");
    if (!quizMetric || quizMetric.totalAnswers < 1 || quizMetric.correctAnswers < 1) {
      throw new Error("Quiz analytics missing answers");
    }

    const sliderMetric = data.stickerAnalytics.find(s => s.type === "slider");
    if (!sliderMetric || sliderMetric.totalResponses < 1 || sliderMetric.averageValue !== 95) {
      throw new Error("Slider analytics missing or average calculation inaccurate");
    }
  });

  // 6. Highlights Lifecycle
  await test("20. Account A creates a Highlight from the story (/story/highlight/create)", async () => {
    const res = await clientA.post("/story/highlight/create", {
      title: "Summer Vibes",
      storyIds: JSON.stringify([publicStoryId]),
    });
    if (!res.data?.success || !res.data.highlight?._id) {
      throw new Error("Failed to create Highlight collection");
    }
    highlightId = res.data.highlight._id;
  });

  await test("21. Fetch Highlights by username for Profile Tray (/story/highlight/user/:userName)", async () => {
    const res = await clientB.get(`/story/highlight/user/${userAData.userName}`);
    if (!res.data?.success || !res.data.highlights?.some(h => h._id === highlightId)) {
      throw new Error("Highlight not found under author profile");
    }
  });

  // 7. Security & Privacy Revocation
  await test("22. Security Check: Remove Account B from Close Friends and verify immediate exclusion", async () => {
    await clientA.post(`/story/close-friends/toggle/${userBId}`);

    const res = await clientB.get("/story/feed");
    const authorGroup = res.data.feed?.find(g => g.author?._id === userAId);
    const cfStory = authorGroup?.stories?.find(s => s._id === closeFriendsStoryId);
    if (cfStory) {
      throw new Error("SECURITY VIOLATION: Excluded user can still view Close Friends story!");
    }
  });

  // 8. Story Deletion Lifecycle
  await test("23. Account A deletes story (/story/:storyId)", async () => {
    const res = await clientA.delete(`/story/${publicStoryId}`);
    if (!res.data?.success) throw new Error("Failed to delete story");
  });

  console.log("\n=================================================================");
  console.log(`   TEST EXECUTION SUMMARY: ${results.passed}/${results.total} PASSED`);
  if (results.failed > 0) {
    console.log(`   ❌ ${results.failed} TESTS FAILED`);
  } else {
    console.log("   🎉 ALL 23 RUNTIME INTEGRATION & SECURITY TESTS PASSED WITH 100% SUCCESS!");
  }
  console.log("=================================================================\n");

  await mongoose.disconnect();
};

runStoryEndToEndTests().catch((e) => {
  console.error("FATAL TEST ERROR:", e);
  process.exit(1);
});
