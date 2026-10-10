/*
 * Properties of equal ratios. Start from a/b = c/d, drawn as tapes (numerator above the line, denominator below).
 * Pick a property and press "Show the step": the tapes move and join to make the new ratios, and the
 * readouts check that both sides are still equal.
 *   inv  invertendo   b/a = d/c          alt  alternando  a/c = b/d
 *   comp componendo   (a+b)/b = (c+d)/d  div  dividendo   (a−b)/b = (c−d)/d
 *   cd   componendo-dividendo  (a+b)/(a−b) = (c+d)/(c−d)
 * a = p·m, b = q·m, c = p·n, d = q·n, so a/b = c/d = p/q always.
 * Needs sim-kit.js.  RatioPropsSim.mount(el, { prop: "comp", p: 3, q: 4, m: 2, n: 3 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit;
  var NAMES = { inv: "Invertendo", alt: "Alternando", comp: "Componendo", div: "Dividendo", cd: "Componendo-dividendo" };
  var RULES = { inv: "b/a = d/c", alt: "a/c = b/d", comp: "(a + b)/b = (c + d)/d", div: "(a − b)/b = (c − d)/d", cd: "(a + b)/(a − b) = (c + d)/(c − d)" };
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }
  function fr(n, d) { if (d === 0) return "undefined"; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); n /= g; d /= g; return (d === 1 ? String(n) : n + "/" + d).replace(/-/g, "−"); }
  function sg(x) { return String(x).replace(/-/g, "−"); }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "rp";
    var s = Object.assign({ prop: "comp", p: 3, q: 4, m: 2, n: 3, t: 0 }, opts);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "Two equal ratios drawn as tapes, transformed by a property of equal ratios",
      panel: K.chips("prop", "Property", Object.keys(NAMES).map(function (q) { return [q, NAMES[q]]; })) +
        '<div class="eqn-show" data-r="rule" style="font-size:1.05rem"></div>' +
        K.slider(id, "p", "p (both ratios equal p/q)", 1, 9, 1, "") + K.slider(id, "q", "q", 1, 9, 1, "") +
        K.slider(id, "m", "m: a = p × m, b = q × m", 1, 6, 1, "") + K.slider(id, "n", "n: c = p × n, d = q × n", 1, 6, 1, "") +
        K.buttons([["play", "Show the step"], ["back", "Start again"]]) + K.hint("note"),
      readouts: [["given", "Given a/b = c/d", "c-path"], ["name", "Property", "wrap"], ["left", "Left side", "c-vx wrap"],
                 ["right", "Right side", "c-vy wrap"], ["both", "In lowest terms", "wrap"], ["rule", "Rule", "wrap"]],
      cols: 3
    });

    var mq = window.matchMedia("(max-width: 760px)");
    function asp() { root.querySelector(".sim-stage").style.aspectRatio = mq.matches ? "4 / 3.3" : "16 / 10"; }
    if (mq.addEventListener) mq.addEventListener("change", asp); asp();
    function V() { return { a: s.p * s.m, b: s.q * s.m, c: s.p * s.n, d: s.q * s.n }; }
    // the two result ratios as [num, den] and their written forms
    function result() {
      var v = V(), a = v.a, b = v.b, c = v.c, d = v.d;
      switch (s.prop) {
        case "inv": return [[b, a, b + "/" + a], [d, c, d + "/" + c]];
        case "alt": return [[a, c, a + "/" + c], [b, d, b + "/" + d]];
        case "comp": return [[a + b, b, "(" + a + " + " + b + ")/" + b], [c + d, d, "(" + c + " + " + d + ")/" + d]];
        case "div": return [[a - b, b, "(" + a + " − " + b + ")/" + b], [c - d, d, "(" + c + " − " + d + ")/" + d]];
        default: return [[a + b, a - b, "(" + a + " + " + b + ")/(" + a + " − " + b + ")"], [c + d, c - d, "(" + c + " + " + d + ")/(" + c + " − " + d + ")"]];
      }
    }
    // tape segments: {v, key, col, from: [side, row, offset], to: [...], minus}
    function segments() {
      var v = V(), A = [0, 0, 0], B = [0, 1, 0], C = [1, 0, 0], D = [1, 1, 0], S = [];
      function seg(key, val, col, from, to, minus) { S.push({ key: key, v: val, col: col, from: from, to: to, minus: !!minus }); }
      var p = s.prop;
      if (p === "inv") { seg("a", v.a, "vx", A, [0, 1, 0]); seg("b", v.b, "vy", B, [0, 0, 0]); seg("c", v.c, "vx", C, [1, 1, 0]); seg("d", v.d, "vy", D, [1, 0, 0]); }
      else if (p === "alt") { seg("a", v.a, "vx", A, A); seg("c", v.c, "vx", C, [0, 1, 0]); seg("b", v.b, "vy", B, [1, 0, 0]); seg("d", v.d, "vy", D, D); }
      else {
        [[0, "a", "b", v.a, v.b], [1, "c", "d", v.c, v.d]].forEach(function (q) {
          var sd = q[0], x = q[1], y = q[2], X = q[3], Y = q[4];
          seg(x, X, "vx", [sd, 0, 0], [sd, 0, 0]);
          if (p === "comp") { seg(y, Y, "vy", [sd, 1, 0], [sd, 1, 0]); seg(y, Y, "vy", [sd, 1, 0], [sd, 0, X]); }
          if (p === "div") { seg(y, Y, "vy", [sd, 1, 0], [sd, 1, 0]); seg(y, Y, "vy", [sd, 1, 0], [sd, 0, X - Y], true); }
          if (p === "cd") { seg(y, Y, "vy", [sd, 1, 0], [sd, 0, X]); seg(x, X, "vx", [sd, 0, 0], [sd, 1, 0]); seg(y, Y, "vy", [sd, 1, 0], [sd, 1, X - Y], true); }
        });
      }
      return S;
    }

    function update() {
      var v = V(), R = result(), g = "";
      k.el('[data-r="rule"]').textContent = s.t > 0.5 ? RULES[s.prop] : "a/b = c/d";
      k.set("given", v.a + "/" + v.b + " = " + v.c + "/" + v.d);
      k.set("name", NAMES[s.prop]);
      k.set("rule", RULES[s.prop]);
      if (s.t < 1) {
        k.set("left", "–"); k.set("right", "–"); k.set("both", "press “Show the step”");
        g = v.a + "/" + v.b + " and " + v.c + "/" + v.d + " both equal " + fr(s.p, s.q) + " in lowest terms. Press “Show the step” to apply " + NAMES[s.prop].toLowerCase() + ".";
      } else {
        var bad = R[0][1] === 0;
        function side(r) { var plain = sg(r[0]) + "/" + sg(r[1]); return r[2] === plain ? plain : r[2] + " = " + plain; }
        k.set("left", side(R[0])); k.set("right", side(R[1]));
        k.set("both", bad ? "not defined: a = b" : fr(R[0][0], R[0][1]) + " = " + fr(R[1][0], R[1][1]) + " ✓");
        var extra = {
          inv: "Turn both ratios upside down and they stay equal.",
          alt: "Swap the means: the first terms make one ratio and the second terms the other. (All four numbers must be positive.)",
          comp: "Add the denominator to the numerator on both sides. The tapes grow, but both new ratios are still equal.",
          div: "Take the denominator away from the numerator on both sides; the hatched part is removed." + (s.p < s.q ? " Here a − b is negative, and the property still holds." : ""),
          cd: "Numerator a + b, denominator a − b, on both sides."
        }[s.prop];
        g = bad ? "Here a = b, so a − b = 0 and componendo-dividendo cannot be used (we cannot divide by 0)." : extra + " Both sides reduce to " + fr(R[0][0], R[0][1]) + ".";
      }
      k.el('[data-r="note"]').textContent = g;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var v = V(), S = segments(), t = s.t, e = t * t * (3 - 2 * t);
      // scale: the longest tape in either state, plus room on the left for negative parts
      var maxR = Math.max(v.a + v.b, v.c + v.d, v.a, v.b, v.c, v.d), neg = 0;
      S.forEach(function (q) { neg = Math.min(neg, q.to[2]); });
      var gap = 34, colW = (W - 24 - gap) / 2, unit = colW / (maxR - neg), h = Math.min(58, H * 0.16);
      var rowY = [H * 0.4 - h, H * 0.4 + 14], lineY = H * 0.4 + 7;
      function X(side, off) { return 12 + side * (colW + gap) + (off - neg) * unit; }
      // fraction lines and "="
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2;
      [0, 1].forEach(function (sd) { ctx.beginPath(); ctx.moveTo(12 + sd * (colW + gap), lineY); ctx.lineTo(12 + sd * (colW + gap) + colW, lineY); ctx.stroke(); });
      ctx.fillStyle = c.ink; ctx.font = "700 24px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("=", 12 + colW + gap / 2, lineY);
      if (neg < 0) {   // zero marks when parts go negative
        ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
        [0, 1].forEach(function (sd) { ctx.beginPath(); ctx.moveTo(X(sd, 0), rowY[0] - 8); ctx.lineTo(X(sd, 0), rowY[1] + h + 8); ctx.stroke(); });
        ctx.restore();
      }
      function place(q) {
        var f = q.from, to = q.to;
        return [X(f[0], f[2]) + (X(to[0], to[2]) - X(f[0], f[2])) * e, rowY[f[1]] + (rowY[to[1]] - rowY[f[1]]) * e];
      }
      // positive parts first, then the parts taken away
      S.forEach(function (q) {
        if (q.minus) return;
        var P = place(q), w = q.v * unit;
        ctx.fillStyle = c[q.col]; ctx.globalAlpha = 0.85; ctx.fillRect(P[0], P[1], w, h); ctx.globalAlpha = 1;
        ctx.strokeStyle = c.surface; ctx.lineWidth = 1.5; ctx.strokeRect(P[0], P[1], w, h);
        var lx0 = P[0], lx1 = P[0] + w;
        if (e > 0.98) S.forEach(function (m) {   // keep the label clear of a part that is taken away
          if (m.minus && m.to[0] === q.to[0] && m.to[1] === q.to[1]) { var mx = X(m.to[0], m.to[2]); if (mx > lx0 && mx < lx1) lx1 = mx; }
        });
        if (lx1 - lx0 > 22) { ctx.fillStyle = c.surface; ctx.font = "700 13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(q.v), (lx0 + lx1) / 2, P[1] + h / 2); }
      });
      S.forEach(function (q) {
        if (!q.minus) return;
        var P = place(q), w = q.v * unit;
        ctx.save();
        if (e > 0.98) { ctx.fillStyle = c.surface; ctx.globalAlpha = 0.75; ctx.fillRect(P[0], P[1], w, h); ctx.globalAlpha = 1; }
        else { ctx.fillStyle = c[q.col]; ctx.globalAlpha = 0.5; ctx.fillRect(P[0], P[1], w, h); ctx.globalAlpha = 1; }
        ctx.beginPath(); ctx.rect(P[0], P[1], w, h); ctx.clip();
        ctx.strokeStyle = c.bad; ctx.lineWidth = 1.5;
        for (var x = P[0] - h; x < P[0] + w; x += 8) { ctx.beginPath(); ctx.moveTo(x, P[1] + h); ctx.lineTo(x + h, P[1]); ctx.stroke(); }
        ctx.restore();
        ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = c.bad; ctx.lineWidth = 2; ctx.strokeRect(P[0], P[1], w, h); ctx.restore();
        if (e > 0.98 && w > 26) {
          ctx.font = "700 13px " + c.font; var tw = ctx.measureText("−" + q.v).width + 8;
          ctx.fillStyle = c.surface; ctx.fillRect(P[0] + w / 2 - tw / 2, P[1] + h / 2 - 9, tw, 18);
          ctx.fillStyle = c.bad; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("−" + q.v, P[0] + w / 2, P[1] + h / 2);
        }
      });
      // written ratios under each side
      var R = result(), lines = t < 1 ? [[v.a + "/" + v.b, "= " + fr(v.a, v.b)], [v.c + "/" + v.d, "= " + fr(v.c, v.d)]]
        : [[R[0][2], "= " + sg(R[0][0]) + "/" + sg(R[0][1]) + (R[0][1] ? " = " + fr(R[0][0], R[0][1]) : "")], [R[1][2], "= " + sg(R[1][0]) + "/" + sg(R[1][1]) + (R[1][1] ? " = " + fr(R[1][0], R[1][1]) : "")]];
      var fs = Math.max(11, Math.min(17, colW / 12));
      [0, 1].forEach(function (sd) {
        var x = 12 + sd * (colW + gap) + colW / 2, y = rowY[1] + h + 22;
        ctx.fillStyle = sd ? c.vy : c.vx; ctx.font = "700 " + fs + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(lines[sd][0], x, y); ctx.fillText(lines[sd][1], x, y + fs + 6);
      });
      ctx.fillStyle = c.muted; ctx.font = "12px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(t < 1 ? "Given: a/b = c/d" : NAMES[s.prop], 12, 8);
      // legend: what colours mean
      ctx.textAlign = "right"; ctx.fillStyle = c.vx; ctx.fillText("a, c", W - 52, 8); ctx.fillStyle = c.vy; ctx.fillText("b, d", W - 12, 8);
    };

    var acc = 0;
    var clock = K.clock(function (dt) { s.t = Math.min(1, s.t + dt / 1.6); update(); return s.t < 1; });
    function play() { clock.stop(); s.t = 0; if (reduce) { s.t = 1; update(); } else { update(); clock.start(); } }
    function back() { clock.stop(); s.t = 0; update(); }
    var shows = ["p", "q", "m", "n"].map(function (q) {
      return k.bindSlider(q, function () { return s[q]; }, function (v) { s[q] = v; clock.stop(); s.t = s.t >= 1 ? 1 : 0; update(); }, function (v) { return String(v); });
    });
    var showP = k.bindChips("prop", function () { return s.prop; }, function (v) { s.prop = v; play(); });
    k.onAct({ play: play, back: back });
    update();
    return {
      set: function (o) { clock.stop(); Object.assign(s, o); if (!("t" in o)) s.t = 0; shows.forEach(function (f) { f(); }); showP(); update(); },
      play: play,
      seek: function (t) { clock.stop(); s.t = t; update(); },
      state: function () { return Object.assign({ values: V(), result: result() }, s); }
    };
  }
  window.RatioPropsSim = { mount: mount };
})();
