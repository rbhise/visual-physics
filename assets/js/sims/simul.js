/*
 * Simultaneous equations a1x + b1y = k1 and a2x + b2y = k2.
 * The graph shows both lines; their crossing point is the solution. The panel works through the
 * textbook method (elimination or substitution) one step at a time.
 * Needs sim-kit.js and math-kit.js.  SimulSim.mount(el, { e1: [1,1,4], e2: [2,-5,1], method: "elim" }) → { set, play }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit;
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a; }
  function lcm(a, b) { return Math.abs(a * b) / (gcd(a, b) || 1); }
  var f = M.frac;

  function solve(e1, e2) {
    var D = e1[0] * e2[1] - e2[0] * e1[1];
    if (D === 0) {
      var same = e1[0] * e2[2] === e2[0] * e1[2] && e1[1] * e2[2] === e2[1] * e1[2];
      return { kind: same ? "same" : "parallel" };
    }
    return { kind: "one", x: (e1[2] * e2[1] - e2[2] * e1[1]) / D, y: (e1[0] * e2[2] - e2[0] * e1[2]) / D };
  }

  // textbook-style working. Returns an array of lines.
  function elimination(e1, e2, r) {
    var S = [], v = e1[1] !== 0 && e2[1] !== 0 ? "y" : "x", i = v === "y" ? 1 : 0, o = 1 - i;
    var L = lcm(e1[i], e2[i]), m1 = L / Math.abs(e1[i]), m2 = L / Math.abs(e2[i]);
    var A = e1.map(function (q) { return q * m1; }), B = e2.map(function (q) { return q * m2; });
    if (m1 !== 1) S.push("Multiply (I) by " + m1 + ":  " + M.eq(A[0], A[1], A[2]));
    if (m2 !== 1) S.push("Multiply (II) by " + m2 + ":  " + M.eq(B[0], B[1], B[2]));
    var sub = Math.sign(A[i]) === Math.sign(B[i]), C = [A[0] + (sub ? -B[0] : B[0]), A[1] + (sub ? -B[1] : B[1]), A[2] + (sub ? -B[2] : B[2])];
    S.push((sub ? "Subtract" : "Add") + " the equations so the " + v + "-terms cancel:  " + M.eq(C[0], C[1], C[2]));
    var other = o === 0 ? "x" : "y", val = C[2] / C[o];
    S.push("Divide by " + f(C[o]) + ":  " + other + " = " + f(val));
    // back-substitute into (I) (or (II) if (I) has no term in v)
    var E = e1[i] !== 0 ? e1 : e2, nm = E === e1 ? "(I)" : "(II)", rest = E[2] - E[o] * val;
    var take = E[o] * val, takeTxt = take < 0 ? " + " + f(-take) : " − " + f(take);
    S.push("Put " + other + " = " + f(val) + " in " + nm + ":  " + M.term(E[i], v, true) + " = " + f(E[2]) + takeTxt + " = " + f(rest) + (E[i] === 1 ? "" : ",  so " + v + " = " + f(rest / E[i])));
    S.push("Solution: x = " + f(r.x) + ", y = " + f(r.y));
    return S;
  }
  // "2x − 1", "4 − y", "−16 + 5y": the w-term first, then the constant
  function expr(c0, c1, w) {
    var t = c1 ? (c1 < 0 ? "−" : "") + (Math.abs(c1) === 1 ? "" : f(Math.abs(c1))) + w : "";
    if (c0) t += t ? (c0 < 0 ? " − " : " + ") + f(Math.abs(c0)) : f(c0);
    return t || "0";
  }
  function substitution(e1, e2, r) {
    var S = [], pick = null;
    // prefer a coefficient of ±1
    [[e1, 0, "(I)"], [e1, 1, "(I)"], [e2, 0, "(II)"], [e2, 1, "(II)"]].forEach(function (q) { if (!pick && Math.abs(q[0][q[1]]) === 1) pick = q; });
    if (!pick) pick = e1[0] !== 0 ? [e1, 0, "(I)"] : [e1, 1, "(I)"];
    var E = pick[0], i = pick[1], o = 1 - i, v = i === 0 ? "x" : "y", w = o === 0 ? "x" : "y", F = E === e1 ? e2 : e1, fn = E === e1 ? "(II)" : "(I)";
    var a = E[i], b = E[o], kk = E[2];
    if (Math.abs(a) === 1) {
      var c0 = kk / a, c1 = -b / a, ex = expr(c0, c1, w);   // v = c0 + c1·w
      S.push("From " + pick[2] + ":  " + v + " = " + ex);
      S.push("Substitute this for " + v + " in " + fn + ":  " + f(F[i]) + "(" + ex + ")" + (F[o] < 0 ? " − " : " + ") + (Math.abs(F[o]) === 1 ? "" : f(Math.abs(F[o]))) + w + " = " + f(F[2]));
      var cw = F[i] * c1 + F[o], rhs = F[2] - F[i] * c0, wv = rhs / cw;
      S.push("Collect the " + w + "-terms:  " + M.term(cw, w, true) + " = " + f(rhs) + (cw === 1 ? "" : ",  so " + w + " = " + f(wv)));
      S.push("Then " + v + " = " + ex.replace(new RegExp("(\\d*)" + w), function (m0, d) { return (d ? d + " × " : "") + (wv < 0 ? "(" + f(wv) + ")" : f(wv)); }) + " = " + f(c0 + c1 * wv));
    } else {
      // keep the fraction, then multiply through by a
      var num = expr(kk, -b, w);
      S.push("From " + pick[2] + ":  " + v + " = (" + num + ") ÷ " + f(a));
      S.push("Substitute in " + fn + ":  " + f(F[i]) + " × (" + num + ") ÷ " + f(a) + (F[o] < 0 ? " − " : " + ") + (Math.abs(F[o]) === 1 ? "" : f(Math.abs(F[o]))) + w + " = " + f(F[2]));
      var cw2 = a * F[o] - F[i] * b, rhs2 = a * F[2] - F[i] * kk, wv2 = rhs2 / cw2;
      S.push("Multiply every term by " + f(a) + ":  " + f(F[i]) + "(" + num + ")" + (a * F[o] < 0 ? " − " : " + ") + f(Math.abs(a * F[o])) + w + " = " + f(a * F[2]));
      S.push("Collect the " + w + "-terms:  " + M.term(cw2, w, true) + " = " + f(rhs2) + ",  so " + w + " = " + f(wv2));
      S.push("Then " + v + " = (" + f(kk) + (b ? (b > 0 ? " − " : " + ") + f(Math.abs(b)) + " × " + (wv2 < 0 ? "(" + f(wv2) + ")" : f(wv2)) : "") + ") ÷ " + f(a) + " = " + f((kk - b * wv2) / a));
    }
    S.push("Solution: x = " + f(r.x) + ", y = " + f(r.y));
    return S;
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "sm";
    var s = Object.assign({ e1: [1, 1, 4], e2: [2, -5, 1], method: "elim", shown: 99 }, opts);
    var clock;

    var k = K.frame(root, {
      aspect: "4 / 3",
      label: "Two straight lines on a grid, one for each equation, crossing at the solution",
      panel: K.chips("method", "Method", [["elim", "Elimination"], ["subs", "Substitution"]]) +
        '<div class="eq-pick"><div class="seg-label">Equation (I): <b data-r="e1t"></b></div>' +
        K.slider(id, "a1", "a₁", -6, 6, 1, "") + K.slider(id, "b1", "b₁", -6, 6, 1, "") + K.slider(id, "k1", "k₁", -30, 30, 1, "") + '</div>' +
        '<div class="eq-pick"><div class="seg-label">Equation (II): <b data-r="e2t"></b></div>' +
        K.slider(id, "a2", "a₂", -6, 6, 1, "") + K.slider(id, "b2", "b₂", -6, 6, 1, "") + K.slider(id, "k2", "k₂", -30, 30, 1, "") + '</div>' +
        K.buttons([["play", "Show the steps"]]),
      readouts: [["e1", "Equation (I)", "c-path"], ["e2", "Equation (II)", "c-vx"], ["sol", "Solution (x, y)", "c-vy"],
                 ["lines", "The lines", "wrap"], ["c1", "Check in (I)", "wrap"], ["c2", "Check in (II)", "wrap"]],
      cols: 3
    });
    var steps = document.createElement("ol"); steps.className = "steps-list"; steps.setAttribute("aria-live", "polite");
    root.querySelector(".sim-body").appendChild(steps);

    function view(r) {
      var cx = 0, cy = 0;
      if (r.kind === "one") { cx = Math.round(Math.max(-40, Math.min(40, r.x))); cy = Math.round(Math.max(-40, Math.min(40, r.y))); }
      return { xmin: cx - 8, xmax: cx + 8, ymin: cy - 6, ymax: cy + 6, step: 1 };
    }
    function sub(e, r) {   // "2(3) − 5(1)"
      var p = function (v) { return v < 0 ? "(" + f(v) + ")" : f(v); }, t = "";
      if (e[0]) t += (e[0] < 0 ? "−" : "") + Math.abs(e[0]) + p(r.x).replace(/^(?!\()/, "(").replace(/([^)])$/, "$1)");
      if (e[1]) t += (t ? (e[1] < 0 ? " − " : " + ") : (e[1] < 0 ? "−" : "")) + Math.abs(e[1]) + p(r.y).replace(/^(?!\()/, "(").replace(/([^)])$/, "$1)");
      return t;
    }
    function update() {
      var r = solve(s.e1, s.e2);
      k.el('[data-r="e1t"]').textContent = M.eq(s.e1[0], s.e1[1], s.e1[2]);
      k.el('[data-r="e2t"]').textContent = M.eq(s.e2[0], s.e2[1], s.e2[2]);
      k.set("e1", M.eq(s.e1[0], s.e1[1], s.e1[2])); k.set("e2", M.eq(s.e2[0], s.e2[1], s.e2[2]));
      var bad = (!s.e1[0] && !s.e1[1]) || (!s.e2[0] && !s.e2[1]);
      if (bad) { k.set("sol", "–"); k.set("lines", "Each equation needs an x or a y"); k.set("c1", "–"); k.set("c2", "–"); steps.innerHTML = ""; k.redraw(); return; }
      if (r.kind === "one") {
        k.set("sol", "(" + f(r.x) + ", " + f(r.y) + ")"); k.set("lines", "Cross at one point: one solution");
        k.set("c1", sub(s.e1, r) + " = " + f(s.e1[2]) + " ✓");
        k.set("c2", sub(s.e2, r) + " = " + f(s.e2[2]) + " ✓");
        var list = s.method === "elim" ? elimination(s.e1, s.e2, r) : substitution(s.e1, s.e2, r);
        steps.innerHTML = '<li class="given" value="0">(I) ' + M.eq(s.e1[0], s.e1[1], s.e1[2]) + '   (II) ' + M.eq(s.e2[0], s.e2[1], s.e2[2]) + '</li>' +
          list.map(function (t, i) { return '<li' + (i >= s.shown ? ' hidden' : '') + (i === list.length - 1 ? ' class="final"' : '') + '>' + t + '</li>'; }).join("");
      } else {
        k.set("sol", r.kind === "same" ? "Infinitely many" : "None");
        k.set("lines", r.kind === "same" ? "Same line: every point on it works" : "Parallel: they never meet");
        k.set("c1", "–"); k.set("c2", "–");
        steps.innerHTML = '<li class="final">' + (r.kind === "same" ? "The two equations describe the same line, so they have infinitely many common solutions." : "The lines are parallel, so there is no pair (x, y) that satisfies both equations.") + '</li>';
      }
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var r = solve(s.e1, s.e2), P = M.plane(ctx, c, { x: 8, y: 8, w: W - 16, h: H - 16 }, view(r));
      if (s.e1[0] || s.e1[1]) M.line(ctx, P, s.e1[0], s.e1[1], s.e1[2], c.path, 3);
      if (s.e2[0] || s.e2[1]) M.line(ctx, P, s.e2[0], s.e2[1], s.e2[2], c.vx, 3, r.kind === "same" ? [10, 8] : null);
      if (r.kind === "one") {
        var px = P.X(r.x), py = P.Y(r.y);
        M.dot(ctx, px, py, 8, c.vy, c.surface);
        ctx.fillStyle = c.vy; ctx.font = "700 14px " + c.font; ctx.textAlign = px > W - 130 ? "right" : "left"; ctx.textBaseline = "bottom";
        ctx.fillText("(" + f(r.x) + ", " + f(r.y) + ")", px + (px > W - 130 ? -12 : 12), py - 8);
      }
      ctx.font = "600 12px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillStyle = c.path; ctx.fillText("(I)", 14, 12); ctx.fillStyle = c.vx; ctx.fillText("(II)", 40, 12);
    };

    var shows = {};
    [["a1", 0, 0], ["b1", 0, 1], ["k1", 0, 2], ["a2", 1, 0], ["b2", 1, 1], ["k2", 1, 2]].forEach(function (q) {
      shows[q[0]] = k.bindSlider(q[0], function () { return (q[1] ? s.e2 : s.e1)[q[2]]; }, function (v) { (q[1] ? s.e2 : s.e1)[q[2]] = v; s.shown = 99; update(); }, function (v) { return f(v); });
    });
    var showM = k.bindChips("method", function () { return s.method; }, function (v) { s.method = v; s.shown = 99; update(); });
    function showAll() { Object.keys(shows).forEach(function (q) { shows[q](); }); showM(); }

    function play() {
      if (clock) clock.stop();
      s.shown = 0; update();
      var t = 0;
      clock = K.clock(function (dt) { t += dt; var n = Math.floor(t / 0.9) + 1; if (n !== s.shown) { s.shown = n; update(); } return n < 8; });
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { s.shown = 99; update(); } else clock.start();
    }
    k.onAct({ play: play });
    update();
    return {
      set: function (o) { if (clock) clock.stop(); if (o.e1) s.e1 = o.e1.slice(); if (o.e2) s.e2 = o.e2.slice(); if (o.method) s.method = o.method; s.shown = 99; showAll(); update(); },
      play: play, seek: function () {}, solve: function () { return solve(s.e1, s.e2); }
    };
  }
  window.SimulSim = { mount: mount, solve: solve, elimination: elimination, substitution: substitution };
})();
