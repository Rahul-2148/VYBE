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

  close() {
    if (this.ws) this.ws.close();
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const run = async () => {
  console.log("=================================================================");
  console.log("   VYBE STORY CREATOR STUDIO — FULL VISUAL VERIFICATION          ");
  console.log("=================================================================\n");

  const wsUrl = await getTargetWsUrl();
  const cdp = new CDPConnection(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");

  // Step 1: Click Add Text button
  console.log("▶ Step 1: Opening Text Overlay Modal...");
  await cdp.eval(`
    (() => {
      const textBtn = document.querySelector('button[title*="Add Text" i]') || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-type'));
      if (textBtn) textBtn.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("17_story_text_overlay.png");

  // Step 2: Type in textarea
  console.log("▶ Step 2: Typing story text and picking neon style...");
  await cdp.eval(`
    (() => {
      const ta = document.querySelector('textarea');
      if (ta) {
        ta.value = "VYBE Production Story System 🔥✨";
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()
  `);
  await sleep(1000);
  await cdp.captureScreenshot("18_story_text_typed.png");

  // Step 3: Click Done on Text Overlay
  console.log("▶ Step 3: Clicking Done to commit text sticker to canvas...");
  await cdp.eval(`
    (() => {
      const doneBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Done');
      if (doneBtn) doneBtn.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("19_canvas_with_text_sticker.png");

  // Step 4: Open Stickers Drawer
  console.log("▶ Step 4: Opening Stickers Drawer...");
  await cdp.eval(`
    (() => {
      const stickerBtn = document.querySelector('button[title*="Sticker" i]') || Array.from(document.querySelectorAll('button')).find(b => b.querySelector('svg.lucide-smile'));
      if (stickerBtn) stickerBtn.click();
    })()
  `);
  await sleep(1500);
  await cdp.captureScreenshot("20_stickers_drawer_opened.png");

  // Step 5: Click Poll Sticker
  console.log("▶ Step 5: Selecting Poll Sticker...");
  await cdp.eval(`
    (() => {
      const pollBtn = Array.from(document.querySelectorAll('button, div')).find(el => el.innerText?.trim() === 'POLL' || el.innerText?.includes('POLL'));
      if (pollBtn) pollBtn.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("21_poll_modal_opened.png");

  // Step 6: Click Done on Poll modal
  console.log("▶ Step 6: Committing Poll Sticker to canvas...");
  await cdp.eval(`
    (() => {
      const doneBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText?.trim() === 'Done');
      if (doneBtn) doneBtn.click();
    })()
  `);
  await sleep(1200);
  await cdp.captureScreenshot("22_final_canvas_with_stickers.png");

  console.log("\n=================================================================");
  console.log("   ALL SCREENSHOTS CAPTURED SUCCESSFULLY!");
  console.log("=================================================================\n");

  cdp.close();
};

run().catch((e) => {
  console.error("FATAL ERROR:", e);
  process.exit(1);
});
