/* Gallery tiles + lightbox, and the hero node-graph animation. */
(function () {
  'use strict';
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)'), reduce = reduceMQ.matches;

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

  /* ---------- Hero: prototype -> standard -> scale, as a node graph ----------
     Stages run 2 s each (IDEA, PROTOTYPE, VALIDATE, STANDARD), each box drawn in its own stage's art, with a progress bar beneath.
     Graph nodes fill in a left-to-right wave: dotted -> hard line -> shaded -> black; the version node ships v1.0 last.
     Checklist ticks on an even beat; TEAM STANDARD ticks as SCALE begins, and a curved feed rolls it out to four team lanes
     while the SCALE box's copies slide out. 12.6 s loop. Reduced motion: single finished frame. Paused while off screen. */
  var cv = document.getElementById('proof'); if (!cv) return;
  var ctx = cv.getContext('2d');
  var INK = '#000', GROUND = '#EDECE8', MUTED = '#383836';
  var FONT = '"Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif';
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(x) { x = clamp01(x); return x * x * (3 - 2 * x); }
  function font(w, s) { return w + ' ' + s + 'px ' + FONT; }
  function txt(c, s, x, y, w, size, align, color) {
    c.font = font(w, size); c.textAlign = align || 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = color || INK; c.fillText(s, x, y);
  }
  function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function hatch(c, x, y, w, h, gap, dir) {
    c.beginPath();
    for (var k = -h; k < w + h; k += gap) {
      if (dir > 0) { c.moveTo(x + k, y + h); c.lineTo(x + k + h, y); } else { c.moveTo(x + k, y); c.lineTo(x + k + h, y + h); }
    }
    c.stroke();
  }
  function box(c, x, y, w, h, st, t, fs) {
    c.lineWidth = st === 1 ? 2 : 1; c.strokeStyle = INK;
    if (st === 2) { c.fillStyle = INK; c.fillRect(x, y, w, h); }
    else { c.fillStyle = GROUND; c.fillRect(x, y, w, h); if (st === 0) c.setLineDash([3, 2]); c.strokeRect(x + .5, y + .5, w - 1, h - 1); c.setLineDash([]); }
    if (t) txt(c, t, x + w / 2, y + h / 2 + (fs || 9) * .36, 700, fs || 9, 'center', st === 2 ? GROUND : (st === 0 ? MUTED : INK));
  }
  function partial(c, x1, y1, x2, y2, p, dot) {
    if (p <= 0) return; p = clamp01(p);
    var x = x1 + (x2 - x1) * p, y = y1 + (y2 - y1) * p; line(c, x1, y1, x, y);
    if (dot && p < 1) { c.fillStyle = INK; c.fillRect(x - 3, y - 3, 6, 6); }
  }
  // stage strip: each box is drawn in its own stage's art (fixed); progress is shown by a bar under the boxes
  function strip(c, W, names, cur, y, prog, spread, mini) {
    spread = spread || [0, 0];
    var gap = 6, nw = (W - 40 - gap * (names.length - 1)) / names.length, fs = nw < 60 ? 8 : 9, bh = mini ? 14 : 20;
    for (var i = 0; i < names.length; i++) {
      var x = 20 + i * (nw + gap), cx = x + nw / 2, ty = y + bh / 2 + fs * .36;
      if (i) { c.strokeStyle = INK; c.lineWidth = 1; line(c, x - gap, y + bh / 2, x, y + bh / 2); }
      c.strokeStyle = INK;
      if (i === 0) {            // IDEA: dotted outline
        c.fillStyle = GROUND; c.fillRect(x, y, nw, bh); c.setLineDash([3, 2]); c.lineWidth = 1.5; c.strokeRect(x + .75, y + .75, nw - 1.5, bh - 1.5); c.setLineDash([]);
        mini || txt(c, names[i], cx, ty, 700, fs, 'center', INK);
      } else if (i === 1) {     // PROTOTYPE: hard line
        c.fillStyle = GROUND; c.fillRect(x, y, nw, bh); c.lineWidth = 2; c.strokeRect(x + 1, y + 1, nw - 2, bh - 2);
        mini || txt(c, names[i], cx, ty, 700, fs, 'center', INK);
      } else if (i === 2) {     // VALIDATE: hard line, shaded interior
        c.fillStyle = GROUND; c.fillRect(x, y, nw, bh);
        c.save(); c.beginPath(); c.rect(x, y, nw, bh); c.clip(); c.lineWidth = .8; hatch(c, x, y, nw, bh, 5, -1); c.restore();
        c.lineWidth = 2; c.strokeRect(x + 1, y + 1, nw - 2, bh - 2);
        if (!mini) { c.font = font(700, fs); var tw = c.measureText(names[i]).width; c.fillStyle = GROUND; c.fillRect(cx - tw / 2 - 3, y + 4, tw + 6, bh - 8); }
        mini || txt(c, names[i], cx, ty, 700, fs, 'center', INK);
      } else if (i === 3) {     // STANDARD: black
        c.fillStyle = INK; c.fillRect(x, y, nw, bh);
        mini || txt(c, names[i], cx, ty, 700, fs, 'center', GROUND);
      } else {                  // SCALE: the standard, stacked into copies
        var o = 3, w2 = nw - o * 2;
        for (var k = 2; k >= 1; k--) { // copies slide out from behind the standard as it rolls out
          var sp = ease(spread[k - 1]); if (sp <= 0) continue; var dx = o * k * sp;
          c.globalAlpha = sp; c.fillStyle = GROUND; c.fillRect(x + dx, y - dx, w2, bh); c.strokeStyle = INK; c.lineWidth = 1.5; c.strokeRect(x + dx + .75, y - dx + .75, w2 - 1.5, bh - 1.5); c.globalAlpha = 1; }
        c.fillStyle = INK; c.fillRect(x, y, w2, bh);
        mini || txt(c, names[i], x + w2 / 2, ty, 700, fs, 'center', GROUND);
      }
      // progress bar: finished stages full, current one filling, future ones empty
      var pr = i < cur ? 1 : i === cur ? clamp01(prog) : 0;
      if (pr > 0) { c.fillStyle = INK; c.fillRect(x, y + bh + 4, nw * pr, 3); }
    }
  }
  var LANES = ['VIZ', 'PRINT', 'WEB', 'REAL-TIME'];

  var VS = 12;

  /* 2 · Node graph: three inputs wired through a tool node to one output */
  function bez(c, a, b, t) { // draw cubic bezier wire from a to b up to parameter t; returns end point
    var dx = (b[0] - a[0]) * .55, p1 = [a[0] + dx, a[1]], p2 = [b[0] - dx, b[1]], n = 24, end = a;
    c.beginPath(); c.moveTo(a[0], a[1]);
    for (var i = 1; i <= n; i++) {
      var k = i / n * t, mk = 1 - k;
      var px = mk * mk * mk * a[0] + 3 * mk * mk * k * p1[0] + 3 * mk * k * k * p2[0] + k * k * k * b[0];
      var py = mk * mk * mk * a[1] + 3 * mk * mk * k * p1[1] + 3 * mk * k * k * p2[1] + k * k * k * b[1];
      c.lineTo(px, py); end = [px, py];
    }
    c.stroke(); return end;
  }
  function bezPt(a, b, k) {
    var dx = (b[0] - a[0]) * .55, p1 = [a[0] + dx, a[1]], p2 = [b[0] - dx, b[1]], mk = 1 - k;
    return [mk * mk * mk * a[0] + 3 * mk * mk * k * p1[0] + 3 * mk * k * k * p2[0] + k * k * k * b[0],
            mk * mk * mk * a[1] + 3 * mk * mk * k * p1[1] + 3 * mk * k * k * p2[1] + k * k * k * b[1]];
  }
  function glyphNodes(c, x, y, s, st, u, gw) {
    gw = gw || s * 1.6;
    // [x, y, w, h] in graph units, column, row-in-column
    var D = [
      [0, .04, .17, .17, 0, 0], [0, .415, .17, .17, 0, 1], [0, .79, .17, .17, 0, 2],   // inputs
      [.27, .28, .17, .44, 1, 0],                                                     // tool
      [.54, .41, .13, .18, 2, 0],                                                     // output
      [.77, .36, .23, .28, 3, 0]                                                      // version: the shipped tool
    ];
    var N = D.map(function (r) { return [x + r[0] * gw, y + r[1] * s, r[2] * gw, r[3] * s]; });
    // completion wave: each column reaches a state only after the column before it
    var STEP = .2 * L;
    function at(i, base) { return base + D[i][4] * STEP + D[i][5] * .08; }
    function dashed(i) { return clamp01((u - at(i, .08 * L)) / .25); }      // IDEA: dotted outline appears
    function lined(i) { return u >= at(i, L + .05); }                        // PROTOTYPE: solid outline
    function shaded(i) { return clamp01((u - at(i, 2 * L + .05)) / .35); }      // VALIDATE: hatch sweeps in
    function inked(i) { return ease((u - at(i, 3 * L + .05)) / .3); }          // STANDARD: goes black
    var tool = N[3], out = N[4], ver = N[5];
    // wires: [from node, to node, start pt, end pt]
    var W = [0, 1, 2].map(function (i) { var n = N[i]; return [i, 3, [n[0] + n[2], n[1] + n[3] / 2], [tool[0], tool[1] + tool[3] * (.25 + i * .25)]]; });
    W.push([3, 4, [tool[0] + tool[2], tool[1] + tool[3] / 2], [out[0], out[1] + out[3] / 2]]);
    W.push([4, 5, [out[0] + out[2], out[1] + out[3] / 2], [ver[0], ver[1] + ver[3] / 2]]);
    c.strokeStyle = INK; c.lineJoin = 'miter';
    W.forEach(function (w) {
      // wire draws from the moment its source goes solid until its target goes solid
      var t0 = at(w[0], 1.65), t1 = at(w[1], 1.65), t = clamp01((u - t0) / Math.max(.15, t1 - t0)); if (t <= 0) return;
      c.lineWidth = inked(w[0]) > .5 && inked(w[1]) > .5 ? 2 : 1.5; var e = bez(c, w[2], w[3], t);
      if (t < 1) { c.fillStyle = INK; c.fillRect(e[0] - 3, e[1] - 3, 6, 6); }
    });
    // data pulses once a wire's target has been validated
    W.forEach(function (w, i) {
      if (shaded(w[1]) < 1) return;
      var per = st >= 3 ? .7 : 1.1, k = ((u - 2 * L + (i >= 3 ? .35 * (i - 2) : i * .12)) / per) % 1; if (k < 0) return;
      var pt = bezPt(w[2], w[3], k); c.fillStyle = INK; c.fillRect(pt[0] - 2.5, pt[1] - 2.5, 5, 5);
    });
    N.forEach(function (n, i) {
      var d = dashed(i); if (d <= 0) return;
      c.globalAlpha = d;
      c.fillStyle = GROUND; c.fillRect(n[0], n[1], n[2], n[3]);
      if (!lined(i)) { c.setLineDash([3, 2]); c.lineWidth = 1.5; c.strokeStyle = INK; c.strokeRect(n[0] + .5, n[1] + .5, n[2] - 1, n[3] - 1); c.setLineDash([]); c.globalAlpha = 1; return; }
      c.globalAlpha = 1;
      var sh = shaded(i), ink = inked(i);
      if (sh > 0) { c.save(); c.beginPath(); c.rect(n[0], n[1], n[2] * sh, n[3]); c.clip(); c.strokeStyle = INK; c.lineWidth = .8; hatch(c, n[0], n[1], n[2], n[3], 5, -1); c.restore(); }
      if (ink > 0) { c.globalAlpha = ink; c.fillStyle = INK; c.fillRect(n[0], n[1], n[2], n[3]); c.globalAlpha = 1; }
      c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(n[0] + 1, n[1] + 1, n[2] - 2, n[3] - 2);
      c.fillStyle = INK;
      if (i < 3) c.fillRect(n[0] + n[2] - 3, n[1] + n[3] / 2 - 3, 6, 6);
      if (i === 3) { for (var p = 0; p < 3; p++) c.fillRect(n[0] - 3, n[1] + n[3] * (.25 + p * .25) - 3, 6, 6); c.fillRect(n[0] + n[2] - 3, n[1] + n[3] / 2 - 3, 6, 6); }
      if (i === 4) { c.fillRect(n[0] - 3, n[1] + n[3] / 2 - 3, 6, 6); c.fillRect(n[0] + n[2] - 3, n[1] + n[3] / 2 - 3, 6, 6); }
      if (i === 5) {
        c.fillRect(n[0] - 3, n[1] + n[3] / 2 - 3, 6, 6);
        var s2 = ink >= 1 ? 'v1.0' : 'v0.1', ty = n[1] + n[3] / 2 + VS * .36;
        if (ink < .5) { c.font = font(900, VS); var tw2 = c.measureText(s2).width; c.fillStyle = GROUND; c.fillRect(n[0] + n[2] / 2 - tw2 / 2 - 3, n[1] + n[3] / 2 - VS * .6, tw2 + 6, VS * 1.2); }
        txt(c, s2, n[0] + n[2] / 2 + 1, ty, 900, VS, 'center', ink >= .5 ? GROUND : INK);
      }
    });
  }

  /* Option A: equal-length stages; checklist ticks at an even beat, TEAM STANDARD last, then rollout */
  var L = 2.0;                        // seconds per stage (IDEA, PROTOTYPE, VALIDATE, STANDARD), SCALE starts at 4L
  function makeProto(glyph) {
    var W, H, S4 = 4 * L, T = S4 + 4.6;
    var ITEMS = ['ROUGH IDEA', 'EDGE CASES', 'QA PASS', 'REPORTS WHAT IT DID', 'TEAM STANDARD'];
    function pathLen(P) { var d = 0; for (var i = 1; i < P.length; i++) d += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return d; }
    function drawUpTo(c, P, len) { // stroke polyline P up to arc length len; returns tip
      c.beginPath(); c.moveTo(P[0][0], P[0][1]); var d = 0, tip = P[0];
      for (var i = 1; i < P.length; i++) {
        var sl = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
        if (d + sl >= len) { var k = sl ? (len - d) / sl : 0; tip = [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * k, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k]; c.lineTo(tip[0], tip[1]); break; }
        d += sl; tip = P[i]; c.lineTo(tip[0], tip[1]);
      }
      c.stroke(); return tip;
    }
    return {
      rest: S4 + 3.2,
      resize: function (w, h) { W = w; H = h; },
      draw: function (c, w, h, t) {
        var u = t % T, st = Math.min(4, Math.floor(u / L));
        c.fillStyle = GROUND; c.fillRect(0, 0, W, H); c.lineJoin = 'miter';
        // compact layout for narrow canvases (side column under ~330 px): labels-free strip + stage name, checklist under the graph
        var compact = W < 330, NAMES = ['IDEA', 'PROTOTYPE', 'VALIDATE', 'STANDARD', 'SCALE'];
        strip(c, W, NAMES, st, 14, st < 4 ? (u - st * L) / (L - .1) : (u - S4) / 3.4, st < 4 ? [0, 0] : [(u - S4) / 1.1, (u - S4 - 1.1) / 2.0], compact);
        var mX = 20, mY, mH, cx, gapY, gw;
        if (compact) {
          txt(c, NAMES[st], 20, 56, 900, 13, 'left', INK); txt(c, (st + 1) + ' / 5', W - 20, 56, 700, 10, 'right', MUTED);
          mY = 72; mH = Math.min(80, H * .17); cx = 20; gapY = 15; gw = Math.min(W - 40, mH * 2.8);
        } else {
          mY = 52; mH = Math.min(110, H * .24);
          // checklist block is right-aligned: its longest line ends on the same right edge as the strip and lanes
          c.font = font(700, 10); var ckW = 18 + Math.max.apply(null, ITEMS.map(function (s2) { return c.measureText(s2).width; }));
          cx = Math.round(W - 20 - ckW); gapY = mH >= 90 ? 20 : 15; gw = Math.min(cx - 18 - mX, mH * 2.8);
        }
        VS = mH < 90 ? 9 : 12;
        glyph(c, mX, mY, mH, st, u, gw);
        // five ticks on an even beat; the last one (TEAM STANDARD) lands exactly as SCALE begins
        var beat = S4 / ITEMS.length, teamY = 0, ckY = compact ? mY + mH + 14 : mY + 4;
        for (var j = 0; j < ITEMS.length; j++) {
          var yy = ckY + j * gapY, on = u >= beat * (j + 1);
          c.lineWidth = 1; c.strokeStyle = INK; c.strokeRect(cx + .5, yy + .5, 11, 11);
          if (on) { c.fillStyle = INK; c.fillRect(cx + 2.5, yy + 2.5, 7, 7); }
          txt(c, ITEMS[j], cx + 18, yy + 10, 700, 10, 'left', on ? INK : MUTED);
          if (j === ITEMS.length - 1) teamY = yy + 6;
        }
        // lanes
        var top = compact ? teamY + 22 : mY + mH + (mH >= 90 ? 34 : 28), bot = H - (compact ? 54 : 40), lh = (bot - top) / 4, labX, lx, n, trunk;
        if (compact) { trunk = cx + 6; labX = cx + 16; c.font = font(700, 10); lx = labX + c.measureText('REAL-TIME').width + 10; n = 8; }
        else { labX = 20; lx = 20 + Math.min(78, W * .22); n = 12; trunk = lx - 10; }
        var tw = (W - 20 - lx) / n, scale = st === 4, ts = Math.min(tw - 3, lh * .6, 24), rowY = [];
        for (var l = 0; l < 4; l++) rowY.push(top + l * lh + lh * .2 + ts / 2);
        // feed line: out of the TEAM STANDARD checkbox into the trunk, then down past every lane
        var P;
        if (compact) P = [[trunk, teamY + 6], [trunk, rowY[3]]];
        else { // smooth curve down-left from the checkbox into the trunk
          var sx = cx - 6, Rr = Math.min(sx - trunk, rowY[0] - teamY - 6); P = [[sx, teamY]];
          if (sx - Rr > trunk) P.push([trunk + Rr, teamY]);
          for (var q2 = 1; q2 <= 16; q2++) { var a2 = q2 / 16 * Math.PI / 2; P.push([trunk + Rr - Rr * Math.sin(a2), teamY + Rr - Rr * Math.cos(a2)]); }
          P.push([trunk, rowY[3]]);
        }
        var total = pathLen(P), grow = scale ? clamp01((u - S4) / 1.1) : 0;
        var preV = pathLen(P.slice(0, P.length - 1));
        if (grow > 0) {
          c.strokeStyle = INK; c.lineWidth = 1.5; var tip = drawUpTo(c, P, total * grow);
          if (grow < 1) { c.fillStyle = INK; c.fillRect(tip[0] - 3, tip[1] - 3, 6, 6); }
        }
        var outs = 0;
        for (var l2 = 0; l2 < 4; l2++) {
          var reachD = preV + (rowY[l2] - P[P.length - 2][1]), reachT = S4 + 1.1 * reachD / total; // time the feed passes this row
          var ty = rowY[l2] - ts / 2, live = scale && u >= reachT;
          txt(c, LANES[l2], labX, rowY[l2] + 3.5, 700, 10, 'left', live ? INK : MUTED);
          if (live) { c.strokeStyle = INK; c.lineWidth = 1.5; partial(c, trunk, rowY[l2], (compact ? labX : lx) - 3, rowY[l2], (u - reachT) / .2, true); }
          for (var q = 0; q < n; q++) {
            var x = W - 20 - (n - q) * tw + (tw - ts), on2 = live && u >= reachT + .2 + q * .17 * 12 / n;
            if (on2) { outs++; c.fillStyle = INK; c.fillRect(x, ty, ts, ts); }
            else { c.setLineDash([2, 2]); c.strokeStyle = INK; c.lineWidth = 1; c.strokeRect(x + .5, ty + .5, ts - 1, ts - 1); c.setLineDash([]); }
          }
        }
        // footer: one line when there is room, two when narrow
        txt(c, 'ONE STANDARD, EVERY TEAM', 20, compact ? H - 30 : H - 14, 700, 10, 'left', MUTED);
        txt(c, 'OUTPUTS ' + (outs < 10 ? '0' : '') + outs, compact ? 20 : W - 20, H - 14, 900, 11, compact ? 'left' : 'right', INK);
      }
    };
  }

  var hero = makeProto(glyphNodes), W, H, t = 0, last = 0, running = true, seen = false;
  function size() {
    var d = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return false;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0); hero.resize(W, H); return true;
  }
  function draw(time) { if (W && H) hero.draw(ctx, W, H, time); }
  function frame(now) {
    if (last) t += Math.min(.1, (now - last) / 1000); last = now;
    draw(t);
    if (running && !reduce) requestAnimationFrame(frame); else last = 0;
  }
  size(); draw(reduce ? hero.rest : 0);
  addEventListener('resize', function () { size(); draw(reduce ? hero.rest : t); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(reduce ? hero.rest : t); });
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) {
    var vis = e[0].isIntersecting; if (vis) seen = true;
    if (!seen || reduce) return;                        // never pause on an unconfirmed report
    if (vis && !running) { running = true; requestAnimationFrame(frame); }
    running = vis;
  }).observe(cv);
  if (!reduce) requestAnimationFrame(frame);

  /* ---------- Reduced motion: finished frames by default, opt-in Play / Pause ----------
     Only shown when the OS asks for reduced motion. The choice lasts for this tab's session. */
  var btn = document.getElementById('motionToggle');
  function setMotion(on) {
    reduce = !on;
    if (btn) { btn.textContent = on ? 'Pause animations' : 'Play animations'; btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    try { sessionStorage.setItem('motion', on ? 'on' : 'off'); } catch (e) {}
    document.dispatchEvent(new CustomEvent('motionchange', { detail: { on: on } }));
    if (on) { t = 0; last = 0; running = true; requestAnimationFrame(frame); }
    else { running = false; draw(hero.rest); }
  }
  if (btn && reduceMQ.matches) {
    btn.hidden = false;
    btn.addEventListener('click', function () { setMotion(reduce); });
    var saved = null; try { saved = sessionStorage.getItem('motion'); } catch (e) {}
    if (saved === 'on') setMotion(true);
  }
})();
