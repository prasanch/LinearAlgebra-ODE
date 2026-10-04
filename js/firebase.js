/* ==========================================================================
   Shared Firebase helpers for the visit counter and the statistics page.
   Firestore layout — one collection, one document per (week, page):
     views/{week}__{page}   { week, page, total }
       week: "all" (all-time) or an ISO week such as "2026-W40" (Bangkok time)
       page: "site" (every page), "home", or a chapter id "ch01" … "ch12"
   ========================================================================== */
import { firebaseConfig } from './firebase-config.js';

const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

export const enabled = !!(firebaseConfig && firebaseConfig.projectId);

let ready = null;
/** Lazily load the Firebase SDK; resolves to { fs, db } or null when disabled. */
export function connect() {
  if (!enabled) return Promise.resolve(null);
  if (!ready) {
    ready = Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-firestore.js')])
      .then(([app, fs]) => ({ fs, db: fs.getFirestore(app.initializeApp(firebaseConfig)) }));
  }
  return ready;
}

/** Today's date in Thailand as "YYYY-MM-DD". */
export function bangkokToday(d = new Date()) {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

/** ISO-8601 week id ("2026-W40") of a "YYYY-MM-DD" date. */
export function isoWeekOf(ymd) {
  const [y, m, dd] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);              // Thursday of this week
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return t.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
}

/** Monday (UTC date) of an ISO week id. */
export function weekMonday(weekId) {
  const [y, w] = weekId.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() || 7) - 1) + (w - 1) * 7);
  return monday;
}

/** The ISO week id that follows weekId. */
export function nextWeek(weekId) {
  const m = weekMonday(weekId);
  m.setUTCDate(m.getUTCDate() + 7);
  return isoWeekOf(m.toISOString().slice(0, 10));
}

/** "29/9–5/10" style range for an ISO week. */
export function weekRange(weekId) {
  const a = weekMonday(weekId);
  const b = new Date(a); b.setUTCDate(a.getUTCDate() + 6);
  const f = (d) => d.getUTCDate() + '/' + (d.getUTCMonth() + 1);
  return f(a) + '–' + f(b);
}

/** Page id for the current URL: "home", "ch01" … or null (not counted). */
export function pageIdFromPath(path) {
  const file = path.split('/').pop();
  if (file === '' || file === 'index.html') return 'home';
  const m = file.match(/^(ch\d{2})-/);
  return m ? m[1] : null;
}

export const EYE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

export const fmt = (n) => Number(n || 0).toLocaleString('en-US');
