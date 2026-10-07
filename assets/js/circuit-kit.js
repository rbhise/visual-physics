/*
 * CircuitKit: drawing helpers for circuit simulations (wires, moving charges, symbols).
 * Load after sim-kit.js.
 */
(function () {
  "use strict";

  // A wire path through a list of points, with positions measured along it
  function path(pts) {
    var segs = [], L = 0;
    for (var i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push([pts[i - 1], pts[i], L, l]); L += l; }
    return {
      pts: pts, length: L,
      at: function (d) {
        d = ((d % L) + L) % L;
        for (var j = 0; j < segs.length; j++) {
          var s = segs[j];
          if (d <= s[2] + s[3]) { var f = s[3] ? (d - s[2]) / s[3] : 0; return [s[0][0] + (s[1][0] - s[0][0]) * f, s[0][1] + (s[1][1] - s[0][1]) * f, (s[1][0] - s[0][0]) / (s[3] || 1), (s[1][1] - s[0][1]) / (s[3] || 1)]; }
        }
        return pts[pts.length - 1];
      }
    };
  }

  function wire(ctx, pts, col, w) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 2; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke(); ctx.restore();
  }

  // Moving charges: dots spaced evenly along a path, shifted by offset
  function dots(ctx, p, offset, spacing, col, r) {
    ctx.save(); ctx.fillStyle = col;
    for (var d = 0; d < p.length; d += spacing) { var q = p.at(d + offset); ctx.beginPath(); ctx.arc(q[0], q[1], r || 2.6, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  // Small arrowheads along a path (conventional current)
  function chevrons(ctx, p, offset, spacing, col) {
    ctx.save(); ctx.fillStyle = col;
    for (var d = 0; d < p.length; d += spacing) {
      var q = p.at(d + offset), a = Math.atan2(q[3], q[2]);
      ctx.save(); ctx.translate(q[0], q[1]); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // Resistor as a zigzag between two points, with straight leads
  function resistor(ctx, x1, y1, x2, y2, col, label, lcol, font) {
    var L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy, ny = ux;
    var body = Math.min(46, L * 0.6), a = (L - body) / 2, n = 6, amp = 7;
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ux * a, y1 + uy * a);
    for (var i = 1; i <= n; i++) {
      var t = a + body * (i - 0.5) / n, s = i % 2 ? amp : -amp;
      ctx.lineTo(x1 + ux * t + nx * s, y1 + uy * t + ny * s);
    }
    ctx.lineTo(x1 + ux * (a + body), y1 + uy * (a + body)); ctx.lineTo(x2, y2); ctx.stroke();
    if (label) {
      ctx.fillStyle = lcol || col; ctx.font = "600 12px " + (font || "monospace"); ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var mx = (x1 + x2) / 2 - nx * 20, my = (y1 + y2) / 2 - ny * 20;
      ctx.fillText(label, mx, my);
    }
    ctx.restore();
  }

  // Battery of n cells drawn vertically centred at (x, y); positive plate on top
  function battery(ctx, x, y, n, c) {
    var gap = 9, h = n * gap * 2 - gap;
    ctx.save(); ctx.strokeStyle = c.ink;
    for (var i = 0; i < n; i++) {
      var yy = y - h / 2 + i * gap * 2;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 14, yy); ctx.lineTo(x + 14, yy); ctx.stroke();          // long plate (+)
      ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 7, yy + gap); ctx.lineTo(x + 7, yy + gap); ctx.stroke(); // short plate (−)
    }
    ctx.fillStyle = c.ink; ctx.font = "600 12px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("+", x + 18, y - h / 2); ctx.fillText("−", x + 18, y + h / 2);
    ctx.restore();
    return { top: y - h / 2, bottom: y + h / 2 };
  }

  function bulb(ctx, x, y, r, glow, c) {
    ctx.save();
    if (glow > 0.01) {
      var g = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * (1.6 + glow * 1.6));
      g.addColorStop(0, "rgba(255,200,60," + (0.25 + glow * 0.6) + ")"); g.addColorStop(1, "rgba(255,200,60,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * (1.6 + glow * 1.6), 0, 7); ctx.fill();
    }
    ctx.fillStyle = glow > 0.01 ? "rgba(255,214,90," + (0.5 + glow * 0.5) + ")" : c.surface;
    ctx.strokeStyle = c.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.7, y - r * 0.7); ctx.lineTo(x + r * 0.7, y + r * 0.7); ctx.moveTo(x + r * 0.7, y - r * 0.7); ctx.lineTo(x - r * 0.7, y + r * 0.7); ctx.stroke();
    ctx.restore();
  }

  // Meter: circle with a letter and a reading beside it
  function meter(ctx, x, y, letter, reading, c, col) {
    ctx.save(); ctx.fillStyle = c.surface; ctx.strokeStyle = col || c.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col || c.ink; ctx.font = "700 13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(letter, x, y + 1);
    if (reading != null) { ctx.font = "600 12px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(reading, x + 16, y - 10); }
    ctx.restore();
  }

  // Switch between two points; open switches lift the blade
  function key(ctx, x1, y1, x2, y2, closed, c) {
    ctx.save(); ctx.strokeStyle = c.ink; ctx.fillStyle = c.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x1, y1, 3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x2, y2, 3, 0, 7); ctx.fill();
    var L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1) - (closed ? 0 : 0.5);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + Math.cos(a) * L, y1 + Math.sin(a) * L); ctx.stroke();
    ctx.restore();
  }

  window.CircuitKit = { path: path, wire: wire, dots: dots, chevrons: chevrons, resistor: resistor, battery: battery, bulb: bulb, meter: meter, key: key };
})();
