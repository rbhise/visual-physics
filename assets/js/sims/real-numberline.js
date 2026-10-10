/*
 * Irrational and real numbers on the number line, four views:
 *   root   – construct √n on the number line: a right triangle on the line, then a compass arc from O
 *            swings the hypotenuse down onto the line. Two zoom bars show where √n lies between decimals.
 *   spiral – the spiral of square roots: each new triangle has a side of 1 at right angles to the last hypotenuse.
 *   abs    – absolute value as distance: |x − a| is the distance between x and a. Optionally solve |x − a| = d.
 *   order  – order properties: adding c keeps the order; multiplying by a negative c reverses it.
 * Needs sim-kit.js and math-kit.js.  RealLineSim.mount(el, { mode: "root", n: 2 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, f = M.frac;
  var LABELS = {
    root:   ["Number", "Right triangle", "Hypotenuse²", "Decimal form", "Lies between", "Type"],
    spiral: ["Triangles", "Longest hypotenuse", "Decimal form", "Each new side", "Whole numbers on the way", "Why it works"],
    abs:    ["x", "a", "x − a", "|x − a| (distance)", "Rule used", "Solutions of |x − a| = d"],
    order:  ["a and b", "c", "Results", "Order of a and b", "Order after", "Rule"]
  };

  function isSq(n) { var r = Math.round(Math.sqrt(n)); return r * r === n; }
  function twoSq(n) { for (var a = Math.floor(Math.sqrt(n)); a >= 1; a--) { var b2 = n - a * a; if (b2 >= 1 && isSq(b2) && Math.sqrt(b2) <= a) return [a, Math.round(Math.sqrt(b2))]; } return null; }
  function rootTxt(m) { return isSq(m) ? String(Math.round(Math.sqrt(m))) : "√" + m; }
  // construction steps: [{ b: base² , h: upright, r: result² }]
  function chain(n) {
    if (isSq(n)) return [];
    var t = twoSq(n);
    if (t) return [{ b: t[0] * t[0], h: t[1], r: n }];
    return chain(n - 1).concat([{ b: n - 1, h: 1, r: n }]);
  }
  function dec(x, d) { return x.toFixed(d); }
  function trunc(x, d) { var p = Math.pow(10, d); return Math.floor(x * p + 1e-9) / p; }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "rl";
    var s = Object.assign({ mode: "root", n: 2, ns: 6, x: 7, a: 5, d: 2, solve: false, op: "mul", oa: 2, ob: 5, oc: -2, t: 1 }, opts);
    var clock = null, P = null, drag = false;

    var k = K.frame(root, {
      aspect: "16 / 11",
      label: "A number line showing square roots constructed with right triangles, absolute value as distance, and order of real numbers",
      panel: K.chips("mode", "Show", [["root", "√n on the line"], ["spiral", "Spiral of roots"], ["abs", "Absolute value"], ["order", "Order"]]) +
        '<div data-for="root">' + K.slider(id, "n", "n", 2, 20, 1, "") + '</div>' +
        '<div data-for="spiral">' + K.slider(id, "ns", "Number of triangles", 1, 16, 1, "") + '</div>' +
        '<div data-for="abs">' + K.slider(id, "x", "x (or drag the point)", -10, 10, 0.5, "") + K.slider(id, "a", "a", -6, 6, 1, "") +
          '<div class="checks">' + K.check(id, "solve", "Solve |x − a| = d", s.solve) + '</div>' + K.slider(id, "d", "d", 0, 8, 1, "") + '</div>' +
        '<div data-for="order">' + K.chips("op", "Do this to both", [["add", "Add c"], ["mul", "Multiply by c"]]) +
          K.slider(id, "oa", "a", -6, 6, 1, "") + K.slider(id, "ob", "b", -6, 6, 1, "") + K.slider(id, "oc", "c", -4, 4, 1, "") + '</div>' +
        K.buttons([["play", "Construct"]]) + K.hint("note"),
      readouts: [["r1", "–", "c-path"], ["r2", "–", "wrap"], ["r3", "–", "wrap"], ["r4", "–", "c-vy"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span"), stage = k.el(".sim-stage");
    function fitAspect() {
      var a = root.clientWidth >= 560 ? "16 / 11" : s.mode === "root" || s.mode === "spiral" ? "1 / 1" : "4 / 3";
      if (stage.style.aspectRatio !== a) stage.style.aspectRatio = a;
    }
    window.addEventListener("resize", fitAspect);

    function update() {
      LABELS[s.mode].forEach(function (t, i) { spans[i].textContent = t; });
      fitAspect();
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for === s.mode ? "" : "none"; });
      k.btn("play").style.display = s.mode === "root" || s.mode === "spiral" ? "" : "none";
      k.btn("play").textContent = s.mode === "root" ? "Construct √" + s.n : "Grow the spiral";
      var note = "";
      if (s.mode === "root") {
        var v = Math.sqrt(s.n), C = chain(s.n), last = C[C.length - 1], sq = isSq(s.n);
        k.set("r1", "√" + s.n);
        if (sq) { k.set("r2", "none needed"); k.set("r3", "–"); }
        else { k.set("r2", "legs " + rootTxt(last.b) + " and " + last.h); k.set("r3", (isSq(last.b) ? rootTxt(last.b) : "(" + rootTxt(last.b) + ")") + "² + " + last.h + "² = " + last.b + " + " + last.h * last.h + " = " + s.n); }
        k.set("r4", sq ? String(Math.round(v)) : dec(v, 8) + "…");
        var lo1 = trunc(v, 1), lo2 = trunc(v, 2);
        k.set("r5", sq ? "it is the whole number " + Math.round(v) : dec(lo2, 2) + " and " + dec(lo2 + 0.01, 2));
        k.set("r6", sq ? "Rational: √" + s.n + " = " + Math.round(v) : "Irrational: non-terminating, non-recurring");
        note = sq ? s.n + " is a perfect square, so √" + s.n + " = " + Math.round(v) + " is a whole number and needs no construction." :
          "Draw a right triangle with legs " + rootTxt(last.b) + " and " + last.h + " on the line. Its hypotenuse is √" + s.n + ". With O as centre, the compass arc carries this length onto the line." +
          (C.length > 1 ? " (√" + last.b + " was built first the same way.)" : "");
      } else if (s.mode === "spiral") {
        var n = s.ns + 1, wh = [];
        for (var i = 2; i <= n; i++) if (isSq(i)) wh.push("√" + i + " = " + Math.round(Math.sqrt(i)));
        k.set("r1", String(s.ns)); k.set("r2", rootTxt(n)); k.set("r4", "1 unit, at a right angle");
        k.set("r3", isSq(n) ? String(Math.sqrt(n)) : dec(Math.sqrt(n), 6) + "…");
        k.set("r5", wh.length ? wh.join(", ") : "none yet");
        k.set("r6", "(√k)² + 1² = k + 1, so the next hypotenuse is √(k + 1)");
        note = "Start with a right triangle with legs 1 and 1: its hypotenuse is √2. On each hypotenuse stand a new side of length 1 at a right angle. The hypotenuses are √2, √3, √4 = 2, √5, …";
      } else if (s.mode === "abs") {
        var dd = s.x - s.a, ab = Math.abs(dd), nm = s.a === 0 ? "|x|" : "|x − " + (s.a < 0 ? "(" + f(s.a) + ")" : f(s.a)) + "|";
        k.set("r1", f(s.x)); k.set("r2", f(s.a)); k.set("r3", f(dd)); k.set("r4", f(ab));
        k.set("r5", dd > 0 ? "x − a > 0, so |x − a| = x − a" : dd === 0 ? "x − a = 0, so |x − a| = 0" : "x − a < 0, so |x − a| = −(x − a) = " + f(-dd));
        k.set("r6", s.solve ? (s.d === 0 ? "x = " + f(s.a) : "x = " + f(s.a - s.d) + " or x = " + f(s.a + s.d)) : "tick “Solve”");
        note = (s.a === 0 ? "|x| is the distance of x from 0. " : nm + " is the distance between x and " + f(s.a) + ". ") +
          (s.solve ? "Points at distance " + f(s.d) + " from " + f(s.a) + ": one on each side." + (Math.abs(ab - s.d) < 1e-9 ? " x is one of them ✓" : "") : "A distance is never negative.");
      } else {
        var c = s.oc, A2 = s.op === "add" ? s.oa + c : s.oa * c, B2 = s.op === "add" ? s.ob + c : s.ob * c;
        var rel = function (p, q) { return p < q ? "<" : p > q ? ">" : "="; };
        var r1 = rel(s.oa, s.ob), r2 = rel(A2, B2), nameA = s.op === "add" ? "a + c" : "ac", nameB = s.op === "add" ? "b + c" : "bc";
        k.set("r1", "a = " + f(s.oa) + ", b = " + f(s.ob)); k.set("r2", f(c));
        k.set("r3", nameA + " = " + f(A2) + ", " + nameB + " = " + f(B2));
        k.set("r4", "a " + r1 + " b"); k.set("r5", nameA + " " + r2 + " " + nameB);
        var rule = s.op === "add" ? "a < b ⇒ a + c < b + c" : c > 0 ? "a < b and c > 0 ⇒ ac < bc" : c < 0 ? "a < b and c < 0 ⇒ ac > bc" : "c = 0 makes both 0";
        k.set("r6", rule);
        note = r1 === "=" ? "a = b: whatever you do to both, they stay equal." : s.op === "add" ? "Adding the same number moves both points the same distance, so the order stays the same." :
          c > 0 ? "Multiplying by a positive number stretches the line: the order stays the same." : c < 0 ? "Multiplying by a negative number flips the line about 0, so the order is reversed." : "Multiplying by 0 sends every number to 0.";
      }
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    // ---------- drawing helpers ----------
    function axis(ctx, c, x0, x1, y, X, lo, hi, step, labelEvery) {
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      K.arrow(ctx, x1 - 12, y, x1 + 2, y, c.ink, 2, 9); K.arrow(ctx, x0 + 12, y, x0 - 2, y, c.ink, 2, 9);
      ctx.font = "12px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.lineWidth = 1.5;
      for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
        var px = X(v); if (px < x0 + 6 || px > x1 - 6) continue;
        ctx.strokeStyle = c.ink; ctx.beginPath(); ctx.moveTo(px, y - 5); ctx.lineTo(px, y + 5); ctx.stroke();
        if (Math.round(v / step) % (labelEvery || 1) === 0) ctx.fillText(f(v), px, y + 8);
      }
    }
    function label(ctx, txt, x, y, col, font, align, base) {
      ctx.font = font; ctx.fillStyle = col; ctx.textAlign = align || "center"; ctx.textBaseline = base || "middle"; ctx.fillText(txt, x, y);
    }

    function drawRoot(ctx, W, H, c) {
      var v = Math.sqrt(s.n), C = chain(s.n), narrow = W < 520;
      var top = 16, lineY = Math.round(H * (narrow ? 0.52 : 0.56)), hi = Math.max(3.2, Math.ceil(v) + 0.6), lo = -0.6;
      var maxH = C.reduce(function (m, q) { return Math.max(m, q.h); }, 1);
      var u = Math.min((W - 30) / (hi - lo), (lineY - top - 24) / Math.max(maxH, 1.2));
      var X = function (x) { return 15 + (x - lo) * u; }, Y = function (y) { return lineY - y * u; };
      axis(ctx, c, 6, W - 6, lineY, X, lo, hi, 1);
      label(ctx, "O", X(0) - 10, lineY - 12, c.ink, "700 13px " + c.font);
      C.forEach(function (q, i) {
        var last = i === C.length - 1, t = last ? s.t : 1, b = Math.sqrt(q.b), r = Math.sqrt(q.r);
        ctx.globalAlpha = last ? 1 : 0.3;
        // triangle
        var tri = Math.min(1, t * 2.5);
        ctx.strokeStyle = c.vx; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(b), Y(0)); ctx.stroke();
        ctx.strokeStyle = c.vy; ctx.beginPath(); ctx.moveTo(X(b), Y(0)); ctx.lineTo(X(b), Y(q.h * tri)); ctx.stroke();
        if (tri >= 1) {
          ctx.strokeStyle = c.path; ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(b), Y(q.h)); ctx.stroke();
          var sa = 0.16 * u; ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.strokeRect(X(b) - sa, Y(0) - sa, sa, sa);
        }
        // compass arc
        var a0 = Math.atan2(q.h, b), sweep = Math.max(0, Math.min(1, (t - 0.4) / 0.6));
        if (sweep > 0) {
          ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = c.path; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(X(0), Y(0), r * u, -a0, -a0 + a0 * sweep); ctx.stroke(); ctx.restore();
          var ang = a0 * (1 - sweep); M.dot(ctx, X(r * Math.cos(ang)), Y(r * Math.sin(ang)), 4, c.path);
        }
        if (last && tri >= 1) {
          label(ctx, rootTxt(q.b), (X(0) + X(b)) / 2, Y(0) - 12, c.vx, "700 13px " + c.font);
          label(ctx, String(q.h), X(b) + 12, Y(q.h / 2), c.vy, "700 13px " + c.font, "left");
          var hx = (X(0) + X(b)) / 2, hy = (Y(0) + Y(q.h)) / 2, nx = -Math.sin(a0), ny = -Math.cos(a0);
          label(ctx, "√" + q.r, hx + nx * 16, hy + ny * 16, c.path, "700 14px " + c.font);
        }
        if (sweep >= 1 || !last) {
          ctx.globalAlpha = last ? 1 : 0.5;
          M.dot(ctx, X(r), Y(0), last ? 7 : 5, c.path, c.surface);
          if (last || !isSq(q.r)) label(ctx, "√" + q.r, X(r), lineY + (last ? 30 : 30), c.path, "700 " + (last ? 15 : 12) + "px " + c.font, "center", "top");
        }
        ctx.globalAlpha = 1;
      });
      if (!C.length) { M.dot(ctx, X(v), Y(0), 7, c.good, c.surface); label(ctx, "√" + s.n + " = " + Math.round(v), X(v), lineY + 30, c.good, "700 15px " + c.font, "center", "top"); }

      // zoom bars
      if (s.t >= 1) {
        var bx0 = 30, bx1 = W - 30, by = lineY + (narrow ? 70 : 82), gap = narrow ? 52 : 58;
        var a1 = Math.floor(v), a2 = trunc(v, 1);
        [[a1, a1 + 1, 0.1, 1], [a2, a2 + 0.1, 0.01, 2]].forEach(function (z, j) {
          var y = by + j * gap, Z = function (x) { return bx0 + (x - z[0]) / (z[1] - z[0]) * (bx1 - bx0); };
          if (y > H - 20) return;
          ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx0, y); ctx.lineTo(bx1, y); ctx.stroke();
          for (var i = 0; i <= 10; i++) {
            var tv = z[0] + i * z[2], px = Z(tv), big = i === 0 || i === 10;
            ctx.beginPath(); ctx.moveTo(px, y - (big ? 7 : 4)); ctx.lineTo(px, y + (big ? 7 : 4)); ctx.stroke();
            if (big || !narrow || i % 2 === 0) label(ctx, tv.toFixed(z[3]), px, y + 9, c.muted, (big ? "700 " : "") + (narrow ? 9 : 11) + "px " + c.font, "center", "top");
          }
          var pv = Z(v); ctx.fillStyle = c.tint; var cell = Z(z[0] + Math.floor((v - z[0]) / z[2] + 1e-9) * z[2]);
          ctx.globalAlpha = 0.9; ctx.fillRect(cell, y - 8, (bx1 - bx0) / 10, 16); ctx.globalAlpha = 1;
          ctx.strokeStyle = c.ink; ctx.beginPath(); ctx.moveTo(bx0, y); ctx.lineTo(bx1, y); ctx.stroke();
          M.dot(ctx, pv, y, 5, c.path);
          label(ctx, j === 0 ? "zoom × 10" : "zoom × 100", bx0, y - 12, c.muted, "600 11px " + c.font, "left", "bottom");
          if (j === 1 && !C.length) return;
        });
        // guide lines from the main line into the first zoom bar
        ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(X(a1), lineY + 6); ctx.lineTo(bx0, by - 8); ctx.moveTo(X(a1 + 1), lineY + 6); ctx.lineTo(bx1, by - 8); ctx.stroke(); ctx.restore();
      }
    }

    function drawSpiral(ctx, W, H, c) {
      var n = s.ns + 1, R = Math.sqrt(n), narrow = W < 520;
      var u = Math.min(W, H) / 2 / (Math.max(R, 2.2) + 0.5), cx = W / 2, cy = H / 2;
      var pts = [[1, 0]], ang = 0;
      for (var kk = 1; kk < n; kk++) {   // from P_k (distance √k) step 1 at right angles
        var p = pts[kk - 1], r = Math.sqrt(kk), ux = -p[1] / r, uy = p[0] / r;
        pts.push([p[0] + ux, p[1] + uy]);
      }
      var S = function (p) { return [cx + p[0] * u, cy - p[1] * u]; }, O = [cx, cy];
      // triangles, the newest one tinted
      for (kk = 1; kk < n; kk++) {
        var A = S(pts[kk - 1]), B = S(pts[kk]), newest = kk === n - 1;
        ctx.fillStyle = newest ? c.tint : c.bg; ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = c.vy; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
      }
      ctx.strokeStyle = c.vx; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(O[0], O[1]); var P1 = S(pts[0]); ctx.lineTo(P1[0], P1[1]); ctx.stroke();
      for (kk = 2; kk <= n; kk++) {
        var Q = S(pts[kk - 1]), sq = isSq(kk);
        ctx.strokeStyle = sq ? c.good : c.path; ctx.lineWidth = kk === n ? 3 : 1.6; ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(Q[0], Q[1]); ctx.stroke();
        var th = Math.atan2(pts[kk - 1][1], pts[kk - 1][0]), lr = Math.sqrt(kk) * u * 0.72;
        if (kk <= 9 || kk === n || sq || !narrow) label(ctx, rootTxt(kk), cx + Math.cos(th) * lr, cy - Math.sin(th) * lr, sq ? c.good : c.path, "700 " + (kk === n ? 14 : narrow ? 10 : 12) + "px " + c.font);
      }
      // labels of the unit sides (only the first)
      var m1 = S([0.5, 0]); label(ctx, "1", m1[0], m1[1] + 12, c.vx, "700 12px " + c.font);
      var e = S([(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2]); label(ctx, "1", e[0] + 10, e[1], c.vy, "700 12px " + c.font, "left");
      M.dot(ctx, O[0], O[1], 4, c.ink); label(ctx, "O", O[0] - 8, O[1] + 10, c.ink, "700 12px " + c.font);
    }

    function drawAbs(ctx, W, H, c) {
      var lo = -10.5, hi = 10.5, x0 = 14, x1 = W - 14, y = Math.round(H * 0.62), narrow = W < 520;
      var X = function (v) { return x0 + 8 + (v - lo) / (hi - lo) * (x1 - x0 - 16); };
      P = { X: X, ix: function (px) { return lo + (px - x0 - 8) / (x1 - x0 - 16) * (hi - lo); } };
      axis(ctx, c, x0, x1, y, X, lo, hi, 1, narrow ? 2 : 1);
      if (s.solve) {
        [s.a - s.d, s.a + s.d].forEach(function (v) {
          if (v < lo || v > hi) return;
          ctx.strokeStyle = c.good; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(X(v), y, 10, 0, 2 * Math.PI); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(X(v), y + 12); ctx.lineTo(X(v), y + 30); ctx.stroke();
        });
        ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = c.good; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(X(s.a - s.d), y + 30); ctx.lineTo(X(s.a + s.d), y + 30); ctx.stroke(); ctx.restore();
        var sol = s.d === 0 ? "x = " + f(s.a) : "x = " + f(s.a - s.d) + " or x = " + f(s.a + s.d);
        label(ctx, sol + "  (" + f(s.d) + " each way from " + f(s.a) + ")", Math.max(150, Math.min(W - 150, X(s.a))), y + 38, c.good, "700 " + (narrow ? 12 : 13) + "px " + c.font, "center", "top");
      }
      // distance bracket
      var ax = X(s.a), xx = X(s.x), top = y - Math.min(130, Math.max(60, Math.abs(xx - ax) * 0.4)) - 14;
      if (Math.abs(s.x - s.a) > 1e-9) {
        ctx.fillStyle = c.path; ctx.globalAlpha = 0.12; ctx.fillRect(Math.min(ax, xx), top, Math.abs(xx - ax), y - top); ctx.globalAlpha = 1;
        ctx.strokeStyle = c.path; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ax, y - 10); ctx.lineTo(ax, top); ctx.lineTo(xx, top); ctx.lineTo(xx, y - 10); ctx.stroke();
      }
      var nm = s.a === 0 ? "|x|" : "|x − a|";
      label(ctx, nm + " = " + f(Math.abs(s.x - s.a)), Math.max(70, Math.min(W - 70, (ax + xx) / 2)), top - 6, c.path, "700 " + (narrow ? 13 : 16) + "px " + c.font, "center", "bottom");
      // a marker (triangle) and x point, labels above the line on the outer sides
      var xLeft = s.x < s.a;
      ctx.fillStyle = c.vx; ctx.beginPath(); ctx.moveTo(ax, y + 2); ctx.lineTo(ax - 7, y - 12); ctx.lineTo(ax + 7, y - 12); ctx.closePath(); ctx.fill();
      label(ctx, s.a === 0 ? "0" : "a = " + f(s.a), ax + (xLeft ? 10 : -10), y - 18, c.vx, "700 13px " + c.font, xLeft ? "left" : "right", "bottom");
      M.dot(ctx, xx, y, 9, c.vy, c.surface);
      label(ctx, "x = " + f(s.x), xx + (xLeft ? -10 : 10), y - 18, c.vy, "700 13px " + c.font, xLeft ? "right" : "left", "bottom");
    }

    function drawOrder(ctx, W, H, c) {
      var cc = s.oc, A2 = s.op === "add" ? s.oa + cc : s.oa * cc, B2 = s.op === "add" ? s.ob + cc : s.ob * cc, narrow = W < 520;
      var m = Math.max(6, Math.abs(A2), Math.abs(B2)) + 1, x0 = 14, x1 = W - 14;
      var X = function (v) { return x0 + 8 + (v + m) / (2 * m) * (x1 - x0 - 16); };
      var y1 = Math.round(H * 0.3), y2 = Math.round(H * 0.72), step = m > 14 ? 4 : m > 8 ? 2 : 1;
      axis(ctx, c, x0, x1, y1, X, -m, m, step, narrow && step === 1 ? 2 : 1);
      axis(ctx, c, x0, x1, y2, X, -m, m, step, narrow && step === 1 ? 2 : 1);
      label(ctx, "before", x0, y1 - 46, c.muted, "600 12px " + c.font, "left");
      label(ctx, s.op === "add" ? "after adding c = " + f(cc) : "after multiplying by c = " + f(cc), x0, y2 - 46, c.muted, "600 12px " + c.font, "left");
      // connectors
      ctx.save(); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
      ctx.strokeStyle = c.vx; ctx.beginPath(); ctx.moveTo(X(s.oa), y1 + 8); ctx.lineTo(X(A2), y2 - 8); ctx.stroke();
      ctx.strokeStyle = c.vy; ctx.beginPath(); ctx.moveTo(X(s.ob), y1 + 8); ctx.lineTo(X(B2), y2 - 8); ctx.stroke(); ctx.restore();
      function pt(v, y, col, txt, up) { M.dot(ctx, X(v), y, 7, col, c.surface); label(ctx, txt, X(v), up ? y - 12 : y + 26, col, "700 13px " + c.font, "center", up ? "bottom" : "top"); }
      var close1 = Math.abs(X(s.oa) - X(s.ob)) < 40, close2 = Math.abs(X(A2) - X(B2)) < 60;
      pt(s.oa, y1, c.vx, "a", true); pt(s.ob, y1, c.vy, "b", !close1);
      pt(A2, y2, c.vx, s.op === "add" ? "a + c" : "ac", true); pt(B2, y2, c.vy, s.op === "add" ? "b + c" : "bc", !close2);
      var rel = function (p, q) { return p < q ? "<" : p > q ? ">" : "="; }, flip = rel(s.oa, s.ob) !== rel(A2, B2);
      label(ctx, (s.op === "add" ? "a + c " : "ac ") + rel(A2, B2) + (s.op === "add" ? " b + c" : " bc") + (flip ? "  (order reversed)" : ""), narrow ? W / 2 : W - 14, narrow ? y2 + 48 : y2 - 46, flip ? c.bad : c.good, "700 13px " + c.font, narrow ? "center" : "right");
      label(ctx, "a " + rel(s.oa, s.ob) + " b", W - 14, y1 - 46, c.ink, "700 13px " + c.font, "right");
    }

    k.draw = function (ctx, W, H, c) {
      if (s.mode === "root") drawRoot(ctx, W, H, c); else if (s.mode === "spiral") drawSpiral(ctx, W, H, c);
      else if (s.mode === "abs") drawAbs(ctx, W, H, c); else drawOrder(ctx, W, H, c);
    };

    // drag x in the absolute value view
    function toX(e) { var r = k.canvas.getBoundingClientRect(); s.x = Math.max(-10, Math.min(10, Math.round(P.ix(e.clientX - r.left) * 2) / 2)); shows.x(); update(); }
    k.canvas.addEventListener("pointerdown", function (e) { if (s.mode !== "abs" || !P) return; drag = true; k.canvas.setPointerCapture(e.pointerId); toX(e); });
    k.canvas.addEventListener("pointermove", function (e) { if (drag) toX(e); });
    k.canvas.addEventListener("pointerup", function () { drag = false; });

    var shows = {};
    ["n", "ns", "x", "a", "d", "oa", "ob", "oc"].forEach(function (q) {
      shows[q] = k.bindSlider(q, function () { return s[q]; }, function (v) { stop(); s[q] = v; s.t = 1; update(); }, function (v) { return f(v); });
    });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { stop(); s.mode = v; s.t = 1; update(); });
    var showO = k.bindChips("op", function () { return s.op; }, function (v) { s.op = v; update(); });
    var solveBox = k.bindCheck("solve", function (on) { s.solve = on; update(); });

    function stop() { if (clock) clock.stop(); }
    function play() {
      stop();
      if (s.mode !== "root" && s.mode !== "spiral") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { s.t = 1; update(); return; }
      if (s.mode === "spiral") {
        var target = s.ns, tt = 0; s.ns = 1; shows.ns(); update();
        clock = K.clock(function (dt) { tt += dt; var nn = Math.min(target, 1 + Math.floor(tt / 0.45)); if (nn !== s.ns) { s.ns = nn; shows.ns(); update(); } return nn < target; });
      } else {
        s.t = 0; update();
        clock = K.clock(function (dt) { s.t = Math.min(1, s.t + dt / 2.4); if (s.t >= 1) update(); else k.redraw(); return s.t < 1; });
      }
      clock.start();
    }
    k.onAct({ play: play });
    update();
    return {
      set: function (o) { stop(); Object.assign(s, o); if (!("t" in o)) s.t = 1; Object.keys(shows).forEach(function (q) { shows[q](); }); showM(); showO(); solveBox.checked = s.solve; update(); },
      play: play,
      seek: function (t) { stop(); s.t = t; update(); },
      state: function () { return s; }
    };
  }
  window.RealLineSim = { mount: mount };
})();
