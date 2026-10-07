/*
 * Echo: a clap travels to a wall and back. The timeline below shows the clap and the echo; the
 * shaded band is the 0.1 s that a sound lingers in our ears. If the echo arrives inside that band
 * it merges with the original sound and no separate echo is heard.
 * Echo time t = 2d ÷ v; speed in air v = 332 + 0.6 × temperature.
 * Needs sim-kit.js.  EchoSim.mount(el, { d: 34, temp: 20 }) → { set, play, seek }
 */
(function () {
  "use strict";
  var K = window.SimKit;

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "esim";
    var s = Object.assign({ d: 34, temp: 20, soft: false, time: 0, v: null }, opts);

    var k = K.frame(root, {
      aspect: window.matchMedia("(max-width: 600px)").matches ? "4 / 3.2" : "5 / 3",
      label: "A person clapping in front of a wall, the sound travelling to the wall and back, and a timeline of the clap and its echo",
      panel: K.slider(id, "d", "Distance to the wall d", 5, 200, 0.5, "m") +
        K.slider(id, "temp", "Air temperature", 0, 45, 1, "°C") +
        '<div>' + K.check(id, "soft", "Cover the wall with thick curtains", s.soft) + '</div>' +
        K.buttons([["play", "Clap"]]) + K.hint("note"),
      readouts: [["v", "Speed of sound v", "c-path"], ["path", "Distance travelled 2d"], ["t", "Echo time t = 2d ÷ v", "c-vy"],
                 ["hear", "Separate echo?", "wrap"], ["min", "Shortest distance for an echo"], ["loud", "Echo strength"]],
      cols: 3
    });

    function v() { return s.v || 332 + 0.6 * s.temp; }
    function te() { return 2 * s.d / v(); }
    function update() {
      var t = te(), minD = v() * 0.1 / 2, ok = t >= 0.1 - 1e-9;
      k.set("v", K.fmt(v(), 1) + " m/s"); k.set("path", K.fmt(2 * s.d, 1) + " m"); k.set("t", K.fmt(t, 3) + " s");
      k.set("hear", s.soft ? "Hardly: absorbed" : ok ? "Yes, distinct echo" : "No, it merges"); k.set("min", K.fmt(minD, 1) + " m");
      k.set("loud", s.soft ? "Very weak" : "Strong");
      k.el('[data-r="note"]').textContent = s.soft
        ? "Soft, porous materials absorb sound instead of reflecting it. Halls use curtains, carpets and padded seats to cut down echoes and reverberation."
        : ok ? "The echo comes back " + K.fmt(t, 2) + " s after the clap, later than the 0.1 s the clap lingers in your ears, so you hear it separately."
             : "The echo returns in only " + K.fmt(t, 3) + " s, while you can still 'hear' the clap. The two merge; the sound just seems longer. This is reverberation.";
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var narrow = W < 520, gy = H * 0.52, xp = narrow ? 34 : 50, xw = W - (narrow ? 26 : 40);
      var t = te(), f = s.time / (t / 2);   // f in [0,1] going out, [1,2] coming back
      // ground, wall
      ctx.fillStyle = c.line; ctx.fillRect(0, gy, W, 3);
      ctx.fillStyle = s.soft ? c.vy : c.ink; ctx.globalAlpha = s.soft ? 0.5 : 1; ctx.fillRect(xw, H * 0.08, 14, gy - H * 0.08); ctx.globalAlpha = 1;
      if (s.soft) { ctx.strokeStyle = c.vy; ctx.lineWidth = 2; for (var yy = H * 0.1; yy < gy; yy += 12) { ctx.beginPath(); ctx.moveTo(xw - 4, yy); ctx.quadraticCurveTo(xw - 10, yy + 6, xw - 4, yy + 12); ctx.stroke(); } }
      // person
      ctx.strokeStyle = c.ink; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(xp, gy - 66, 9, 0, Math.PI * 2); ctx.moveTo(xp, gy - 57); ctx.lineTo(xp, gy - 24); ctx.lineTo(xp - 10, gy); ctx.moveTo(xp, gy - 24); ctx.lineTo(xp + 10, gy);
      ctx.moveTo(xp, gy - 48); ctx.lineTo(xp + 16, gy - 54); ctx.stroke();
      // distance label
      ctx.fillStyle = c.muted; ctx.font = "12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("d = " + K.fmt(s.d, 1) + " m", (xp + xw) / 2, gy + 6);
      // sound fronts
      var cy = gy - 50, span = xw - xp - 16;
      if (s.time > 0 && f <= 2.02) {
        var outR = Math.min(f, 1) * span, col = c.path;
        if (f < 1) for (var a = 0; a < 3; a++) { ctx.strokeStyle = col; ctx.globalAlpha = 1 - a * 0.3; ctx.lineWidth = 3; ctx.beginPath(); var ro = Math.max(1, outR - a * 9), ao = Math.min(0.6, 46 / ro); ctx.arc(xp + 16, cy, ro, -ao, ao); ctx.stroke(); }
        if (f >= 1) {
          var back = (f - 1) * span;
          for (a = 0; a < 3; a++) { ctx.strokeStyle = c.vy; ctx.globalAlpha = (s.soft ? 0.25 : 1) * (1 - a * 0.3); ctx.lineWidth = 3; ctx.beginPath(); var rb = Math.max(1, back - a * 9 + 1), ab = Math.min(0.6, 46 / rb); ctx.arc(xw, cy, rb, Math.PI - ab, Math.PI + ab); ctx.stroke(); }
        }
        ctx.globalAlpha = 1;
      }

      // timeline
      var tx0 = narrow ? 26 : 30, tx1 = W - (narrow ? 26 : 30), ty = H * 0.8, tmax = Math.max(0.3, t * 1.25), X = function (q) { return tx0 + q / tmax * (tx1 - tx0); };
      ctx.fillStyle = c.tint; ctx.fillRect(X(0), ty - 22, X(0.1) - X(0), 44);
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx0, ty); ctx.lineTo(tx1, ty); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText("0.1 s: the clap lingers", X(0) + 3, ty - 24);
      var step = K.niceStep(tmax, 5); ctx.textBaseline = "top"; ctx.textAlign = "center";
      for (var q = 0; q <= tmax + 1e-9; q += step) { ctx.beginPath(); ctx.moveTo(X(q), ty - 3); ctx.lineTo(X(q), ty + 3); ctx.stroke(); ctx.fillText(K.fmt(q, step < 0.1 ? 2 : 1) + " s", X(q), ty + 34); }
      function blip(at, col, h, lab, alpha) {
        ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath();
        for (var i = -12; i <= 12; i++) { var x = X(at) + i * 0.9, y = ty - Math.sin(i * 1.4) * h * Math.exp(-i * i / 50); i === -12 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = col; ctx.font = "600 11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(lab, X(at) + (lab === "echo" ? 0 : 0), ty + h + 3);
      }
      blip(0.01, c.path, 18, "clap", 1);
      if (s.time >= t || s.time === 0) blip(t, c.vy, s.soft ? 5 : 13, "echo", s.time === 0 ? 0.35 : 1);
      // moving cursor
      if (s.time > 0) { ctx.strokeStyle = c.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(Math.min(s.time, tmax)), ty - 22); ctx.lineTo(X(Math.min(s.time, tmax)), ty + 22); ctx.stroke(); }
    };

    var showD = k.bindSlider("d", function () { return s.d; }, function (x) { stop(); s.d = x; s.time = 0; update(); }, function (x) { return (+x).toFixed(1) + " m"; });
    var showT = k.bindSlider("temp", function () { return s.temp; }, function (x) { stop(); s.temp = x; s.v = null; s.time = 0; update(); }, function (x) { return x + " °C"; });
    var soft = k.bindCheck("soft", function (on) { s.soft = on; update(); });

    // animation: slowed so the trip always takes about 2.5 s on screen
    var clock = K.clock(function (dt) { var t = te(); s.time = Math.min(t * 1.15, s.time + dt * t / 2.5); k.redraw(); return s.time < t * 1.15; });
    clock.onStop = function () { k.btn("play").textContent = "Clap again"; };
    function stop() { if (clock.running) clock.stop(); k.btn("play").textContent = "Clap"; }
    function play() { stop(); s.time = 1e-6; k.btn("play").textContent = "…"; clock.start(); }
    k.onAct({ play: play });

    update();
    return {
      set: function (o) { stop(); Object.assign(s, o); if (!("v" in o)) s.v = null; s.time = 0; showD(); showT(); soft.checked = s.soft; update(); },
      play: play,
      seek: function (t) { stop(); s.time = t; k.redraw(); }
    };
  }

  window.EchoSim = { mount: mount };
})();
