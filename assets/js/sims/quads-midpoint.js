/*
 * The midpoint theorem and its uses. Drag the corners on a 1 cm grid.
 *   theorem  – P, Q midpoints of AB, AC: PQ ∥ BC and PQ = ½ BC. play() animates the proof:
 *              △APQ turns half a turn about Q onto △CRQ, so PBCR is a parallelogram.
 *   converse – the line through the midpoint P of AB, parallel to BC, meets AC at its midpoint Q
 *   quad     – the midpoints of the sides of any quadrilateral make a parallelogram PQRS
 *   trap     – in a trapezium, the segment joining the midpoints of the non-parallel sides is
 *              parallel to the bases and equal to half their sum
 * Needs sim-kit.js and math-kit.js.  QuadsMidSim.mount(el, { mode: "theorem" }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit;
  var GX = 12, GY = 8;
  var DEF = { tri: [[4, 7], [1, 1], [11, 1]], quad: [[1, 2], [9, 1], [11, 6], [4, 7]], trap: [[1, 1], [11, 1], [8, 6], [3, 6]] };

  function mid(P, Q) { return [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2]; }
  function sub(P, Q) { return [P[0] - Q[0], P[1] - Q[1]]; }
  function cross(u, w) { return u[0] * w[1] - u[1] * w[0]; }
  function dot(u, w) { return u[0] * w[0] + u[1] * w[1]; }
  function D(P, Q) { return Math.hypot(P[0] - Q[0], P[1] - Q[1]); }
  function L(x) { var q = Math.round(x); return Math.abs(x - q) < 1e-9 ? String(q) : String(+x.toFixed(2)); }
  function convex(p) { var n = p.length, sg = 0; for (var i = 0; i < n; i++) { var c = cross(sub(p[(i + 1) % n], p[i]), sub(p[(i + 2) % n], p[(i + 1) % n])); if (c === 0) return false; if (!sg) sg = c > 0 ? 1 : -1; else if (sg * c < 0) return false; } return true; }

  function mount(root, opts) {
    opts = opts || {};
    var s = { mode: opts.mode || "theorem", tri: (opts.tri || DEF.tri).map(c2), quad: (opts.quad || DEF.quad).map(c2), trap: (opts.trap || DEF.trap).map(c2), t: 0 };
    function c2(q) { return q.slice(); }
    var drag = -1, view = null;
    var LABELS = {
      theorem:  ["AP and PB (cm)", "AQ and QC (cm)", "PQ (cm)", "BC (cm)", "PQ / BC", "PQ ∥ BC?"],
      converse: ["AP and PB (cm)", "Line through P", "AQ (cm)", "QC (cm)", "Q is the midpoint of AC?", "PQ and BC (cm)"],
      quad:     ["PQ and SR (cm)", "½ AC (cm)", "QR and PS (cm)", "½ BD (cm)", "Parallel sides", "PQRS is a"],
      trap:     ["AB (cm)", "DC (cm)", "MN (cm)", "½ (AB + DC)", "MN ∥ AB ∥ DC?", "M and N"]
    };
    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "A triangle or quadrilateral on a centimetre grid with draggable corners and the midpoints of its sides joined",
      panel: K.chips("mode", "Show", [["theorem", "Midpoint theorem"], ["converse", "Converse"], ["quad", "Midpoints of a quadrilateral"], ["trap", "Trapezium"]]) +
        '<div data-for="theorem">' + K.buttons([["play", "Show why (proof)"], ["reset", "Reset"]]) + '</div>' + K.hint("note"),
      readouts: [["r1", "–", "wrap"], ["r2", "–", "wrap"], ["r3", "–", "c-path"], ["r4", "–", "c-vx"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");
    function pts() { return s.mode === "quad" ? s.quad : s.mode === "trap" ? s.trap : s.tri; }
    function names() { return s.mode === "quad" || s.mode === "trap" ? ["A", "B", "C", "D"] : ["A", "B", "C"]; }

    function update() {
      LABELS[s.mode].forEach(function (t, i) { spans[i].textContent = t; });
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for === s.mode ? "" : "none"; });
      var note = "";
      if (s.mode === "theorem" || s.mode === "converse") {
        var A = s.tri[0], B = s.tri[1], C = s.tri[2], P = mid(A, B), Q = mid(A, C);
        k.set("r1", "AP = PB = " + L(D(A, P)));
        if (s.mode === "theorem") {
          k.set("r2", "AQ = QC = " + L(D(A, Q))); k.set("r3", L(D(P, Q))); k.set("r4", L(D(B, C))); k.set("r5", "1/2"); k.set("r6", cross(sub(Q, P), sub(C, B)) === 0 ? "Yes" : "No");
          note = s.t >= 1 ? "Turn △APQ half a turn about Q: it lands on △CRQ, so CR = AP = PB and CR ∥ AB. PBCR is a parallelogram, so PR = BC and PR ∥ BC. PQ is half of PR, so PQ = ½ BC."
            : "P and Q are the midpoints of AB and AC. Drag A, B or C: PQ stays parallel to BC and exactly half as long. Press “Show why” to see the proof.";
        } else {
          k.set("r2", "drawn parallel to BC"); k.set("r3", L(D(A, Q))); k.set("r4", L(D(Q, C))); k.set("r5", "Yes, AQ = QC"); k.set("r6", "PQ = " + L(D(P, Q)) + ", BC = " + L(D(B, C)));
          note = "Converse: P is the midpoint of AB, and the dashed line through P is drawn parallel to BC. It always cuts AC at its midpoint Q.";
        }
      } else if (s.mode === "quad") {
        var p = s.quad, m = [mid(p[0], p[1]), mid(p[1], p[2]), mid(p[2], p[3]), mid(p[3], p[0])];
        var ac = D(p[0], p[2]), bd = D(p[1], p[3]), perp = dot(sub(p[2], p[0]), sub(p[3], p[1])) === 0, eq = Math.abs(ac - bd) < 1e-9;
        k.set("r1", "PQ = SR = " + L(D(m[0], m[1]))); k.set("r2", L(ac / 2)); k.set("r3", "QR = PS = " + L(D(m[1], m[2]))); k.set("r4", L(bd / 2));
        k.set("r5", "PQ ∥ AC ∥ SR; QR ∥ BD ∥ PS");
        k.set("r6", perp && eq ? "square" : perp ? "rectangle" : eq ? "rhombus" : "parallelogram");
        note = "In △ABC, PQ joins midpoints, so PQ ∥ AC and PQ = ½ AC. In △ADC the same is true of SR. So PQ and SR are equal and parallel: PQRS is a parallelogram" +
          (perp && eq ? " (a square here, because AC and BD are equal and perpendicular)." : perp ? " (a rectangle here, because AC ⊥ BD)." : eq ? " (a rhombus here, because AC = BD)." : ".");
      } else {
        var t = s.trap, Mm = mid(t[0], t[3]), N = mid(t[1], t[2]), ab = D(t[0], t[1]), dc = D(t[3], t[2]);
        k.set("r1", L(ab)); k.set("r2", L(dc)); k.set("r3", L(D(Mm, N))); k.set("r4", "½ (" + L(ab) + " + " + L(dc) + ") = " + L((ab + dc) / 2)); k.set("r5", "Yes");
        k.set("r6", "midpoints of AD and BC");
        note = "AB ∥ DC. M and N are the midpoints of AD and BC. Join A to N and extend it to meet line DC: the midpoint theorem then gives MN ∥ AB and MN = ½ (AB + DC).";
      }
      k.el('[data-r="note"]').textContent = note;
      showM(); k.redraw();
    }

    function layout(W, H) {
      var m = 24, sc = Math.min((W - 2 * m) / GX, (H - 2 * m) / GY), ox = (W - GX * sc) / 2, oy = (H + GY * sc) / 2;
      view = { S: function (q) { return [ox + q[0] * sc, oy - q[1] * sc]; }, I: function (x, y) { return [(x - ox) / sc, (oy - y) / sc]; } };
      return view;
    }
    function unit(P, Q) { var dx = P[0] - Q[0], dy = P[1] - Q[1], d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; }
    function seg(ctx, P, Q, col, w, dash) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(Q[0], Q[1]); ctx.stroke(); ctx.restore(); }
    function poly(ctx, Ps, fill, alpha) { ctx.fillStyle = fill; ctx.globalAlpha = alpha; ctx.beginPath(); Ps.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
    function ticks(ctx, P, Q, n, col) {
      var mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2, u = unit(Q, P), nx = -u[1], ny = u[0];
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      for (var j = 0; j < n; j++) { var o = (j - (n - 1) / 2) * 5; ctx.beginPath(); ctx.moveTo(mx + u[0] * o - nx * 6, my + u[1] * o - ny * 6); ctx.lineTo(mx + u[0] * o + nx * 6, my + u[1] * o + ny * 6); ctx.stroke(); }
    }
    function chev(ctx, P, Q, n, col, at) {
      var u = unit(Q, P), nx = -u[1], ny = u[0], f = at || 0.5, bx = P[0] + (Q[0] - P[0]) * f, by = P[1] + (Q[1] - P[1]) * f;
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineCap = "round";
      for (var j = 0; j < n; j++) { var cx = bx + u[0] * j * 6, cy = by + u[1] * j * 6; ctx.beginPath(); ctx.moveTo(cx - u[0] * 6 - nx * 5, cy - u[1] * 6 - ny * 5); ctx.lineTo(cx, cy); ctx.lineTo(cx - u[0] * 6 + nx * 5, cy - u[1] * 6 + ny * 5); ctx.stroke(); }
      ctx.lineCap = "butt";
    }
    function label(ctx, txt, P, G, col, r, W, H) {
      var d = unit(P, G); ctx.fillStyle = col; ctx.font = "700 14px " + ctx._f; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(txt, Math.max(10, Math.min(W - 10, P[0] + d[0] * (r || 18))), Math.max(10, Math.min(H - 10, P[1] + d[1] * (r || 18))));
    }
    function lenLabel(ctx, P, Q, G, txt, col, W, H) {
      var mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2, nx = Q[1] - P[1], ny = P[0] - Q[0], nd = Math.hypot(nx, ny) || 1;
      if ((mx - G[0]) * nx + (my - G[1]) * ny < 0) { nx = -nx; ny = -ny; }
      ctx.fillStyle = col; ctx.font = "700 12px " + ctx._f; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(txt, Math.max(18, Math.min(W - 18, mx + nx / nd * 16)), Math.max(8, Math.min(H - 8, my + ny / nd * 14)));
    }

    k.draw = function (ctx, W, H, c) {
      ctx._f = c.font;
      var v = layout(W, H), S = v.S;
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      for (var x = 0; x <= GX; x++) { ctx.beginPath(); ctx.moveTo(Math.round(S([x, 0])[0]) + 0.5, S([0, 0])[1]); ctx.lineTo(Math.round(S([x, 0])[0]) + 0.5, S([0, GY])[1]); ctx.stroke(); }
      for (var y = 0; y <= GY; y++) { ctx.beginPath(); ctx.moveTo(S([0, 0])[0], Math.round(S([0, y])[1]) + 0.5); ctx.lineTo(S([GX, 0])[0], Math.round(S([0, y])[1]) + 0.5); ctx.stroke(); }
      ctx.fillStyle = c.muted; ctx.font = "10px " + c.font; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillText("1 square = 1 cm", S([GX, 0])[0], S([0, 0])[1] + 4);

      if (s.mode === "theorem" || s.mode === "converse") {
        var A = S(s.tri[0]), B = S(s.tri[1]), C = S(s.tri[2]), P = S(mid(s.tri[0], s.tri[1])), Q = S(mid(s.tri[0], s.tri[2]));
        var G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
        poly(ctx, [A, B, C], c.tint, 0.7);
        if (s.mode === "theorem" && s.t > 0) {
          var R = [2 * Q[0] - P[0], 2 * Q[1] - P[1]], e = Math.min(1, s.t), grow = Math.min(1, e / 0.3), turn = Math.max(0, (e - 0.3) / 0.7);
          turn = turn < 0.5 ? 2 * turn * turn : 1 - Math.pow(-2 * turn + 2, 2) / 2;
          if (e >= 1) { poly(ctx, [P, B, C, R], c.good, 0.14); seg(ctx, C, R, c.vy, 3); }
          seg(ctx, Q, [Q[0] + (R[0] - Q[0]) * grow, Q[1] + (R[1] - Q[1]) * grow], c.path, 3, [7, 5]);
          var th = Math.PI * turn, rot = function (X) { var dx = X[0] - Q[0], dy = X[1] - Q[1]; return [Q[0] + dx * Math.cos(th) - dy * Math.sin(th), Q[1] + dx * Math.sin(th) + dy * Math.cos(th)]; };
          if (turn > 0) { var A2 = rot(A), P2 = rot(P); poly(ctx, [A2, P2, Q], c.vy, 0.25); ctx.strokeStyle = c.vy; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(A2[0], A2[1]); ctx.lineTo(P2[0], P2[1]); ctx.lineTo(Q[0], Q[1]); ctx.closePath(); ctx.stroke(); }
          if (grow >= 1) { M.dot(ctx, R[0], R[1], 5, c.path); label(ctx, "R", R, Q, c.path, 16, W, H); }
        }
        ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.stroke();
        seg(ctx, B, C, c.vx, 4);
        ticks(ctx, A, P, 1, c.ink); ticks(ctx, P, B, 1, c.ink); ticks(ctx, A, Q, 2, c.ink); ticks(ctx, Q, C, 2, c.ink);
        if (s.mode === "converse") {
          var u = unit(C, B), ext = 2.2 * Math.max(W, H), e2 = Math.min(1, s.t || 1);
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
          seg(ctx, [P[0] - u[0] * ext * 0.08 * e2, P[1] - u[1] * ext * 0.08 * e2], [P[0] + u[0] * (D(P, Q) + 60) * e2, P[1] + u[1] * (D(P, Q) + 60) * e2], c.path, 2, [7, 5]);
          ctx.restore();
        }
        seg(ctx, P, Q, c.path, 4);
        chev(ctx, P, Q, 1, c.path, 0.6); chev(ctx, B, C, 1, c.vx, 0.6);
        lenLabel(ctx, B, C, G, L(D(s.tri[1], s.tri[2])) + " cm", c.vx, W, H);
        var mpq = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2], up = unit(A, mpq);
        ctx.fillStyle = c.path; ctx.font = "700 12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (!(s.mode === "theorem" && s.t > 0.3)) ctx.fillText(L(D(mid(s.tri[0], s.tri[1]), mid(s.tri[0], s.tri[2]))) + " cm", mpq[0] - up[0] * 14, mpq[1] - up[1] * 14);
        [[A, "A"], [B, "B"], [C, "C"]].forEach(function (q) { M.dot(ctx, q[0][0], q[0][1], drag >= 0 && names()[drag] === q[1] ? 8 : 6, c.ink, c.surface); label(ctx, q[1], q[0], G, c.ink, 20, W, H); });
        [[P, "P"], [Q, "Q"]].forEach(function (q) { M.dot(ctx, q[0][0], q[0][1], 5, c.path); label(ctx, q[1], q[0], G, c.path, 18, W, H); });
      } else {
        var p = (s.mode === "quad" ? s.quad : s.trap).map(S), G2 = [(p[0][0] + p[1][0] + p[2][0] + p[3][0]) / 4, (p[0][1] + p[1][1] + p[2][1] + p[3][1]) / 4];
        poly(ctx, p, c.tint, 0.7);
        ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.beginPath(); p.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.stroke();
        if (s.mode === "quad") {
          var m = [0, 1, 2, 3].map(function (i) { return mid(p[i], p[(i + 1) % 4]); });
          seg(ctx, p[0], p[2], c.vx, 1.8, [6, 5]); seg(ctx, p[1], p[3], c.vy, 1.8, [6, 5]);
          poly(ctx, m, c.path, 0.12);
          seg(ctx, m[0], m[1], c.vx, 3.5); seg(ctx, m[3], m[2], c.vx, 3.5); seg(ctx, m[1], m[2], c.vy, 3.5); seg(ctx, m[0], m[3], c.vy, 3.5);
          chev(ctx, m[0], m[1], 1, c.vx); chev(ctx, m[3], m[2], 1, c.vx); chev(ctx, p[0], p[2], 1, c.vx, 0.75);
          chev(ctx, m[1], m[2], 2, c.vy); chev(ctx, m[0], m[3], 2, c.vy); chev(ctx, p[1], p[3], 2, c.vy, 0.75);
          for (var i = 0; i < 4; i++) { ticks(ctx, p[i], m[i], i + 1, c.muted); ticks(ctx, m[i], p[(i + 1) % 4], i + 1, c.muted); }
          ["P", "Q", "R", "S"].forEach(function (n, i) { M.dot(ctx, m[i][0], m[i][1], 5, c.path); label(ctx, n, m[i], G2, c.path, 17, W, H); });
        } else {
          var Mm = mid(p[0], p[3]), N = mid(p[1], p[2]);
          seg(ctx, p[0], p[1], c.vx, 4); seg(ctx, p[3], p[2], c.vy, 4); seg(ctx, Mm, N, c.path, 4);
          chev(ctx, p[0], p[1], 1, c.vx, 0.6); chev(ctx, p[3], p[2], 1, c.vy, 0.6); chev(ctx, Mm, N, 1, c.path, 0.6);
          ticks(ctx, p[0], Mm, 1, c.ink); ticks(ctx, Mm, p[3], 1, c.ink); ticks(ctx, p[1], N, 2, c.ink); ticks(ctx, N, p[2], 2, c.ink);
          var t = s.trap;
          lenLabel(ctx, p[0], p[1], G2, L(D(t[0], t[1])) + " cm", c.vx, W, H); lenLabel(ctx, p[3], p[2], G2, L(D(t[3], t[2])) + " cm", c.vy, W, H);
          ctx.fillStyle = c.path; ctx.font = "700 12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          ctx.fillText(L(D(mid(t[0], t[3]), mid(t[1], t[2]))) + " cm", (Mm[0] + N[0]) / 2, Mm[1] - 6);
          [[Mm, "M"], [N, "N"]].forEach(function (q) { M.dot(ctx, q[0][0], q[0][1], 5, c.path); label(ctx, q[1], q[0], G2, c.path, 17, W, H); });
        }
        ["A", "B", "C", "D"].forEach(function (n, i) { M.dot(ctx, p[i][0], p[i][1], drag === i ? 8 : 6, c.ink, c.surface); label(ctx, n, p[i], G2, c.ink, 20, W, H); });
      }
    };

    function at(e) { var r = k.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    k.canvas.addEventListener("pointerdown", function (e) {
      if (!view) return; var q = at(e), best = 26;
      pts().forEach(function (p, i) { var d = M.dist(q, view.S(p)); if (d < best) { best = d; drag = i; } });
      if (drag >= 0) { clock.stop(); s.t = 0; k.canvas.setPointerCapture(e.pointerId); update(); }
    });
    k.canvas.addEventListener("pointermove", function (e) {
      if (drag < 0) return;
      var q = at(e), g = view.I(q[0], q[1]); g = [Math.max(0, Math.min(GX, Math.round(g[0]))), Math.max(0, Math.min(GY, Math.round(g[1])))];
      var cur = pts(), np = cur.map(function (p) { return p.slice(); });
      if (s.mode === "trap") {   // A, B share a line; C, D share a parallel line
        np[drag] = g; var mate = [1, 0, 3, 2][drag]; np[mate][1] = g[1];
        if (np[0][1] === np[3][1] || np[0][0] >= np[1][0] || np[3][0] >= np[2][0]) return;
      } else np[drag] = g;
      if (np.every(function (p, i) { return p[0] === cur[i][0] && p[1] === cur[i][1]; })) return;
      if (!convex(np)) return;
      if (s.mode === "quad") s.quad = np; else if (s.mode === "trap") s.trap = np; else s.tri = np;
      update();
    });
    function up() { if (drag >= 0) { drag = -1; k.redraw(); } }
    k.canvas.addEventListener("pointerup", up); k.canvas.addEventListener("pointercancel", up);

    var clock = K.clock(function (dt) { s.t = Math.min(1, s.t + dt / (s.mode === "theorem" ? 2.6 : 0.9)); k.redraw(); if (s.t >= 1) update(); return s.t < 1; });
    function play() { if (s.mode === "converse" || (s.mode === "theorem" && s.proof)) animate(); }
    function animate() {
      if (s.mode !== "theorem" && s.mode !== "converse") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { s.t = 1; update(); return; }
      clock.stop(); s.t = 0; update(); clock.start();
    }
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { clock.stop(); s.mode = v; s.t = 0; update(); });
    k.onAct({ play: animate, reset: function () { clock.stop(); s.t = 0; update(); } });
    update();
    return {
      set: function (o) {
        clock.stop(); s.t = o.t || 0; s.proof = !!o.proof;
        if (o.mode) s.mode = o.mode;
        ["tri", "quad", "trap"].forEach(function (q) { if (o[q]) s[q] = o[q].map(c2); });
        if (o.t == null && s.mode === "converse") s.t = 1;
        update();
      },
      play: play,
      seek: function (t) { clock.stop(); s.t = t; update(); },
      state: function () { return { mode: s.mode, tri: s.tri, quad: s.quad, trap: s.trap, t: s.t }; }
    };
  }
  window.QuadsMidSim = { mount: mount };
})();
