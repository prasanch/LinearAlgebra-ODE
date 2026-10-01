/* ==========================================================================
   Linear Algebra & ODE — interactive widgets (canvas based, no libraries)
   Each widget is a <section class="widget" data-widget="..."> in the page:
     transform2d  2×2 matrix acting on the plane (optional eigenvectors)
     fourier      partial sums of the square-wave Fourier series
     pulse        rectangular pulse and its Fourier transform
     lsq          least-squares fit with residual / total squares
   ========================================================================== */
(function () {
  'use strict';

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function palette() {
    return {
      bg: css('--bg'), ink: css('--ink'), ink2: css('--ink-2'), muted: css('--muted'),
      line: css('--line'), lineStrong: css('--line-strong'),
      la: css('--la'), fa: css('--fa'), ode: css('--ode'), key: css('--key'),
      laSoft: css('--la-soft'), faSoft: css('--fa-soft'), odeSoft: css('--ode-soft')
    };
  }
  function bi(th, en) {
    return '<span lang="th">' + th + '</span><span lang="en">' + en + '</span>';
  }
  function fmt(x, d) {
    if (!isFinite(x)) return '—';
    var s = x.toFixed(d === undefined ? 3 : d);
    s = s.replace(/\.?0+$/, '');
    return s === '-0' ? '0' : s;
  }

  /* Canvas that follows its CSS size and device pixel ratio, redraws on theme change. */
  function makeCanvas(canvas, draw) {
    var ctx = canvas.getContext('2d');
    var state = { w: 0, h: 0 };
    function resize() {
      var r = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      state.w = Math.max(1, r.width);
      state.h = Math.max(1, r.height);
      canvas.width = Math.round(state.w * dpr);
      canvas.height = Math.round(state.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    }
    function redraw() {
      ctx.clearRect(0, 0, state.w, state.h);
      draw(ctx, state.w, state.h, palette());
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    else window.addEventListener('resize', resize);
    document.addEventListener('themechange', redraw);
    resize();
    return redraw;
  }

  /* Map world coords to a pixel rectangle. */
  function viewport(x0, x1, y0, y1, px, py, pw, ph) {
    return {
      X: function (x) { return px + (x - x0) / (x1 - x0) * pw; },
      Y: function (y) { return py + (y1 - y) / (y1 - y0) * ph; },
      x0: x0, x1: x1, y0: y0, y1: y1, px: px, py: py, pw: pw, ph: ph
    };
  }

  function drawAxes(ctx, v, p, opts) {
    opts = opts || {};
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = p.line;
    var step = opts.step || 1;
    if (opts.grid !== false) {
      for (var gx = Math.ceil(v.x0 / step) * step; gx <= v.x1; gx += step) {
        ctx.beginPath(); ctx.moveTo(v.X(gx), v.py); ctx.lineTo(v.X(gx), v.py + v.ph); ctx.stroke();
      }
      var ystep = opts.ystep || step;
      for (var gy = Math.ceil(v.y0 / ystep) * ystep; gy <= v.y1; gy += ystep) {
        ctx.beginPath(); ctx.moveTo(v.px, v.Y(gy)); ctx.lineTo(v.px + v.pw, v.Y(gy)); ctx.stroke();
      }
    }
    ctx.strokeStyle = p.muted;
    ctx.lineWidth = 1.3;
    if (v.y0 <= 0 && v.y1 >= 0) { ctx.beginPath(); ctx.moveTo(v.px, v.Y(0)); ctx.lineTo(v.px + v.pw, v.Y(0)); ctx.stroke(); }
    if (v.x0 <= 0 && v.x1 >= 0) { ctx.beginPath(); ctx.moveTo(v.X(0), v.py); ctx.lineTo(v.X(0), v.py + v.ph); ctx.stroke(); }
    ctx.restore();
  }

  function arrow(ctx, x1, y1, x2, y2, color, width) {
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var len = Math.hypot(x2 - x1, y2 - y1);
    var head = Math.min(12, len * 0.35);
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width || 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - Math.cos(ang) * head * 0.6, y2 - Math.sin(ang) * head * 0.6); ctx.stroke();
    if (len > 2) {
      ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(ang - 0.4), y2 - head * Math.sin(ang - 0.4));
      ctx.lineTo(x2 - head * Math.cos(ang + 0.4), y2 - head * Math.sin(ang + 0.4));
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function label(ctx, text, x, y, color, align) {
    ctx.save();
    ctx.font = '600 14px ' + css('--font');
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function plotFn(ctx, v, f, color, width, from, to) {
    var a = from === undefined ? v.x0 : from, b = to === undefined ? v.x1 : to;
    var n = Math.max(200, Math.round(v.pw * 1.5));
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width || 2; ctx.lineJoin = 'round';
    ctx.beginPath();
    var started = false;
    for (var i = 0; i <= n; i++) {
      var x = a + (b - a) * i / n, y = f(x);
      if (!isFinite(y)) { started = false; continue; }
      var X = v.X(x), Y = v.Y(y);
      if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ------------------------------------------------------------------ */
  /* transform2d                                                          */
  /* ------------------------------------------------------------------ */
  function initTransform(root) {
    var inputs = {};
    root.querySelectorAll('input[data-m]').forEach(function (el) { inputs[el.getAttribute('data-m')] = el; });
    var canvas = root.querySelector('canvas');
    var out = root.querySelector('[data-out]');
    var showEigen = root.getAttribute('data-eigen') === 'true';

    function M() {
      function g(k) { var v = parseFloat(inputs[k].value); return isFinite(v) ? v : 0; }
      return { a: g('a'), b: g('b'), c: g('c'), d: g('d') };
    }

    function eigen(m) {
      var tr = m.a + m.d, det = m.a * m.d - m.b * m.c, disc = tr * tr - 4 * det;
      if (disc < -1e-12) return { real: false, tr: tr, det: det };
      var s = Math.sqrt(Math.max(0, disc));
      var ls = [(tr + s) / 2, (tr - s) / 2];
      var vecs = ls.map(function (l) {
        var v;
        if (Math.abs(m.b) > 1e-9) v = [m.b, l - m.a];
        else if (Math.abs(m.c) > 1e-9) v = [l - m.d, m.c];
        else v = null;
        return v;
      });
      if (!vecs[0] && !vecs[1]) {             // diagonal matrix: axes are eigenvectors
        vecs = Math.abs(ls[0] - m.a) < 1e-9 ? [[1, 0], [0, 1]] : [[0, 1], [1, 0]];
      }
      return { real: true, ls: ls, vecs: vecs, tr: tr, det: det };
    }

    var redraw = makeCanvas(canvas, function (ctx, w, h, p) {
      var m = M();
      var R = 4.2, aspect = w / h;
      var v = viewport(-R * aspect, R * aspect, -R, R, 0, 0, w, h);
      drawAxes(ctx, v, p);
      function T(x, y) { return [m.a * x + m.b * y, m.c * x + m.d * y]; }

      // transformed grid
      ctx.save();
      ctx.strokeStyle = p.la; ctx.globalAlpha = 0.28; ctx.lineWidth = 1;
      for (var k = -8; k <= 8; k++) {
        var p1 = T(k, -8), p2 = T(k, 8), q1 = T(-8, k), q2 = T(8, k);
        ctx.beginPath(); ctx.moveTo(v.X(p1[0]), v.Y(p1[1])); ctx.lineTo(v.X(p2[0]), v.Y(p2[1])); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(v.X(q1[0]), v.Y(q1[1])); ctx.lineTo(v.X(q2[0]), v.Y(q2[1])); ctx.stroke();
      }
      ctx.restore();

      // unit square and its image
      var sq = [[0, 0], [1, 0], [1, 1], [0, 1]];
      ctx.save();
      ctx.strokeStyle = p.muted; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
      ctx.beginPath();
      sq.forEach(function (pt, i) { var X = v.X(pt[0]), Y = v.Y(pt[1]); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
      ctx.closePath(); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.fillStyle = p.key; ctx.globalAlpha = 0.18;
      ctx.beginPath();
      sq.forEach(function (pt, i) { var q = T(pt[0], pt[1]); var X = v.X(q[0]), Y = v.Y(q[1]); if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); });
      ctx.closePath(); ctx.fill();
      ctx.restore();

      // eigen lines
      if (showEigen) {
        var e = eigen(m);
        if (e.real) {
          e.vecs.forEach(function (vec, i) {
            if (!vec) return;
            var n = Math.hypot(vec[0], vec[1]); if (n < 1e-12) return;
            var ux = vec[0] / n, uy = vec[1] / n;
            ctx.save();
            ctx.strokeStyle = p.ode; ctx.lineWidth = 1.6; ctx.setLineDash([7, 5]);
            ctx.beginPath(); ctx.moveTo(v.X(-20 * ux), v.Y(-20 * uy)); ctx.lineTo(v.X(20 * ux), v.Y(20 * uy)); ctx.stroke();
            ctx.restore();
            var l = e.ls[i];
            arrow(ctx, v.X(0), v.Y(0), v.X(l * ux), v.Y(l * uy), p.ode, 3.5);
            label(ctx, 'λ' + (i + 1) + ' = ' + fmt(l, 2), v.X(2.9 * ux) + 8, v.Y(2.9 * uy) - 10, p.ode);
          });
        }
      }

      // images of basis vectors
      var e1 = T(1, 0), e2 = T(0, 1);
      arrow(ctx, v.X(0), v.Y(0), v.X(e1[0]), v.Y(e1[1]), p.la, 3);
      arrow(ctx, v.X(0), v.Y(0), v.X(e2[0]), v.Y(e2[1]), p.fa, 3);
      label(ctx, 'T(e₁)', v.X(e1[0]) + 6, v.Y(e1[1]) + 12, p.la);
      label(ctx, 'T(e₂)', v.X(e2[0]) + 6, v.Y(e2[1]) - 12, p.fa);
    });

    function update() {
      var m = M(), det = m.a * m.d - m.b * m.c;
      var html = '<span>det A = <b>' + fmt(det) + '</b></span>' +
        '<span>' + bi('พื้นที่ของสี่เหลี่ยมหนึ่งหน่วยถูกคูณด้วย', 'unit-square area is scaled by') + ' <b>|det A| = ' + fmt(Math.abs(det)) + '</b></span>';
      if (Math.abs(det) < 1e-9) html += '<span><b>' + bi('det = 0 → ไม่มีอินเวอร์ส (ระนาบถูกบีบเหลือเส้นหรือจุด)', 'det = 0 → not invertible (the plane collapses)') + '</b></span>';
      if (showEigen) {
        var e = eigen(m);
        if (e.real) {
          html += '<span>λ₁ = <b>' + fmt(e.ls[0]) + '</b>, λ₂ = <b>' + fmt(e.ls[1]) + '</b></span>';
        } else {
          html += '<span>' + bi('ค่าเฉพาะเป็นจำนวนเชิงซ้อน (ไม่มีทิศที่คงเดิม — เช่นการหมุน)', 'complex eigenvalues (no direction is preserved, e.g. a rotation)') + '</span>';
        }
      }
      out.innerHTML = html;
      redraw();
    }

    Object.keys(inputs).forEach(function (k) { inputs[k].addEventListener('input', update); });
    root.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var vals = btn.getAttribute('data-preset').split(',');
        ['a', 'b', 'c', 'd'].forEach(function (k, i) { inputs[k].value = vals[i]; });
        update();
      });
    });
    update();
  }

  /* ------------------------------------------------------------------ */
  /* fourier: square wave, 1 on (0, π), 0 on (π, 2π)                      */
  /* ------------------------------------------------------------------ */
  function initFourier(root) {
    var slider = root.querySelector('input[type="range"]');
    var out = root.querySelector('[data-out]');
    var canvas = root.querySelector('canvas');
    var TWO_PI = 2 * Math.PI;

    function square(t) {
      var r = ((t % TWO_PI) + TWO_PI) % TWO_PI;
      return r < Math.PI ? 1 : 0;
    }
    function partial(t, N) {
      var s = 0.5;
      for (var k = 1; k <= N; k++) {
        var n = 2 * k - 1;
        s += 2 / (n * Math.PI) * Math.sin(n * t);
      }
      return s;
    }

    var redraw = makeCanvas(canvas, function (ctx, w, h, p) {
      var N = parseInt(slider.value, 10);
      var pad = 28;
      var v = viewport(-2 * Math.PI, 2 * Math.PI, -0.35, 1.35, pad, 10, w - pad - 10, h - 34);
      drawAxes(ctx, v, p, { step: Math.PI / 2, ystep: 0.5 });
      // tick labels
      ctx.save();
      ctx.font = '12px ' + css('--font'); ctx.fillStyle = p.muted; ctx.textAlign = 'center';
      ['−2π', '−π', '0', 'π', '2π'].forEach(function (s, i) { ctx.fillText(s, v.X((i - 2) * Math.PI), v.Y(0) + 16); });
      ctx.textAlign = 'right';
      ctx.fillText('1', v.X(0) - 6, v.Y(1) + 4);
      ctx.restore();
      // exact square wave
      ctx.save();
      ctx.strokeStyle = p.fa; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      ctx.beginPath();
      for (var j = -2; j < 2; j++) {
        var a = j * Math.PI, b = a + Math.PI, y = square(a + 0.01);
        ctx.moveTo(v.X(a), v.Y(y)); ctx.lineTo(v.X(b), v.Y(y));
      }
      ctx.stroke();
      ctx.restore();
      plotFn(ctx, v, function (t) { return partial(t, N); }, p.la, 2.4);
    });

    function update() {
      var N = parseInt(slider.value, 10);
      var terms = [];
      for (var k = 1; k <= Math.min(N, 3); k++) {
        var n = 2 * k - 1;
        terms.push(n === 1 ? 'sin t' : 'sin ' + n + 't/' + n);
      }
      var lastN = 2 * N - 1;
      var series = '½ + (2/π)(' + terms.join(' + ') + (N > 3 ? ' + … + sin ' + lastN + 't/' + lastN : '') + ')';
      out.innerHTML = '<span>' + bi('จำนวนพจน์ไซน์', 'sine terms') + ': <b>' + N + '</b> (n = 1, 3, …, ' + lastN + ')</span><span><b>' + series + '</b></span>';
      redraw();
    }
    slider.addEventListener('input', update);
    update();
  }

  /* ------------------------------------------------------------------ */
  /* pulse: f(t) = 1 for |t| < a  →  F(ω) = √(2/π) sin(aω)/ω               */
  /* ------------------------------------------------------------------ */
  function initPulse(root) {
    var slider = root.querySelector('input[type="range"]');
    var out = root.querySelector('[data-out]');
    var canvas = root.querySelector('canvas');
    var K = Math.sqrt(2 / Math.PI);

    function F(w, a) { return Math.abs(w) < 1e-9 ? K * a : K * Math.sin(a * w) / w; }

    var redraw = makeCanvas(canvas, function (ctx, w, h, p) {
      var a = parseFloat(slider.value);
      var narrow = w < 560;
      var gap = 18;
      var pw = narrow ? w - 20 : (w - 20 - gap) / 2;
      var ph = narrow ? (h - 20 - gap) / 2 : h - 34;
      var v1 = viewport(-5, 5, -0.3, 1.3, 10, 10, pw, ph);
      var top = Math.max(1, K * a * 1.25);           // keep the peak a√(2/π) in view
      var v2 = narrow
        ? viewport(-12, 12, -0.35 * top, top, 10, 10 + ph + gap, pw, ph)
        : viewport(-12, 12, -0.35 * top, top, 10 + pw + gap, 10, pw, ph);

      drawAxes(ctx, v1, p, { step: 1, ystep: 0.5 });
      drawAxes(ctx, v2, p, { step: 2, ystep: 1 });

      // f(t)
      ctx.save();
      ctx.strokeStyle = p.fa; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(v1.X(-5), v1.Y(0)); ctx.lineTo(v1.X(-a), v1.Y(0));
      ctx.moveTo(v1.X(-a), v1.Y(1)); ctx.lineTo(v1.X(a), v1.Y(1));
      ctx.moveTo(v1.X(a), v1.Y(0)); ctx.lineTo(v1.X(5), v1.Y(0));
      ctx.stroke();
      ctx.restore();
      label(ctx, 'f(t)', v1.X(-4.7), v1.Y(1.15), p.fa);
      label(ctx, '−a', v1.X(-a), v1.Y(0) + 14, p.muted, 'center');
      label(ctx, 'a', v1.X(a), v1.Y(0) + 14, p.muted, 'center');

      // F(ω)
      plotFn(ctx, v2, function (x) { return F(x, a); }, p.la, 2.4);
      label(ctx, 'F(ω)', v2.X(-11.5), v2.Y(top * 0.9), p.la);
      var z = Math.PI / a;
      if (z < 12) {
        ctx.save(); ctx.fillStyle = p.ode;
        [-z, z].forEach(function (x) { ctx.beginPath(); ctx.arc(v2.X(x), v2.Y(0), 4, 0, 2 * Math.PI); ctx.fill(); });
        ctx.restore();
        label(ctx, 'π/a', v2.X(z), v2.Y(0) + 15, p.ode, 'center');
      }
    });

    function update() {
      var a = parseFloat(slider.value);
      out.innerHTML =
        '<span>a = <b>' + fmt(a, 2) + '</b></span>' +
        '<span>F(0) = a√(2/π) = <b>' + fmt(a * K) + '</b></span>' +
        '<span>' + bi('จุดตัดแรก', 'first zero') + ' ω = π/a = <b>' + fmt(Math.PI / a) + '</b></span>';
      redraw();
    }
    slider.addEventListener('input', update);
    update();
  }

  /* ------------------------------------------------------------------ */
  /* lsq: fixed data + fitted y = d·x + c·x²                              */
  /* ------------------------------------------------------------------ */
  function initLsq(root) {
    var pts = JSON.parse(root.getAttribute('data-points'));
    var coef = JSON.parse(root.getAttribute('data-coef'));      // [d, c] for y = d x + c x²
    var canvas = root.querySelector('canvas');
    var out = root.querySelector('[data-out]');
    var mode = 'res';

    function yhat(x) { return coef[0] * x + coef[1] * x * x; }
    var ybar = pts.reduce(function (s, q) { return s + q[1]; }, 0) / pts.length;

    var redraw = makeCanvas(canvas, function (ctx, w, h, p) {
      var yr = 9, aspect = w / h;
      var v = viewport(-3.5, -3.5 + yr * aspect, -3.5, 5.5, 0, 0, w, h);
      drawAxes(ctx, v, p);
      var unit = v.X(1) - v.X(0);

      // squares
      pts.forEach(function (q) {
        var target = mode === 'res' ? yhat(q[0]) : ybar;
        var side = q[1] - target;
        var s = Math.abs(side) * unit;
        ctx.save();
        ctx.fillStyle = mode === 'res' ? p.ode : p.fa;
        ctx.strokeStyle = ctx.fillStyle;
        ctx.globalAlpha = 0.16;
        var top = Math.min(v.Y(q[1]), v.Y(target));
        ctx.fillRect(v.X(q[0]), top, s, s);
        ctx.globalAlpha = 0.9; ctx.lineWidth = 1.2;
        ctx.strokeRect(v.X(q[0]), top, s, s);
        ctx.restore();
      });

      if (mode === 'tot') {
        ctx.save();
        ctx.strokeStyle = p.fa; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.moveTo(v.X(v.x0), v.Y(ybar)); ctx.lineTo(v.X(v.x1), v.Y(ybar)); ctx.stroke();
        ctx.restore();
        label(ctx, 'ȳ = ' + fmt(ybar, 2), v.X(v.x1) - 8, v.Y(ybar) - 12, p.fa, 'right');
      }
      plotFn(ctx, v, yhat, p.la, 2.6);

      ctx.save(); ctx.fillStyle = p.ink;
      pts.forEach(function (q) { ctx.beginPath(); ctx.arc(v.X(q[0]), v.Y(q[1]), 5, 0, 2 * Math.PI); ctx.fill(); });
      ctx.restore();
    });

    function update() {
      var ssr = 0, sst = 0;
      pts.forEach(function (q) { ssr += Math.pow(q[1] - yhat(q[0]), 2); sst += Math.pow(q[1] - ybar, 2); });
      out.innerHTML =
        '<span>SS<sub>res</sub> = <b>' + fmt(ssr) + '</b></span>' +
        '<span>SS<sub>tot</sub> = <b>' + fmt(sst) + '</b></span>' +
        '<span>R² = 1 − SS<sub>res</sub>/SS<sub>tot</sub> = <b>' + fmt(1 - ssr / sst, 4) + '</b></span>';
      root.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode)); });
      redraw();
    }
    root.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { mode = b.getAttribute('data-mode'); update(); });
    });
    update();
  }

  /* ------------------------------------------------------------------ */
  /* family: y = ¼e^{3x} + C e^{-x}, the GS of y' + y = e^{3x}            */
  /* ------------------------------------------------------------------ */
  function initFamily(root) {
    var slider = root.querySelector('input[type="range"]');
    var out = root.querySelector('[data-out]');
    var canvas = root.querySelector('canvas');

    function y(x, C) { return 0.25 * Math.exp(3 * x) + C * Math.exp(-x); }

    var redraw = makeCanvas(canvas, function (ctx, w, h, p) {
      var y0 = parseFloat(slider.value), C = y0 - 0.25;
      var v = viewport(-2.5, 1.2, -3, 5, 0, 0, w, h);   // x is stretched so the exponentials stay readable
      drawAxes(ctx, v, p, { step: 0.5, ystep: 1 });
      ctx.save(); ctx.globalAlpha = 0.45;
      for (var k = -3; k <= 3; k += 0.5) {
        plotFn(ctx, v, function (x) { return y(x, k); }, p.muted, 1.1);
      }
      ctx.restore();
      plotFn(ctx, v, function (x) { return y(x, C); }, p.ode, 3);
      ctx.save(); ctx.fillStyle = p.ode;
      ctx.beginPath(); ctx.arc(v.X(0), v.Y(y0), 6, 0, 2 * Math.PI); ctx.fill();
      ctx.restore();
      label(ctx, '(0, ' + fmt(y0, 2) + ')', v.X(0) + 10, v.Y(y0) - 12, p.ode);
    });

    function update() {
      var y0 = parseFloat(slider.value), C = y0 - 0.25;
      var sign = C < 0 ? ' − ' : ' + ';
      out.innerHTML =
        '<span>C = y₀ − ¼ = <b>' + fmt(C, 2) + '</b></span>' +
        '<span>PS: <b>y = ¼e^{3x}' + sign + fmt(Math.abs(C), 2) + 'e^{−x}</b></span>';
      out.innerHTML = out.innerHTML.replace(/\^\{([^}]*)\}/g, '<sup>$1</sup>');
      redraw();
    }
    slider.addEventListener('input', update);
    update();
  }

  /* ------------------------------------------------------------------ */
  /* second-order: y'' + b y' + c y = 0 with y(0) = 1, y'(0) = 0         */
  /* ------------------------------------------------------------------ */
  function initSecondOrder(root) {
    var sb = root.querySelector('input[data-k="b"]');
    var sc = root.querySelector('input[data-k="c"]');
    var out = root.querySelector('[data-out]');
    var canvas = root.querySelector('canvas');

    function solve(b, c) {
      var disc = b * b - 4 * c;
      if (Math.abs(disc) < 1e-9) {                    // repeated root r: y = (1 - r x) e^{rx}
        var r = -b / 2;
        return { kind: 2, r: r, f: function (x) { return (1 - r * x) * Math.exp(r * x); } };
      }
      if (disc > 0) {                                 // distinct real roots
        var s = Math.sqrt(disc), r1 = (-b + s) / 2, r2 = (-b - s) / 2;
        var C1 = -r2 / (r1 - r2), C2 = r1 / (r1 - r2);
        return { kind: 1, r1: r1, r2: r2, f: function (x) { return C1 * Math.exp(r1 * x) + C2 * Math.exp(r2 * x); } };
      }
      var al = -b / 2, be = Math.sqrt(-disc) / 2;     // complex α ± βi
      return { kind: 3, al: al, be: be, f: function (x) { return Math.exp(al * x) * (Math.cos(be * x) - al / be * Math.sin(be * x)); } };
    }

    var redraw = makeCanvas(canvas, function (ctx, w, h, p) {
      var sol = solve(parseFloat(sb.value), parseFloat(sc.value));
      var v = viewport(-0.3, 10, -2.2, 2.2, 0, 0, w, h);
      drawAxes(ctx, v, p, { step: 1, ystep: 1 });
      plotFn(ctx, v, function (x) {
        if (x < 0) return NaN;
        var yv = sol.f(x);
        return Math.max(-50, Math.min(50, yv));        // keep huge values drawable
      }, p.ode, 2.6);
      ctx.save(); ctx.fillStyle = p.ode;
      ctx.beginPath(); ctx.arc(v.X(0), v.Y(1), 5, 0, 2 * Math.PI); ctx.fill();
      ctx.restore();
    });

    function update() {
      var b = parseFloat(sb.value), c = parseFloat(sc.value);
      var sol = solve(b, c);
      var disc = b * b - 4 * c;
      var eq = 'r² ' + (b < 0 ? '− ' : '+ ') + fmt(Math.abs(b), 2) + 'r ' + (c < 0 ? '− ' : '+ ') + fmt(Math.abs(c), 2) + ' = 0';
      var roots, kind;
      if (sol.kind === 1) {
        roots = 'r = ' + fmt(sol.r1, 3) + ', ' + fmt(sol.r2, 3);
        kind = bi('กรณี 1: รากจริงต่างกัน', 'Case 1: distinct real roots');
      } else if (sol.kind === 2) {
        roots = 'r = ' + fmt(sol.r, 3) + ' (×2)';
        kind = bi('กรณี 2: รากซ้ำ', 'Case 2: repeated root');
      } else {
        roots = 'r = ' + fmt(sol.al, 3) + ' ± ' + fmt(sol.be, 3) + 'i';
        kind = bi('กรณี 3: รากเชิงซ้อน', 'Case 3: complex roots');
      }
      out.innerHTML =
        '<span><b>' + eq + '</b></span>' +
        '<span>b² − 4c = <b>' + fmt(disc, 2) + '</b></span>' +
        '<span><b>' + kind + '</b></span>' +
        '<span><b>' + roots + '</b></span>';
      redraw();
    }
    [sb, sc].forEach(function (el) { el.addEventListener('input', update); });
    root.querySelectorAll('[data-preset]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-preset').split(',');
        sb.value = v[0]; sc.value = v[1];
        update();
      });
    });
    update();
  }

  var INIT = { transform2d: initTransform, fourier: initFourier, pulse: initPulse, lsq: initLsq, family: initFamily, 'second-order': initSecondOrder };

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.widget[data-widget]').forEach(function (el) {
      var fn = INIT[el.getAttribute('data-widget')];
      if (fn) fn(el);
    });
  });
})();
