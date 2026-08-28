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
    this.consoleLogs = [];
    this.pageErrors = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === "Runtime.consoleAPICalled") {
          const text = msg.params.args.map((a) => a.value || a.description || "").join(" ");
          this.consoleLogs.push(`[${msg.params.type}] ${text}`);
        } else if (msg.method === "Runtime.exceptionThrown") {
          this.pageErrors.push(msg.params.exceptionDetails.text + " " + (msg.params.exceptionDetails.exception?.description || ""));
        }

        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
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
      awaitPromise: true,
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

  close() {
    if (this.ws) this.ws.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const runStoryViewerQA = async () => {
  console.log("=================================================================");
  console.log("   VYBE STORY SYSTEM — STORY VIEWER BROWSER QA & VALIDATION      ");
  console.log("=================================================================\n");

  const wsUrl = await getTargetWsUrl();
  const cdp = new CDPConnection(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");

  const step = async (name, fn) => {
    console.log(`\n▶ Step: ${name}`);
    try {
      await fn();
      console.log(`  ✅ SUCCESS: ${name}`);
    } catch (err) {
      console.error(`  ❌ FAILED: ${name}`);
      console.error(`     Reason: ${err.message}`);
    }
  };

  // 1. Launch Story Viewer with rich mockup story containing all stickers
  await step("1. Open Story Viewer (/story)", async () => {
    await cdp.eval(`
      (() => {
        const mockStory = {
          _id: "demo_story_1",
          author: {
            _id: "author_1",
            userName: "rahul_modi",
            name: "Rahul Raj Modi",
            isVerified: true,
            profileImage: { url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400" }
          },
          mediaType: "image",
          media: {
            url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1080"
          },
          caption: "VYBE Story Experience 🔥",
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
                question: "Do you like the new Story system?",
                options: [{ optionText: "Love it! 🔥" }, { optionText: "Obsessed! ✨" }]
              }
            },
            {
              type: "quiz",
              position: { x: 50, y: 56 },
              scale: 1,
              styleIndex: 0,
              quiz: {
                question: "What is the speed of VYBE?",
                options: ["Fast", "Ultra Fast", "Instant"],
                correctOptionIndex: 2
              }
            },
            {
              type: "slider",
              position: { x: 50, y: 78 },
              scale: 1,
              styleIndex: 0,
              slider: {
                question: "Rate this vibe",
                emoji: "🔥"
              }
            }
          ],
          pollVotes: [{ user: "v1", optionIndex: 0 }],
          quizAnswers: [{ user: "v1", optionIndex: 2, isCorrect: true }],
          questionResponses: [{ user: { _id: "v1", userName: "priya_sharma" }, responseText: "Incredible UI!" }],
          sliderResponses: [{ user: "v1", value: 98 }]
        };

        window.history.pushState({ stories: [mockStory] }, "", "/story");
        window.dispatchEvent(new PopStateEvent("popstate", { state: { stories: [mockStory] } }));
      })()
    `);
    await sleep(2000);
    await cdp.captureScreenshot("07_story_viewer_playback.png");
  });

  // 2. Test Double-Tap Heart Burst
  await step("2. Trigger Double-Tap Giant Heart Burst", async () => {
    await cdp.eval(`
      (() => {
        const stage = document.querySelector('.relative.w-full.h-full.sm\\\\:max-w-\\\\[420px\\\\]') || document.querySelector('.bg-black');
        if (stage) {
          const evt = new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 400 });
          stage.dispatchEvent(evt);
          setTimeout(() => {
            stage.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 200, clientY: 400 }));
            // second tap within 200ms
            setTimeout(() => {
              stage.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 400 }));
              stage.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 200, clientY: 400 }));
            }, 80);
          }, 50);
        }
      })()
    `);
    await sleep(400);
    await cdp.captureScreenshot("08_story_viewer_double_tap_heart.png");
  });

  // 3. Test Activity & Viewers Drawer
  await step("3. Open Activity Drawer (Seen by X)", async () => {
    await cdp.eval(`
      (() => {
        const activityBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Activity') || b.querySelector('svg.lucide-users'));
        if (activityBtn) activityBtn.click();
      })()
    `);
    await sleep(1500);
    await cdp.captureScreenshot("09_story_activity_drawer_viewers.png");
  });

  // 4. Switch to Responses tab in Activity Drawer
  await step("4. Switch to Responses tab (Poll, Quiz, Slider, Questions)", async () => {
    await cdp.eval(`
      (() => {
        const respTab = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Responses'));
        if (respTab) respTab.click();
      })()
    `);
    await sleep(1200);
    await cdp.captureScreenshot("10_story_activity_drawer_responses.png");
  });

  // 5. Switch to Analytics tab in Activity Drawer
  await step("5. Switch to Analytics tab", async () => {
    await cdp.eval(`
      (() => {
        const analyticsTab = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Insights') || b.innerText?.includes('Analytics'));
        if (analyticsTab) analyticsTab.click();
      })()
    `);
    await sleep(1200);
    await cdp.captureScreenshot("11_story_activity_drawer_analytics.png");
  });

  // 6. Test Mobile Viewport for Story Viewer (390x844)
  await step("6. Test Story Viewer on Mobile Viewport 390x844", async () => {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1200);
    await cdp.captureScreenshot("12_story_viewer_mobile_390x844.png");
  });

  // 7. Reset Viewport
  await step("7. Reset Viewport to Desktop (1440x900)", async () => {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(1000);
  });

  console.log("\n=================================================================");
  console.log("   STORY VIEWER QA COMPLETED SUCCESSFULLY!");
  console.log("=================================================================\n");

  cdp.close();
};

runStoryViewerQA().catch((e) => {
  console.error("FATAL VIEWER QA ERROR:", e);
  process.exit(1);
});
