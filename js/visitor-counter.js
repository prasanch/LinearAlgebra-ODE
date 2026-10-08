/* ==========================================================================
   Visitor counter (home page footer): today / this week / this month / overall.
   Uses Abacus (abacus.jasoncameron.dev) — free, no account, no API key.
   Every page load adds 1 to each of the four counters.
   Day, week (ISO, Monday–Sunday) and month follow Thailand time.
   ========================================================================== */
(function () {
  'use strict';

  var NAMESPACE = 'prasanch-linearalgebra-ode';
  var API = 'https://abacus.jasoncameron.dev/hit/';

  // Year, month, day in Thailand time
  var parts = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }).split('-');
  var y = +parts[0], m = +parts[1], d = +parts[2];

  // ISO-8601 week: the week containing Thursday decides the year
  var t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  var isoYear = t.getUTCFullYear();
  var week = Math.ceil(((t - Date.UTC(isoYear, 0, 1)) / 86400000 + 1) / 7);

  var counters = [
    ['daily-' + y + '-' + m + '-' + d, 'cnt-daily'],
    ['weekly-' + isoYear + '-W' + week, 'cnt-weekly'],
    ['monthly-' + y + '-' + m, 'cnt-monthly'],
    ['overall', 'cnt-overall']
  ];

  function show(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function hit(key, id) {
    fetch(API + NAMESPACE + '/' + key)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        show(id, typeof data.value === 'number' ? data.value.toLocaleString('en-US') : '—');
      })
      .catch(function () { show(id, '—'); });
  }

  function run() {
    if (!document.getElementById('visitor-analytics') || !window.fetch) return;
    counters.forEach(function (c) { hit(c[0], c[1]); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
