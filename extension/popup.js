const statusEl = document.getElementById("status");
const runBtn = document.getElementById("run");
const copyBtn = document.getElementById("copy");

function setStatus(msg, cls = "") {
  statusEl.innerHTML = cls === "count" ? `<span class="count">${msg}</span>` : msg;
}

function scrapeFn() {
  return new Promise(async (resolve, reject) => {
    try {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const numbers = new Map();

      const pane =
        document.querySelector('[aria-label="Chat list"]') ||
        document.querySelector('#pane-side');
      if (!pane) throw new Error("Open web.whatsapp.com and sign in first.");

      const scroller =
        pane.querySelector('div[style*="overflow"][style*="scroll"]') ||
        pane.querySelector('div[style*="overflow-y"]') ||
        pane;

      const contacts = new Map(); // key = phone || "name:"+name

      // Walk React fiber to find a JID like "1234567890@c.us" or "...@s.whatsapp.net"
      const findJid = (node) => {
        if (!node) return "";
        const key = Object.keys(node).find(
          (k) => k.startsWith("__reactProps$") || k.startsWith("__reactFiber$")
        );
        if (!key) return "";
        const seen = new Set();
        const scan = (obj, depth) => {
          if (!obj || depth > 6 || typeof obj !== "object" || seen.has(obj)) return "";
          seen.add(obj);
          for (const k in obj) {
            let v;
            try { v = obj[k]; } catch { continue; }
            if (typeof v === "string") {
              // Only c.us / s.whatsapp.net are real phone JIDs. @lid is an opaque
              // privacy id (NOT a phone number) — skip it.
              const m = v.match(/(\d{7,15})@(?:c\.us|s\.whatsapp\.net)/);
              if (m) return m[1];
            } else if (v && typeof v === "object") {
              const r = scan(v, depth + 1);
              if (r) return r;
            }
          }
          return "";
        };
        return scan(node[key], 0);
      };

      const collect = () => {
        const rows = document.querySelectorAll(
          '#pane-side [role="listitem"], #pane-side [role="row"], #pane-side div[role="grid"] > div'
        );
        rows.forEach((row) => {
          const titleEl = row.querySelector("span[title]");
          const title = titleEl?.getAttribute("title") || row.getAttribute("aria-label") || "";
          if (!title) return;

          // 1) Try React fiber for JID (saved contacts)
          let phone = "";
          let name = title;
          const jid = findJid(row) || findJid(row.firstElementChild);
          if (jid) phone = jid;

          // 2) Fallback: only if the title itself IS a phone number (unsaved
          //    contacts render as "+1 234 567 8900"). Require a leading "+"
          //    so we don't pick numbers out of names like "John 2".
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
          if (!existing || (!existing.phone && phone)) {
            contacts.set(key, { name: name || null, phone });
          }
        });
      };


      scroller.scrollTop = 0;
      await sleep(600);
      collect();

      // Incremental scroll by ~80% of viewport so virtualized rows render
      let lastTop = -1;
      let stable = 0;
      for (let i = 0; i < 2000; i++) {
        collect();
        const step = Math.max(200, Math.floor(scroller.clientHeight * 0.8));
        scroller.scrollTop = scroller.scrollTop + step;
        await sleep(350);
        collect();
        if (scroller.scrollTop === lastTop) {
          stable++;
          if (stable >= 5) break;
        } else {
          stable = 0;
          lastTop = scroller.scrollTop;
        }
      }
      collect();

      resolve(Array.from(contacts.values()));
    } catch (e) {
      reject(e.message || String(e));
    }
  });
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
  setStatus("Scrolling chat list… keep this tab open.");
  const [{ result, error }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: scrapeFn,
  });
  if (error) throw new Error(error);
  return result || [];
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
  runBtn.disabled = true;
  try {
    const rows = await runScrape();
    if (!rows.length) {
      setStatus("No numbers found. Make sure the chat list is visible.");
    } else {
      download(toCSV(rows));
      setStatus(`Exported ${rows.length} contacts ✓`, "count");
    }
  } catch (e) {
    setStatus("Error: " + (e.message || e));
  } finally {
    runBtn.disabled = false;
  }
});

copyBtn.addEventListener("click", async () => {
  copyBtn.disabled = true;
  try {
    const rows = await runScrape();
    await navigator.clipboard.writeText(rows.map((r) => r.phone).join("\n"));
    setStatus(`Copied ${rows.length} numbers to clipboard ✓`, "count");
  } catch (e) {
    setStatus("Error: " + (e.message || e));
  } finally {
    copyBtn.disabled = false;
  }
});
