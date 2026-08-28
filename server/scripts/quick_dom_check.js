import http from "http";

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

const run = async () => {
  const wsUrl = await getTargetWsUrl();
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => (ws.onopen = r));

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const onMsg = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener("message", onMsg);
          resolve(msg.result);
        }
      };
      ws.addEventListener("message", onMsg);
      ws.send(JSON.stringify({ id, method, params }));
    });

  const res = await send("Runtime.evaluate", {
    expression: `({
      url: window.location.href,
      storyRings: document.querySelectorAll('#story-dp-ring').length,
      addBtns: document.querySelectorAll('#story-dp-add-btn').length,
      trayStories: Array.from(document.querySelectorAll('.flex.flex-col.w-\\\\[76px\\\\]')).map(el => el.innerText),
      allStoryImages: Array.from(document.querySelectorAll('img')).filter(img => img.parentElement?.className?.includes('rounded-full')).length
    })`,
    returnByValue: true,
  });

  console.log("Story Tray State:", JSON.stringify(res.result?.value, null, 2));
  ws.close();
};

run();
