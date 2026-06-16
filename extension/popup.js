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

[same as above]

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
