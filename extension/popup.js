const statusEl = document.getElementById("status");
const runBtn = document.getElementById("run");
const copyBtn = document.getElementById("copy");
const barEl = document.getElementById("bar");
const pctEl = document.getElementById("pct");
const cntEl = document.getElementById("cnt");
const logEl = document.getElementById("log");

function setStatus(msg, cls = "") {
  statusEl.innerHTML = cls === "count" ? `<span class="count">${msg}</span>` : msg;
}
function setProgress(pct, count) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  barEl.style.width = p + "%";
  pctEl.textContent = p + "%";
  cntEl.textContent = (count || 0) + " contacts";
}
function appendLog(lines) {
  if (!lines || !lines.length) return;
  for (const l of lines) {
    const div = document.createElement("div");
    if (l.level === "err") div.className = "err";
    else if (l.level === "ok") div.className = "ok";
    div.textContent = l.msg;
    logEl.appendChild(div);
  }
  logEl.scrollTop = logEl.scrollHeight;
}
function resetUI() {
  logEl.innerHTML = "";
  setProgress(0, 0);
  setStatus("");
}

// Runs in MAIN world. Writes state to window.__waScrape and returns immediately.
function startScrape() {
  if (window.__waScrape && !window.__waScrape.finished) return { already: true };
  const state = {
    started: Date.now(),
    finished: false,
    error: null,
    count: 0,
    scrollTop: 0,
    scrollHeight: 1,
    maxTop: 0,
    logs: [],
    result: null,
  };
  window.__waScrape = state;
  const log = (msg, level) => state.logs.push({ msg: `[${new Date().toLocaleTimeString()}] ${msg}`, level: level || "" });

  (async () => {
    try {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const pane =
        document.querySelector('[aria-label="Chat list"]') ||
        document.querySelector('#pane-side');
      if (!pane) throw new Error("Open web.whatsapp.com and sign in first.");

      // Find the actual scrollable ancestor by walking up from a real list item.
      // WhatsApp's chat list is virtualized — the scroller is often several
      // levels up from #pane-side and selector-based guesses miss it.
      const findScroller = () => {
        const probe =
          pane.querySelector('[role="listitem"]') ||
          pane.querySelector('div[role="grid"] > div') ||
          pane.querySelector('[role="row"]');
        let el = probe || pane;
        while (el && el !== document.body) {
          const s = getComputedStyle(el);
          if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 10) {
            return el;
          }
          el = el.parentElement;
        }
        return pane;
      };
      let scroller = findScroller();
      log(`Found scroller (${scroller.scrollHeight}px tall)`, "ok");

      const contacts = new Map();
      const jidCache = new WeakMap(); // cache findJid per row node

      const findJid = (node) => {
        if (!node) return "";
        if (jidCache.has(node)) return jidCache.get(node);
        const key = Object.keys(node).find(
          (k) => k.startsWith("__reactProps$") || k.startsWith("__reactFiber$")
        );
        if (!key) { jidCache.set(node, ""); return ""; }
        const seen = new Set();
        const scan = (obj, depth) => {
          if (!obj || depth > 5 || typeof obj !== "object" || seen.has(obj)) return "";
          seen.add(obj);
          for (const k in obj) {
            let v;
            try { v = obj[k]; } catch { continue; }
            if (typeof v === "string") {
              const m = v.match(/(\d{7,15})@(?:c\.us|s\.whatsapp\.net)/);
              if (m) return m[1];
            } else if (v && typeof v === "object") {
              const r = scan(v, depth + 1);
              if (r) return r;
            }
          }
          return "";
        };
        const out = scan(node[key], 0);
        jidCache.set(node, out);
        return out;
      };

      const seenRows = new WeakSet();
      const collect = () => {
        const rows = document.querySelectorAll(
          '#pane-side [role="listitem"], #pane-side [role="row"], #pane-side div[role="grid"] > div'
        );
        let added = 0;
        rows.forEach((row) => {
          if (seenRows.has(row)) return;
          const titleEl = row.querySelector("span[title]");
          const title = titleEl?.getAttribute("title") || row.getAttribute("aria-label") || "";
          if (!title) return;
          seenRows.add(row);
          let phone = "";
          let name = title;
          const jid = findJid(row) || findJid(row.firstElementChild);
          if (jid) phone = jid;
          if (!phone) {
            const t = title.trim();
            if (/^\+[\d\s\-()]{7,}$/.test(t)) {
              phone = t.replace(/[^\d+]/g, "");
              if (phone.replace(/\D/g, "").length < 8) phone = "";
              name = "";
            }
          }
          const key = phone ? phone : "name:" + name;
          if (!key || key === "name:") return;
          const existing = contacts.get(key);
          if (!existing) {
            contacts.set(key, { name: name || null, phone });
            added++;
          } else if (!existing.phone && phone) {
            contacts.set(key, { name: existing.name || name || null, phone });
          }
        });
        state.count = contacts.size;
        state.scrollTop = scroller.scrollTop;
        state.scrollHeight = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
        if (state.scrollTop > state.maxTop) state.maxTop = state.scrollTop;
        return added;
      };

      const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
      const scrollBy = (px) => {
        const before = scroller.scrollTop;
        scroller.scrollTop = before + px;
        if (scroller.scrollTop === before) {
          scroller.dispatchEvent(new WheelEvent("wheel", {
            deltaY: px, bubbles: true, cancelable: true,
          }));
        }
      };

      scroller.scrollTop = 0;
      await sleep(120);
      collect();
      log(`Initial pass: ${state.count} contacts`);

      // Aggressive: jump ~1.8x viewport per step, wait only one frame.
      let lastTop = -1;
      let stable = 0;
      let noProgress = 0;
      let iter = 0;
      let lastLogged = 0;
      for (; iter < 40000; iter++) {
        const addedBefore = state.count;
        const step = Math.max(400, Math.floor(scroller.clientHeight * 1.8));
        scrollBy(step);
        await raf();
        collect();
        const now = Date.now();
        if (state.count !== addedBefore || now - lastLogged > 1500) {
          log(`scroll ${state.scrollTop}/${state.scrollHeight} • ${state.count} contacts (+${state.count - addedBefore})`);
          lastLogged = now;
        }
        if (scroller.scrollTop === lastTop) {
          stable++;
          if (stable === 2) {
            const fresh = findScroller();
            if (fresh !== scroller) { scroller = fresh; log("Re-bound scroller", "ok"); }
          }
          // give virtualized list one extra settle before declaring done
          if (stable === 3) await sleep(150);
          if (stable >= 4) { log("Reached bottom", "ok"); break; }
        } else {
          stable = 0;
          lastTop = scroller.scrollTop;
        }
        if (state.count === addedBefore) {
          noProgress++;
          if (noProgress % 20 === 0) await sleep(80);
        } else {
          noProgress = 0;
        }
      }
      await sleep(150);
      collect();
      state.result = Array.from(contacts.values());
      state.finished = true;
      log(`Done. ${state.result.length} contacts collected.`, "ok");
    } catch (e) {
      state.error = e.message || String(e);
      state.finished = true;
      log("Error: " + state.error, "err");
    }
  })();

  return { started: true };
}

// Poll: read state and return delta logs from cursor
function pollScrape(cursor) {
  const s = window.__waScrape;
  if (!s) return { missing: true };
  const newLogs = s.logs.slice(cursor);
  return {
    cursor: s.logs.length,
    finished: s.finished,
    error: s.error,
    count: s.count,
    scrollTop: s.scrollTop,
    scrollHeight: s.scrollHeight,
    maxTop: s.maxTop,
    logs: newLogs,
    result: s.finished ? s.result : null,
  };
}

async function getTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.startsWith("https://web.whatsapp.com")) {
    throw new Error("Open https://web.whatsapp.com in this tab first.");
  }
  return tab;
}

async function runScrape() {
  const tab = await getTab();
  resetUI();
  setStatus("Starting…");
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: startScrape,
  });
  let cursor = 0;
  while (true) {
    await new Promise((r) => setTimeout(r, 150));
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: "MAIN",
      func: pollScrape,
      args: [cursor],
    });
    if (!result) continue;
    if (result.missing) { setStatus("Lost connection to page."); break; }
    cursor = result.cursor;
    appendLog(result.logs);
    const pct = result.scrollHeight > 0 ? (result.maxTop / result.scrollHeight) * 100 : 0;
    setProgress(result.finished ? 100 : pct, result.count);
    setStatus(result.finished ? "Finished" : `Scanning… ${result.count} contacts`);
    if (result.finished) {
      if (result.error) throw new Error(result.error);
      return result.result || [];
    }
  }
  return [];
}

function toCSV(rows) {
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = ["name,phone"];
  rows.forEach((r) => lines.push(`${esc(r.name)},${esc(r.phone)}`));
  return lines.join("\n");
}

function download(csv) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `whatsapp-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

runBtn.addEventListener("click", async () => {
  runBtn.disabled = true; copyBtn.disabled = true;
  try {
    const rows = await runScrape();
    if (!rows.length) setStatus("No numbers found. Make sure the chat list is visible.");
    else { download(toCSV(rows)); setStatus(`Exported ${rows.length} contacts ✓`, "count"); }
  } catch (e) { setStatus("Error: " + (e.message || e)); }
  finally { runBtn.disabled = false; copyBtn.disabled = false; }
});

copyBtn.addEventListener("click", async () => {
  runBtn.disabled = true; copyBtn.disabled = true;
  try {
    const rows = await runScrape();
    await navigator.clipboard.writeText(rows.map((r) => r.phone).filter(Boolean).join("\n"));
    setStatus(`Copied ${rows.length} numbers to clipboard ✓`, "count");
  } catch (e) { setStatus("Error: " + (e.message || e)); }
  finally { runBtn.disabled = false; copyBtn.disabled = false; }
});
