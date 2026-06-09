// cPanel / LiteSpeed Node startup wrapper.
// Polyfills WebSocket for Node < 22 (Supabase Realtime needs it),
// then imports the node-server preset output, which starts its own
// HTTP server listening on process.env.PORT.

import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

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
