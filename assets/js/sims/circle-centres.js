/*
 * Circumcircle and incircle of a triangle (Std 9 Geometry Ch. 6).
 *   circum – perpendicular bisectors of the sides meet at the circumcentre O; OA = OB = OC.
 *            O is inside an acute triangle, at the midpoint of the hypotenuse of a right triangle, outside an obtuse one.
 *   in     – angle bisectors meet at the incentre I; I is the same distance from all three sides.
 * Drag the vertices (they snap to a 0.5 cm grid). "Play construction" draws the bisectors one by one.
 * Needs sim-kit.js and math-kit.js.  CircleCentreSim.mount(el, { mode: "circum", A: [1, 5], B: [0, 0], C: [8, 0] }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit;
  function n2(x) { return String(+x.toFixed(2)); }
  function cm(x) { return n2(x) + " cm"; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  var PRESETS = {
    acute: { A: [3, 6], B: [0, 0], C: [7, 0] },
    right: { A: [0, 6], B: [0, 0], C: [8, 0] },
    obtuse: { A: [-1, 2], B: [0, 0], C: [8, 0] },
    equi: { A: [3, 3 * Math.sqrt(3)], B: [0, 0], C: [6, 0] }
  };

  function centres(A, B, C) {
    var a = M.dist(B, C), b = M.dist(C, A), c = M.dist(A, B);
    var d = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    if (Math.abs(d) < 1e-9) return null;
    var A2 = A[0] * A[0] + A[1] * A[1], B2 = B[0] * B[0] + B[1] * B[1], C2 = C[0] * C[0] + C[1] * C[1];
    var O = [(A2 * (B[1] - C[1]) + B2 * (C[1] - A[1]) + C2 * (A[1] - B[1])) / d, (A2 * (C[0] - B[0]) + B2 * (A[0] - C[0]) + C2 * (B[0] - A[0])) / d];
    var p = a + b + c, I = [(a * A[0] + b * B[0] + c * C[0]) / p, (a * A[1] + b * B[1] + c * C[1]) / p];
    var area = Math.abs(d) / 4, r = area / (p / 2);
    var angs = [M.angleAt(B, A, C), M.angleAt(A, B, C), M.angleAt(A, C, B)];
    return { O: O, R: M.dist(O, A), I: I, r: r, a: a, b: b, c: c, angs: angs, area: area };
  }
  function foot(P, Q, X) { var v = [Q[0] - P[0], Q[1] - P[1]], t = ((X[0] - P[0]) * v[0] + (X[1] - P[1]) * v[1]) / (v[0] * v[0] + v[1] * v[1]); return [P[0] + v[0] * t, P[1] + v[1] * t]; }

  function mount(root, opts) {
    opts = opts || {};
    var s = { mode: opts.mode || "circum", A: (opts.A || PRESETS.acute.A).slice(), B: (opts.B || PRESETS.acute.B).slice(), C: (opts.C || PRESETS.acute.C).slice(), prog: 5 };
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches, clock = null;

    var k = K.frame(root, {
      label: "A triangle with its circumcircle or incircle; drag the vertices",
      panel: K.chips("mode", "Show", [["circum", "Circumcircle"], ["in", "Incircle"]]) +
        K.chips("pre", "Triangle", [["acute", "Acute"], ["right", "Right"], ["obtuse", "Obtuse"], ["equi", "Equilateral"]]) +
        K.buttons([["play", "Play construction"]]) +
        K.hint("note"),
      readouts: [["type", "Triangle", "wrap"], ["ang", "∠A, ∠B, ∠C", "wrap"], ["sides", "AB, BC, CA", "wrap"],
                 ["where", "–", "c-path wrap"], ["rad", "–", "c-vy"], ["chk", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");
    var preBox = root.querySelector('[data-group="pre"]');
    function showPre() {
      var cur = null; Object.keys(PRESETS).forEach(function (q) { var P = PRESETS[q]; if (["A", "B", "C"].every(function (v) { return M.dist(P[v], s[v]) < 1e-6; })) cur = q; });
      preBox.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === cur)); });
    }
    function type(g) {
      var mx = Math.max.apply(null, g.angs), eqS = Math.abs(g.a - g.b) < 1e-6 && Math.abs(g.b - g.c) < 1e-6;
      return (eqS ? "Equilateral, " : "") + (Math.abs(mx - 90) < 0.01 ? "right-angled" : mx > 90 ? "obtuse-angled" : "acute-angled");
    }

    function update() {
      var g = centres(s.A, s.B, s.C), done = s.prog >= 5 - 1e-9;
      spans[3].textContent = s.mode === "circum" ? "Circumcentre O" : "Incentre I";
      spans[4].textContent = s.mode === "circum" ? "Circumradius" : "Inradius";
      spans[5].textContent = s.mode === "circum" ? "OA, OB, OC" : "Distances of I from the sides";
      showPre();
      if (!g) { ["type", "ang", "sides", "where", "rad", "chk"].forEach(function (q) { k.set(q, "–"); }); k.el('[data-r="note"]').textContent = "The three points are on one line: that is not a triangle."; k.redraw(); return; }
      k.set("type", type(g));
      k.set("ang", g.angs.map(function (x) { return (+x.toFixed(1)) + "°"; }).join(", "));
      k.set("sides", [g.c, g.a, g.b].map(n2).join(", ") + " cm");
      var mx = Math.max.apply(null, g.angs), right = Math.abs(mx - 90) < 0.01, note;
      if (s.mode === "circum") {
        k.set("where", !done ? "–" : right ? "Midpoint of hypotenuse" : mx > 90 ? "Outside" : "Inside");
        k.set("rad", done ? cm(g.R) : "–");
        k.set("chk", done ? [s.A, s.B, s.C].map(function (P) { return n2(M.dist(g.O, P)); }).join(", ") + " cm" : "–");
        note = right ? "Right-angled triangle: the circumcentre is the midpoint of the hypotenuse, and the radius is half the hypotenuse."
          : mx > 90 ? "Obtuse-angled triangle: the perpendicular bisectors meet outside the triangle, so the circumcentre is outside."
          : "Acute-angled triangle: the perpendicular bisectors meet inside the triangle. O is equidistant from A, B and C.";
      } else {
        var ds = [[s.A, s.B], [s.B, s.C], [s.C, s.A]].map(function (pq) { return M.dist(g.I, foot(pq[0], pq[1], g.I)); });
        k.set("where", done ? "Inside (always)" : "–");
        k.set("rad", done ? cm(g.r) : "–");
        k.set("chk", done ? ds.map(n2).join(", ") + " cm" : "–");
        note = "The angle bisectors always meet inside the triangle. I is the same distance from all three sides, so a circle with centre I touches each side once.";
      }
      if (!done) note = "Step " + Math.min(5, Math.floor(s.prog) + 1) + ": " + (s.mode === "circum"
        ? ["draw the perpendicular bisector of AB", "draw the perpendicular bisector of BC", "the bisector of CA passes through the same point", "mark the point O where they meet", "draw the circle with centre O through A"]
        : ["bisect ∠A", "bisect ∠B", "the bisector of ∠C passes through the same point", "mark I and draw IP ⊥ BC", "draw the circle with centre I and radius IP"])[Math.min(4, Math.floor(s.prog))] + ".";
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    var view = null;
    k.draw = function (ctx, W, H, c) {
      // fixed view so the picture does not jump while you drag
      var cx = 3.5, cy = 3.2, span = 13.5, sc = Math.min(W / span, H / (span * 0.78)), ox = W / 2 - cx * sc, oy = H / 2 + cy * sc;
      var S = function (p) { return [ox + p[0] * sc, oy - p[1] * sc]; };
      view = { S: S, inv: function (x, y) { return [(x - ox) / sc, (oy - y) / sc]; } };
      // grid
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      var x0 = Math.floor((0 - ox) / sc), x1 = Math.ceil((W - ox) / sc), y0 = Math.floor((oy - H) / sc), y1 = Math.ceil(oy / sc);
      for (var x = x0; x <= x1; x++) { var px = Math.round(ox + x * sc) + 0.5; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke(); }
      for (var y = y0; y <= y1; y++) { var py = Math.round(oy - y * sc) + 0.5; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke(); }
      var g = centres(s.A, s.B, s.C), A = S(s.A), B = S(s.B), C = S(s.C);
      var f = function (i) { return clamp(s.prog - i, 0, 1); };
      ctx.fillStyle = c.tint; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.stroke();
      function line(P, Q, col, w, frac, dash) { if (frac <= 0) return; var a = S(P), b = S(Q); ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac); ctx.stroke(); ctx.restore(); }
      if (g) {
        if (s.mode === "circum") {
          [[s.A, s.B], [s.B, s.C], [s.C, s.A]].forEach(function (pq, i) {
            var m = [(pq[0][0] + pq[1][0]) / 2, (pq[0][1] + pq[1][1]) / 2], v = [pq[1][0] - pq[0][0], pq[1][1] - pq[0][1]], L = Math.hypot(v[0], v[1]), n = [-v[1] / L, v[0] / L];
            var to = (g.O[0] - m[0]) * n[0] + (g.O[1] - m[1]) * n[1], lo = Math.min(to, 0) - 2.5, hi = Math.max(to, 0) + 2.5;
            line([m[0] + n[0] * lo, m[1] + n[1] * lo], [m[0] + n[0] * hi, m[1] + n[1] * hi], c.vx, 1.8, f(i), [7, 4]);
            if (f(i) >= 1) {   // right-angle mark and equal ticks
              var mp = S(m), u = [v[0] / L, -v[1] / L], nn = [n[0], -n[1]], q = 7;
              ctx.strokeStyle = c.vx; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(mp[0] + u[0] * q, mp[1] + u[1] * q); ctx.lineTo(mp[0] + u[0] * q + nn[0] * q, mp[1] + u[1] * q + nn[1] * q); ctx.lineTo(mp[0] + nn[0] * q, mp[1] + nn[1] * q); ctx.stroke();
            }
          });
          if (f(3) > 0) {
            var o = S(g.O);
            if (f(4) > 0) {
              ctx.save(); ctx.strokeStyle = c.vy; ctx.lineWidth = 2.5; ctx.beginPath(); var a0 = Math.atan2(A[1] - o[1], A[0] - o[0]); ctx.arc(o[0], o[1], g.R * sc, a0, a0 + Math.PI * 2 * f(4)); ctx.stroke(); ctx.restore();
              if (f(4) >= 1) [A, B, C].forEach(function (P) { line(g.O, [(P[0] - ox) / sc, (oy - P[1]) / sc], c.vy, 1.5, 1, [3, 4]); });
            }
            M.dot(ctx, o[0], o[1], 6, c.path, c.surface);
            ctx.fillStyle = c.path; ctx.font = "700 15px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText("O", o[0] + 8, o[1] - 4);
          }
        } else {
          var V = [s.A, s.B, s.C], opp = [[s.B, s.C], [s.C, s.A], [s.A, s.B]];
          V.forEach(function (P, i) {   // bisector from vertex to the opposite side
            var Q = opp[i], a1 = M.dist(P, Q[0]), a2 = M.dist(P, Q[1]), t = a1 / (a1 + a2), E = [Q[0][0] + (Q[1][0] - Q[0][0]) * t, Q[0][1] + (Q[1][1] - Q[0][1]) * t];
            line(P, E, c.vx, 1.8, f(i), [7, 4]);
            if (f(i) >= 1) { var pp = S(P); M.arc(ctx, pp, S(Q[0]), S(E), 18 + i * 0, c.vx, null, c); M.arc(ctx, pp, S(E), S(Q[1]), 22, c.vx, null, c); }
          });
          if (f(3) > 0) {
            var I = S(g.I), Fp = S(foot(s.B, s.C, g.I));
            line(g.I, foot(s.B, s.C, g.I), c.vy, 2, f(3));
            if (f(3) >= 1) { [[s.C, s.A], [s.A, s.B]].forEach(function (pq) { line(g.I, foot(pq[0], pq[1], g.I), c.vy, 1.5, 1, [3, 4]); });
              ctx.fillStyle = c.vy; ctx.font = "700 13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("P", Fp[0], Fp[1] + 4); }
            if (f(4) > 0) { ctx.save(); ctx.strokeStyle = c.vy; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(I[0], I[1], g.r * sc, Math.PI / 2, Math.PI / 2 + Math.PI * 2 * f(4)); ctx.stroke(); ctx.restore(); }
            M.dot(ctx, I[0], I[1], 6, c.path, c.surface);
            ctx.fillStyle = c.path; ctx.font = "700 15px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText("I", I[0] + 8, I[1] - 4);
          }
        }
      }
      var G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
      [[A, "A"], [B, "B"], [C, "C"]].forEach(function (q) {
        M.dot(ctx, q[0][0], q[0][1], 8, c.ink, c.surface);
        var dx = q[0][0] - G[0], dy = q[0][1] - G[1], d = Math.hypot(dx, dy) || 1;
        ctx.fillStyle = c.ink; ctx.font = "700 15px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(q[1], q[0][0] + dx / d * 20, q[0][1] + dy / d * 20);
      });
    };

    var drag = null;
    k.canvas.addEventListener("pointerdown", function (e) {
      if (!view) return; var r = k.canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, bd = 34;
      drag = null; ["A", "B", "C"].forEach(function (v) { var p = view.S(s[v]), d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; drag = v; } });
      if (drag) k.canvas.setPointerCapture(e.pointerId);
    });
    k.canvas.addEventListener("pointermove", function (e) {
      if (!drag) return; var r = k.canvas.getBoundingClientRect(), w = view.inv(e.clientX - r.left, e.clientY - r.top);
      var p = [clamp(Math.round(w[0] * 2) / 2, -2.5, 9.5), clamp(Math.round(w[1] * 2) / 2, -1.5, 7.5)];
      var others = ["A", "B", "C"].filter(function (v) { return v !== drag; });
      if (others.some(function (v) { return M.dist(s[v], p) < 0.6; })) return;
      if (clock) clock.stop(); s.prog = 5; s[drag] = p; update();
    });
    k.canvas.addEventListener("pointerup", function () { drag = null; });
    k.canvas.addEventListener("pointercancel", function () { drag = null; });

    function play() {
      if (clock) clock.stop(); s.prog = 0; update();
      if (reduce) { s.prog = 5; update(); return; }
      clock = K.clock(function (dt) { s.prog = Math.min(5, s.prog + dt / 0.9); update(); return s.prog < 5; }); clock.start();
    }
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; if (clock) clock.stop(); s.prog = 5; update(); });
    preBox.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; var P = PRESETS[b.dataset.v]; s.A = P.A.slice(); s.B = P.B.slice(); s.C = P.C.slice(); if (clock) clock.stop(); s.prog = 5; update(); });
    k.onAct({ play: play });
    update();
    return {
      set: function (o) {
        if (clock) clock.stop();
        if (o.mode) s.mode = o.mode;
        if (o.pre && PRESETS[o.pre]) { s.A = PRESETS[o.pre].A.slice(); s.B = PRESETS[o.pre].B.slice(); s.C = PRESETS[o.pre].C.slice(); }
        ["A", "B", "C"].forEach(function (v) { if (o[v]) s[v] = o[v].slice(); });
        s.prog = o.prog != null ? o.prog : 5; showM(); update();
      },
      play: play,
      seek: function (t) { if (clock) clock.stop(); s.prog = clamp(t, 0, 5); update(); },
      state: function () { return centres(s.A, s.B, s.C); }
    };
  }
  window.CircleCentreSim = { mount: mount, centres: centres };
})();
