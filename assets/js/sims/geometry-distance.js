/*
 * Points on a number line (Std 9 Geometry Ch. 1). Four views:
 *   dist  – drag A and B: co-ordinates and d(A, B) = greater − smaller = |a − b|
 *   betw  – drag A, P and B: is d(A, P) + d(P, B) = d(A, B)? Then A-P-B (P is between A and B)
 *   mid   – drag A and B: the midpoint M, with seg AM ≅ seg MB
 *   three – set three distances: which point is between the others, or are the points not collinear?
 * Needs sim-kit.js and math-kit.js.  GeoDistSim.mount(el, { mode: "dist", a: -2, b: 5 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, f = M.frac;
  var LO = -7, HI = 7;
  var LABELS = {
    dist:  ["Co-ordinate of A", "Co-ordinate of B", "d(A, B)", "Greater − smaller", "|a − b|", "d(B, A)"],
    betw:  ["d(A, P)", "d(P, B)", "d(A, B)", "d(A, P) + d(P, B)", "Is P between A and B?", "Order on the line"],
    mid:   ["Co-ordinate of A", "Co-ordinate of B", "Midpoint M", "d(A, M)", "d(M, B)", "seg AM ≅ seg MB?"],
    three: ["d(A, B)", "d(B, C)", "d(A, C)", "Largest distance", "Sum of the other two", "Result"]
  };

  function br(x) { return x < 0 ? "(" + f(x) + ")" : f(x); }   // −2 → (−2) after a minus sign
  function near(a, b) { return Math.abs(a - b) < 1e-9; }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "gd";
    var s = Object.assign({ mode: "dist", a: -2, b: 5, p: 1, ab: 7, bc: 3, ac: 4 }, opts);
    var drag = null, pts = [];

    var k = K.frame(root, {
      aspect: "16 / 9",
      label: "A number line with points that can be dragged; distances between them are measured",
      panel: K.chips("mode", "Show", [["dist", "Distance"], ["betw", "Betweenness"], ["mid", "Midpoint"], ["three", "From distances"]]) +
        '<div data-for="dist betw mid"><p class="sim-hint" style="margin:0">Drag the points along the line.</p></div>' +
        '<div data-for="three">' + K.slider(id, "ab", "d(A, B)", 1, 12, 0.5, "") + K.slider(id, "bc", "d(B, C)", 1, 12, 0.5, "") + K.slider(id, "ac", "d(A, C)", 1, 12, 0.5, "") + '</div>' +
        K.hint("note"),
      readouts: [["r1", "–", "c-path"], ["r2", "–", "c-vx"], ["r3", "–", "c-vy wrap"], ["r4", "–", "wrap"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");

    function threeCase() {   // collinear arrangement from three distances
      var d = { AB: s.ab, BC: s.bc, AC: s.ac }, big = Math.max(s.ab, s.bc, s.ac);
      if (near(s.ab + s.bc, s.ac)) return { kind: "line", order: "A-B-C", mid: "B", big: "AC" };
      if (near(s.ab + s.ac, s.bc)) return { kind: "line", order: "B-A-C", mid: "A", big: "BC" };
      if (near(s.bc + s.ac, s.ab)) return { kind: "line", order: "A-C-B", mid: "C", big: "AB" };
      var bigName = d.AB === big ? "AB" : d.BC === big ? "BC" : "AC";
      return { kind: big < s.ab + s.bc + s.ac - big ? "tri" : "none", big: bigName };
    }

    function update() {
      LABELS[s.mode].forEach(function (t, i) { spans[i].textContent = t; });
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for.split(" ").indexOf(s.mode) >= 0 ? "" : "none"; });
      var a = s.a, b = s.b, p = s.p, note = "";
      if (s.mode === "dist") {
        var g = Math.max(a, b), l = Math.min(a, b), d = g - l;
        k.set("r1", f(a)); k.set("r2", f(b)); k.set("r3", f(d));
        k.set("r4", f(g) + " − " + br(l) + " = " + f(d)); k.set("r5", "|" + f(a) + " − " + br(b) + "| = " + f(d)); k.set("r6", f(d));
        note = near(a, b) ? "A and B are at the same place, so d(A, B) = 0." : "Subtract the smaller co-ordinate from the greater one. The distance is never negative, and d(A, B) = d(B, A).";
      } else if (s.mode === "betw") {
        var ap = Math.abs(a - p), pb = Math.abs(p - b), abd = Math.abs(a - b), yes = near(ap + pb, abd);
        var order = [["A", a], ["P", p], ["B", b]].sort(function (x, y) { return x[1] - y[1]; }).map(function (x) { return x[0]; });
        var same = near(a, p) || near(p, b) || near(a, b);
        k.set("r1", f(ap)); k.set("r2", f(pb)); k.set("r3", f(abd)); k.set("r4", f(ap) + " + " + f(pb) + " = " + f(ap + pb));
        k.set("r5", same ? "Points must be distinct" : yes ? "Yes: A-P-B" : "No");
        k.set("r6", same ? "–" : order.join("-"));
        if (same) note = "Two of the points are on top of each other. Betweenness needs three distinct points.";
        else if (yes) note = "d(A, P) + d(P, B) = d(A, B), so P lies between A and B. We write A-P-B.";
        else note = f(ap) + " + " + f(pb) + " ≠ " + f(abd) + ", so P is not between A and B. Here " + order[1] + " is the point in the middle.";
      } else if (s.mode === "mid") {
        var m = (a + b) / 2, am = Math.abs(a - m);
        k.set("r1", f(a)); k.set("r2", f(b)); k.set("r3", "(" + f(a) + " + " + br(b) + ") ÷ 2 = " + f(m));
        k.set("r4", f(am)); k.set("r5", f(am)); k.set("r6", near(a, b) ? "–" : "Yes, both " + f(am));
        note = near(a, b) ? "Pull A and B apart to make a segment." : "A-M-B and seg AM ≅ seg MB, so M is the midpoint of seg AB. Every segment has exactly one midpoint.";
      } else {
        var T = threeCase(), dd = { AB: s.ab, BC: s.bc, AC: s.ac }, big = dd[T.big], rest = s.ab + s.bc + s.ac - big;
        k.set("r1", f(s.ab)); k.set("r2", f(s.bc)); k.set("r3", f(s.ac));
        k.set("r4", "d(" + T.big[0] + ", " + T.big[1] + ") = " + f(big)); k.set("r5", f(rest));
        k.set("r6", T.kind === "line" ? T.order + ", " + T.mid + " is between" : T.kind === "tri" ? "Not collinear" : "No such points");
        note = T.kind === "line" ? "The two smaller distances add up to the largest, so the points are collinear and " + T.mid + " is between the other two: " + T.order + "."
          : T.kind === "tri" ? f(rest) + " ≠ " + f(big) + ", so no point is between the other two. The points are not collinear: they make a triangle."
          : "The largest distance is more than the sum of the other two. No three points can have these distances.";
      }
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    // ---- drawing helpers
    function bracket(ctx, c, x1, x2, y, up, txt, col) {
      var t = up ? 6 : -6;
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(x1, y + t); ctx.lineTo(x1, y); ctx.lineTo(x2, y); ctx.lineTo(x2, y + t); ctx.stroke();
      ctx.fillStyle = col; ctx.font = "700 " + (k.W > 600 ? 14 : 12) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = up ? "bottom" : "top";
      var mx = (x1 + x2) / 2, w = ctx.measureText(txt).width;
      mx = Math.max(w / 2 + 4, Math.min(k.W - w / 2 - 4, mx));
      ctx.fillText(txt, mx, up ? y - 3 : y + 3);
    }
    function ticks(ctx, c, X, y0, W) {
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2;
      SimKit.arrow(ctx, X(LO) - 10, y0, 8, y0, c.ink, 2, 9); SimKit.arrow(ctx, X(HI) + 10, y0, W - 8, y0, c.ink, 2, 9);
      ctx.beginPath(); ctx.moveTo(X(LO) - 10, y0); ctx.lineTo(X(HI) + 10, y0); ctx.stroke();
      var u = X(1) - X(0), every = u < 26 ? 2 : 1;
      ctx.fillStyle = c.muted; ctx.font = (W > 600 ? 13 : 11) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (var x = LO; x <= HI; x++) {
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(x), y0 - 5); ctx.lineTo(X(x), y0 + 5); ctx.stroke();
        if (x % every === 0) ctx.fillText(String(x).replace("-", "−"), X(x), y0 + 8);
      }
    }
    function pointLabels(ctx, c, list, y0) {   // list: [name, px, col]; stagger labels that would collide
      list = list.slice().sort(function (p, q) { return p[1] - q[1]; });
      var lastX = -1e9, lvl = 0;
      list.forEach(function (q) {
        lvl = q[1] - lastX < 16 ? lvl + 1 : 0; lastX = q[1];
        M.dot(ctx, q[1], y0, 6.5, q[2], c.surface);
        var big = k.W > 600; ctx.fillStyle = q[2]; ctx.font = "700 " + (big ? 18 : 15) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(q[0], q[1], y0 - 10 - lvl * (big ? 19 : 16));
      });
    }

    k.draw = function (ctx, W, H, c) {
      pts = [];
      if (s.mode === "three") { drawThree(ctx, W, H, c); return; }
      var mx = 26, u = (W - 2 * mx) / (HI - LO), X = function (x) { return mx + (x - LO) * u; }, y0 = Math.round(H * 0.6);
      var sp = W > 600 ? 1.35 : 1, lv1 = y0 - 54 * sp, lv2 = Math.max(16, y0 - 84 * sp), below = y0 + 32 * sp;
      var a = s.a, b = s.b, p = s.p;
      // thick segment AB
      ctx.strokeStyle = c.path; ctx.globalAlpha = 0.35; ctx.lineWidth = 7; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(X(a), y0); ctx.lineTo(X(b), y0); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = "butt";
      ticks(ctx, c, X, y0, W);
      if (s.mode === "dist") {
        if (!near(a, b)) bracket(ctx, c, X(a), X(b), lv1, true, "d(A, B) = " + f(Math.abs(a - b)), c.vy);
        pts = [["a", X(a), c.path], ["b", X(b), c.vx]];
        pointLabels(ctx, c, [["A", X(a), c.path], ["B", X(b), c.vx]], y0);
      } else if (s.mode === "betw") {
        var ap = Math.abs(a - p), pb = Math.abs(p - b), yes = near(ap + pb, Math.abs(a - b));
        if (!near(a, p)) bracket(ctx, c, X(a), X(p), lv1, true, "d(A, P) = " + f(ap), c.path);
        if (!near(p, b)) bracket(ctx, c, X(p), X(b), lv2, true, "d(P, B) = " + f(pb), c.vx);
        if (!near(a, b)) bracket(ctx, c, X(a), X(b), below, false, "d(A, B) = " + f(Math.abs(a - b)) + (yes ? "  ✓ sum" : ""), yes ? c.good : c.bad);
        pts = [["a", X(a), c.path], ["b", X(b), c.vx], ["p", X(p), c.vy]];
        pointLabels(ctx, c, [["A", X(a), c.path], ["B", X(b), c.vx], ["P", X(p), c.vy]], y0);
      } else {
        var m = (a + b) / 2;
        if (!near(a, b)) {
          bracket(ctx, c, X(a), X(m), lv1, true, "AM = " + f(Math.abs(a - m)), c.path);
          bracket(ctx, c, X(m), X(b), lv2, true, "MB = " + f(Math.abs(a - m)), c.vx);
          bracket(ctx, c, X(a), X(b), below, false, "AB = " + f(Math.abs(a - b)), c.muted);
          // congruence marks on the two halves
          ctx.strokeStyle = c.good; ctx.lineWidth = 2;
          [(X(a) + X(m)) / 2, (X(m) + X(b)) / 2].forEach(function (x) { ctx.beginPath(); ctx.moveTo(x - 2.5, y0 - 11); ctx.lineTo(x + 1, y0 + 4); ctx.stroke(); });
        }
        pts = [["a", X(a), c.path], ["b", X(b), c.vx]];
        pointLabels(ctx, c, [["A", X(a), c.path], ["B", X(b), c.vx], ["M", X(m), c.good]], y0);
      }
      k._X = X; k._y0 = y0; k._u = u; k._mx = mx;
    };

    function drawThree(ctx, W, H, c) {
      var T = threeCase(), d = { AB: s.ab, BC: s.bc, AC: s.ac }, cols = { A: c.path, B: c.vx, C: c.vy };
      ctx.font = "700 15px " + c.font;
      if (T.kind === "line") {
        var order = T.order.split("-"), first = order[0], second = order[1], third = order[2];
        var d1 = d[[first, second].sort().join("")], d2 = d[[second, third].sort().join("")], tot = d1 + d2;
        var x0 = 34, sc = (W - 68) / tot, y0 = Math.round(H * 0.58), P = {};
        P[first] = x0; P[second] = x0 + d1 * sc; P[third] = x0 + tot * sc;
        ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8, y0); ctx.lineTo(W - 8, y0); ctx.stroke();
        SimKit.arrow(ctx, W / 2, y0, 6, y0, c.ink, 2, 9); SimKit.arrow(ctx, W / 2, y0, W - 6, y0, c.ink, 2, 9);
        bracket(ctx, c, P[first], P[second], y0 - 48 * (W > 600 ? 1.35 : 1), true, "d(" + [first, second].sort().join(", ") + ") = " + f(d1), c.muted);
        bracket(ctx, c, P[second], P[third], y0 - 78 * (W > 600 ? 1.35 : 1), true, "d(" + [second, third].sort().join(", ") + ") = " + f(d2), c.muted);
        bracket(ctx, c, P[first], P[third], y0 + 22, false, "d(" + [first, third].sort().join(", ") + ") = " + f(tot) + " = " + f(d1) + " + " + f(d2), c.good);
        pointLabels(ctx, c, ["A", "B", "C"].map(function (n) { return [n, P[n], cols[n]]; }), y0);
      } else if (T.kind === "tri") {
        // B at origin, C on the x-axis, A from the two other distances
        var a = s.bc, cc = s.ab, b = s.ac, x = (cc * cc + a * a - b * b) / (2 * a), y = Math.sqrt(Math.max(0, cc * cc - x * x));
        var xs = [0, a, x], minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs);
        var sc = Math.min((W - 90) / (maxx - minx), (H - 70) / (y || 1)), ox = (W - (maxx - minx) * sc) / 2 - minx * sc, oy = H - 34;
        var S = function (q) { return [ox + q[0] * sc, oy - q[1] * sc]; }, A = S([x, y]), B = S([0, 0]), C = S([a, 0]);
        ctx.fillStyle = c.tint; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.stroke();
        var G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
        function side(P, Q, t) { var mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2, dx = mx - G[0], dy = my - G[1], dd = Math.hypot(dx, dy) || 1; ctx.fillStyle = c.ink; ctx.font = "700 12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, mx + dx / dd * 16, my + dy / dd * 16); }
        side(A, B, f(s.ab)); side(B, C, f(s.bc)); side(A, C, f(s.ac));
        [["A", A], ["B", B], ["C", C]].forEach(function (q) { var dx = q[1][0] - G[0], dy = q[1][1] - G[1], dd = Math.hypot(dx, dy) || 1; M.dot(ctx, q[1][0], q[1][1], 5.5, cols[q[0]]); ctx.fillStyle = cols[q[0]]; ctx.font = "700 15px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(q[0], q[1][0] + dx / dd * 18, q[1][1] + dy / dd * 18); });
        ctx.fillStyle = c.muted; ctx.font = "12px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("not collinear: a triangle", 10, 10);
      } else {
        ctx.fillStyle = c.bad; ctx.font = "700 14px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("No three points have these distances", W / 2, H / 2);
      }
    }

    // ---- dragging points along the line
    function toX(e) { var r = k.canvas.getBoundingClientRect(); return e.clientX - r.left; }
    k.canvas.addEventListener("pointerdown", function (e) {
      if (s.mode === "three" || !k._X) return;
      var x = toX(e), best = null, bd = 24;
      pts.forEach(function (q) { var dd = Math.abs(q[1] - x); if (dd < bd) { bd = dd; best = q[0]; } });
      if (!best) return;
      drag = best; k.canvas.setPointerCapture(e.pointerId); move(e);
    });
    function move(e) {
      if (!drag) return;
      var v = Math.round(((toX(e) - k._mx) / k._u + LO) * 2) / 2;
      v = Math.max(LO, Math.min(HI, v));
      if (s[drag] !== v) { s[drag] = v; update(); }
    }
    k.canvas.addEventListener("pointermove", move);
    k.canvas.addEventListener("pointerup", function () { drag = null; });
    k.canvas.addEventListener("pointercancel", function () { drag = null; });

    var shows = ["ab", "bc", "ac"].map(function (q) { return k.bindSlider(q, function () { return s[q]; }, function (v) { s[q] = v; update(); }, function (v) { return f(v); }); });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; update(); });
    update();
    return {
      set: function (o) { Object.assign(s, o); shows.forEach(function (fn) { fn(); }); showM(); update(); },
      play: function () {}, seek: function () {},
      state: function () { return Object.assign({}, s); }
    };
  }
  window.GeoDistSim = { mount: mount };
})();
