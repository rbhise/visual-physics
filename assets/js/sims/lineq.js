/*
 * A linear equation in two variables, ax + by = k. Drag the point (or use its sliders):
 * the readouts test whether (x, y) is a solution. Mark the solutions you find and they line up;
 * "Show the line" draws every solution at once.
 * Needs sim-kit.js and math-kit.js.  LineSim.mount(el, { a: 1, b: 1, k: 7, x: 2, y: 3 }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit;
  var VIEW = { xmin: -4, xmax: 12, ymin: -3, ymax: 9, step: 1 };

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "lq";
    var s = Object.assign({ a: 1, b: 1, k: 7, x: 2, y: 3, line: false, marks: [] }, opts);
    var P = null, drag = false;

    var k = K.frame(root, {
      aspect: "4 / 3",
      label: "A coordinate grid with a point you can drag, testing whether it satisfies a linear equation",
      panel: '<div class="eqn-show" data-r="eqn"></div>' +
        K.slider(id, "a", "Coefficient a", -6, 6, 1, "") + K.slider(id, "b", "Coefficient b", -6, 6, 1, "") + K.slider(id, "k", "Constant on the right, k", -12, 12, 1, "") +
        K.slider(id, "x", "Point: x", VIEW.xmin, VIEW.xmax, 0.5, "") + K.slider(id, "y", "Point: y", VIEW.ymin, VIEW.ymax, 0.5, "") +
        '<div class="checks">' + K.check(id, "line", "Show the line", s.line) + '</div>' +
        K.buttons([["mark", "Mark this point"], ["clear", "Clear marks"]]) + K.hint("note"),
      readouts: [["form", "General form", "wrap"], ["pt", "Point (x, y)", "c-vy"], ["lhs", "Left side ax + by"],
                 ["ok", "Is it a solution?", "c-path"], ["xi", "Crosses x-axis at"], ["yi", "Crosses y-axis at"]],
      cols: 3
    });

    function lhs() { return s.a * s.x + s.b * s.y; }
    function isSol() { return Math.abs(lhs() - s.k) < 1e-9; }
    function general() {   // ax + by + c = 0 with c = −k
      var t = M.term(s.a, "x", true); t += t ? M.term(s.b, "y", false) : M.term(s.b, "y", true);
      var c0 = -s.k; if (c0) t += (t ? (c0 < 0 ? " − " : " + ") : (c0 < 0 ? "−" : "")) + M.frac(Math.abs(c0));
      return (t || "0") + " = 0";
    }
    function update() {
      var ok = isSol(), pv = function (v) { return "(" + M.frac(v) + ")"; }, sub = "";
      if (s.a) sub += (s.a < 0 ? "−" : "") + M.frac(Math.abs(s.a)) + pv(s.x);
      if (s.b) sub += (sub ? (s.b < 0 ? " − " : " + ") : (s.b < 0 ? "−" : "")) + M.frac(Math.abs(s.b)) + pv(s.y);
      k.el('[data-r="eqn"]').textContent = s.a === 0 && s.b === 0 ? "a and b cannot both be 0" : M.eq(s.a, s.b, s.k);
      k.set("form", s.a === 0 && s.b === 0 ? "–" : general());
      k.set("pt", "(" + M.frac(s.x) + ", " + M.frac(s.y) + ")");
      k.set("lhs", M.frac(lhs()));
      k.set("ok", ok ? "Yes" : "No: " + M.frac(lhs()) + " ≠ " + M.frac(s.k));
      k.set("xi", s.a ? "(" + M.frac(s.k / s.a) + ", 0)" : "never (parallel)");
      k.set("yi", s.b ? "(0, " + M.frac(s.k / s.b) + ")" : "never (parallel)");
      k.el('[data-r="note"]').textContent = ok
        ? "Substitute: " + sub + " = " + M.frac(s.k) + ". The equation is true, so (" + M.frac(s.x) + ", " + M.frac(s.y) + ") is a solution. Mark it and look for another."
        : "Substitute: " + sub + " = " + M.frac(lhs()) + ", not " + M.frac(s.k) + ". Move the point until the two sides are equal.";
      k.btn("mark").disabled = !ok;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      P = M.plane(ctx, c, { x: 8, y: 8, w: W - 16, h: H - 16 }, VIEW);
      if (s.line && (s.a || s.b)) M.line(ctx, P, s.a, s.b, s.k, c.path, 3);
      s.marks.forEach(function (m) { M.dot(ctx, P.X(m[0]), P.Y(m[1]), 6, c.good); });
      var px = P.X(s.x), py = P.Y(s.y), ok = isSol();
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, P.Y(0)); ctx.moveTo(px, py); ctx.lineTo(P.X(0), py); ctx.stroke(); ctx.restore();
      M.dot(ctx, px, py, 9, ok ? c.good : c.vy, c.surface);
      ctx.fillStyle = ok ? c.good : c.vy; ctx.font = "700 13px " + c.font; ctx.textAlign = px > W - 120 ? "right" : "left"; ctx.textBaseline = "bottom";
      ctx.fillText("(" + M.frac(s.x) + ", " + M.frac(s.y) + ")" + (ok ? " ✓" : ""), px + (px > W - 120 ? -12 : 12), py - 8);
    };

    // dragging the point, snapping to halves
    function toPoint(e) {
      var r = k.canvas.getBoundingClientRect(), x = P.ix(e.clientX - r.left), y = P.iy(e.clientY - r.top);
      s.x = Math.max(VIEW.xmin, Math.min(VIEW.xmax, Math.round(x * 2) / 2)); s.y = Math.max(VIEW.ymin, Math.min(VIEW.ymax, Math.round(y * 2) / 2));
      showX(); showY(); update();
    }
    k.canvas.addEventListener("pointerdown", function (e) { if (!P) return; drag = true; k.canvas.setPointerCapture(e.pointerId); toPoint(e); });
    k.canvas.addEventListener("pointermove", function (e) { if (drag) toPoint(e); });
    k.canvas.addEventListener("pointerup", function () { drag = false; });
    k.canvas.style.cursor = "crosshair";

    var showA = k.bindSlider("a", function () { return s.a; }, function (v) { s.a = v; s.marks = []; update(); }, function (v) { return M.frac(v); });
    var showB = k.bindSlider("b", function () { return s.b; }, function (v) { s.b = v; s.marks = []; update(); }, function (v) { return M.frac(v); });
    var showK = k.bindSlider("k", function () { return s.k; }, function (v) { s.k = v; s.marks = []; update(); }, function (v) { return M.frac(v); });
    var showX = k.bindSlider("x", function () { return s.x; }, function (v) { s.x = v; update(); }, function (v) { return M.frac(v); });
    var showY = k.bindSlider("y", function () { return s.y; }, function (v) { s.y = v; update(); }, function (v) { return M.frac(v); });
    var lineBox = k.bindCheck("line", function (on) { s.line = on; update(); });
    k.onAct({
      mark: function () { if (isSol() && !s.marks.some(function (m) { return m[0] === s.x && m[1] === s.y; })) s.marks.push([s.x, s.y]); update(); },
      clear: function () { s.marks = []; update(); }
    });
    update();
    return {
      set: function (o) { Object.assign(s, o); if (!o.marks && ("a" in o || "b" in o || "k" in o)) s.marks = o.marks || []; showA(); showB(); showK(); showX(); showY(); lineBox.checked = s.line; update(); },
      play: function () {}, seek: function () {}, state: function () { return s; }
    };
  }
  window.LineSim = { mount: mount };
})();
