/*
 * Angles of a triangle. Drag A, B or C (or use the sliders for ∠B and ∠C).
 * Side BC is extended to D to make the exterior angle ∠ACD.
 * "Move the corners" slides copies of ∠A and ∠B over to C: together with ∠C they fill a straight
 * line (sum = 180°), and ∠A + ∠B exactly fill the exterior angle (remote interior angles theorem).
 * Needs sim-kit.js and math-kit.js.  TriAngleSim.mount(el, { B: 60, C: 70, mode: "sum" }) → { set, play, seek }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit;

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "ta";
    var s = { mode: opts.mode || "sum", t: 0, pts: null, angB: opts.B || 60, angC: opts.C || 70 };
    var W0 = 0, H0 = 0, dragging = -1;

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "A triangle ABC with its angles marked and side BC extended to D",
      panel: K.chips("mode", "Show", [["sum", "Angle sum"], ["ext", "Exterior angle"]]) +
        K.slider(id, "B", "∠B", 10, 150, 1, "°") + K.slider(id, "C", "∠C", 10, 150, 1, "°") +
        K.buttons([["play", "Move the corners"], ["reset", "Reset"]]) + K.hint("note"),
      readouts: [["A", "∠A", "c-path"], ["B", "∠B", "c-vx"], ["C", "∠C", "c-vy"],
                 ["sum", "∠A + ∠B + ∠C"], ["ext", "Exterior ∠ACD"], ["ab", "∠A + ∠B"]],
      cols: 3
    });

    // place the triangle from the two base angles, base BC fixed
    function build(W, H) {
      var Bx = W * 0.14, Cx = W * 0.6, by = H * 0.8, b = s.angB * Math.PI / 180, cc = s.angC * Math.PI / 180;
      var base = Cx - Bx, ta = Math.tan(b), tc = Math.tan(cc), x = base * tc / (ta + tc), y = x * ta;
      var f = y > by - 22 ? (by - 22) / y : 1;   // too tall: shrink the whole triangle
      x *= f; y *= f; base *= f;
      var sh = Math.max(0, 22 - (Bx + x));   // obtuse ∠B puts A left of B: slide everything right
      s.pts = [[Bx + x + sh, by - y], [Bx + sh, by], [Bx + base + sh, by]];
    }
    function fromPoints() {
      var A = s.pts[0], B = s.pts[1], C = s.pts[2];
      s.angB = Math.round(M.angleAt(A, B, C)); s.angC = Math.round(M.angleAt(A, C, B));
    }
    function angles() { var B = s.angB, C = s.angC; return { A: 180 - B - C, B: B, C: C }; }

    function update() {
      var g = angles(), ok = g.A > 0;
      k.set("A", ok ? g.A + "°" : "–"); k.set("B", g.B + "°"); k.set("C", g.C + "°");
      k.set("sum", ok ? (g.A + g.B + g.C) + "°" : "no triangle");
      k.set("ext", ok ? (180 - g.C) + "°" : "–"); k.set("ab", ok ? (g.A + g.B) + "°" : "–");
      k.el('[data-r="note"]').textContent = !ok ? "∠B + ∠C must be less than 180°, or the sides never meet."
        : s.mode === "sum" ? g.A + "° + " + g.B + "° + " + g.C + "° = 180°. Press “Move the corners” to fit ∠A and ∠B beside ∠C on a straight line."
        : "Exterior ∠ACD = " + (180 - g.C) + "° = ∠A + ∠B = " + g.A + "° + " + g.B + "°. The exterior angle is also bigger than ∠A and bigger than ∠B on its own.";
      k.redraw();
    }

    function lerp(a, b, t) { return a + (b - a) * t; }
    function ang(P, Q) { return Math.atan2(Q[1] - P[1], Q[0] - P[0]); }
    function wedge(ctx, P, a0, sweep, r, col, alpha) {
      ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.arc(P[0], P[1], r, a0, a0 + sweep, sweep < 0); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P[0], P[1], r, a0, a0 + sweep, sweep < 0); ctx.stroke();
    }
    function signed(a, b) { var d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }

    k.draw = function (ctx, W, H, c) {
      if (W !== W0 || H !== H0 || !s.pts) { W0 = W; H0 = H; build(W, H); }
      var g = angles(); if (g.A <= 0) return;
      var A = s.pts[0], B = s.pts[1], C = s.pts[2], D = [C[0] + (C[0] - B[0]) / M.dist(B, C) * W * 0.3, C[1] + (C[1] - B[1]) / M.dist(B, C) * W * 0.3];
      var r = Math.min(46, M.dist(B, C) * 0.18);
      // the extended side
      ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = c.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(C[0], C[1]); ctx.lineTo(D[0], D[1]); ctx.stroke(); ctx.restore();
      // triangle
      ctx.fillStyle = c.tint; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.stroke();
      // interior angle wedges
      var dCA = ang(C, A), dCD = ang(C, D), sg = Math.sign(signed(dCA, dCD)) || 1;
      var aA = g.A * Math.PI / 180, aB = g.B * Math.PI / 180;
      // original wedge at A, oriented to match the target direction sg
      var dAB = ang(A, B), dAC = ang(A, C), sA = signed(dAB, dAC), startA = Math.sign(sA) === sg ? dAB : dAC;
      var dBA = ang(B, A), dBC = ang(B, C), sB = signed(dBA, dBC), startB = Math.sign(sB) === sg ? dBA : dBC;
      wedge(ctx, A, startA, sg * aA, r, c.path, 0.22);
      wedge(ctx, B, startB, sg * aB, r, c.vx, 0.22);
      var dCB = ang(C, B); wedge(ctx, C, dCB, signed(dCB, dCA), r * 0.8, c.vy, 0.22);
      if (s.mode === "ext") { ctx.setLineDash([3, 3]); ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(C[0], C[1], r * 1.55, dCA, dCA + signed(dCA, dCD), signed(dCA, dCD) < 0); ctx.stroke(); ctx.setLineDash([]); }
      // moving copies
      if (s.t > 0) {
        var t = s.t < 0.5 ? 2 * s.t * s.t : 1 - Math.pow(-2 * s.t + 2, 2) / 2;
        var tgA = dCA, tgB = dCA + sg * aA;
        var pA = [lerp(A[0], C[0], t), lerp(A[1], C[1], t)], pB = [lerp(B[0], C[0], t), lerp(B[1], C[1], t)];
        wedge(ctx, pA, startA + signed(startA, tgA) * t, sg * aA, r, c.path, 0.45);
        wedge(ctx, pB, startB + signed(startB, tgB) * t, sg * aB, r, c.vx, 0.45);
      }
      // labels
      ctx.font = "700 15px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = c.ink;
      var G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
      [[A, "A"], [B, "B"], [C, "C"]].forEach(function (q) { var dx = q[0][0] - G[0], dy = q[0][1] - G[1], d = Math.hypot(dx, dy) || 1; ctx.fillText(q[1], q[0][0] + dx / d * 18, q[0][1] + dy / d * 18); });
      ctx.fillText("D", D[0], D[1] + 16);
      ctx.font = "700 12px " + c.font;
      function lab(P, a0, sw, txt, col, rr) { var m = a0 + sw / 2; ctx.fillStyle = col; ctx.fillText(txt, P[0] + Math.cos(m) * rr, P[1] + Math.sin(m) * rr); }
      lab(A, startA, sg * aA, g.A + "°", c.path, r + 14); lab(B, startB, sg * aB, g.B + "°", c.vx, r + 14); lab(C, dCB, signed(dCB, dCA), g.C + "°", c.vy, r * 0.8 + 14);
      if (s.mode === "ext" && s.t === 0) lab(C, dCA, signed(dCA, dCD), (180 - g.C) + "°", c.ink, r * 1.55 + 16);
      if (s.t >= 1) { ctx.fillStyle = c.good; ctx.font = "700 14px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(s.mode === "sum" ? "∠C + ∠A + ∠B = a straight angle = 180°" : "∠A + ∠B fill the exterior angle exactly", 12, H - 8); }
      // handles
      s.pts.forEach(function (p) { M.dot(ctx, p[0], p[1], 6, c.ink, c.surface); });
    };

    var showB = k.bindSlider("B", function () { return s.angB; }, function (v) { s.angB = v; s.t = 0; build(W0, H0); update(); }, function (v) { return v + "°"; });
    var showC = k.bindSlider("C", function () { return s.angC; }, function (v) { s.angC = v; s.t = 0; build(W0, H0); update(); }, function (v) { return v + "°"; });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; s.t = 0; update(); });

    // drag vertices
    function hit(e) { var r = k.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    k.canvas.addEventListener("pointerdown", function (e) { var p = hit(e); s.pts.forEach(function (q, i) { if (M.dist(p, q) < 24) dragging = i; }); if (dragging >= 0) { k.canvas.setPointerCapture(e.pointerId); s.t = 0; } });
    k.canvas.addEventListener("pointermove", function (e) {
      if (dragging < 0) return; var p = hit(e); p[0] = Math.max(16, Math.min(W0 * 0.75, p[0])); p[1] = Math.max(16, Math.min(H0 - 16, p[1]));
      var old = s.pts[dragging]; s.pts[dragging] = p;
      var g0 = M.angleAt(s.pts[0], s.pts[1], s.pts[2]), g1 = M.angleAt(s.pts[0], s.pts[2], s.pts[1]);
      if (g0 < 3 || g1 < 3 || 180 - g0 - g1 < 3) { s.pts[dragging] = old; return; }
      fromPoints(); showB(); showC(); update();
    });
    k.canvas.addEventListener("pointerup", function () { dragging = -1; });

    var clock = K.clock(function (dt) { s.t = Math.min(1, s.t + dt / 1.8); k.redraw(); if (s.t >= 1) update(); return s.t < 1; });
    function play() { s.t = 0; if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { s.t = 1; update(); } else clock.start(); }
    k.onAct({ play: play, reset: function () { clock.stop(); s.t = 0; update(); } });
    update();
    return {
      set: function (o) { clock.stop(); s.t = 0; if (o.B) s.angB = o.B; if (o.C) s.angC = o.C; if (o.mode) s.mode = o.mode; build(W0, H0); showB(); showC(); showM(); update(); },
      play: play, seek: function (t) { clock.stop(); s.t = t; k.redraw(); }, angles: angles
    };
  }
  window.TriAngleSim = { mount: mount };
})();
