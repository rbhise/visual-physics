/*
 * Conditional statements and proofs (Std 9 Geometry Ch. 1). Three views:
 *   ifthen   – an "If p, then q" statement drawn as two sets: the statement is true when everything that
 *              satisfies the antecedent p lies inside the set for the consequent q. "Converse" swaps p and q;
 *              objects in q but not in p are counterexamples.
 *   direct   – a direct proof, step by step: vertically opposite angles are equal (drag the angle slider)
 *   indirect – an indirect proof: two distinct lines cannot meet in two points
 * Needs sim-kit.js and math-kit.js.  GeoLogicSim.mount(el, { mode: "ifthen", st: "four", conv: false }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, R = Math.PI / 180;

  var ST = {
    four: { name: "Divisible by 4", p: "a number is divisible by 4", q: "it is divisible by 2", pc: "a number is divisible by 2", qc: "it is divisible by 4",
      pS: "divisible by 4", qS: "divisible by 2", eq: false, inP: ["4", "12", "20", "36"], qOnly: ["6", "10", "18"], out: ["7", "9", "15", "25"],
      ex: "12: divisible by 4 and by 2", cex: "6: divisible by 2, not by 4" },
    square: { name: "Square", p: "a quadrilateral is a square", q: "it is a rectangle", pc: "a quadrilateral is a rectangle", qc: "it is a square",
      pS: "squares", qS: "rectangles", eq: false, inP: ["sq", "sq2"], qOnly: ["rect", "rect2"], out: ["rhom", "trap", "par"],
      ex: "a square has four right angles", cex: "a 6 cm × 3 cm rectangle" },
    equi: { name: "Equilateral", p: "a triangle is equilateral", q: "its angles are all equal", pc: "the angles of a triangle are all equal", qc: "it is equilateral",
      pS: "equilateral", qS: "all angles equal", eq: true, inP: ["eq", "eq2", "eq3"], qOnly: [], out: ["iso", "sc", "rt"],
      ex: "sides 5, 5, 5 cm: angles 60°, 60°, 60°", cex: "" },
    x3: { name: "x = 3", p: "x = 3", q: "x² = 9", pc: "x² = 9", qc: "x = 3",
      pS: "x = 3", qS: "x² = 9", eq: false, inP: ["3"], qOnly: ["−3"], out: ["1", "4", "−5", "0"],
      ex: "x = 3: 3² = 9", cex: "x = −3: (−3)² = 9, but x ≠ 3" },
    lp: { name: "Linear pair", p: "two angles form a linear pair", q: "they are supplementary", pc: "two angles are supplementary", qc: "they form a linear pair",
      pS: "linear pairs", qS: "supplementary", eq: false, inP: ["lp", "lp2"], qOnly: ["sep"], out: ["adj", "sep2"],
      ex: "120° and 60° side by side on a line", cex: "130° and 50° drawn apart" }
  };
  var ORDER = ["four", "square", "equi", "x3", "lp"];

  var DIRECT = [
    ["given", "Given: lines AB and CD meet at O, with A-O-B and C-O-D.", []],
    ["given", "To prove: ∠AOC = ∠BOD and ∠BOC = ∠AOD.", []],
    ["", "∠AOC + ∠BOC = 180° … linear pair  (I)", ["AOC", "BOC"]],
    ["", "∠BOC + ∠BOD = 180° … linear pair  (II)", ["BOC", "BOD"]],
    ["", "From (I) and (II): ∠AOC + ∠BOC = ∠BOC + ∠BOD", ["AOC", "BOC", "BOD"]],
    ["final", "So ∠AOC = ∠BOD", ["AOC", "BOD"]],
    ["final", "In the same way, ∠BOC = ∠AOD", ["BOC", "AOD"]]
  ];
  var INDIRECT = [
    ["given", "Given: l and m are two distinct lines that meet at P.", []],
    ["given", "To prove: l and m meet in only one point.", []],
    ["", "Suppose not: l and m also meet at another point Q.", []],
    ["", "Then line l passes through P and Q, and line m passes through P and Q.", []],
    ["", "But only one line passes through two distinct points. So l and m are the same line.", []],
    ["bad", "That contradicts “l and m are distinct”.", []],
    ["final", "So the supposition is wrong: l and m meet in only one point.", []]
  ];
  var LABELS = {
    ifthen: ["Antecedent (given part)", "Consequent (to be proved)", "Is it true?", "Example", "Counterexample", "The other direction"],
    direct: ["∠AOC", "∠BOC", "∠BOD", "∠AOD", "∠AOC + ∠BOC", "Step"],
    indirect: ["Given", "To prove", "Suppose", "Then", "Contradiction", "Step"]
  };

  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "gl";
    var s = Object.assign({ mode: "ifthen", st: "four", conv: false, ang: 55, step: 0 }, opts);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "An if-then statement drawn as sets, or a proof shown step by step",
      panel: K.chips("mode", "Show", [["ifthen", "If-then"], ["direct", "Direct proof"], ["indirect", "Indirect proof"]]) +
        '<div data-for="ifthen"><div class="seg-label" style="margin-top:.6rem">Statement</div><select class="sel" data-sel="st">' +
          ORDER.map(function (q) { return '<option value="' + q + '">' + ST[q].name + '</option>'; }).join("") + '</select>' +
          '<div class="seg" style="margin-top:.6rem" data-seg="conv"><button type="button" data-v="0">Statement</button><button type="button" data-v="1">Converse</button></div></div>' +
        '<div data-for="direct">' + K.slider(id, "ang", "∠AOC", 20, 160, 1, "°") + '</div>' +
        '<div data-for="direct indirect">' + K.buttons([["next", "Next step"], ["reset", "Start again"]]) + '</div>' +
        K.hint("note"),
      readouts: [["r1", "–", "c-path wrap"], ["r2", "–", "c-vx wrap"], ["r3", "–", "wrap"], ["r4", "–", "wrap"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");
    var steps = document.createElement("ol"); steps.className = "steps-list"; steps.setAttribute("aria-live", "polite");
    root.querySelector(".sim-body").appendChild(steps);
    var sel = root.querySelector('[data-sel="st"]'), seg = root.querySelector('[data-seg="conv"]');

    function proof() { return s.mode === "direct" ? DIRECT : INDIRECT; }
    function maxStep() { return proof().length - 1; }

    function update() {
      LABELS[s.mode].forEach(function (t, i) { spans[i].textContent = t; });
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for.split(" ").indexOf(s.mode) >= 0 ? "" : "none"; });
      sel.value = s.st;
      seg.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === (s.conv ? "1" : "0"))); });
      var note = "";
      if (s.mode === "ifthen") {
        steps.style.display = "none";
        var T = ST[s.st], p = s.conv ? T.pc : T.p, q = s.conv ? T.qc : T.q, ok = !s.conv || T.eq;
        k.set("r1", p); k.set("r2", q); k.set("r3", ok ? "Yes, true" : "No, false");
        k.set("r4", s.conv && T.eq ? "60°, 60°, 60°: sides equal" : T.ex);
        k.set("r5", ok ? "None" : T.cex);
        k.set("r6", s.conv ? "The statement is true" : T.eq ? "The converse is true too" : "The converse is false");
        note = !s.conv ? "Every object inside the violet set (the antecedent) is also inside the teal set (the consequent). So the statement is true."
          : T.eq ? "The converse swaps the antecedent and the consequent. Here the two sets are the same, so the converse is true as well."
          : "The converse swaps the antecedent and the consequent. Objects marked ✗ satisfy the new antecedent but not the new consequent: counterexamples. The converse of a true statement need not be true.";
      } else {
        steps.style.display = "";
        var P = proof();
        steps.innerHTML = P.slice(0, s.step + 1).map(function (r) { return '<li class="' + r[0] + '"' + (r[0] === "given" ? "" : ' value="' + (P.indexOf(r) - 1) + '"') + (r[0] === "bad" ? ' style="color:var(--bad);font-weight:700"' : "") + '>' + r[1] + '</li>'; }).join("");
        if (s.mode === "direct") {
          var a = s.ang;
          k.set("r1", a + "°"); k.set("r2", (180 - a) + "°"); k.set("r3", a + "°"); k.set("r4", (180 - a) + "°"); k.set("r5", a + "° + " + (180 - a) + "° = 180°");
          note = s.step < maxStep() ? "Press “Next step”. The angles used in each step light up. Drag the slider: the steps stay true for every angle." : "Each step follows from the one before or from a known fact. This is a direct proof: vertically opposite angles are equal.";
        } else {
          k.set("r1", "l ≠ m, they meet at P"); k.set("r2", "only one meeting point"); k.set("r3", s.step >= 2 ? "they also meet at Q" : "–");
          k.set("r4", s.step >= 4 ? "l and m are the same line" : s.step >= 3 ? "l and m both pass through P and Q" : "–");
          k.set("r5", s.step >= 5 ? "l and m were distinct" : "–");
          note = s.step < maxStep() ? "In an indirect proof we suppose the conclusion is false and show that this leads to something impossible." : "The supposition led to a contradiction, so it was wrong and the statement is true. This is an indirect proof.";
        }
        k.set("r6", s.step >= 2 ? (s.step - 1) + " of " + (maxStep() - 1) : "Given");
        k.btn("next").disabled = s.step >= maxStep();
      }
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    // ---- canvas text with coloured runs, wrapped to a width
    function runs(ctx, list, x, y, w, lh) {
      var words = [];
      list.forEach(function (r) { r[0].split(" ").forEach(function (wd, i) { if (wd) words.push([wd, r[1], r[2]]); }); });
      var cx = x, cy = y, sp = ctx.measureText(" ").width, lines = 1;
      words.forEach(function (wd) {
        ctx.font = (wd[2] ? "700 " : "") + k._fs + "px " + k._ff;
        var ww = ctx.measureText(wd[0]).width;
        if (cx > x && cx + ww > x + w) { cx = x; cy += lh; lines++; }
        ctx.fillStyle = wd[1]; ctx.fillText(wd[0], cx, cy); cx += ww + sp;
      });
      return lines;
    }

    function ellipse(ctx, cx, cy, rx, ry, col, fillA) {
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.globalAlpha = fillA; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
    }

    // small pictures of objects, centred at (x, y), half-size z
    function thing(ctx, c, name, x, y, z) {
      if (/^(lp|lp2|sep|sep2|adj)$/.test(name)) z *= 1.45;
      ctx.save(); ctx.translate(x, y); ctx.strokeStyle = c.ink; ctx.lineWidth = 1.8; ctx.lineJoin = "round";
      function poly(P) { ctx.beginPath(); P.forEach(function (p, i) { if (i) ctx.lineTo(p[0] * z, p[1] * z); else ctx.moveTo(p[0] * z, p[1] * z); }); ctx.closePath(); ctx.stroke(); }
      function rays(a1, a2, ox) { ctx.beginPath(); ctx.moveTo(ox * z + Math.cos(a1 * R) * 1.1 * z, -Math.sin(a1 * R) * 1.1 * z); ctx.lineTo(ox * z, 0); ctx.lineTo(ox * z + Math.cos(a2 * R) * 1.1 * z, -Math.sin(a2 * R) * 1.1 * z); ctx.stroke(); }
      function arcA(a1, a2, ox, col) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ox * z, 0, 0.38 * z, -a2 * R, -a1 * R); ctx.stroke(); ctx.restore(); }
      var D = {
        sq: function () { poly([[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]]); },
        sq2: function () { ctx.rotate(0.35); poly([[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]]); },
        rect: function () { poly([[-1.2, -0.55], [1.2, -0.55], [1.2, 0.55], [-1.2, 0.55]]); },
        rect2: function () { poly([[-0.45, -0.95], [0.45, -0.95], [0.45, 0.95], [-0.45, 0.95]]); },
        rhom: function () { poly([[0, -0.95], [0.65, 0], [0, 0.95], [-0.65, 0]]); },
        trap: function () { poly([[-0.5, -0.6], [0.5, -0.6], [1.1, 0.6], [-1.1, 0.6]]); },
        par: function () { poly([[-0.6, -0.55], [1.1, -0.55], [0.6, 0.55], [-1.1, 0.55]]); },
        eq: function () { poly([[0, -0.85], [0.98, 0.85], [-0.98, 0.85]]); },
        eq2: function () { ctx.rotate(0.5); poly([[0, -0.6], [0.7, 0.6], [-0.7, 0.6]]); },
        eq3: function () { ctx.rotate(Math.PI); poly([[0, -0.75], [0.87, 0.75], [-0.87, 0.75]]); },
        iso: function () { poly([[0, -1], [0.5, 0.8], [-0.5, 0.8]]); },
        sc: function () { poly([[0.5, -0.8], [1.1, 0.7], [-1.1, 0.7]]); },
        rt: function () { poly([[-0.8, -0.8], [0.9, 0.7], [-0.8, 0.7]]); },
        lp: function () { ctx.beginPath(); ctx.moveTo(-1.2 * z, 0); ctx.lineTo(1.2 * z, 0); ctx.stroke(); rays(0, 60, 0); arcA(0, 60, 0, c.path); arcA(60, 180, 0, c.vx); },
        lp2: function () { ctx.beginPath(); ctx.moveTo(-1.2 * z, 0); ctx.lineTo(1.2 * z, 0); ctx.stroke(); rays(0, 110, 0); arcA(0, 110, 0, c.path); arcA(110, 180, 0, c.vx); },
        sep: function () { ctx.translate(0, 0.3 * z); rays(0, 130, -0.6); arcA(0, 130, -0.6, c.path); rays(0, 50, 0.55); arcA(0, 50, 0.55, c.vx); },
        sep2: function () { ctx.translate(0, 0.3 * z); rays(0, 30, -0.7); arcA(0, 30, -0.7, c.muted); rays(0, 80, 0.5); arcA(0, 80, 0.5, c.muted); },
        adj: function () { ctx.translate(-0.3 * z, 0.4 * z); rays(0, 70, 0); rays(70, 110, 0); arcA(0, 40, 0, c.muted); arcA(40, 110, 0, c.muted); }
      };
      if (D[name]) D[name]();
      else { ctx.fillStyle = c.ink; ctx.font = "700 " + Math.round(z * 1.25) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(name, 0, 0); }
      ctx.restore();
    }
    function mark(ctx, c, x, y, good) {
      ctx.save(); ctx.fillStyle = good ? c.good : c.bad; ctx.font = "700 " + (k.W > 600 ? 20 : 14) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(good ? "✓" : "✗", x, y); ctx.restore();
    }

    function drawIfThen(ctx, W, H, c) {
      var T = ST[s.st], big = W > 600;
      k._fs = big ? 18 : 13.5; k._ff = c.font;
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      var p = s.conv ? T.pc : T.p, q = s.conv ? T.qc : T.q, lh = k._fs * 1.35;
      var lines = runs(ctx, [["If", c.ink], [p + ",", c.path, 1], ["then", c.ink], [q + ".", c.vx, 1]], 12, 10, W - 24, lh);
      var top = 10 + lines * lh + 8, x0 = 6, w = W - 12, h = H - top - 6;
      var legend = !big;
      if (legend) {   // narrow screens: name the sets in a key instead of inside the ovals
        var ly = top - 2, lx = 12;
        ctx.font = "700 11px " + c.font; ctx.textBaseline = "top";
        [[T.pS, s.conv ? c.vx : c.path], [(T.eq ? "= " : "") + T.qS, s.conv ? c.path : c.vx]].forEach(function (q) {
          ctx.fillStyle = q[1]; ctx.fillRect(lx, ly + 2, 9, 9); ctx.fillText(q[0], lx + 13, ly); lx += ctx.measureText(q[0]).width + 30;
        });
        top += 16; h -= 16;
      }
      var cx = W / 2, cy = top + h / 2, rx = w * 0.37, ry = h * 0.47, z = big ? 22 : 12;
      // colours follow the sentence: the antecedent's set is always violet
      var colOuter = s.conv ? c.path : c.vx, colInner = s.conv ? c.vx : c.path;
      ctx.font = "700 " + (big ? 14 : 11) + "px " + c.font;
      if (T.eq) {
        ellipse(ctx, cx, cy, rx * 0.8, ry, c.path, 0.1);
        ctx.setLineDash([7, 6]); ctx.strokeStyle = c.vx; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.8, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        if (!legend) { ctx.fillStyle = s.conv ? c.vx : c.path; ctx.fillText(T.pS, cx, cy - ry * 0.62); }
        if (!legend) ctx.fillStyle = s.conv ? c.path : c.vx; if (!legend) ctx.fillText("= " + T.qS, cx, cy - ry * 0.62 + (big ? 18 : 14));
        T.inP.forEach(function (n, i) { var x = cx + (i - (T.inP.length - 1) / 2) * rx * 0.45, y = cy + ry * 0.2; thing(ctx, c, n, x, y, z); mark(ctx, c, x + z * 1.2, y - z * 1.1, true); });
      } else {
        var icx = cx - rx * 0.3, irx = rx * 0.52, iry = ry * 0.66;
        ellipse(ctx, cx, cy, rx, ry, colOuter, 0.08);
        ellipse(ctx, icx, cy + ry * 0.12, irx, iry, colInner, 0.12);
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        if (!legend) ctx.fillStyle = colOuter; if (!legend) ctx.fillText(T.qS, cx + rx * 0.45, cy - ry * 0.55);
        if (!legend) ctx.fillStyle = colInner; if (!legend) ctx.fillText(T.pS, icx, cy + ry * 0.12 - iry * 0.82);
        var n = T.inP.length, cols = n > 2 ? 2 : n, rowsN = Math.ceil(n / cols);
        T.inP.forEach(function (nm, i) {
          var cI = i % cols, rI = Math.floor(i / cols);
          var x = icx + (cols > 1 ? (cI - 0.5) * irx * 0.85 : 0), y = cy + ry * 0.2 + (rowsN > 1 ? (rI - 0.5) * iry * 0.75 : 0);
          thing(ctx, c, nm, x, y, z); mark(ctx, c, x + z * 1.25, y - z * 1.05, true);
        });
        T.qOnly.forEach(function (nm, i) {
          var x = cx + rx * 0.62, y = cy + ry * 0.05 + (i - (T.qOnly.length - 1) / 2) * Math.min(ry * 0.55, z * 2.9);
          thing(ctx, c, nm, x, y, z);
          if (s.conv) mark(ctx, c, x + z * 1.35, y - z * 1.05, false);
        });
      }
      var corners = [[x0 + w * 0.06, top + h * 0.12], [x0 + w * 0.94, top + h * 0.88], [x0 + w * 0.06, top + h * 0.88], [x0 + w * 0.94, top + h * 0.12]];
      T.out.forEach(function (nm, i) { var p2 = corners[i % 4]; thing(ctx, c, nm, p2[0], p2[1], z * 0.85); });
    }

    function drawDirect(ctx, W, H, c) {
      var O = [W / 2, H * 0.52], L = Math.min(W * 0.42, H * 0.46), a = s.ang * R, big = W > 600;
      var A = [O[0] - L, O[1]], B = [O[0] + L, O[1]], C = [O[0] - Math.cos(a) * L, O[1] - Math.sin(a) * L], D = [O[0] + Math.cos(a) * L, O[1] + Math.sin(a) * L];
      var lit = s.step >= 2 ? DIRECT[s.step][2] : [];
      var defs = { AOC: [A, C, c.path], BOC: [B, C, c.vx], BOD: [B, D, c.path], AOD: [A, D, c.vx] };
      var vals = { AOC: s.ang, BOC: 180 - s.ang, BOD: s.ang, AOD: 180 - s.ang };
      Object.keys(defs).forEach(function (n) {
        var on = lit.indexOf(n) >= 0 || s.step < 2;
        ctx.globalAlpha = on ? 1 : 0.22;
        M.arc(ctx, O, defs[n][0], defs[n][1], (n === "AOC" || n === "BOD" ? 0.2 : 0.3) * L, defs[n][2], vals[n] + "°", c);
        ctx.globalAlpha = 1;
      });
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5;
      [[A, B], [C, D]].forEach(function (q) { ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.stroke(); });
      M.dot(ctx, O[0], O[1], 4.5, c.ink);
      ctx.fillStyle = c.ink; ctx.font = "700 " + (big ? 17 : 14) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      [[A, "A"], [B, "B"], [C, "C"], [D, "D"]].forEach(function (q) { var dx = q[0][0] - O[0], dy = q[0][1] - O[1], d = Math.hypot(dx, dy); ctx.fillText(q[1], q[0][0] + dx / d * 14, q[0][1] + dy / d * 14); });
      var ob = (a + Math.PI) / 2; ctx.fillText("O", O[0] + Math.cos(ob) * 20, O[1] + Math.sin(ob) * 20);
    }

    function drawIndirect(ctx, W, H, c) {
      var big = W > 600, P = [W * 0.4, H * 0.5], dl = [Math.cos(-12 * R), Math.sin(-12 * R)], dm = [Math.cos(-62 * R), Math.sin(-62 * R)], L = W;
      var Q = [P[0] + dl[0] * W * 0.36, P[1] + dl[1] * W * 0.36], same = s.step === 4 || s.step === 5, st = s.step;
      function line(d, col, w, dash) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(P[0] - d[0] * L, P[1] - d[1] * L); ctx.lineTo(P[0] + d[0] * L, P[1] + d[1] * L); ctx.stroke(); ctx.restore(); }
      var fs = big ? 17 : 14;
      ctx.font = "700 " + fs + "px " + c.font; ctx.textBaseline = "middle"; ctx.textAlign = "left";
      if (same) {
        line(dl, c.path, 7); line(dl, c.vx, 2.5, [8, 7]);
        ctx.fillStyle = c.path; ctx.fillText("l", 10, P[1] - dl[1] * P[0] - 16);
        ctx.fillStyle = c.vx; ctx.fillText("= m", 22, P[1] - dl[1] * P[0] - 16);
      } else {
        line(dl, c.path, 3); line(dm, c.vx, 3);
        ctx.fillStyle = c.path; ctx.fillText("l", W - 20, P[1] + dl[1] * (W - 20 - P[0]) - 14);
        var my = 14, mx = P[0] + (my - P[1]) / dm[1] * dm[0];
        ctx.fillStyle = c.vx; ctx.fillText("m", mx + 10, my + 4);
      }
      if (st >= 2 && st <= 3) {   // the supposed second meeting point: m would have to bend to reach Q
        ctx.save(); ctx.strokeStyle = c.vx; ctx.lineWidth = 2.5; ctx.setLineDash([6, 6]);
        var far = [P[0] + dm[0] * H * 0.3, P[1] + dm[1] * H * 0.3];
        ctx.beginPath(); ctx.moveTo(far[0], far[1]); ctx.quadraticCurveTo(Q[0], far[1], Q[0], Q[1]); ctx.stroke(); ctx.restore();
        ctx.fillStyle = c.bad; ctx.font = "700 " + (big ? 14 : 11) + "px " + c.font; ctx.textAlign = "center";
        ctx.fillText("a straight line cannot bend", (far[0] + Q[0]) / 2 + 20, far[1] - 14);
      }
      M.dot(ctx, P[0], P[1], 5.5, c.ink, c.surface);
      ctx.fillStyle = c.ink; ctx.font = "700 " + fs + "px " + c.font; ctx.textAlign = "right"; ctx.fillText("P", P[0] - 10, P[1] + 14);
      if (st >= 2 && st <= 5) { M.dot(ctx, Q[0], Q[1], 5.5, c.bad, c.surface); ctx.fillStyle = c.bad; ctx.textAlign = "left"; ctx.fillText("Q", Q[0] + 4, Q[1] + 18); }
      if (st === 5) { ctx.fillStyle = c.bad; ctx.font = "700 " + (big ? 20 : 15) + "px " + c.font; ctx.textAlign = "center"; ctx.textAlign = "right"; ctx.fillText("Contradiction!", W - 12, H - 18); }
      if (st === 6) { ctx.fillStyle = c.good; ctx.font = "700 " + (big ? 18 : 14) + "px " + c.font; ctx.textAlign = "center"; ctx.textAlign = "right"; ctx.fillText("only one meeting point", W - 12, H - 18); }
    }

    k.draw = function (ctx, W, H, c) {
      if (s.mode === "ifthen") drawIfThen(ctx, W, H, c);
      else if (s.mode === "direct") drawDirect(ctx, W, H, c);
      else drawIndirect(ctx, W, H, c);
    };

    // stepping through a proof
    var acc = 0;
    var clock = K.clock(function (dt) {
      acc += dt; if (acc < 1.3) return true; acc = 0;
      if (s.step >= maxStep()) return false;
      s.step++; update(); return s.step < maxStep();
    });
    function play() {
      if (s.mode === "ifthen") return;
      clock.stop(); if (s.step >= maxStep()) return;
      if (reduce) { s.step = maxStep(); update(); return; }
      acc = 0; clock.start();
    }
    k.onAct({
      next: function () { clock.stop(); if (s.step < maxStep()) { s.step++; update(); } },
      reset: function () { clock.stop(); s.step = 0; update(); }
    });
    sel.addEventListener("change", function () { s.st = sel.value; update(); });
    seg.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { s.conv = b.dataset.v === "1"; update(); } });
    var showA = k.bindSlider("ang", function () { return s.ang; }, function (v) { s.ang = v; update(); }, function (v) { return v + "°"; });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { clock.stop(); s.mode = v; s.step = 0; update(); });
    update();
    return {
      set: function (o) { clock.stop(); if (o.mode && o.mode !== s.mode && o.step == null) s.step = 0; Object.assign(s, o); showA(); showM(); update(); },
      play: play,
      seek: function (n) { clock.stop(); s.step = Math.max(0, Math.min(maxStep(), n)); update(); },
      state: function () { return Object.assign({}, s); }
    };
  }
  window.GeoLogicSim = { mount: mount };
})();
