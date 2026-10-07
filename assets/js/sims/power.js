/*
 * Power: two hoists lift loads through the same height, each taking its own time.
 * Work = mgh, power = work ÷ time.
 * Needs sim-kit.js.  PowerSim.mount(el, { h: 10, mA: 50, tA: 10, mB: 50, tB: 20 }) → { set, seek, play }
 */
(function () {
  "use strict";
  var K = window.SimKit, G = 9.8, SPEEDUP = 2;

  var PRESETS = {
    time:  { label: "Same load, different times", h: 10, mA: 50, tA: 10, mB: 50, tB: 20 },
    load:  { label: "Different loads, same time", h: 10, mA: 40, tA: 10, mB: 80, tB: 10 },
    equal: { label: "Equal power", h: 10, mA: 40, tA: 10, mB: 80, tB: 20 }
  };

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "psim";
    var s = Object.assign({ h: 10, mA: 50, tA: 10, mB: 50, tB: 20, t: 0 }, opts);

    var k = K.frame(root, {
      aspect: "5 / 3.4",
      label: "Two hoists lifting loads through the same height in different times",
      panel: K.chips("preset", "Compare", Object.keys(PRESETS).map(function (p) { return [p, PRESETS[p].label]; })) +
        K.slider(id, "h", "Height lifted h", 2, 20, 1, "m") +
        K.slider(id, "mA", "Hoist A: mass", 10, 100, 10, "kg") +
        K.slider(id, "tA", "Hoist A: time", 2, 20, 1, "s") +
        K.slider(id, "mB", "Hoist B: mass", 10, 100, 10, "kg") +
        K.slider(id, "tB", "Hoist B: time", 2, 20, 1, "s") +
        K.buttons([["play", "Lift"], ["reset", "Reset"]]),
      readouts: [["wA", "A: work mgh (J)", "c-path"], ["pA", "A: power (W)", "c-path"], ["more", "More powerful"],
                 ["wB", "B: work mgh (J)", "c-vy"], ["pB", "B: power (W)", "c-vy"], ["t", "Time (s)"]],
      cols: 3
    });

    function P(m, t) { return m * G * s.h / t; }
    var clock = K.clock(function (dt) { s.t += dt * SPEEDUP; var end = Math.max(s.tA, s.tB); if (s.t >= end) s.t = end; update(); return s.t < end; });
    clock.onStop = function () { k.btn("play").textContent = "Lift again"; };

    function presetKey() { for (var p in PRESETS) { var q = PRESETS[p]; if (q.h === s.h && q.mA === s.mA && q.tA === s.tA && q.mB === s.mB && q.tB === s.tB) return p; } return ""; }

    function update() {
      var pa = P(s.mA, s.tA), pb = P(s.mB, s.tB);
      k.set("wA", K.fmt(s.mA * G * s.h, 0)); k.set("wB", K.fmt(s.mB * G * s.h, 0));
      k.set("pA", K.fmt(pa, 0)); k.set("pB", K.fmt(pb, 0));
      k.set("more", Math.abs(pa - pb) < 0.5 ? "Equal" : pa > pb ? "A" : "B");
      k.set("t", K.fmt(s.t));
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var ground = H - 30, top = 34, ppm = (ground - top - 40) / 20;
      [["A", s.mA, s.tA, c.path, W * 0.28], ["B", s.mB, s.tB, c.vy, W * 0.68]].forEach(function (L) {
        var x = L[4], frac = Math.min(1, s.t / L[2]), y = ground - frac * s.h * ppm;
        var side = 22 + L[1] * 0.28;
        // Frame and pulley
        ctx.strokeStyle = c.line; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x - 50, ground); ctx.lineTo(x - 50, top); ctx.lineTo(x + 10, top); ctx.stroke();
        ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(x, top, 7, 0, 7); ctx.fill();
        ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, top + 7); ctx.lineTo(x, y - side); ctx.stroke();
        // Target height line
        ctx.strokeStyle = c.muted; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 46, ground - s.h * ppm); ctx.lineTo(x + 50, ground - s.h * ppm); ctx.stroke(); ctx.setLineDash([]);
        // Load
        ctx.fillStyle = L[3]; ctx.fillRect(x - side / 2, y - side, side, side);
        ctx.fillStyle = c.surface; ctx.font = "600 11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (side > 30) ctx.fillText(L[1] + " kg", x, y - side / 2);
        // Labels
        ctx.fillStyle = L[3]; ctx.font = "600 13px " + c.font; ctx.textBaseline = "bottom";
        ctx.fillText("Hoist " + L[0], x - 20, top - 12);
        ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textBaseline = "top";
        ctx.fillText(L[1] + " kg in " + L[2] + " s", x - 20, ground + 6);
        if (frac >= 1) { ctx.fillStyle = c.good; ctx.font = "600 11px " + c.font; ctx.textBaseline = "bottom"; ctx.fillText("done at " + L[2] + " s", x + 40, ground - s.h * ppm - 4); }
      });
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(W, ground); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
      ctx.fillText("h = " + s.h + " m", W - 8, ground - s.h * ppm - 4);
    };

    var shows = {};
    ["h", "mA", "tA", "mB", "tB"].forEach(function (key) { shows[key] = k.bindSlider(key, function () { return s[key]; }, function (v) { s[key] = v; reset(); }); });
    var showP = k.bindChips("preset", presetKey, function (p) { Object.assign(s, PRESETS[p]); Object.keys(shows).forEach(function (q) { shows[q](); }); reset(); });

    function reset() { clock.stop(); s.t = 0; k.btn("play").textContent = "Lift"; if (showP) showP(); update(); }
    function play() { clock.stop(); s.t = 0; k.btn("play").textContent = "Lifting…"; clock.start(); }
    k.onAct({ play: play, reset: reset });
    update();

    return {
      set: function (o) { Object.assign(s, o); Object.keys(shows).forEach(function (q) { shows[q](); }); reset(); },
      seek: function (t) { clock.stop(); s.t = t; update(); },
      play: play
    };
  }

  window.PowerSim = { mount: mount };
})();
