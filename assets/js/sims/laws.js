/*
 * Laws of chemical combination: react two elements in a closed flask on a balance.
 * Each dot is 1 mole of atoms. The balance reading never changes (conservation of mass),
 * and the product always has the same mass ratio (constant proportions); any excess is left over.
 * Needs sim-kit.js and chem-kit.js.  ReactionSim.mount(el, { rx: "water", a: 4, b: 32 }) → { set, seek, play }
 */
(function () {
  "use strict";
  var K = window.SimKit, CH = window.ChemKit;

  // a and b are masses in grams; atoms per formula unit of product: na of A, nb of B
  var RX = {
    water: { label: "Hydrogen + oxygen → water", A: "H", B: "O", na: 2, nb: 1, product: "H2O", aMax: 8, aStep: 1, bMax: 64, bStep: 16, a: 4, b: 32 },
    co2:   { label: "Carbon + oxygen → carbon dioxide", A: "C", B: "O", na: 1, nb: 2, product: "CO2", aMax: 36, aStep: 12, bMax: 96, bStep: 16, a: 12, b: 32 },
    mgo:   { label: "Magnesium + oxygen → magnesium oxide", A: "Mg", B: "O", na: 1, nb: 1, product: "MgO", aMax: 96, aStep: 24, bMax: 64, bStep: 16, a: 24, b: 16 }
  };

  function solve(s) {
    var r = RX[s.rx], A = CH.ATOMS[r.A].mass, B = CH.ATOMS[r.B].mass;
    var molA = s.a / A, molB = s.b / B, units = Math.min(molA / r.na, molB / r.nb);
    var usedA = units * r.na * A, usedB = units * r.nb * B;
    return { units: units, molA: molA, molB: molB, usedA: usedA, usedB: usedB, product: usedA + usedB, leftA: s.a - usedA, leftB: s.b - usedB };
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "lsim";
    var s = Object.assign({ rx: "water", f: 0 }, opts);
    if (opts.a == null) { s.a = RX[s.rx].a; s.b = RX[s.rx].b; }

    var k = K.frame(root, {
      aspect: "5 / 3.2",
      label: "A closed flask on a balance in which two elements react; each dot is one mole of atoms",
      panel: K.chips("rx", "Reaction", Object.keys(RX).map(function (x) { return [x, RX[x].label]; })) +
        K.slider(id, "a", "First element", 0, 96, 1, "g") +
        K.slider(id, "b", "Oxygen", 0, 96, 16, "g") +
        K.hint("note") +
        K.buttons([["play", "React"], ["reset", "Reset"]]),
      readouts: [["before", "Mass before (g)", "c-path"], ["after", "Mass after (g)", "c-path"], ["prod", "Product formed (g)", "c-vx"],
                 ["left", "Left over (g)", "c-vy"], ["ratio", "Mass ratio in product"], ["units", "Product (mol)"]],
      cols: 3
    });

    var inA = root.querySelector('input[data-k="a"]'), inB = root.querySelector('input[data-k="b"]');
    function configure() {
      var r = RX[s.rx];
      inA.max = r.aMax; inA.step = r.aStep; inB.max = r.bMax; inB.step = r.bStep;
      root.querySelector('label[for="' + inA.id + '"]').firstChild.nodeValue = CH.ATOMS[r.A].name + " ";
    }

    var clock = K.clock(function (dt) { s.f = Math.min(1, s.f + dt / 1.5); update(); return s.f < 1; });
    clock.onStop = function () { k.btn("play").textContent = "React again"; };

    function update() {
      var r = RX[s.rx], q = solve(s), f = s.f;
      var made = q.product * f, leftA = s.a - q.usedA * f, leftB = s.b - q.usedB * f;
      k.set("before", K.fmt(s.a + s.b, 1));
      k.set("after", K.fmt(made + leftA + leftB, 1));
      k.set("prod", K.fmt(made, 1));
      var lo = f < 1 ? "–" : q.leftA > 0.01 ? K.fmt(q.leftA, 1) + " " + r.A : q.leftB > 0.01 ? K.fmt(q.leftB, 1) + " O" : "0";
      k.set("left", lo);
      var g = gcdRatio(q.usedA, q.usedB);
      k.set("ratio", q.units > 0 ? r.A + " : O = " + g : "–");
      k.set("units", K.fmt(q.units * f, 2) + " " + CH.pretty(r.product));
      k.el('[data-r="note"]').textContent = f < 1
        ? "Each dot is 1 mole of atoms. Press React and watch the balance: the reading never changes."
        : (q.leftA > 0.01 || q.leftB > 0.01)
          ? "The extra " + (q.leftA > 0.01 ? CH.ATOMS[r.A].name.toLowerCase() : "oxygen") + " has nothing to combine with, so it is left over. The product still has the same mass ratio."
          : "Every atom has combined. Total mass before = total mass after, and the product's mass ratio is fixed.";
      k.redraw();
    }

    function gcdRatio(x, y) {
      if (y === 0) return "–";
      var r = x / y, pairs = [[1, 8], [3, 8], [3, 2], [1, 1], [3, 4]];
      for (var i = 0; i < pairs.length; i++) if (Math.abs(r - pairs[i][0] / pairs[i][1]) < 1e-6) return pairs[i][0] + " : " + pairs[i][1];
      return K.fmt(r, 3) + " : 1";
    }

    k.draw = function (ctx, W, H, c) {
      var r = RX[s.rx], q = solve(s), f = s.f;
      var cx = W * 0.42, fy = H * 0.1, fw = Math.min(W * 0.62, 360), fh = H * 0.6;
      // Flask (rounded box) on a balance
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.fillStyle = c.bg;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx - fw / 2, fy, fw, fh, 18); else ctx.rect(cx - fw / 2, fy, fw, fh); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("closed flask", cx - fw / 2 + 10, fy + 8);
      var by = fy + fh + 8;
      ctx.fillStyle = c.line; ctx.fillRect(cx - fw / 2 - 10, by, fw + 20, 10);
      ctx.fillStyle = c.ink; ctx.fillRect(cx - 70, by + 10, 140, H - by - 16);
      var reading = s.a + s.b;
      ctx.fillStyle = c.vx; ctx.font = "700 16px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(K.fmt(reading, 1) + " g", cx, (by + 10 + H - 6) / 2);

      // Particles: free atoms, then product units as they form. Positions fixed by index on a grid.
      var nA = Math.round(q.molA), nB = Math.round(q.molB), units = Math.round(q.units), done = Math.round(units * f);
      var freeA = nA - done * r.na, freeB = nB - done * r.nb, rad = 9, cols = Math.max(4, Math.floor((fw - 30) / 46));
      var items = [];
      for (var i = 0; i < done; i++) items.push("P");
      for (i = 0; i < freeA; i++) items.push("A");
      for (i = 0; i < freeB; i++) items.push("B");
      items.forEach(function (it, j) {
        var gx = cx - fw / 2 + 26 + (j % cols) * 46, gy = fy + 36 + Math.floor(j / cols) * 40;
        if (gy > fy + fh - 14) return;
        if (it === "P") {
          // Draw the product unit: B atoms in the middle, A atoms around
          var pts = r.na === 2 ? [[0, 0, r.B], [-11, 7, r.A], [11, 7, r.A]] : r.nb === 2 ? [[0, 0, r.A], [-14, 0, r.B], [14, 0, r.B]] : [[-6, 0, r.A], [7, 0, r.B]];
          pts.forEach(function (p) { CH.atom(ctx, gx + p[0], gy + p[1], p[2] === "H" ? 6 : rad, p[2], c); });
        } else CH.atom(ctx, gx, gy, it === "A" && r.A === "H" ? 6 : rad, it === "A" ? r.A : r.B, c);
      });

      // Bars: before and after
      var bx = cx + fw / 2 + 24, bw = W - bx - 12;
      if (bw > 60) {
        var tot = Math.max(1, s.a + s.b), barH = 18;
        [["before", [[s.a, CH.ATOMS[r.A].color], [s.b, CH.ATOMS[r.B].color]]], ["after", [[q.product * f, c.path], [s.a - q.usedA * f, CH.ATOMS[r.A].color], [s.b - q.usedB * f, CH.ATOMS[r.B].color]]]].forEach(function (row, i) {
          var y = fy + 30 + i * 56, x = bx;
          ctx.fillStyle = c.ink; ctx.font = "600 11px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText(row[0], bx, y - 4);
          row[1].forEach(function (seg) { var w = bw * seg[0] / tot; if (w > 0.5) { ctx.fillStyle = seg[1]; ctx.fillRect(x, y, w, barH); ctx.strokeStyle = c.ink; ctx.lineWidth = 0.8; ctx.strokeRect(x, y, w, barH); x += w; } });
        });
        ctx.fillStyle = c.muted; ctx.font = "10px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("same total length", bx, fy + 30 + 56 + barH + 6);
      }
    };

    var showA = k.bindSlider("a", function () { return s.a; }, function (v) { s.a = v; reset(); }, function (v) { return v + " g"; });
    var showB = k.bindSlider("b", function () { return s.b; }, function (v) { s.b = v; reset(); }, function (v) { return v + " g"; });
    var showR = k.bindChips("rx", function () { return s.rx; }, function (v) { s.rx = v; s.a = RX[v].a; s.b = RX[v].b; configure(); showA(); showB(); reset(); });

    function reset() { clock.stop(); s.f = 0; k.btn("play").textContent = "React"; update(); }
    function play() { if (clock.running) return; s.f = 0; k.btn("play").textContent = "Reacting…"; clock.start(); }
    k.onAct({ play: play, reset: reset });
    configure(); showA(); showB(); update();

    return {
      set: function (o) { Object.assign(s, o); if (o.rx && o.a == null) { s.a = RX[o.rx].a; s.b = RX[o.rx].b; } configure(); showA(); showB(); showR(); reset(); },
      seek: function (f) { clock.stop(); s.f = Math.min(1, f); update(); },
      play: function () { reset(); play(); }
    };
  }

  window.ReactionSim = { mount: mount, solve: solve, RX: RX };
})();
