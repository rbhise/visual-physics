/*
 * Ratio and proportion, four views:
 *   ratio   – two tapes of a and b units, cut into equal blocks of HCF(a, b): a : b in simplest form, as a fraction and a percentage
 *   compare – which ratio is bigger? a/b and c/d as bars on one scale, checked by a × d and b × c
 *   direct  – y = kx: the ratio y/x stays the same (a straight line through the origin)
 *   inverse – x × y = k: the product stays the same (the shaded rectangle keeps its area)
 * Needs sim-kit.js and math-kit.js.  RatioBarsSim.mount(el, { mode: "ratio", a: 24, b: 36 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit;
  var LABELS = {
    ratio:   ["Ratio a : b", "HCF of a and b", "Simplest form", "As a fraction a/b", "a as a percentage of b", "a out of the total"],
    compare: ["First ratio a/b", "Second ratio c/d", "a × d", "b × c", "Which is bigger?", "As decimals"],
    direct:  ["x", "y", "y ÷ x", "Equation", "Doubling x", "Kind of proportion"],
    inverse: ["x", "y", "x × y", "Equation", "Doubling x", "Kind of proportion"]
  };
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }
  function fr(n, d) { var g = gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : n + "/" + d; }
  function num(x) { return window.MathKit.frac(x); }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "rb";
    var s = Object.assign({ mode: "ratio", a: 24, b: 36, c: 3, d: 4, k: 12, x: 3, nameA: "a", nameB: "b", xname: "x", yname: "y" }, opts);

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "Bars and graphs showing ratios and proportion",
      panel: K.chips("mode", "Show", [["ratio", "Ratio"], ["compare", "Compare ratios"], ["direct", "Direct proportion"], ["inverse", "Inverse proportion"]]) +
        '<div data-for="ratio compare">' + K.slider(id, "a", "a", 1, 120, 1, "") + K.slider(id, "b", "b", 1, 120, 1, "") + '</div>' +
        '<div data-for="compare">' + K.slider(id, "c", "c", 1, 60, 1, "") + K.slider(id, "d", "d", 1, 60, 1, "") + '</div>' +
        '<div data-for="direct inverse">' + K.slider(id, "k", "Constant k", 1, 120, 1, "") + K.slider(id, "x", "x", 1, 12, 1, "") + '</div>' +
        K.hint("note"),
      readouts: [["r1", "–", "c-vx"], ["r2", "–", "c-vy"], ["r3", "–", "c-path"], ["r4", "–", "wrap"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var mq = window.matchMedia("(max-width: 760px)");
    function asp() { root.querySelector(".sim-stage").style.aspectRatio = mq.matches ? "4 / 3.3" : "16 / 10"; }
    if (mq.addEventListener) mq.addEventListener("change", asp); asp();
    var spans = root.querySelectorAll(".sim-readout span");

    function yval() { return s.mode === "direct" ? s.k * s.x : s.k / s.x; }
    function update() {
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for.split(" ").indexOf(s.mode) >= 0 ? "" : "none"; });
      var lab = LABELS[s.mode].slice(), note = "";
      if (s.mode === "ratio") {
        var g = gcd(s.a, s.b), pa = s.a / g, pb = s.b / g;
        k.set("r1", s.a + " : " + s.b); k.set("r2", String(g)); k.set("r3", pa + " : " + pb); k.set("r4", fr(s.a, s.b));
        k.set("r5", num(s.a / s.b * 100) + "%"); k.set("r6", fr(s.a, s.a + s.b));
        if (s.nameA !== "a") { lab[0] = s.nameA + " : " + s.nameB; lab[4] = s.nameA + " as a % of " + s.nameB; lab[5] = s.nameA + " out of the total"; }
        note = "Cut both tapes into blocks of " + g + ". The first has " + pa + " block" + (pa > 1 ? "s" : "") + ", the second " + pb + ": so " + s.a + " : " + s.b + " = " + pa + " : " + pb + (g === 1 ? ", already in simplest form." : ". Divide both terms by the HCF " + g + ".");
      } else if (s.mode === "compare") {
        var L = s.a * s.d, R = s.b * s.c, sign = L > R ? ">" : L < R ? "<" : "=";
        k.set("r1", s.a + "/" + s.b); k.set("r2", s.c + "/" + s.d); k.set("r3", String(L)); k.set("r4", String(R));
        k.set("r5", s.a + "/" + s.b + " " + sign + " " + s.c + "/" + s.d); k.set("r6", (s.a / s.b).toFixed(3) + " and " + (s.c / s.d).toFixed(3));
        note = "a × d = " + s.a + " × " + s.d + " = " + L + " and b × c = " + s.b + " × " + s.c + " = " + R + ". " +
          (sign === "=" ? "They are equal, so the ratios are equal: a : b = c : d." : L + " " + sign + " " + R + ", so a/b " + sign + " c/d.");
      } else {
        var y = yval(), dir = s.mode === "direct";
        lab[0] = s.xname; lab[1] = s.yname;
        k.set("r1", String(s.x)); k.set("r2", num(y));
        k.set("r3", dir ? num(y) + " ÷ " + s.x + " = " + s.k : s.x + " × " + num(y) + " = " + s.k);
        k.set("r4", dir ? "y = " + s.k + "x" : "x × y = " + s.k);
        k.set("r5", dir ? "y doubles too" : "y becomes half");
        k.set("r6", dir ? "direct: y ∝ x" : "inverse: y ∝ 1/x");
        lab[2] = dir ? s.yname + " ÷ " + s.xname : s.xname + " × " + s.yname;
        note = dir ? "Move x: y changes, but y ÷ x stays " + s.k + ". The points lie on a straight line through the origin."
          : "Move x: the rectangle changes shape, but its area x × y stays " + s.k + ". When one quantity grows, the other shrinks in the same ratio.";
        if (!dir && Math.abs(y - Math.round(y)) > 1e-9) note += " (Here y is not a whole number.)";
      }
      LABELS[s.mode].forEach(function (t, i) { spans[i].textContent = lab[i]; });
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    function tape(ctx, c, x, y, units, unit, block, h, col, label) {   // a tape of `units`, outlined every `block` units
      ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(x, y, units * unit, h); ctx.globalAlpha = 1;
      ctx.strokeStyle = c.surface; ctx.lineWidth = 2;
      for (var i = block; i < units; i += block) { ctx.beginPath(); ctx.moveTo(x + i * unit, y); ctx.lineTo(x + i * unit, y + h); ctx.stroke(); }
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, units * unit, h);
      if (label) { ctx.fillStyle = c.ink; ctx.font = "700 14px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(label, x + units * unit + 8, y + h / 2); }
    }

    k.draw = function (ctx, W, H, c) {
      ctx.font = "13px " + c.font;
      if (s.mode === "ratio") {
        var g = gcd(s.a, s.b), x0 = 16, wmax = W - x0 - 70, unit = wmax / Math.max(s.a, s.b), h = Math.min(56, H * 0.17);
        var y1 = H * 0.22, y2 = y1 + h + H * 0.16;
        ctx.fillStyle = c.vx; ctx.font = "700 14px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
        ctx.fillText(s.nameA === "a" ? "a = " + s.a : s.nameA + ": " + s.a, x0, y1 - 6);
        tape(ctx, c, x0, y1, s.a, unit, g, h, c.vx, String(s.a / g));
        ctx.fillStyle = c.vy; ctx.textBaseline = "bottom"; ctx.fillText(s.nameB === "b" ? "b = " + s.b : s.nameB + ": " + s.b, x0, y2 - 6);
        tape(ctx, c, x0, y2, s.b, unit, g, h, c.vy, String(s.b / g));
        // one block, labelled
        var by = y2 + h + 18;
        ctx.strokeStyle = c.path; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, by); ctx.lineTo(x0 + g * unit, by); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x0, by - 5); ctx.lineTo(x0, by + 5); ctx.moveTo(x0 + g * unit, by - 5); ctx.lineTo(x0 + g * unit, by + 5); ctx.stroke();
        ctx.fillStyle = c.path; ctx.font = "13px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("one block = " + g + (g === 1 ? " unit" : " units"), x0, by + 8);
        ctx.font = "700 " + Math.min(26, W / 22) + "px " + c.font; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillStyle = c.ink;
        ctx.fillText(s.a / g + " : " + s.b / g, W - 16, by + 4);
        return;
      }
      if (s.mode === "compare") {
        var r1 = s.a / s.b, r2 = s.c / s.d, top = Math.max(1, Math.ceil(Math.max(r1, r2))), X0 = 20, X1 = W - 24, sc = (X1 - X0) / top;
        var hh = Math.min(46, H * 0.14), ya = H * 0.2, yb = ya + hh + H * 0.17, ax = H * 0.8;
        // scale
        ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
        var st = top > 6 ? 1 : 0.25;
        for (var t = 0; t <= top + 1e-9; t += st) { var px = X0 + t * sc; ctx.beginPath(); ctx.moveTo(px, ya - 10); ctx.lineTo(px, ax); ctx.stroke(); if (Math.abs(t - Math.round(t)) < 1e-9 || top <= 2) ctx.fillText(String(+t.toFixed(2)), px, ax + 4); }
        ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X0, ax); ctx.lineTo(X1, ax); ctx.stroke();
        [[r1, ya, c.vx, s.a + "/" + s.b], [r2, yb, c.vy, s.c + "/" + s.d]].forEach(function (q) {
          ctx.fillStyle = q[2]; ctx.globalAlpha = 0.85; ctx.fillRect(X0, q[1], q[0] * sc, hh); ctx.globalAlpha = 1;
          ctx.font = "700 14px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillStyle = q[2];
          ctx.fillText(q[3] + " = " + q[0].toFixed(3), X0, q[1] - 5);
        });
        var big = r1 > r2 + 1e-12 ? 0 : r2 > r1 + 1e-12 ? 1 : -1;
        ctx.fillStyle = c.ink; ctx.font = "700 " + Math.min(22, W / 24) + "px " + c.font; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.fillText(big < 0 ? "equal ratios" : (big === 0 ? s.a + "/" + s.b : s.c + "/" + s.d) + " is bigger", X1, ya - 14 > 26 ? 28 : ya - 14);
        return;
      }
      // graphs
      var dir = s.mode === "direct", xmax = 12, ymax;
      if (dir) ymax = s.k * 12; else ymax = s.k;
      ymax = K.niceStep(ymax, 4) * Math.ceil(ymax / K.niceStep(ymax, 4));
      var G = K.graph(ctx, c, { x: 6, y: 4, w: W - 12, h: H - 8 }, { xmax: xmax, ymin: 0, ymax: ymax, xlabel: s.xname, title: s.yname });
      var y = yval(), px = G.X(s.x), py = G.Y(y);
      ctx.save();
      ctx.fillStyle = c.path; ctx.globalAlpha = 0.16;
      if (dir) { ctx.beginPath(); ctx.moveTo(G.X(0), G.Y(0)); ctx.lineTo(px, G.Y(0)); ctx.lineTo(px, py); ctx.closePath(); ctx.fill(); }
      else ctx.fillRect(G.X(0), py, px - G.X(0), G.Y(0) - py);
      ctx.restore();
      if (dir) K.curve(ctx, G, function (t) { return s.k * t; }, 0, Math.min(xmax, ymax / s.k), c.path, 2.5);
      else K.curve(ctx, G, function (t) { return s.k / t; }, Math.max(s.k / ymax, 0.05), xmax, c.path, 2.5);
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, G.Y(0)); ctx.moveTo(px, py); ctx.lineTo(G.X(0), py); ctx.stroke(); ctx.restore();
      ctx.fillStyle = c.vy; ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c.surface; ctx.lineWidth = 2; ctx.stroke();
      var txt = "(" + s.x + ", " + num(y) + ")", right = px > G.gx + G.gw * 0.6;
      ctx.font = "700 13px " + c.font; ctx.fillStyle = c.vy; ctx.textAlign = right ? "right" : "left"; ctx.textBaseline = "bottom";
      ctx.fillText(txt, px + (right ? -10 : 10), py - 6);
      ctx.fillStyle = c.path; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.font = "700 14px " + c.font;
      ctx.fillText(dir ? "y ÷ x = " + s.k : "x × y = " + s.k, G.gx + G.gw - 4, G.gy + 4);
    };

    var shows = ["a", "b", "c", "d", "k", "x"].map(function (q) {
      return k.bindSlider(q, function () { return s[q]; }, function (v) { s[q] = v; update(); }, function (v) { return String(v); });
    });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; update(); });
    update();
    return {
      set: function (o) { Object.assign(s, o); shows.forEach(function (f) { f(); }); showM(); update(); },
      play: function () {}, seek: function () {}, state: function () { return Object.assign({}, s); }
    };
  }
  window.RatioBarsSim = { mount: mount };
})();
