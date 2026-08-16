// scripts/check-all.js - Full Server Integrity & Syntax Validator
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "..");

console.log("\n=======================================================");
console.log("🔍 RUNNING FULL SERVER SYNTAX & INTEGRITY CHECK");
console.log("=======================================================");

let passed = 0;
let failed = 0;
const errors = [];

async function scanAndVerify(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(serverRoot, fullPath);

    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git") {
        await scanAndVerify(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith(".js") && !entry.name.startsWith("test") && !relPath.startsWith("scripts")) {
      try {
        const fileUrl = "file:///" + fullPath.replace(/\\/g, "/");
        await import(fileUrl);
        console.log(`  ✅ [PASS] ${relPath}`);
        passed++;
      } catch (err) {
        console.error(`  ❌ [FAIL] ${relPath} -> ${err.message}`);
        failed++;
        errors.push({ file: relPath, error: err.message, stack: err.stack });
      }
    }
  }
}

async function main() {
  const startTime = Date.now();
  await scanAndVerify(serverRoot);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n=======================================================");
  if (failed === 0) {
    console.log(`🎉 ALL ${passed} SERVER MODULES VERIFIED CLEANLY (${duration}s)`);
    console.log("   ✓ 0 Syntax Errors");
    console.log("   ✓ 0 Unresolved Imports");
    console.log("   ✓ 100% ES Module Compatibility");
  } else {
    console.error(`❌ ${failed} MODULE(S) FAILED VALIDATION!`);
    errors.forEach((e) => console.error(`   - ${e.file}: ${e.error}`));
    process.exit(1);
  }
  console.log("=======================================================\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal check error:", err);
  process.exit(1);
});
