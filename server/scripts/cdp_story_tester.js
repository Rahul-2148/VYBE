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

const runBrowserQA = async () => {
  console.log("=================================================================");
  console.log("   VYBE STORY SYSTEM — LIVE CHROME BROWSER QA & VALIDATION       ");
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

  // 1. Navigate to /upload with Story mode
  await step("1. Open /upload and switch to Story tab", async () => {
    await cdp.send("Page.navigate", { url: "http://localhost:5173/upload" });
    await sleep(2000);
    
    // Click Story tab
    await cdp.eval(`
      (() => {
        const storyTab = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Story');
        if (storyTab) storyTab.click();
      })()
    `);
    await sleep(1500);
    await cdp.captureScreenshot("02_story_creator_studio.png");
  });

  // 2. Test Text Mode in Story Creator
  await step("2. Toggle Text Mode ('Aa') in Creator", async () => {
    await cdp.eval(`
      (() => {
        const textBtn = Array.from(document.querySelectorAll('button')).find(b => b.title?.includes('Text') || b.querySelector('svg.lucide-type'));
        if (textBtn) textBtn.click();
      })()
    `);
    await sleep(1000);
    await cdp.captureScreenshot("03_story_creator_text_mode.png");
  });

  // 3. Test Stickers Drawer
  await step("3. Open 4-Column Stickers Drawer", async () => {
    await cdp.eval(`
      (() => {
        const stickerBtn = Array.from(document.querySelectorAll('button')).find(b => b.title?.includes('Sticker') || b.querySelector('svg.lucide-smile') || b.querySelector('svg.lucide-sparkles'));
        if (stickerBtn) stickerBtn.click();
      })()
    `);
    await sleep(1500);
    await cdp.captureScreenshot("04_story_creator_stickers_drawer.png");
  });

  // 4. Open Music Picker
  await step("4. Open Music Picker Modal", async () => {
    await cdp.eval(`
      (() => {
        // Close stickers drawer if open
        const closeBtn = document.querySelector('button[aria-label="Close"], button.close-drawer');
        if (closeBtn) closeBtn.click();
        
        const musicBtn = Array.from(document.querySelectorAll('button')).find(b => b.title?.includes('Music') || b.querySelector('svg.lucide-music'));
        if (musicBtn) musicBtn.click();
      })()
    `);
    await sleep(1500);
    await cdp.captureScreenshot("05_story_music_picker.png");
  });

  // 5. Test Mobile Viewport (390x844 iPhone 14 / modern standard)
  await step("5. Test Mobile Viewport 390x844", async () => {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1000);
    await cdp.captureScreenshot("06_story_creator_mobile_390x844.png");
  });

  // 6. Reset Viewport
  await step("6. Reset Desktop Viewport (1440x900)", async () => {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(1000);
  });

  // 7. Inspect Console & Runtime errors
  console.log("\n=================================================================");
  console.log(`   BROWSER CONSOLE LOGS (${cdp.consoleLogs.length})`);
  console.log("=================================================================");
  cdp.consoleLogs.slice(-10).forEach(log => console.log("  ", log));

  if (cdp.pageErrors.length > 0) {
    console.log("\n=================================================================");
    console.log(`   ❌ BROWSER RUNTIME ERRORS (${cdp.pageErrors.length})`);
    console.log("=================================================================");
    cdp.pageErrors.forEach(err => console.error("  ", err));
  } else {
    console.log("\n  ✨ ZERO Runtime Exceptions in Browser Console!");
  }

  cdp.close();
};

runBrowserQA().catch((e) => {
  console.error("FATAL CDP QA ERROR:", e);
  process.exit(1);
});
