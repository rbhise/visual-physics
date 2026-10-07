/*
 * Electric current and potential difference.
 * Circuit mode: cells, a switch, a bulb and an ammeter. Electrons drift from − to + through the wires;
 * conventional current is drawn the other way. Charge passed is counted: I = Q ÷ t.
 * Water mode: two tanks joined by a pipe. A level difference drives a flow, like a potential difference drives a current.
 * Needs sim-kit.js and circuit-kit.js.  CurrentSim.mount(el, { mode: "circuit", cells: 2 }) → { set, seek, play }
 */
(function () {
  "use strict";
  var K = window.SimKit, CK = window.CircuitKit, R_BULB = 6, E = 1.6e-19;

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "isim";
    var s = Object.assign({ mode: "circuit", cells: 2, closed: true, electrons: true, conventional: true, pump: true, t: 0, Q: 0, W: 0, off: 0, hA: 0.8, hB: 0.3 }, opts);

    var k = K.frame(root, {
      aspect: "5 / 3.4",
      label: "A circuit with cells, a switch and a bulb, showing moving electrons, or two water tanks joined by a pipe",
      panel: K.chips("mode", "View", [["circuit", "Circuit"], ["water", "Water analogy"]]) +
        K.slider(id, "cells", "Number of cells (1.5 V each)", 1, 4, 1, "") +
        '<div class="checks">' + K.check(id, "closed", "Switch closed", true) + K.check(id, "electrons", "Show electrons", true) +
        K.check(id, "conventional", "Show conventional current", true) + K.check(id, "pump", "Pump on (water view)", true) + '</div>' +
        K.hint("note") +
        K.buttons([["play", "Start the clock"], ["reset", "Reset"]]),
      readouts: [["V", "Potential difference (V)", "c-path"], ["I", "Current (A)", "c-vy"], ["t", "Time t (s)"],
                 ["Q", "Charge passed Q (C)", "c-vx"], ["qt", "Q ÷ t (A)"], ["n", "Electrons passed"]],
      cols: 3
    });

    function V() { return 1.5 * s.cells; }
    function I() { return s.mode === "circuit" ? (s.closed ? V() / R_BULB : 0) : 0; }

    var clock = K.clock(function (dt) {
      s.t += dt; s.Q += I() * dt; s.off += dt * I() * 60;
      if (s.mode === "water") {
        var flow = 0.6 * (s.hA - s.hB);              // flow from A to B, proportional to the level difference
        s.hA -= flow * dt; s.hB += flow * dt;
        if (s.pump) { var target = 0.25 + 0.15 * s.cells, back = 1.2 * Math.max(0, target - (s.hA - s.hB)); s.hA += back * dt; s.hB -= back * dt; }
        s.hA = Math.max(0.05, Math.min(0.98, s.hA)); s.hB = Math.max(0.05, Math.min(0.98, s.hB));
        s.off += dt * flow * 400; s.W += flow * 10 * dt;
      }
      update(); return true;
    });

    var LABELS = {
      circuit: ["Potential difference (V)", "Current (A)", "Time t (s)", "Charge passed Q (C)", "Q ÷ t (A)", "Electrons passed"],
      water: ["Level difference (m)", "Flow (L/s)", "Time t (s)", "Water moved (L)", "Water ÷ time (L/s)", "Pump"]
    };
    function relabel() { root.querySelectorAll(".sim-readout span").forEach(function (sp, j) { sp.textContent = LABELS[s.mode][j]; }); }

    function update() {
      var i = I();
      relabel();
      if (s.mode === "circuit") {
        k.set("V", K.fmt(V(), 1)); k.set("I", K.fmt(i, 2)); k.set("t", K.fmt(s.t)); k.set("Q", K.fmt(s.Q, 2));
        k.set("qt", s.t > 0 ? K.fmt(s.Q / s.t, 2) : "–");
        var n = s.Q / E, e = n > 0 ? Math.floor(Math.log10(n)) : 0;
        k.set("n", n > 0 ? (n / Math.pow(10, e)).toFixed(2) + " × 10" + String(e).replace(/\d/g, function (q) { return "⁰¹²³⁴⁵⁶⁷⁸⁹"[q]; }) : "0");
        k.el('[data-r="note"]').textContent = !s.closed ? "The switch is open: the circuit is broken, so no current flows and the bulb is off."
          : s.cells + (s.cells > 1 ? " cells give " : " cell gives ") + K.fmt(V(), 1) + " V. Electrons drift from the − terminal round to the + terminal; conventional current is taken the opposite way, from + to −.";
      } else {
        var d = s.hA - s.hB;
        k.set("V", K.fmt(d * 2, 2)); k.set("I", K.fmt(Math.max(0, d) * 6, 2)); k.set("t", K.fmt(s.t));
        k.set("Q", K.fmt(s.W, 1)); k.set("qt", s.t > 0 ? K.fmt(s.W / s.t, 2) : "–"); k.set("n", s.pump ? "On" : "Off");
        k.el('[data-r="note"]').textContent = s.pump
          ? "The pump keeps tank A higher than tank B, so water keeps flowing, just as a cell keeps a potential difference so current keeps flowing."
          : "With the pump off, the levels become equal and the flow stops. No level difference, no flow: no potential difference, no current.";
      }
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      if (s.mode === "water") return drawWater(ctx, W, H, c);
      var x1 = W * 0.16, x2 = W * 0.84, y1 = H * 0.16, y2 = H * 0.8, bx = x1, by = (y1 + y2) / 2;
      var bat = CK.battery(ctx, bx, by, s.cells, c);
      var on = s.closed;
      // Conventional path: from + (top of battery) clockwise back to − (bottom of battery)
      var loop = CK.path([[bx, bat.top], [x1, y1], [x2, y1], [x2, y2], [x1, y2], [bx, bat.bottom]]);
      CK.wire(ctx, [[bx, bat.top], [x1, y1], [(x1 + x2) / 2 - 22, y1]], c.ink, 2);
      CK.wire(ctx, [[(x1 + x2) / 2 + 22, y1], [x2, y1], [x2, by - 18]], c.ink, 2);
      CK.wire(ctx, [[x2, by + 18], [x2, y2], [x1, y2], [bx, bat.bottom]], c.ink, 2);
      CK.key(ctx, (x1 + x2) / 2 - 22, y1, (x1 + x2) / 2 + 22, y1, on, c);
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText("switch", (x1 + x2) / 2, y1 - 12);
      CK.bulb(ctx, x2, by, 16, on ? Math.min(1, I() / 1) : 0, c);
      CK.meter(ctx, (x1 + x2) / 2, y2, "A", K.fmt(I(), 2) + " A", c, c.vy);
      // Electrons (against the conventional direction) and conventional current arrows
      if (on && s.electrons) CK.dots(ctx, loop, -s.off, 22, c.vx, 3);
      if (on && s.conventional) CK.chevrons(ctx, loop, s.off * 0.5 + 11, 66, c.vy);
      ctx.font = "11px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
      var narrow = W < 520;
      if (s.electrons) { ctx.fillStyle = c.vx; ctx.fillText(narrow ? "● electrons" : "● electrons (− to +)", 8, H - 18); }
      if (s.conventional) { ctx.fillStyle = c.vy; ctx.fillText(narrow ? "▶ conventional current" : "▶ conventional current (+ to −)", W * 0.45, H - 18); }
      ctx.fillStyle = c.ink; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.font = "600 12px " + c.font;
      ctx.fillText(K.fmt(V(), 1) + " V", bx + 30, by);
    };

    function drawWater(ctx, W, H, c) {
      var base = H * 0.86, tankH = H * 0.6, tw = W * 0.2;
      var ax = W * 0.12, bxx = W * 0.62;
      [[ax, s.hA, "A"], [bxx, s.hB, "B"]].forEach(function (t) {
        ctx.fillStyle = c.tint; ctx.fillRect(t[0], base - tankH * t[1], tw, tankH * t[1]);
        ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(t[0], base - tankH); ctx.lineTo(t[0], base); ctx.lineTo(t[0] + tw, base); ctx.lineTo(t[0] + tw, base - tankH); ctx.stroke();
        ctx.fillStyle = c.path; ctx.fillRect(t[0], base - tankH * t[1] - 2, tw, 3);
        ctx.fillStyle = c.ink; ctx.font = "600 13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("Tank " + t[2], t[0] + tw / 2, base + 6);
      });
      // Bottom pipe with moving water
      var py = base - 10, pipe = CK.path([[ax + tw, py], [bxx, py]]);
      ctx.strokeStyle = c.line; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(ax + tw, py); ctx.lineTo(bxx, py); ctx.stroke();
      if (s.hA - s.hB > 0.01) CK.dots(ctx, pipe, s.off, 18, c.path, 3);
      // Pump returning water from B to A over the top
      var ty = base - tankH - 22;
      CK.wire(ctx, [[bxx + tw / 2, base - tankH + 4], [bxx + tw / 2, ty], [ax + tw / 2, ty], [ax + tw / 2, base - tankH + 4]], s.pump ? c.vx : c.line, 3);
      ctx.fillStyle = s.pump ? c.vx : c.muted; ctx.beginPath(); ctx.arc((ax + bxx + tw) / 2, ty, 13, 0, 7); ctx.fill();
      ctx.fillStyle = c.surface; ctx.font = "700 10px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("P", (ax + bxx + tw) / 2, ty);
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textBaseline = "bottom"; ctx.fillText(s.pump ? "pump on (like a cell)" : "pump off", (ax + bxx + tw) / 2, ty - 16);
      // Level difference marker
      var yA = base - tankH * s.hA, yB = base - tankH * s.hB, mx = W * 0.9;
      ctx.strokeStyle = c.vy; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ax + tw, yA); ctx.lineTo(mx, yA); ctx.moveTo(bxx + tw, yB); ctx.lineTo(mx, yB); ctx.stroke(); ctx.setLineDash([]);
      if (Math.abs(yA - yB) > 6) K.arrow(ctx, mx, yB, mx, yA, c.vy, 2, 8);
      ctx.fillStyle = c.vy; ctx.font = "600 11px " + c.font; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText("level difference", mx + 4, Math.min(yA, yB) - 6);
    }

    var showCells = k.bindSlider("cells", function () { return s.cells; }, function (v) { s.cells = v; update(); }, function (v) { return v + " (" + (1.5 * v).toFixed(1) + " V)"; });
    k.bindCheck("closed", function (on) { s.closed = on; update(); });
    k.bindCheck("electrons", function (on) { s.electrons = on; k.redraw(); });
    k.bindCheck("conventional", function (on) { s.conventional = on; k.redraw(); });
    k.bindCheck("pump", function (on) { s.pump = on; update(); });
    var showMode = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; reset(); });

    function reset() { s.t = 0; s.Q = 0; s.W = 0; s.hA = 0.8; s.hB = 0.3; update(); }
    function play() {
      if (clock.running) { clock.stop(); k.btn("play").textContent = "Start the clock"; return; }
      k.btn("play").textContent = "Stop the clock"; clock.start();
    }
    k.onAct({ play: play, reset: reset });
    update();

    return {
      set: function (o) {
        Object.assign(s, o); showCells(); showMode();
        ["closed", "electrons", "conventional", "pump"].forEach(function (q) { var inp = root.querySelector('[data-check="' + q + '"]'); if (inp) inp.checked = !!s[q]; });
        reset();
      },
      seek: function (t) { clock.stop(); reset(); var n = Math.round(t / 0.02); for (var i = 0; i < n; i++) { s.t += 0.02; s.Q += I() * 0.02; s.off += 0.02 * I() * 60; if (s.mode === "water") { var f = 0.6 * (s.hA - s.hB); s.hA -= f * 0.02; s.hB += f * 0.02; if (s.pump) { var tg = 0.25 + 0.15 * s.cells, bk = 1.2 * Math.max(0, tg - (s.hA - s.hB)); s.hA += bk * 0.02; s.hB -= bk * 0.02; } s.off += 0.02 * f * 400; s.W += f * 10 * 0.02; } } update(); },
      play: function () { reset(); if (!clock.running) play(); }
    };
  }

  window.CurrentSim = { mount: mount };
})();
