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
  console.log("   VYBE STORY VIEWER & ACTIVITY FIDELITY VERIFICATION            ");
  console.log("=================================================================\n");

  const wsUrl = await getTargetWsUrl();
  const cdp = new CDPConnection(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");

  // Step 1: Upload a real test story with Poll & Quiz from Creator UI
  console.log("▶ Step 1: Navigating to Creator and publishing real Story...");
  await cdp.setViewport(390, 844, 2, true);
  await cdp.eval(`
    (() => {
      if (window.location.pathname !== '/upload' || !window.location.search.includes('type=story')) {
        window.history.pushState({}, '', '/upload?type=story');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    })()
  `);
  await sleep(1500);

  // Click Text Mode ('T')
  await cdp.eval(`
    (() => {
      const textBtn = document.querySelector('button[title*="Add Text" i]') || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-type'));
      if (textBtn) textBtn.click();
    })()
  `);
  await sleep(1000);

  // Type Story Text
  await cdp.eval(`
    (() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = 'VYBE Story Visual Fidelity ✨🔥';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const doneBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Done' || b.innerText?.trim() === 'Add Text');
      if (doneBtn) doneBtn.click();
    })()
  `);
  await sleep(1000);

  // Open Stickers Drawer
  await cdp.eval(`
    (() => {
      const btn = document.querySelector('button[title*="Sticker" i]') || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-smile'));
      if (btn) btn.click();
    })()
  `);
  await sleep(1000);

  // Add Poll Sticker
  await cdp.eval(`
    (() => {
      const pollBtn = Array.from(document.querySelectorAll('button, div')).find(el => el.innerText?.trim() === 'POLL' || el.innerText?.includes('POLL'));
      if (pollBtn) pollBtn.click();
    })()
  `);
  await sleep(1000);

  // Save Poll Sticker
  await cdp.eval(`
    (() => {
      const doneBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Done');
      if (doneBtn) doneBtn.click();
    })()
  `);
  await sleep(1000);

  // Click "Your story" to publish
  console.log("▶ Step 2: Clicking 'Your story' button to publish story...");
  await cdp.eval(`
    (() => {
      const shareBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Your story'));
      if (shareBtn) shareBtn.click();
    })()
  `);
  await sleep(3500);

  // Capture Home Feed with Active Story Ring
  console.log("▶ Step 3: Verifying Home Feed with Active Story Ring...");
  await cdp.setViewport(390, 844, 2, true);
  await sleep(1000);
  await cdp.captureScreenshot("v4_01_home_feed_active_ring.png");

  // Click Story Ring to open Viewer
  console.log("▶ Step 4: Clicking active Story Ring to open Story Viewer...");
  await cdp.eval(`
    (() => {
      const avatar = document.getElementById('story-dp-ring') || document.querySelector('[data-testid="story-dp-avatar"]');
      if (avatar) avatar.click();
    })()
  `);
  await sleep(2500);

  // Capture Viewer in all 4 viewports!
  console.log("▶ Surface 2, 3, 4, 5: Story Viewer on Mobile 390x844");
  await cdp.setViewport(390, 844, 2, true);
  await sleep(600);
  await cdp.captureScreenshot("v4_02_viewer_mobile_390.png");

  console.log("▶ Surface 2, 3, 4, 5: Story Viewer on Mobile 412x915");
  await cdp.setViewport(412, 915, 2.625, true);
  await sleep(600);
  await cdp.captureScreenshot("v4_03_viewer_mobile_412.png");

  console.log("▶ Surface 2, 3, 4, 5: Story Viewer on Desktop 1440x900");
  await cdp.setViewport(1440, 900, 1, false);
  await sleep(600);
  await cdp.captureScreenshot("v4_04_viewer_desktop_1440.png");

  console.log("▶ Surface 2, 3, 4, 5: Story Viewer on Desktop 1920x1080");
  await cdp.setViewport(1920, 1080, 1, false);
  await sleep(600);
  await cdp.captureScreenshot("v4_05_viewer_desktop_1920.png");

  // Surface 6: Activity Sheet Viewers Tab
  console.log("▶ Surface 6: Story Activity Sheet on Mobile 390x844");
  await cdp.setViewport(390, 844, 2, true);
  await cdp.eval(`
    (() => {
      const actBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Activity') || b.querySelector('svg.lucide-users') || b.innerText?.includes('Seen by'));
      if (actBtn) actBtn.click();
    })()
  `);
  await sleep(1500);
  await cdp.captureScreenshot("v4_06_activity_sheet_mobile_390.png");

  // Activity Sheet Responses Tab
  await cdp.eval(`
    (() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Responses' || b.innerText?.includes('Responses'));
      if (tab) tab.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("v4_07_activity_responses_mobile_390.png");

  // Activity Sheet Analytics Tab
  await cdp.eval(`
    (() => {
      const tab = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Analytics') || b.innerText?.includes('Insights'));
      if (tab) tab.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("v4_08_activity_analytics_mobile_390.png");

  // Surface 12: Highlight Modal
  console.log("▶ Surface 12: Highlight Modal on Mobile 390x844");
  await cdp.eval(`
    (() => {
      document.querySelector('button[aria-label="Close"], button.close-drawer')?.click();
      const hlBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.includes('Highlight') || b.querySelector('svg.lucide-sparkles'));
      if (hlBtn) hlBtn.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("v4_09_highlighter_modal_mobile_390.png");

  // Reset to Desktop
  await cdp.setViewport(1440, 900, 1, false);

  console.log("\n=================================================================");
  console.log("   ALL REAL STORY VIEWER CAPTURES COMPLETED!");
  console.log("=================================================================\n");

  cdp.close();
};

run().catch((e) => {
  console.error("FATAL QA ERROR:", e);
  process.exit(1);
});
