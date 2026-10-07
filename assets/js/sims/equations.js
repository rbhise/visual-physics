/*
 * Equations of motion by the graphical method: the area under a velocity–time graph
 * splits into a rectangle and a triangle, which gives s = ut + ½at².
 * Needs sim-kit.js.  EquationSim.mount(el, { u: 4, a: 2, tEnd: 6 }) → { set, seek, play }
 */
(function () {
  "use strict";
  var K = window.SimKit;

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "esim";
    var s = { u: opts.u != null ? opts.u : 4, a: opts.a != null ? opts.a : 2, tEnd: opts.tEnd || 6, t: 0 };
    s.t = opts.t != null ? opts.t : s.tEnd;

    var k = K.frame(root, {
      aspect: "5 / 3.8",
      label: "Velocity–time graph with the area under it split into a rectangle and a triangle",
      panel: K.slider(id, "u", "Initial velocity u", 0, 20, 1, "m/s") +
        K.slider(id, "a", "Acceleration a", -3, 5, 0.5, "m/s²") +
        K.slider(id, "tEnd", "Time t", 1, 10, 0.5, "s") +
        K.hint("note") +
        K.buttons([["play", "Play"], ["reset", "Reset"]]),
      readouts: [["t", "t (s)"], ["v", "v = u + at (m/s)", "c-vx"], ["s", "s = ut + ½at² (m)", "c-path"],
                 ["v2", "v² (m²/s²)"], ["rhs", "u² + 2as (m²/s²)"], ["avg", "Average velocity (m/s)"]],
      cols: 3
    });

    function maxT() { return s.a < 0 ? Math.min(s.tEnd, s.u / -s.a) : s.tEnd; }
    function v(t) { return s.u + s.a * t; }
    function d(t) { return s.u * t + 0.5 * s.a * t * t; }

    var clock = K.clock(function (dt) { s.t = Math.min(maxT(), s.t + dt * 1.5); update(); return s.t < maxT(); });
    clock.onStop = function () { k.btn("play").textContent = "Play again"; };

    function update() {
      var t = s.t, vv = v(t), ss = d(t);
      k.set("t", K.fmt(t));
      k.set("v", K.fmt(vv));
      k.set("s", K.fmt(ss));
      k.set("v2", K.fmt(vv * vv));
      k.set("rhs", K.fmt(s.u * s.u + 2 * s.a * ss));
      k.set("avg", t > 0 ? K.fmt(ss / t) : "–");
      var note = s.a >= 0
        ? "Area = rectangle (u × t = " + K.fmt(s.u * t) + " m) + triangle (½ × a × t² = " + K.fmt(0.5 * s.a * t * t) + " m)."
        : "Area = rectangle (v × t = " + K.fmt(vv * t) + " m) + triangle (½ × (u − v) × t = " + K.fmt(0.5 * (s.u - vv) * t) + " m).";
      if (s.a < 0 && s.tEnd > s.u / -s.a) note += " The object stops at t = " + K.fmt(s.u / -s.a) + " s.";
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var vmax = Math.max(6, s.u, v(s.tEnd)) * 1.15;
      var g = K.graph(ctx, c, { x: 0, y: 0, w: W, h: H }, { xmax: 10, ymax: vmax, title: "Velocity (m/s) against time (s)" });
      var t = s.t, vv = v(t), low = Math.min(s.u, vv), high = Math.max(s.u, vv);
      if (t > 0) {
        // Rectangle under the lower velocity, triangle between u and v
        ctx.save(); ctx.globalAlpha = 0.25;
        ctx.fillStyle = c.vx; ctx.fillRect(g.X(0), g.Y(low), g.X(t) - g.X(0), g.Y(0) - g.Y(low));
        ctx.fillStyle = c.path; ctx.beginPath();
        if (s.a >= 0) { ctx.moveTo(g.X(0), g.Y(s.u)); ctx.lineTo(g.X(t), g.Y(vv)); ctx.lineTo(g.X(t), g.Y(s.u)); }
        else { ctx.moveTo(g.X(0), g.Y(s.u)); ctx.lineTo(g.X(t), g.Y(vv)); ctx.lineTo(g.X(0), g.Y(vv)); }
        ctx.closePath(); ctx.fill(); ctx.restore();
        // Labels inside the shapes
        ctx.font = "600 12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (g.Y(0) - g.Y(low) > 18) { ctx.fillStyle = c.vx; ctx.fillText(s.a >= 0 ? "u × t" : "v × t", (g.X(0) + g.X(t)) / 2, (g.Y(0) + g.Y(low)) / 2); }
        if (g.Y(low) - g.Y(high) > 22) {
          ctx.fillStyle = c.path;
          ctx.fillText(s.a >= 0 ? "½ a t²" : "½ (u − v) t", g.X(s.a >= 0 ? t * 0.66 : t * 0.33), (g.Y(low) * 2 + g.Y(high)) / 3);
        }
      }
      K.curve(ctx, g, v, 0, maxT(), c.ink, 1.2, [4, 4]);
      if (t > 0) K.curve(ctx, g, v, 0, t, c.ink, 3);
      // Marks for u and v
      ctx.font = "600 12px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillStyle = c.ink;
      ctx.fillText("u", g.X(0) + 6, g.Y(s.u) - 4);
      ctx.beginPath(); ctx.arc(g.X(t), g.Y(vv), 4.5, 0, 7); ctx.fill();
      ctx.fillText("v", g.X(t) + 7, g.Y(vv) - 4);
      ctx.strokeStyle = c.muted; ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(g.X(t), g.Y(vv)); ctx.lineTo(g.X(t), g.Y(0)); ctx.stroke(); ctx.setLineDash([]);
    };

    var showU = k.bindSlider("u", function () { return s.u; }, function (x) { s.u = x; reset(true); });
    var showA = k.bindSlider("a", function () { return s.a; }, function (x) { s.a = x; reset(true); });
    var showT = k.bindSlider("tEnd", function () { return s.tEnd; }, function (x) { s.tEnd = x; reset(true); });

    function reset(toEnd) { clock.stop(); s.t = toEnd ? maxT() : 0; k.btn("play").textContent = "Play"; update(); }
    function play() {
      if (clock.running) { clock.stop(); k.btn("play").textContent = "Resume"; return; }
      if (s.t >= maxT()) s.t = 0;
      k.btn("play").textContent = "Pause";
      clock.start();
    }
    k.onAct({ play: play, reset: function () { reset(false); } });
    update();

    return {
      set: function (o) { clock.stop(); Object.assign(s, o); s.t = o.t != null ? o.t : maxT(); showU(); showA(); showT(); k.btn("play").textContent = "Play"; update(); },
      seek: function (t) { clock.stop(); s.t = Math.min(t, maxT()); update(); },
      play: function () { s.t = 0; play(); }
    };
  }

  window.EquationSim = { mount: mount };
})();
