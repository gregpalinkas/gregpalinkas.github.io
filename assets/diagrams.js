/* Work-row diagram animations.
   Hover / keyboard focus drives progress t: 0 → 1 over DURATION (linear), holds at 1.
   Leaving reverses from wherever t currently is. Touch devices: plays once on scroll-in.
   Renderers flagged .live keep running while held at 1 (the Real-time twin's readouts).
   prefers-reduced-motion: diagrams stay at rest (t = 0). */
(function () {
  'use strict';
  var DURATION = 1200;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var canHover = window.matchMedia('(hover: hover)');

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(t, a, b) { return clamp01((t - a) / (b - a)); }

  var renderers = {
    // Five empty slots get racked in from the right, one after another.
    rack: function (svg) {
      var devs = Array.prototype.slice.call(svg.querySelectorAll('[data-dev]'));
      return function (t) {
        devs.forEach(function (d, i) {
          var p = seg(t, i * 0.16, i * 0.16 + 0.2);
          d.setAttribute('transform', 'translate(' + ((1 - p) * 130).toFixed(2) + ' 0)');
          d.setAttribute('visibility', p > 0 ? 'visible' : 'hidden');
        });
      };
    },

    // A signal walks the pipeline path; each stage latches filled as it's reached.
    pipeline: function (svg) {
      var nodes = Array.prototype.slice.call(svg.querySelectorAll('[data-node]'));
      var dot = svg.querySelector('[data-dot]');
      var pts = [[50, 35], [250, 35], [250, 125], [50, 125]];
      var LEN = 490;
      return function (t) {
        var s = t * LEN;
        nodes.forEach(function (n) {
          var on = n.hasAttribute('data-always') || (t > 0 && s >= +n.getAttribute('data-node'));
          var r = n.querySelector('rect'), tx = n.querySelector('text');
          r.setAttribute('fill', on ? 'currentColor' : 'none');
          if (n.hasAttribute('data-dash')) r.setAttribute('stroke-dasharray', on ? 'none' : '4 3');
          tx.setAttribute('class', on ? 'inv' : '');
        });
        var rem = s, x = pts[0][0], y = pts[0][1];
        for (var i = 1; i < pts.length; i++) {
          var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
          var l = Math.abs(dx) + Math.abs(dy);
          if (rem <= l) { x = pts[i - 1][0] + dx * rem / l; y = pts[i - 1][1] + dy * rem / l; break; }
          rem -= l; x = pts[i][0]; y = pts[i][1];
        }
        dot.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')');
        dot.setAttribute('visibility', t > 0 && t < 1 ? 'visible' : 'hidden');
      };
    },

    // Live digital twin: a to-scale rack wired to three live readouts. Hover syncs it: leaders draw in,
    // values go live, sparklines scroll and a sync scan sweeps the rack. At rest: OFFLINE, dashed, no values.
    twin: function (svg) {
      var NS = 'http://www.w3.org/2000/svg';
      function el(tag, attrs, parent) {
        var e = document.createElementNS(NS, tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        (parent || svg).appendChild(e); return e;
      }
      function wave(tt, a) { return a[0] + a[1] * Math.sin(a[2] * tt + a[3]) + a[4] * Math.sin(a[5] * tt + a[6]); }
      // device row on the rack, readout row, metric
      var M = [
        { name: 'SW-01', unit: '°C', dy: 25, ry: 36, f: [36.6, 1.2, 1.4, 2, .6, 4.7, 0], lo: 34.5, hi: 38.5, dp: 1, dx: 60.6 },
        { name: 'SRV-07', unit: '%', dy: 66.7, ry: 92, f: [66, 11, 1.6, .5, 6, 5.1, 2], lo: 48, hi: 84, dp: 0, dx: 60.6 },
        { name: 'PDU-A', unit: 'kW', dy: 133, ry: 148, f: [4.45, .25, 1.9, 0, .14, 5.9, 1], lo: 4.0, hi: 4.9, dp: 2, dx: 64 }
      ];
      var SX = 112, SW = 168, SH = 16, NSAMP = 32, DT = .16;
      M.forEach(function (m) {
        var d = 'M' + m.dx + ' ' + m.dy + 'H86L100 ' + m.ry + 'H' + (SX - 4);
        m.base = el('path', { d: d, 'stroke-width': 1, 'stroke-dasharray': '2 3' });
        m.lead = el('path', { d: d, 'stroke-width': 1.5 });
        m.len = m.lead.getTotalLength();
        m.dot = el('rect', { width: 4, height: 4, fill: 'currentColor', stroke: 'none' });
        m.label = el('text', { x: SX, y: m.ry - 6, 'font-size': 10, 'font-weight': 700, fill: 'currentColor', stroke: 'none' });
        m.label.textContent = m.name;
        m.val = el('text', { x: SX + SW, y: m.ry - 6, 'font-size': 12, 'font-weight': 900, 'text-anchor': 'end', fill: 'currentColor', stroke: 'none', style: 'font-variant-numeric: tabular-nums' });
        m.box = el('rect', { x: SX, y: m.ry, width: SW, height: SH, 'stroke-width': 1, 'stroke-dasharray': '2 3' });
        m.spark = el('polyline', { points: '', 'stroke-width': 1.5 });
      });
      var status = el('text', { x: 280, y: 11, 'font-size': 10, 'font-weight': 700, 'text-anchor': 'end', fill: 'currentColor', stroke: 'none' });
      var blip = el('rect', { x: 0, y: 3.5, width: 6, height: 6, fill: 'currentColor', stroke: 'none' });
      var scan = el('path', { d: 'M14 0H71', 'stroke-width': 1.5 });
      var fps = el('text', { x: 20, y: 11, 'font-size': 10, 'font-weight': 700, fill: 'currentColor', stroke: 'none', style: 'font-variant-numeric: tabular-nums' });
      var T0 = performance.now();

      function render(t) {
        var tt = (performance.now() - T0) / 1000, sync = Math.min(1, Math.max(0, t / .55)), on = t >= .55, k = Math.max(0, Math.min(1, (t - .45) / .4));
        M.forEach(function (m, i) {
          var p = Math.max(0, Math.min(1, sync * 1.3 - i * .15));
          m.lead.setAttribute('stroke-dasharray', (m.len * p).toFixed(1) + ' ' + m.len.toFixed(1));
          var pt = m.lead.getPointAtLength(m.len * p);
          m.dot.setAttribute('x', (pt.x - 2).toFixed(1)); m.dot.setAttribute('y', (pt.y - 2).toFixed(1));
          m.dot.setAttribute('visibility', p > 0 && p < 1 ? 'visible' : 'hidden');
          m.box.setAttribute('stroke-dasharray', on ? 'none' : '2 3');
          if (!on) { m.val.textContent = '-- ' + m.unit; m.spark.setAttribute('points', ''); return; }
          var v = wave(tt, m.f), pts = '';
          for (var s = 0; s < NSAMP; s++) {
            var sv = wave(tt - (NSAMP - 1 - s) * DT, m.f), x = SX + 2 + (SW - 4) * s / (NSAMP - 1);
            var y = m.ry + SH - 2 - (SH - 4) * Math.max(0, Math.min(1, (sv - m.lo) / (m.hi - m.lo)));
            // samples arrive left to right as the readout comes online
            if (s / (NSAMP - 1) <= k) pts += x.toFixed(1) + ',' + y.toFixed(1) + ' ';
          }
          m.spark.setAttribute('points', pts);
          m.val.textContent = v.toFixed(m.dp) + ' ' + m.unit;
        });
        status.textContent = on ? 'LIVE' : 'OFFLINE';
        // frame rate: re-sampled four times a second, hovering just under and at 60
        var n = Math.floor(tt * 4), r = Math.sin(n * 12.9898) * 43758.5453; r -= Math.floor(r);
        fps.textContent = on ? (56 + Math.round(r * 4 + (r > .7 ? 0 : .5))) + ' FPS' : '-- FPS';
        var sw = status.getComputedTextLength ? status.getComputedTextLength() : 30;
        blip.setAttribute('x', (280 - sw - 10).toFixed(1));
        blip.setAttribute('visibility', on && Math.floor(tt * 2) % 2 === 0 ? 'visible' : 'hidden');
        var sy = 20 + 140 * ((tt / 1.6) % 1);
        scan.setAttribute('transform', 'translate(0 ' + sy.toFixed(1) + ')');
        scan.setAttribute('visibility', on ? 'visible' : 'hidden');
      }
      render.live = true;   // keeps animating while held at t = 1
      return render;
    },

    // Terrain relief rises (staggered per contour), then small trees pop up along the ridges.
    terrain: function (svg) {
      var NS = 'http://www.w3.org/2000/svg';
      var BASE = 150;
      var data = [
        [80, 150, 110, 140, 134, 124, 160, 128, 206, 146, 224, 150],
        [50, 150, 94, 136, 124, 108, 160, 112, 224, 142, 250, 146],
        [26, 150, 80, 140, 120, 90, 160, 96, 240, 140, 274, 132],
        [26, 120, 70, 104, 110, 50, 160, 58, 246, 104, 274, 96],
        [26, 88, 66, 70, 114, 18, 160, 22, 250, 70, 274, 60]
      ];
      // [contour index, x on that contour, kind]. Kinds alternate: filled conifer / outlined broadleaf.
      var TREES = [
        [4, 118, 'pine'], [4, 172, 'round'], [4, 222, 'pine'],
        [3, 72, 'round'], [3, 142, 'pine'], [3, 238, 'round'],
        [2, 196, 'pine']
      ];
      var contours = svg.querySelectorAll('[data-contour]');
      var layer = svg.querySelector('[data-trees]');

      var trees = TREES.map(function (spec) {
        var g = document.createElementNS(NS, 'g');
        var trunk = document.createElementNS(NS, 'path');
        trunk.setAttribute('d', 'M0 0V-5');
        g.appendChild(trunk);
        if (spec[2] === 'pine') {
          var tri = document.createElementNS(NS, 'path');
          tri.setAttribute('d', 'M0 -19L6 -5H-6Z');
          tri.setAttribute('fill', 'currentColor');
          tri.setAttribute('stroke', 'none');
          g.appendChild(tri);
        } else {
          var c = document.createElementNS(NS, 'circle');
          c.setAttribute('cx', '0'); c.setAttribute('cy', '-10.5'); c.setAttribute('r', '5.5');
          g.appendChild(c);
        }
        g.setAttribute('visibility', 'hidden');
        layer.appendChild(g);
        return { g: g, contour: spec[0], x: spec[1] };
      });

      function sy(y, a) { return (BASE - (BASE - y) * a).toFixed(1); }

      // y on a rendered contour at a given x. Contours are monotonic in x, so bisect on arc length.
      function yAt(path, x) {
        var lo = 0, hi = path.getTotalLength(), pt;
        for (var k = 0; k < 18; k++) {
          var mid = (lo + hi) / 2;
          pt = path.getPointAtLength(mid);
          if (pt.x < x) lo = mid; else hi = mid;
        }
        return pt.y;
      }

      return function (t) {
        data.forEach(function (n, i) {
          var a = 0.4 + 0.6 * seg(t, i * 0.06, 0.7 + i * 0.06);
          contours[i].setAttribute('d',
            'M' + n[0] + ' ' + sy(n[1], a) +
            'C' + n[2] + ' ' + sy(n[3], a) + ' ' + n[4] + ' ' + sy(n[5], a) + ' ' + n[6] + ' ' + sy(n[7], a) +
            'S' + n[8] + ' ' + sy(n[9], a) + ' ' + n[10] + ' ' + sy(n[11], a));
        });
        trees.forEach(function (tr, i) {
          var start = 0.55 + i * 0.055;
          var p = seg(t, start, start + 0.1);
          if (p <= 0) { tr.g.setAttribute('visibility', 'hidden'); return; }
          var y = yAt(contours[tr.contour], tr.x);
          tr.g.setAttribute('visibility', 'visible');
          tr.g.setAttribute('transform', 'translate(' + tr.x + ' ' + y.toFixed(2) + ') scale(' + p.toFixed(3) + ')');
        });
      };
    }
  };

  Array.prototype.forEach.call(document.querySelectorAll('.row'), function (row) {
    var svg = row.querySelector('svg[data-anim]');
    if (!svg || !renderers[svg.getAttribute('data-anim')]) return;
    var render = renderers[svg.getAttribute('data-anim')](svg);
    var t = 0, target = 0, last = null, raf = 0;

    function tick(now) {
      if (last === null) last = now;
      var step = (now - last) / DURATION;
      last = now;
      t = target > t ? Math.min(target, t + step) : Math.max(target, t - step);
      render(t);
      // live renderers (the Real-time twin) keep animating while held at t = 1
      if (t !== target || (render.live && target === 1)) { raf = requestAnimationFrame(tick); } else { raf = 0; last = null; }
    }
    function go(v) {
      if (reduce.matches) return;
      target = v;
      if (!raf) { last = null; raf = requestAnimationFrame(tick); }
    }

    render(0);
    row.addEventListener('focus', function () { go(1); });
    row.addEventListener('blur', function () { go(0); });

    if (canHover.matches) {
      row.addEventListener('mouseenter', function () { go(1); });
      row.addEventListener('mouseleave', function () { go(0); });
    } else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { go(1); io.disconnect(); } });
      }, { threshold: 0.6 });
      io.observe(svg);
    }
  });
})();
