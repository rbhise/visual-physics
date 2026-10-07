/*
 * Kinetic and potential energy: drop a ball into sand from a height (potential energy),
 * or roll it into a sand bank at a speed (kinetic energy). The dent in the sand grows with the energy.
 * Model: sand stops the ball with a steady 1000 N force, so dent depth = energy ÷ 1000 N.
 * Needs sim-kit.js.  EnergySim.mount(el, { mode: "drop", m: 2, h: 3, v: 5 }) → { set, seek, play }
 */
(function () {
  "use strict";
  var K = window.SimKit, G = 9.8, SAND = 1000, SLOW = 0.6;

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "esim";
    var s = Object.assign({ mode: "drop", m: 2, h: 3, v: 5, t: 0, done: false }, opts);

    var k = K.frame(root, {
      aspect: "5 / 3.4",
      label: "A ball dropped into sand or rolled into a sand bank, with energy bars",
      panel: K.chips("mode", "Experiment", [["drop", "Drop from a height"], ["roll", "Roll at a speed"]]) +
        K.slider(id, "m", "Mass m", 0.5, 5, 0.5, "kg") +
        K.slider(id, "h", "Height h (drop)", 0.5, 5, 0.5, "m") +
        K.slider(id, "v", "Speed v (roll)", 1, 10, 1, "m/s") +
        K.hint("note") +
        K.buttons([["play", "Release"], ["reset", "Reset"]]),
      readouts: [["pe", "Potential energy mgh (J)", "c-path"], ["ke", "Kinetic energy ½mv² (J)", "c-vy"], ["spd", "Speed (m/s)"],
                 ["ht", "Height (m)"], ["dent", "Dent in sand (cm)", "c-vx"], ["tot", "Total (J)"]],
      cols: 3
    });

    function E0() { return s.mode === "drop" ? s.m * G * s.h : 0.5 * s.m * s.v * s.v; }
    function tHit() { return s.mode === "drop" ? Math.sqrt(2 * s.h / G) : 1.2; }
    function state() {
      var t = Math.min(s.t, tHit());
      if (s.mode === "drop") { var y = s.h - 0.5 * G * t * t, v = G * t; return { y: Math.max(0, y), v: v, x: 0 }; }
      return { y: 0, v: s.v, x: s.v * t };
    }

    var clock = K.clock(function (dt) {
      s.t += dt * SLOW;
      if (s.t >= tHit()) { s.t = tHit(); s.done = true; update(); return false; }
      update(); return true;
    });
    clock.onStop = function () { k.btn("play").textContent = "Release again"; };

    function update() {
      var st = state(), pe = s.m * G * st.y, ke = 0.5 * s.m * st.v * st.v;
      if (s.done) { pe = 0; ke = 0; }
      k.set("pe", K.fmt(pe));
      k.set("ke", K.fmt(ke));
      k.set("spd", s.done ? "0.0" : K.fmt(st.v));
      k.set("ht", K.fmt(st.y));
      k.set("dent", s.done ? K.fmt(E0() / SAND * 100) : "–");
      k.set("tot", s.done ? K.fmt(E0()) + " → sand" : K.fmt(pe + ke));
      k.el('[data-r="note"]').textContent = s.mode === "drop"
        ? "Raised ball: potential energy mgh = " + K.fmt(E0()) + " J. It turns into kinetic energy as the ball falls, then does work on the sand."
        : "Moving ball: kinetic energy ½mv² = " + K.fmt(E0()) + " J. Doubling the speed gives four times the energy.";
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var st = state(), r = 8 + 6 * Math.cbrt(s.m);
      var ground = H * 0.78, dent = s.done ? Math.min(60, E0() / SAND * 100 * 2) : 0;   // 2 px per cm
      if (s.mode === "drop") {
        var top = H * 0.08, ppm = (ground - top) / 5, cx = W * 0.4;
        // Height scale
        ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.font = "10px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        for (var m = 0; m <= 5; m++) { var yy = ground - m * ppm; ctx.beginPath(); ctx.moveTo(34, yy); ctx.lineTo(42, yy); ctx.stroke(); ctx.fillText(m + " m", 30, yy); }
        ctx.beginPath(); ctx.moveTo(42, ground); ctx.lineTo(42, top); ctx.stroke();
        // Sand tray
        ctx.fillStyle = c.tint; ctx.fillRect(cx - 80, ground, 160, H - ground - 6);
        ctx.strokeStyle = c.path; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 80, ground, 160, H - ground - 6);
        if (dent) { ctx.fillStyle = c.surface; ctx.beginPath(); ctx.ellipse(cx, ground, r + 6, Math.min(dent, H - ground - 10), 0, 0, Math.PI); ctx.fill(); }
        ctx.fillStyle = c.muted; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("sand", cx + 86, ground + 4);
        // Start height marker
        ctx.setLineDash([3, 3]); ctx.strokeStyle = c.muted;
        ctx.beginPath(); ctx.moveTo(42, ground - s.h * ppm); ctx.lineTo(cx - r - 6, ground - s.h * ppm); ctx.stroke(); ctx.setLineDash([]);
        var by = s.done ? ground + Math.min(dent, H - ground - 10) - r : ground - st.y * ppm - r;
        ctx.fillStyle = c.vy; ctx.beginPath(); ctx.arc(cx, by, r, 0, 7); ctx.fill();
      } else {
        var x0 = W * 0.08, wall = W * 0.66, ppm2 = (wall - x0) / (s.v * 1.2);
        ctx.fillStyle = c.bg; ctx.fillRect(0, ground, W, H - ground);
        ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(wall, ground); ctx.stroke();
        // Sand bank on the right
        ctx.fillStyle = c.tint; ctx.fillRect(wall, ground - 70, W * 0.3, 70 + (H - ground));
        ctx.strokeStyle = c.path; ctx.strokeRect(wall, ground - 70, W * 0.3, 70 + (H - ground));
        if (dent) { ctx.fillStyle = c.surface; ctx.beginPath(); ctx.ellipse(wall, ground - r, Math.min(dent, W * 0.28), r + 6, 0, -Math.PI / 2, Math.PI / 2); ctx.fill(); }
        ctx.fillStyle = c.muted; ctx.font = "10px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText("sand bank", wall + 6, ground - 74);
        var bx = s.done ? wall + Math.min(dent, W * 0.28) - r : x0 + st.x * ppm2;
        ctx.fillStyle = c.vy; ctx.beginPath(); ctx.arc(bx, ground - r, r, 0, 7); ctx.fill();
        if (!s.done) { K.arrow(ctx, bx, ground - 2 * r - 10, bx + 10 + s.v * 5, ground - 2 * r - 10, c.vy, 2.5); }
      }
      // Energy bars, top right
      var bx0 = W * 0.7, bw = W * 0.26, bh = 14, emax = Math.max(1, E0()), y0 = H * 0.08;
      var pe = s.done ? 0 : s.m * G * st.y, ke = s.done ? 0 : 0.5 * s.m * st.v * st.v;
      [["PE", pe, c.path], ["KE", ke, c.vy]].forEach(function (b, i) {
        var y = y0 + i * (bh + 10);
        ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(b[0], bx0 - 6, y + bh / 2);
        ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(bx0, y, bw, bh);
        ctx.fillStyle = b[2]; ctx.fillRect(bx0, y, bw * b[1] / emax, bh);
      });
    };

    var shows = {};
    ["m", "h", "v"].forEach(function (key) { shows[key] = k.bindSlider(key, function () { return s[key]; }, function (v) { s[key] = v; reset(); }); });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; reset(); });

    function reset() { clock.stop(); s.t = 0; s.done = false; k.btn("play").textContent = "Release"; update(); }
    function play() { if (clock.running) return; if (s.done) { s.t = 0; s.done = false; } k.btn("play").textContent = "Falling…"; if (s.mode === "roll") k.btn("play").textContent = "Rolling…"; clock.start(); }
    k.onAct({ play: play, reset: reset });
    update();

    return {
      set: function (o) { Object.assign(s, o); Object.keys(shows).forEach(function (q) { shows[q](); }); showM(); reset(); },
      seek: function (t) { clock.stop(); s.t = Math.min(t, tHit()); s.done = t >= tHit(); update(); },
      play: function () { reset(); play(); }
    };
  }

  window.EnergySim = { mount: mount };
})();
