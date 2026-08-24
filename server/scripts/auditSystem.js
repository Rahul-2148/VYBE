import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('🔍 Starting Vybe Full System Deep Audit...');

// 1. Check all Express Routes and Endpoints defined in server/routes
const serverRoutesDir = path.join(rootDir, 'server/routes');
const routeFiles = fs.readdirSync(serverRoutesDir).filter(f => f.endsWith('.js'));
console.log(`\n📂 Found ${routeFiles.length} server route files.`);

// 2. Parse all registered route paths
const serverEndpoints = new Set();
for (const file of routeFiles) {
  const content = fs.readFileSync(path.join(serverRoutesDir, file), 'utf8');
  // Match router.get/post/put/patch/delete("...", ...)
  const matches = content.matchAll(/\w+Router\.(get|post|put|patch|delete)\(\s*["'`](\/?[^"'`]*)["'`]/g);
  // Get prefix from server.js
  const prefixMap = {
    'auth.route.js': '/auth',
    'user.route.js': '/user',
    'post.route.js': '/post',
    'reel.route.js': '/reel',
    'story.route.js': '/story',
    'message.route.js': '/message',
    'conversation.route.js': '/conversation',
    'notification.route.js': '/notification',
    'search.route.js': '/search',
    'liveStream.route.js': '/live',
    'call.route.js': '/call',
    'monetization.route.js': '/monetization',
    'community.route.js': '/community',
    'music.route.js': '/music',
    'ai.route.js': '/ai',
    'note.route.js': '/note',
  };
  const prefix = prefixMap[file] || '';
  for (const m of matches) {
    let routePath = m[2];
    if (routePath === '/' || routePath === '') routePath = '';
    serverEndpoints.add(`${m[1].toUpperCase()} ${prefix}${routePath}`);
    serverEndpoints.add(`${m[1].toUpperCase()} ${prefix}${routePath}/`);
  }
}
console.log(`✅ Loaded ${serverEndpoints.size} server endpoints.`);

// 3. Scan all client-side API calls
const clientSrcDir = path.join(rootDir, 'client/src');
const clientApiUsages = [];

function scanClientDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanClientDir(fullPath);
    } else if (entry.name.endsWith('.jsx') || entry.name.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const regex = /api\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)[`'"]/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
          clientApiUsages.push({
            file: path.relative(rootDir, fullPath),
            line: idx + 1,
            method: match[1].toUpperCase(),
            endpoint: match[2],
          });
        }
      });
    }
  }
}
scanClientDir(clientSrcDir);
console.log(`\n📡 Discovered ${clientApiUsages.length} client API invocations across React components.`);

// 4. Verify client calls match server routes
console.log('\n🔎 Cross-referencing Client API Calls with Server Route Definitions:');
let discrepancies = 0;
const knownDynamicParams = (ep) => {
  // Convert /user/:id or /user/${id} to normalized regex pattern
  return ep
    .replace(/\$\{[^}]+\}/g, '[^/]+')
    .replace(/:[a-zA-Z0-9_]+/g, '[^/]+')
    .split('?')[0];
};

const serverRegexList = Array.from(serverEndpoints).map(sep => {
  const [method, routePath] = sep.split(' ');
  const pattern = '^' + routePath.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
  return { method, regex: new RegExp(pattern), original: sep };
});

for (const call of clientApiUsages) {
  let cleanCallEndpoint = call.endpoint.split('?')[0];
  // Ignore external or relative paths
  if (!cleanCallEndpoint.startsWith('/')) continue;

  // Replace ${...} inside pathname with a sample ID
  const clientPath = cleanCallEndpoint.replace(/\$\{[^}]+\}/g, 'SAMPLE_PARAM');
  
  const matched = serverRegexList.some(s => {
    if (s.method !== call.method) return false;
    return s.regex.test(clientPath);
  });

  if (!matched) {
    console.log(`⚠️ Unmatched: [${call.method}] "${call.endpoint}" in ${call.file}:${call.line}`);
    discrepancies++;
  }
}

if (discrepancies === 0) {
  console.log('🎉 100% of client API calls cleanly match registered server routes!');
} else {
  console.log(`ℹ️ Total potential discrepancies to review: ${discrepancies}`);
}

console.log('\n=== AUDIT COMPLETE ===');
