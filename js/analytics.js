/* ==========================================================================
   Google Analytics 4 with a cookie-consent banner (PDPA).
   - Put your Measurement ID in GA_ID below. While it is empty, nothing loads
     and no banner is shown.
   - Consent Mode v2: analytics cookies are DENIED by default. Google only
     receives cookieless, anonymous pings until the visitor presses "Accept".
     Advertising features are always denied.
   - The choice is remembered in localStorage; a "Cookie settings" button
     (sidebar / home footer) reopens the banner.
   Load in <head> (no defer) on every page:  <script src="…/js/analytics.js"></script>
   See GA_SETUP.md for setup and how to read weekly / per-chapter reports.
   ========================================================================== */
(function () {
  'use strict';

  var GA_ID = '';                       // e.g. 'G-AB12CD34EF'
  var KEY = 'laode.consent';            // 'granted' | 'denied'

  if (!/^G-[A-Z0-9]+$/.test(GA_ID)) return;

  function load(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function save(key, v) { try { localStorage.setItem(key, v); } catch (e) { /* ignore */ } }

  var saved = load(KEY);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('consent', 'default', {
    analytics_storage: saved === 'granted' ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });
  gtag('js', new Date());
  gtag('config', GA_ID);

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);

  function bi(th, en) {
    return '<span lang="th">' + th + '</span><span lang="en">' + en + '</span>';
  }

  var banner = null;

  function choose(value) {
    save(KEY, value);
    gtag('consent', 'update', { analytics_storage: value });
    if (banner) banner.hidden = true;
  }

  function showBanner() {
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'consent';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Cookie consent');
      banner.innerHTML =
        '<p>' + bi(
          'เว็บนี้ใช้คุกกี้ของ Google Analytics เพื่อนับจำนวนผู้เข้าชมแต่ละบท ช่วยให้ผู้สอนรู้ว่าหัวข้อไหนมีคนอ่านมากหรือน้อย ไม่เก็บชื่อหรือข้อมูลที่ระบุตัวตน',
          'This site uses Google Analytics cookies to count visits to each chapter, so the instructor can see which topics are read most. No names or identifying data are collected.'
        ) + '</p>' +
        '<div class="actions">' +
          '<button type="button" class="btn" data-consent="denied">' + bi('ไม่ยอมรับ', 'Decline') + '</button>' +
          '<button type="button" class="btn primary" data-consent="granted">' + bi('ยอมรับ', 'Accept') + '</button>' +
        '</div>';
      banner.addEventListener('click', function (e) {
        var b = e.target.closest('[data-consent]');
        if (b) choose(b.getAttribute('data-consent'));
      });
      document.body.appendChild(banner);
    }
    banner.hidden = false;
  }

  document.addEventListener('DOMContentLoaded', function () {
    // "Cookie settings" buttons exist only when analytics is configured
    document.querySelectorAll('[data-open-consent]').forEach(function (el) { el.hidden = false; });
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-open-consent]')) showBanner();
    });
    if (saved !== 'granted' && saved !== 'denied') showBanner();
  });
})();
