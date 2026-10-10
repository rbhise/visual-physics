/*
 * Theorem on equal ratios and continued proportion, two views:
 *   theorem – a/b = c/d = e/f = k drawn as three small fractions of tapes. "Combine" slides l copies of a/b,
 *             m copies of c/d and n copies of e/f into one big fraction (la + mc + ne)/(lb + md + nf): it still equals k.
 *             k = p/q; the denominators are q·u, q·v, q·w and the numerators p·u, p·v, p·w.
 *   cont    – a, b, c in continued proportion: a/b = b/c, so b² = ac. A rectangle a × c and a square b × b have the same area.
 * Needs sim-kit.js.  RatioKSim.mount(el, { mode: "theorem", p: 2, q: 3, u: 2, v: 3, w: 1, l: 1, m: 1, n: 1 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit;
  var LABELS = {
    theorem: ["Equal ratios", "k (lowest terms)", "Combined numerator", "Combined denominator", "Combined ratio", "Check"],
    cont: ["a and c", "a × c", "Mean proportional b = √(ac)", "a/b", "b/c", "Continued proportion?"]
  };
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }
  function fr(n, d) { var g = gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : n + "/" + d; }
  function nm(x) { return Math.abs(x - Math.round(x)) < 1e-9 ? String(Math.round(x)) : x.toFixed(2); }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "rk";
    var s = Object.assign({ mode: "theorem", p: 2, q: 3, u: 3, v: 2, w: 5, l: 1, m: 1, n: 1, a: 4, c: 9, t: 0 }, opts);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "Equal ratios drawn as tapes and combined into one ratio",
      panel: K.chips("mode", "Show", [["theorem", "Theorem on equal ratios"], ["cont", "Continued proportion"]]) +
        '<div data-for="theorem">' + '<div class="eqn-show" data-r="eq"></div>' +
        K.slider(id, "p", "k = p/q: p", 1, 6, 1, "") + K.slider(id, "q", "q", 1, 6, 1, "") +
        K.slider(id, "u", "Size of a/b (b = q × this)", 1, 4, 1, "") + K.slider(id, "v", "Size of c/d (d = q × this)", 1, 4, 1, "") + K.slider(id, "w", "Size of e/f (f = q × this)", 1, 4, 1, "") +
        K.slider(id, "l", "Copies of a/b: l", 1, 3, 1, "") + K.slider(id, "m", "Copies of c/d: m", 1, 3, 1, "") + K.slider(id, "n", "Copies of e/f: n", 1, 3, 1, "") +
        K.buttons([["play", "Combine"], ["back", "Separate again"]]) + '</div>' +
        '<div data-for="cont">' + K.slider(id, "a", "a", 1, 20, 1, "") + K.slider(id, "c", "c", 1, 20, 1, "") + '</div>' +
        K.hint("note"),
      readouts: [["r1", "–", "wrap"], ["r2", "–", "c-path"], ["r3", "–", "wrap c-vx"], ["r4", "–", "wrap c-vy"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var mq = window.matchMedia("(max-width: 760px)");
    function asp() { root.querySelector(".sim-stage").style.aspectRatio = mq.matches ? "4 / 3.6" : "16 / 10"; }
    if (mq.addEventListener) mq.addEventListener("change", asp); asp();
    var spans = root.querySelectorAll(".sim-readout span");

    function T() {
      var r = [[s.p * s.u, s.q * s.u], [s.p * s.v, s.q * s.v], [s.p * s.w, s.q * s.w]], mult = [s.l, s.m, s.n];
      var N = 0, D = 0; r.forEach(function (x, i) { N += mult[i] * x[0]; D += mult[i] * x[1]; });
      return { r: r, mult: mult, N: N, D: D };
    }
    function bval() { return Math.sqrt(s.a * s.c); }

    function update() {
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for.split(" ").indexOf(s.mode) >= 0 ? "" : "none"; });
      var note;
      if (s.mode === "theorem") {
        var t = T(), r = t.r, L = ["a", "c", "e"], one = s.l === 1 && s.m === 1 && s.n === 1;
        k.el('[data-r="eq"]').textContent = r[0][0] + "/" + r[0][1] + " = " + r[1][0] + "/" + r[1][1] + " = " + r[2][0] + "/" + r[2][1];
        k.set("r1", "a/b = c/d = e/f");
        k.set("r2", fr(s.p, s.q));
        var ns = r.map(function (x, i) { return (t.mult[i] > 1 ? t.mult[i] + "×" : "") + x[0]; }).join(" + ");
        var ds = r.map(function (x, i) { return (t.mult[i] > 1 ? t.mult[i] + "×" : "") + x[1]; }).join(" + ");
        k.set("r3", ns + " = " + t.N); k.set("r4", ds + " = " + t.D);
        k.set("r5", t.N + "/" + t.D + " = " + fr(t.N, t.D));
        k.set("r6", fr(t.N, t.D) === fr(s.p, s.q) ? "equals k ✓" : "not equal");
        note = s.t < 1 ? "Each numerator is k = " + fr(s.p, s.q) + " times its denominator. Press “Combine” to join " + (one ? "the numerators and the denominators." : "l, m and n copies of them.")
          : (one ? "(a + c + e)/(b + d + f)" : "(la + mc + ne)/(lb + md + nf)") + " = " + t.N + "/" + t.D + " = " + fr(t.N, t.D) + ". The big numerator is still k times the big denominator, because every piece of it is.";
      } else {
        var b = bval(), whole = Math.abs(b - Math.round(b)) < 1e-9;
        k.set("r1", s.a + " and " + s.c); k.set("r2", String(s.a * s.c));
        k.set("r3", whole ? String(Math.round(b)) : "√" + s.a * s.c + " ≈ " + b.toFixed(2));
        k.set("r4", whole ? fr(s.a, Math.round(b)) : (s.a / b).toFixed(3)); k.set("r5", whole ? fr(Math.round(b), s.c) : (b / s.c).toFixed(3));
        k.set("r6", whole ? "Yes: " + s.a + ", " + Math.round(b) + ", " + s.c : "only with b = √" + s.a * s.c);
        note = whole ? "b² = " + Math.round(b) + "² = " + Math.round(b * b) + " = " + s.a + " × " + s.c + ". The square and the rectangle have the same area, so " + s.a + "/" + Math.round(b) + " = " + Math.round(b) + "/" + s.c + ": " + s.a + ", " + Math.round(b) + ", " + s.c + " are in continued proportion."
          : "a × c = " + s.a * s.c + " is not a perfect square, so the mean proportional √" + s.a * s.c + " is not a whole number. Try a = 4, c = 9 or a = 2, c = 8.";
      }
      LABELS[s.mode].forEach(function (x, i) { spans[i].textContent = x; });
      k.redraw();
      k.el('[data-r="note"]').textContent = note;
    }

    k.draw = function (ctx, W, H, c) {
      if (s.mode === "cont") { drawCont(ctx, W, H, c); return; }
      var t = T(), e = s.t * s.t * (3 - 2 * s.t), maxSmall = Math.max(t.r[0][1], t.r[1][1], t.r[2][1], t.r[0][0], t.r[1][0], t.r[2][0]);
      var colW = (W - 40) / 3, unit = Math.min((colW - 10) / maxSmall, (W - 30) / Math.max(t.D, t.N)), h = Math.min(32, H * 0.09);
      var sy = H * 0.1, by = H * 0.58;   // small fractions' numerator row; big fraction's numerator row
      var cols = [c.vx, c.path, c.vy], names = [["a", "b"], ["c", "d"], ["e", "f"]];
      // small fractions
      for (var i = 0; i < 3; i++) {
        var x0 = 14 + i * (colW + 6);
        ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, sy + h + 5); ctx.lineTo(x0 + colW - 6, sy + h + 5); ctx.stroke();
        ghost(ctx, c, x0, sy, t.r[i][0] * unit, h, cols[i]); ghost(ctx, c, x0, sy + h + 10, t.r[i][1] * unit, h, cols[i]);
        ctx.fillStyle = cols[i]; ctx.font = "700 13px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(names[i][0] + "/" + names[i][1] + " = " + t.r[i][0] + "/" + t.r[i][1], x0, sy + 2 * h + 18);
      }
      // the big fraction: target positions
      var bx = 14, offN = 0, offD = 0;
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by + h + 5); ctx.lineTo(Math.max(bx + t.D * unit, bx + t.N * unit) + 4, by + h + 5); ctx.stroke();
      for (i = 0; i < 3; i++) {
        var x1 = 14 + i * (colW + 6);
        for (var j = 0; j < t.mult[i]; j++) {
          var wn = t.r[i][0] * unit, wd = t.r[i][1] * unit;
          tapePiece(ctx, c, x1 + (bx + offN - x1) * e, sy + (by - sy) * e, wn, h, cols[i], t.r[i][0]);
          tapePiece(ctx, c, x1 + (bx + offD - x1) * e, sy + h + 10 + (by + h + 10 - sy - h - 10) * e, wd, h, cols[i], t.r[i][1]);
          offN += wn; offD += wd;
        }
      }
      ctx.fillStyle = c.ink; ctx.font = "700 14px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
      if (s.t >= 1) ctx.fillText(t.N + "/" + t.D + " = " + fr(t.N, t.D) + "  (k = " + fr(s.p, s.q) + ")", bx, by + 2 * h + 18);
      else { ctx.fillStyle = c.muted; ctx.font = "13px " + c.font; ctx.fillText("Combined ratio appears here", bx, by + 2 * h + 18); }
    };
    function ghost(ctx, c, x, y, w, h, col) { ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = col; ctx.globalAlpha = 0.6; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h); ctx.restore(); }
    function tapePiece(ctx, c, x, y, w, h, col, val) {
      ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
      ctx.strokeStyle = c.surface; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
      if (w > 20) { ctx.fillStyle = c.surface; ctx.font = "700 12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(val), x + w / 2, y + h / 2 + 1); }
    }
    function drawCont(ctx, W, H, c) {
      var b = bval(), big = Math.max(s.a, s.c, b), cell = Math.min((W / 2 - 40) / big, (H - 80) / big), y0 = 40;
      function grid(x, y, w, h, col, lw, lh, label) {
        ctx.fillStyle = col; ctx.globalAlpha = 0.25; ctx.fillRect(x, y, w * cell, h * cell); ctx.globalAlpha = 1;
        ctx.strokeStyle = col; ctx.lineWidth = 0.75;
        for (var i = 1; i < w; i++) { ctx.beginPath(); ctx.moveTo(x + i * cell, y); ctx.lineTo(x + i * cell, y + h * cell); ctx.stroke(); }
        for (i = 1; i < h; i++) { ctx.beginPath(); ctx.moveTo(x, y + i * cell); ctx.lineTo(x + w * cell, y + i * cell); ctx.stroke(); }
        ctx.lineWidth = 2.5; ctx.strokeRect(x, y, w * cell, h * cell);
        ctx.fillStyle = col; ctx.font = "700 13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(lw, x + w * cell / 2, y - 4);
        ctx.save(); ctx.translate(x - 6, y + h * cell / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(lh, 0, 0); ctx.restore();
        ctx.textBaseline = "top"; ctx.fillStyle = c.ink; ctx.fillText(label, x + w * cell / 2, y + h * cell + 8);
      }
      var whole = Math.abs(b - Math.round(b)) < 1e-9, bl = whole ? String(Math.round(b)) : b.toFixed(2);
      grid(28, y0, s.c, s.a, c.vx, "c = " + s.c, "a = " + s.a, "a × c = " + s.a * s.c);
      var x2 = Math.max(W / 2 + 16, 28 + s.c * cell + 36);
      if (whole) grid(x2, y0, b, b, c.vy, "b = " + bl, "b = " + bl, "b² = " + Math.round(b * b));
      else {
        ctx.fillStyle = c.vy; ctx.globalAlpha = 0.25; ctx.fillRect(x2, y0, b * cell, b * cell); ctx.globalAlpha = 1;
        ctx.strokeStyle = c.vy; ctx.lineWidth = 2.5; ctx.strokeRect(x2, y0, b * cell, b * cell);
        ctx.fillStyle = c.vy; ctx.font = "700 13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText("b ≈ " + bl, x2 + b * cell / 2, y0 - 4);
        ctx.textBaseline = "top"; ctx.fillStyle = c.ink; ctx.fillText("b² = " + s.a * s.c, x2 + b * cell / 2, y0 + b * cell + 8);
      }
      ctx.fillStyle = c.muted; ctx.font = "12px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("same area: b² = ac", 28, 8);
    }

    var clock = K.clock(function (dt) { s.t = Math.min(1, s.t + dt / 1.6); update(); return s.t < 1; });
    function play() { clock.stop(); if (s.mode !== "theorem") return; s.t = 0; if (reduce) { s.t = 1; update(); } else { update(); clock.start(); } }
    var shows = ["p", "q", "u", "v", "w", "l", "m", "n", "a", "c"].map(function (q) {
      return k.bindSlider(q, function () { return s[q]; }, function (v) { s[q] = v; update(); }, function (v) { return String(v); });
    });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { clock.stop(); s.mode = v; update(); });
    k.onAct({ play: play, back: function () { clock.stop(); s.t = 0; update(); } });
    update();
    return {
      set: function (o) { clock.stop(); Object.assign(s, o); if (!("t" in o)) s.t = 0; shows.forEach(function (f) { f(); }); showM(); update(); },
      play: play,
      seek: function (t) { clock.stop(); s.t = t; update(); },
      state: function () { return Object.assign({ T: T() }, s); }
    };
  }
  window.RatioKSim = { mount: mount };
})();
