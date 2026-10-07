/*
 * Resistors in series and in parallel, with a cell, an ammeter and moving charges.
 * Series:   Rs = R1 + R2 + R3, same current everywhere, voltages add up.
 * Parallel: 1/Rp = 1/R1 + 1/R2 + 1/R3, same voltage across each, currents add up.
 * Needs sim-kit.js and circuit-kit.js.  CombineSim.mount(el, { mode: "series", V: 18, R1: 16, R2: 14, R3: 0 }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit, CK = window.CircuitKit;

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "rsim";
    var s = Object.assign({ mode: "series", V: 12, R1: 4, R2: 8, R3: 0, broken: false, off: 0 }, opts);

    var k = K.frame(root, {
      aspect: "5 / 3.2",
      label: "Resistors joined in series or in parallel to a battery, with current and voltage for each",
      panel: K.chips("mode", "Connection", [["series", "Series"], ["parallel", "Parallel"]]) +
        K.slider(id, "V", "Battery voltage V", 1, 24, 1, "V") +
        K.slider(id, "R1", "R₁", 1, 30, 1, "Ω") +
        K.slider(id, "R2", "R₂", 1, 30, 1, "Ω") +
        K.slider(id, "R3", "R₃ (0 = not used)", 0, 30, 1, "Ω") +
        '<div class="checks">' + K.check(id, "broken", "Break R₂ (like a blown bulb)", false) + '</div>' +
        K.hint("note"),
      readouts: [["Reff", "Effective resistance (Ω)", "c-path"], ["I", "Total current (A)", "c-vy"], ["V", "Battery (V)"],
                 ["r1", "R₁: voltage, current", "wrap"], ["r2", "R₂: voltage, current", "wrap"], ["r3", "R₃: voltage, current", "wrap"]],
      cols: 3
    });

    function list() {
      var r = [{ n: "R₁", R: s.R1, ok: true }, { n: "R₂", R: s.R2, ok: !s.broken }];
      if (s.R3 > 0) r.push({ n: "R₃", R: s.R3, ok: true });
      return r;
    }

    function solve() {
      var r = list();
      if (s.mode === "series") {
        var broken = r.some(function (x) { return !x.ok; }), Rs = r.reduce(function (a, x) { return a + x.R; }, 0), I = broken ? 0 : s.V / Rs;
        return { Reff: broken ? Infinity : Rs, I: I, parts: r.map(function (x) { return { n: x.n, R: x.R, I: I, V: I * x.R, ok: x.ok }; }) };
      }
      var inv = r.reduce(function (a, x) { return a + (x.ok ? 1 / x.R : 0); }, 0), Rp = 1 / inv;
      return { Reff: Rp, I: s.V / Rp, parts: r.map(function (x) { return { n: x.n, R: x.R, I: x.ok ? s.V / x.R : 0, V: x.ok ? s.V : 0, ok: x.ok }; }) };
    }

    var clock = K.clock(function (dt) { s.off += dt; k.redraw(); return true; });

    function update() {
      var r = solve();
      k.set("Reff", isFinite(r.Reff) ? K.fmt(r.Reff, 2) : "∞ (open)");
      k.set("I", K.fmt(r.I, 2)); k.set("V", K.fmt(s.V, 1));
      ["r1", "r2", "r3"].forEach(function (key, j) {
        var p = r.parts[j];
        k.set(key, p ? (p.ok ? K.fmt(p.V, 2) + " V, " + K.fmt(p.I, 2) + " A" : "broken") : "not used");
      });
      var note = s.mode === "series"
        ? (s.broken ? "In series there is only one path. Breaking R₂ stops the current everywhere." : "Series: the same current flows through every resistor, and their voltages add up to the battery voltage.")
        : (s.broken ? "In parallel each resistor has its own path. Breaking R₂ leaves the others working." : "Parallel: every resistor gets the full battery voltage, and the branch currents add up to the total. Rp is less than the smallest resistor.");
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var r = solve(), x1 = W * 0.12, x2 = W * 0.9, y1 = H * 0.14, y2 = H * 0.86, by = (y1 + y2) / 2, n = r.parts.length;
      var bat = CK.battery(ctx, x1, by, Math.min(4, Math.max(1, Math.round(s.V / 6))), c);
      ctx.fillStyle = c.ink; ctx.font = "600 12px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(s.V + " V", x1 + 30, by);
      var speed = 40, mainPath;
      if (s.mode === "series") {
        // Resistors along the top and down the right side
        var slots = [], w = (x2 - x1 - 60) / n;
        for (var i = 0; i < n; i++) slots.push([x1 + 30 + i * w + 8, x1 + 30 + (i + 1) * w - 8]);
        var pts = [[x1, bat.top], [x1, y1]];
        CK.wire(ctx, [[x1, bat.top], [x1, y1], [slots[0][0], y1]], c.ink, 2);
        r.parts.forEach(function (p, j) {
          if (p.ok) CK.resistor(ctx, slots[j][0], y1, slots[j][1], y1, c.path, p.n + " " + p.R + " Ω", c.path, c.font);
          else { ctx.strokeStyle = c.bad; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(slots[j][0], y1); ctx.lineTo(slots[j][1], y1); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = c.bad; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(p.n + " broken", (slots[j][0] + slots[j][1]) / 2, y1 - 8); }
          var next = j < n - 1 ? slots[j + 1][0] : x2;
          CK.wire(ctx, [[slots[j][1], y1], [next, y1]], c.ink, 2);
          ctx.fillStyle = c.vy; ctx.font = "11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
          if (p.ok) ctx.fillText(K.fmt(p.V, 1) + " V", (slots[j][0] + slots[j][1]) / 2, y1 + 14);
        });
        CK.wire(ctx, [[x2, y1], [x2, y2], [x1, y2], [x1, bat.bottom]], c.ink, 2);
        CK.meter(ctx, (x1 + x2) / 2, y2, "A", K.fmt(r.I, 2) + " A", c, c.vy);
        mainPath = CK.path([[x1, bat.top], [x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, bat.bottom]]);
        if (r.I > 0) CK.chevrons(ctx, mainPath, s.off * speed * Math.min(2, r.I), 60, c.vy);
      } else {
        // Two rails with one branch per resistor between them
        var rx1 = W * 0.42, rx2 = W * 0.78, gap = (y2 - y1) / (n + 1);
        CK.wire(ctx, [[x1, bat.top], [x1, y1], [rx1, y1], [rx1, y1 + gap * n]], c.ink, 2);
        CK.wire(ctx, [[rx2, y1 + gap], [rx2, y2], [x1, y2], [x1, bat.bottom]], c.ink, 2);
        CK.meter(ctx, (x1 + rx1) / 2, y2, "A", K.fmt(r.I, 2) + " A", c, c.vy);
        r.parts.forEach(function (p, j) {
          var yy = y1 + gap * (j + 1);
          if (p.ok) { CK.resistor(ctx, rx1, yy, rx2, yy, c.path, p.n + " " + p.R + " Ω", c.path, c.font); }
          else { ctx.strokeStyle = c.bad; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(rx1, yy); ctx.lineTo(rx2, yy); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = c.bad; ctx.font = "600 12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(p.n + " broken", (rx1 + rx2) / 2, yy - 6); }
          ctx.fillStyle = c.vy; ctx.font = "11px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "middle";
          if (p.ok) { ctx.fillText(K.fmt(p.I, 2) + " A", rx2 + 8, yy - 9); var bp = CK.path([[rx1, yy], [rx2, yy]]); CK.chevrons(ctx, bp, s.off * speed * Math.min(2, p.I), 50, c.vy); }
        });
        mainPath = CK.path([[x1, bat.top], [x1, y1], [rx1, y1]]);
        if (r.I > 0) CK.chevrons(ctx, mainPath, s.off * speed * Math.min(2, r.I), 60, c.vy);
      }
    };

    var shows = {};
    ["V", "R1", "R2", "R3"].forEach(function (key) { shows[key] = k.bindSlider(key, function () { return s[key]; }, function (v) { s[key] = v; update(); }, key === "R3" ? function (v) { return v ? v + " Ω" : "not used"; } : null); });
    var brk = k.bindCheck("broken", function (on) { s.broken = on; update(); });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; update(); });
    update();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) clock.start();

    return {
      set: function (o) { Object.assign(s, o); Object.keys(shows).forEach(function (q) { shows[q](); }); brk.checked = !!s.broken; showM(); update(); },
      seek: function () {}, play: function () {},
      solve: solve
    };
  }

  window.CombineSim = { mount: mount };
})();
