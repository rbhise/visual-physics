/*
 * Ohm's law lab: cells, a plug key, an ammeter in series and a voltmeter across a wire XY.
 * Change the number of cells and record readings to plot current against potential difference.
 * Change the material, length and thickness of the wire to see R = ρL/A, and test insulators.
 * Needs sim-kit.js and circuit-kit.js.  OhmSim.mount(el, { mat: "nichrome", L: 1, d: 0.3, cells: 1 }) → { set, record, clear }
 */
(function () {
  "use strict";
  var K = window.SimKit, CK = window.CircuitKit;

  var MATS = {
    copper:   { label: "Copper", rho: 1.7e-8, conductor: true },
    aluminium:{ label: "Aluminium", rho: 2.7e-8, conductor: true },
    nichrome: { label: "Nichrome", rho: 1.1e-6, conductor: true },
    glass:    { label: "Glass rod", rho: 1e12, conductor: false },
    rubber:   { label: "Rubber", rho: 1e13, conductor: false }
  };

  function sci(x, d) {
    if (x === 0) return "0";
    if (x >= 0.01 && x < 1e5) return x.toFixed(d == null ? 2 : d);
    var e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    return m.toFixed(2) + " × 10" + String(e).replace(/-/g, "⁻").replace(/\d/g, function (q) { return "⁰¹²³⁴⁵⁶⁷⁸⁹"[q]; });
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "osim";
    var s = Object.assign({ mat: "nichrome", L: 1, d: 0.3, cells: 1, closed: true }, opts);
    var points = [];

    var k = K.frame(root, {
      aspect: "5 / 3.8",
      label: "A circuit with an ammeter and a voltmeter across a wire, and a graph of current against potential difference",
      panel: K.chips("mat", "Wire XY", Object.keys(MATS).map(function (m) { return [m, MATS[m].label]; })) +
        K.slider(id, "cells", "Cells (1.5 V each)", 1, 4, 1, "") +
        K.slider(id, "L", "Length L", 0.2, 2, 0.1, "m") +
        K.slider(id, "d", "Diameter", 0.1, 1, 0.05, "mm") +
        K.hint("note") +
        K.buttons([["record", "Record reading"], ["clear", "Clear graph"]]),
      readouts: [["V", "Voltmeter V (V)", "c-path"], ["I", "Ammeter I (A)", "c-vy"], ["R", "V ÷ I (Ω)", "c-vx"],
                 ["rho", "Resistivity ρ (Ω m)"], ["A", "Area A (m²)"], ["Rf", "ρL ÷ A (Ω)"]],
      cols: 3
    });

    function area() { var r = s.d / 2 / 1000; return Math.PI * r * r; }
    function R() { return MATS[s.mat].rho * s.L / area(); }
    function V() { return 1.5 * s.cells; }
    function I() { return s.closed ? V() / R() : 0; }

    function update() {
      var i = I(), r = R();
      k.set("V", K.fmt(V(), 2)); k.set("I", i < 1e-6 ? "0.000" : i < 0.01 ? sci(i) : K.fmt(i, 3));
      k.set("R", i > 0 ? sci(V() / i) : "–"); k.set("rho", sci(MATS[s.mat].rho)); k.set("A", sci(area())); k.set("Rf", sci(r));
      var note = !MATS[s.mat].conductor ? "This is an insulator: its resistance is enormous, so practically no current flows."
        : i > 5 ? "Copper and aluminium have very low resistance, so the current is very large. Good for connecting wires, but in a real lab the cells would run down quickly."
        : "Record readings for 1, 2, 3 and 4 cells. The points lie on a straight line through the origin: current is proportional to potential difference.";
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      // Circuit in the top part
      var top = H * 0.08, cy2 = H * 0.42, x1 = W * 0.1, x2 = W * 0.9, mid = (x1 + x2) / 2;
      var bat = CK.battery(ctx, x1, (top + cy2) / 2, s.cells, c);
      CK.wire(ctx, [[x1, bat.top], [x1, top], [mid - 60, top]], c.ink, 2);
      CK.key(ctx, mid - 60, top, mid - 30, top, s.closed, c);
      CK.wire(ctx, [[mid - 30, top], [mid + 10, top]], c.ink, 2);
      CK.meter(ctx, mid + 24, top, "A", null, c, c.vy);
      CK.wire(ctx, [[mid + 38, top], [x2, top], [x2, cy2], [x1 + W * 0.62, cy2]], c.ink, 2);
      // Wire XY drawn with a thickness that grows with its diameter and a length that grows with L
      var wx2 = x1 + W * 0.62, wx1 = wx2 - (W * 0.5) * (s.L / 2);
      ctx.strokeStyle = MATS[s.mat].conductor ? c.path : c.muted; ctx.lineWidth = 1.5 + s.d * 9; ctx.lineCap = "butt";
      ctx.beginPath(); ctx.moveTo(wx1, cy2); ctx.lineTo(wx2, cy2); ctx.stroke();
      CK.wire(ctx, [[wx1, cy2], [x1, cy2], [x1, bat.bottom]], c.ink, 2);
      ctx.fillStyle = c.ink; ctx.font = "600 12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("X", wx1, cy2 + 8); ctx.fillText("Y", wx2, cy2 + 8);
      if (W >= 520) { ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.fillText(MATS[s.mat].label + ", " + s.L + " m", (wx1 + wx2) / 2, cy2 + 22); }
      // Voltmeter across XY (in parallel)
      var vy = cy2 - (cy2 - top) * 0.5;
      CK.wire(ctx, [[wx1, cy2], [wx1, vy], [(wx1 + wx2) / 2 - 14, vy]], c.muted, 1.5);
      CK.wire(ctx, [[(wx1 + wx2) / 2 + 14, vy], [wx2, vy], [wx2, cy2]], c.muted, 1.5);
      CK.meter(ctx, (wx1 + wx2) / 2, vy, "V", null, c, c.path);
      // Moving electrons along the main loop when current flows
      var i = I();

      // Graph of I against V at the bottom
      var imax = Math.max(0.1, points.reduce(function (m, p) { return Math.max(m, p[1]); }, 0), i) * 1.15;
      var g = K.graph(ctx, c, { x: 0, y: H * 0.5, w: W, h: H * 0.5 }, { xmax: 6, ymax: imax, xlabel: "potential difference V (volt)", title: "Current I (A) against potential difference V (V)" });
      if (points.length) {
        var R0 = points[0][0] / points[0][1];
        ctx.strokeStyle = c.vx; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(g.X(0), g.Y(0)); ctx.lineTo(g.X(6), g.Y(Math.min(imax, 6 / R0))); ctx.stroke(); ctx.setLineDash([]);
        points.forEach(function (p) { ctx.fillStyle = c.vy; ctx.beginPath(); ctx.arc(g.X(p[0]), g.Y(p[1]), 5, 0, 7); ctx.fill(); });
      }
      ctx.strokeStyle = c.vy; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(g.X(V()), g.Y(i), 7, 0, 7); ctx.stroke();
    };

    var shows = {};
    shows.cells = k.bindSlider("cells", function () { return s.cells; }, function (v) { s.cells = v; update(); }, function (v) { return v + " (" + (1.5 * v).toFixed(1) + " V)"; });
    shows.L = k.bindSlider("L", function () { return s.L; }, function (v) { s.L = +v.toFixed(2); points = []; update(); }, function (v) { return (+v).toFixed(1) + " m"; });
    shows.d = k.bindSlider("d", function () { return s.d; }, function (v) { s.d = +v.toFixed(2); points = []; update(); }, function (v) { return (+v).toFixed(2) + " mm"; });
    var showM = k.bindChips("mat", function () { return s.mat; }, function (v) { s.mat = v; points = []; update(); });

    function record() {
      points = points.filter(function (p) { return p[0] !== V(); });
      points.push([V(), I()]); points.sort(function (a, b) { return a[0] - b[0]; });
      update();
    }
    // Record readings for 1 to 4 cells, ending on 4 cells
    function sweep() { points = []; for (var n = 1; n <= 4; n++) { s.cells = n; record(); } shows.cells(); }
    k.onAct({ record: record, clear: function () { points = []; update(); } });
    if (opts.sweep) sweep();
    update();

    return {
      set: function (o) { Object.assign(s, o); points = []; Object.keys(shows).forEach(function (q) { shows[q](); }); showM(); if (o.sweep) sweep(); update(); },
      record: record,
      sweep: sweep,
      seek: function () {}, play: function () {}
    };
  }

  window.OhmSim = { mount: mount, MATS: MATS };
})();
