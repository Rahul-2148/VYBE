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

const runViewerFidelity = async () => {
  console.log("=================================================================");
  console.log("   VYBE STORY SYSTEM — STORY VIEWER & ACTIVITY FIDELITY PASS     ");
  console.log("=================================================================\n");

  const wsUrl = await getTargetWsUrl();
  const cdp = new CDPConnection(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");

  // Mount Story Viewer with full stickers & engagement data
  console.log("▶ 1. Launching Story Viewer with multi-sticker story...");
  await cdp.eval(`
    (() => {
      const demoStory = {
        _id: "demo_fidelity_viewer_story",
        author: {
          _id: "author_fidelity",
          userName: "rahul_modi",
          name: "Rahul Raj Modi",
          isVerified: true,
          profileImage: { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400" }
        },
        mediaType: "image",
        media: {
          url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080"
        },
        caption: "VYBE Visual Fidelity Experience ✨🔥",
        music: {
          title: "Golden Hour Glow",
          artist: "Aesthetic Wave",
          audioUrl: "https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg"
        },
        visibleTo: "public",
        createdAt: new Date().toISOString(),
        viewers: [
          { _id: "v1", userName: "priya_sharma", name: "Priya Sharma", profileImage: { url: "" } },
          { _id: "v2", userName: "alex_rivers", name: "Alex Rivers", profileImage: { url: "" } }
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
              question: "Rate this vertical layout:",
              options: [{ optionText: "Flawless 🔥" }, { optionText: "Super Clean ✨" }]
            }
          },
          {
            type: "quiz",
            position: { x: 50, y: 56 },
            scale: 1,
            styleIndex: 0,
            quiz: {
              question: "Story System Quality:",
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

      window.history.pushState({ stories: [demoStory] }, "", "/story");
      window.dispatchEvent(new PopStateEvent("popstate", { state: { stories: [demoStory] } }));
    })()
  `);
  await sleep(2000);

  // Desktop 1440x900 - Story Viewer Stage
  console.log("▶ Surface 2, 3, 4, 5: Story Viewer on Desktop 1440x900");
  await cdp.setViewport(1440, 900, 1, false);
  await sleep(600);
  await cdp.captureScreenshot("s02_viewer_desktop_1440.png");

  // Mobile 390x844 - Story Viewer Stage
  console.log("▶ Surface 2, 3, 4, 5: Story Viewer on Mobile 390x844");
  await cdp.setViewport(390, 844, 2, true);
  await sleep(600);
  await cdp.captureScreenshot("s02_viewer_mobile_390.png");

  // Mobile 412x915 - Story Viewer Stage
  console.log("▶ Surface 2, 3, 4, 5: Story Viewer on Mobile 412x915");
  await cdp.setViewport(412, 915, 2.625, true);
  await sleep(600);
  await cdp.captureScreenshot("s02_viewer_mobile_412.png");

  // Surface 6: Activity Sheet - Viewers Tab (Mobile 390x844)
  console.log("▶ Surface 6: Story Activity Sheet - Viewers Tab (Mobile 390x844)");
  await cdp.setViewport(390, 844, 2, true);
  await cdp.eval(`
    (() => {
      const activityBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Activity') || b.querySelector('svg.lucide-users') || b.innerText?.includes('Seen by'));
      if (activityBtn) activityBtn.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("s06_activity_sheet_viewers_mobile_390.png");

  // Activity Sheet - Responses Tab (Mobile 390x844)
  console.log("▶ Surface 6: Story Activity Sheet - Responses Tab (Mobile 390x844)");
  await cdp.eval(`
    (() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Responses' || b.innerText?.includes('Responses'));
      if (tab) tab.click();
    })()
  `);
  await sleep(1000);
  await cdp.captureScreenshot("s06_activity_sheet_responses_mobile_390.png");

  // Activity Sheet - Analytics Tab (Mobile 390x844)
  console.log("▶ Surface 6: Story Activity Sheet - Analytics Tab (Mobile 390x844)");
  await cdp.eval(`
    (() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Analytics') || b.innerText?.includes('Insights'));
      if (tab) tab.click();
    })()
  `);
  await sleep(1000);
  await cdp.captureScreenshot("s06_activity_sheet_analytics_mobile_390.png");

  // Surface 12: Highlight Creator Modal
  console.log("▶ Surface 12: Highlight Creator Modal");
  await cdp.eval(`
    (() => {
      // Close activity drawer
      document.querySelector('button[aria-label="Close"], button.close-drawer')?.click();
      // Click Highlight button in Author Dock
      const hlBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Highlight') || b.querySelector('svg.lucide-sparkles') || b.querySelector('svg.lucide-heart'));
      if (hlBtn) hlBtn.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("s12_highlighter_modal_mobile_390.png");

  // Reset to Desktop
  await cdp.setViewport(1440, 900, 1, false);

  console.log("\n=================================================================");
  console.log("   VIEWER FIDELITY CAPTURE COMPLETED SUCCESSFULLY!");
  console.log("=================================================================\n");

  cdp.close();
};

runViewerFidelity().catch((e) => {
  console.error("FATAL VIEWER FIDELITY ERROR:", e);
  process.exit(1);
});
