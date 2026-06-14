// Runs inside web.whatsapp.com page context.
// Scrolls the chat list pane and collects phone numbers from chat titles + aria labels.

async function scrapeWhatsApp() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const numbers = new Map(); // phone -> name

  // Find chat list scroll container
  const pane =
    document.querySelector('[aria-label="Chat list"]') ||
    document.querySelector('#pane-side div[tabindex="0"]') ||
    document.querySelector('#pane-side');
  if (!pane) throw new Error("Chat list not found. Open web.whatsapp.com and sign in first.");

  const scroller = pane.querySelector('[style*="overflow"]') || pane;

  const collect = () => {
    // Each chat row has a title attribute / inner span with name or +country number
    const rows = document.querySelectorAll('#pane-side [role="listitem"], #pane-side [role="row"], div[role="grid"] > div');
    rows.forEach((row) => {
      const titleEl = row.querySelector('span[title]');
      const title = titleEl?.getAttribute('title') || row.getAttribute('aria-label') || '';
      if (!title) return;
      // Extract digits — must look like a phone (at least 7 digits, optional +)
      const match = title.match(/\+?\d[\d\s\-()]{6,}\d/);
      if (!match) return;
      const phone = match[0].replace(/[^\d+]/g, '');
      if (phone.length < 8) return;
      if (!numbers.has(phone)) numbers.set(phone, title.replace(/\+?\d[\d\s\-()]{6,}\d/, '').trim() || null);
    });
  };

  // Scroll to top first
  scroller.scrollTop = 0;
  await sleep(400);

  let lastHeight = -1;
  let stableRounds = 0;
  for (let i = 0; i < 200; i++) {
    collect();
    scroller.scrollTop = scroller.scrollHeight;
    await sleep(450);
    if (scroller.scrollHeight === lastHeight) {
      stableRounds++;
      if (stableRounds >= 3) break;
    } else {
      stableRounds = 0;
      lastHeight = scroller.scrollHeight;
    }
  }
  collect();

  return Array.from(numbers.entries()).map(([phone, name]) => ({ name, phone }));
}

return scrapeWhatsApp();
