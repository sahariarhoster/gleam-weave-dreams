// Server-only client for the WA Suite (Hoster Camp) API.
// Each device row stores its own API secret; pass it explicitly.
// Override the host via WA_API_BASE_URL if you self-host the panel.

const BASE_URL = process.env.WA_API_BASE_URL ?? "https://wasrv.hostercamp.com";

type BdwebsResponse<T = unknown> = {
  status: number;
  message: string;
  data: T;
};

async function call<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined>,
  method: "GET" | "POST" = "POST",
): Promise<BdwebsResponse<T>> {
  const url = new URL(BASE_URL + path);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (method === "GET") url.searchParams.set(k, String(v));
    else body.set(k, String(v));
  }
  const init: RequestInit = { method };
  if (method === "POST") {
    init.headers = { "Content-Type": "application/x-www-form-urlencoded" };
    init.body = body.toString();
  }
  const res = await fetch(url.toString(), init);
  const text = await res.text();
  let json: BdwebsResponse<T>;
  try {
    json = JSON.parse(text) as BdwebsResponse<T>;
  } catch {
    throw new Error(`Invalid response from bdwebs (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
  return json;
}

export const bdwebs = {
  getCredits(secret: string) {
    return call<{ remaining: string; currency?: string }>("/api/get/credits", { secret }, "GET");
  },
  getEarnings(secret: string) {
    return call<{ earnings: string; currency: string }>("/api/get/earnings", { secret }, "GET");
  },
  /**
   * Send a single WhatsApp message via a linked device.
   * Mirrors the WhatsApp send endpoint of the bdwebs gateway.
   */
  sendWhatsApp(args: {
    secret: string;
    account: string; // device unique id
    recipient: string;
    message: string;
    priority?: 1 | 2;
  }) {
    return call<unknown>("/api/send/whatsapp", {
      secret: args.secret,
      account: args.account,
      recipient: args.recipient,
      message: args.message,
      priority: args.priority ?? 1,
    });
  },
  getWaServers(secret: string) {
    return call<Array<{ id: number; name?: string; status?: string }>>(
      "/api/get/wa.servers", { secret }, "GET",
    );
  },
  linkWhatsApp(args: { secret: string; sid: number }) {
    return call<{ qrstring: string; qrimagelink: string; infolink?: string }>(
      "/api/create/wa.link", { secret: args.secret, sid: args.sid }, "GET",
    );
  },
  relinkWhatsApp(args: { secret: string; sid: number; unique: string }) {
    return call<{ qrstring: string; qrimagelink: string; infolink?: string }>(
      "/api/create/wa.relink",
      { secret: args.secret, sid: args.sid, unique: args.unique },
      "GET",
    );
  },
  /**
   * Update WhatsApp account settings (mirrors panel AJAX `edit.whatsapp`).
   * receive_chats / random_send: 1 = enable, 2 = disable.
   */
  editWhatsApp(args: {
    secret: string;
    id: number | string;
    receive_chats?: 1 | 2;
    random_send?: 1 | 2;
    random_min?: number;
    random_max?: number;
  }) {
    return call<unknown>("/api/edit/whatsapp", {
      secret: args.secret,
      id: args.id,
      receive_chats: args.receive_chats ?? 2,
      random_send: args.random_send ?? 2,
      random_min: args.random_min ?? 1,
      random_max: args.random_max ?? 5,
    });
  },
  /**
   * Delete a WhatsApp account from the panel.
   * Accepts unique (device_unique_id) or numeric account id.
   */
  deleteWhatsApp(args: { secret: string; unique?: string; id?: number | string }) {
    return call<unknown>("/api/delete/whatsapp", {
      secret: args.secret,
      unique: args.unique,
      id: args.id,
    });
  },
  /**
   * Raw helper: POST to any panel path with form fields. Used to try alternative
   * delete endpoints if the primary one isn't supported.
   */
  rawPost(path: string, params: Record<string, string | number | undefined>) {
    return call<unknown>(path, params, "POST");
  },
  /**
   * Fetch all linked WhatsApp accounts for this secret.
   * Used to refresh per-device status.
   */
  getWhatsAppAccounts(secret: string) {
    return call<Array<Record<string, any>>>("/api/get/wa.accounts", { secret }, "GET");
  },
};
