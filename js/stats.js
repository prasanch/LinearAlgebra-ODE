/* ==========================================================================
   Statistics page — reads every counter document and draws:
     1. stat tiles (all-time, this week, last week, most-visited chapter)
     2. a column chart of site visits per ISO week
     3. a bar chart of visits per chapter (= per teaching week), coloured by part
     4. a heatmap table: chapter × recent ISO weeks
   ========================================================================== */
import { enabled, connect, bangkokToday, isoWeekOf, nextWeek, weekRange, fmt } from './firebase.js';

const MAX_WEEKS = 20;      // columns in the weekly chart
const HEAT_WEEKS = 8;      // columns in the heatmap
const SVG_NS = 'http://www.w3.org/2000/svg';
const PART_COLOR = { la: 'var(--c-la)', fa: 'var(--c-fa)', ode: 'var(--c-ode)' };

const $ = (id) => document.getElementById(id);
const lang = () => (document.documentElement.getAttribute('data-lang') === 'en' ? 'en' : 'th');
const T = (th, en) => (lang() === 'en' ? en : th);

/* ---------- tooltip (values lead, labels follow; built with textContent) ---------- */
const tip = document.createElement('div');
tip.className = 'viz-tip';
tip.hidden = true;
document.body.appendChild(tip);

function showTip(evt, value, label) {
  tip.replaceChildren();
  const b = document.createElement('b');
  b.textContent = value;
  const s = document.createElement('span');
  s.textContent = label;
  tip.append(b, s);
  tip.hidden = false;
  let x, y;
  if (evt.clientX !== undefined && evt.type !== 'focus') { x = evt.clientX; y = evt.clientY; }
  else { const r = evt.target.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top; }
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x + 12)) + 'px';
  tip.style.top = Math.max(8, y - h - 12) + 'px';
}
function hideTip() { tip.hidden = true; }
function bindTip(el, value, labelFn) {
  el.setAttribute('tabindex', '0');
  el.addEventListener('pointermove', (e) => showTip(e, value, labelFn()));
  el.addEventListener('focus', (e) => showTip(e, value, labelFn()));
  el.addEventListener('pointerleave', hideTip);
  el.addEventListener('blur', hideTip);
}

function svgEl(tag, attrs, parent) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(el);
  return el;
}

/* clean axis ticks: 0, step, 2·step … ≥ max */
function niceTicks(max) {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
  const ticks = [];
  for (let v = 0; v <= max + step * 0.999; v += step) ticks.push(Math.round(v));
  return ticks;
}

/* column with a 4px rounded top, square at the baseline */
function columnPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/* ---------- data ---------- */
let DATA = null;

async function load() {
  const { fs, db } = await connect();
  const snap = await fs.getDocs(fs.collection(db, 'views'));
  const all = {};
  const weekly = {};             // weekly[week][page] = total
  snap.forEach((d) => {
    const { week, page, total } = d.data();
    if (week === 'all') all[page] = total;
    else (weekly[week] = weekly[week] || {})[page] = total;
  });
  const current = isoWeekOf(bangkokToday());
  const known = Object.keys(weekly).sort();
  let first = known[0] || current;
  const weeks = [];
  for (let w = first; w <= current && weeks.length < 520; w = nextWeek(w)) weeks.push(w);
  return { all, weekly, current, weeks: weeks.slice(-MAX_WEEKS) };
}

/* ---------- 1. tiles ---------- */
function renderTiles() {
  const { all, weekly, current, weeks } = DATA;
  const chapters = window.LAODE.chapters;
  const prev = weeks.length > 1 ? weeks[weeks.length - 2] : null;
  let top = null;
  chapters.forEach((c, i) => {
    const id = 'ch' + String(i + 1).padStart(2, '0');
    if ((all[id] || 0) > 0 && (!top || all[id] > all[top.id])) top = { id, c };
  });
  const tiles = [
    { hero: true, label: T('เข้าชมทั้งหมด', 'All-time visits'), value: fmt(all.site), sub: T('ทุกหน้า ตั้งแต่เริ่มนับ', 'all pages, since counting began') },
    { label: T('สัปดาห์นี้', 'This week'), value: fmt((weekly[current] || {}).site), sub: current.replace('-W', ' · W') + ' (' + weekRange(current) + ')' },
    { label: T('สัปดาห์ที่แล้ว', 'Last week'), value: prev ? fmt((weekly[prev] || {}).site) : '—', sub: prev ? prev.replace('-W', ' · W') + ' (' + weekRange(prev) + ')' : '' },
    { label: T('บทที่มีผู้เข้าชมมากที่สุด', 'Most-visited chapter'), value: top ? fmt(all[top.id]) : '—',
      sub: top ? T('บทที่ ' + Number(top.id.slice(2)) + ' · ' + top.c.th, 'Ch. ' + Number(top.id.slice(2)) + ' · ' + top.c.en) : '' }
  ];
  const box = $('tiles');
  box.replaceChildren();
  tiles.forEach((t) => {
    const d = document.createElement('div');
    d.className = 'tile' + (t.hero ? ' tile-hero' : '');
    const l = document.createElement('div'); l.className = 't-label'; l.textContent = t.label;
    const v = document.createElement('div'); v.className = 't-value'; v.textContent = t.value;
    const s = document.createElement('div'); s.className = 't-sub'; s.textContent = t.sub;
    d.append(l, v, s);
    box.appendChild(d);
  });
}

/* ---------- 2. weekly column chart ---------- */
function renderWeekly() {
  const { weekly, weeks, current } = DATA;
  const box = $('chart-weekly');
  box.replaceChildren();
  const values = weeks.map((w) => (weekly[w] || {}).site || 0);
  const max = Math.max(0, ...values);
  if (max === 0) { box.innerHTML = '<div class="empty">' + T('ยังไม่มีข้อมูล', 'No data yet') + '</div>'; return; }

  const W = Math.max(320, box.clientWidth), H = 260;
  const m = { l: 44, r: 8, t: 22, b: 34 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const ticks = niceTicks(max), top = ticks[ticks.length - 1];
  const y = (v) => m.t + ih - (v / top) * ih;
  const band = iw / weeks.length;
  const bw = Math.min(24, band * 0.62);

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'viz', role: 'img',
    'aria-label': T('จำนวนการเข้าชมรายสัปดาห์', 'Visits per week') }, box);
  ticks.forEach((t) => {
    svgEl('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t === 0 ? 'baseline' : 'gridline' }, svg);
    svgEl('text', { x: m.l - 8, y: y(t) + 4, 'text-anchor': 'end' }, svg).textContent = fmt(t);
  });
  const every = Math.ceil(weeks.length / Math.max(1, Math.floor(iw / 46)));
  const maxIdx = values.indexOf(max);
  weeks.forEach((w, i) => {
    const v = values[i];
    const cx = m.l + band * i + band / 2;
    if (v > 0) {
      const h = Math.max(1, ih - (y(v) - m.t));
      const bar = svgEl('path', { d: columnPath(cx - bw / 2, y(v), bw, h), class: 'mark', style: 'fill:var(--c-la)' }, svg);
      bar.setAttribute('aria-label', w + ': ' + v);
    }
    const hit = svgEl('rect', { x: m.l + band * i, y: m.t, width: band, height: ih, class: 'hit' }, svg);
    bindTip(hit, fmt(v) + ' ' + T('ครั้ง', 'visits'), () => w + ' · ' + weekRange(w) + (w === current ? T(' (สัปดาห์นี้)', ' (this week)') : ''));
    if (i % every === 0 || i === weeks.length - 1) {
      svgEl('text', { x: cx, y: H - m.b + 18, 'text-anchor': 'middle' }, svg).textContent = 'W' + w.slice(-2);
    }
    if ((i === maxIdx || i === weeks.length - 1) && v > 0) {
      svgEl('text', { x: cx, y: y(v) - 7, 'text-anchor': 'middle', class: 'v' }, svg).textContent = fmt(v);
    }
  });
}

/* ---------- 3. per-chapter bars (HTML rows so long Thai titles wrap) ---------- */
function renderChapters() {
  const { all } = DATA;
  const chapters = window.LAODE.chapters;
  const box = $('chart-chapters');
  box.replaceChildren();
  const rows = chapters.map((c, i) => ({ c, id: 'ch' + String(i + 1).padStart(2, '0'), n: i + 1, v: all['ch' + String(i + 1).padStart(2, '0')] || 0 }));
  const max = Math.max(0, ...rows.map((r) => r.v));
  if (max === 0) { box.innerHTML = '<div class="empty">' + T('ยังไม่มีข้อมูล', 'No data yet') + '</div>'; return; }

  const table = document.createElement('div');
  table.style.cssText = 'display:grid;grid-template-columns:minmax(120px,38%) 1fr;gap:6px 14px;align-items:center';
  rows.forEach((r) => {
    const label = document.createElement('div');
    label.style.cssText = 'font-size:.88rem;color:var(--ink-2);line-height:1.35';
    label.textContent = T('สัปดาห์ ' + r.c.week + ' · ', 'Wk ' + r.c.week + ' · ') + T(r.c.th, r.c.en);
    const track = document.createElement('div');
    track.style.cssText = 'display:flex;align-items:center;gap:8px;min-width:0';
    const bar = document.createElement('div');
    bar.className = 'mark';
    const pct = r.v ? Math.max(1.5, (r.v / max) * 82) : 0;
    bar.style.cssText = `height:18px;width:${pct}%;background:${PART_COLOR[r.c.part]};border-radius:0 4px 4px 0`;
    const val = document.createElement('span');
    val.style.cssText = 'font-size:.85rem;font-weight:600;color:var(--ink-2);font-variant-numeric:tabular-nums';
    val.textContent = fmt(r.v);
    track.append(bar, val);
    bindTip(track, fmt(r.v) + ' ' + T('ครั้ง', 'visits'), () => T('บทที่ ', 'Chapter ') + r.n + ' · ' + T(r.c.th, r.c.en));
    table.append(label, track);
  });
  box.appendChild(table);
}

/* ---------- 4. heatmap: chapter × recent weeks ---------- */
function renderHeat() {
  const { weekly, weeks } = DATA;
  const chapters = window.LAODE.chapters;
  const cols = weeks.slice(-HEAT_WEEKS);
  const box = $('chart-heat');
  box.replaceChildren();
  let max = 0;
  chapters.forEach((c, i) => cols.forEach((w) => { max = Math.max(max, ((weekly[w] || {})['ch' + String(i + 1).padStart(2, '0')]) || 0); }));
  if (max === 0) { box.innerHTML = '<div class="empty">' + T('ยังไม่มีข้อมูล', 'No data yet') + '</div>'; return; }

  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  wrap.style.border = '0';
  const table = document.createElement('table');
  table.className = 'heat';
  const thead = table.createTHead().insertRow();
  const corner = document.createElement('th');
  corner.textContent = T('บท \\ สัปดาห์', 'Chapter \\ week');
  thead.appendChild(corner);
  cols.forEach((w) => {
    const th = document.createElement('th');
    th.textContent = 'W' + w.slice(-2);
    th.title = weekRange(w);
    thead.appendChild(th);
  });
  const tbody = table.createTBody();
  chapters.forEach((c, i) => {
    const id = 'ch' + String(i + 1).padStart(2, '0');
    const tr = tbody.insertRow();
    const th = document.createElement('th');
    const wk = document.createElement('span');
    wk.className = 'wk';
    wk.textContent = String(i + 1).padStart(2, '0');
    th.append(wk, document.createTextNode(T(c.th, c.en)));
    tr.appendChild(th);
    cols.forEach((w) => {
      const v = ((weekly[w] || {})[id]) || 0;
      const td = tr.insertCell();
      td.textContent = v ? fmt(v) : '·';
      if (v) td.className = 'lvl' + Math.min(4, Math.ceil((v / max) * 4));
      bindTip(td, fmt(v) + ' ' + T('ครั้ง', 'visits'), () => T('บทที่ ', 'Chapter ') + (i + 1) + ' · ' + w + ' (' + weekRange(w) + ')');
    });
  });
  wrap.appendChild(table);
  box.appendChild(wrap);
}

function renderAll() {
  renderTiles();
  renderWeekly();
  renderChapters();
  renderHeat();
}

async function main() {
  if (!enabled) { $('stats-off').hidden = false; return; }
  $('stats-on').hidden = false;
  try {
    DATA = await load();
  } catch (e) {
    console.warn('[stats] could not load counts:', e);
    $('stats-error').hidden = false;
    return;
  }
  renderAll();
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(renderWeekly, 150); });
  document.addEventListener('langchange', renderAll);
}

main();
