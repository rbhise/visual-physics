/*
 * Surds, three views:
 *   simplify – √n = k√m: a square of area n cut into k × k small squares, each of area m (side √m).
 *   compare  – a√b against c√d: square both (areas a²b and c²d) and compare the squares.
 *   rat      – rationalising the denominator. For √r the factor is √r (c squares of area r: c√r × √r = cr);
 *              for a binomial surd it is the conjugate, and (A + B)(A − B) = A² − B² is shown by cutting a
 *              B × B corner from an A × A square and moving the strip.
 * Needs sim-kit.js and math-kit.js.  RealSurdSim.mount(el, { mode: "simplify", n: 72 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit;
  var LABELS = {
    simplify: ["Surd", "Order", "Largest square factor", "Simplest form", "Like surds", "Is it a surd?"],
    compare:  ["First", "Second", "First squared", "Second squared", "Compare", "Decimal check"],
    rat:      ["Expression", "Rationalising factor", "New denominator", "Answer", "Value before", "Value after"]
  };
  // numerator / denominator: lists of [coefficient, radicand]
  var PRESETS = [
    { num: [[2, 1]], den: [[1, 7]] },
    { num: [[5, 1]], den: [[2, 3]] },
    { num: [[6, 1]], den: [[1, 8]] },
    { num: [[1, 1]], den: [[1, 6], [1, 2]] },
    { num: [[3, 1]], den: [[5, 1], [2, 6]] },
    { num: [[1, 7], [-1, 3]], den: [[1, 7], [1, 3]] },
    { num: [[4, 1]], den: [[3, 1], [-1, 5]] },
    { num: [[1, 1]], den: [[2, 1], [1, 3]] }
  ];

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a; }
  function sqPart(n) { var k = 1; for (var d = 2; d * d <= n; d++) while (n % (d * d) === 0) { n /= d * d; k *= d; } return [k, n]; }   // n = k² m
  function simp(t) { var q = sqPart(t[1]); return [t[0] * q[0], q[1]]; }
  function collect(list) {
    var map = {}, order = [];
    list.forEach(function (t) { var u = simp(t); if (!(u[1] in map)) { map[u[1]] = 0; order.push(u[1]); } map[u[1]] += u[0]; });
    return order.map(function (r) { return [map[r], +r]; }).filter(function (t) { return t[0] !== 0; });
  }
  function mul(A, B) { var out = []; A.forEach(function (a) { B.forEach(function (b) { out.push([a[0] * b[0], a[1] * b[1]]); }); }); return out; }
  function val(E) { return E.reduce(function (s, t) { return s + t[0] * Math.sqrt(t[1]); }, 0); }
  function term(t, first) {
    var c = t[0], a = Math.abs(c), body = t[1] === 1 ? String(a) : (a === 1 ? "" : a) + "√" + t[1];
    return first ? (c < 0 ? "−" : "") + body : (c < 0 ? " − " : " + ") + body;
  }
  function expr(E) { return E.length ? E.map(function (t, i) { return term(t, i === 0); }).join("") : "0"; }
  function wrap(E) { return E.length > 1 ? "(" + expr(E) + ")" : expr(E); }
  function fracStr(E, d) { return d === 1 ? expr(E) : wrap(E) + "/" + d; }
  function n4(x) { return (Math.abs(x) < 5e-5 ? 0 : x).toFixed(4).replace("-", "−"); }

  function sqT(t) { var u = [Math.abs(t[0]), t[1]]; return t[1] === 1 ? u[0] + "²" : "(" + term(u, true) + ")²"; }
  function rationalise(num, den) {
    var D = collect(den), N = collect(num), steps = [], factor, newDen, Nm;
    den.forEach(function (t) { var u = simp(t); if (u[0] !== t[0]) steps.push("First simplify: " + term([Math.abs(t[0]), t[1]], true) + " = " + term([Math.abs(u[0]), u[1]], true) + "."); });
    if (D.length === 1) {
      var r = D[0][1];
      factor = [[1, r]];
      newDen = D[0][0] * r;
      steps.push("The denominator " + expr(D) + " has the surd √" + r + ", so the rationalising factor is √" + r + ".");
      steps.push("Multiply numerator and denominator by √" + r + ": " + wrap(N) + " × √" + r + " / (" + expr(D) + " × √" + r + ")");
      steps.push("Denominator: " + expr(D) + " × √" + r + " = " + (D[0][0] === 1 ? "" : D[0][0] + " × " + r + " = ") + newDen);
    } else {
      factor = [D[0], [-D[1][0], D[1][1]]];
      var A2 = D[0][0] * D[0][0] * D[0][1], B2 = D[1][0] * D[1][0] * D[1][1];
      newDen = A2 - B2;
      steps.push("The conjugate of " + expr(D) + " is " + expr(factor) + ". Their product has no surd.");
      steps.push("Multiply numerator and denominator by " + expr(factor) + ".");
      steps.push("Denominator: " + sqT(D[0]) + " − " + sqT(D[1]) + " = " + A2 + " − " + B2 + " = " + newDen);
    }
    Nm = collect(mul(N, factor));
    steps.push("Numerator: " + wrap(N) + " × " + wrap(factor) + " = " + expr(Nm));
    var g = newDen; Nm.forEach(function (t) { g = gcd(g, t[0]); });
    if (newDen < 0) g = -Math.abs(g);
    var F = Nm.map(function (t) { return [t[0] / g, t[1]]; }), d = newDen / g;
    var ans = fracStr(F, d);
    steps.push("Answer: " + (Math.abs(g) !== 1 ? fracStr(Nm, newDen) + " = " : "") + ans);
    return { N: N, D: D, factor: factor, newDen: newDen, Nm: Nm, F: F, d: d, ans: ans, steps: steps, before: val(num) / val(den), after: val(F) / d, single: D.length === 1 };
  }
  function show(num, den) { return (num.length > 1 ? "(" + expr(num) + ")" : expr(num)) + "/" + (den.length > 1 ? "(" + expr(den) + ")" : expr(den)); }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "rs";
    var s = Object.assign({ mode: "simplify", n: 72, a: 7, b: 2, c: 5, d: 3, pick: 3, t: 1, shown: 99 }, opts);
    var clock = null;

    var k = K.frame(root, {
      aspect: "16 / 11",
      label: "Surds shown as squares: simplifying, comparing and rationalising the denominator",
      panel: K.chips("mode", "Show", [["simplify", "Simplest form"], ["compare", "Compare"], ["rat", "Rationalise"]]) +
        '<div data-for="simplify">' + K.slider(id, "n", "n in √n", 2, 300, 1, "") + '</div>' +
        '<div data-for="compare"><div class="eq-pick"><div class="seg-label">First: <b data-r="ft"></b></div>' + K.slider(id, "a", "a", 1, 9, 1, "") + K.slider(id, "b", "b", 2, 20, 1, "") + '</div>' +
          '<div class="eq-pick"><div class="seg-label">Second: <b data-r="st"></b></div>' + K.slider(id, "c", "c", 1, 9, 1, "") + K.slider(id, "d", "d", 2, 20, 1, "") + '</div></div>' +
        '<div data-for="rat"><label class="seg-label" for="' + id + '-pick">Expression</label><select class="sel" id="' + id + '-pick">' +
          PRESETS.map(function (p, i) { return '<option value="' + i + '">' + show(p.num, p.den) + "</option>"; }).join("") + '</select></div>' +
        K.buttons([["play", "Rationalise step by step"]]) + K.hint("note"),
      readouts: [["r1", "–", "c-path"], ["r2", "–", "wrap"], ["r3", "–", "wrap"], ["r4", "–", "c-vy wrap"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span"), sel = k.el("#" + id + "-pick"), stage = k.el(".sim-stage");
    var steps = document.createElement("ol"); steps.className = "steps-list"; steps.setAttribute("aria-live", "polite");
    root.querySelector(".sim-body").appendChild(steps);
    function fitAspect() { var a = root.clientWidth >= 560 ? "16 / 11" : "1 / 1"; if (stage.style.aspectRatio !== a) stage.style.aspectRatio = a; }
    window.addEventListener("resize", fitAspect);

    function cur() { var p = s.num && s.den ? { num: s.num, den: s.den } : PRESETS[s.pick]; return p; }

    function update() {
      fitAspect();
      LABELS[s.mode].forEach(function (t, i) { spans[i].textContent = t; });
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for === s.mode ? "" : "none"; });
      k.btn("play").style.display = s.mode === "rat" ? "" : "none";
      var note = "";
      steps.style.display = s.mode === "rat" ? "" : "none";
      if (s.mode === "simplify") {
        var q = sqPart(s.n), kk = q[0], m = q[1];
        k.set("r1", "√" + s.n); k.set("r2", "2 (a quadratic surd)");
        k.set("r3", kk > 1 ? kk * kk + "  (" + s.n + " = " + kk * kk + " × " + m + ")" : "none except 1");
        k.set("r4", m === 1 ? String(kk) : (kk > 1 ? kk : "") + "√" + m);
        k.set("r5", m === 1 ? "–" : "any p√" + m + ", e.g. " + (kk + 1) + "√" + m);
        k.set("r6", m === 1 ? "No: √" + s.n + " = " + kk + " is rational" : "Yes: " + s.n + " is not a perfect square");
        note = m === 1 ? s.n + " is a perfect square: the big square is made of " + s.n + " unit squares and its side is " + kk + "." :
          kk === 1 ? s.n + " has no square factor other than 1, so √" + s.n + " is already in its simplest form." :
          "√" + s.n + " = √(" + kk * kk + " × " + m + ") = √" + (kk * kk) + " × √" + m + " = " + kk + "√" + m + ". The square of area " + s.n + " is " + kk + " small squares wide, and each small square has side √" + m + ".";
      } else if (s.mode === "compare") {
        var A = s.a * s.a * s.b, B = s.c * s.c * s.d, rel = A > B ? ">" : A < B ? "<" : "=";
        var ft = (s.a === 1 ? "" : s.a) + "√" + s.b, st = (s.c === 1 ? "" : s.c) + "√" + s.d;
        k.el('[data-r="ft"]').textContent = ft; k.el('[data-r="st"]').textContent = st;
        k.set("r1", ft); k.set("r2", st);
        k.set("r3", "(" + ft + ")² = " + s.a * s.a + " × " + s.b + " = " + A); k.set("r4", "(" + st + ")² = " + s.c * s.c + " × " + s.d + " = " + B);
        k.set("r5", ft + " " + rel + " " + st);
        k.set("r6", n4(s.a * Math.sqrt(s.b)).slice(0, -2) + " " + rel + " " + n4(s.c * Math.sqrt(s.d)).slice(0, -2));
        note = "Both are positive, so the one with the bigger square is bigger. " + A + " " + rel + " " + B + ", so " + ft + " " + rel + " " + st + ".";
      } else {
        var p = cur(), R = rationalise(p.num, p.den);
        k.set("r1", show(p.num, p.den)); k.set("r2", expr(R.factor)); k.set("r3", String(R.newDen)); k.set("r4", R.ans);
        k.set("r5", n4(R.before)); k.set("r6", n4(R.after) + (Math.abs(R.before - R.after) < 1e-9 ? " ✓ same" : ""));
        note = R.single ? "√" + R.D[0][1] + " × √" + R.D[0][1] + " = " + R.D[0][1] + ", a rational number. Multiplying top and bottom by the same number does not change the value." :
          "(A + B)(A − B) = A² − B². Squaring each term removes the surds, so the denominator becomes rational.";
        steps.innerHTML = '<li class="given" value="0">' + show(p.num, p.den) + "</li>" + R.steps.map(function (t, i) { return i < s.shown ? "<li" + (i === R.steps.length - 1 ? ' class="final"' : "") + ">" + t + "</li>" : ""; }).join("");
      }
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    function txt(ctx, t, x, y, col, font, align, base) { ctx.font = font; ctx.fillStyle = col; ctx.textAlign = align || "center"; ctx.textBaseline = base || "middle"; ctx.fillText(t, x, y); }

    function drawSimplify(ctx, W, H, c) {
      var q = sqPart(s.n), kk = q[0], m = q[1], narrow = W < 520;
      var side = Math.min(W - 120, H - 70), x0 = (W - side) / 2, y0 = 34;
      var cell = side / kk;
      ctx.fillStyle = c.tint; ctx.fillRect(x0, y0, side, side);
      // grid of small squares
      ctx.strokeStyle = c.path; ctx.lineWidth = 1;
      for (var i = 1; i < kk; i++) {
        ctx.beginPath(); ctx.moveTo(x0 + i * cell, y0); ctx.lineTo(x0 + i * cell, y0 + side); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x0, y0 + i * cell); ctx.lineTo(x0 + side, y0 + i * cell); ctx.stroke();
      }
      ctx.lineWidth = 2.5; ctx.strokeRect(x0, y0, side, side);
      if (kk > 1 && cell >= 22) {
        for (var r = 0; r < kk; r++) for (var cc = 0; cc < kk; cc++) txt(ctx, String(m), x0 + (cc + 0.5) * cell, y0 + (r + 0.5) * cell, c.path, (cell > 40 ? "600 13px " : "10px ") + c.font);
      } else if (kk === 1) txt(ctx, "area " + s.n, x0 + side / 2, y0 + side / 2, c.path, "700 16px " + c.font);
      txt(ctx, "area " + s.n + (kk > 1 ? " = " + kk * kk + " squares of area " + m : ""), W / 2, y0 - 16, c.ink, "700 " + (narrow ? 12 : 14) + "px " + c.font);
      // side labels
      var sideLab = m === 1 ? String(kk) : (kk > 1 ? kk : "") + "√" + m;
      txt(ctx, "side √" + s.n + " = " + sideLab, W / 2, y0 + side + 16, c.vy, "700 " + (narrow ? 13 : 15) + "px " + c.font);
      if (kk > 1 && m > 1) {
        ctx.strokeStyle = c.vy; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0 + side + 8, y0 + side - cell); ctx.lineTo(x0 + side + 8, y0 + side); ctx.stroke();
        txt(ctx, "√" + m, x0 + side + 12, y0 + side - cell / 2, c.vy, "700 13px " + c.font, "left");
      }
    }

    function drawCompare(ctx, W, H, c) {
      var A = s.a * s.a * s.b, B = s.c * s.c * s.d, narrow = W < 520;
      var maxA = Math.max(A, B), room = Math.min((W - 60) / 2, H - 90), sc = room / Math.sqrt(maxA);
      var sa = Math.sqrt(A) * sc, sb = Math.sqrt(B) * sc, base = H - 46;
      var xa = W / 4 - sa / 2 + 6, xb = 3 * W / 4 - sb / 2 - 6;
      var big = A >= B;
      [[xa, sa, A, s.a, s.b, c.path, A > B], [xb, sb, B, s.c, s.d, c.vx, B > A]].forEach(function (z) {
        ctx.fillStyle = z[5]; ctx.globalAlpha = 0.16; ctx.fillRect(z[0], base - z[1], z[1], z[1]); ctx.globalAlpha = 1;
        ctx.strokeStyle = z[5]; ctx.lineWidth = z[6] ? 3.5 : 2; ctx.strokeRect(z[0], base - z[1], z[1], z[1]);
        var nm = (z[3] === 1 ? "" : z[3]) + "√" + z[4];
        txt(ctx, "area " + z[2], z[0] + z[1] / 2, base - z[1] / 2, z[5], "700 " + (narrow ? 13 : 16) + "px " + c.font);
        txt(ctx, "side " + nm, z[0] + z[1] / 2, base + 16, z[5], "700 " + (narrow ? 13 : 15) + "px " + c.font);
      });
      var rel = A > B ? ">" : A < B ? "<" : "=";
      txt(ctx, rel, W / 2, base - Math.max(sa, sb) / 2, c.ink, "700 26px " + c.font);
      void big;
    }

    function drawRat(ctx, W, H, c) {
      var p = cur(), R = rationalise(p.num, p.den), narrow = W < 520, fs = narrow ? 12 : 14;
      if (R.single) {
        // c squares of area r in a row: c√r × √r = c·r
        var cnum = Math.abs(R.D[0][0]), r = R.D[0][1], t = s.t;
        var side = Math.min((W - 60) / Math.max(cnum, 1), H - 110, 160), x0 = (W - side * cnum) / 2, y0 = (H - side) / 2;
        for (var i = 0; i < cnum; i++) {
          var x = x0 + i * side, shown = Math.min(1, Math.max(0, t * (cnum + 1) - i));
          ctx.fillStyle = c.tint; ctx.globalAlpha = shown; ctx.fillRect(x, y0, side, side); ctx.globalAlpha = 1;
          ctx.strokeStyle = c.path; ctx.lineWidth = 2; ctx.strokeRect(x, y0, side, side);
          if (shown > 0.5 && side > 26) txt(ctx, String(r), x + side / 2, y0 + side / 2, c.path, "700 " + (side > 60 ? 16 : 11) + "px " + c.font);
        }
        txt(ctx, expr(R.D) + " (width)", W / 2, y0 - 16, c.vx, "700 " + fs + "px " + c.font);
        txt(ctx, "× √" + r + " (height)", x0 - 8, y0 + side / 2, c.vy, "700 " + fs + "px " + c.font, "right");
        if (x0 < 90) txt(ctx, "height √" + r, W / 2, y0 + side + 16, c.vy, "700 " + fs + "px " + c.font);
        txt(ctx, "area = " + (cnum > 1 ? cnum + " × " + r + " = " : "") + cnum * r + " (rational)", W / 2, y0 + side + (x0 < 90 ? 38 : 22), c.good, "700 " + (fs + 1) + "px " + c.font);
        if (x0 >= 90) { /* height label drawn at left */ }
        return;
      }
      // difference of squares: A = larger term, B = smaller
      var a1 = Math.abs(R.D[0][0]) * Math.sqrt(R.D[0][1]), b1 = Math.abs(R.D[1][0]) * Math.sqrt(R.D[1][1]);
      var Aname = term([Math.abs(R.D[0][0]), R.D[0][1]], true), Bname = term([Math.abs(R.D[1][0]), R.D[1][1]], true);
      if (b1 > a1) { var tmp = a1; a1 = b1; b1 = tmp; tmp = Aname; Aname = Bname; Bname = tmp; }
      var ratio = b1 / a1, schematic = ratio > 0.8 || ratio < 0.2;
      if (schematic) ratio = 0.45;
      var t2 = s.t, top = narrow ? (schematic ? 88 : 70) : 24, Lw = narrow ? W - 90 : W * 0.42;
      var sz = Math.min(Lw, (H - top - 34) / (1 + ratio)), A = sz, B = sz * ratio;
      var ox = narrow ? (W - A) / 2 + 20 : W * 0.1, oy = top + B;
      var e = t2 < 0.4 ? 0 : Math.min(1, (t2 - 0.4) / 0.6), sm = e * e * (3 - 2 * e);
      // the B × B corner (top right) that is cut away
      ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.strokeRect(ox + A - B, oy, B, B); ctx.restore();
      if (B > 26) txt(ctx, "(" + Bname + ")²", ox + A - B / 2, oy + B / 2, c.muted, "700 " + (fs - 1) + "px " + c.font);
      // left piece: (A − B) wide × A tall
      ctx.fillStyle = c.tint; ctx.fillRect(ox, oy, A - B, A); ctx.strokeStyle = c.path; ctx.lineWidth = 2; ctx.strokeRect(ox, oy, A - B, A);
      // moving piece: B wide × (A − B) tall at the bottom right; it turns and ends on top of the left piece, (A − B) wide × B tall
      var sx = ox + A - B, sy = oy + B, ex = ox, ey = oy - B;
      var cx = sx + (ex - sx) * sm, cy = sy + (ey - sy) * sm;
      var pw = B + (A - 2 * B) * sm, ph = (A - B) + (2 * B - A) * sm;
      ctx.fillStyle = c.vy; ctx.globalAlpha = 0.22; ctx.fillRect(cx, cy, pw, ph); ctx.globalAlpha = 1;
      ctx.strokeStyle = c.vy; ctx.lineWidth = 2; ctx.strokeRect(cx, cy, pw, ph);
      if (sm < 1) {
        txt(ctx, Aname, ox + A / 2, oy + A + 14, c.ink, "700 " + fs + "px " + c.font);
        txt(ctx, Aname, ox - 8, oy + A / 2, c.ink, "700 " + fs + "px " + c.font, "right");
        txt(ctx, "A² − B²", ox + (A - B) / 2, oy + A / 2, c.path, "700 " + fs + "px " + c.font);
      } else {
        ctx.strokeStyle = c.good; ctx.lineWidth = 3; ctx.strokeRect(ox, oy - B, A - B, A + B);
        txt(ctx, Aname + " − " + Bname, ox + (A - B) / 2, oy + A + 14, c.path, "700 " + fs + "px " + c.font);
        ctx.save(); ctx.translate(ox - 10, oy - B + (A + B) / 2); ctx.rotate(-Math.PI / 2);
        txt(ctx, Aname + " + " + Bname, 0, 0, c.good, "700 " + fs + "px " + c.font, "center", "bottom"); ctx.restore();
      }
      // equation on the right (or below on phones)
      var lines = [["(" + Aname + " + " + Bname + ")(" + Aname + " − " + Bname + ")", c.ink], ["= " + (Aname.indexOf("√") < 0 ? Aname : "(" + Aname + ")") + "² − " + (Bname.indexOf("√") < 0 ? Bname : "(" + Bname + ")") + "²", c.ink],
                   ["= " + Math.round(a1 * a1) + " − " + Math.round(b1 * b1) + " = " + Math.round(a1 * a1 - b1 * b1), c.good]];
      if (schematic) lines.push(["(picture not to scale)", c.muted]);
      lines.forEach(function (L, i) {
        if (narrow) txt(ctx, L[0], W / 2, 14 + i * 16, L[1], "700 12px " + c.font, "center", "top");
        else txt(ctx, L[0], W * 0.6, H / 2 - 40 + i * 28, L[1], "700 " + (i === 0 ? 15 : 16) + "px " + c.font, "left");
      });
      if (narrow) { /* shift: picture already below */ }
    }

    k.draw = function (ctx, W, H, c) { if (s.mode === "simplify") drawSimplify(ctx, W, H, c); else if (s.mode === "compare") drawCompare(ctx, W, H, c); else drawRat(ctx, W, H, c); };

    var shows = {};
    ["n", "a", "b", "c", "d"].forEach(function (q) { shows[q] = k.bindSlider(q, function () { return s[q]; }, function (v) { s[q] = v; update(); }, String); });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { stop(); s.mode = v; s.t = 1; s.shown = 99; update(); });
    sel.value = String(s.pick);
    sel.addEventListener("change", function () { stop(); s.pick = +sel.value; s.num = s.den = null; s.t = 1; s.shown = 99; update(); });

    function stop() { if (clock) clock.stop(); }
    function play() {
      stop();
      if (s.mode !== "rat") return;
      var n = rationalise(cur().num, cur().den).steps.length, tt = 0;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { s.t = 1; s.shown = 99; update(); return; }
      s.t = 0; s.shown = 0; update();
      clock = K.clock(function (dt) {
        tt += dt; s.t = Math.min(1, tt / 3); var sh = Math.min(n, Math.floor(tt / 0.9));
        if (sh !== s.shown) { s.shown = sh; update(); } else k.redraw();
        return s.t < 1 || sh < n;
      });
      clock.start();
    }
    k.onAct({ play: play });
    update();
    return {
      set: function (o) { stop(); if (!("num" in o)) { s.num = null; s.den = null; } Object.assign(s, o); if (!("t" in o)) s.t = 1; if (!("shown" in o)) s.shown = 99; Object.keys(shows).forEach(function (q) { shows[q](); }); showM(); sel.value = String(s.pick); update(); },
      play: play,
      seek: function (t) { stop(); s.t = t; update(); },
      state: function () { var p = cur(); return Object.assign({}, s, { result: s.mode === "rat" ? rationalise(p.num, p.den).ans : null }); }
    };
  }
  window.RealSurdSim = { mount: mount, rationalise: rationalise };
})();
