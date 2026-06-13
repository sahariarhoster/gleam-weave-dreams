// Server-only helper to call panel AJAX routes that require an admin session
// cookie (e.g. `edit.whatsapp`). Logs into the Hostercamp panel with
// HOSTERCAMP_PANEL_EMAIL / HOSTERCAMP_PANEL_PASSWORD, caches the session
// cookie + CSRF token in module scope, and re-logs on auth failure.

type Jar = Record<string, string>;

let cachedJar: Jar | null = null;
let cachedToken: string | null = null;
let cachedAt = 0;
const TTL_MS = 30 * 60 * 1000; // 30 min

function panelBase(): string {
  const url = process.env.HOSTERCAMP_PANEL_URL;
  if (!url) throw new Error("HOSTERCAMP_PANEL_URL is not configured");
  return url.replace(/\/+$/, "");
}

function jarToHeader(jar: Jar): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function mergeSetCookies(jar: Jar, res: Response) {
  // workerd exposes getSetCookie(); fall back to raw header split.
  const anyHeaders = res.headers as unknown as { getSetCookie?: () => string[] };
  const cookies: string[] = anyHeaders.getSetCookie
    ? anyHeaders.getSetCookie()
    : (res.headers.get("set-cookie") ?? "")
        .split(/,(?=[^;]+?=)/)
        .filter(Boolean);
  for (const c of cookies) {
    const [pair] = c.split(";");
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) jar[name] = value;
  }
}

function extractToken(html: string): string | null {
  const meta = html.match(
    /<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/i,
  );
  if (meta?.[1]) return meta[1];
  const input = html.match(
    /<input[^>]+name=["']_token["'][^>]+value=["']([^"']+)["']/i,
  );
  return input?.[1] ?? null;
}

async function login(): Promise<{ jar: Jar; token: string }> {
  const base = panelBase();
  const email = process.env.HOSTERCAMP_PANEL_EMAIL;
  const password = process.env.HOSTERCAMP_PANEL_PASSWORD;
  if (!email || !password)
    throw new Error("HOSTERCAMP_PANEL_EMAIL / HOSTERCAMP_PANEL_PASSWORD missing");

  const jar: Jar = {};

  // 1) GET login page → CSRF token + XSRF/session cookies.
  const loginUrl = `${base}/login`;
  const r1 = await fetch(loginUrl, {
    headers: { "User-Agent": "Mozilla/5.0 LovableBot" },
    redirect: "manual",
  });
  mergeSetCookies(jar, r1);
  const html = await r1.text();
  const token = extractToken(html);
  if (!token) throw new Error("Panel login page: CSRF token not found");

  // 2) POST credentials.
  const body = new URLSearchParams({
    _token: token,
    email,
    password,
    remember: "on",
  });
  const r2 = await fetch(loginUrl, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 LovableBot",
      Cookie: jarToHeader(jar),
      Referer: loginUrl,
      Origin: base,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: body.toString(),
  });
  mergeSetCookies(jar, r2);

  // Laravel auth success typically 302 → /home. 200 on /login page usually = failure.
  const location = r2.headers.get("location") ?? "";
  if (r2.status >= 400) {
    throw new Error(`Panel login failed: HTTP ${r2.status}`);
  }
  if (r2.status === 200 && /login/i.test(await r2.clone().text())) {
    throw new Error("Panel login failed: credentials rejected");
  }
  if (location && !/login/i.test(location)) {
    // good — fetch the redirected page so any post-login cookies stick.
    try {
      const r3 = await fetch(new URL(location, base).toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 LovableBot",
          Cookie: jarToHeader(jar),
        },
        redirect: "manual",
      });
      mergeSetCookies(jar, r3);
    } catch {
      /* non-fatal */
    }
  }

  return { jar, token };
}

async function ensureSession(force = false): Promise<{ jar: Jar; token: string }> {
  const fresh = Date.now() - cachedAt < TTL_MS;
  if (!force && cachedJar && cachedToken && fresh) {
    return { jar: cachedJar, token: cachedToken };
  }
  const s = await login();
  cachedJar = s.jar;
  cachedToken = s.token;
  cachedAt = Date.now();
  return s;
}

/** POST to a panel AJAX path (relative, e.g. "/ajax/edit.whatsapp") with form fields. */
export async function panelAjaxPost(
  path: string,
  fields: Record<string, string | number | undefined>,
): Promise<{ status: number; body: string }> {
  const base = panelBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const doCall = async (sess: { jar: Jar; token: string }) => {
    const body = new URLSearchParams();
    body.set("_token", sess.token);
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === null) continue;
      body.set(k, String(v));
    }
    const res = await fetch(url, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 LovableBot",
        Cookie: jarToHeader(sess.jar),
        Referer: base + "/",
        Origin: base,
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-TOKEN": sess.token,
        Accept: "application/json, text/plain, */*",
      },
      body: body.toString(),
    });
    const text = await res.text();
    return { status: res.status, body: text };
  };

  let sess = await ensureSession(false);
  let r = await doCall(sess);
  // 401/419 (Laravel CSRF/session expired) / 302 → /login → re-login once.
  const looksUnauth =
    r.status === 401 ||
    r.status === 419 ||
    (r.status >= 300 && r.status < 400) ||
    /login/i.test(r.body.slice(0, 500));
  if (looksUnauth) {
    sess = await ensureSession(true);
    r = await doCall(sess);
  }
  return r;
}

/** Update WhatsApp account settings via the panel's AJAX route. */
export async function panelEditWhatsApp(args: {
  id: number | string;
  receive_chats?: 1 | 2;
  random_send?: 1 | 2;
  random_min?: number;
  random_max?: number;
}): Promise<{ ok: boolean; status: number; body: string; endpoint: string }> {
  const fields = {
    id: args.id,
    receive_chats: args.receive_chats ?? 2,
    random_send: args.random_send ?? 2,
    random_min: args.random_min ?? 1,
    random_max: args.random_max ?? 5,
  };
  // Common Laravel AJAX paths on this panel. First that returns non-redirect 2xx wins.
  const paths = [
    "/ajax/edit.whatsapp",
    "/user/ajax/edit.whatsapp",
    "/dashboard/ajax/edit.whatsapp",
    "/ajax/whatsapp/edit",
  ];
  let last: { status: number; body: string } = { status: 0, body: "" };
  for (const p of paths) {
    const r = await panelAjaxPost(p, fields);
    last = r;
    if (r.status >= 200 && r.status < 300 && !/login/i.test(r.body.slice(0, 200))) {
      return { ok: true, status: r.status, body: r.body, endpoint: p };
    }
  }
  return { ok: false, status: last.status, body: last.body, endpoint: "" };
}
