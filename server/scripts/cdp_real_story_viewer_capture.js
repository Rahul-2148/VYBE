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

const run = async () => {
  console.log("=================================================================");
  console.log("   VYBE STORY SYSTEM — LIVE REAL STORY VIEWER CAPTURES           ");
  console.log("=================================================================\n");

  const wsUrl = await getTargetWsUrl();
  const cdp = new CDPConnection(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");

  // Step 1: Create a story with Poll and Quiz via Axios in the browser context
  console.log("▶ Step 1: Publishing real Story via Axios in browser...");
  const publishRes = await cdp.eval(`
    (async () => {
      try {
        const token = localStorage.getItem('token') || '';
        const formData = new FormData();
        formData.append('mediaType', 'image');
        formData.append('caption', 'VYBE Story Visual Fidelity ✨');
        formData.append('visibleTo', 'public');
        
        // Mock image file
        const blob = new Blob(['sample'], { type: 'image/jpeg' });
        formData.append('media', blob, 'story.jpg');

        formData.append('stickers', JSON.stringify([
          {
            type: 'poll',
            position: { x: 50, y: 35 },
            scale: 1,
            styleIndex: 0,
            poll: {
              question: 'Instagram-Grade Quality?',
              options: [{ optionText: 'Absolutely 🔥' }, { optionText: '100% ✨' }]
            }
          },
          {
            type: 'quiz',
            position: { x: 50, y: 60 },
            scale: 1,
            styleIndex: 0,
            quiz: {
              question: 'Story Frame Aspect Ratio:',
              options: ['1:1', '4:5', '9:16'],
              correctOptionIndex: 2
            }
          }
        ]));

        formData.append('music', JSON.stringify({
          title: 'Golden Hour Glow',
          artist: 'Aesthetic Wave',
          audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_ambience.ogg'
        }));

        const res = await fetch('/api/v1/story/upload', {
          method: 'POST',
          body: formData,
          headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();
        return { success: res.ok, data };
      } catch (err) {
        return { error: err.message };
      }
    })()
  `);
  console.log("  Publish result:", JSON.stringify(publishRes));

  // Step 2: Go to Home page and refresh feed
  console.log("▶ Step 2: Refreshing Feed to display new active story ring...");
  await cdp.eval(`
    (async () => {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      if (window.store) {
        try {
          const res = await fetch('/api/v1/story/feed');
          const data = await res.json();
          if (data.success && data.feed) {
            window.store.dispatch({ type: 'story/setStoryFeed', payload: data.feed });
          }
        } catch (e) {}
      }
    })()
  `);
  await sleep(2000);
  await cdp.setViewport(1440, 900, 1, false);
  await cdp.captureScreenshot("v3_01_feed_with_active_ring.png");

  // Step 3: Click the active Story Ring to open Story Viewer
  console.log("▶ Step 3: Clicking active Story Ring to open Story Viewer...");
  await cdp.eval(`
    (() => {
      const ring = document.getElementById('story-dp-ring') || document.querySelector('[data-testid="story-dp-avatar"]');
      if (ring) ring.click();
    })()
  `);
  await sleep(2500);

  // Desktop 1440x900 Viewer
  console.log("▶ Surface 2, 3, 4, 5: Story Viewer on Desktop 1440x900");
  await cdp.setViewport(1440, 900, 1, false);
  await sleep(600);
  await cdp.captureScreenshot("v3_02_viewer_desktop_1440.png");

  // Desktop 1920x1080 Viewer
  console.log("▶ Surface 2, 3, 4, 5: Story Viewer on Desktop 1920x1080");
  await cdp.setViewport(1920, 1080, 1, false);
  await sleep(600);
  await cdp.captureScreenshot("v3_03_viewer_desktop_1920.png");

  // Mobile 390x844 Viewer
  console.log("▶ Surface 2, 3, 4, 5: Story Viewer on Mobile 390x844");
  await cdp.setViewport(390, 844, 2, true);
  await sleep(600);
  await cdp.captureScreenshot("v3_04_viewer_mobile_390.png");

  // Mobile 412x915 Viewer
  console.log("▶ Surface 2, 3, 4, 5: Story Viewer on Mobile 412x915");
  await cdp.setViewport(412, 915, 2.625, true);
  await sleep(600);
  await cdp.captureScreenshot("v3_05_viewer_mobile_412.png");

  // Surface 6: Activity Sheet Viewers
  console.log("▶ Surface 6: Story Activity Sheet - Viewers Tab (Mobile 390x844)");
  await cdp.setViewport(390, 844, 2, true);
  await cdp.eval(`
    (() => {
      const actBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Activity') || b.querySelector('svg.lucide-users') || b.innerText?.includes('Seen by'));
      if (actBtn) actBtn.click();
    })()
  `);
  await sleep(1500);
  await cdp.captureScreenshot("v3_06_activity_viewers_mobile_390.png");

  // Activity Sheet Responses
  console.log("▶ Surface 6: Story Activity Sheet - Responses Tab (Mobile 390x844)");
  await cdp.eval(`
    (() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Responses' || b.innerText?.includes('Responses'));
      if (tab) tab.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("v3_07_activity_responses_mobile_390.png");

  // Activity Sheet Analytics
  console.log("▶ Surface 6: Story Activity Sheet - Analytics Tab (Mobile 390x844)");
  await cdp.eval(`
    (() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Analytics') || b.innerText?.includes('Insights'));
      if (tab) tab.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("v3_08_activity_analytics_mobile_390.png");

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
  await cdp.captureScreenshot("v3_09_highlighter_modal.png");

  // Reset to Desktop
  await cdp.setViewport(1440, 900, 1, false);

  console.log("\n=================================================================");
  console.log("   LIVE STORY VIEWER FIDELITY PASS COMPLETED!");
  console.log("=================================================================\n");

  cdp.close();
};

run().catch((e) => {
  console.error("FATAL ERROR:", e);
  process.exit(1);
});
