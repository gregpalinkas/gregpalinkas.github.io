/* Gallery tiles + lightbox, and the hero rack (ink wireframe → solid). */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Gallery: cover from first image; tiles with no cover are removed ---------- */
  var lb = document.getElementById('lb'), media = document.getElementById('lbMedia'), cap = document.getElementById('lbCap');
  var prev = document.getElementById('lbPrev'), next = document.getElementById('lbNext');
  var gal = [], gi = 0, gName = '', gMeta = '';

  document.querySelectorAll('.g-tile').forEach(function (tile) {
    var imgs = tile.dataset.images.split(','), frame = tile.querySelector('.frame');
    var name = tile.querySelector('.g-name').textContent, meta = tile.querySelector('.g-meta').textContent;
    var img = new Image();
    img.alt = name + ', ' + meta;
    img.onload = function () {
      frame.appendChild(img);
      if (imgs.length > 1) { var c = document.createElement('span'); c.className = 'count'; c.textContent = imgs.length + ' images'; frame.appendChild(c); }
    };
    img.onerror = function () { var g = tile.parentElement; tile.remove(); if (!g.querySelector('.g-tile')) g.remove(); };
    img.src = imgs[0];
    tile.addEventListener('click', function () { gal = imgs; gi = 0; gName = name; gMeta = meta; show(); lb.showModal(); });
  });

  function show() {
    media.innerHTML = '';
    var i = new Image(); i.src = gal[gi]; i.alt = gName + ', image ' + (gi + 1) + ' of ' + gal.length; media.appendChild(i);
    cap.innerHTML = '<b></b><span></span>';
    cap.firstChild.textContent = gName;
    cap.lastChild.textContent = gMeta + (gal.length > 1 ? '   ' + (gi + 1) + ' / ' + gal.length : '');
    prev.hidden = next.hidden = gal.length < 2;
    if (gal[gi + 1]) { new Image().src = gal[gi + 1]; }
  }
  function step(d) { gi = (gi + d + gal.length) % gal.length; show(); }
  prev.onclick = function () { step(-1); };
  next.onclick = function () { step(1); };
  document.getElementById('lbClose').onclick = function () { lb.close(); };
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });

  /* ---------- Hero rack ---------- */
  var cv = document.getElementById('rack'); if (!cv) return;
  var ctx = cv.getContext('2d'), W, H;
  var css = getComputedStyle(document.documentElement);
  var GROUND = css.getPropertyValue('--ground').trim() || '#EDECE8';
  function size() { var d = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
  size(); addEventListener('resize', function () { size(); if (reduce) requestAnimationFrame(frame); });

  var RW = .62, RD = .9, RH = 2.1, P = .045, boxes = [];
  function add(b, kind, extra) { var o = { b: b, kind: kind }; for (var k in extra) o[k] = extra[k]; boxes.push(o); }
  [-RW / 2, RW / 2 - P].forEach(function (x) { [-RD / 2, RD / 2 - P].forEach(function (z) { add([x, -RH / 2, z, x + P, RH / 2, z + P], 'frame'); }); });
  add([-RW / 2, RH / 2 - P, -RD / 2, RW / 2, RH / 2, RD / 2], 'frame');
  add([-RW / 2, -RH / 2, -RD / 2, RW / 2, -RH / 2 + P * 1.6, RD / 2], 'frame');
  var y = -RH / 2 + P * 1.6 + .04, U = .088;
  [2, 1, 1, 3, 1, 2, 4, 1, 2, 1].forEach(function (u, i) { var h = u * U - .012; if (y + h > RH / 2 - P - .02) return; add([-RW / 2 + P + .005, y, -RD / 2 + .02, RW / 2 - P - .005, y + h, RD / 2 - .06], 'unit', { u: u, i: i }); y += u * U; });

  var faces = [];
  boxes.forEach(function (B) {
    var a = B.b[0], b = B.b[1], c = B.b[2], d = B.b[3], e = B.b[4], f = B.b[5];
    var v = [[a, b, c], [d, b, c], [d, e, c], [a, e, c], [a, b, f], [d, b, f], [d, e, f], [a, e, f]];
    [[0, 1, 2, 3, [0, 0, -1], 1], [5, 4, 7, 6, [0, 0, 1]], [4, 0, 3, 7, [-1, 0, 0]], [1, 5, 6, 2, [1, 0, 0]], [3, 2, 6, 7, [0, 1, 0]], [4, 5, 1, 0, [0, -1, 0]]]
      .forEach(function (q) { faces.push({ p: [v[q[0]], v[q[1]], v[q[2]], v[q[3]]], n: q[4], front: !!q[5], B: B, cy: (b + e) / 2 }); });
  });

  var L = (function (v) { var m = Math.hypot(v[0], v[1], v[2]); return v.map(function (x) { return x / m; }); })([-.5, .6, -.65]);
  var DIST = 4.2, pointer = 0, ptarget = 0;
  addEventListener('pointermove', function (e) { ptarget = (e.clientX / innerWidth - .5) * .5; });
  function rot(p, yaw, pitch) {
    var x = p[0], y = p[1], z = p[2], c = Math.cos(yaw), s = Math.sin(yaw), t;
    t = x * c + z * s; z = -x * s + z * c; x = t;
    c = Math.cos(pitch); s = Math.sin(pitch); t = y * c - z * s; z = y * s + z * c; y = t;
    return [x, y, z];
  }
  function proj(p, sc, cx, cy) { var k = sc / (p[2] + DIST); return [cx + p[0] * k, cy - p[1] * k]; }
  function quadAt(q, u, v) { function m(P, Q, t) { return [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t, P[2] + (Q[2] - P[2]) * t]; } return m(m(q[0], q[1], u), m(q[3], q[2], u), v); }
  function ease(x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  var T = [1.4, 2.6, 3.4, 2.2], CYC = T[0] + T[1] + T[2] + T[3], ymin = -RH / 2 - .05, ymax = RH / 2 + .05;
  function sweep(t) {
    t %= CYC;
    if (t < T[0]) return ymin; t -= T[0];
    if (t < T[1]) return ymin + (ymax - ymin) * ease(t / T[1]); t -= T[1];
    if (t < T[2]) return ymax; t -= T[2];
    return ymax - (ymax - ymin) * ease(t / T[3]);
  }
  function path(pts) { ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath(); }

  var t0 = performance.now();
  function frame(now) {
    var t = (now - t0) / 1000;
    pointer += (ptarget - pointer) * .04;
    var yaw = -.62 + Math.sin(t * .25) * .22 + pointer, pitch = -.2;
    var s = reduce ? ymax : sweep(t);
    ctx.clearRect(0, 0, W, H);
    var sc = Math.min(W * 1.15, H * .8) * 2.05, cx = W * .5, cy = H * .5;
    // ground-coloured plinth behind the rack so it reads cleanly over the hatch
    var list = faces.map(function (f) {
      var pr = f.p.map(function (p) { return rot(p, yaw, pitch); }), n = rot(f.n, yaw, pitch);
      var c = [0, 0, 0]; pr.forEach(function (p) { c[0] += p[0] / 4; c[1] += p[1] / 4; c[2] += p[2] / 4; });
      var vis = n[0] * (0 - c[0]) + n[1] * (0 - c[1]) + n[2] * (-DIST - c[2]) > 0;
      return { f: f, pr: pr, n: n, z: c[2], vis: vis };
    }).sort(function (a, b) { return b.z - a.z; });

    list.forEach(function (o) {
      var solid = o.f.cy < s, pts = o.pr.map(function (p) { return proj(p, sc, cx, cy); });
      if (!o.vis && solid) return;
      path(pts);
      if (solid) {
        var lam = Math.max(0, o.n[0] * L[0] + o.n[1] * L[1] + o.n[2] * L[2]);
        var g = o.f.B.kind === 'frame' ? 18 + 40 * lam : 30 + 70 * lam;
        ctx.fillStyle = 'rgb(' + (g | 0) + ',' + (g | 0) + ',' + ((g - 2) | 0) + ')'; ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.fillStyle = o.vis ? GROUND : 'transparent'; if (o.vis) ctx.fill();
        ctx.strokeStyle = o.vis ? '#000' : 'rgba(0,0,0,.18)'; ctx.lineWidth = 1.25; ctx.stroke();
      }
      if (o.f.front && o.vis && o.f.B.kind === 'unit') {
        var q = o.f.p, rows = Math.max(1, o.f.B.u * 2 - 1);
        ctx.strokeStyle = solid ? 'rgba(237,236,232,.35)' : 'rgba(0,0,0,.55)'; ctx.lineWidth = 1;
        for (var r = 1; r <= rows; r++) for (var gq = 0; gq < 3; gq++) {
          var u0 = .08 + gq * .24, a1 = proj(rot(quadAt(q, u0, r / (rows + 1)), yaw, pitch), sc, cx, cy), b1 = proj(rot(quadAt(q, u0 + .18, r / (rows + 1)), yaw, pitch), sc, cx, cy);
          ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(b1[0], b1[1]); ctx.stroke();
        }
        var led = proj(rot(quadAt(q, .92, .5), yaw, pitch), sc, cx, cy), rr = Math.max(1.6, sc * .0016);
        ctx.fillStyle = solid ? GROUND : '#000'; ctx.fillRect(led[0] - rr, led[1] - rr, rr * 2, rr * 2);
      }
    });
    if (s > ymin + .01 && s < ymax - .01) {
      var e = .07, c = [[-RW / 2 - e, s, -RD / 2 - e], [RW / 2 + e, s, -RD / 2 - e], [RW / 2 + e, s, RD / 2 + e], [-RW / 2 - e, s, RD / 2 + e]].map(function (p) { return proj(rot(p, yaw, pitch), sc, cx, cy); });
      path(c); ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5; ctx.stroke();
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
