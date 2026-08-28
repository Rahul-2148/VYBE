import http from "http";
import fs from "fs";
import path from "path";

const ARTIFACTS_DIR = "C:/Users/Rahul Raj Modi/.gemini/antigravity-ide/brain/31d0eafe-f35f-46d2-82fb-76a1b1df3014";

const getTargetWsUrl = () => {
  return new Promise((resolve, reject) => {
    http.get("http://127.0.0.1:9222/json", (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const list = JSON.parse(data);
          const page = list.find((p) => p.type === "page" && !p.url.startsWith("chrome://"));
          if (page) resolve(page.webSocketDebuggerUrl);
          else reject(new Error("No active page found"));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
};

class CDPConnection {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result || msg);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.msgId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: false,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text + " " + (res.exceptionDetails.exception?.description || ""));
    }
    return res.result ? res.result.value : undefined;
  }

  async captureScreenshot(filename) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    const fullPath = path.join(ARTIFACTS_DIR, filename);
    fs.writeFileSync(fullPath, buffer);
    console.log(`  📸 Screenshot saved: ${filename}`);
    return fullPath;
  }

  async setViewport(width, height, deviceScaleFactor = 1, isMobile = false) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor,
      mobile: isMobile,
    });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const runFidelityPass = async () => {
  console.log("=================================================================");
  console.log("   VYBE STORY SYSTEM — COMPLETE VIEWER & HUD FIDELITY PASS       ");
  console.log("=================================================================\n");

  const wsUrl = await getTargetWsUrl();
  const cdp = new CDPConnection(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");

  // Step 1: Populate story into Redux state on Home page
  console.log("▶ Step 1: Navigating to Home and seeding story into feed...");
  await cdp.setViewport(1440, 900, 1, false);
  await cdp.eval(`
    (() => {
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    })()
  `);
  await sleep(1500);

  // Seed story with all interactive stickers
  await cdp.eval(`
    (() => {
      const demoStory = {
        _id: "fidelity_active_story",
        author: {
          _id: "fidelity_author",
          userName: "rahul_modi",
          name: "Rahul Raj Modi",
          isVerified: true,
          profileImage: { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400" }
        },
        mediaType: "image",
        media: {
          url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080"
        },
        caption: "VYBE Visual Fidelity Standard ✨",
        music: {
          title: "Golden Hour Glow",
          artist: "Aesthetic Wave",
          audioUrl: "https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg"
        },
        visibleTo: "public",
        createdAt: new Date().toISOString(),
        viewers: [
          { _id: "v1", userName: "priya_sharma", name: "Priya Sharma", profileImage: { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200" } },
          { _id: "v2", userName: "alex_rivers", name: "Alex Rivers", profileImage: { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200" } }
        ],
        likes: ["v1"],
        reactions: [{ user: { _id: "v1", userName: "priya_sharma" }, emoji: "🔥" }],
        stickers: [
          {
            type: "poll",
            position: { x: 50, y: 32 },
            scale: 1,
            styleIndex: 0,
            poll: {
              question: "Rate this story experience:",
              options: [{ optionText: "Flawless 🔥" }, { optionText: "Super Clean ✨" }]
            }
          },
          {
            type: "quiz",
            position: { x: 50, y: 56 },
            scale: 1,
            styleIndex: 0,
            quiz: {
              question: "VYBE UI Design Standard:",
              options: ["Good", "High", "Instagram-Grade"],
              correctOptionIndex: 2
            }
          },
          {
            type: "slider",
            position: { x: 50, y: 78 },
            scale: 1,
            styleIndex: 0,
            slider: {
              question: "Vibe Score",
              emoji: "🔥"
            }
          }
        ],
        pollVotes: [{ user: "v1", optionIndex: 0 }],
        quizAnswers: [{ user: "v1", optionIndex: 2, isCorrect: true }],
        questionResponses: [{ user: { _id: "v1", userName: "priya_sharma" }, responseText: "Stunning vertical layout!" }],
        sliderResponses: [{ user: "v1", value: 96 }]
      };

      const group = {
        author: demoStory.author,
        stories: [demoStory],
        hasCloseFriendsStory: false,
        userName: "rahul_modi"
      };

      // Set directly in Redux store
      const rootStore = window.__REDUX_STORE__ || window.store;
      if (rootStore) {
        rootStore.dispatch({ type: "story/setStoryFeed", payload: [group] });
      }
    })()
  `);
  await sleep(1000);

  // Click on Story Avatar to launch Story Viewer
  console.log("▶ Step 2: Clicking Story Avatar to launch Story Viewer...");
  await cdp.eval(`
    (() => {
      const ring = document.getElementById('story-dp-ring') || document.querySelector('[data-testid="story-dp-avatar"]');
      if (ring) ring.click();
    })()
  `);
  await sleep(2000);

  // Desktop 1440x900 - Story Viewer Stage
  console.log("▶ Surface 2, 3, 4, 5: Story Viewer Stage (Desktop 1440x900)");
  await cdp.setViewport(1440, 900, 1, false);
  await sleep(800);
  await cdp.captureScreenshot("v2_01_viewer_desktop_1440.png");

  // Desktop 1920x1080 - Story Viewer Stage
  console.log("▶ Surface 2, 3, 4, 5: Story Viewer Stage (Desktop 1920x1080)");
  await cdp.setViewport(1920, 1080, 1, false);
  await sleep(800);
  await cdp.captureScreenshot("v2_02_viewer_desktop_1920.png");

  // Mobile 390x844 - Story Viewer Stage
  console.log("▶ Surface 2, 3, 4, 5: Story Viewer Stage (Mobile 390x844)");
  await cdp.setViewport(390, 844, 2, true);
  await sleep(800);
  await cdp.captureScreenshot("v2_03_viewer_mobile_390.png");

  // Mobile 412x915 - Story Viewer Stage
  console.log("▶ Surface 2, 3, 4, 5: Story Viewer Stage (Mobile 412x915)");
  await cdp.setViewport(412, 915, 2.625, true);
  await sleep(800);
  await cdp.captureScreenshot("v2_04_viewer_mobile_412.png");

  // Surface 6: Activity Sheet (Viewers Tab)
  console.log("▶ Surface 6: Story Activity Sheet - Viewers Tab (Mobile 390x844)");
  await cdp.setViewport(390, 844, 2, true);
  await cdp.eval(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Activity') || b.querySelector('svg.lucide-users') || b.innerText?.includes('Seen by'));
      if (btn) btn.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("v2_05_activity_viewers_mobile_390.png");

  // Activity Sheet (Responses Tab)
  console.log("▶ Surface 6: Story Activity Sheet - Responses Tab (Mobile 390x844)");
  await cdp.eval(`
    (() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Responses' || b.innerText?.includes('Responses'));
      if (tab) tab.click();
    })()
  `);
  await sleep(1000);
  await cdp.captureScreenshot("v2_06_activity_responses_mobile_390.png");

  // Activity Sheet (Analytics Tab)
  console.log("▶ Surface 6: Story Activity Sheet - Analytics Tab (Mobile 390x844)");
  await cdp.eval(`
    (() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Analytics') || b.innerText?.includes('Insights'));
      if (tab) tab.click();
    })()
  `);
  await sleep(1000);
  await cdp.captureScreenshot("v2_07_activity_analytics_mobile_390.png");

  // Surface 12: Highlight Modal
  console.log("▶ Surface 12: Highlight Modal");
  await cdp.eval(`
    (() => {
      document.querySelector('button[aria-label="Close"], button.close-drawer')?.click();
      const hlBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Highlight') || b.querySelector('svg.lucide-sparkles'));
      if (hlBtn) hlBtn.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("v2_08_highlight_modal_mobile_390.png");

  // Reset to Desktop
  await cdp.setViewport(1440, 900, 1, false);

  console.log("\n=================================================================");
  console.log("   COMPLETE FIDELITY PASS FINISHED!");
  console.log("=================================================================\n");

  cdp.close();
};

runFidelityPass().catch((e) => {
  console.error("FATAL QA ERROR:", e);
  process.exit(1);
});
