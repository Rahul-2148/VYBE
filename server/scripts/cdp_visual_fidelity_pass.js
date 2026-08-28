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

  async waitFor(expr, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await this.eval(expr);
        if (res) return res;
      } catch {}
      await sleep(200);
    }
    return null;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const runVisualFidelityPass = async () => {
  console.log("=================================================================");
  console.log("   VYBE STORY SYSTEM — MULTI-VIEWPORT VISUAL FIDELITY QA         ");
  console.log("=================================================================\n");

  const wsUrl = await getTargetWsUrl();
  const cdp = new CDPConnection(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");

  // Define Mock Story for rich viewer inspections
  const injectStoryViewer = async () => {
    await cdp.eval(`
      (() => {
        const demoStory = {
          _id: "demo_story_fidelity",
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
          caption: "VYBE Visual Fidelity Showcase ✨",
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
              position: { x: 50, y: 30 },
              scale: 1,
              styleIndex: 0,
              poll: {
                question: "Rate this Story experience:",
                options: [{ optionText: "Flawless 🔥" }, { optionText: "Super Clean ✨" }]
              }
            },
            {
              type: "quiz",
              position: { x: 50, y: 55 },
              scale: 1,
              styleIndex: 0,
              quiz: {
                question: "VYBE UI Design Standard:",
                options: ["Good", "Premium", "Instagram-Grade"],
                correctOptionIndex: 2
              }
            },
            {
              type: "slider",
              position: { x: 50, y: 78 },
              scale: 1,
              styleIndex: 0,
              slider: {
                question: "Vibe check",
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
  };

  // ==========================================
  // VIEWPORT 1: Desktop 1440x900
  // ==========================================
  console.log("▶ 1. Testing Desktop (1440x900)...");
  await cdp.setViewport(1440, 900, 1, false);
  await cdp.send("Page.navigate", { url: "http://localhost:5173/" });
  await sleep(2000);
  await cdp.captureScreenshot("vf_01_desktop_1440_tray.png");

  // Open Story Creator on Desktop
  await cdp.eval(`document.getElementById('story-dp-add-btn')?.click() || document.getElementById('story-dp-ring')?.click();`);
  await sleep(2000);
  await cdp.captureScreenshot("vf_02_desktop_1440_creator.png");

  // Open Stickers Drawer on Desktop
  await cdp.eval(`
    (() => {
      const btn = document.querySelector('button[title*="Sticker" i]') || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-smile'));
      if (btn) btn.click();
    })()
  `);
  await sleep(1500);
  await cdp.captureScreenshot("vf_03_desktop_1440_stickers.png");

  // Open Music Picker on Desktop
  await cdp.eval(`
    (() => {
      document.querySelector('button[aria-label="Close"], button.close-drawer')?.click();
      const btn = document.querySelector('button[title*="Music" i]') || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-music'));
      if (btn) btn.click();
    })()
  `);
  await sleep(1500);
  await cdp.captureScreenshot("vf_04_desktop_1440_music.png");

  // ==========================================
  // VIEWPORT 2: Desktop 1920x1080
  // ==========================================
  console.log("▶ 2. Testing Full HD Desktop (1920x1080)...");
  await cdp.setViewport(1920, 1080, 1, false);
  await sleep(1000);
  await cdp.captureScreenshot("vf_05_desktop_1920_creator.png");

  // ==========================================
  // VIEWPORT 3: Mobile 390x844 (iPhone 14)
  // ==========================================
  console.log("▶ 3. Testing Mobile (390x844)...");
  await cdp.setViewport(390, 844, 2, true);
  await cdp.send("Page.navigate", { url: "http://localhost:5173/" });
  await sleep(2000);
  await cdp.captureScreenshot("vf_06_mobile_390_tray.png");

  // Open Creator on Mobile
  await cdp.eval(`document.getElementById('story-dp-add-btn')?.click() || document.getElementById('story-dp-ring')?.click();`);
  await sleep(2000);
  await cdp.captureScreenshot("vf_07_mobile_390_creator.png");

  // Open Stickers on Mobile
  await cdp.eval(`
    (() => {
      const btn = document.querySelector('button[title*="Sticker" i]') || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-smile'));
      if (btn) btn.click();
    })()
  `);
  await sleep(1500);
  await cdp.captureScreenshot("vf_08_mobile_390_stickers.png");

  // ==========================================
  // VIEWPORT 4: Mobile 412x915 (Android / Pixel)
  // ==========================================
  console.log("▶ 4. Testing Android Mobile (412x915)...");
  await cdp.setViewport(412, 915, 2.625, true);
  await sleep(1000);
  await cdp.captureScreenshot("vf_09_mobile_412_creator.png");

  // Reset to Desktop standard
  await cdp.setViewport(1440, 900, 1, false);
  await sleep(500);

  console.log("\n=================================================================");
  console.log("   VISUAL FIDELITY CAPTURE PASS COMPLETED!");
  console.log("=================================================================\n");

  cdp.close();
};

runVisualFidelityPass().catch((e) => {
  console.error("FATAL VISUAL FIDELITY QA ERROR:", e);
  process.exit(1);
});
