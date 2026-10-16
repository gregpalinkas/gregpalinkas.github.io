/* Work-row diagram animations.
   Hover / keyboard focus drives progress t: 0 → 1 over DURATION (linear), holds at 1.
   Leaving reverses from wherever t currently is. Touch devices: plays once on scroll-in.
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

    // Alcubierre shape function, recomputed each frame: sigma 1.5 → 8.
    curve: function (svg) {
      var path = svg.querySelector('[data-curve]');
      var label = svg.querySelector('[data-sigma]');
      var R = 1, N = 120;
      return function (t) {
        var sigma = 1.5 + 6.5 * t, norm = 2 * Math.tanh(sigma * R), d = '';
        for (var i = 0; i <= N; i++) {
          var r = -3 + 6 * i / N;
          var f = (Math.tanh(sigma * (r + R)) - Math.tanh(sigma * (r - R))) / norm;
          d += (i ? 'L' : 'M') + (20 + 260 * i / N).toFixed(1) + ' ' + (150 - 110 * f).toFixed(1);
        }
        path.setAttribute('d', d);
        label.textContent = 'f(r), σ = ' + sigma.toFixed(1);
      };
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
      if (t !== target) { raf = requestAnimationFrame(tick); } else { raf = 0; last = null; }
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
