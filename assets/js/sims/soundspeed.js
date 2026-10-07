/*
 * Speed of sound, two views:
 *   race  – one tap at the left end sends sound along air, water and steel at the same moment.
 *   storm – lightning at a distance: the flash arrives almost at once, the thunder later.
 * Speed in air depends on temperature: v = 332 + 0.6 t (m/s, t in °C).
 * Needs sim-kit.js.  SoundSpeedSim.mount(el, { mode: "race", D: 1000, temp: 20 }) → { set, play, seek }
 */
(function () {
  "use strict";
  var K = window.SimKit;
  var MEDIA = [["Air", null], ["Water", 1500], ["Steel", 5000]];
  var LABELS = {
    race:  ["Speed in air", "Time through air", "Time through water", "Time through steel", "Distance", "Temperature"],
    storm: ["Speed in air", "Distance to the lightning", "Flash reaches you after", "Thunder reaches you after", "Gap you can count", "Temperature"]
  };

  function vAir(t) { return 332 + 0.6 * t; }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "ssim";
    var s = Object.assign({ mode: "race", D: 1000, temp: 20, d: 1360, time: 0, sweep: false }, opts);

    var k = K.frame(root, {
      aspect: window.matchMedia("(max-width: 600px)").matches ? "4 / 3.2" : "5 / 3",
      label: "Sound pulses racing through air, water and steel, or the flash and thunder from a lightning strike",
      panel: K.chips("mode", "Show", [["race", "Race through materials"], ["storm", "Lightning and thunder"]]) +
        K.slider(id, "temp", "Air temperature", -10, 45, 1, "°C") +
        '<div data-for="race">' + K.slider(id, "D", "Length of each track", 100, 2000, 10, "m") + '</div>' +
        '<div data-for="storm">' + K.slider(id, "d", "Distance to the lightning", 300, 5000, 10, "m") + '</div>' +
        K.buttons([["play", "Play"]]) + K.hint("note"),
      readouts: [["r1", "–", "c-path"], ["r2", "–"], ["r3", "–", "c-vy"], ["r4", "–", "c-vx"], ["r5", "–"], ["r6", "–"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");

    function update() {
      LABELS[s.mode].forEach(function (t, j) { spans[j].textContent = t; });
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for === s.mode ? "" : "none"; });
      var v = vAir(s.temp);
      k.set("r1", K.fmt(v, 1) + " m/s"); k.set("r6", String(s.temp).replace("-", "−") + " °C");
      if (s.mode === "race") {
        k.set("r2", K.fmt(s.D / v, 2) + " s"); k.set("r3", K.fmt(s.D / 1500, 3) + " s"); k.set("r4", K.fmt(s.D / 5000, 3) + " s"); k.set("r5", s.D + " m");
        k.el('[data-r="note"]').textContent = "Sound travels fastest in solids, slower in liquids and slowest in gases. Warm air carries sound faster than cold air: v = 332 + 0.6 × " + s.temp + " = " + K.fmt(v, 1) + " m/s.";
      } else {
        k.set("r2", s.d + " m"); k.set("r3", K.fmt(s.d / 3e8 * 1e6, 1) + " µs"); k.set("r4", K.fmt(s.d / v, 2) + " s"); k.set("r5", "≈ " + K.fmt(s.d / v, 1) + " s");
        k.el('[data-r="note"]').textContent = "Light travels at 3 × 10⁸ m/s, so the flash arrives almost at once. Count the seconds until the thunder and multiply by the speed of sound to find the distance.";
      }
      k.redraw();
    }

    function total() { return s.mode === "race" ? s.D / vAir(s.temp) : s.d / vAir(s.temp); }
    function scale() { return s.mode === "race" ? 4 / total() : Math.min(1, 6 / total()); }   // real seconds per second of animation

    k.draw = function (ctx, W, H, c) {
      var v = vAir(s.temp), narrow = W < 520;
      if (s.mode === "race") {
        var x0 = narrow ? 70 : 96, x1 = W - 20, lane = H / 3.4;
        ctx.font = "600 13px " + c.font; ctx.textBaseline = "middle";
        MEDIA.forEach(function (m, i) {
          var sp = m[1] || v, y = lane * (i + 0.7), done = s.time * sp >= s.D, x = x0 + Math.min(1, s.time * sp / s.D) * (x1 - x0);
          ctx.fillStyle = i === 0 ? c.tint : i === 1 ? "rgba(70,140,220,0.18)" : "rgba(120,130,140,0.28)";
          ctx.fillRect(x0, y - lane * 0.28, x1 - x0, lane * 0.56);
          ctx.fillStyle = c.ink; ctx.textAlign = "left"; ctx.fillText(m[0], 8, y - 8);
          ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.fillText(K.fmt(sp, 0) + " m/s", 8, y + 9); ctx.font = "600 13px " + c.font;
          // pulse: a few arcs behind the front
          if (s.time > 0) for (var a = 0; a < 3; a++) {
            var xa = x - a * 10; if (xa < x0) break;
            ctx.strokeStyle = i === 0 ? c.path : i === 1 ? c.vx : c.vy; ctx.globalAlpha = 1 - a * 0.3; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(xa - 10, y, lane * 0.22, -0.9, 0.9); ctx.stroke(); ctx.globalAlpha = 1;
          }
          if (done) { ctx.fillStyle = c.good; ctx.textAlign = "right"; ctx.fillText("arrived: " + K.fmt(s.D / sp, s.D / sp < 1 ? 3 : 2) + " s", x1 - 6, y - lane * 0.28 - 9); }
        });
        // hammer and ear
        ctx.fillStyle = c.ink; ctx.fillRect(x0 - 6, lane * 0.2, 6, lane * 2.8);
        ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText("time: " + K.fmt(s.time, s.time < 1 ? 3 : 2) + " s", x0, H - 18);
        ctx.textAlign = "right"; ctx.fillText(s.D + " m", x1, H - 18);
      } else {
        // storm: cloud at the left, listener at the right
        var gy = H * 0.82, xl = 60, xo = W - 50, f = Math.min(1, s.time * v / s.d), flash = s.time > 0 && s.time < 0.25;
        ctx.fillStyle = c.line; ctx.fillRect(0, gy, W, 3);
        ctx.fillStyle = c.muted;
        [[0, 0, 26], [24, -8, 22], [-22, 4, 18], [44, 6, 16]].forEach(function (q) { ctx.beginPath(); ctx.arc(xl + q[0], H * 0.18 + q[1], q[2], 0, Math.PI * 2); ctx.fill(); });
        ctx.strokeStyle = flash || s.time === 0 ? "#f2c230" : c.line; ctx.lineWidth = 4; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(xl + 4, H * 0.24); ctx.lineTo(xl - 10, H * 0.45); ctx.lineTo(xl + 8, H * 0.47); ctx.lineTo(xl - 6, gy); ctx.stroke();
        if (flash) { ctx.fillStyle = "rgba(242,194,48,0.18)"; ctx.fillRect(0, 0, W, H); }
        // listener
        ctx.strokeStyle = c.ink; ctx.lineWidth = 3; ctx.lineCap = "round";
        ctx.beginPath(); ctx.arc(xo, gy - 62, 9, 0, Math.PI * 2); ctx.moveTo(xo, gy - 53); ctx.lineTo(xo, gy - 22); ctx.lineTo(xo - 10, gy); ctx.moveTo(xo, gy - 22); ctx.lineTo(xo + 10, gy); ctx.stroke();
        // thunder front
        if (s.time > 0 && f < 1) {
          var R = f * (xo - xl);
          for (var a2 = 0; a2 < 3; a2++) { ctx.strokeStyle = c.vy; ctx.globalAlpha = 1 - a2 * 0.3; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(xl, gy, Math.max(1, R - a2 * 12), -Math.PI / 2, 0); ctx.stroke(); }
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = f >= 1 ? c.vy : c.muted; ctx.font = "700 14px " + c.font; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.fillText(f >= 1 ? "BOOM!" : "", xo + 20, gy - 80);
        ctx.fillStyle = c.ink; ctx.font = "600 13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(s.d + " m", (xl + xo) / 2, gy + 10);
        ctx.fillStyle = c.muted; ctx.font = "12px " + c.font; ctx.textAlign = "left";
        ctx.fillText("counting: " + K.fmt(Math.min(s.time, total()), 1) + " s", 10, gy + 10);
      }
    };

    var showT = k.bindSlider("temp", function () { return s.temp; }, function (v) { stop(); s.temp = v; s.time = 0; update(); }, function (v) { return String(v).replace("-", "−") + " °C"; });
    var showD = k.bindSlider("D", function () { return s.D; }, function (v) { stop(); s.D = v; s.time = 0; update(); });
    var showd = k.bindSlider("d", function () { return s.d; }, function (v) { stop(); s.d = v; s.time = 0; update(); });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { stop(); s.mode = v; s.time = 0; update(); });

    var clock = K.clock(function (dt) {
      var end = total();
      s.time = Math.min(end * 1.02, s.time + dt / scale());
      k.redraw(); return s.time < end * 1.02;
    });
    clock.onStop = function () { k.btn("play").textContent = "Play again"; };
    function stop() { if (clock.running) { clock.stop(); k.btn("play").textContent = "Play"; } }
    function play() { stop(); s.time = 1e-6; k.btn("play").textContent = "Playing…"; clock.start(); }
    k.onAct({ play: play });

    update();
    return {
      set: function (o) { stop(); Object.assign(s, o); s.time = 0; showT(); showD(); showd(); showM(); update(); },
      play: play,
      seek: function (t) { stop(); s.time = t; k.redraw(); }
    };
  }

  window.SoundSpeedSim = { mount: mount };
})();
