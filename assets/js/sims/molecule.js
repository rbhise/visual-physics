/*
 * Molecule builder: pick a molecule or add atoms one by one, and add up the molecular mass.
 * Needs sim-kit.js and chem-kit.js.  MoleculeSim.mount(el, { formula: "H2O" }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit, CH = window.ChemKit;
  var PALETTE = ["H", "C", "N", "O", "Na", "Mg", "S", "Cl", "Ca"];
  var ORDER = ["C", "H", "Na", "Mg", "Ca", "N", "S", "Cl", "O"];   // display order for built formulae
  var PRESETS = { H2O: "Water", CO2: "Carbon dioxide", NH3: "Ammonia", CH4: "Methane", NaCl: "Sodium chloride", H2SO4: "Sulphuric acid", CaCO3: "Calcium carbonate", C6H12O6: "Glucose" };

  function mount(root, opts) {
    opts = opts || {};
    var counts = CH.count(opts.formula || "H2O"), name = PRESETS[opts.formula || "H2O"] || "";

    var k = K.frame(root, {
      aspect: "5 / 3",
      label: "Atoms of a molecule drawn as coloured balls, with the molecular mass worked out",
      panel: K.chips("preset", "Molecule", Object.keys(PRESETS).map(function (f) { return [f, CH.pretty(f)]; })) +
        '<div><div class="seg-label">Or build your own: add or remove atoms</div><div class="atom-pad">' +
        PALETTE.map(function (el) { return '<span class="atom-btn"><button type="button" class="chip" data-add="' + el + '" aria-label="Add ' + CH.ATOMS[el].name + '">+ ' + el + '</button><button type="button" class="chip" data-rem="' + el + '" aria-label="Remove ' + CH.ATOMS[el].name + '">−</button></span>'; }).join("") +
        '</div></div>' + K.hint("note"),
      readouts: [["f", "Formula", "c-path"], ["name", "Name"], ["n", "Atoms in one molecule"],
                 ["M", "Molecular mass (u)", "c-vy"], ["molar", "Molar mass (g/mol)", "c-vx"], ["kinds", "Elements"]],
      cols: 3
    });

    function formula() {
      var keys = Object.keys(counts).filter(function (e) { return counts[e] > 0; });
      // Use the textbook order for presets; otherwise carbon first, then others
      var order = keys.sort(function (a, b) { return ORDER.indexOf(a) - ORDER.indexOf(b); });
      return order.map(function (e) { return e + (counts[e] > 1 ? counts[e] : ""); }).join("");
    }
    function presetFor() { var f = formula(); for (var p in PRESETS) { var c = CH.count(p), same = true; for (var e in Object.assign({}, c, counts)) if ((c[e] || 0) !== (counts[e] || 0)) same = false; if (same) return p; } return ""; }

    function update() {
      var p = presetFor(), f = p || formula(), M = f ? CH.mass(f) : 0, n = 0;
      for (var e in counts) n += counts[e];
      k.set("f", f ? CH.pretty(f) : "–"); k.set("name", p ? PRESETS[p] : f ? "Your molecule" : "–");
      k.set("n", n); k.set("M", K.fmt(M, 1)); k.set("molar", K.fmt(M, 1));
      k.set("kinds", Object.keys(counts).filter(function (e) { return counts[e] > 0; }).length);
      k.el('[data-r="note"]').textContent = f ? "Molecular mass = sum of the atomic masses of all the atoms: " + Object.keys(CH.count(f)).map(function (e) { var c = CH.count(f)[e]; return c + " × " + CH.ATOMS[e].mass; }).join(" + ") + " = " + K.fmt(M, 1) + " u." : "Add some atoms to start.";
      root.querySelectorAll('[data-group="preset"] button').forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === p); });
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var p = presetFor(), f = p || formula();
      if (!f) return;
      var cnt = CH.count(f), list = [];
      Object.keys(cnt).forEach(function (e) { for (var i = 0; i < cnt[e]; i++) list.push(e); });
      // Atoms: big central cluster on the left
      var areaW = W * 0.5, cx = areaW / 2 + 10, cy = H / 2, n = list.length;
      var r = Math.max(9, Math.min(26, 120 / Math.sqrt(n + 1)));
      // Arrange by sorting heavy atoms to the centre, rings outward
      list.sort(function (a, b) { return CH.ATOMS[b].mass - CH.ATOMS[a].mass; });
      var placed = [], ring = 0, idx = 0;
      while (idx < n) {
        var cap = ring === 0 ? 1 : ring * 6, rad = ring * r * 1.9;
        for (var j = 0; j < cap && idx < n; j++, idx++) {
          var a = (j / cap) * Math.PI * 2 + ring * 0.4;
          placed.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a), list[idx]]);
        }
        ring++;
      }
      ctx.strokeStyle = c.line; ctx.lineWidth = 2;
      placed.slice(1).forEach(function (q) { ctx.beginPath(); ctx.moveTo(placed[0][0], placed[0][1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); });
      placed.slice().reverse().forEach(function (q) { CH.atom(ctx, q[0], q[1], q[2] === "H" ? r * 0.75 : r, q[2], c); });

      // Mass table on the right
      var tx = W * 0.56, ty = H * 0.12, rowH = Math.min(26, (H * 0.76) / (Object.keys(cnt).length + 2));
      ctx.font = "600 12px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(W < 520 ? "atoms × mass" : "Element   atoms × mass", tx, ty);
      Object.keys(cnt).forEach(function (e, i) {
        var y = ty + rowH * (i + 1);
        CH.atom(ctx, tx + 8, y, 8, e, c);
        ctx.fillStyle = c.ink; ctx.font = "13px " + c.font; ctx.textAlign = "left";
        ctx.fillText(e, tx + 22, y);
        ctx.fillText(cnt[e] + " × " + CH.ATOMS[e].mass + " = " + K.fmt(cnt[e] * CH.ATOMS[e].mass, 1), tx + 56, y);
      });
      var yT = ty + rowH * (Object.keys(cnt).length + 1);
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx, yT - rowH / 2); ctx.lineTo(W - 12, yT - rowH / 2); ctx.stroke();
      ctx.fillStyle = c.vy; ctx.font = "700 14px " + c.font; ctx.fillText("Total = " + K.fmt(CH.mass(f), 1) + " u", tx, yT);
    };

    k.bindChips("preset", function () { return presetFor(); }, function (f) { counts = CH.count(f); update(); });
    root.querySelector(".atom-pad").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.add) { var total = 0; for (var q in counts) total += counts[q]; if (total < 24) counts[b.dataset.add] = (counts[b.dataset.add] || 0) + 1; }
      if (b.dataset.rem && counts[b.dataset.rem]) counts[b.dataset.rem]--;
      update();
    });
    update();

    return { set: function (o) { counts = CH.count(o.formula); update(); }, seek: function () {}, play: function () {} };
  }

  window.MoleculeSim = { mount: mount };
})();
