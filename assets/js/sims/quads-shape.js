/*
 * Quadrilateral explorer. Drag A, B, C, D on a 1 cm grid; the shape names itself
 * (parallelogram, rectangle, rhombus, square, trapezium, isosceles trapezium, kite) and marks
 * equal sides (ticks), parallel sides (arrows), equal angles (arcs) and the diagonals.
 *   mode "para"    – readouts for the properties and tests of a parallelogram
 *   mode "special" – readouts for sides, angles and diagonals of the special quadrilaterals
 * "Keep ABCD a parallelogram" makes D (or B) follow so that ABCD stays a parallelogram.
 * Needs sim-kit.js and math-kit.js.  QuadsShapeSim.mount(el, { mode: "para", shape: "para" }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit;
  var GX = 12, GY = 8;
  var PRESETS = {
    para:    [[1, 1], [8, 1], [11, 6], [4, 6]],
    rect:    [[2, 1], [10, 1], [10, 6], [2, 6]],
    rhombus: [[1, 1], [6, 1], [9, 5], [4, 5]],
    square:  [[3, 1], [8, 1], [8, 6], [3, 6]],
    trap:    [[1, 1], [11, 1], [8, 6], [2, 6]],
    isotrap: [[1, 1], [11, 1], [8, 6], [4, 6]],
    kite:    [[6, 1], [9, 5], [6, 7], [3, 5]],
    any:     [[1, 2], [9, 1], [11, 6], [4, 7]]
  };
  var NAMES = { para: "Parallelogram", rect: "Rectangle", rhombus: "Rhombus", square: "Square", trap: "Trapezium", isotrap: "Isosceles trapezium", kite: "Kite", any: "Quadrilateral" };
  var V = ["A", "B", "C", "D"];

  function sub(P, Q) { return [P[0] - Q[0], P[1] - Q[1]]; }
  function cross(u, w) { return u[0] * w[1] - u[1] * w[0]; }
  function dot(u, w) { return u[0] * w[0] + u[1] * w[1]; }
  function L2(P, Q) { var d = sub(P, Q); return dot(d, d); }
  function len(n2) { var r = Math.sqrt(n2), q = Math.round(r); return Math.abs(r - q) < 1e-9 ? String(q) : String(+r.toFixed(2)); }
  function ang(a) { var r = Math.round(a); return Math.abs(a - r) < 1e-6 ? r + "°" : a.toFixed(1) + "°"; }

  // exact analysis of a quadrilateral with integer (or half-integer) vertices
  function analyse(p) {
    var A = p[0], B = p[1], C = p[2], D = p[3];
    var e = [sub(B, A), sub(C, B), sub(D, C), sub(A, D)];
    var cr = e.map(function (u, i) { return cross(u, e[(i + 1) % 4]); });
    var convex = cr.every(function (x) { return x > 0; }) || cr.every(function (x) { return x < 0; });
    var sides = [L2(A, B), L2(B, C), L2(C, D), L2(D, A)];
    var angles = [M.angleAt(D, A, B), M.angleAt(A, B, C), M.angleAt(B, C, D), M.angleAt(C, D, A)];
    var parAB = cross(e[0], e[2]) === 0, parBC = cross(e[1], e[3]) === 0;
    var right = [0, 1, 2, 3].map(function (i) { return dot(e[(i + 3) % 4], e[i]) === 0; });
    var allEq = sides[0] === sides[1] && sides[1] === sides[2] && sides[2] === sides[3];
    var key;
    if (parAB && parBC) key = right[0] ? (allEq ? "square" : "rect") : (allEq ? "rhombus" : "para");
    else if (parAB) key = sides[1] === sides[3] ? "isotrap" : "trap";
    else if (parBC) key = sides[0] === sides[2] ? "isotrap" : "trap";
    else if ((sides[0] === sides[3] && sides[1] === sides[2]) || (sides[0] === sides[1] && sides[2] === sides[3])) key = "kite";
    else key = "any";
    var d1 = sub(C, A), d2 = sub(D, B), den = cross(d1, d2), O = null;
    if (den !== 0) { var t = cross(sub(B, A), d2) / den; O = [A[0] + d1[0] * t, A[1] + d1[1] * t]; }
    var bis = A[0] + C[0] === B[0] + D[0] && A[1] + C[1] === B[1] + D[1];
    // AC bisects angles A and C, or BD bisects B and D
    function bisects(P, Q, R, S) { return Math.abs(M.angleAt(Q, P, R) - M.angleAt(S, P, R)) < 1e-7; }
    return { key: key, convex: convex, sides: sides, angles: angles, parAB: parAB, parBC: parBC, right: right, O: O, bis: bis,
      diag: [L2(A, C), L2(B, D)], perp: dot(d1, d2) === 0, diagEq: L2(A, C) === L2(B, D),
      angBis: (bisects(A, B, C, D) && bisects(C, B, A, D)) || (bisects(B, A, D, C) && bisects(D, A, B, C)),
      aob: O ? M.angleAt(A, O, B) : 0 };
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "qs";
    var s = { mode: opts.mode || "para", pts: (PRESETS[opts.shape] || opts.pts || PRESETS.para).map(function (q) { return q.slice(); }), lock: !!opts.lock, diag: opts.diag !== false, from: null, t: 1, warn: "" };
    var drag = -1, view = null;

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "A quadrilateral ABCD on a centimetre grid with draggable corners; equal sides, parallel sides and equal angles are marked",
      panel: K.chips("mode", "Readouts", [["para", "Parallelogram properties"], ["special", "Special quadrilaterals"]]) +
        K.chips("shape", "Make a… (lights up when ABCD is one)", ["para", "rect", "rhombus", "square", "trap", "isotrap", "kite", "any"].map(function (q) { return [q, NAMES[q] === "Quadrilateral" ? "Any quadrilateral" : NAMES[q]]; })) +
        '<div class="checks">' + K.check(id, "lock", "Keep ABCD a parallelogram", s.lock) + K.check(id, "diag", "Show diagonals", s.diag) + '</div>' +
        K.hint("note"),
      readouts: [["r1", "Shape", "c-path"], ["r2", "–", "wrap"], ["r3", "–", "wrap"], ["r4", "–", "wrap"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");
    var LABELS = {
      para: ["Shape", "Opposite sides (cm)", "Opposite angles", "Diagonals cut at O (cm)", "Adjacent angles", "Parallel sides"],
      special: ["Shape", "Sides AB, BC, CD, DA (cm)", "Angles ∠A, ∠B, ∠C, ∠D", "Diagonals AC, BD (cm)", "Diagonals meet at", "The diagonals…"]
    };

    function pair(n1, v1, n2, v2, f) { return v1 === v2 || (f === ang && Math.abs(v1 - v2) < 1e-7) ? n1 + " = " + n2 + " = " + f(v1) : n1 + " " + f(v1) + " ≠ " + n2 + " " + f(v2); }
    function update() {
      LABELS[s.mode].forEach(function (t, i) { spans[i].textContent = t; });
      var a = analyse(s.pts), p = s.pts, g = a.angles, sd = a.sides;
      k.set("r1", NAMES[a.key]);
      var isPara = a.parAB && a.parBC, note;
      if (s.mode === "para") {
        k.set("r2", pair("AB", sd[0], "CD", sd[2], len) + "; " + pair("BC", sd[1], "DA", sd[3], len));
        k.set("r3", pair("∠A", g[0], "∠C", g[2], ang) + "; " + pair("∠B", g[1], "∠D", g[3], ang));
        if (a.O) {
          var O = a.O;
          k.set("r4", pair("AO", L2(p[0], O), "OC", L2(O, p[2]), len) + "; " + pair("BO", L2(p[1], O), "OD", L2(O, p[3]), len));
        } else k.set("r4", "–");
        k.set("r5", "∠A + ∠B = " + ang(g[0] + g[1]) + "; ∠B + ∠C = " + ang(g[1] + g[2]));
        k.set("r6", a.parAB && a.parBC ? "AB ∥ DC and AD ∥ BC" : a.parAB ? "only AB ∥ DC" : a.parBC ? "only AD ∥ BC" : "none");
        note = isPara
          ? "ABCD is a parallelogram" + (a.key !== "para" ? " (a " + NAMES[a.key].toLowerCase() + " is a special parallelogram)" : "") + ": opposite sides are congruent, opposite angles are congruent, the diagonals bisect each other and adjacent angles add up to 180°."
          : "ABCD is not a parallelogram, so its opposite sides, opposite angles and diagonal halves are not all equal. Tick “Keep ABCD a parallelogram” or press Parallelogram.";
      } else {
        k.set("r2", sd.map(len).join(", "));
        k.set("r3", g.map(ang).join(", "));
        k.set("r4", a.diagEq ? "AC = BD = " + len(a.diag[0]) : "AC " + len(a.diag[0]) + ", BD " + len(a.diag[1]));
        k.set("r5", a.O ? "∠AOB = " + ang(a.aob) : "–");
        var pr = [];
        if (a.bis) pr.push("bisect each other"); if (a.diagEq) pr.push("are equal"); if (a.perp) pr.push("are perpendicular"); if (a.angBis) pr.push("bisect the vertex angles");
        k.set("r6", pr.length ? pr.join(" · ") : "none of these");
        note = {
          square: "Square: all sides equal and every angle 90°. It is both a rectangle and a rhombus, so its diagonals are equal, perpendicular, bisect each other and bisect the angles.",
          rect: "Rectangle: a parallelogram with every angle 90°. Its diagonals are equal and bisect each other.",
          rhombus: "Rhombus: a parallelogram with all sides equal. Its diagonals are perpendicular bisectors of each other and bisect the opposite angles.",
          para: "Parallelogram: both pairs of opposite sides parallel. Its diagonals bisect each other, but they are not equal and not perpendicular.",
          isotrap: "Isosceles trapezium: one pair of parallel sides and the other two sides equal. Its base angles are equal, and so are its diagonals.",
          trap: "Trapezium: only one pair of opposite sides is parallel. The two angles beside each non-parallel side add up to 180°.",
          kite: "Kite: two pairs of equal sides next to each other. Its diagonals are perpendicular, and one bisects the other.",
          any: "No special sides or angles: just a quadrilateral. Its four angles still add up to 360°."
        }[a.key];
      }
      k.el('[data-r="note"]').textContent = (s.warn ? s.warn + " " : "") + note;
      showShape(); k.redraw();
    }

    function layout(W, H) {
      var m = 24, sc = Math.min((W - 2 * m) / GX, (H - 2 * m) / GY);
      var ox = (W - GX * sc) / 2, oy = (H + GY * sc) / 2;
      view = { sc: sc, S: function (q) { return [ox + q[0] * sc, oy - q[1] * sc]; }, I: function (x, y) { return [(x - ox) / sc, (oy - y) / sc]; }, ox: ox, oy: oy };
      return view;
    }
    function shown() {
      if (s.t >= 1 || !s.from) return s.pts;
      var e = s.t < 0.5 ? 2 * s.t * s.t : 1 - Math.pow(-2 * s.t + 2, 2) / 2;
      return s.pts.map(function (q, i) { return [s.from[i][0] + (q[0] - s.from[i][0]) * e, s.from[i][1] + (q[1] - s.from[i][1]) * e]; });
    }

    k.draw = function (ctx, W, H, c) {
      var v = layout(W, H), S = v.S, sc = v.sc;
      // grid
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      for (var x = 0; x <= GX; x++) { ctx.beginPath(); ctx.moveTo(Math.round(S([x, 0])[0]) + 0.5, S([0, 0])[1]); ctx.lineTo(Math.round(S([x, 0])[0]) + 0.5, S([0, GY])[1]); ctx.stroke(); }
      for (var y = 0; y <= GY; y++) { ctx.beginPath(); ctx.moveTo(S([0, 0])[0], Math.round(S([0, y])[1]) + 0.5); ctx.lineTo(S([GX, 0])[0], Math.round(S([0, y])[1]) + 0.5); ctx.stroke(); }
      ctx.fillStyle = c.muted; ctx.font = "10px " + c.font; ctx.textAlign = "right"; ctx.textBaseline = "top";
      ctx.fillText("1 square = 1 cm", S([GX, 0])[0], S([0, 0])[1] + 4);
      var p = shown(), P = p.map(S), done = s.t >= 1, a = analyse(s.pts);
      // shape
      ctx.fillStyle = c.tint; ctx.globalAlpha = 0.7; ctx.beginPath(); P.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      var G = [(P[0][0] + P[1][0] + P[2][0] + P[3][0]) / 4, (P[0][1] + P[1][1] + P[2][1] + P[3][1]) / 4];
      // diagonals
      if (s.diag) {
        ctx.save(); ctx.setLineDash([6, 5]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[2][0], P[2][1]); ctx.moveTo(P[1][0], P[1][1]); ctx.lineTo(P[3][0], P[3][1]); ctx.stroke(); ctx.restore();
        if (done && a.O) {
          var O = S(a.O);
          if (a.perp) { ctx.strokeStyle = c.vy; ctx.lineWidth = 1.6; var u = unit(P[0], O), w = unit(P[1], O), r0 = 9; ctx.beginPath(); ctx.moveTo(O[0] + u[0] * r0, O[1] + u[1] * r0); ctx.lineTo(O[0] + (u[0] + w[0]) * r0, O[1] + (u[1] + w[1]) * r0); ctx.lineTo(O[0] + w[0] * r0, O[1] + w[1] * r0); ctx.stroke(); }
          if (a.bis || a.diagEq) {   // circle marks on equal diagonal halves
            var halves = [[P[0], O], [O, P[2]], [P[1], O], [O, P[3]]], hl = [L2(s.pts[0], a.O), L2(a.O, s.pts[2]), L2(s.pts[1], a.O), L2(a.O, s.pts[3])];
            var grp = groups(hl);
            halves.forEach(function (h, i) { if (grp[i]) circles(ctx, h[0], h[1], grp[i], c.vy); });
          }
          M.dot(ctx, O[0], O[1], 3.5, c.muted);
          ctx.fillStyle = c.muted; ctx.font = "700 12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          var ua = unit(P[0], O), ub = unit(P[1], O), od = unit([O[0] + ua[0] + ub[0], O[1] + ua[1] + ub[1]], O);
          ctx.fillText("O", O[0] + od[0] * 17, O[1] + od[1] * 17);
        }
      }
      // sides
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.beginPath(); P.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.stroke();
      if (done) {
        var sg = groups(a.sides);
        for (var i = 0; i < 4; i++) if (sg[i]) ticks(ctx, P[i], P[(i + 1) % 4], sg[i], c.ink);
        if (a.parAB) { chev(ctx, P[0], P[1], 1, c.path); chev(ctx, P[3], P[2], 1, c.path); }
        if (a.parBC) { chev(ctx, P[1], P[2], a.parAB ? 2 : 1, c.path); chev(ctx, P[0], P[3], a.parAB ? 2 : 1, c.path); }
        // angles
        var ag = groups(a.angles), cols = [c.vx, c.vy, c.path];
        for (i = 0; i < 4; i++) {
          var Pv = P[i], Pp = P[(i + 3) % 4], Pn = P[(i + 1) % 4], col = ag[i] ? cols[(ag[i] - 1) % 3] : c.muted;
          if (a.right[i]) { var u1 = unit(Pp, Pv), w1 = unit(Pn, Pv), rr = 12; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(Pv[0] + u1[0] * rr, Pv[1] + u1[1] * rr); ctx.lineTo(Pv[0] + (u1[0] + w1[0]) * rr, Pv[1] + (u1[1] + w1[1]) * rr); ctx.lineTo(Pv[0] + w1[0] * rr, Pv[1] + w1[1] * rr); ctx.stroke(); }
          else arcs(ctx, Pv, Pp, Pn, 20, col, ag[i] || 1);
          var t1 = Math.atan2(Pn[1] - Pv[1], Pn[0] - Pv[0]), t2 = Math.atan2(Pp[1] - Pv[1], Pp[0] - Pv[0]), dd = t2 - t1;
          while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI;
          var la = t1 + dd * 0.5, lr = Math.min(62, Math.max(32, 24 / Math.sin(Math.abs(dd) * 0.5)));
          ctx.fillStyle = a.right[i] ? c.ink : col; ctx.font = "700 11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.save(); ctx.strokeStyle = c.surface; ctx.lineWidth = 3.5; ctx.lineJoin = "round"; ctx.strokeText(ang(a.angles[i]), Pv[0] + Math.cos(la) * lr, Pv[1] + Math.sin(la) * lr); ctx.restore();
          ctx.fillText(ang(a.angles[i]), Pv[0] + Math.cos(la) * lr, Pv[1] + Math.sin(la) * lr);
        }
        // side lengths, outside the shape
        ctx.font = "11px " + c.font; ctx.fillStyle = c.muted;
        for (i = 0; i < 4; i++) {
          var Q1 = P[i], Q2 = P[(i + 1) % 4], mx = (Q1[0] + Q2[0]) / 2, my = (Q1[1] + Q2[1]) / 2, nx = Q2[1] - Q1[1], ny = Q1[0] - Q2[0], nd = Math.hypot(nx, ny) || 1;
          if ((mx - G[0]) * nx + (my - G[1]) * ny < 0) { nx = -nx; ny = -ny; }
          var tw = ctx.measureText(len(a.sides[i])).width, lx = mx + nx / nd * (12 + tw * 0.55 * Math.abs(nx / nd)), ly = my + ny / nd * (12 + 5 * Math.abs(ny / nd));
          lx = Math.max(16, Math.min(W - 16, lx)); ly = Math.max(8, Math.min(H - 8, ly));
          ctx.fillText(len(a.sides[i]), lx, ly);
        }
      }
      // vertices
      ctx.font = "700 15px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      P.forEach(function (q, i) {
        M.dot(ctx, q[0], q[1], drag === i ? 8 : 6, c.ink, c.surface);
        var d = unit(q, G); var lx = q[0] + d[0] * 20, ly = q[1] + d[1] * 20;
        ctx.fillStyle = c.ink; ctx.fillText(V[i], Math.max(10, Math.min(W - 10, lx)), Math.max(10, Math.min(H - 10, ly)));
      });
      void sc;
    };
    function unit(P, Q) { var dx = P[0] - Q[0], dy = P[1] - Q[1], d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; }
    // group equal values: returns, for each index, 0 (unique) or a group number 1, 2, …
    function groups(vals) {
      var out = vals.map(function () { return 0; }), n = 0;
      vals.forEach(function (v, i) {
        if (out[i]) return;
        var same = []; vals.forEach(function (w, j) { if (j > i && !out[j] && Math.abs(w - v) < 1e-6) same.push(j); });
        if (same.length) { n++; out[i] = n; same.forEach(function (j) { out[j] = n; }); }
      });
      return out;
    }
    function ticks(ctx, P, Q, n, col) {
      var mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2, u = unit(Q, P), nx = -u[1], ny = u[0];
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      for (var j = 0; j < n; j++) { var o = (j - (n - 1) / 2) * 5; ctx.beginPath(); ctx.moveTo(mx + u[0] * o - nx * 6, my + u[1] * o - ny * 6); ctx.lineTo(mx + u[0] * o + nx * 6, my + u[1] * o + ny * 6); ctx.stroke(); }
    }
    function circles(ctx, P, Q, n, col) {
      var mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2, u = unit(Q, P);
      ctx.strokeStyle = col; ctx.lineWidth = 1.6;
      for (var j = 0; j < n; j++) { var o = (j - (n - 1) / 2) * 8; ctx.beginPath(); ctx.arc(mx + u[0] * o, my + u[1] * o, 3, 0, 7); ctx.stroke(); }
    }
    // arrowhead marks for parallel sides, pointing from P to Q, placed a third of the way along
    function chev(ctx, P, Q, n, col) {
      var u = unit(Q, P), nx = -u[1], ny = u[0], bx = P[0] + (Q[0] - P[0]) * 0.3, by = P[1] + (Q[1] - P[1]) * 0.3;
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineCap = "round";
      for (var j = 0; j < n; j++) { var cx = bx + u[0] * j * 6, cy = by + u[1] * j * 6; ctx.beginPath(); ctx.moveTo(cx - u[0] * 6 - nx * 5, cy - u[1] * 6 - ny * 5); ctx.lineTo(cx, cy); ctx.lineTo(cx - u[0] * 6 + nx * 5, cy - u[1] * 6 + ny * 5); ctx.stroke(); }
      ctx.lineCap = "butt";
    }
    function arcs(ctx, B, A, C, r, col, n) {
      var a1 = Math.atan2(A[1] - B[1], A[0] - B[0]), a2 = Math.atan2(C[1] - B[1], C[0] - B[0]), d = a2 - a1;
      while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      ctx.fillStyle = col; ctx.globalAlpha = 0.16; ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.arc(B[0], B[1], r, a1, a1 + d, d < 0); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      for (var j = 0; j < n; j++) { ctx.beginPath(); ctx.arc(B[0], B[1], r - j * 5, a1, a1 + d, d < 0); ctx.stroke(); }
    }

    // dragging on the grid
    function at(e) { var r = k.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    k.canvas.addEventListener("pointerdown", function (e) {
      if (!view) return; var q = at(e), best = 26;
      s.pts.forEach(function (p, i) { var d = M.dist(q, view.S(p)); if (d < best) { best = d; drag = i; } });
      if (drag >= 0) { clock.stop(); s.t = 1; k.canvas.setPointerCapture(e.pointerId); k.redraw(); }
    });
    k.canvas.addEventListener("pointermove", function (e) {
      if (drag < 0) return;
      var q = at(e), g = view.I(q[0], q[1]); g = [Math.max(0, Math.min(GX, Math.round(g[0]))), Math.max(0, Math.min(GY, Math.round(g[1])))];
      if (g[0] === s.pts[drag][0] && g[1] === s.pts[drag][1]) return;
      var np = s.pts.map(function (p) { return p.slice(); }); np[drag] = g;
      if (s.lock) { var f = drag === 3 ? 1 : 3; np[f] = [np[(f + 3) % 4][0] + np[(f + 1) % 4][0] - np[(f + 2) % 4][0], np[(f + 3) % 4][1] + np[(f + 1) % 4][1] - np[(f + 2) % 4][1]]; }
      if (!np.every(function (p) { return p[0] >= 0 && p[0] <= GX && p[1] >= 0 && p[1] <= GY; })) return;
      if (!analyse(np).convex) { s.warn = "(ABCD must stay a convex quadrilateral.)"; update(); s.warn = ""; return; }
      s.pts = np; update();
    });
    function up() { if (drag >= 0) { drag = -1; k.redraw(); } }
    k.canvas.addEventListener("pointerup", up); k.canvas.addEventListener("pointercancel", up);

    var clock = K.clock(function (dt) { s.t = Math.min(1, s.t + dt / 0.8); k.redraw(); return s.t < 1; });
    function play() {
      if (!s.from || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { s.t = 1; k.redraw(); return; }
      s.t = 0; clock.start();
    }
    var showShape = k.bindChips("shape", function () { return analyse(s.pts).key; }, function (v) { setPts(PRESETS[v]); if (s.lock && !isParaKey(v)) { s.lock = false; lockBox.checked = false; } update(); play(); });
    var showMode = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; update(); });
    var lockBox = k.bindCheck("lock", function (on) {
      s.lock = on;
      if (on) { var a = analyse(s.pts); if (!(a.parAB && a.parBC)) { var p = s.pts, D = [p[0][0] + p[2][0] - p[1][0], p[0][1] + p[2][1] - p[1][1]]; var np = [p[0], p[1], p[2], D]; setPts(D[0] >= 0 && D[0] <= GX && D[1] >= 0 && D[1] <= GY && analyse(np).convex ? np : PRESETS.para); play(); } }
      update();
    });
    k.bindCheck("diag", function (on) { s.diag = on; k.redraw(); });
    function isParaKey(v) { return ["para", "rect", "rhombus", "square"].indexOf(v) >= 0; }
    function setPts(np) { clock.stop(); s.from = shown().map(function (q) { return q.slice(); }); s.pts = np.map(function (q) { return q.slice(); }); s.t = 1; }

    update();
    return {
      set: function (o) {
        if (o.mode) s.mode = o.mode;
        if (o.shape && PRESETS[o.shape]) setPts(PRESETS[o.shape]);
        if (o.pts) setPts(o.pts);
        if ("lock" in o) { s.lock = !!o.lock; lockBox.checked = s.lock; }
        if ("diag" in o) { s.diag = !!o.diag; root.querySelector('[data-check="diag"]').checked = s.diag; }
        showMode(); update();
      },
      play: play,
      seek: function (t) { clock.stop(); s.t = t; k.redraw(); },
      state: function () { var a = analyse(s.pts); return { mode: s.mode, pts: s.pts.map(function (q) { return q.slice(); }), shape: a.key, name: NAMES[a.key] }; }
    };
  }
  window.QuadsShapeSim = { mount: mount, analyse: analyse, PRESETS: PRESETS };
})();
