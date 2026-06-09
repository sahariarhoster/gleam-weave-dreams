// cPanel / LiteSpeed Node startup wrapper.
// Polyfills WebSocket for Node < 22 (Supabase Realtime needs it),
// then imports the node-server preset output, which starts its own
// HTTP server listening on process.env.PORT.

import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

function loadLocalEnv() {
  for (const file of [".env", ".env.local", ".env.production", ".env.production.local"]) {
    const envFile = path.resolve(file);
    if (!existsSync(envFile)) continue;
    for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2] ?? "";
      value = value.replace(/^['"]|['"]$/g, "");
      if (process.env[key] == null) process.env[key] = value;
    }
  }

  process.env.SUPABASE_URL ??= process.env.VITE_SUPABASE_URL;
  process.env.VITE_SUPABASE_URL ??= process.env.SUPABASE_URL;
  process.env.SUPABASE_PUBLISHABLE_KEY ??=
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??=
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  process.env.SUPABASE_ANON_KEY ??= process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

loadLocalEnv();

if (!globalThis.WebSocket) {
  try {
    const { default: WS } = await import("ws");
    globalThis.WebSocket = WS;
  } catch {
    console.warn("[startup] 'ws' not installed; Supabase Realtime may fail. Run: npm i ws");
  }
}

const entry = path.resolve(".output/server/index.mjs");
if (!existsSync(entry)) {
  console.error(
    "Missing .output/server/index.mjs. Run `npm run build:cpanel` before starting the app."
  );
  process.exit(1);
}

await import(pathToFileURL(entry).href);
