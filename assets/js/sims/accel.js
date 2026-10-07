/*
 * Acceleration: a car on a straight road with a velocity–time graph.
 * Needs sim-kit.js.  AccelSim.mount(el, { u: 2, a: 2 }) → { set, seek, play }
 */
(function () {
  "use strict";
  var K = window.SimKit, T = 8;

  var PRESETS = {
    pos:  { label: "Positive", u: 2, a: 2 },
    neg:  { label: "Negative", u: 16, a: -2 },
    zero: { label: "Zero", u: 8, a: 0 }
  };

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "asim";
    var s = { t: opts.t || 0, u: opts.u != null ? opts.u : 2, a: opts.a != null ? opts.a : 2 };

    var k = K.frame(root, {
      aspect: "5 / 3.6",
      label: "A car on a road with a mark every second, and a velocity–time graph",
      panel: K.chips("preset", "Acceleration", Object.keys(PRESETS).map(function (p) { return [p, PRESETS[p].label]; })) +
        K.slider(id, "u", "Starting velocity u", 0, 20, 1, "m/s") +
        K.slider(id, "a", "Acceleration a", -4, 4, 0.5, "m/s²") +
        K.hint("note") +
        K.buttons([["play", "Drive"], ["reset", "Reset"]]),
      readouts: [["t", "Time t (s)"], ["u", "u (m/s)"], ["v", "v (m/s)", "c-path"],
                 ["dv", "v − u (m/s)"], ["a", "(v − u) ÷ t (m/s²)", "c-vy"], ["x", "Distance (m)"]],
      cols: 3
    });

    function tStop() { return s.a < 0 ? s.u / -s.a : Infinity; }
    function v(t) { return s.a < 0 && t > tStop() ? 0 : s.u + s.a * t; }
    function x(t) { var tt = Math.min(t, tStop()); return s.u * tt + 0.5 * s.a * tt * tt; }

    var clock = K.clock(function (dt) { s.t = Math.min(T, s.t + dt); update(); return s.t < T; });
    clock.onStop = function () { k.btn("play").textContent = "Drive again"; };

    function presetKey() {
      for (var p in PRESETS) if (PRESETS[p].u === s.u && PRESETS[p].a === s.a) return p;
      return "";
    }

    function update() {
      var t = s.t;
      k.set("t", K.fmt(t));
      k.set("u", K.fmt(s.u));
      k.set("v", K.fmt(v(t)));
      k.set("dv", K.fmt(v(t) - s.u));
      k.set("a", t > 0 ? K.fmt((v(t) - s.u) / t, 2) : "–");
      k.set("x", K.fmt(x(t)));
      var note = s.a > 0 ? "Velocity increases by " + s.a + " m/s every second: positive acceleration."
        : s.a < 0 ? "Velocity decreases by " + (-s.a) + " m/s every second: negative acceleration (deceleration)."
        : "Velocity stays the same: zero acceleration.";
      if (s.a < 0 && t >= tStop()) note += " The car has stopped.";
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var top = Math.round(H * 0.32), padL = 40, padR = 20, y = top * 0.62;
      var mx = Math.max(40, x(T) * 1.05), sx = function (d) { return padL + (d / mx) * (W - padL - padR - 20); };
      // Road
      ctx.fillStyle = c.bg; ctx.fillRect(padL - 10, y - 14, W - padL - padR + 20, 28);
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(padL - 10, y - 14, W - padL - padR + 20, 28);
      // Marks at each second
      ctx.fillStyle = c.path;
      for (var i = 0; i <= Math.floor(s.t + 1e-9); i++) { ctx.beginPath(); ctx.arc(sx(x(i)), y + 10, 2.5, 0, 7); ctx.fill(); }
      // Car, velocity arrow (above) and acceleration arrow
      var cx = sx(x(s.t)), vv = v(s.t), scale = 3.2;
      ctx.fillStyle = c.ink;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx - 16, y - 9, 26, 14, 4); else ctx.rect(cx - 16, y - 9, 26, 14); ctx.fill();
      K.arrow(ctx, cx, y - 22, cx + vv * scale, y - 22, c.path, 3);
      ctx.font = "600 12px " + c.font; ctx.textBaseline = "bottom"; ctx.textAlign = "left"; ctx.fillStyle = c.path;
      if (vv > 0.05) ctx.fillText("v", cx + vv * scale + 4, y - 16);
      if (s.a !== 0 && vv > 0.05) {
        K.arrow(ctx, cx, y - 38, cx + s.a * 9, y - 38, c.vy, 3);
        ctx.fillStyle = c.vy; ctx.textAlign = s.a > 0 ? "left" : "right";
        ctx.fillText("a", cx + s.a * 9 + (s.a > 0 ? 4 : -4), y - 32);
      }
      ctx.font = "10px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("dots: position at each second", padL - 10, y + 18);

      // Velocity–time graph
      var vmax = Math.max(10, s.u + Math.max(0, s.a) * T) * 1.1;
      var g = K.graph(ctx, c, { x: 0, y: top + 6, w: W, h: H - top - 8 }, { xmax: T, ymax: vmax, title: "Velocity (m/s) against time (s)" });
      K.curve(ctx, g, v, 0, T, c.path, 1.2, [4, 4]);
      if (s.t > 0) K.curve(ctx, g, v, 0, s.t, c.path, 3);
      ctx.fillStyle = c.path; ctx.beginPath(); ctx.arc(g.X(s.t), g.Y(v(s.t)), 4.5, 0, 7); ctx.fill();
      // Rise over run for the first second, to show the meaning of a
      if (s.a !== 0) {
        var t1 = Math.min(1, tStop()), x0 = g.X(0), x1 = g.X(t1), y0 = g.Y(s.u), y1 = g.Y(v(t1));
        ctx.strokeStyle = c.vy; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
      }
    };

    var showU = k.bindSlider("u", function () { return s.u; }, function (val) { s.u = val; reset(); });
    var showA = k.bindSlider("a", function () { return s.a; }, function (val) { s.a = val; reset(); });
    var showP = k.bindChips("preset", presetKey, function (p) { s.u = PRESETS[p].u; s.a = PRESETS[p].a; showU(); showA(); reset(); });

    function reset() { clock.stop(); s.t = 0; k.btn("play").textContent = "Drive"; showP && showP(); update(); }
    function play() {
      if (clock.running) { clock.stop(); k.btn("play").textContent = "Resume"; return; }
      if (s.t >= T) s.t = 0;
      k.btn("play").textContent = "Pause";
      clock.start();
    }
    k.onAct({ play: play, reset: reset });
    update();

    return {
      set: function (o) { clock.stop(); Object.assign(s, o); if (!("t" in o)) s.t = 0; showU(); showA(); showP(); k.btn("play").textContent = "Drive"; update(); },
      seek: function (t) { clock.stop(); s.t = t; update(); },
      play: function () { s.t = 0; play(); }
    };
  }

  window.AccelSim = { mount: mount };
})();
