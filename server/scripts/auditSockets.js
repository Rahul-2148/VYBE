import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('⚡ Starting Socket.IO Events Audit...');

const serverEmits = new Set();
const serverListeners = new Set();
const clientEmits = new Set();
const clientListeners = new Set();

function scanDir(dir, isServer) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.includes('.git') && !entry.name.includes('dist')) {
      scanDir(fullPath, isServer);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Match socket.emit("eventName", ...) or io.emit("eventName", ...) or io.to(...).emit("eventName", ...)
      const emitMatches = content.matchAll(/(?:socket|io|app\.locals\.io)\s*(?:\.to\([^)]+\))*\.emit\(\s*["'`]([a-zA-Z0-9_\-:]+)["'`]/g);
      for (const m of emitMatches) {
        if (isServer) serverEmits.add(m[1]);
        else clientEmits.add(m[1]);
      }

      // Match socket.on("eventName", ...)
      const onMatches = content.matchAll(/socket(?:\.current)?\.on\(\s*["'`]([a-zA-Z0-9_\-:]+)["'`]/g);
      for (const m of onMatches) {
        if (isServer) serverListeners.add(m[1]);
        else clientListeners.add(m[1]);
      }
    }
  }
}

scanDir(path.join(rootDir, 'server'), true);
scanDir(path.join(rootDir, 'client/src'), false);

console.log(`\n📤 Server Emits (${serverEmits.size} events):`, Array.from(serverEmits).sort().join(', '));
console.log(`\n📥 Server Listens (${serverListeners.size} events):`, Array.from(serverListeners).sort().join(', '));
console.log(`\n📤 Client Emits (${clientEmits.size} events):`, Array.from(clientEmits).sort().join(', '));
console.log(`\n📥 Client Listens (${clientListeners.size} events):`, Array.from(clientListeners).sort().join(', '));

console.log('\n=== SOCKET AUDIT COMPLETE ===');
