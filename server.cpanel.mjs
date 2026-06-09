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

function firstHeader(value) {
  return Array.isArray(value) ? value[0] : value;
}

function getConfiguredOrigin() {
  const raw = process.env.APP_ORIGIN || process.env.PUBLIC_ORIGIN || process.env.SITE_URL;
  if (!raw) return {};
  try {
    const url = new URL(raw);
    return { host: url.host, protocol: url.protocol.replace(":", "") };
  } catch {
    return {};
  }
}

if (typeof serverEntry?.fetch !== "function") {
  console.error("Invalid cPanel build output: .output/server/index.mjs does not export fetch. Run `npm run build:cpanel` with the updated config, then restart the app.");
  process.exit(1);
} else {
  const port = Number(process.env.PORT || process.env.NODE_PORT || 3000);
  const hostname = process.env.HOST || "0.0.0.0";

  const server = http.createServer(async (incomingMessage, serverResponse) => {
    try {
      const configuredOrigin = getConfiguredOrigin();
      const forwardedHost = firstHeader(incomingMessage.headers["x-forwarded-host"])?.split(",")[0]?.trim();
      const forwardedProto = firstHeader(incomingMessage.headers["x-forwarded-proto"])?.split(",")[0]?.trim();
      const forwardedSsl = firstHeader(incomingMessage.headers["x-forwarded-ssl"]);
      const host = configuredOrigin.host || forwardedHost || incomingMessage.headers.host || `localhost:${port}`;
      const protocol = configuredOrigin.protocol || forwardedProto || (forwardedSsl === "on" ? "https" : "http");
      const requestUrl = `${protocol}://${host}${incomingMessage.url || "/"}`;
      const headers = new Headers();

      for (const [key, value] of Object.entries(incomingMessage.headers)) {
        if (Array.isArray(value)) {
          for (const item of value) headers.append(key, item);
        } else if (value != null) {
          headers.set(key, value);
        }
      }
      headers.set("host", host);
      headers.set("x-forwarded-host", host);
      headers.set("x-forwarded-proto", protocol);

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