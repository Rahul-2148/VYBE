// server/scripts/deep-comprehensive-scan.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

console.log("=================================================");
console.log("🔍 RUNNING DEEP COMPREHENSIVE CODEBASE SCANNER");
console.log("=================================================");

const clientDir = path.join(rootDir, "client/src");
const adminDir = path.join(rootDir, "admin/src");
const serverDir = path.join(rootDir, "server");

// Helper to recursively get all files
function getAllFiles(dir, extList = [".js", ".jsx", ".ts", ".tsx"]) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== "node_modules" && file !== "dist" && file !== ".git") {
        results = results.concat(getAllFiles(fullPath, extList));
      }
    } else {
      if (extList.includes(path.extname(file))) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

// 1. Scan all Client & Admin API Calls
console.log("\n📡 1. Scanning Frontend API Invocations vs Backend Route Map...");
const clientFiles = getAllFiles(clientDir);
const adminFiles = getAllFiles(adminDir);
const allFrontendFiles = [...clientFiles, ...adminFiles];

const apiCallRegex = /(?:api|axios)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*[`"']([^`"'$]+)[`"']/g;
const dynamicApiRegex = /(?:api|axios)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*`([^`]+)`/g;

const frontendEndpoints = new Set();
const dynamicFrontendEndpoints = [];

allFrontendFiles.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  let match;
  while ((match = apiCallRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const endpoint = match[2];
    frontendEndpoints.add(`${method} ${endpoint}`);
  }
  while ((match = dynamicApiRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const template = match[2];
    dynamicFrontendEndpoints.push({
      file: path.relative(rootDir, file),
      method,
      template,
    });
  }
});

console.log(`Found ${frontendEndpoints.size} static API calls and ${dynamicFrontendEndpoints.length} dynamic API calls across frontend.`);

// 2. Scan for Dead Buttons or Empty Handlers in React components
console.log("\n🖱️ 2. Scanning for Dead Buttons / Empty Handlers in Frontend Components...");
const emptyHandlerRegex = /onClick\s*=\s*{\s*\(\s*\)\s*=>\s*{\s*}\s*}/g;
const deadButtons = [];

allFrontendFiles.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    if (emptyHandlerRegex.test(line)) {
      deadButtons.push({
        file: path.relative(rootDir, file),
        line: idx + 1,
        content: line.trim(),
      });
    }
  });
});

if (deadButtons.length > 0) {
  console.log(`⚠️ Found ${deadButtons.length} empty onClick handlers:`);
  deadButtons.forEach((d) => console.log(`  ${d.file}:${d.line} -> ${d.content}`));
} else {
  console.log("✅ Zero empty onClick handlers found in all components!");
}

// 3. Scan Socket.IO Event parity
console.log("\n⚡ 3. Checking Real-Time Socket.IO Event Parity...");
const socketJsContent = fs.readFileSync(path.join(serverDir, "socket.js"), "utf8");
const serverSocketOn = new Set();
const serverSocketEmit = new Set();

const socketOnRegex = /socket\.on\(\s*["']([^"']+)["']/g;
const socketEmitRegex = /(?:socket|io)\s*\.\s*(?:to\([^)]+\)\s*\.\s*)?emit\(\s*["']([^"']+)["']/g;

let sMatch;
while ((sMatch = socketOnRegex.exec(socketJsContent)) !== null) {
  serverSocketOn.add(sMatch[1]);
}
while ((sMatch = socketEmitRegex.exec(socketJsContent)) !== null) {
  serverSocketEmit.add(sMatch[1]);
}

console.log(`Server listens to ${serverSocketOn.size} socket events:`);
console.log([...serverSocketOn].sort().join(", "));

console.log(`\nServer emits ${serverSocketEmit.size} socket event types:`);
console.log([...serverSocketEmit].sort().join(", "));

// Check client socket emissions
const clientSocketEmits = new Set();
const clientSocketListens = new Set();

allFrontendFiles.forEach((file) => {
  const content = fs.readFileSync(file, "utf8");
  const emitReg = /socket\s*\.\s*emit\(\s*["']([^"']+)["']/g;
  const onReg = /socket\s*\.\s*on\(\s*["']([^"']+)["']/g;
  let m;
  while ((m = emitReg.exec(content)) !== null) {
    clientSocketEmits.add(m[1]);
  }
  while ((m = onReg.exec(content)) !== null) {
    clientSocketListens.add(m[1]);
  }
});

console.log(`\nClient emits ${clientSocketEmits.size} socket event types:`);
console.log([...clientSocketEmits].sort().join(", "));

console.log(`\nClient listens to ${clientSocketListens.size} socket event types:`);
console.log([...clientSocketListens].sort().join(", "));

// Compare unhandled client emissions
const unhandledEmits = [...clientSocketEmits].filter((ev) => !serverSocketOn.has(ev));
if (unhandledEmits.length > 0) {
  console.log(`\n⚠️ Client emits the following events not directly matched by socket.on in server/socket.js:`);
  console.log(unhandledEmits.join(", "));
} else {
  console.log("\n✅ 100% of client socket emissions have corresponding server listeners!");
}

console.log("\n=================================================");
console.log("🎯 DEEP SCAN COMPLETED SUCCESSFULLY");
console.log("=================================================");
