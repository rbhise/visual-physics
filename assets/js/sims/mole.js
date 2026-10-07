/*
 * The mole: weigh out a substance and count the moles, molecules and atoms.
 * n = m ÷ M and N = n × 6.022 × 10²³. Each bag drawn holds one mole of particles.
 * Needs sim-kit.js and chem-kit.js.  MoleSim.mount(el, { sub: "H2O", m: 36 }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit, CH = window.ChemKit;
  var SUBS = { H2O: "Water", C: "Carbon", Fe: "Iron", NaCl: "Sodium chloride", CO2: "Carbon dioxide", C6H12O6: "Glucose" };

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "nsim";
    var s = Object.assign({ sub: "H2O", m: 36 }, opts);

    var k = K.frame(root, {
      aspect: "5 / 3",
      label: "A sample on a balance and bags each holding one mole of particles",
      panel: K.chips("sub", "Substance", Object.keys(SUBS).map(function (f) { return [f, SUBS[f] + " (" + CH.pretty(f) + ")"]; })) +
        K.slider(id, "m", "Mass of sample m", 0, 360, 0.1, "g") +
        K.hint("note"),
      readouts: [["M", "Molar mass M (g/mol)", "c-path"], ["n", "Moles n = m ÷ M", "c-vy"], ["N", "Particles N = n × Nₐ", "c-vx"],
                 ["atoms", "Atoms in the sample"], ["one", "Mass of one particle (g)"], ["kind", "Particles are"]],
      cols: 3
    });

    function M() { return CH.mass(s.sub); }
    function atomsPer() { var c = CH.count(s.sub), n = 0; for (var e in c) n += c[e]; return n; }

    function update() {
      var n = s.m / M(), N = n * CH.AVOGADRO;
      k.set("M", K.fmt(M(), 1)); k.set("n", K.fmt(n, 3)); k.set("N", CH.sci(N));
      k.set("atoms", CH.sci(N * atomsPer())); k.set("one", CH.sci(M() / CH.AVOGADRO));
      k.set("kind", s.sub === "NaCl" ? "formula units (ions)" : atomsPer() === 1 ? "atoms" : "molecules");
      k.el('[data-r="note"]').textContent = "1 mole of " + SUBS[s.sub].toLowerCase() + " has a mass of " + K.fmt(M(), 1) + " g and contains 6.022 × 10²³ particles (Avogadro's number).";
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var n = s.m / M(), u = Math.max(0.75, Math.min(1.7, W / 520));
      // Balance on the left
      var bx = W * 0.2, by = H * 0.66;
      ctx.fillStyle = c.line; ctx.fillRect(bx - 70 * u, by, 140 * u, 8 * u);
      ctx.fillStyle = c.ink; ctx.fillRect(bx - 50 * u, by + 8 * u, 100 * u, 38 * u);
      ctx.fillStyle = c.vx; ctx.font = "700 " + Math.round(15 * u) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(K.fmt(s.m, 0) + " g", bx, by + 27 * u);
      // Heap on the pan, size grows with mass
      var hh = Math.min(by * 0.55, (8 + Math.sqrt(s.m) * 5.5) * u), hw = Math.min(130 * u, (30 + Math.sqrt(s.m) * 6) * u);
      if (s.m > 0) {
        var el = Object.keys(CH.count(s.sub))[0];
        ctx.fillStyle = s.sub === "H2O" ? "rgba(80,150,230,0.55)" : s.sub === "CO2" ? "rgba(180,180,190,0.45)" : CH.ATOMS[el].color;
        ctx.strokeStyle = c.ink; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(bx - hw / 2, by); ctx.quadraticCurveTo(bx, by - hh * 1.6, bx + hw / 2, by); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = c.muted; ctx.font = Math.round(11 * u) + "px " + c.font; ctx.textBaseline = "top"; ctx.fillText(SUBS[s.sub], bx, by + 52 * u);

      // Mole bags on the right: one bag per mole, last one partly filled
      var gx = W * 0.42, gw = W - gx - 10, size = 50 * u, gap = 12 * u, cols = Math.max(3, Math.floor((gw + gap) / (size + gap))),
          full = Math.floor(n + 1e-9), frac = n - full;
      var shown = Math.min(full + (frac > 0.005 ? 1 : 0), cols * 4), rows = Math.max(1, Math.ceil(shown / cols));
      var top = Math.max(H * 0.14, (H - rows * (size + gap)) / 2);
      for (var i = 0; i < shown; i++) {
        var x = gx + (i % cols) * (size + gap), y = top + Math.floor(i / cols) * (size + gap), part = i < full ? 1 : frac;
        ctx.strokeStyle = c.path; ctx.lineWidth = 1.5; ctx.fillStyle = c.surface;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, size, size, 8); else ctx.rect(x, y, size, size); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.tint; ctx.fillRect(x + 1.5, y + size * (1 - part) + 1.5, size - 3, Math.max(0, size * part - 3));
        ctx.fillStyle = c.path; ctx.font = "600 " + Math.round(11 * u) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(part < 1 ? K.fmt(part, 2) : "1 mol", x + size / 2, y + size / 2);
      }
      ctx.fillStyle = c.muted; ctx.font = Math.round(11 * u) + "px " + c.font; ctx.textAlign = "left";
      if (full + 1 > cols * 4) { ctx.textBaseline = "top"; ctx.fillText("…and more", gx, top + rows * (size + gap)); }
      if (shown === 0) { ctx.textBaseline = "middle"; ctx.fillText("Add some mass to fill the bags.", gx, H / 2); }
      ctx.textBaseline = "bottom";
      ctx.fillText(W < 520 ? "each bag = 1 mole" : "each bag = 1 mole = 6.022 × 10²³ particles", gx, top - 8);
    };

    var showM = k.bindSlider("m", function () { return s.m; }, function (v) { s.m = +v.toFixed(1); update(); }, function (v) { return (+v).toFixed(1) + " g"; });
    var showS = k.bindChips("sub", function () { return s.sub; }, function (v) { s.sub = v; update(); });
    update();

    return { set: function (o) { Object.assign(s, o); showM(); showS(); update(); }, seek: function () {}, play: function () {} };
  }

  window.MoleSim = { mount: mount };
})();
