import http from "http";

const getPages = () => {
  return new Promise((resolve, reject) => {
    http.get("http://127.0.0.1:9222/json", (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
};

const run = async () => {
  try {
    const pages = await getPages();
    console.log("Found Chrome pages on port 9222:");
    pages.forEach((p, idx) => {
      console.log(`[${idx}] ${p.title} - ${p.url} (${p.type}) -> ws: ${p.webSocketDebuggerUrl}`);
    });
  } catch (err) {
    console.error("CDP error:", err.message);
  }
};

run();
