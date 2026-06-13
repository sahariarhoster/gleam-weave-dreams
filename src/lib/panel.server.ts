// Server-only helper to call panel AJAX routes that require an admin session
// cookie (e.g. `edit.whatsapp`). Logs into the Hostercamp panel with
// HOSTERCAMP_PANEL_EMAIL / HOSTERCAMP_PANEL_PASSWORD, caches the session
// cookie + CSRF token in module scope, and re-logs on auth failure.

type Jar = Record<string, string>;
type PanelSession = { jar: Jar; token?: string | null };

let cachedJar: Jar | null = null;
let cachedToken: string | null | undefined = null;
let cachedAt = 0;
const TTL_MS = 30 * 60 * 1000; // 30 min

function panelBase(): string {
  const url = process.env.HOSTERCAMP_PANEL_URL;
  if (!url) throw new Error("HOSTERCAMP_PANEL_URL is not configured");
  return new URL(url.replace(/\/+$/, "")).origin;
}

function panelDashboardBase(): string {
  return `${panelBase()}/dashboard`;
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

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function attrsFromTag(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of tag.matchAll(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const name = match[1]?.toLowerCase();
    if (!name || name === "meta" || name === "input") continue;
    attrs[name] = decodeHtml(match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attrs;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractToken(html: string): string | null {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attrsFromTag(match[0]);
    const key = (attrs.name ?? attrs.property ?? attrs["http-equiv"] ?? "").toLowerCase();
    if ((/csrf|xsrf|token/.test(key) || key === "csrf-token") && attrs.content) {
      return attrs.content.trim();
    }
  }

  for (const match of html.matchAll(/<input\b[^>]*>/gi)) {
    const attrs = attrsFromTag(match[0]);
    const name = (attrs.name ?? attrs.id ?? "").toLowerCase();
    if ((name === "_token" || /csrf|xsrf|token/.test(name)) && attrs.value) {
      return attrs.value.trim();
    }
  }

  const scriptPatterns = [
    /["']csrf-token["']\s*:\s*["']([^"']+)["']/i,
    /["']x-csrf-token["']\s*:\s*["']([^"']+)["']/i,
    /\bcsrfToken\b\s*[:=]\s*["']([^"']+)["']/i,
    /\bcsrf_token\b\s*[:=]\s*["']([^"']+)["']/i,
    /\b_token\b\s*[:=]\s*["']([^"']+)["']/i,
  ];
  for (const pattern of scriptPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1]).trim();
  }

  return null;
}

function tokenFromCookies(jar: Jar): string | null {
  for (const [name, value] of Object.entries(jar)) {
    if (/^(xsrf-token|csrf-token|x-csrf-token|_token)$/i.test(name) && value) {
      return safeDecodeURIComponent(decodeHtml(value)).trim();
    }
  }
  return null;
}

async function fetchHtmlFollowingRedirects(initialUrl: string, jar: Jar) {
  let url = initialUrl;
  let status = 0;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 LovableBot",
        ...(Object.keys(jar).length ? { Cookie: jarToHeader(jar) } : {}),
      },
      redirect: "manual",
    });
    status = res.status;
    mergeSetCookies(jar, res);
    const location = res.headers.get("location");
    if (location && status >= 300 && status < 400) {
      url = new URL(location, url).toString();
      continue;
    }
    return { html: await res.text(), url, status };
  }
  return { html: "", url, status };
}

async function getLoginPage(base: string, jar: Jar) {
  const candidates = ["/dashboard/auth", "/dashboard/login", "/login", "/", "/user/login", "/admin/login", "/signin"];
  let best = { html: "", url: `${base}/dashboard/auth`, status: 0 };
  const checked: string[] = [];
  for (const path of candidates) {
    const page = await fetchHtmlFollowingRedirects(`${base}${path}`, jar);
    checked.push(`${path} → ${page.status}`);
    if (extractToken(page.html) || tokenFromCookies(jar)) return { ...page, checked };
    if (hasZenderLoginForm(page.html) || page.html.length > best.html.length) best = page;
  }
  return { ...best, checked };
}

function hasZenderLoginForm(html: string): boolean {
  return /zender-authenticate-login|Login to Access the Dashboard|WA Suite|requests\/index\/login/i.test(html) &&
    /name=["']?email["'\s>]/i.test(html) &&
    /name=["']?password["'\s>]/i.test(html);
}

function canAttemptTokenlessLogin(page: { html: string; url: string }, jar: Jar): boolean {
  return hasZenderLoginForm(page.html) ||
    (/\/dashboard\/(?:auth|login)?$/i.test(new URL(page.url).pathname) && "PHPSESSID" in jar) ||
    (/WA Suite|Hoster Camp|SMS marketing platform/i.test(page.html) && "PHPSESSID" in jar);
}

async function login(): Promise<PanelSession> {
  const base = panelBase();
  const email = process.env.HOSTERCAMP_PANEL_EMAIL;
  const password = process.env.HOSTERCAMP_PANEL_PASSWORD;
  if (!email || !password)
    throw new Error("HOSTERCAMP_PANEL_EMAIL / HOSTERCAMP_PANEL_PASSWORD missing");

  const jar: Jar = {};

  // 1) GET login page → CSRF token + XSRF/session cookies.
  const page = await getLoginPage(base, jar);
  const loginUrl = page.url;
  const token = extractToken(page.html) ?? tokenFromCookies(jar);
  const tokenlessZenderLogin = !token && canAttemptTokenlessLogin(page, jar);
  if (!token && !tokenlessZenderLogin) {
    console.warn("Panel login token lookup failed", {
      finalUrl: page.url,
      checked: page.checked,
      status: page.status,
      cookieNames: Object.keys(jar),
      htmlStart: page.html.slice(0, 300),
    });
    throw new Error(`Panel login page: CSRF token not found (checked ${page.checked.join(", ")})`);
  }

  // 2) POST credentials.
  const postUrl = tokenlessZenderLogin ? `${base}/requests/index/login` : loginUrl;
  const body = new FormData();
  if (token) body.set("_token", token);
  body.set("email", email);
  body.set("password", password);
  body.set("remember", "on");
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 LovableBot",
    Cookie: jarToHeader(jar),
    Referer: loginUrl,
    Origin: base,
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json, text/javascript, */*; q=0.01",
  };
  if (token) {
    headers["X-CSRF-TOKEN"] = token;
    headers["X-XSRF-TOKEN"] = tokenFromCookies(jar) ?? token;
  }
  const r2 = await fetch(postUrl, {
    method: "POST",
    redirect: "manual",
    headers,
    body,
  });
  mergeSetCookies(jar, r2);

  // Laravel auth success typically 302 → /home. 200 on /login page usually = failure.
  const location = r2.headers.get("location") ?? "";
  if (r2.status >= 400) {
    throw new Error(`Panel login failed: HTTP ${r2.status}`);
  }
  const loginBody = await r2.clone().text();
  if (r2.status === 200) {
    try {
      const parsed = JSON.parse(loginBody);
      if (![200, 301].includes(Number(parsed?.status))) {
        throw new Error(String(parsed?.message ?? "credentials rejected"));
      }
    } catch (e) {
      if (/login|zender-authenticate-login/i.test(loginBody)) {
        throw new Error(`Panel login failed: ${(e as Error)?.message ?? "credentials rejected"}`);
      }
    }
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

  // Touch an authenticated dashboard page so the PHP session is fully established
  // before later AJAX calls hit `/requests/*` at the site root.
  try {
    const r4 = await fetch(`${panelDashboardBase()}/hosts/whatsapp`, {
      headers: {
        "User-Agent": "Mozilla/5.0 LovableBot",
        Cookie: jarToHeader(jar),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "manual",
    });
    mergeSetCookies(jar, r4);
  } catch {
    /* non-fatal */
  }

  return { jar, token };
}

async function ensureSession(force = false): Promise<PanelSession> {
  const fresh = Date.now() - cachedAt < TTL_MS;
  if (!force && cachedJar && cachedToken !== null && fresh) {
    return { jar: cachedJar, token: cachedToken };
  }
  const s = await login();
  cachedJar = s.jar;
  cachedToken = s.token;
  cachedAt = Date.now();
  return s;
}

/** POST to a panel AJAX path (relative, e.g. "/requests/whatsapp/edit") with form fields. */
export async function panelAjaxPost(
  path: string,
  fields: Record<string, string | number | undefined>,
): Promise<{ status: number; body: string; location: string | null }> {
  const base = panelBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const doCall = async (sess: PanelSession) => {
    const body = new URLSearchParams();
    if (sess.token) body.set("_token", sess.token);
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined || v === null) continue;
      body.set(k, String(v));
    }
    const xsrf = tokenFromCookies(sess.jar);
    const res = await fetch(url, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 LovableBot",
        Cookie: jarToHeader(sess.jar),
        Referer: `${panelDashboardBase()}/hosts/whatsapp`,
        Origin: base,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/plain, */*",
        ...(sess.token ? { "X-CSRF-TOKEN": sess.token } : {}),
        ...(xsrf ? { "X-XSRF-TOKEN": xsrf } : {}),
      },
      body: body.toString(),
    });
    const text = await res.text();
    return { status: res.status, body: text, location: res.headers.get("location") };
  };

  let sess = await ensureSession(false);
  let r = await doCall(sess);
  const looksUnauth =
    r.status === 401 ||
    r.status === 419 ||
    (r.status >= 300 && r.status < 400 && /(?:login|auth)/i.test(r.location ?? "")) ||
    /login|sign[\s-]?in/i.test(r.body.slice(0, 500));
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
}): Promise<{ ok: boolean; status: number; body: string; endpoint: string; attempts: string[] }> {
  const fields = {
    id: args.id,
    receive_chats: args.receive_chats ?? 2,
    random_send: args.random_send ?? 2,
    random_min: args.random_min ?? 1,
    random_max: args.random_max ?? 5,
  };
  // Zender's WhatsApp script: AJAX routes live under /requests/whatsapp/*
  // and the controller method for editing an account is `edit`.
  const override = process.env.HOSTERCAMP_PANEL_EDIT_PATH;
  const paths = [
    ...(override ? [override] : []),
    "/requests/update/edit.whatsapp",
    "/requests/whatsapp/edit.whatsapp",
    "/requests/whatsapp/edit",
    "/requests/whatsapp/index/edit",
    "/whatsapp/edit",
    "/ajax/edit.whatsapp",
    "/user/ajax/edit.whatsapp",
    "/dashboard/ajax/edit.whatsapp",
    "/ajax/whatsapp/edit",
  ];
  const attempts: string[] = [];
  let last: { status: number; body: string; location: string | null } = { status: 0, body: "", location: null };
  for (const p of paths) {
    const r = await panelAjaxPost(p, fields);
    last = r;
    attempts.push(`${p} → ${r.status}${r.location ? ` (→ ${r.location})` : ""}`);
    let accepted = false;
    if (r.status >= 200 && r.status < 300) {
      try {
        const json = JSON.parse(r.body);
        const code = Number(json?.status);
        accepted = [200, 301].includes(code);
        attempts[attempts.length - 1] += ` json.status=${code}${json?.message ? ` "${String(json.message).slice(0, 80)}"` : ""}`;
      } catch {
        // Non-JSON 200 means we hit a page route, not the AJAX handler — NOT success.
        attempts[attempts.length - 1] += " (html, not ajax)";
      }
    }
    if (accepted) {
      return { ok: true, status: r.status, body: r.body, endpoint: p, attempts };
    }
  }
  console.warn("panelEditWhatsApp: all endpoints failed", { attempts, lastBody: last.body.slice(0, 300) });
  return {
    ok: false,
    status: last.status,
    body: last.body || (last.location ? `redirect → ${last.location}` : "no body"),
    endpoint: "",
    attempts,
  };
}
