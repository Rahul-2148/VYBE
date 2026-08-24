import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../");

const serverRoutesDir = path.join(rootDir, "server", "routes");
const serverControllersDir = path.join(rootDir, "server", "controllers");
const clientSrcDir = path.join(rootDir, "client", "src");
const adminSrcDir = path.join(rootDir, "admin", "src");

console.log("=======================================================");
console.log("🔍 FULL ENTERPRISE WORKSPACE AUDIT (Server + Client + Admin)");
console.log("=======================================================\n");

// 1. Audit Server Route Handlers vs Controllers
const routeFiles = fs.readdirSync(serverRoutesDir).filter(f => f.endsWith(".route.js"));
const missingControllers = [];

for (const rFile of routeFiles) {
  const rPath = path.join(serverRoutesDir, rFile);
  const content = fs.readFileSync(rPath, "utf-8");
  
  // Extract imports from controllers
  const importMatches = content.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']\.\.\/controllers\/([^"']+)["']/g);
  for (const match of importMatches) {
    const importedFns = match[1].split(",").map(s => s.trim()).filter(Boolean);
    const controllerFile = match[2].endsWith(".js") ? match[2] : `${match[2]}.js`;
    const cPath = path.join(serverControllersDir, controllerFile);
    
    if (!fs.existsSync(cPath)) {
      missingControllers.push({ routeFile: rFile, controllerFile, error: "Controller file missing" });
      continue;
    }
    
    const cContent = fs.readFileSync(cPath, "utf-8");
    for (const fn of importedFns) {
      const cleanFn = fn.split(" as ")[0].trim();
      const exportRegex = new RegExp(`export\\s+(const|function|async\\s+function)\\s+${cleanFn}\\b|export\\s*\\{[^}]*\\b${cleanFn}\\b`);
      if (!exportRegex.test(cContent)) {
        missingControllers.push({ routeFile: rFile, controllerFile, missingFunction: cleanFn });
      }
    }
  }
}

console.log("1. ROUTE vs CONTROLLER INTEGRITY:");
if (missingControllers.length === 0) {
  console.log("   ✅ All route imports exist and are properly exported in controllers.\n");
} else {
  console.log("   ❌ Missing Controller Exports Found:", missingControllers, "\n");
}

// 2. Collect All Server Routes
const serverEndpoints = [];
const routePrefixes = {
  "admin.route.js": "/api/v1/admin",
  "ai.route.js": "/api/v1/ai",
  "auth.route.js": "/api/v1/auth",
  "call.route.js": "/api/v1/call",
  "community.route.js": "/api/v1/community",
  "conversation.route.js": "/api/v1/conversation",
  "liveStream.route.js": "/api/v1/live",
  "meeting.route.js": "/api/v1/meeting",
  "message.route.js": "/api/v1/message",
  "monetization.route.js": "/api/v1/monetization",
  "music.route.js": "/api/v1/music",
  "note.route.js": "/api/v1/note",
  "notification.route.js": "/api/v1/notification",
  "post.route.js": "/api/v1/post",
  "reel.route.js": "/api/v1/reel",
  "search.route.js": "/api/v1/search",
  "story.route.js": "/api/v1/story",
  "user.route.js": "/api/v1/user",
};

for (const rFile of routeFiles) {
  const prefix = routePrefixes[rFile] || "";
  const content = fs.readFileSync(path.join(serverRoutesDir, rFile), "utf-8");
  const routeMatches = content.matchAll(/(?:postRouter|reelRouter|userRouter|authRouter|adminRouter|storyRouter|messageRouter|conversationRouter|communityRouter|liveRouter|meetingRouter|callRouter|aiRouter|monetizationRouter|musicRouter|noteRouter|notificationRouter|searchRouter|router)\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g);
  for (const match of routeMatches) {
    const method = match[1].toUpperCase();
    const subPath = match[2];
    serverEndpoints.push({
      method,
      fullPath: `${prefix}${subPath === "/" ? "" : subPath}`,
      routeFile: rFile,
    });
  }
}

console.log(`2. SERVER ENDPOINTS DISCOVERED: ${serverEndpoints.length} routes registered.`);

// 3. Scan Client API Calls
const clientApiCalls = new Set();
function scanDir(dir, ext = ".jsx") {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...scanDir(full, ext));
    } else if (entry.name.endsWith(ext) || entry.name.endsWith(".js")) {
      files.push(full);
    }
  }
  return files;
}

const clientFiles = scanDir(clientSrcDir);
const adminFiles = scanDir(adminSrcDir);

const extractCalls = (fileList, targetSet) => {
  for (const f of fileList) {
    const content = fs.readFileSync(f, "utf-8");
    // Match api.get('/...'), api.post(`/...`), fetch(...)
    const apiMatches = content.matchAll(/(?:api|axiosInstance)\.(get|post|put|patch|delete)\(\s*[`"']([^`"'$?]+)/g);
    for (const m of apiMatches) {
      targetSet.add({ method: m[1].toUpperCase(), path: m[2].trim(), file: path.relative(rootDir, f) });
    }
    // Match RTK Query endpoints url: '/...'
    const rtkMatches = content.matchAll(/url:\s*[`"']([^`"'$?]+)/g);
    for (const m of rtkMatches) {
      targetSet.add({ method: "QUERY/MUTATION", path: m[1].trim(), file: path.relative(rootDir, f) });
    }
  }
};

const clientCalls = new Set();
const adminCalls = new Set();
extractCalls(clientFiles, clientCalls);
extractCalls(adminFiles, adminCalls);

console.log(`3. CLIENT & ADMIN API CALLS: Client makes ${clientCalls.size} distinct endpoint calls, Admin makes ${adminCalls.size} distinct calls.\n`);

// Summary
console.log("=======================================================");
console.log("AUDIT SCAN COMPLETE");
console.log("=======================================================");
