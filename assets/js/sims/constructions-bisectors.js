/*
 * Perpendicular bisector and angle bisector: the theorems and the compass constructions.
 *   perp  – segment AB; drag P. On the perpendicular bisector PA = PB; off it, PA ≠ PB (converse).
 *   angle – ∠ABC; drag P. On the angle bisector P is the same distance from both arms (converse too).
 * "Play construction" draws the compass arcs step by step.
 * Needs sim-kit.js and math-kit.js.  ConstrBisectSim.mount(el, { mode: "perp", len: 7 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, R = Math.PI / 180;
  var STEPS = {
    perp: [
      "Draw segment AB.",
      "Centre A, radius more than half of AB: draw an arc above and an arc below AB.",
      "Centre B, the same radius: draw arcs that cut the first two at X and Y.",
      "Draw line XY. It meets AB at M. Line XY is the perpendicular bisector of AB."
    ],
    angle: [
      "Draw ∠ABC.",
      "Centre B, any radius: draw an arc that cuts ray BA at D and ray BC at E.",
      "Centres D and E, the same radius (more than half of DE): draw arcs that meet at F.",
      "Draw ray BF. It is the bisector of ∠ABC."
    ]
  };
  var LABELS = {
    perp: ["PA", "PB", "PA = PB?", "AM", "MB", "Construction"],
    angle: ["Distance of P from BA", "Distance of P from BC", "Equal?", "∠ABF", "∠FBC", "Construction"]
  };
  function cm(x) { return (+x.toFixed(2)) + " cm"; }
  function deg(x) { return (+x.toFixed(1)) + "°"; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "cb";
    var s = Object.assign({ mode: "perp", len: 7, ang: 70, P: null, pr: null, snap: true, prog: 3 }, opts);
    var target = s.prog, clock = null;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var k = K.frame(root, {
      label: "A segment or an angle with its bisector and a point P you can drag",
      panel: K.chips("mode", "Show", [["perp", "Perpendicular bisector"], ["angle", "Angle bisector"]]) +
        '<div data-for="perp">' + K.slider(id, "len", "Length of AB", 3, 10, 0.5, "cm") + '</div>' +
        '<div data-for="angle">' + K.slider(id, "ang", "∠ABC", 30, 160, 2, "°") + '</div>' +
        '<div class="checks">' + K.check(id, "snap", "Keep P on the bisector", s.snap) + '</div>' +
        K.buttons([["play", "Play construction"], ["step", "Next step"], ["reset", "Clear"]]) +
        K.hint("note"),
      readouts: [["r1", "–", "c-path"], ["r2", "–", "c-vy"], ["r3", "–", "wrap"], ["r4", "–"], ["r5", "–"], ["r6", "–"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");
    var list = document.createElement("ol"); list.className = "steps-list"; list.setAttribute("aria-live", "polite");
    root.querySelector(".sim-body").appendChild(list);

    // ---- geometry (cm, y up) ----
    function geo() {
      if (s.mode === "perp") {
        var h = s.len / 2, rr = s.len * 0.7, yx = Math.sqrt(rr * rr - h * h);
        return { A: [-h, 0], B: [h, 0], M: [0, 0], X: [0, yx], Y: [0, -yx], rr: rr };
      }
      var t = s.ang * R, arm = 7, rad = 2.6;
      var D = [rad * Math.cos(t), rad * Math.sin(t)], E = [rad, 0], de = M.dist(D, E), rr = Math.max(de * 0.75, 1.6);
      var mid = [(D[0] + E[0]) / 2, (D[1] + E[1]) / 2], hh = Math.sqrt(rr * rr - de * de / 4), bis = [Math.cos(t / 2), Math.sin(t / 2)];
      var F = [mid[0] + bis[0] * hh, mid[1] + bis[1] * hh];
      return { B: [0, 0], A: [arm * Math.cos(t), arm * Math.sin(t)], C: [arm, 0], D: D, E: E, F: F, rad: rad, rr: rr, t: t };
    }
    function defaultP() { return s.mode === "perp" ? [0, 2.5] : [5 * Math.cos(s.ang * R / 2), 5 * Math.sin(s.ang * R / 2)]; }
    function fixP() {
      if (!s.P) s.P = defaultP();
      if (s.mode === "perp") {
        s.P = [clamp(s.P[0], -5.5, 5.5), clamp(s.P[1], -4, 4)];
        if (s.snap) s.P[0] = 0;
      } else {
        var t = s.ang * R, r = clamp(Math.hypot(s.P[0], s.P[1]), 0.8, 6.5), phi = Math.atan2(s.P[1], s.P[0]);
        phi = clamp(phi, 0.06, t - 0.06);
        if (s.snap) phi = t / 2;
        s.P = [r * Math.cos(phi), r * Math.sin(phi)];
      }
    }
    function dists() {
      var P = s.P, g = geo();
      if (s.mode === "perp") return { a: M.dist(P, g.A), b: M.dist(P, g.B) };
      var t = g.t;
      return { a: Math.abs(P[0] * Math.sin(t) - P[1] * Math.cos(t)), b: Math.abs(P[1]),
               fa: [Math.cos(t) * (P[0] * Math.cos(t) + P[1] * Math.sin(t)), Math.sin(t) * (P[0] * Math.cos(t) + P[1] * Math.sin(t))], fb: [P[0], 0] };
    }

    function update() {
      fixP();
      LABELS[s.mode].forEach(function (t, i) { spans[i].textContent = t; });
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for === s.mode ? "" : "none"; });
      var d = dists(), A2 = +d.a.toFixed(2), B2 = +d.b.toFixed(2), eq = A2 === B2, n = Math.floor(s.prog + 1e-9), cur = Math.min(3, Math.ceil(s.prog - 1e-9));
      k.set("r1", cm(d.a)); k.set("r2", cm(d.b)); k.set("r3", eq ? "Yes, equal" : "No");
      if (n < 3) { k.set("r4", "–"); k.set("r5", "–"); }
      else if (s.mode === "perp") { k.set("r4", cm(s.len / 2)); k.set("r5", cm(s.len / 2)); }
      else { k.set("r4", deg(s.ang / 2)); k.set("r5", deg(s.ang / 2)); }
      k.set("r6", n >= 3 ? "Complete" : "Step " + (cur + 1) + " of 4");
      var note;
      if (s.mode === "perp") {
        note = eq ? "P is on the perpendicular bisector of AB, so PA = PB = " + cm(d.a) + ". Drag P up or down: PA and PB change, but they stay equal."
                  : "P is not on the perpendicular bisector, and PA ≠ PB. Converse: only points with PA = PB lie on the bisector.";
      } else {
        note = eq ? "P is on the bisector of ∠ABC, so it is " + cm(d.a) + " from both arms. The distance of a point from a line is the length of the perpendicular to it."
                  : "P is not on the bisector, so its distances from the two arms are different. Converse: only points equally far from both arms lie on the bisector.";
      }
      k.el('[data-r="note"]').textContent = note;
      list.innerHTML = STEPS[s.mode].map(function (t, i) {
        var st = i <= cur ? (i === cur && n < 3 ? "font-weight:700" : "") : "opacity:.45";
        return '<li style="' + st + '"' + (i === 3 && n >= 3 ? ' class="final"' : "") + '>' + t + "</li>";
      }).join("");
      k.redraw();
    }

    // ---- drawing ----
    var view = null;
    k.draw = function (ctx, W, H, c) {
      var g = geo(), pts = s.mode === "perp" ? [[-6, -4.4], [6, 4.4]] : [[0, 0], g.A, g.C, [Math.min(0, g.A[0]) - 0.6, 0], [7.4, Math.max(g.A[1], 3)]];
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
      if (s.mode === "angle") { miny -= 0.9; maxy += 0.5; minx -= 0.6; maxx += 0.3; }
      var sc = Math.min((W - 40) / (maxx - minx), (H - 36) / (maxy - miny));
      var ox = (W - (maxx - minx) * sc) / 2 - minx * sc, oy = (H + (maxy - miny) * sc) / 2 + miny * sc;
      var S = function (p) { return [ox + p[0] * sc, oy - p[1] * sc]; };
      view = { S: S, inv: function (x, y) { return [(x - ox) / sc, (oy - y) / sc]; } };
      var f = function (i) { return clamp(s.prog - (i - 1), 0, 1); };   // progress of construction step i (1..3); prog = 3 when complete
      function seg(P, Q, col, w, dash, frac) {
        var a = S(P), b = S(Q), u = frac == null ? 1 : frac; if (u <= 0) return;
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u); ctx.stroke(); ctx.restore();
      }
      function arcAt(Cn, r, a0, a1, frac) {   // world angles (radians, y up)
        if (frac <= 0) return;
        var p = S(Cn), e = a0 + (a1 - a0) * frac;
        ctx.save(); ctx.strokeStyle = c.vx; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(p[0], p[1], r * sc, -a0, -e, a1 > a0); ctx.stroke(); ctx.restore();
      }
      function label(P, t, col, dx, dy, font) { var p = S(P); ctx.fillStyle = col; ctx.font = (font || "700 15px ") + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, p[0] + dx, p[1] + dy); }
      function compass(Cn, r, ang) { // little compass leg while an arc is being drawn
        var p = S(Cn), q = S([Cn[0] + r * Math.cos(ang), Cn[1] + r * Math.sin(ang)]);
        ctx.save(); ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.restore();
        M.dot(ctx, q[0], q[1], 3, c.vx);
      }
      var P = s.P, d = dists(), eq = +d.a.toFixed(2) === +d.b.toFixed(2), pc = eq ? c.good : c.vy;

      if (s.mode === "perp") {
        var A = g.A, B = g.B, a1 = Math.atan2(g.X[1], g.X[0] - A[0]), b1 = Math.atan2(g.X[1], g.X[0] - B[0]), w = 0.32;
        // step 1: arcs from A (above then below)
        var p1 = f(1), p2 = f(2);
        arcAt(A, g.rr, a1 - w, a1 + w, clamp(p1 * 2, 0, 1)); arcAt(A, g.rr, -a1 - w, -a1 + w, clamp(p1 * 2 - 1, 0, 1));
        if (p1 > 0 && p1 < 1) compass(A, g.rr, p1 < 0.5 ? a1 - w + 2 * w * p1 * 2 : -a1 - w + 2 * w * (p1 * 2 - 1));
        arcAt(B, g.rr, b1 + w, b1 - w, clamp(p2 * 2, 0, 1)); arcAt(B, g.rr, -b1 + w, -b1 - w, clamp(p2 * 2 - 1, 0, 1));
        if (p2 > 0 && p2 < 1) compass(B, g.rr, p2 < 0.5 ? b1 + w - 2 * w * p2 * 2 : -b1 + w - 2 * w * (p2 * 2 - 1));
        if (p2 >= 1) { M.dot(ctx, S(g.X)[0], S(g.X)[1], 4, c.vx); M.dot(ctx, S(g.Y)[0], S(g.Y)[1], 4, c.vx); label(g.X, "X", c.vx, 14, -6); label(g.Y, "Y", c.vx, 14, 6); }
        // step 3: the bisector line
        var p3 = f(3), top = [0, 4.3], bot = [0, -4.3];
        if (p3 > 0) { seg([0, bot[1]], [0, top[1]], c.path, 2.5, [], p3); }
        // AB
        seg(A, B, c.ink, 3);
        M.dot(ctx, S(A)[0], S(A)[1], 5, c.ink); M.dot(ctx, S(B)[0], S(B)[1], 5, c.ink);
        label(A, "A", c.ink, -14, 12); label(B, "B", c.ink, 14, 12);
        if (p3 >= 1) {
          var m = S(g.M), q = 9; ctx.save(); ctx.strokeStyle = c.path; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(m[0] + q, m[1]); ctx.lineTo(m[0] + q, m[1] - q); ctx.lineTo(m[0], m[1] - q); ctx.stroke(); ctx.restore();
          label(g.M, "M", c.path, -13, 13);
          // equal-part ticks on AM and MB
          [[A, g.M], [g.M, B]].forEach(function (pq) { var mm = S([(pq[0][0] + pq[1][0]) / 2, 0]); ctx.strokeStyle = c.path; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mm[0], mm[1] - 7); ctx.lineTo(mm[0], mm[1] + 7); ctx.stroke(); });
        }
        // P and its distances
        seg(P, A, c.path, 2, [6, 5]); seg(P, B, c.vy, 2, [6, 5]);
        var pp = S(P);
        var ma = S([(P[0] + A[0]) / 2, (P[1] + A[1]) / 2]), mb = S([(P[0] + B[0]) / 2, (P[1] + B[1]) / 2]);
        ctx.font = "700 13px " + c.font; ctx.textBaseline = "middle";
        ctx.fillStyle = c.path; ctx.textAlign = "right"; ctx.fillText(cm(d.a), ma[0] - 8, ma[1] - (P[1] >= 0 ? 10 : -10));
        ctx.fillStyle = c.vy; ctx.textAlign = "left"; ctx.fillText(cm(d.b), mb[0] + 8, mb[1] - (P[1] >= 0 ? 10 : -10));
        M.dot(ctx, pp[0], pp[1], 8, pc, c.surface);
        label(P, "P", pc, -16, P[1] >= 0 ? -14 : 14);
      } else {
        var Bv = g.B, Av = g.A, Cv = g.C, t = g.t;
        // arms
        seg(Bv, Av, c.ink, 3); seg(Bv, Cv, c.ink, 3);
        M.dot(ctx, S(Bv)[0], S(Bv)[1], 5, c.ink);
        label(Av, "A", c.ink, 12 * Math.cos(t) + 4, -12 * Math.sin(t) - 6); label(Cv, "C", c.ink, 14, 10); label(Bv, "B", c.ink, -12, 12);
        // the angle mark
        var bp = S(Bv); ctx.save(); ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; var rpx = g.rad * sc; ctx.beginPath(); ctx.arc(bp[0], bp[1], Math.max(14, rpx * 0.22), -t, 0); ctx.stroke(); ctx.restore();
        // step 1: arc centre B through D and E
        var q1 = f(1); arcAt(Bv, g.rad, -0.12, t + 0.12, q1);
        if (q1 > 0 && q1 < 1) compass(Bv, g.rad, -0.12 + (t + 0.24) * q1);
        if (q1 >= 1) { M.dot(ctx, S(g.D)[0], S(g.D)[1], 4, c.vx); M.dot(ctx, S(g.E)[0], S(g.E)[1], 4, c.vx);
          label(g.D, "D", c.vx, -14 * Math.sin(t) - 4, -14 * Math.cos(t)); label(g.E, "E", c.vx, 4, 14); }
        // step 2: arcs from D and E meeting at F
        var q2 = f(2), aD = Math.atan2(g.F[1] - g.D[1], g.F[0] - g.D[0]), aE = Math.atan2(g.F[1] - g.E[1], g.F[0] - g.E[0]), w2 = 0.3;
        arcAt(g.D, g.rr, aD + w2, aD - w2, clamp(q2 * 2, 0, 1)); arcAt(g.E, g.rr, aE - w2, aE + w2, clamp(q2 * 2 - 1, 0, 1));
        if (q2 > 0 && q2 < 1) { if (q2 < 0.5) compass(g.D, g.rr, aD + w2 - 2 * w2 * q2 * 2); else compass(g.E, g.rr, aE - w2 + 2 * w2 * (q2 * 2 - 1)); }
        if (q2 >= 1) { M.dot(ctx, S(g.F)[0], S(g.F)[1], 4, c.vx); label(g.F, "F", c.vx, -14 * Math.sin(t / 2), -14 * Math.cos(t / 2)); }
        // step 3: ray BF
        var q3 = f(3), far = [7.2 * Math.cos(t / 2), 7.2 * Math.sin(t / 2)];
        if (q3 > 0) seg(Bv, far, c.path, 2.5, [], q3);
        if (q3 >= 1) {
          M.arc(ctx, bp, S(Cv), S(far), rpx * 0.42, c.path, null, c); M.arc(ctx, bp, S(far), S(Av), rpx * 0.42 + 6, c.path, null, c);
          var lr = g.rad * 0.7, lm = S([lr * Math.cos(t / 4), lr * Math.sin(t / 4)]), lm2 = S([lr * Math.cos(3 * t / 4), lr * Math.sin(3 * t / 4)]);
          ctx.fillStyle = c.path; ctx.font = "700 12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(deg(s.ang / 2), lm[0], lm[1]); ctx.fillText(deg(s.ang / 2), lm2[0], lm2[1]);
        }
        // P with its perpendiculars to the arms (the arms extended dashed if the foot lies beyond B)
        var FA = d.fa, FB = d.fb;
        if (FB[0] < 0) seg(Bv, FB, c.muted, 1.5, [4, 4]);
        if (FA[0] * Math.cos(t) + FA[1] * Math.sin(t) < 0) seg(Bv, FA, c.muted, 1.5, [4, 4]);
        seg(P, FA, c.path, 2.2, [6, 4]); seg(P, FB, c.vy, 2.2, [6, 4]);
        function rightMark(Fp, dir, col) { var p = S(Fp), u = [dir[0], -dir[1]], n0 = S(P), v = [n0[0] - p[0], n0[1] - p[1]], L = Math.hypot(v[0], v[1]) || 1; v = [v[0] / L, v[1] / L]; var q = 8;
          ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p[0] + u[0] * q, p[1] + u[1] * q); ctx.lineTo(p[0] + u[0] * q + v[0] * q, p[1] + u[1] * q + v[1] * q); ctx.lineTo(p[0] + v[0] * q, p[1] + v[1] * q); ctx.stroke(); ctx.restore(); }
        var ua = [Math.cos(t), Math.sin(t)];
        rightMark(FA, M.dist(FA, [0, 0]) > 0.3 ? (FA[0] * ua[0] + FA[1] * ua[1] > 0 ? [-ua[0], -ua[1]] : ua) : ua, c.path);
        rightMark(FB, FB[0] > 0.3 ? [-1, 0] : [1, 0], c.vy);
        // keep M and N clear of D and E: slide the label along the arm, away from D (or E)
        var sA = M.dist(FA, [0, 0]) >= g.rad ? 1 : -1, sB = FB[0] >= g.rad ? 1 : -1, nearA = Math.abs(M.dist(FA, [0, 0]) - g.rad) * sc < 26, nearB = Math.abs(FB[0] - g.rad) * sc < 22;
        label(FA, "M", c.path, -15 * Math.sin(t) + (nearA ? sA * 14 * Math.cos(t) : 0), -15 * Math.cos(t) - (nearA ? sA * 14 * Math.sin(t) : 0));
        label(FB, "N", c.vy, nearB ? sB * 14 : 0, 14);
        var pp2 = S(P);
        M.dot(ctx, pp2[0], pp2[1], 8, pc, c.surface);
        label(P, "P", pc, 16, -12);
        var la = S([(P[0] + FA[0]) / 2, (P[1] + FA[1]) / 2]), lb = S([(P[0] + FB[0]) / 2, (P[1] + FB[1]) / 2]);
        ctx.font = "700 13px " + c.font; ctx.textBaseline = "middle"; ctx.textAlign = "left";
        ctx.fillStyle = c.vy; ctx.fillText(cm(d.b), lb[0] + 8, lb[1]);
        var lq = [0.3, 0.5, 0.7].map(function (f) { return S([FA[0] + (P[0] - FA[0]) * f + Math.cos(t) * 16 / sc, FA[1] + (P[1] - FA[1]) * f + Math.sin(t) * 16 / sc]); }).reduce(function (best, q) { var sf = S(g.F); return Math.hypot(q[0] - sf[0], q[1] - sf[1]) > Math.hypot(best[0] - sf[0], best[1] - sf[1]) ? q : best; }); lq = [lq[0] - Math.cos(t) * 16, lq[1] + Math.sin(t) * 16]; ctx.fillStyle = c.path; ctx.textAlign = "center"; ctx.fillText(cm(d.a), lq[0] + Math.cos(t) * 16, lq[1] - Math.sin(t) * 16);
      }
    };

    // ---- interaction ----
    var drag = false;
    function toWorld(e) { var r = k.canvas.getBoundingClientRect(); return view.inv(e.clientX - r.left, e.clientY - r.top); }
    function moveTo(e) {
      var w = toWorld(e);
      if (s.mode === "perp" && Math.abs(w[0]) < 0.15) w[0] = 0;
      if (s.mode === "angle") { var phi = Math.atan2(w[1], w[0]), t = s.ang * R; if (Math.abs(phi - t / 2) < 0.03) { var r = Math.hypot(w[0], w[1]); w = [r * Math.cos(t / 2), r * Math.sin(t / 2)]; } }
      w = w.map(function (v) { return Math.round(v * 100) / 100; });
      s.P = w; update();
    }
    k.canvas.addEventListener("pointerdown", function (e) { if (!view) return; drag = true; k.canvas.setPointerCapture(e.pointerId); moveTo(e); });
    k.canvas.addEventListener("pointermove", function (e) { if (drag) moveTo(e); });
    k.canvas.addEventListener("pointerup", function () { drag = false; });
    k.canvas.addEventListener("pointercancel", function () { drag = false; });

    function animateTo(tg) {
      target = tg;
      if (clock) clock.stop();
      if (reduce) { s.prog = tg; update(); return; }
      clock = K.clock(function (dt) {
        s.prog = Math.min(target, s.prog + dt / 1.3);
        update();
        return s.prog < target;
      });
      clock.start();
    }
    function play() { s.prog = 0; update(); animateTo(3); }
    var snapBox = k.bindCheck("snap", function (v) { s.snap = v; if (v) s.P = null; update(); });
    var shows = [
      k.bindSlider("len", function () { return s.len; }, function (v) { s.len = v; update(); }, function (v) { return M.frac(v) + " cm"; }),
      k.bindSlider("ang", function () { return s.ang; }, function (v) { s.ang = v; s.P = null; update(); }, function (v) { return v + "°"; })
    ];
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { if (v !== s.mode) { s.mode = v; s.P = null; if (clock) clock.stop(); s.prog = 3; } update(); });
    k.onAct({
      play: play,
      step: function () { var n = Math.floor(s.prog + 1e-9); animateTo(n >= 3 ? (s.prog = 0, 1) : n + 1); },
      reset: function () { if (clock) clock.stop(); s.prog = 0; update(); }
    });
    update();

    return {
      set: function (o) {
        if (clock) clock.stop();
        var mc = o.mode && o.mode !== s.mode;
        Object.assign(s, o);
        if (mc && !o.P) s.P = null;
        if (o.pr != null && s.mode === "angle") { s.P = [o.pr * Math.cos(s.ang * R / 2), o.pr * Math.sin(s.ang * R / 2)]; }
        if (o.prog == null) s.prog = 3;
        snapBox.checked = s.snap; shows.forEach(function (fn) { fn(); }); showM(); update();
      },
      play: play,
      seek: function (t) { if (clock) clock.stop(); s.prog = clamp(t, 0, 3); update(); },
      state: function () { var d = dists(); return { mode: s.mode, P: s.P.slice(), a: d.a, b: d.b, prog: s.prog }; }
    };
  }
  window.ConstrBisectSim = { mount: mount };
})();
