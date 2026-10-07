/*
 * Balanced and unbalanced forces on a crate sliding on smooth ice (no friction).
 * F1 pushes to the right, F2 pushes to the left. Net force = F1 − F2, a = F ÷ m.
 * Needs sim-kit.js.  ForceSim.mount(el, { F1: 40, F2: 0, m: 20, v0: 0 }) → { set, seek, play }
 */
(function () {
  "use strict";
  var K = window.SimKit, TMAX = 10;

  var PRESETS = {
    tug:    { label: "Tug of war", F1: 50, F2: 50, m: 20, v0: 0 },
    push:   { label: "Push from rest", F1: 40, F2: 0, m: 20, v0: 0 },
    glide:  { label: "Balanced while moving", F1: 30, F2: 30, m: 20, v0: 2 },
    oppose: { label: "Push against the motion", F1: 0, F2: 20, m: 20, v0: 3 }
  };

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "fsim";
    var s = { F1: 40, F2: 0, m: 20, v0: 0, t: 0, x: 0, v: 0 };
    Object.assign(s, opts); s.v = s.v0;

    var k = K.frame(root, {
      aspect: "5 / 3",
      label: "A crate on ice pushed by two forces, with force arrows",
      panel: K.chips("preset", "Try", Object.keys(PRESETS).map(function (p) { return [p, PRESETS[p].label]; })) +
        K.slider(id, "F1", "Push to the right F₁", 0, 100, 5, "N") +
        K.slider(id, "F2", "Push to the left F₂", 0, 100, 5, "N") +
        K.slider(id, "m", "Mass of crate m", 5, 50, 5, "kg") +
        K.slider(id, "v0", "Starting velocity", -3, 3, 1, "m/s") +
        K.hint("note") +
        K.buttons([["play", "Start"], ["reset", "Reset"]]),
      readouts: [["F", "Net force (N)", "c-vy"], ["a", "a = F ÷ m (m/s²)", "c-path"], ["v", "Velocity (m/s)", "c-vx"],
                 ["p", "Momentum mv (kg·m/s)"], ["t", "Time (s)"], ["x", "Position (m)"]],
      cols: 3
    });

    function net() { return s.F1 - s.F2; }
    function acc() { return net() / s.m; }

    var clock = K.clock(function (dt) {
      s.t += dt; s.v += acc() * dt; s.x += s.v * dt;
      update();
      return s.t < TMAX;
    });
    clock.onStop = function () { k.btn("play").textContent = "Start again"; };

    function presetKey() { for (var p in PRESETS) { var q = PRESETS[p]; if (q.F1 === s.F1 && q.F2 === s.F2 && q.m === s.m && q.v0 === s.v0) return p; } return ""; }

    function update() {
      var F = net();
      k.set("F", F === 0 ? "0 (balanced)" : Math.abs(F) + (F > 0 ? " →" : " ←"));
      k.set("a", K.fmt(acc(), 2));
      k.set("v", K.fmt(s.v, 2));
      k.set("p", K.fmt(s.m * s.v, 1));
      k.set("t", K.fmt(s.t));
      k.set("x", K.fmt(s.x));
      k.el('[data-r="note"]').textContent = F === 0
        ? (Math.abs(s.v0) > 0 ? "Balanced forces: the crate keeps moving at the same velocity (first law)." : "Balanced forces: the crate stays at rest (first law).")
        : "Unbalanced force of " + Math.abs(F) + " N: the velocity changes by " + K.fmt(Math.abs(acc()), 2) + " m/s every second (second law).";
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var floorY = H * 0.68, ppm = W / (W < 520 ? 8 : 14);   // pixels per metre; the view follows the crate
      var cx = W / 2;
      // Floor with markers every metre, scrolling as the crate moves
      ctx.fillStyle = c.bg; ctx.fillRect(0, floorY, W, H - floorY);
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(W, floorY); ctx.stroke();
      ctx.font = "10px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "center"; ctx.textBaseline = "top";
      var first = Math.floor(s.x - 8), last = Math.ceil(s.x + 8);
      for (var m = first; m <= last; m++) {
        var px = cx + (m - s.x) * ppm;
        ctx.strokeStyle = c.line; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, floorY); ctx.lineTo(px, floorY + (m % 5 === 0 ? 12 : 6)); ctx.stroke();
        if (m % 5 === 0) ctx.fillText(m + " m", px, floorY + 15);
      }
      ctx.fillStyle = c.muted; ctx.textAlign = "left"; ctx.fillText("smooth ice: no friction", 10, floorY + 34);

      // Crate: size grows with mass
      var side = (0.9 + s.m / 50 * 0.9) * ppm, top = floorY - side;
      ctx.fillStyle = c.tint; ctx.strokeStyle = c.path; ctx.lineWidth = 2;
      ctx.fillRect(cx - side / 2, top, side, side); ctx.strokeRect(cx - side / 2, top, side, side);
      ctx.fillStyle = c.ink; ctx.font = "600 13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(s.m + " kg", cx, top + side / 2);

      // Force arrows (length ∝ force), drawn at the crate's middle height
      var fy = top + side / 2, fk = Math.min(1.4, W / 650);
      if (s.F1 > 0) { K.arrow(ctx, cx - side / 2 - 8 - s.F1 * fk, fy, cx - side / 2 - 6, fy, c.vy, 4); label("F₁ = " + s.F1 + " N", cx - side / 2 - 8, fy - 18, "right"); }
      if (s.F2 > 0) { K.arrow(ctx, cx + side / 2 + 8 + s.F2 * fk, fy, cx + side / 2 + 6, fy, c.vy, 4); label("F₂ = " + s.F2 + " N", cx + side / 2 + 8, fy - 18, "left"); }
      // Net force above the crate, velocity below the title
      var F = net();
      if (F !== 0) { K.arrow(ctx, cx, top - 26, cx + F * fk, top - 26, c.ink, 3); label("net " + Math.abs(F) + " N", cx + F * fk / 2, top - 40); }
      else { ctx.fillStyle = c.ink; ctx.font = "600 12px " + c.font; ctx.textAlign = "center"; ctx.fillText("net force = 0", cx, top - 30); }
      if (Math.abs(s.v) > 0.01) { K.arrow(ctx, cx, H * 0.1, cx + s.v * 22, H * 0.1, c.vx, 3); ctx.fillStyle = c.vx; ctx.font = "600 12px " + c.font; ctx.textAlign = s.v > 0 ? "left" : "right"; ctx.fillText("v = " + K.fmt(Math.abs(s.v), 1) + " m/s", cx + s.v * 22 + (s.v > 0 ? 8 : -8), H * 0.1); }

      function label(t, x, y, align) { ctx.fillStyle = c.vy; ctx.font = "600 12px " + c.font; ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); }
    };

    var shows = {};
    ["F1", "F2", "m", "v0"].forEach(function (key) {
      shows[key] = k.bindSlider(key, function () { return s[key]; }, function (val) { s[key] = val; reset(); });
    });
    var showP = k.bindChips("preset", presetKey, function (p) { Object.assign(s, PRESETS[p]); Object.keys(shows).forEach(function (q) { shows[q](); }); reset(); });

    function reset() { clock.stop(); s.t = 0; s.x = 0; s.v = s.v0; k.btn("play").textContent = "Start"; if (showP) showP(); update(); }
    function play() {
      if (clock.running) { clock.stop(); k.btn("play").textContent = "Resume"; return; }
      if (s.t >= TMAX) reset();
      k.btn("play").textContent = "Pause";
      clock.start();
    }
    k.onAct({ play: play, reset: reset });
    update();

    return {
      set: function (o) { Object.assign(s, o); Object.keys(shows).forEach(function (q) { shows[q](); }); reset(); },
      seek: function (t) { clock.stop(); s.t = t; s.v = s.v0 + acc() * t; s.x = s.v0 * t + 0.5 * acc() * t * t; update(); },
      play: function () { reset(); play(); }
    };
  }

  window.ForceSim = { mount: mount };
})();
