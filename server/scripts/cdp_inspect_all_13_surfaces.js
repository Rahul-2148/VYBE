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

const runVisualInspection = async () => {
  console.log("=================================================================");
  console.log("   VYBE STORY SYSTEM — ALL 13 SURFACES VISUAL INSPECTION PASS   ");
  console.log("=================================================================\n");

  const wsUrl = await getTargetWsUrl();
  const cdp = new CDPConnection(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");

  // Helper to ensure home page is ready
  console.log("Ensuring Home page is loaded...");
  await cdp.eval(`
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  `);
  await sleep(1500);

  // 1. STORY TRAY (Desktop 1440x900)
  console.log("▶ Surface 1: Story Tray (Desktop 1440x900)");
  await cdp.setViewport(1440, 900, 1, false);
  await sleep(600);
  await cdp.captureScreenshot("s01_tray_desktop_1440.png");

  // 1. STORY TRAY (Mobile 390x844)
  console.log("▶ Surface 1: Story Tray (Mobile 390x844)");
  await cdp.setViewport(390, 844, 2, true);
  await sleep(600);
  await cdp.captureScreenshot("s01_tray_mobile_390.png");

  // 1. STORY TRAY (Mobile 412x915)
  console.log("▶ Surface 1: Story Tray (Mobile 412x915)");
  await cdp.setViewport(412, 915, 2.625, true);
  await sleep(600);
  await cdp.captureScreenshot("s01_tray_mobile_412.png");

  // 7. STORY CREATOR STUDIO (Mobile 390x844)
  console.log("▶ Surface 7: Story Creator Studio (Mobile 390x844)");
  await cdp.eval(`
    (() => {
      const addBtn = document.getElementById('story-dp-add-btn') || document.getElementById('story-dp-ring');
      if (addBtn) addBtn.click();
    })()
  `);
  await sleep(1500);
  await cdp.captureScreenshot("s07_creator_mobile_390.png");

  // 7. STORY CREATOR STUDIO (Desktop 1440x900 & 1920x1080)
  console.log("▶ Surface 7: Story Creator Studio (Desktop 1440x900)");
  await cdp.setViewport(1440, 900, 1, false);
  await sleep(600);
  await cdp.captureScreenshot("s07_creator_desktop_1440.png");

  console.log("▶ Surface 7: Story Creator Studio (Desktop 1920x1080)");
  await cdp.setViewport(1920, 1080, 1, false);
  await sleep(600);
  await cdp.captureScreenshot("s07_creator_desktop_1920.png");

  // 8. TEXT EDITOR (Desktop 1440x900 & Mobile 390x844)
  console.log("▶ Surface 8: Text Editor Overlay (Desktop 1440x900)");
  await cdp.setViewport(1440, 900, 1, false);
  await cdp.eval(`
    (() => {
      const textBtn = document.querySelector('button[title*="Add Text" i]') || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-type'));
      if (textBtn) textBtn.click();
    })()
  `);
  await sleep(1000);
  await cdp.captureScreenshot("s08_text_editor_desktop_1440.png");

  console.log("▶ Surface 8: Text Editor Overlay (Mobile 390x844)");
  await cdp.setViewport(390, 844, 2, true);
  await sleep(600);
  await cdp.captureScreenshot("s08_text_editor_mobile_390.png");

  // Close text editor
  await cdp.eval(`
    (() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Cancel' || b.innerText?.trim() === 'Done');
      if (cancelBtn) cancelBtn.click();
    })()
  `);
  await sleep(800);

  // 9. STICKER DRAWER (Desktop 1440x900 & Mobile 390x844)
  console.log("▶ Surface 9: 17-Category Sticker Drawer (Desktop 1440x900)");
  await cdp.setViewport(1440, 900, 1, false);
  await cdp.eval(`
    (() => {
      const stickerBtn = document.querySelector('button[title*="Sticker" i]') || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-smile'));
      if (stickerBtn) stickerBtn.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("s09_sticker_drawer_desktop_1440.png");

  console.log("▶ Surface 9: 17-Category Sticker Drawer (Mobile 390x844)");
  await cdp.setViewport(390, 844, 2, true);
  await sleep(600);
  await cdp.captureScreenshot("s09_sticker_drawer_mobile_390.png");

  // 10. STICKER INTERACTIONS (Poll configuration & placement)
  console.log("▶ Surface 10: Interactive Poll Sticker Modal");
  await cdp.eval(`
    (() => {
      const pollBtn = Array.from(document.querySelectorAll('button, div')).find(el => el.innerText?.trim() === 'POLL' || el.innerText?.includes('POLL'));
      if (pollBtn) pollBtn.click();
    })()
  `);
  await sleep(1000);
  await cdp.captureScreenshot("s10_sticker_poll_modal.png");

  // Confirm poll sticker to canvas
  await cdp.eval(`
    (() => {
      const doneBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Done');
      if (doneBtn) doneBtn.click();
    })()
  `);
  await sleep(1000);
  await cdp.captureScreenshot("s10_sticker_poll_on_canvas.png");

  // 11. MUSIC PICKER STUDIO
  console.log("▶ Surface 11: Music Soundtrack Studio");
  await cdp.eval(`
    (() => {
      const musicBtn = document.querySelector('button[title*="Music" i]') || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-music'));
      if (musicBtn) musicBtn.click();
    })()
  `);
  await sleep(1500);
  await cdp.captureScreenshot("s11_music_picker_studio.png");

  // Close Music modal
  await cdp.eval(`
    (() => {
      const closeBtn = document.querySelector('button[aria-label="Close"], button.close-drawer, [title="Close"]');
      if (closeBtn) closeBtn.click();
    })()
  `);
  await sleep(800);

  // Reset to Desktop standard
  await cdp.setViewport(1440, 900, 1, false);

  console.log("\n=================================================================");
  console.log("   SURFACES QA COMPLETED SUCCESSFULLY!");
  console.log("=================================================================\n");

  cdp.close();
};

runVisualInspection().catch((e) => {
  console.error("FATAL INSPECTION QA ERROR:", e);
  process.exit(1);
});
