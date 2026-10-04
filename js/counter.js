/* ==========================================================================
   Visit counter — records one visit per browser, per page, per day, then
   shows the counts (chapter header chip, home-page cards and footer).
   Load on every page as: <script type="module" src="…/js/counter.js"></script>
   Does nothing until js/firebase-config.js is filled in.
   ========================================================================== */
import { enabled, connect, bangkokToday, isoWeekOf, pageIdFromPath, EYE_ICON, fmt } from './firebase.js';

const page = pageIdFromPath(location.pathname);

function bi(th, en) {
  return '<span lang="th">' + th + '</span><span lang="en">' + en + '</span>';
}

async function record(fs, db, today, week) {
  const key = 'laode.seen.' + page;
  try { if (localStorage.getItem(key) === today) return; } catch (e) { /* no storage: count anyway */ }
  const batch = fs.writeBatch(db);
  [['all', page], [week, page], ['all', 'site'], [week, 'site']].forEach(([w, p]) => {
    batch.set(fs.doc(db, 'views', w + '__' + p), { week: w, page: p, total: fs.increment(1) }, { merge: true });
  });
  await batch.commit();
  try { localStorage.setItem(key, today); } catch (e) { /* ignore */ }
}

async function showChapter(fs, db) {
  const snap = await fs.getDoc(fs.doc(db, 'views', 'all__' + page));
  const kicker = document.querySelector('.chapter-head .kicker');
  if (!kicker || !snap.exists()) return;
  const chip = document.createElement('span');
  chip.className = 'view-chip';
  chip.title = 'Visits (counted once per browser per day)';
  chip.innerHTML = EYE_ICON + '<span>' + fmt(snap.data().total) + '</span>' + bi('ครั้ง', 'visits');
  kicker.appendChild(chip);
}

async function showHome(fs, db, week) {
  const [all, thisWeek] = await Promise.all([
    fs.getDocs(fs.query(fs.collection(db, 'views'), fs.where('week', '==', 'all'))),
    fs.getDoc(fs.doc(db, 'views', week + '__site'))
  ]);
  const totals = {};
  all.forEach((d) => { totals[d.data().page] = d.data().total; });

  document.querySelectorAll('a.card').forEach((card) => {
    const m = (card.getAttribute('href') || '').match(/(ch\d{2})-/);
    const meta = card.querySelector('.meta');
    if (!m || !meta) return;
    const span = document.createElement('span');
    span.className = 'views';
    span.title = 'Visits';
    span.innerHTML = EYE_ICON + fmt(totals[m[1]] || 0);
    meta.appendChild(span);
  });

  const box = document.getElementById('site-stats');
  if (box) {
    box.innerHTML =
      '<span>' + bi('เข้าชมทั้งหมด', 'Total visits') + ' <b>' + fmt(totals.site || 0) + '</b></span>' +
      '<span>' + bi('สัปดาห์นี้', 'This week') + ' <b>' + fmt(thisWeek.exists() ? thisWeek.data().total : 0) + '</b></span>' +
      '<a href="stats.html">' + bi('ดูสถิติการเข้าชม →', 'View statistics →') + '</a>';
  }
}

async function run() {
  if (!enabled || !page) return;
  const conn = await connect();
  const today = bangkokToday();
  const week = isoWeekOf(today);
  try {
    await record(conn.fs, conn.db, today, week);
  } catch (e) {
    console.warn('[visit counter] could not record visit:', e);
  }
  try {
    if (page === 'home') await showHome(conn.fs, conn.db, week);
    else await showChapter(conn.fs, conn.db);
  } catch (e) {
    console.warn('[visit counter] could not read counts:', e);
  }
}

run();
