// scripts/check-all.js - Side-effect-free JavaScript syntax validator
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");

console.log("\n=======================================================");
console.log("🔍 RUNNING SIDE-EFFECT-FREE SERVER JAVASCRIPT CHECK");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;
const errors = [];
const ignoredDirectories = new Set([
  "node_modules",
  ".git",
  "uploads",
  "dist",
  "build",
  "coverage",
]);

function scanAndVerify(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(serverRoot, fullPath);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        scanAndVerify(fullPath);
      }
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".js")) continue;

    // Parse files in a child process. Do NOT import modules: importing server.js
    // starts the HTTP server, schedules cron tasks, and attempts a DB connection.
    const result = spawnSync(process.execPath, ["--check", fullPath], {
      encoding: "utf8",
      timeout: 15000,
      windowsHide: true,
    });

    if (result.error || result.status !== 0) {
      const details = result.error?.message || result.stderr || result.stdout || "Unknown syntax-check failure";
      console.error(`  ❌ [FAIL] ${relPath} -> ${details.trim()}`);
      failed++;
      errors.push({ file: relPath, error: details.trim() });
    } else {
      console.log(`  ✅ [PASS] ${relPath}`);
      passed++;
    }
  }
}

function main() {
  const startTime = Date.now();
  scanAndVerify(serverRoot);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n=======================================================");
  if (failed === 0) {
    console.log(`✅ ALL ${passed} JAVASCRIPT FILES PASSED SYNTAX CHECK (${duration}s)`);
    console.log("   ✓ Source files were parsed without importing/executing them");
    console.log("   ✓ This check does not replace unit, integration, or E2E tests");
  } else {
    console.error(`❌ ${failed} JAVASCRIPT FILE(S) FAILED SYNTAX CHECK`);
    errors.forEach((e) => console.error(`   - ${e.file}: ${e.error}`));
    process.exitCode = 1;
  }
  console.log("=======================================================\n");
}

main();
