/* Gallery tiles + lightbox, and the hero hall (brutalist interior, endless dolly). */
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

  /* ---------- Hero: brutalist hall, endless one-point dolly ----------
     Ink linework on ground. The CSS hatch shows through only as the hall's far opening.
     One bay passes every 1/SPEED s; pilasters repeat every PIL bays, so the loop is seamless.
     Reduced motion: single still frame. Paused while the hero is off screen. */
  var cv = document.getElementById('hall'); if (!cv) return;
  var ctx = cv.getContext('2d');
  var GROUND = getComputedStyle(document.documentElement).getPropertyValue('--ground').trim() || '#EDECE8';
  var SPEED = 1 / 3.2, ZN = .3, ZP = 9, RIBS = 2, PIL = 2, DEP = .12, PW = .22, PD = .12;
  var W, H, hw, yC = 1.15, yF = -.85, f, cx, cy, t = 0, last = 0, running = true;

  function size() {
    var d = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0);
    f = H / (yC - yF); cy = H * yC / (yC - yF); cx = W / 2;      // at z = 1 the hall section fills the canvas
    hw = Math.max(.6, Math.min(1.8, W / H));
  }
  function P(x, y, z) { return [cx + f * x / z, cy - f * y / z]; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function fog(z) { var far = Math.pow(clamp01((ZP - z) / (ZP - 1.2)), 1.3), n = clamp01((z - ZN) / .7); return far * n * n * (3 - 2 * n); }
  function seg(x1, y1, z1, x2, y2, z2) {
    if (z1 < ZN && z2 < ZN) return;
    if (z1 > ZP) { if (z2 > ZP) return; var k = (ZP - z2) / (z1 - z2); x1 = x2 + (x1 - x2) * k; y1 = y2 + (y1 - y2) * k; z1 = ZP; }
    if (z2 > ZP) { var k2 = (ZP - z1) / (z2 - z1); x2 = x1 + (x2 - x1) * k2; y2 = y1 + (y2 - y1) * k2; z2 = ZP; }
    if (z1 < ZN) { var k3 = (ZN - z2) / (z1 - z2); x1 = x2 + (x1 - x2) * k3; y1 = y2 + (y1 - y2) * k3; z1 = ZN; }
    if (z2 < ZN) { var k4 = (ZN - z1) / (z2 - z1); x2 = x1 + (x2 - x1) * k4; y2 = y1 + (y2 - y1) * k4; z2 = ZN; }
    var zm = (z1 + z2) / 2, a = fog(zm); if (a < .02) return;
    var p = P(x1, y1, z1), q = P(x2, y2, z2);
    ctx.strokeStyle = 'rgba(0,0,0,' + a.toFixed(3) + ')';
    ctx.lineWidth = Math.min(1.6, .55 + .9 / zm);
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
  }
  function bay(z0, k) {
    var z1 = z0 + 1, i, x0, x1, cw = 2 * hw / (RIBS + 1);
    // ring frame
    seg(-hw, yC, z0, hw, yC, z0); seg(-hw, yF, z0, hw, yF, z0); seg(-hw, yF, z0, -hw, yC, z0); seg(hw, yF, z0, hw, yC, z0);
    // corner runs
    [[-hw, yC], [hw, yC], [-hw, yF], [hw, yF]].forEach(function (c) { seg(c[0], c[1], z0, c[0], c[1], z1); });
    // ceiling ribs + recessed coffers
    for (i = 1; i <= RIBS; i++) { x0 = -hw + i * cw; seg(x0, yC, z0, x0, yC, z1); }
    seg(-hw, yC, z0 + .5, hw, yC, z0 + .5);                       // mid-bay cross rib: two coffers per bay
    for (var h = 0; h < 2; h++) for (i = 0; i <= RIBS; i++) {
      var za = z0 + h * .5, zb = za + .5;
      x0 = -hw + i * cw; x1 = x0 + cw;
      var m = cw * .16, mz = .08, yi = yC + DEP, a = [x0 + m, za + mz], b = [x1 - m, zb - mz];
      seg(a[0], yi, a[1], b[0], yi, a[1]); seg(a[0], yi, b[1], b[0], yi, b[1]);
      seg(a[0], yi, a[1], a[0], yi, b[1]); seg(b[0], yi, a[1], b[0], yi, b[1]);
      seg(x0, yC, za, a[0], yi, a[1]); seg(x1, yC, za, b[0], yi, a[1]); seg(x0, yC, zb, a[0], yi, b[1]); seg(x1, yC, zb, b[0], yi, b[1]);
    }
    // floor seams
    [-hw / 2, 0, hw / 2].forEach(function (x) { seg(x, yF, z0, x, yF, z1); });
    // pilasters
    if (((k % PIL) + PIL) % PIL === 0) [-1, 1].forEach(function (s) {
      var xw = s * hw, xi = s * (hw - PD), za = z0 + .05, zb = za + PW;
      seg(xi, yF, za, xi, yC, za); seg(xi, yF, zb, xi, yC, zb);
      seg(xw, yF, za, xi, yF, za); seg(xw, yC, za, xi, yC, za);
      seg(xw, yF, zb, xi, yF, zb); seg(xw, yC, zb, xi, yC, zb);
      seg(xi, yF, za, xi, yF, zb); seg(xi, yC, za, xi, yC, zb);
    });
  }
  function draw() {
    ctx.fillStyle = GROUND; ctx.fillRect(0, 0, W, H);
    var a = P(-hw, yC, ZP), b = P(hw, yF, ZP);
    ctx.clearRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);     // far opening: CSS hatch shows through
    ctx.lineCap = 'round';
    var travel = t * SPEED, base = Math.floor(travel), off = travel - base;
    for (var i = 0; i <= ZP + 1; i++) bay(i - off, base + i);
  }
  function frame(now) {
    if (last) t += Math.min(.1, (now - last) / 1000); last = now;
    draw();
    if (running && !reduce) requestAnimationFrame(frame); else last = 0;
  }
  size(); draw();
  addEventListener('resize', function () { size(); draw(); });
  if (!reduce) {
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
      var vis = e[0].isIntersecting; if (vis && !running) { running = true; requestAnimationFrame(frame); } running = vis;
    }).observe(cv);
    requestAnimationFrame(frame);
  }
})();
