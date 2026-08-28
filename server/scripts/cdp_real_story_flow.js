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

  async waitFor(expr, timeoutMs = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await this.eval(expr);
        if (res) return res;
      } catch {}
      await sleep(300);
    }
    throw new Error(`Timeout waiting for: ${expr}`);
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const runRealStoryFlow = async () => {
  console.log("=================================================================");
  console.log("   VYBE STORY SYSTEM — FEED TO CREATOR CLICK-THROUGH QA          ");
  console.log("=================================================================\n");

  const wsUrl = await getTargetWsUrl();
  const cdp = new CDPConnection(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");

  // 1. Home Feed
  console.log("▶ Step 1: Navigating to Home feed http://localhost:5173/");
  await cdp.send("Page.navigate", { url: "http://localhost:5173/" });
  
  // Wait for Story Tray to render
  console.log("  Waiting for Story Tray to mount in DOM...");
  await cdp.waitFor(`Boolean(document.getElementById('story-dp-ring') || document.querySelector('[data-testid="story-dp-avatar"]'))`, 12000);
  await sleep(1000);
  await cdp.captureScreenshot("12_home_feed_initial.png");

  // 2. Click Plus Badge on Your Story
  console.log("▶ Step 2: Clicking Plus (+) Badge on Your Story");
  const clicked = await cdp.eval(`
    (() => {
      const addBtn = document.getElementById('story-dp-add-btn') || document.getElementById('story-dp-ring');
      if (addBtn) {
        addBtn.click();
        return "Clicked add button";
      }
      return "Button not found";
    })()
  `);
  console.log("  Result:", clicked);

  // Wait for Story Creator stage to mount
  console.log("  Waiting for Story Creator to mount...");
  await cdp.waitFor(`Boolean(document.querySelector('button[title*="Text" i]') || document.querySelector('svg.lucide-type') || document.querySelector('.lucide-camera'))`, 10000);
  await sleep(1000);
  await cdp.captureScreenshot("13_creator_opened_via_plus.png");

  // 3. Select Text Mode
  console.log("▶ Step 3: Selecting Text Mode ('Aa') in Creator");
  await cdp.eval(`
    (() => {
      const typeBtn = Array.from(document.querySelectorAll('button')).find(b => b.title?.includes('Text') || b.querySelector('svg.lucide-type'));
      if (typeBtn) typeBtn.click();
    })()
  `);
  await sleep(1000);
  await cdp.captureScreenshot("14_creator_text_mode_active.png");

  // 4. Open Stickers Drawer
  console.log("▶ Step 4: Opening Stickers Drawer");
  await cdp.eval(`
    (() => {
      const stickerBtn = Array.from(document.querySelectorAll('button')).find(b => b.title?.includes('Sticker') || b.querySelector('svg.lucide-smile'));
      if (stickerBtn) stickerBtn.click();
    })()
  `);
  await sleep(1500);
  await cdp.captureScreenshot("15_creator_stickers_grid.png");

  console.log("\n=================================================================");
  console.log("   FLOW QA COMPLETED SUCCESSFULLY!");
  console.log("=================================================================\n");

  cdp.close();
};

runRealStoryFlow().catch((e) => {
  console.error("FATAL FLOW QA ERROR:", e);
  process.exit(1);
});
