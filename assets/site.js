/* Gallery tiles + lightbox, and the hero proof-line animation. */
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

  /* ---------- Hero: the proof line, animated ----------
     RUN is pressed, 100 SKUs latch from raw (dashed) to material in one diagonal wave, the clock runs to 05:00.
     Bars: share of the same job finished in the same elapsed time. Pipeline reaches 100%, manual reaches 0.2%.
     10 s loop. Reduced motion: single finished frame. Paused while the hero is off screen. */
  var cv = document.getElementById('proof'); if (!cv) return;
  var ctx = cv.getContext('2d');
  var INK = '#000', GROUND = '#EDECE8', MUTED = '#383836', FONT = '"Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif';
  var T = 10, MATS = [0, 1, 3, 2], W, H, L, t = 0, last = 0, running = true, seen = false;
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function font(w, s) { return w + ' ' + s + 'px ' + FONT; }
  function txt(s, x, y, w, size, align, color) { ctx.font = font(w, size); ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color; ctx.fillText(s, x, y); }
  function hatch(x, y, w, h, gap, dir) {
    ctx.beginPath();
    for (var k = -h; k < w + h; k += gap) { if (dir > 0) { ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + h, y); } else { ctx.moveTo(x + k, y); ctx.lineTo(x + k + h, y + h); } }
    ctx.stroke();
  }
  function mmss(sec) { sec = Math.round(sec); var m = Math.floor(sec / 60), s = sec % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function mat(x, y, w, m) {
    ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 1;
    if (m === 0) { ctx.fillRect(x, y, w, w); return; }
    if (m === 3) { ctx.strokeRect(x + .5, y + .5, w - 1, w - 1); var k = Math.round(w * .3); ctx.fillRect(x + k, y + k, w - 2 * k, w - 2 * k); return; }
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, w); ctx.clip(); hatch(x, y, w, w, Math.max(2.5, w / 5), m === 1 ? -1 : 1); ctx.restore();
    ctx.strokeRect(x + .5, y + .5, w - 1, w - 1);
  }
  function bars(x, y, w, s, done, big) {
    var gap = big ? 34 : 30, bh = 10, m = s / 6, right = m.toFixed(1) + '%';
    txt('PIPELINE', x, y, 900, 11, 'left', INK); txt(Math.round(s * 100) + '%', x + w, y, 900, 11, 'right', INK);
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + 5.5, w - 1, bh);
    ctx.fillStyle = INK; ctx.fillRect(x, y + 5, w * s, bh + 1);
    var y2 = y + gap;
    txt('MANUAL', x, y2, 700, 11, 'left', MUTED);
    if (done > 0) {
      ctx.globalAlpha = done;
      if (w >= 220) { ctx.font = font(700, 11); txt('49:55:00 TO GO · ', x + w - ctx.measureText(right).width, y2, 700, 11, 'right', MUTED); }
      else txt('49:55:00 TO GO', x, y2 + bh + 20, 700, 11, 'left', MUTED);
      ctx.globalAlpha = 1;
    }
    txt(right, x + w, y2, 700, 11, 'right', MUTED);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y2 + 5.5, w - 1, bh); ctx.setLineDash([]);
    if (s > 0) { ctx.fillStyle = INK; ctx.fillRect(x, y2 + 5, Math.max(1.5, w * m / 100), bh + 1); }
  }
  function size() {
    var d = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0);
    if (W / H > 1.05) {
      var pad = 20, cell = Math.floor(Math.min(H - 2 * pad, W * .5) / 10);
      L = { land: true, cell: cell, gx: pad, gy: Math.round((H - cell * 10) / 2) }; L.px = L.gx + cell * 10 + 24; L.pw = W - L.px - 20;
    } else {
      var top = 100, bot = 82, side = 22, c2 = Math.floor(Math.min((W - 2 * side) / 10, (H - top - bot) / 10));
      L = { land: false, cell: c2, gx: Math.round((W - c2 * 10) / 2), gy: top + Math.round((H - top - bot - c2 * 10) / 2) };
    }
  }
  function draw(time) {
    if (!L) return;
    var u = time % T, cell = L.cell, gx = L.gx, gy = L.gy, ins = Math.max(1.5, Math.round(cell * .12)), w = cell - 2 * ins, on = 0;
    ctx.fillStyle = GROUND; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < 100; i++) {
      var r = Math.floor(i / 10), q = i % 10, dd = (r + q) / 18, li = 1.0 + dd * 3.4, ui = 8.8 + dd * .9;
      var x = gx + q * cell + ins, y = gy + r * cell + ins;
      if (u >= li && u < ui) { on++; var a = ease((u - li) / .18), sz = w * (.5 + .5 * a), o = (w - sz) / 2; mat(x + o, y + o, sz, MATS[q % 4]); }
      else { ctx.setLineDash(cell > 18 ? [3, 3] : [2, 2]); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, w - 1); ctx.setLineDash([]); }
    }
    var s = u >= 8.8 ? 0 : clamp01((u - 1.0) / 3.6), done = u >= 8.8 ? 0 : ease((u - 4.8) / .5), pressed = u >= .6 && u < 1.15;
    var X0 = L.land ? L.px : gx, X1 = L.land ? L.px + L.pw : gx + cell * 10;
    var bw = 46, bh = 20, bx = X1 - bw, by = L.land ? gy : 14;
    ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.fillStyle = INK;
    if (pressed) { ctx.fillRect(bx, by + 2, bw, bh); txt('RUN', bx + bw / 2, by + 16, 900, 11, 'center', GROUND); }
    else { ctx.fillRect(bx + 2, by + 2, bw, bh); ctx.fillStyle = GROUND; ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx + .75, by + .75, bw - 1.5, bh - 1.5); txt('RUN', bx + bw / 2, by + 14, 900, 11, 'center', INK); }
    txt('MATERIAL PASS', X0, L.land ? gy + 10 : 26, 700, 10, 'left', MUTED);
    var big = L.land ? 34 : 46, cy0 = L.land ? gy + 58 : 76;
    txt(mmss(s * 300), X0, cy0, 900, big, 'left', INK);
    txt((on < 10 ? '00' : on < 100 ? '0' : '') + on + ' / 100 SKUS', L.land ? X0 : X1, L.land ? cy0 + 20 : cy0, 700, 11, L.land ? 'left' : 'right', MUTED);
    if (L.land) bars(X0, gy + cell * 10 - 46, L.pw, s, done, false); else bars(X0, H - 62, X1 - X0, s, done, true);
  }
  function frame(now) {
    if (last) t += Math.min(.1, (now - last) / 1000); last = now;
    draw(t);
    if (running && !reduce) requestAnimationFrame(frame); else last = 0;
  }
  size(); draw(reduce ? 6.5 : 0);
  addEventListener('resize', function () { size(); draw(reduce ? 6.5 : t); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(reduce ? 6.5 : t); });
  if (!reduce) {
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
      var vis = e[0].isIntersecting; if (vis) seen = true;
      if (!seen) return;                                  // never pause on an unconfirmed report
      if (vis && !running) { running = true; requestAnimationFrame(frame); }
      running = vis;
    }).observe(cv);
    requestAnimationFrame(frame);
  }
})();
