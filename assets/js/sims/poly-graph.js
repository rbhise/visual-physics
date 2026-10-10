/*
 * A polynomial p(x) = a₃x³ + a₂x² + a₁x + a₀ with coefficient sliders. Readouts name its degree and type,
 * write it in coefficient form, and evaluate p(a) at a point you drag along the x-axis. Zeroes are marked
 * where the graph meets the x-axis.
 * Needs sim-kit.js and math-kit.js.  PolyGraphSim.mount(el, { c: [1, 0, -4, 0], a: 2 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, f = M.frac;
  var SUP = ["", "", "²", "³", "⁴", "⁵", "⁶"];

  // coefficients highest power first → "2x³ − 3x + 1"
  function polyStr(c, v) {
    v = v || "x"; var n = c.length - 1, out = "";
    c.forEach(function (k, i) {
      if (!k) return; var p = n - i, a = Math.abs(k);
      var body = (a === 1 && p > 0 ? "" : f(a)) + (p > 0 ? v + SUP[p] : "");
      out += out ? (k < 0 ? " − " : " + ") + body : (k < 0 ? "−" : "") + body;
    });
    return out || "0";
  }
  function trim(c) { var i = 0; while (i < c.length - 1 && c[i] === 0) i++; return c.slice(i); }
  function evalP(c, x) { return c.reduce(function (s, k) { return s * x + k; }, 0); }
  function subst(c, x) {   // "2(2)³ − 3(2) + 1"
    var n = c.length - 1, out = "", xs = x < 0 ? "(" + f(x) + ")" : "(" + f(x) + ")";
    c.forEach(function (k, i) {
      if (!k) return; var p = n - i, a = Math.abs(k);
      var body = p === 0 ? f(a) : (a === 1 ? "" : f(a)) + xs + SUP[p];
      out += out ? (k < 0 ? " − " : " + ") + body : (k < 0 ? "−" : "") + body;
    });
    return out || "0";
  }
  function roots(c) {
    var g = function (x) { return evalP(c, x); }, out = [], lo = -6, N = 1200, prev = g(lo);
    if (trim(c).length < 2) return out;
    for (var i = 1; i <= N; i++) {
      var x = lo + 12 * i / N, y = g(x);
      if (Math.abs(prev) < 1e-12) { if (!out.length || Math.abs(out[out.length - 1] - (x - 12 / N)) > 1e-6) out.push(x - 12 / N); }
      else if (prev * y < 0) { var a = x - 12 / N, b = x; for (var j = 0; j < 60; j++) { var m = (a + b) / 2; if (g(a) * g(m) <= 0) b = m; else a = m; } out.push((a + b) / 2); }
      prev = y;
    }
    // touching zeroes (double roots): local minima of |p| that reach 0
    for (i = 1; i < N; i++) {
      var x0 = lo + 12 * i / N, ym = Math.abs(g(x0 - 0.01)), y0 = Math.abs(g(x0)), yp = Math.abs(g(x0 + 0.01));
      if (y0 < 1e-9 && y0 <= ym && y0 <= yp && !out.some(function (r) { return Math.abs(r - x0) < 0.02; })) out.push(x0);
    }
    return out.map(function (r) { var q = Math.round(r * 1000) / 1000; return Math.abs(q - Math.round(q)) < 1e-6 ? Math.round(q) : q; }).sort(function (p, q) { return p - q; });
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "pg";
    var s = Object.assign({ c: [1, 0, -4, 0], a: 2 }, opts);
    var clock = null, G = null, drag = false;

    var k = K.frame(root, {
      aspect: "4 / 3",
      label: "The graph of a polynomial with its degree, type and value at a chosen point",
      panel: '<div class="eqn-show" data-r="eqn"></div>' +
        K.slider(id, "c0", "a₃ (coefficient of x³)", -5, 5, 1, "") + K.slider(id, "c1", "a₂ (coefficient of x²)", -5, 5, 1, "") +
        K.slider(id, "c2", "a₁ (coefficient of x)", -5, 5, 1, "") + K.slider(id, "c3", "a₀ (constant term)", -8, 8, 1, "") +
        K.slider(id, "a", "x = a (or drag on the graph)", -4, 4, 0.5, "") +
        K.buttons([["play", "Slide a across"]]) + K.hint("note"),
      readouts: [["deg", "Degree", "c-path"], ["tdeg", "Type by degree", "wrap"], ["tterm", "Type by terms", "wrap"],
                 ["cf", "Coefficient form", "wrap"], ["pa", "Value p(a)", "c-vy"], ["z", "Zeroes on the graph", "wrap"]],
      cols: 3
    });

    function view() {
      var m = 1; for (var x = -1.5; x <= 1.5; x += 0.05) m = Math.max(m, Math.abs(evalP(s.c, x)));
      m = Math.max(m, Math.abs(evalP(s.c, s.a)));
      var y = m <= 6 ? 6 : m <= 12 ? 12 : m <= 24 ? 24 : m <= 48 ? 48 : 96;
      return { xmin: -5, xmax: 5, ymin: -y, ymax: y, ys: y / 6 };
    }
    function update() {
      var c = trim(s.c), deg = c.length - 1, zero = c.length === 1 && c[0] === 0, nt = c.filter(function (q) { return q !== 0; }).length;
      var pa = evalP(c, s.a), R = roots(c);
      k.el('[data-r="eqn"]').textContent = "p(x) = " + polyStr(c);
      k.set("deg", zero ? "not defined" : String(deg));
      k.set("tdeg", zero ? "zero polynomial" : ["Constant", "Linear", "Quadratic", "Cubic"][deg] + " polynomial");
      k.set("tterm", zero ? "–" : ["", "Monomial", "Binomial", "Trinomial", "4 terms"][nt]);
      k.set("cf", "(" + c.map(f).join(", ") + ")");
      k.set("pa", "p(" + f(s.a) + ") = " + f(pa));
      k.set("z", zero ? "every x" : R.length ? R.map(function (r) { var q = Math.round(r * 100) / 100; return (Math.abs(evalP(c, q)) < 1e-9 ? "x = " : "x ≈ ") + f(q); }).join(", ") : "none between −6 and 6");
      k.el('[data-r="note"]').textContent = zero ? "Every coefficient is 0: this is the zero polynomial, and its degree is not defined." :
        "p(" + f(s.a) + ") = " + (subst(c, s.a) === f(pa) ? "" : subst(c, s.a) + " = ") + f(pa) + "." + (Math.abs(pa) < 1e-9 ? " p(a) = 0, so " + f(s.a) + " is a zero of p(x): the graph meets the x-axis here." : " The point (" + f(s.a) + ", " + f(pa) + ") is on the graph.");
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var v = view(), box = { x: 8, y: 8, w: W - 16, h: H - 16 };
      var X = function (x) { return box.x + (x - v.xmin) / (v.xmax - v.xmin) * box.w; }, Y = function (y) { return box.y + box.h - (y - v.ymin) / (v.ymax - v.ymin) * box.h; };
      G = { ix: function (px) { return v.xmin + (px - box.x) / box.w * (v.xmax - v.xmin); } };
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      for (var x = v.xmin; x <= v.xmax; x++) { ctx.beginPath(); ctx.moveTo(X(x), box.y); ctx.lineTo(X(x), box.y + box.h); ctx.stroke(); }
      for (var y = v.ymin; y <= v.ymax + 1e-9; y += v.ys) { ctx.beginPath(); ctx.moveTo(box.x, Y(y)); ctx.lineTo(box.x + box.w, Y(y)); ctx.stroke(); }
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(box.x, Y(0)); ctx.lineTo(box.x + box.w, Y(0)); ctx.moveTo(X(0), box.y); ctx.lineTo(X(0), box.y + box.h); ctx.stroke();
      ctx.font = "10px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (x = v.xmin + 1; x < v.xmax; x++) if (x) ctx.fillText(f(x), X(x), Y(0) + 3);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (y = v.ymin + v.ys; y < v.ymax; y += v.ys) if (Math.abs(y) > 1e-9) ctx.fillText(f(y), X(0) - 4, Y(y));
      ctx.font = "italic 12px " + c.font; ctx.textAlign = "left"; ctx.fillText("x", box.x + box.w - 10, Y(0) - 8); ctx.fillText("y", X(0) + 5, box.y + 8);
      // curve
      var cf = trim(s.c);
      ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
      ctx.strokeStyle = c.path; ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.beginPath();
      for (var i = 0; i <= 400; i++) { var xx = v.xmin + (v.xmax - v.xmin) * i / 400, py = Y(evalP(cf, xx)); py = Math.max(-1000, Math.min(H + 1000, py)); if (i) ctx.lineTo(X(xx), py); else ctx.moveTo(X(xx), py); }
      ctx.stroke(); ctx.restore();
      roots(cf).forEach(function (r) { if (r > v.xmin && r < v.xmax) M.dot(ctx, X(r), Y(0), 6, c.good, c.surface); });
      // the point (a, p(a))
      var pa = evalP(cf, s.a), px = X(s.a), py2 = Math.max(box.y + 6, Math.min(box.y + box.h - 6, Y(pa)));
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = c.vy; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, Y(0)); ctx.lineTo(px, py2); ctx.stroke(); ctx.restore();
      ctx.fillStyle = c.vy; ctx.beginPath(); ctx.moveTo(px, Y(0) + 2); ctx.lineTo(px - 7, Y(0) + 14); ctx.lineTo(px + 7, Y(0) + 14); ctx.closePath(); ctx.fill();
      M.dot(ctx, px, py2, 8, c.vy, c.surface);
      var right = px < W - 150;
      ctx.font = "700 13px " + c.font; ctx.fillStyle = c.vy; ctx.textAlign = right ? "left" : "right"; ctx.textBaseline = py2 < box.y + 30 ? "top" : "bottom";
      ctx.fillText("p(" + f(s.a) + ") = " + f(pa), px + (right ? 12 : -12), py2 + (py2 < box.y + 30 ? 8 : -8));
    };

    function toA(e) { var r = k.canvas.getBoundingClientRect(); s.a = Math.max(-4, Math.min(4, Math.round(G.ix(e.clientX - r.left) * 2) / 2)); shows.a(); update(); }
    k.canvas.addEventListener("pointerdown", function (e) { if (!G) return; stop(); drag = true; k.canvas.setPointerCapture(e.pointerId); toA(e); });
    k.canvas.addEventListener("pointermove", function (e) { if (drag) toA(e); });
    k.canvas.addEventListener("pointerup", function () { drag = false; });
    k.canvas.style.cursor = "ew-resize";

    var shows = {};
    [0, 1, 2, 3].forEach(function (i) { shows["c" + i] = k.bindSlider("c" + i, function () { return s.c[i]; }, function (v) { stop(); s.c[i] = v; update(); }, f); });
    shows.a = k.bindSlider("a", function () { return s.a; }, function (v) { stop(); s.a = v; update(); }, f);
    function stop() { if (clock) clock.stop(); }
    function play() {
      stop();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      var end = s.a, t = 0; s.a = -4;
      clock = K.clock(function (dt) { t += dt; var na = Math.min(4, -4 + Math.floor(t / 0.2) * 0.5); if (na !== s.a) { s.a = na; shows.a(); update(); } if (na >= 4) { s.a = end; shows.a(); update(); return false; } return true; });
      clock.start();
    }
    k.onAct({ play: play });
    update();
    return {
      set: function (o) { stop(); if (o.c) o.c = [0, 0, 0, 0].concat(o.c).slice(-4); Object.assign(s, o); Object.keys(shows).forEach(function (q) { shows[q](); }); update(); },
      play: play, seek: function () {}, state: function () { return s; }
    };
  }
  window.PolyGraphSim = { mount: mount, polyStr: polyStr, evalP: evalP };
})();
