/*
 * Special triangles, five views:
 *   iso    – drag the apex; when AB = AC the base angles are equal (isosceles triangle theorem)
 *   t3060  – 30°–60°–90°: side opposite 30° = ½ hypotenuse, side opposite 60° = (√3/2) hypotenuse
 *   t45    – 45°–45°–90°: each leg = hypotenuse ÷ √2
 *   median – right angle at B moving round a semicircle: the median BM is always half of AC
 *   ineq   – three side lengths: do they make a triangle, and which angle is largest?
 * Needs sim-kit.js and math-kit.js.  SpecialSim.mount(el, { mode: "iso" }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, f = M.frac, R = Math.PI / 180;
  var LABELS = {
    iso:    ["Side AB", "Side AC", "∠B", "∠C", "AB = AC?", "∠B = ∠C?"],
    t3060:  ["Hypotenuse", "Side opposite 30°", "Side opposite 60°", "½ × hypotenuse", "(√3/2) × hypotenuse", "Ratio of sides"],
    t45:    ["Hypotenuse", "Each leg", "Hypotenuse ÷ √2", "Angles", "Legs equal?", "Ratio of sides"],
    median: ["Hypotenuse AC", "Median BM", "½ × AC", "∠ABC", "AM = MC = BM?", "B lies on"],
    ineq:   ["Sides a, b, c", "Triangle?", "Largest side", "Largest angle", "Angles", "Check"]
  };

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "sp";
    var s = Object.assign({ mode: "iso", off: 0, h: 6, hyp: 8, th: 50, a: 5, b: 6, c: 7 }, opts);

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "A special triangle with its sides and angles measured",
      panel: K.chips("mode", "Show", [["iso", "Isosceles"], ["t3060", "30°–60°–90°"], ["t45", "45°–45°–90°"], ["median", "Median on hypotenuse"], ["ineq", "Sides and angles"]]) +
        '<div data-for="iso">' + K.slider(id, "off", "Move apex A sideways", -4, 4, 0.25, "cm") + K.slider(id, "h", "Height of A", 2, 8, 0.5, "cm") + '</div>' +
        '<div data-for="t3060 t45 median">' + K.slider(id, "hyp", "Hypotenuse", 4, 12, 0.5, "cm") + '</div>' +
        '<div data-for="median">' + K.slider(id, "th", "Move B round the circle", 10, 170, 1, "°") + '</div>' +
        '<div data-for="ineq">' + K.slider(id, "a", "Side a (BC)", 1, 12, 0.5, "cm") + K.slider(id, "b", "Side b (CA)", 1, 12, 0.5, "cm") + K.slider(id, "c", "Side c (AB)", 1, 12, 0.5, "cm") + '</div>' +
        K.hint("note"),
      readouts: [["r1", "–", "c-path"], ["r2", "–", "c-vy"], ["r3", "–"], ["r4", "–"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");

    function cm(x) { return (+x.toFixed(2)) + " cm"; }
    function geom() {   // triangle in cm: [A, B, C]
      if (s.mode === "iso") return [[s.off, s.h], [-3, 0], [3, 0]];
      if (s.mode === "t3060") { var h = s.hyp; return [[0, h / 2], [0, 0], [h * Math.sqrt(3) / 2, 0]]; }   // right angle at B, 30° at C
      if (s.mode === "t45") { var l = s.hyp / Math.SQRT2; return [[0, l], [0, 0], [l, 0]]; }
      if (s.mode === "median") { var r = s.hyp / 2, t = s.th * R; return [[-r, 0], [r * Math.cos(Math.PI - t), r * Math.sin(Math.PI - t)], [r, 0]]; }
      var a = s.a, b = s.b, c = s.c; if (!(a + b > c && b + c > a && a + c > b)) return null;
      var x = (c * c + a * a - b * b) / (2 * a); return [[x, Math.sqrt(Math.max(0, c * c - x * x))], [0, 0], [a, 0]];
    }

    function update() {
      LABELS[s.mode].forEach(function (t, i) { spans[i].textContent = t; });
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for.split(" ").indexOf(s.mode) >= 0 ? "" : "none"; });
      var T = geom(), note = "";
      if (s.mode === "iso") {
        var A = T[0], B = T[1], C = T[2], ab = M.dist(A, B), ac = M.dist(A, C), gB = M.angleAt(A, B, C), gC = M.angleAt(A, C, B), eq = Math.abs(ab - ac) < 1e-6;
        k.set("r1", cm(ab)); k.set("r2", cm(ac)); k.set("r3", gB.toFixed(1) + "°"); k.set("r4", gC.toFixed(1) + "°");
        k.set("r5", eq ? "Yes" : "No"); k.set("r6", eq ? "Yes" : "No");
        note = eq ? "AB = AC, so the angles opposite them, ∠C and ∠B, are equal: the isosceles triangle theorem. A lies on the perpendicular bisector of BC." : "Slide A back to the dashed line (the perpendicular bisector of BC) to make AB = AC.";
      } else if (s.mode === "t3060") {
        var h = s.hyp;
        k.set("r1", cm(h)); k.set("r2", cm(h / 2)); k.set("r3", cm(h * Math.sqrt(3) / 2)); k.set("r4", cm(h / 2)); k.set("r5", cm(h * Math.sqrt(3) / 2)); k.set("r6", "1 : √3 : 2");
        note = "The side opposite 30° is always half the hypotenuse. The side opposite 60° is √3/2 (about 0.866) of the hypotenuse.";
      } else if (s.mode === "t45") {
        var l = s.hyp / Math.SQRT2;
        k.set("r1", cm(s.hyp)); k.set("r2", cm(l)); k.set("r3", cm(l)); k.set("r4", "45°, 45°, 90°"); k.set("r5", "Yes, it is isosceles"); k.set("r6", "1 : 1 : √2");
        note = "Each leg = hypotenuse ÷ √2 = " + f(s.hyp) + " ÷ 1.414 ≈ " + l.toFixed(2) + " cm. This is the shape of a set square cut along its diagonal.";
      } else if (s.mode === "median") {
        var Mm = [0, 0], bm = M.dist(T[1], Mm);
        k.set("r1", cm(s.hyp)); k.set("r2", cm(bm)); k.set("r3", cm(s.hyp / 2)); k.set("r4", M.angleAt(T[0], T[1], T[2]).toFixed(1) + "°"); k.set("r5", "Yes, all " + cm(s.hyp / 2)); k.set("r6", "a circle with AC as diameter");
        note = "However you move B, ∠ABC stays 90° and the median BM stays exactly half of AC. M is the centre of a circle through A, B and C.";
      } else {
        if (!T) {
          var big = Math.max(s.a, s.b, s.c), rest = s.a + s.b + s.c - big;
          k.set("r1", [s.a, s.b, s.c].map(f).join(", ")); k.set("r2", "No"); k.set("r3", "–"); k.set("r4", "–"); k.set("r5", "–");
          k.set("r6", f(rest) + " is not more than " + f(big));
          note = "The two shorter sides add up to only " + f(rest) + " cm, which is not more than the longest side, " + f(big) + " cm. They cannot meet, so there is no triangle.";
        } else {
          var P = { a: s.a, b: s.b, c: s.c }, Ang = { a: M.angleAt(T[1], T[0], T[2]), b: M.angleAt(T[0], T[1], T[2]), c: M.angleAt(T[0], T[2], T[1]) };   // angle opposite each side
          var keys = ["a", "b", "c"].sort(function (p, q) { return P[q] - P[p]; }), names = { a: "BC", b: "CA", c: "AB" }, opp = { a: "∠A", b: "∠B", c: "∠C" };
          k.set("r1", [s.a, s.b, s.c].map(f).join(", ")); k.set("r2", "Yes");
          k.set("r3", names[keys[0]] + " = " + cm(P[keys[0]])); k.set("r4", opp[keys[0]] + " = " + Ang[keys[0]].toFixed(1) + "°");
          k.set("r5", "∠A " + Ang.a.toFixed(0) + "°, ∠B " + Ang.b.toFixed(0) + "°, ∠C " + Ang.c.toFixed(0) + "°");
          k.set("r6", "Any two sides add to more than the third");
          note = "The largest angle is opposite the longest side, and the smallest angle is opposite the shortest side.";
        }
      }
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var T = geom();
      if (!T) {   // longest side as the base; the two shorter sides tilted up from each end, falling short of each other
        var big = Math.max(s.a, s.b, s.c), others = [s.a, s.b, s.c]; others.splice(others.indexOf(big), 1);
        var sc = (W - 80) / big, y = H * 0.72, x0 = 40, x1 = x0 + big * sc, tilt = 28 * R;
        var t1 = [x0 + others[0] * sc * Math.cos(tilt), y - others[0] * sc * Math.sin(tilt)], t2 = [x1 - others[1] * sc * Math.cos(tilt), y - others[1] * sc * Math.sin(tilt)];
        ctx.lineCap = "round";
        ctx.strokeStyle = c.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
        ctx.strokeStyle = c.vy; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(t1[0], t1[1]); ctx.stroke();
        ctx.strokeStyle = c.vx; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(t2[0], t2[1]); ctx.stroke(); ctx.lineCap = "butt";
        ctx.font = "700 13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillStyle = c.ink; ctx.fillText(f(big) + " cm", (x0 + x1) / 2, y + 8);
        ctx.fillStyle = c.vy; ctx.fillText(f(others[0]) + " cm", (x0 + t1[0]) / 2 - 10, (y + t1[1]) / 2 - 22);
        ctx.fillStyle = c.vx; ctx.fillText(f(others[1]) + " cm", (x1 + t2[0]) / 2 + 10, (y + t2[1]) / 2 - 22);
        if (t2[0] > t1[0]) { ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = c.bad; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(t1[0], t1[1]); ctx.lineTo(t2[0], t2[1]); ctx.stroke(); ctx.restore(); }
        ctx.fillStyle = c.bad; ctx.font = "700 14px " + c.font; ctx.textBaseline = "bottom"; ctx.fillText("the two shorter sides cannot meet", W / 2, Math.min(t1[1], t2[1]) - 26);
        return;
      }
      var xs = T.map(function (p) { return p[0]; }).concat(s.mode === "median" ? [-s.hyp / 2, s.hyp / 2] : []), ys = T.map(function (p) { return p[1]; }).concat(s.mode === "median" ? [s.hyp / 2] : []);
      if (s.mode === "iso") { xs.push(-4, 4); ys.push(8); }
      var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), maxy = Math.max.apply(null, ys);
      var sc = Math.min((W - 90) / (maxx - minx || 1), (H - 80) / (maxy || 1)), ox = (W - (maxx - minx) * sc) / 2 - minx * sc, oy = H - 42;
      var S = function (p) { return [ox + p[0] * sc, oy - p[1] * sc]; }, A = S(T[0]), B = S(T[1]), C = S(T[2]);
      if (s.mode === "iso") { ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(S([0, 0])[0], oy + 10); ctx.lineTo(S([0, 0])[0], S([0, 8.5])[1]); ctx.stroke(); ctx.restore(); }
      if (s.mode === "median") {
        var O = S([0, 0]); ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(O[0], O[1], s.hyp / 2 * sc, Math.PI, 0); ctx.stroke(); ctx.restore();
      }
      ctx.fillStyle = c.tint; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.stroke();
      function len(P, Q, txt, col, side) { var mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2, dx = Q[1] - P[1], dy = P[0] - Q[0], d = Math.hypot(dx, dy) || 1; ctx.fillStyle = col; ctx.font = "700 13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, mx + dx / d * 16 * side, my + dy / d * 16 * side); }
      var G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
      function side(P, Q) { var mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2, dx = Q[1] - P[1], dy = P[0] - Q[0]; return ((mx + dx) - G[0]) * dx + ((my + dy) - G[1]) * dy > 0 ? 1 : -1; }
      var gA = M.angleAt(B, A, C), gB = M.angleAt(A, B, C), gC = M.angleAt(A, C, B);
      M.arc(ctx, A, B, C, 22, c.path, Math.round(gA) + "°", c, Math.abs(gA - 90) < 0.05);
      M.arc(ctx, B, A, C, 22, c.vx, Math.round(gB) + "°", c, Math.abs(gB - 90) < 0.05);
      M.arc(ctx, C, A, B, 22, c.vy, Math.round(gC) + "°", c, Math.abs(gC - 90) < 0.05);
      var tcm = T.map(function (p) { return p; });
      len(A, B, f(+M.dist(tcm[0], tcm[1]).toFixed(2)), c.ink, side(A, B)); len(B, C, f(+M.dist(tcm[1], tcm[2]).toFixed(2)), c.ink, side(B, C)); len(C, A, f(+M.dist(tcm[2], tcm[0]).toFixed(2)), c.ink, side(C, A));
      if (s.mode === "median") {
        var Mm = S([0, 0]); ctx.strokeStyle = c.vy; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.lineTo(Mm[0], Mm[1]); ctx.stroke(); M.dot(ctx, Mm[0], Mm[1], 5, c.vy);
        ctx.fillStyle = c.vy; ctx.font = "700 14px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText("M", Mm[0] + 8, Mm[1] - 6);
      }
      ctx.fillStyle = c.ink; ctx.font = "700 15px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      [[A, "A"], [B, "B"], [C, "C"]].forEach(function (q) { var dx = q[0][0] - G[0], dy = q[0][1] - G[1], d = Math.hypot(dx, dy) || 1; ctx.fillText(q[1], q[0][0] + dx / d * 20, q[0][1] + dy / d * 20); });
      if (s.mode === "iso" && Math.abs(s.off) < 1e-9) { ctx.strokeStyle = c.good; ctx.lineWidth = 2; [[A, B], [A, C]].forEach(function (q) { var mx = (q[0][0] + q[1][0]) / 2, my = (q[0][1] + q[1][1]) / 2, ang = Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]) + Math.PI / 2; ctx.beginPath(); ctx.moveTo(mx - Math.cos(ang) * 7, my - Math.sin(ang) * 7); ctx.lineTo(mx + Math.cos(ang) * 7, my + Math.sin(ang) * 7); ctx.stroke(); }); }
    };

    var shows = ["off", "h", "hyp", "th", "a", "b", "c"].map(function (q) {
      return k.bindSlider(q, function () { return s[q]; }, function (v) { s[q] = v; update(); }, function (v) { return q === "th" ? v + "°" : f(v) + " cm"; });
    });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; update(); });
    update();
    return { set: function (o) { Object.assign(s, o); shows.forEach(function (fn) { fn(); }); showM(); update(); }, play: function () {}, seek: function () {} };
  }
  window.SpecialSim = { mount: mount };
})();
