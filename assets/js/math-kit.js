/*
 * MathKit: drawing helpers shared by the maths simulations.
 *   MathKit.plane(ctx, c, box, view)  → { X, Y, ix, iy }   graph-paper axes with labelled ticks
 *   MathKit.line(ctx, P, a, b, cst, col, w)                   draws ax + by = cst across the view
 *   MathKit.dot(ctx, x, y, r, col, ring)
 *   MathKit.angleAt(A, B, C)  angle ABC in degrees;  MathKit.dist(A, B)
 *   MathKit.arc(ctx, B, A, C, r, col, label, c)               marks angle ABC
 *   MathKit.frac(n)   pretty number: integers stay integers, others to 2 dp
 *   MathKit.term(coef, name, first)  "3x", "− y", "+ 2y" for writing equations
 */
(function () {
  "use strict";
  function niceStep(span, n) { var raw = span / (n || 8), p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p; }

  function plane(ctx, c, box, v) {
    var sx = box.w / (v.xmax - v.xmin), sy = box.h / (v.ymax - v.ymin);
    var X = function (x) { return box.x + (x - v.xmin) * sx; }, Y = function (y) { return box.y + box.h - (y - v.ymin) * sy; };
    var ix = function (px) { return v.xmin + (px - box.x) / sx; }, iy = function (py) { return v.ymin + (box.y + box.h - py) / sy; };
    var step = v.step || niceStep(Math.max(v.xmax - v.xmin, v.ymax - v.ymin), 10);
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    for (var x = Math.ceil(v.xmin / step) * step; x <= v.xmax; x += step) { ctx.beginPath(); ctx.moveTo(Math.round(X(x)) + 0.5, box.y); ctx.lineTo(Math.round(X(x)) + 0.5, box.y + box.h); ctx.stroke(); }
    for (var y = Math.ceil(v.ymin / step) * step; y <= v.ymax; y += step) { ctx.beginPath(); ctx.moveTo(box.x, Math.round(Y(y)) + 0.5); ctx.lineTo(box.x + box.w, Math.round(Y(y)) + 0.5); ctx.stroke(); }
    ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5;
    if (v.ymin <= 0 && v.ymax >= 0) { ctx.beginPath(); ctx.moveTo(box.x, Y(0)); ctx.lineTo(box.x + box.w, Y(0)); ctx.stroke(); }
    if (v.xmin <= 0 && v.xmax >= 0) { ctx.beginPath(); ctx.moveTo(X(0), box.y); ctx.lineTo(X(0), box.y + box.h); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = c.muted; ctx.font = "10px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
    var ly = Math.min(Math.max(Y(0) + 3, box.y), box.y + box.h - 12), every = step * (box.w / (v.xmax - v.xmin) * step < 22 ? 2 : 1);
    for (x = Math.ceil(v.xmin / every) * every; x <= v.xmax; x += every) if (Math.abs(x) > 1e-9) ctx.fillText(+x.toFixed(6), X(x), ly);
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    var lx = Math.min(Math.max(X(0) - 4, box.x + 16), box.x + box.w - 2);
    for (y = Math.ceil(v.ymin / every) * every; y <= v.ymax; y += every) if (Math.abs(y) > 1e-9) ctx.fillText(+y.toFixed(6), lx, Y(y));
    ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.font = "italic 12px " + c.font;
    ctx.fillText("x", box.x + box.w - 10, Math.min(Y(0), box.y + box.h) - 3);
    ctx.textBaseline = "top"; ctx.fillText("y", Math.max(X(0), box.x) + 5, box.y + 2);
    return { X: X, Y: Y, ix: ix, iy: iy, box: box, v: v };
  }

  // the line a·x + b·y = k, clipped to the view
  function line(ctx, P, a, b, k, col, w, dash) {
    var v = P.v, pts = [];
    if (Math.abs(b) > 1e-12) { [v.xmin, v.xmax].forEach(function (x) { pts.push([x, (k - a * x) / b]); }); }
    else if (Math.abs(a) > 1e-12) { var x0 = k / a; pts = [[x0, v.ymin], [x0, v.ymax]]; }
    else return;
    ctx.save(); ctx.beginPath(); ctx.rect(P.box.x, P.box.y, P.box.w, P.box.h); ctx.clip();
    ctx.strokeStyle = col; ctx.lineWidth = w || 3; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(P.X(pts[0][0]), P.Y(pts[0][1])); ctx.lineTo(P.X(pts[1][0]), P.Y(pts[1][1])); ctx.stroke();
    ctx.restore();
  }
  function dot(ctx, x, y, r, col, ring) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function dist(A, B) { return Math.hypot(B[0] - A[0], B[1] - A[1]); }
  function angleAt(A, B, C) {
    var u = [A[0] - B[0], A[1] - B[1]], w = [C[0] - B[0], C[1] - B[1]];
    var cs = (u[0] * w[0] + u[1] * w[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(w[0], w[1]) || 1);
    return Math.acos(Math.max(-1, Math.min(1, cs))) * 180 / Math.PI;
  }
  // arc for angle ABC in screen coordinates; fills a soft wedge and writes the label outside it
  function arc(ctx, B, A, C, r, col, label, c, right) {
    var a1 = Math.atan2(A[1] - B[1], A[0] - B[0]), a2 = Math.atan2(C[1] - B[1], C[0] - B[0]), d = a2 - a1;
    while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    ctx.save();
    if (right) {
      var s = r * 0.6, u = [Math.cos(a1), Math.sin(a1)], w = [Math.cos(a2), Math.sin(a2)];
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(B[0] + u[0] * s, B[1] + u[1] * s); ctx.lineTo(B[0] + (u[0] + w[0]) * s, B[1] + (u[1] + w[1]) * s); ctx.lineTo(B[0] + w[0] * s, B[1] + w[1] * s); ctx.stroke();
    } else {
      ctx.fillStyle = col; ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.arc(B[0], B[1], r, a1, a1 + d, d < 0); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(B[0], B[1], r, a1, a1 + d, d < 0); ctx.stroke();
    }
    if (label) {
      var m = a1 + d / 2, lr = r + 14;
      ctx.fillStyle = col; ctx.font = "700 12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, B[0] + Math.cos(m) * lr, B[1] + Math.sin(m) * lr);
    }
    ctx.restore();
  }
  function frac(n) { if (!isFinite(n)) return "–"; var r = Math.round(n); if (Math.abs(n - r) < 1e-9) return String(r).replace("-", "−"); return (+n.toFixed(2)).toString().replace("-", "−"); }
  // "3x", "− y", "+ 2y"; zero coefficients give ""
  function term(k, name, first) {
    if (k === 0) return "";
    var s = k < 0 ? "−" : first ? "" : "+", a = Math.abs(k), body = (a === 1 && name ? "" : frac(a)) + name;
    return first ? (k < 0 ? "−" : "") + body : " " + s + " " + body;
  }
  function eq(a, b, k) {   // "2x + 3y = 12"
    var s = term(a, "x", true); s += s ? term(b, "y", false) : term(b, "y", true);
    return (s || "0") + " = " + frac(k);
  }
  window.MathKit = { plane: plane, line: line, dot: dot, dist: dist, angleAt: angleAt, arc: arc, frac: frac, term: term, eq: eq, niceStep: niceStep };
})();
