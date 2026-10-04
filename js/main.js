/* ==========================================================================
   Linear Algebra & ODE — site script
   - language switch (ไทย / EN / TH+EN), remembered per browser
   - light / dark theme toggle
   - chapter sidebar + previous/next pager (built from CHAPTERS below)
   - KaTeX math rendering
   Load this in <head> WITHOUT defer so the saved language applies before paint.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var LANG_KEY = 'laode.lang';
  var THEME_KEY = 'laode.theme';

  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
  }

  /* ---- apply saved preferences immediately ---- */
  var savedLang = load(LANG_KEY);
  root.setAttribute('data-lang', savedLang === 'en' || savedLang === 'both' ? savedLang : 'th');
  root.lang = root.getAttribute('data-lang') === 'en' ? 'en' : 'th';
  var savedTheme = load(THEME_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') root.setAttribute('data-theme', savedTheme);

  /* ---- single source of truth for the chapter list ---- */
  var PARTS = {
    la: { th: 'พีชคณิตเชิงเส้น', en: 'Linear Algebra', color: 'var(--la)' },
    fa: { th: 'การวิเคราะห์ฟูเรียร์', en: 'Fourier Analysis', color: 'var(--fa)' },
    ode: { th: 'สมการเชิงอนุพันธ์', en: 'Differential Equations', color: 'var(--ode)' }
  };

  var CHAPTERS = [
    { file: 'ch01-linear-systems.html', part: 'la', week: 1, th: 'ระบบสมการเชิงเส้นและ RREF', en: 'Linear Systems & RREF' },
    { file: 'ch02-matrices.html', part: 'la', week: 2, th: 'เมทริกซ์และดีเทอร์มิแนนต์', en: 'Matrices & Determinants' },
    { file: 'ch03-vectors.html', part: 'la', week: 4, th: 'เวกเตอร์', en: 'Vectors' },
    { file: 'ch04-linear-transformations.html', part: 'la', week: 5, th: 'การแปลงเชิงเส้น', en: 'Linear Transformations' },
    { file: 'ch05-eigen.html', part: 'la', week: 6, th: 'ค่าเฉพาะและเวกเตอร์เฉพาะ', en: 'Eigenvalues & Eigenvectors' },
    { file: 'ch06-svd-least-squares.html', part: 'la', week: 7, th: 'SVD และกำลังสองน้อยที่สุด', en: 'SVD & Least Squares' },
    { file: 'ch07-fourier.html', part: 'fa', week: 8, th: 'อนุกรมและการแปลงฟูเรียร์', en: 'Fourier Series & Transform' },
    { file: 'ch08-ode-separable.html', part: 'ode', week: 9, th: 'ODE 1: บทนำและสมการแยกตัวแปรได้', en: 'ODE 1: Intro & Separable Equations' },
    { file: 'ch09-ode-homogeneous-exact.html', part: 'ode', week: 10, th: 'ODE 2: สมการเอกพันธ์และสมการแม่นตรง', en: 'ODE 2: Homogeneous & Exact Equations' },
    { file: 'ch10-ode-linear.html', part: 'ode', week: 11, th: 'ODE 3: สมการเชิงเส้นอันดับหนึ่ง', en: 'ODE 3: First-Order Linear Equations' },
    { file: 'ch11-ode-higher-order.html', part: 'ode', week: 12, th: 'ODE 4: สมการอันดับสูงและการประยุกต์', en: 'ODE 4: Higher-Order Equations & Applications' },
    { file: 'ch12-laplace.html', part: 'ode', week: 13, th: 'การแปลงลาปลาซ', en: 'The Laplace Transform' }
  ];

  function bi(th, en) {
    return '<span lang="th">' + th + '</span><span lang="en">' + en + '</span>';
  }

  /* ---- language ---- */
  function setLang(lang) {
    root.setAttribute('data-lang', lang);
    root.lang = lang === 'en' ? 'en' : 'th';
    save(LANG_KEY, lang);
    syncLangButtons();
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  }
  function syncLangButtons() {
    var current = root.getAttribute('data-lang');
    var buttons = document.querySelectorAll('[data-set-lang]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(buttons[i].getAttribute('data-set-lang') === current));
    }
  }

  /* ---- theme ---- */
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }
  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    save(THEME_KEY, next);
    document.dispatchEvent(new CustomEvent('themechange'));
  }
  if (darkQuery && darkQuery.addEventListener) {
    darkQuery.addEventListener('change', function () {
      if (!root.getAttribute('data-theme')) document.dispatchEvent(new CustomEvent('themechange'));
    });
  }

  /* ---- sidebar & pager (chapter pages only) ---- */
  function currentIndex() {
    var here = location.pathname.split('/').pop();
    for (var i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].file === here) return i;
    var n = parseInt(root.getAttribute('data-chapter'), 10);
    return isNaN(n) ? -1 : n - 1;
  }

  function buildSidebar(sidebar, idx) {
    var html = '<a class="side-home" href="../index.html">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>' +
      bi('หน้าหลักรายวิชา', 'Course home') + '</a>';
    var lastPart = null;
    for (var i = 0; i < CHAPTERS.length; i++) {
      var c = CHAPTERS[i];
      if (c.part !== lastPart) {
        if (lastPart !== null) html += '</ul>';
        var p = PARTS[c.part];
        html += '<div class="side-part"><span class="dot" style="background:' + p.color + '"></span>' + bi(p.th, p.en) + '</div><ul class="side-list">';
        lastPart = c.part;
      }
      html += '<li><a class="side-link" href="' + c.file + '"' + (i === idx ? ' aria-current="page"' : '') + '>' +
        '<span class="num">' + String(i + 1).padStart(2, '0') + '</span><span>' + bi(c.th, c.en) + '</span></a></li>';
    }
    html += '</ul>';
    sidebar.innerHTML = html;
  }

  function buildPager(pager, idx) {
    var html = '';
    if (idx > 0) {
      var p = CHAPTERS[idx - 1];
      html += '<a class="prev" href="' + p.file + '"><span class="dir">← ' + bi('บทก่อนหน้า', 'Previous') + '</span><span class="t">' + bi(p.th, p.en) + '</span></a>';
    }
    if (idx >= 0 && idx < CHAPTERS.length - 1) {
      var n = CHAPTERS[idx + 1];
      html += '<a class="next" href="' + n.file + '"><span class="dir">' + bi('บทถัดไป', 'Next') + ' →</span><span class="t">' + bi(n.th, n.en) + '</span></a>';
    }
    pager.innerHTML = html;
  }

  /* ---- math ---- */
  function renderMath() {
    if (typeof window.renderMathInElement !== 'function') return;
    window.renderMathInElement(document.body, {
      delimiters: [
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false }
      ],
      throwOnError: false,
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option']
    });
  }

  /* ---- wire up ---- */
  document.addEventListener('DOMContentLoaded', function () {
    syncLangButtons();
    document.addEventListener('click', function (e) {
      var langBtn = e.target.closest('[data-set-lang]');
      if (langBtn) { setLang(langBtn.getAttribute('data-set-lang')); return; }
      if (e.target.closest('.theme-toggle')) { toggleTheme(); return; }
      if (e.target.closest('.nav-toggle')) { document.body.classList.toggle('nav-open'); return; }
      if (e.target.closest('.scrim') || e.target.closest('a.side-link')) document.body.classList.remove('nav-open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') document.body.classList.remove('nav-open');
    });

    var idx = currentIndex();
    var sidebar = document.getElementById('sidebar');
    if (sidebar) buildSidebar(sidebar, idx);
    var pager = document.getElementById('pager');
    if (pager) buildPager(pager, idx);

    renderMath();
  });

  window.LAODE = { chapters: CHAPTERS, parts: PARTS, currentTheme: currentTheme };
})();
