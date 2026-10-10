/*
 * Trigonometric ratios, three views:
 *   ratios  – right triangle ABC, ∠B = 90°. Set ∠A and the size (or the two legs); the sides are
 *             named opposite / adjacent / hypotenuse for the chosen angle (A or C), and sin, cos, tan
 *             are worked out. Changing the size leaves the ratios unchanged (similar triangles).
 *   circle  – hypotenuse 1 inside a circle of radius 1: opposite = sin θ, adjacent = cos θ,
 *             so sin²θ + cos²θ = 1
 *   special – 0°, 30°, 45°, 60°, 90° from the half-equilateral triangle and the half-square,
 *             with the table of values (the chosen column lights up)
 * Needs sim-kit.js and math-kit.js.  TrigSim.mount(el, { mode: "ratios", A: 30, hyp: 6 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, R = Math.PI / 180;
  var EXACT = {   // [display, value]
    0:  { sin: ["0", 0], cos: ["1", 1], tan: ["0", 0], sides: "0, 1, 1", sq: "0 + 1 = 1" },
    30: { sin: ["1/2", 0.5], cos: ["√3/2", Math.sqrt(3) / 2], tan: ["1/√3", 1 / Math.sqrt(3)], sides: "1, √3, 2", sq: "1/4 + 3/4 = 1" },
    45: { sin: ["1/√2", Math.SQRT1_2], cos: ["1/√2", Math.SQRT1_2], tan: ["1", 1], sides: "1, 1, √2", sq: "1/2 + 1/2 = 1" },
    60: { sin: ["√3/2", Math.sqrt(3) / 2], cos: ["1/2", 0.5], tan: ["√3", Math.sqrt(3)], sides: "√3, 1, 2", sq: "3/4 + 1/4 = 1" },
    90: { sin: ["1", 1], cos: ["0", 0], tan: ["not defined", null], sides: "1, 0, 1", sq: "1 + 0 = 1" }
  };
  var SPECIAL = [0, 30, 45, 60, 90];

  function d3(x) { return String(+x.toFixed(3)); }
  function exactish(x) { return Math.abs(x - +x.toFixed(3)) < 1e-9; }
  function nice(x) { return String(+x.toFixed(2)); }
  function surd(n) { var r = Math.round(Math.sqrt(n)); return r * r === n ? String(r) : "√" + n; }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "tr";
    var s = Object.assign({ mode: "ratios", input: "angle", A: 30, hyp: 6, opp: 3, adj: 4, at: "A", similar: false, th: 40, sa: 30, t: 1, anim: "" }, opts);
    var shown = { hyp: s.hyp, th: s.th };

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "A right triangle with its sides named for an angle, and the sine, cosine and tangent of that angle",
      panel: K.chips("mode", "Show", [["ratios", "Ratios in a right triangle"], ["circle", "Hypotenuse 1"], ["special", "Special angles"]]) +
        '<div data-for="ratios">' +
          K.chips("input", "Set the triangle by", [["angle", "Angle and size"], ["sides", "Two sides"]]) +
          '<div data-in="angle">' + K.slider(id, "A", "∠A", 5, 85, 1, "°") + K.slider(id, "hyp", "Size: hypotenuse AC", 2, 12, 0.5, "cm") + '</div>' +
          '<div data-in="sides">' + K.slider(id, "opp", "Side BC", 1, 16, 1, "cm") + K.slider(id, "adj", "Side AB", 1, 16, 1, "cm") + '</div>' +
          K.chips("at", "Find the ratios of the angle at", [["A", "A"], ["C", "C"]]) +
          '<div class="checks">' + K.check(id, "similar", "Show smaller triangles with the same angles", s.similar) + '</div>' +
        '</div>' +
        '<div data-for="circle">' + K.slider(id, "th", "Angle θ", 0, 90, 1, "°") + '</div>' +
        '<div data-for="special">' + K.chips("sa", "θ =", SPECIAL.map(function (a) { return [String(a), a + "°"]; })) + '</div>' +
        K.hint("note"),
      readouts: [["r1", "–", "c-vy"], ["r2", "–", "c-vx"], ["r3", "–", "c-path"], ["r4", "–", "wrap"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span"), stage = k.el(".sim-stage");
    function fitAspect() { stage.style.aspectRatio = root.clientWidth < 520 ? "1 / 0.82" : "16 / 10"; }
    fitAspect(); window.addEventListener("resize", fitAspect);

    // triangle in cm: A at origin, B on the x-axis, C above B
    function tri() {
      var h = s.mode === "ratios" && s.input === "angle" ? shown.hyp : null;
      if (s.input === "angle") return { a: s.A, AB: h * Math.cos(s.A * R), BC: h * Math.sin(s.A * R), AC: h };
      var AC = Math.sqrt(s.opp * s.opp + s.adj * s.adj);
      return { a: Math.atan2(s.opp, s.adj) / R, AB: s.adj, BC: s.opp, AC: AC };
    }
    function names() {   // opposite, adjacent for the chosen angle
      return s.at === "A" ? { opp: "BC", adj: "AB", ang: "A" } : { opp: "AB", adj: "BC", ang: "C" };
    }

    function update() {
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for === s.mode ? "" : "none"; });
      root.querySelectorAll("[data-in]").forEach(function (e) { e.style.display = e.dataset.in === s.input ? "" : "none"; });
      var note = "", L;
      if (s.mode === "ratios") {
        var T = tri(), n = names(), opp = s.at === "A" ? T.BC : T.AB, adj = s.at === "A" ? T.AB : T.BC, g = s.at === "A" ? T.a : 90 - T.a;
        L = ["Opposite side " + n.opp, "Adjacent side " + n.adj, "Hypotenuse AC", "sin " + n.ang + " = " + n.opp + " ÷ AC", "cos " + n.ang + " = " + n.adj + " ÷ AC", "tan " + n.ang + " = " + n.opp + " ÷ " + n.adj];
        if (s.input === "angle") {
          var ap = function (x) { return (Math.abs(x - +nice(x)) < 1e-9 ? "" : "≈ ") + nice(x) + " cm"; };
          k.set("r1", ap(opp)); k.set("r2", ap(adj)); k.set("r3", ap(T.AC));
          var rr = function (x, y) { var v = x / y; return nice(x) + " ÷ " + nice(y) + (exactish(v) && Math.abs(x - +nice(x)) < 1e-9 && Math.abs(y - +nice(y)) < 1e-9 ? " = " : " ≈ ") + d3(v); };
          k.set("r4", rr(opp, T.AC)); k.set("r5", rr(adj, T.AC)); k.set("r6", rr(opp, adj));
          note = "∠" + n.ang + " = " + Math.round(g) + "°. Change the size: every side changes, but sin, cos and tan of " + Math.round(g) + "° stay the same. The ratios depend only on the angle.";
        } else {
          var hs = surd(s.opp * s.opp + s.adj * s.adj), o = s.at === "A" ? s.opp : s.adj, a = s.at === "A" ? s.adj : s.opp;
          var eq = function (num, den, v) { var exact = /√/.test(String(den)) ? false : exactish(v); return num + "/" + den + (exact ? " = " : " ≈ ") + d3(v); };
          k.set("r1", o + " cm"); k.set("r2", a + " cm"); k.set("r3", hs + (/√/.test(hs) ? " ≈ " + nice(T.AC) : "") + " cm");
          k.set("r4", eq(o, hs, o / T.AC)); k.set("r5", eq(a, hs, a / T.AC)); k.set("r6", eq(o, a, o / a));
          note = "AC² = " + s.adj + "² + " + s.opp + "² = " + (s.adj * s.adj + s.opp * s.opp) + " (Pythagoras), so AC = " + hs + ". Here ∠" + n.ang + " ≈ " + g.toFixed(1) + "°.";
        }
        if (s.at === "C") note += " Seen from C, the opposite and adjacent sides swap, so sin C = cos A and cos C = sin A.";
      } else if (s.mode === "circle") {
        var th = shown.th, sn = Math.sin(th * R), cs = Math.cos(th * R);
        L = ["Angle θ", "sin θ = PM ÷ OP = PM", "cos θ = OM ÷ OP = OM", "sin²θ + cos²θ", "tan θ = sin θ ÷ cos θ", "sin θ = cos (90° − θ)"];
        k.set("r1", Math.round(th) + "°"); k.set("r2", d3(sn)); k.set("r3", d3(cs));
        k.set("r4", d3(sn * sn) + " + " + d3(cs * cs) + " = 1");
        k.set("r5", Math.round(th) === 90 ? "not defined (cos 90° = 0)" : d3(sn) + " ÷ " + d3(cs) + " ≈ " + d3(sn / cs));
        k.set("r6", "sin " + Math.round(th) + "° = cos " + (90 - Math.round(th)) + "° = " + d3(sn));
        note = "OP = 1, so PM is sin θ and OM is cos θ. By Pythagoras, PM² + OM² = OP² = 1: that is sin²θ + cos²θ = 1, for every angle.";
      } else {
        var E = EXACT[s.sa];
        L = ["Angle θ", "Opposite, adjacent, hypotenuse", "sin θ", "cos θ", "tan θ", "sin²θ + cos²θ"];
        var show = function (p) { return p[1] == null ? p[0] : p[0] + (/[√\/]/.test(p[0]) ? (/√/.test(p[0]) ? " ≈ " : " = ") + d3(p[1]) : ""); };
        k.set("r1", s.sa + "°"); k.set("r2", E.sides); k.set("r3", show(E.sin)); k.set("r4", show(E.cos)); k.set("r5", show(E.tan)); k.set("r6", E.sq);
        note = {
          0: "At 0° the opposite side shrinks to 0 and the adjacent side becomes the hypotenuse: sin 0° = 0, cos 0° = 1, tan 0° = 0.",
          30: "Half of an equilateral triangle of side 2: opposite 30° is 1, the hypotenuse is 2, and the third side is √(4 − 1) = √3.",
          45: "Half of a square of side 1: both legs are 1 and the hypotenuse (the diagonal) is √2. So sin 45° = cos 45° and tan 45° = 1.",
          60: "The same half-equilateral triangle, seen from the 60° angle: opposite is √3, adjacent is 1, hypotenuse 2.",
          90: "At 90° the adjacent side shrinks to 0 and the opposite side becomes the hypotenuse: sin 90° = 1, cos 90° = 0, and tan 90° is not defined."
        }[s.sa];
      }
      L.forEach(function (t, i) { spans[i].textContent = t; });
      k.el('[data-r="note"]').textContent = note;
      shows.forEach(function (f) { f(); }); k.redraw();
    }

    function label(ctx, txt, x, y, col, font, al, bl) { ctx.fillStyle = col; ctx.font = font; ctx.textAlign = al || "center"; ctx.textBaseline = bl || "middle"; ctx.fillText(txt, x, y); }
    function seg(ctx, P, Q, col, w, dash) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(Q[0], Q[1]); ctx.stroke(); ctx.restore(); }
    function rightMark(ctx, B, P, Q, r, col) {
      var u = [P[0] - B[0], P[1] - B[1]], w = [Q[0] - B[0], Q[1] - B[1]], du = Math.hypot(u[0], u[1]) || 1, dw = Math.hypot(w[0], w[1]) || 1;
      u = [u[0] / du * r, u[1] / du * r]; w = [w[0] / dw * r, w[1] / dw * r];
      ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(B[0] + u[0], B[1] + u[1]); ctx.lineTo(B[0] + u[0] + w[0], B[1] + u[1] + w[1]); ctx.lineTo(B[0] + w[0], B[1] + w[1]); ctx.stroke();
    }
    // side label placed outside the triangle, away from point G
    function sideLab(ctx, P, Q, G, txt, col, c, W, H, off) {
      var mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2, nx = Q[1] - P[1], ny = P[0] - Q[0], nd = Math.hypot(nx, ny) || 1;
      if ((mx - G[0]) * nx + (my - G[1]) * ny < 0) { nx = -nx; ny = -ny; }
      ctx.font = "700 12px " + c.font; var tw = ctx.measureText(txt).width;
      var push = Math.abs(nx / nd) * tw / 2 + Math.abs(ny / nd) * 7 + (off || 16) * 0.5;   // clear the line with the whole text box
      var x = mx + nx / nd * push, y = my + ny / nd * push;
      label(ctx, txt, Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, x)), Math.max(9, Math.min(H - 9, y)), col, "700 12px " + c.font);
    }

    k.draw = function (ctx, W, H, c) {
      var narrow = W < 520;
      if (s.mode === "ratios") {
        var T = tri();
        var boxW = narrow ? W - 110 : W * 0.6 - 100, boxH = H - (narrow ? 96 : 60);
        // angle mode: scale fixed by the largest triangle (hypotenuse 12) so growing it shows the size change
        var refW = s.input === "angle" ? 12 * Math.cos(s.A * R) : T.AB, refH = s.input === "angle" ? 12 * Math.sin(s.A * R) : T.BC;
        var sc = Math.min(boxW / refW, boxH / refH);
        if (!narrow) {   // a flat triangle may run under the definitions, as long as it stays below them
          var sc1 = Math.min((W - 110) / refW, boxH / refH, (H - 30 - 130) / refH);
          if (sc1 > sc) sc = sc1;
        }
        var A = [30, H - 30], B = [A[0] + T.AB * sc, A[1]], C = [B[0], A[1] - T.BC * sc];
        var G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3], n = names();
        if (s.similar) [1 / 3, 2 / 3].forEach(function (f) {
          var B2 = [A[0] + T.AB * sc * f, A[1]], C2 = [B2[0], A[1] - T.BC * sc * f];
          ctx.save(); ctx.globalAlpha = 0.55; seg(ctx, B2, C2, s.at === "A" ? c.vy : c.vx, 2, [5, 4]); ctx.restore(); rightMark(ctx, B2, A, C2, 7, c.muted);
          label(ctx, nice(T.AC * f), (A[0] + C2[0]) / 2 - 8, (A[1] + C2[1]) / 2 - 8, c.muted, "11px " + c.font);
        });
        ctx.fillStyle = c.tint; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        var oppS = s.at === "A" ? [B, C] : [A, B], adjS = s.at === "A" ? [A, B] : [B, C];
        seg(ctx, A, C, c.path, 4); seg(ctx, oppS[0], oppS[1], c.vy, 4); seg(ctx, adjS[0], adjS[1], c.vx, 4);
        rightMark(ctx, B, A, C, 12, c.ink);
        var Vt = s.at === "A" ? A : C, P1 = s.at === "A" ? B : B, P2 = s.at === "A" ? C : A;
        M.arc(ctx, Vt, P1, P2, 26, c.ink, null, c);
        var g = s.at === "A" ? T.a : 90 - T.a, mA = Math.atan2(C[1] - A[1], C[0] - A[0]) / 2;
        if (s.at === "A") label(ctx, (s.input === "angle" ? Math.round(g) : g.toFixed(1)) + "°", A[0] + Math.cos(mA) * 34 + 4, A[1] + Math.sin(mA) * 34, c.ink, "700 12px " + c.font, "left");
        else label(ctx, (s.input === "angle" ? Math.round(g) : g.toFixed(1)) + "°", C[0] - 10, C[1] + 42, c.ink, "700 12px " + c.font, "right");
        var lenOf = function (x) { return s.input === "sides" && x === T.AC ? surd(s.opp * s.opp + s.adj * s.adj) : nice(x); };
        sideLab(ctx, A, C, G, (narrow ? "hyp. " : "hypotenuse ") + lenOf(T.AC), c.path, c, W, H, 14);
        sideLab(ctx, oppS[0], oppS[1], G, (narrow ? "opp. " : "opposite ") + lenOf(M.dist(oppS[0], oppS[1]) / sc), c.vy, c, W, H, 14);
        sideLab(ctx, adjS[0], adjS[1], G, (narrow ? "adj. " : "adjacent ") + lenOf(M.dist(adjS[0], adjS[1]) / sc), c.vx, c, W, H, 12);
        [[A, "A"], [B, "B"], [C, "C"]].forEach(function (q) { var dx = q[0][0] - G[0], dy = q[0][1] - G[1], d = Math.hypot(dx, dy) || 1; label(ctx, q[1], q[0][0] + dx / d * 14, q[0][1] + dy / d * 14, c.ink, "700 14px " + c.font); });
        // definitions, colour-coded
        var x0 = narrow ? 12 : W * 0.62, y0 = narrow ? 14 : 30, f = (narrow ? "700 12px " : "700 14px ") + c.font, gap = narrow ? 18 : 26;
        var lines = [["sin " + n.ang + " = ", "opposite", c.vy, "hypotenuse", c.path], ["cos " + n.ang + " = ", "adjacent", c.vx, "hypotenuse", c.path], ["tan " + n.ang + " = ", "opposite", c.vy, "adjacent", c.vx]];
        lines.forEach(function (l, i) {
          var y = y0 + i * gap, x = narrow ? x0 + (i % 3) * 0 : x0; ctx.font = f; ctx.textAlign = "left"; ctx.textBaseline = "middle";
          if (narrow) { x = 12 + i * ((W - 24) / 3); y = y0; }
          var parts = narrow ? [[l[0].trim().replace(" =", ""), c.ink], [" " + l[1].slice(0, 3) + "/" + l[3].slice(0, 3), c.muted]] : [[l[0], c.ink], [l[1], l[2]], [" ÷ ", c.muted], [l[3], l[4]]];
          parts.forEach(function (p) { ctx.fillStyle = p[1]; ctx.fillText(p[0], x, y); x += ctx.measureText(p[0]).width; });
        });
        if (!narrow) label(ctx, "∠B = 90°", W * 0.62, y0 + 3 * gap, c.muted, "12px " + c.font, "left");
      } else if (s.mode === "circle") {
        var th = shown.th, Rr = Math.min(W - (narrow ? 70 : W * 0.45) , H - 60), O = [narrow ? 36 : 50, H - 34], P = [O[0] + Rr * Math.cos(th * R), O[1] - Rr * Math.sin(th * R)], Mp = [P[0], O[1]];
        ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
        for (var i = 1; i <= 4; i++) { var gx = O[0] + Rr * i / 4, gy = O[1] - Rr * i / 4; seg(ctx, [gx, O[1]], [gx, O[1] - Rr - 8], c.grid, 1); seg(ctx, [O[0], gy], [O[0] + Rr + 8, gy], c.grid, 1); }
        seg(ctx, [O[0] - 8, O[1]], [O[0] + Rr + 18, O[1]], c.muted, 1.5); seg(ctx, [O[0], O[1] + 8], [O[0], O[1] - Rr - 18], c.muted, 1.5);
        ctx.save(); ctx.strokeStyle = c.muted; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(O[0], O[1], Rr, -Math.PI / 2, 0); ctx.stroke(); ctx.restore();
        label(ctx, "1", O[0] + Rr, O[1] + 12, c.muted, "11px " + c.font); label(ctx, "1", O[0] - 10, O[1] - Rr, c.muted, "11px " + c.font);
        ctx.fillStyle = c.tint; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(Mp[0], Mp[1]); ctx.lineTo(P[0], P[1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
        seg(ctx, O, Mp, c.vx, 4); seg(ctx, Mp, P, c.vy, 4); seg(ctx, O, P, c.path, 4);
        if (th > 2 && th < 88) rightMark(ctx, Mp, O, P, 10, c.ink);
        if (th > 0) M.arc(ctx, O, Mp[0] > O[0] + 1 ? Mp : [O[0] + 10, O[1]], P, 24, c.ink, "θ", c);
        M.dot(ctx, P[0], P[1], 6, c.path, c.surface);
        label(ctx, "O", O[0] - 12, O[1] + 12, c.ink, "700 13px " + c.font); label(ctx, "P", P[0] + 12, P[1] - 10, c.path, "700 13px " + c.font); label(ctx, "M", Mp[0], O[1] + 14, c.ink, "700 13px " + c.font);
        if (th < 85) label(ctx, "cos θ", (O[0] + Mp[0]) / 2, O[1] - 12, c.vx, "700 12px " + c.font);
        if (th > 5) { if (narrow) label(ctx, "sin θ", P[0] - 8, (P[1] + O[1]) / 2 + 10, c.vy, "700 12px " + c.font, "right"); else label(ctx, "sin θ", P[0] + 8, (P[1] + O[1]) / 2, c.vy, "700 12px " + c.font, "left"); }
        var px = O[0] + Rr * 0.5 * Math.cos(th * R) - 14 * Math.sin(th * R), py = O[1] - Rr * 0.5 * Math.sin(th * R) - 14 * Math.cos(th * R);
        label(ctx, "1", px, py, c.path, "700 12px " + c.font);
        // bars: sin² and cos² fill a length of 1
        var bx = narrow ? O[0] + Rr * 0.08 : W * 0.6, bw = narrow ? 0 : W * 0.34, by = 40;
        if (!narrow) {
          var sn2 = Math.pow(Math.sin(th * R), 2);
          label(ctx, "sin²θ + cos²θ", bx, by - 16, c.ink, "700 13px " + c.font, "left");
          ctx.fillStyle = c.vy; ctx.fillRect(bx, by, bw * sn2, 22); ctx.fillStyle = c.vx; ctx.fillRect(bx + bw * sn2, by, bw * (1 - sn2), 22);
          ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.strokeRect(bx, by, bw, 22);
          label(ctx, "always exactly 1", bx + bw, by + 38, c.muted, "12px " + c.font, "right");
          if (sn2 > 0.12) label(ctx, "sin²θ", bx + bw * sn2 / 2, by + 11, c.surface, "700 11px " + c.font);
          if (sn2 < 0.88) label(ctx, "cos²θ", bx + bw * (1 + sn2) / 2, by + 11, c.surface, "700 11px " + c.font);
        }
      } else {
        // special triangle on the left (or top), table on the right (or bottom)
        var tb = narrow ? { x: 8, y: H * 0.56, w: W - 16, h: H * 0.44 - 8 } : { x: W * 0.5, y: H * 0.18, w: W * 0.48, h: H * 0.6 };
        var fb = narrow ? { x: 10, y: 8, w: W - 20, h: H * 0.56 - 16 } : { x: 14, y: 14, w: W * 0.46, h: H - 28 };
        drawSpecial(ctx, c, fb, narrow);
        var cols = ["", "0°", "30°", "45°", "60°", "90°"], rows = ["sin", "cos", "tan"], cw = tb.w / 6, rh = tb.h / 4;
        var ci = SPECIAL.indexOf(s.sa) + 1;
        ctx.fillStyle = c.tint; ctx.fillRect(tb.x + ci * cw, tb.y, cw, tb.h);
        ctx.strokeStyle = c.path; ctx.lineWidth = 2; ctx.strokeRect(tb.x + ci * cw + 1, tb.y + 1, cw - 2, tb.h - 2);
        ctx.strokeStyle = c.line; ctx.lineWidth = 1;
        for (var r = 1; r < 4; r++) seg(ctx, [tb.x, tb.y + r * rh], [tb.x + tb.w, tb.y + r * rh], c.line, 1);
        seg(ctx, [tb.x + cw, tb.y], [tb.x + cw, tb.y + tb.h], c.line, 1);
        var fs = narrow ? 11 : 14;
        cols.forEach(function (h, j) { if (j) label(ctx, h, tb.x + (j + 0.5) * cw, tb.y + rh / 2, j === ci ? c.path : c.ink, "700 " + fs + "px " + c.font); });
        rows.forEach(function (rn, ri) {
          label(ctx, rn, tb.x + cw / 2, tb.y + (ri + 1.5) * rh, c.ink, "700 " + fs + "px " + c.font);
          SPECIAL.forEach(function (a, j) {
            var v = EXACT[a][rn][0]; if (v === "not defined") v = "n.d.";
            label(ctx, v, tb.x + (j + 1.5) * cw, tb.y + (ri + 1.5) * rh, j + 1 === ci ? c.path : c.ink, (j + 1 === ci ? "700 " : "") + fs + "px " + c.font);
          });
        });
        if (!narrow) label(ctx, "n.d. = not defined", tb.x + tb.w, tb.y + tb.h + 16, c.muted, "11px " + c.font, "right");
      }
    };

    function drawSpecial(ctx, c, b, narrow) {
      var a = s.sa, fnt = "700 12px " + c.font;
      if (a === 0 || a === 90) {
        var Rr = Math.min(b.w - 40, b.h - 62), O = [b.x + 20, b.y + b.h - 14], P = a === 0 ? [O[0] + Rr, O[1]] : [O[0], O[1] - Rr];
        ctx.save(); ctx.strokeStyle = c.muted; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(O[0], O[1], Rr, -Math.PI / 2, 0); ctx.stroke(); ctx.restore();
        seg(ctx, O, [O[0] + Rr + 10, O[1]], c.muted, 1.2); seg(ctx, O, [O[0], O[1] - Rr - 10], c.muted, 1.2);
        seg(ctx, O, P, c.path, 4); M.dot(ctx, P[0], P[1], 6, c.path, c.surface);
        label(ctx, narrow ? "hyp. 1" : "hypotenuse 1", a === 0 ? (O[0] + P[0]) / 2 : O[0] + 10, a === 0 ? O[1] - 14 : (O[1] + P[1]) / 2, c.path, fnt, a === 0 ? "center" : "left");
        var t1 = a === 0 ? "opposite = 0" : "opposite = 1", t2 = a === 0 ? "adjacent = 1" : "adjacent = 0";
        ctx.font = fnt;
        if (ctx.measureText(t1 + ", " + t2).width < b.w - 60) label(ctx, t1 + ", " + t2, b.x + 40, b.y + 18, c.ink, fnt, "left");
        else { label(ctx, t1, b.x + 40, b.y + 10, c.vy, fnt, "left"); label(ctx, t2, b.x + 40, b.y + 27, c.vx, fnt, "left"); }
        return;
      }
      // right triangle: θ at A (bottom-left), right angle at B
      var opp = a === 30 ? 1 : a === 45 ? 1 : Math.sqrt(3), adj = a === 30 ? Math.sqrt(3) : a === 45 ? 1 : 1;
      var ext = a === 30 ? { w: adj, h: 2 * opp } : a === 60 ? { w: 2 * adj, h: opp } : { w: adj, h: opp };
      var sc = Math.min((b.w - 70) / ext.w, (b.h - 30) / ext.h), A = [b.x + 30, b.y + b.h - 10 - (a === 30 ? opp * sc : 0)];
      if (a !== 30) A[1] = b.y + b.h - 12;
      var B = [A[0] + adj * sc, A[1]], C = [B[0], A[1] - opp * sc];
      // the other half, dashed: equilateral triangle for 30°/60°, square for 45°
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.beginPath();
      if (a === 30) { var C2 = [B[0], A[1] + opp * sc]; ctx.moveTo(A[0], A[1]); ctx.lineTo(C2[0], C2[1]); ctx.lineTo(B[0], B[1]); }
      else if (a === 60) { var A2 = [B[0] + adj * sc, A[1]]; ctx.moveTo(B[0], B[1]); ctx.lineTo(A2[0], A2[1]); ctx.lineTo(C[0], C[1]); }
      else { ctx.moveTo(A[0], A[1]); ctx.lineTo(A[0], C[1]); ctx.lineTo(C[0], C[1]); }
      ctx.stroke(); ctx.restore();
      ctx.fillStyle = c.tint; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      seg(ctx, A, C, c.path, 4); seg(ctx, B, C, c.vy, 4); seg(ctx, A, B, c.vx, 4);
      rightMark(ctx, B, A, C, 10, c.ink);
      M.arc(ctx, A, B, C, 24, c.ink, null, c);
      var m = Math.atan2(C[1] - A[1], C[0] - A[0]) / 2;
      label(ctx, a + "°", A[0] + Math.cos(m) * 40 + 4, A[1] + Math.sin(m) * 40, c.ink, fnt, "left");
      var E = { 30: ["2", "1", "√3"], 45: ["√2", "1", "1"], 60: ["2", "√3", "1"] }[a];
      label(ctx, E[0], (A[0] + C[0]) / 2 - 10, (A[1] + C[1]) / 2 - 10, c.path, "700 14px " + c.font, "right");
      label(ctx, E[1], B[0] + 8, (B[1] + C[1]) / 2, c.vy, "700 14px " + c.font, "left");
      label(ctx, E[2], (A[0] + B[0]) / 2 + (a === 30 ? 10 : 0), A[1] + 13, c.vx, "700 14px " + c.font);
      if (!narrow) label(ctx, a === 45 ? "half of a square" : "half of an equilateral triangle", b.x + 4, b.y + 6, c.muted, "12px " + c.font, "left", "top");
    }

    var shows = [
      k.bindSlider("A", function () { return s.A; }, function (v) { s.A = v; update(); }, function (v) { return v + "°"; }),
      k.bindSlider("hyp", function () { return s.hyp; }, function (v) { s.hyp = shown.hyp = v; clock.stop(); update(); }, function (v) { return nice(v) + " cm"; }),
      k.bindSlider("opp", function () { return s.opp; }, function (v) { s.opp = v; update(); }, function (v) { return v + " cm"; }),
      k.bindSlider("adj", function () { return s.adj; }, function (v) { s.adj = v; update(); }, function (v) { return v + " cm"; }),
      k.bindSlider("th", function () { return s.th; }, function (v) { s.th = shown.th = v; clock.stop(); update(); }, function (v) { return v + "°"; }),
      k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; clock.stop(); shown.hyp = s.hyp; shown.th = s.th; update(); }),
      k.bindChips("input", function () { return s.input; }, function (v) { s.input = v; update(); }),
      k.bindChips("at", function () { return s.at; }, function (v) { s.at = v; update(); }),
      k.bindChips("sa", function () { return String(s.sa); }, function (v) { s.sa = +v; update(); })
    ];
    var simBox = k.bindCheck("similar", function (on) { s.similar = on; k.redraw(); });

    // play: grow the triangle (ratios) or sweep the angle (circle), ending at the set values
    var clock = K.clock(function (dt) {
      s.t = Math.min(1, s.t + dt / 1.6);
      if (s.mode === "ratios") shown.hyp = 2 + (s.hyp - 2) * s.t; else shown.th = s.th * s.t;
      update(); return s.t < 1;
    });
    function play() {
      if (!s.anim || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if ((s.mode === "ratios" && s.input === "angle") || s.mode === "circle") { s.t = 0; clock.start(); }
    }
    update();
    return {
      set: function (o) {
        clock.stop(); s.anim = ""; Object.assign(s, o); shown.hyp = s.hyp; shown.th = s.th; s.t = 1;
        simBox.checked = !!s.similar; fitAspect(); update();
      },
      play: play,
      seek: function (t) { clock.stop(); s.t = t; shown.hyp = 2 + (s.hyp - 2) * t; shown.th = s.th * t; update(); },
      state: function () { return JSON.parse(JSON.stringify(s)); }
    };
  }
  window.TrigSim = { mount: mount, EXACT: EXACT };
})();
