/* ==========================================================================
   GoatCounter visitor counter (goatcounter.com) — free, cookieless, no ads.
   - Put your site code in GC_CODE below (the "laode" in laode.goatcounter.com).
     While it is empty, nothing loads.
   - Every page is counted, so the GoatCounter dashboard shows visits per
     chapter (= per teaching week) and per day/week.
   - On the home page, the total is shown in the footer (#visitor-counter).
     For that, enable "Allow adding visitor counts on your website" in
     GoatCounter → Settings.
   Load in <head> on every page:  <script src="…/js/goatcounter.js"></script>
   ========================================================================== */
(function () {
  'use strict';

  var GC_CODE = '';                     // e.g. 'laode'

  if (!/^[a-z0-9-]+$/.test(GC_CODE)) return;

  var base = 'https://' + GC_CODE + '.goatcounter.com';

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', base + '/count');
  document.head.appendChild(s);

  document.addEventListener('DOMContentLoaded', function () {
    var box = document.getElementById('visitor-counter');
    var out = document.getElementById('visitor-total');
    if (!box || !out || !window.fetch) return;
    fetch(base + '/counter/TOTAL.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || data.count == null) return;
        out.textContent = data.count;
        box.hidden = false;
      })
      .catch(function () { /* counter stays hidden */ });
  });
})();
