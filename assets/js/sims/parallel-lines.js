/*
 * Parallel lines and a transversal (Std 9 Geometry Ch. 2). Three views:
 *   pairs – lines l and m cut by transversal t; the eight angles a b c d (at l) and p q r s (at m).
 *           Choose a kind of pair (corresponding, alternate interior, alternate exterior, interior);
 *           turn line m or drag the ends of t and m. The properties hold exactly when l ∥ m.
 *   sum   – a line PQ through A parallel to BC: ∠PAB = ∠B and ∠QAC = ∠C (alternate angles), so the
 *           angles of the triangle add up to 180°. "Play" turns copies of ∠B and ∠C up to A.
 *   test  – the converse tests: set the angle at m; l ∥ m exactly when the chosen pair passes the test.
 * Needs sim-kit.js and math-kit.js.  ParallelSim.mount(el, { mode: "pairs", pair: "corr", th: 60, phi: 0 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, R = Math.PI / 180;
  var PAIRS = {
    corr:   { name: "Corresponding", sets: [["a", "p"], ["d", "s"]], rel: "eq" },
    altint: { name: "Alternate interior", sets: [["c", "p"], ["d", "q"]], rel: "eq" },
    altext: { name: "Alternate exterior", sets: [["a", "r"], ["b", "s"]], rel: "eq" },
    int:    { name: "Interior, same side", sets: [["d", "p"], ["c", "q"]], rel: "sum" }
  };
  var TESTS = {
    corr: { name: "Corresponding angles", pair: ["a", "p"], rel: "eq", law: "corresponding angle test" },
    alt:  { name: "Alternate angles", pair: ["c", "p"], rel: "eq", law: "alternate angle test" },
    int:  { name: "Interior angles", pair: ["d", "p"], rel: "sum", law: "interior angle test" },
    perp: { name: "Both ⊥ t", pair: ["d", "p"], rel: "perp", law: "two lines perpendicular to the same line" }
  };
  var LABELS = {
    pairs: ["Pair 1", "Pair 2", "Lines l and m", "These angles are", "Interior angles ∠d + ∠p", "Angle between l and m"],
    sum:   ["∠B", "∠C", "∠BAC", "∠PAB = ∠B", "∠QAC = ∠C", "∠PAB + ∠BAC + ∠QAC"],
    test:  ["Angle at l", "Angle at m", "Test", "Passes the test?", "Lines l and m", "Angle between l and m"]
  };

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "pl";
    var s = Object.assign({ mode: "pairs", pair: "corr", test: "corr", th: 60, phi: 0, pm: 60, B: 55, C: 70, t: 0 }, opts);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var drag = null, G = null;

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "Two lines cut by a transversal, with the angles they make",
      panel: K.chips("mode", "Show", [["pairs", "Angle pairs"], ["sum", "Angle sum of a triangle"], ["test", "Tests"]]) +
        '<div data-for="pairs">' + K.chips("pair", "Pairs", Object.keys(PAIRS).map(function (q) { return [q, PAIRS[q].name]; })) + '</div>' +
        '<div data-for="test">' + K.chips("test", "Test", Object.keys(TESTS).map(function (q) { return [q, TESTS[q].name]; })) + '</div>' +
        '<div data-for="pairs test" data-th>' + K.slider(id, "th", "Transversal angle", 30, 150, 1, "°") + '</div>' +
        '<div data-for="pairs">' + K.slider(id, "phi", "Turn line m", -25, 25, 1, "°") + K.buttons([["par", "Make l ∥ m"]]) + '</div>' +
        '<div data-for="test">' + K.slider(id, "pm", "∠p (the angle at m)", 20, 160, 1, "°") + '</div>' +
        '<div data-for="sum">' + K.slider(id, "B", "∠B", 20, 120, 1, "°") + K.slider(id, "C", "∠C", 20, 120, 1, "°") + K.buttons([["play", "Turn ∠B and ∠C up to A"], ["back", "Reset"]]) + '</div>' +
        K.hint("note"),
      readouts: [["r1", "–", "c-path wrap"], ["r2", "–", "c-vx wrap"], ["r3", "–", "wrap"], ["r4", "–", "wrap"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");

    // angle (degrees) of line m and the eight angles
    function phi() { return s.mode === "test" ? (s.test === "perp" ? 90 : s.th) - s.pm : s.phi; }
    function th() { return s.mode === "test" && s.test === "perp" ? 90 : s.th; }
    function angles() {
      var t = th(), f = phi(), x = t - f;
      return { a: t, b: 180 - t, c: t, d: 180 - t, p: x, q: 180 - x, r: x, s: 180 - x };
    }
    function meetSide() { var f = phi(); return Math.abs(f) < 1e-9 ? "" : f > 0 ? "right" : "left"; }   // m turned anticlockwise rises to the right and meets l there

    function update() {
      LABELS[s.mode].forEach(function (t, i) { spans[i].textContent = t; });
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for.split(" ").indexOf(s.mode) >= 0 ? "" : "none"; });
      root.querySelector("[data-th]").style.display = s.mode === "pairs" || (s.mode === "test" && s.test !== "perp") ? "" : "none";
      var A = angles(), par = Math.abs(phi()) < 1e-9, side = meetSide(), note = "";
      var linesTxt = par ? "Parallel" : "Not parallel: they meet on the " + side;
      if (s.mode === "pairs") {
        var P = PAIRS[s.pair], tx = P.sets.map(function (q) { return "∠" + q[0] + "\u00a0=\u00a0" + A[q[0]] + "°, ∠" + q[1] + "\u00a0=\u00a0" + A[q[1]] + "°"; });
        k.set("r1", tx[0]); k.set("r2", tx[1]); k.set("r3", linesTxt);
        var ok = P.sets.every(function (q) { return P.rel === "eq" ? A[q[0]] === A[q[1]] : A[q[0]] + A[q[1]] === 180; });
        k.set("r4", P.rel === "eq" ? (ok ? "Equal" : "Not equal") : (ok ? "Supplementary (sum 180°)" : "Not supplementary: " + (A[P.sets[0][0]] + A[P.sets[0][1]]) + "° and " + (A[P.sets[1][0]] + A[P.sets[1][1]]) + "°"));
        k.set("r5", A.d + "° + " + A.p + "° = " + (A.d + A.p) + "°"); k.set("r6", Math.abs(phi()) + "°");
        note = par ? (P.rel === "eq" ? P.name + " angles are equal when l ∥ m. Drag the top of t: they stay equal." : "Interior angles on the same side add up to 180° when l ∥ m. Drag the top of t: the sum stays 180°.")
          : "Line m is turned by " + Math.abs(phi()) + "°, so l and m are not parallel and the property fails. The interior angles on the " + side + " add up to less than 180°: that is the side where the lines meet.";
      } else if (s.mode === "sum") {
        var Aa = 180 - s.B - s.C;
        k.set("r1", s.B + "°"); k.set("r2", s.C + "°"); k.set("r3", Aa > 0 ? Aa + "°" : "–");
        k.set("r4", Aa > 0 ? s.B + "° (alternate angles)" : "–"); k.set("r5", Aa > 0 ? s.C + "° (alternate angles)" : "–");
        k.set("r6", Aa > 0 ? s.B + "° + " + Aa + "° + " + s.C + "° = 180°" : "–");
        note = Aa <= 0 ? "∠B + ∠C must be less than 180°, or there is no triangle."
          : "Line PQ ∥ seg BC. With transversal AB, ∠PAB = ∠ABC; with transversal AC, ∠QAC = ∠ACB. The three angles at A make a straight angle, so ∠A + ∠B + ∠C = 180°.";
      } else {
        var T = TESTS[s.test], x = A[T.pair[0]], y = A[T.pair[1]], pass = T.rel === "eq" ? x === y : T.rel === "sum" ? x + y === 180 : y === 90;
        k.set("r1", T.rel === "perp" ? "l ⊥ t: ∠d = 90°" : "∠" + T.pair[0] + " = " + x + "°");
        k.set("r2", "∠p = " + s.pm + "°");
        k.set("r3", T.rel === "eq" ? "∠" + T.pair[0] + " = ∠p ?" : T.rel === "sum" ? "∠d + ∠p = 180° ? (now " + (x + y) + "°)" : "m ⊥ t ?");
        k.set("r4", pass ? "Yes" : "No"); k.set("r5", linesTxt); k.set("r6", Math.abs(phi()) + "°");
        note = pass ? (T.rel === "perp" ? "l and m are both perpendicular to t, so l ∥ m." : "The pair passes the " + T.law + ", so l ∥ m.") : T.rel === "perp" ? "Set ∠p to 90°: when l and m are both perpendicular to t, they are parallel." : T.rel === "eq" ? "Make ∠p equal to ∠" + T.pair[0] + " (" + x + "°): exactly then the lines become parallel." : "Make ∠d + ∠p = 180° (∠p = " + (180 - x) + "°): exactly then the lines become parallel.";
      }
      k.el('[data-r="note"]').textContent = note;
      k.btn("par").disabled = par;
      k.redraw();
    }

    function dir(deg) { return [Math.cos(deg * R), -Math.sin(deg * R)]; }
    function add(P, d, r) { return [P[0] + d[0] * r, P[1] + d[1] * r]; }
    function clipLine(ctx, P, deg, W, H) { var d = dir(deg), L = W + H; ctx.beginPath(); ctx.moveTo(P[0] - d[0] * L, P[1] - d[1] * L); ctx.lineTo(P[0] + d[0] * L, P[1] + d[1] * L); ctx.stroke(); }

    function drawLines(ctx, W, H, c) {
      var big = W > 600, t = th(), f = phi(), A = angles();
      var P = [W * 0.5 + (t - 90) * 0.0, H * 0.3], dist = (H * 0.4) / Math.sin(t * R), Q = [P[0] - Math.cos(t * R) * dist, P[1] + H * 0.4];
      // keep both crossings near the middle
      var shift = W * 0.5 - (P[0] + Q[0]) / 2; P[0] += shift; Q[0] += shift;
      G = { P: P, Q: Q };
      ctx.lineCap = "round";
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; clipLine(ctx, P, 0, W, H);
      ctx.strokeStyle = Math.abs(f) < 1e-9 ? c.good : c.ink; clipLine(ctx, Q, f, W, H);
      ctx.strokeStyle = c.muted; ctx.lineWidth = 2; clipLine(ctx, P, t, W, H);
      // which angles to colour
      var hi = {};
      if (s.mode === "pairs") PAIRS[s.pair].sets.forEach(function (q, i) { hi[q[0]] = hi[q[1]] = i ? c.vx : c.path; });
      else { var T = TESTS[s.test]; hi[T.pair[0]] = c.path; hi[T.pair[1]] = c.vx; }
      var defs = { a: [P, 0, t], b: [P, t, 180], c: [P, 180, t + 180], d: [P, t + 180, 360], p: [Q, f, t], q: [Q, t, f + 180], r: [Q, f + 180, t + 180], s: [Q, t + 180, f + 360] };
      var rr = big ? 30 : 21;
      Object.keys(defs).forEach(function (n) {
        var D = defs[n], V = D[0], mid = (D[1] + D[2]) / 2, m = dir(mid);
        if (hi[n]) {
          var right = (s.mode === "test" && s.test === "perp" && A[n] === 90);
          M.arc(ctx, V, add(V, dir(D[1]), 50), add(V, dir(D[2]), 50), rr, hi[n], A[n] + "°", c, right);
          ctx.fillStyle = hi[n]; ctx.font = "700 " + (big ? 13 : 11) + "px " + c.font;
        } else { ctx.fillStyle = c.muted; ctx.font = (big ? 13 : 11) + "px " + c.font; }
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        var lr = hi[n] ? rr * 0.55 : rr * 0.75;
        if (A[n] < 40 && hi[n]) lr = rr + (big ? 34 : 28);   // thin wedge: letter goes outside, past the value
        ctx.fillText(n, V[0] + m[0] * lr, V[1] + m[1] * lr);
      });
      M.dot(ctx, P[0], P[1], 3.5, c.ink); M.dot(ctx, Q[0], Q[1], 3.5, c.ink);
      // line names and drag handles
      ctx.font = "italic 700 " + (big ? 17 : 14) + "px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillStyle = c.ink; ctx.fillText("l", 8, P[1] - 4);
      var mL = [8, Q[1] + Math.tan(f * R) * (Q[0] - 8)];
      ctx.fillStyle = Math.abs(f) < 1e-9 ? c.good : c.ink; if (mL[1] > 14 && mL[1] < H - 4) ctx.fillText("m", mL[0], mL[1] - 4);
      var tTop = add(P, dir(t), Math.min((P[1] - 12) / Math.sin(t * R), W));
      ctx.fillStyle = c.muted; ctx.fillText("t", tTop[0] + 8, tTop[1] + 18);
      var mEnd = add(Q, dir(f), Math.min(W * 0.42, (Math.abs(Math.sin(f * R)) > 0.01 ? Math.abs((f > 0 ? Q[1] - 12 : H - 12 - Q[1]) / Math.sin(f * R)) : W)));
      G.tTop = tTop; G.mEnd = mEnd;
      if (s.mode !== "sum") {
        M.dot(ctx, tTop[0], tTop[1], 7, c.surface, c.muted);
        M.dot(ctx, mEnd[0], mEnd[1], 7, c.surface, c.ink);
      }
      if (s.mode === "test" && s.test === "perp") { ctx.save(); M.arc(ctx, P, add(P, dir(270), 50), add(P, dir(360), 50), rr, c.path, null, c, true); ctx.restore(); }
      if (Math.abs(f) < 1e-9) {   // arrow marks for parallel lines
        [P, Q].forEach(function (V) { var x = Math.round(W * 0.14) + 10, y = V[1]; ctx.strokeStyle = c.good; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x - 6, y - 6); ctx.lineTo(x, y); ctx.lineTo(x - 6, y + 6); ctx.stroke(); });
      }
    }

    function drawSum(ctx, W, H, c) {
      var big = W > 600, Aa = 180 - s.B - s.C;
      if (Aa <= 0) { ctx.fillStyle = c.bad; ctx.font = "700 14px " + c.font; ctx.textAlign = "center"; ctx.fillText("∠B + ∠C must be less than 180°", W / 2, H / 2); return; }
      var by = H * 0.85, top = H * 0.25, h = by - top, tb = Math.tan(s.B * R), tc = Math.tan(s.C * R);
      var base = h / tb + h / tc, sc = Math.min(1, (W - 60) / base), hh = h * sc;
      var bw = hh / tb + hh / tc, Bx = (W - bw) / 2, B = [Bx, by], C = [Bx + bw, by], A = [Bx + hh / tb, by - hh];
      if (A[0] < 30) { var sh = 30 - A[0]; B[0] += sh; C[0] += sh; A[0] += sh; }
      if (A[0] > W - 30) { var sh2 = A[0] - (W - 30); B[0] -= sh2; C[0] -= sh2; A[0] -= sh2; }
      ctx.fillStyle = c.tint; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.strokeStyle = c.good; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(6, A[1]); ctx.lineTo(W - 6, A[1]); ctx.stroke();
      var rr = big ? 34 : 24, Pp = [A[0] - 60, A[1]], Qp = [A[0] + 60, A[1]];
      // copies of ∠B and ∠C turned half a turn about the midpoints of AB and AC
      function wedge(V, U, Wp, col, mid, t) {
        ctx.save(); ctx.translate(mid[0], mid[1]); ctx.rotate(Math.PI * t); ctx.translate(-mid[0], -mid[1]);
        M.arc(ctx, V, U, Wp, rr, col, null, c); ctx.restore();
      }
      var mAB = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], mAC = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2];
      M.arc(ctx, B, A, C, rr, c.path, s.B + "°", c);
      M.arc(ctx, C, A, B, rr, c.vx, s.C + "°", c);
      M.arc(ctx, A, B, C, rr * 0.8, c.vy, Aa + "°", c);
      if (s.t > 0) { wedge(B, A, C, c.path, mAB, s.t); wedge(C, A, B, c.vx, mAC, s.t); }
      if (s.t >= 1) {
        M.arc(ctx, A, Pp, B, rr, c.path, s.B + "°", c);
        M.arc(ctx, A, Qp, C, rr, c.vx, s.C + "°", c);
      } else {
        ctx.globalAlpha = 0.35; M.arc(ctx, A, Pp, B, rr, c.muted, null, c); M.arc(ctx, A, Qp, C, rr, c.muted, null, c); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = c.ink; ctx.font = "700 " + (big ? 17 : 14) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("A", A[0], A[1] - 16); ctx.fillText("B", B[0] - 14, B[1] + 6); ctx.fillText("C", C[0] + 14, C[1] + 6);
      ctx.fillStyle = c.good; ctx.fillText("P", 14, A[1] - 14); ctx.fillText("Q", W - 14, A[1] - 14);
      var ax = W * 0.12; ctx.strokeStyle = c.good; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(ax - 6, A[1] - 6); ctx.lineTo(ax, A[1]); ctx.lineTo(ax - 6, A[1] + 6); ctx.stroke();
      var mx = (B[0] + C[0]) / 2; ctx.strokeStyle = c.good; ctx.beginPath(); ctx.moveTo(mx - 6, by - 6); ctx.lineTo(mx, by); ctx.lineTo(mx - 6, by + 6); ctx.stroke();
    }

    k.draw = function (ctx, W, H, c) { if (s.mode === "sum") drawSum(ctx, W, H, c); else drawLines(ctx, W, H, c); };

    // dragging the top of t (transversal angle) and the end of m (turn m)
    function pos(e) { var r = k.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    k.canvas.addEventListener("pointerdown", function (e) {
      if (s.mode === "sum" || !G || !G.tTop) return;
      var p = pos(e), dt = Math.hypot(p[0] - G.tTop[0], p[1] - G.tTop[1]), dm = Math.hypot(p[0] - G.mEnd[0], p[1] - G.mEnd[1]);
      if (Math.min(dt, dm) > 28) return;
      drag = dt < dm && !(s.mode === "test" && s.test === "perp") ? "t" : "m"; k.canvas.setPointerCapture(e.pointerId); move(e);
    });
    function move(e) {
      if (!drag) return;
      var p = pos(e);
      if (drag === "t") {
        var a = Math.round(Math.atan2(G.P[1] - p[1], p[0] - G.P[0]) / R);
        s.th = Math.max(30, Math.min(150, a));
      } else {
        var f = Math.round(Math.atan2(G.Q[1] - p[1], p[0] - G.Q[0]) / R);
        if (s.mode === "pairs") s.phi = Math.max(-25, Math.min(25, f));
        else s.pm = Math.max(20, Math.min(160, th() - f));
      }
      showAll(); update();
    }
    k.canvas.addEventListener("pointermove", move);
    k.canvas.addEventListener("pointerup", function () { drag = null; });
    k.canvas.addEventListener("pointercancel", function () { drag = null; });

    var clock = K.clock(function (dt) {
      if (s.mode === "sum") { s.t = Math.min(1, s.t + dt / 1.6); update(); return s.t < 1; }
      var st = 20 * dt; s.phi = Math.abs(s.phi) <= st ? 0 : s.phi - Math.sign(s.phi) * st;
      if (s.phi === 0) s.phi = 0; showAll(); update(); return s.phi !== 0;
    });
    function roundPhi() { s.phi = Math.round(s.phi); }
    clock.onStop = roundPhi;
    function play() {
      if (s.mode !== "sum") return;
      clock.stop(); s.t = 0;
      if (reduce) { s.t = 1; update(); return; }
      clock.start();
    }
    k.onAct({
      play: play,
      back: function () { clock.stop(); s.t = 0; update(); },
      par: function () { clock.stop(); if (reduce) { s.phi = 0; showAll(); update(); } else clock.start(); }
    });
    var shows = ["th", "phi", "pm", "B", "C"].map(function (q) { return k.bindSlider(q, function () { return Math.round(s[q]); }, function (v) { clock.stop(); s[q] = v; if (q === "B" || q === "C") s.t = 0; update(); }, function (v) { return Math.round(v) + "°"; }); });
    function showAll() { shows.forEach(function (fn) { fn(); }); }
    var showMode = k.bindChips("mode", function () { return s.mode; }, function (v) { clock.stop(); s.mode = v; s.t = 0; update(); });
    var showPair = k.bindChips("pair", function () { return s.pair; }, function (v) { s.pair = v; update(); });
    var showTest = k.bindChips("test", function () { return s.test; }, function (v) { s.test = v; update(); });
    update();
    return {
      set: function (o) { clock.stop(); s.t = 0; Object.assign(s, o); showAll(); showMode(); showPair(); showTest(); update(); },
      play: play,
      seek: function (t) { clock.stop(); s.t = Math.max(0, Math.min(1, t)); update(); },
      state: function () { return Object.assign({ angles: angles(), parallel: Math.abs(phi()) < 1e-9 }, s); }
    };
  }
  window.ParallelSim = { mount: mount };
})();
