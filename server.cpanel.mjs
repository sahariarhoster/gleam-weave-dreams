import http from "node:http";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

// Supabase Realtime needs a WebSocket global on Node < 22.
if (!globalThis.WebSocket) {
  try {
    const { default: WS } = await import("ws");
    globalThis.WebSocket = WS;
  } catch {
    console.warn("[startup] 'ws' package not installed; Supabase Realtime may fail. Run: npm i ws");
  }
}


const outputEntry = path.resolve(".output/server/index.mjs");

if (!existsSync(outputEntry)) {
  console.error("Missing .output/server/index.mjs. Run `bun run build` before starting the app.");
  process.exit(1);
}

const outputModule = await import(pathToFileURL(outputEntry).href);
const serverEntry = outputModule.default ?? outputModule;

if (typeof serverEntry?.fetch !== "function") {
  console.log("Started node-server build from .output/server/index.mjs.");
} else {
  const port = Number(process.env.PORT || process.env.NODE_PORT || 3000);
  const hostname = process.env.HOST || "0.0.0.0";

  const server = http.createServer(async (incomingMessage, serverResponse) => {
    try {
      const host = incomingMessage.headers.host || `localhost:${port}`;
      const protocol = incomingMessage.headers["x-forwarded-proto"] || "http";
      const requestUrl = `${protocol}://${host}${incomingMessage.url || "/"}`;
      const headers = new Headers();

      for (const [key, value] of Object.entries(incomingMessage.headers)) {
        if (Array.isArray(value)) {
          for (const item of value) headers.append(key, item);
        } else if (value != null) {
          headers.set(key, value);
        }
      }

      const hasRequestBody = !["GET", "HEAD"].includes(incomingMessage.method || "GET");
      const request = new Request(requestUrl, {
        method: incomingMessage.method,
        headers,
        body: hasRequestBody ? Readable.toWeb(incomingMessage) : undefined,
        duplex: hasRequestBody ? "half" : undefined,
      });

      const response = await serverEntry.fetch(request, process.env, {});
      serverResponse.statusCode = response.status;
      serverResponse.statusMessage = response.statusText;

      response.headers.forEach((value, key) => {
        serverResponse.setHeader(key, value);
      });

      if (incomingMessage.method === "HEAD" || !response.body) {
        serverResponse.end();
        return;
      }

      Readable.fromWeb(response.body).pipe(serverResponse);
    } catch (error) {
      console.error(error);
      if (!serverResponse.headersSent) {
        serverResponse.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      }
      serverResponse.end("Internal Server Error");
    }
  });

  server.listen(port, hostname, () => {
    console.log(`Server listening on http://${hostname}:${port}`);
  });
}