/*
 * Congruence tests. Choose a test and set the given parts; every triangle that fits them is drawn.
 * SSS, SAS, ASA, AAS and hypotenuse–side always give exactly one triangle, so two triangles that
 * share those parts are congruent. SSA can give two different triangles and AAA gives triangles
 * of any size, so they are not tests of congruence.
 * Needs sim-kit.js and math-kit.js.  CongSim.mount(el, { test: "SAS" }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, R = Math.PI / 180;
  // [label, min, max, step, unit, default] for each slider; given: which parts are marked
  var TESTS = {
    SSS: { name: "S-S-S", p: [["Side AB", 2, 10, 0.5, "cm", 5], ["Side BC", 2, 10, 0.5, "cm", 7], ["Side CA", 2, 10, 0.5, "cm", 6]], given: ["AB", "BC", "CA"],
      say: "Three sides of one triangle equal three sides of another." },
    SAS: { name: "S-A-S", p: [["Side AB", 2, 10, 0.5, "cm", 5], ["Angle B (between them)", 15, 150, 1, "°", 50], ["Side BC", 2, 10, 0.5, "cm", 7]], given: ["AB", "B", "BC"],
      say: "Two sides and the angle between them." },
    ASA: { name: "A-S-A", p: [["Angle B", 15, 140, 1, "°", 50], ["Side BC (between them)", 2, 10, 0.5, "cm", 7], ["Angle C", 15, 140, 1, "°", 60]], given: ["B", "BC", "C"],
      say: "Two angles and the side between them." },
    AAS: { name: "A-A-S", p: [["Angle A", 15, 140, 1, "°", 70], ["Angle B", 15, 140, 1, "°", 50], ["Side BC (not between them)", 2, 10, 0.5, "cm", 7]], given: ["A", "B", "BC"],
      say: "Two angles and a side that is not between them. The third angle is fixed too (angle sum), so this works like A-S-A." },
    RHS: { name: "Hypotenuse–side", p: [["Hypotenuse AC", 3, 12, 0.5, "cm", 10], ["Side BC", 1, 11, 0.5, "cm", 6]], given: ["AC", "BC", "rightB"],
      say: "In right-angled triangles: the hypotenuse and one other side." },
    SSA: { name: "S-S-A (not a test)", p: [["Side AB", 2, 10, 0.5, "cm", 8], ["Angle B", 10, 80, 1, "°", 35], ["Side CA (opposite B)", 2, 10, 0.5, "cm", 5.5]], given: ["AB", "B", "CA"],
      say: "Two sides and an angle that is not between them. Often two different triangles fit!" },
    AAA: { name: "A-A-A (not a test)", p: [["Angle A", 15, 140, 1, "°", 70], ["Angle B", 15, 140, 1, "°", 50]], given: ["A", "B", "C"],
      say: "Three angles fix the shape but not the size. The triangles are similar, not congruent." }
  };
  var ORDER = ["SSS", "SAS", "ASA", "AAS", "RHS", "SSA", "AAA"];

  // all triangles (as [A, B, C] in cm, B at origin, C on +x axis) that fit the given parts
  function build(test, v) {
    var T = [];
    function fromBC(B, Cang, a) { var A = 180 - B - Cang; if (A <= 0) return null; var c = a * Math.sin(Cang * R) / Math.sin(A * R); return [[c * Math.cos(B * R), c * Math.sin(B * R)], [0, 0], [a, 0]]; }
    if (test === "SSS") { var c = v[0], a = v[1], b = v[2]; if (a + b > c && a + c > b && b + c > a) { var x = (c * c + a * a - b * b) / (2 * a); T.push([[x, Math.sqrt(Math.max(0, c * c - x * x))], [0, 0], [a, 0]]); } }
    if (test === "SAS") { T.push([[v[0] * Math.cos(v[1] * R), v[0] * Math.sin(v[1] * R)], [0, 0], [v[2], 0]]); }
    if (test === "ASA") { var t1 = fromBC(v[0], v[2], v[1]); if (t1) T.push(t1); }
    if (test === "AAS") { var Cg = 180 - v[0] - v[1]; if (Cg > 0) { var t2 = fromBC(v[1], Cg, v[2]); if (t2) T.push(t2); } }
    if (test === "RHS") { if (v[1] < v[0]) T.push([[0, Math.sqrt(v[0] * v[0] - v[1] * v[1])], [0, 0], [v[1], 0]]); }
    if (test === "SSA") {
      var cc = v[0], B = v[1] * R, bb = v[2], Ax = cc * Math.cos(B), Ay = cc * Math.sin(B), d = bb * bb - Ay * Ay;
      if (d >= 0) [Ax + Math.sqrt(d), Ax - Math.sqrt(d)].forEach(function (xc, i) { if (xc > 0.05 && !(i === 1 && d < 1e-9)) T.push([[Ax, Ay], [0, 0], [xc, 0]]); });
    }
    if (test === "AAA") { var C3 = 180 - v[0] - v[1]; if (C3 > 0) [4, 6, 8].forEach(function (a) { var t = fromBC(v[1], C3, a); if (t) T.push(t); }); }
    return T;
  }
  function parts(t) {
    var A = t[0], B = t[1], C = t[2];
    return { AB: M.dist(A, B), BC: M.dist(B, C), CA: M.dist(C, A), A: M.angleAt(B, A, C), B: M.angleAt(A, B, C), C: M.angleAt(A, C, B) };
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "cg";
    var s = { test: opts.test || "SAS", v: {} };
    ORDER.forEach(function (q) { s.v[q] = TESTS[q].p.map(function (p) { return p[5]; }); });
    if (opts.v) s.v[s.test] = opts.v.slice();

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "Every triangle that can be drawn from the given sides and angles",
      panel: K.chips("test", "Given parts", ORDER.map(function (q) { return [q, TESTS[q].name.replace(" (not a test)", "")]; })) +
        K.slider(id, "p0", "", 0, 1, 1, "") + K.slider(id, "p1", "", 0, 1, 1, "") + '<div data-wrap="p2">' + K.slider(id, "p2", "", 0, 1, 1, "") + '</div>' + K.hint("note"),
      readouts: [["test", "Test", "c-path"], ["n", "Triangles that fit", "c-vy"], ["cong", "Congruent?", "wrap"],
                 ["s", "Sides AB, BC, CA (cm)", "wrap"], ["a", "Angles A, B, C", "wrap"], ["why", "Because", "wrap"]],
      cols: 3
    });
    var ins = [0, 1, 2].map(function (i) { return root.querySelector('input[data-k="p' + i + '"]'); });
    var outs = [0, 1, 2].map(function (i) { return document.getElementById(ins[i].id + "-out"); });
    var labs = [0, 1, 2].map(function (i) { return ins[i].parentNode.querySelector("label"); });

    function sync() {
      var T = TESTS[s.test];
      root.querySelector('[data-wrap="p2"]').style.display = T.p.length > 2 ? "" : "none";
      T.p.forEach(function (p, i) {
        labs[i].firstChild.nodeValue = p[0] + " "; ins[i].min = p[1]; ins[i].max = p[2]; ins[i].step = p[3]; ins[i].value = s.v[s.test][i];
        outs[i].textContent = M.frac(s.v[s.test][i]) + (p[4] === "°" ? "°" : " " + p[4]);
      });
      root.querySelectorAll('[data-group="test"] button').forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === s.test); });
    }
    function update() {
      var T = TESTS[s.test], tris = build(s.test, s.v[s.test]), n = tris.length, bad = s.test === "SSA" || s.test === "AAA";
      k.set("test", T.name.replace(" (not a test)", ""));
      k.set("n", n === 0 ? "None" : n === 1 ? "Exactly one" : n + (s.test === "AAA" ? " (any size)" : " different ones"));
      k.set("cong", n === 0 ? "–" : n === 1 ? "Yes: these parts fix the triangle" : "No: the parts do not fix the triangle");
      if (n) {
        var P = parts(tris[0]);
        k.set("s", tris.map(function (t) { var q = parts(t); return [q.AB, q.BC, q.CA].map(function (x) { return (+x.toFixed(1)); }).join(", "); }).join("  |  "));
        k.set("a", tris.map(function (t) { var q = parts(t); return [q.A, q.B, q.C].map(function (x) { return Math.round(x) + "°"; }).join(", "); }).join("  |  "));
        void P;
      } else { k.set("s", "–"); k.set("a", "–"); }
      k.set("why", T.say);
      k.el('[data-r="note"]').textContent = n === 0
        ? (s.test === "SSS" ? "These sides cannot make a triangle: any two sides must add up to more than the third." : s.test === "RHS" ? "The hypotenuse must be the longest side." : s.test === "SSA" ? "Side CA is too short to reach the base." : "The angles add up to 180° or more, so the sides never meet.")
        : bad ? (s.test === "SSA" && n === 2 ? "Same AB, same ∠B, same CA, yet two different triangles. So S-S-A cannot prove congruence." : s.test === "SSA" ? "Here only one triangle fits, but change the parts and you can often get two. S-S-A is not a reliable test." : "Same angles, different sizes. A-A-A shows the triangles are similar, not congruent.")
        : "Whatever you try, only one triangle can be drawn from these parts. Any two triangles with these parts equal are congruent.";
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var tris = build(s.test, s.v[s.test]); if (!tris.length) { ctx.fillStyle = c.muted; ctx.font = "15px " + c.font; ctx.textAlign = "center"; ctx.fillText("No triangle can be made", W / 2, H / 2); return; }
      var xs = [], ys = []; tris.forEach(function (t) { t.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); });
      var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), maxy = Math.max.apply(null, ys);
      var sc = Math.min((W - 80) / (maxx - minx || 1), (H - 80) / (maxy || 1)), ox = (W - (maxx - minx) * sc) / 2 - minx * sc, oy = H - 40;
      var S = function (p) { return [ox + p[0] * sc, oy - p[1] * sc]; };
      var cols = [c.path, c.vx, c.good], T = TESTS[s.test];
      tris.forEach(function (t, ti) {
        var A = S(t[0]), B = S(t[1]), C = S(t[2]), col = cols[ti % 3];
        ctx.fillStyle = col; ctx.globalAlpha = 0.1; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
        // given parts: thick sides and filled angle marks
        var seg = { AB: [A, B, t[0], t[1]], BC: [B, C, t[1], t[2]], CA: [C, A, t[2], t[0]], AC: [C, A, t[2], t[0]] }, G0 = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
        T.given.forEach(function (g) {
          if (seg[g]) {
            var P = seg[g][0], Q = seg[g][1];
            ctx.strokeStyle = c.vy; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(Q[0], Q[1]); ctx.stroke(); ctx.lineCap = "butt";
            if (!ti) { var mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2, dx = mx - G0[0], dy = my - G0[1], d = Math.hypot(dx, dy) || 1;
              ctx.fillStyle = c.vy; ctx.font = "700 13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(M.frac(+M.dist(seg[g][2], seg[g][3]).toFixed(1)) + " cm", mx + dx / d * 18, my + dy / d * 18); }
          }
          var V = { A: [A, B, C], B: [B, A, C], C: [C, A, B], rightB: [B, A, C] }[g];
          if (V) { var deg = M.angleAt(V[1], V[0], V[2]); M.arc(ctx, V[0], V[1], V[2], 26, c.vy, ti && s.test !== "AAA" ? null : Math.round(deg) + "°", c, g === "rightB"); }
        });
        ctx.fillStyle = col; ctx.font = "700 14px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        var G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
        [[A, "A"], [B, "B"], [C, "C"]].forEach(function (q) { if (ti && q[1] !== "C" && s.test !== "AAA") return; var dx = q[0][0] - G[0], dy = q[0][1] - G[1], d = Math.hypot(dx, dy) || 1; ctx.fillText(q[1] + (ti ? (s.test === "SSA" ? "′" : "") : ""), q[0][0] + dx / d * 16, q[0][1] + dy / d * 16); });
      });
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillStyle = c.vy; ctx.fillText("coloured sides and angles are the given parts", 10, 10);
    };

    [0, 1, 2].forEach(function (i) { ins[i].addEventListener("input", function () { s.v[s.test][i] = +ins[i].value; sync(); update(); }); });
    root.querySelector('[data-group="test"]').addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { s.test = b.dataset.v; sync(); update(); } });
    sync(); update();
    return { set: function (o) { if (o.test) s.test = o.test; if (o.v) s.v[s.test] = o.v.slice(); sync(); update(); }, play: function () {}, seek: function () {}, build: build };
  }
  window.CongSim = { mount: mount, build: build };
})();
