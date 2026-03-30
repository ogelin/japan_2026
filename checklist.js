// checklist.js — shared state persistence via Google Sheets
// Replace this URL with your deployed Apps Script /exec URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjEcy1BuPfu1X4zdfTwbNn4B1R2Pab4Sv0TMYz4rMm5WABpSw2JL_waiviQgRpztTn/exec';

// Which page are we on? Set data-page="trip" or data-page="disney" on <body>
const PAGE_ID = document.body.dataset.page;

// In-memory state map: item_id -> checked boolean
const state = {};

// ─── Load ────────────────────────────────────────────────────────────────────

async function loadState() {
  try {
    const res = await fetch(`${SCRIPT_URL}?page=${PAGE_ID}`);
    const json = await res.json();
    if (!json.ok) return;

    json.rows.forEach(row => {
      state[row.item_id] = row.checked === true || row.checked === 'TRUE';
    });

    applyState();
  } catch (err) {
    console.warn('Could not load state from sheet:', err);
    // Silently fail — checkboxes just start unchecked
  }
}

// ─── Apply ───────────────────────────────────────────────────────────────────

function applyState() {
  // Trip page: place-pick divs with data-item-id
  document.querySelectorAll('[data-item-id]').forEach(el => {
    const id = el.dataset.itemId;
    if (state[id]) {
      el.classList.add('checked');
    } else {
      el.classList.remove('checked');
    }
  });

  // Disney page: block divs with data-id (prefixed as disney-<data-id>)
  document.querySelectorAll('[data-id]').forEach(el => {
    const id = `disney-${el.dataset.id}`;
    if (state[id]) {
      el.classList.add('done');
    } else {
      el.classList.remove('done');
    }
  });
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

// Called by trip page place-pick items
function togglePick(el) {
  if (event) event.stopPropagation();
  const id = el.dataset.itemId;
  const newChecked = !el.classList.contains('checked');
  el.classList.toggle('checked', newChecked);
  state[id] = newChecked;
  persist(id, newChecked);
}

// Called by Disney page blocks
function toggleBlock(el) {
  const rawId = el.dataset.id;
  const id = `disney-${rawId}`;
  const newChecked = !el.classList.contains('done');
  el.classList.toggle('done', newChecked);
  state[id] = newChecked;
  persist(id, newChecked);

  // Update Disney progress counter if present
  if (typeof updateProgress === 'function') updateProgress();
}

// ─── Persist ─────────────────────────────────────────────────────────────────

async function persist(item_id, checked) {
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      // Apps Script requires text/plain for doPost to receive postData.contents
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        item_id,
        checked,
        updated_at: new Date().toISOString()
      })
    });
  } catch (err) {
    console.warn('Could not persist state:', err);
    // Silently fail — UI already updated optimistically
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', loadState);
