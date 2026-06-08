// Server-only client for the whatsapp.bdwebs.com API.
// Each device row stores its own API secret; pass it explicitly.

const BASE_URL = "https://whatsapp.bdwebs.com";

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
};
