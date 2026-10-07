/*
 * Motion graphs: a journey made of steady, speeding-up, slowing-down and resting parts,
 * drawn live as a distance–time graph and a velocity–time graph.
 * Drag across the graphs to move through time.
 * Needs sim-kit.js.  GraphSim.mount(el, { journey: "train" }) → { set, seek, play }
 */
(function () {
  "use strict";
  var K = window.SimKit;

  // Each part: duration (s) and acceleration (m/s²); the journey starts at velocity v0
  var JOURNEYS = {
    steady:  { label: "Steady speed",       v0: 6, parts: [[10, 0]] },
    speedup: { label: "Speeding up",        v0: 0, parts: [[10, 1.2]] },
    signal:  { label: "Stop at a signal",   v0: 8, parts: [[4, 0], [2, -4], [2, 0], [2, 4]] },
    train:   { label: "Train between stations", v0: 0, parts: [[3, 4], [4, 0], [3, -4]] }
  };

  function profile(j) {
    // Precompute start time, start velocity and start position of each part
    var t = 0, v = j.v0, x = 0, segs = [];
    j.parts.forEach(function (p) {
      segs.push({ t0: t, v0: v, x0: x, d: p[0], a: p[1] });
      x += v * p[0] + 0.5 * p[1] * p[0] * p[0];
      v += p[1] * p[0]; t += p[0];
    });
    function seg(tt) { for (var i = segs.length - 1; i >= 0; i--) if (tt >= segs[i].t0) return segs[i]; return segs[0]; }
    return {
      T: t,
      v: function (tt) { var s = seg(tt), d = tt - s.t0; return s.v0 + s.a * d; },
      x: function (tt) { var s = seg(tt), d = tt - s.t0; return s.x0 + s.v0 * d + 0.5 * s.a * d * d; },
      phase: function (tt) {
        var s = seg(tt), vv = s.v0 + s.a * (tt - s.t0);
        return s.a > 0 ? "Speeding up" : s.a < 0 ? "Slowing down" : vv < 0.01 ? "At rest" : "Steady speed";
      }
    };
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "gsim";
    var s = { journey: opts.journey || "train", t: opts.t || 0, slope: true, area: true };
    var P = profile(JOURNEYS[s.journey]);

    var k = K.frame(root, {
      aspect: "5 / 4.6",
      label: "A vehicle on a road with its distance–time and velocity–time graphs. Drag across the graphs to move through time.",
      panel: K.chips("journey", "Journey", Object.keys(JOURNEYS).map(function (j) { return [j, JOURNEYS[j].label]; })) +
        '<div class="checks">' + K.check(id, "slope", "Slope on distance graph", true) + K.check(id, "area", "Area under velocity graph", true) + '</div>' +
        '<p class="sim-hint">Drag across the graphs to move through time.</p>' +
        K.buttons([["play", "Play"], ["reset", "Reset"]]),
      readouts: [["t", "Time (s)"], ["x", "Distance (m)", "c-path"], ["v", "Velocity (m/s)", "c-vx"],
                 ["slope", "Slope of d–t (m/s)", "c-vy"], ["area", "Area under v–t (m)", "c-vx"], ["phase", "Motion"]],
      cols: 3
    });

    var clock = K.clock(function (dt) { s.t = Math.min(P.T, s.t + dt); update(); return s.t < P.T; });
    clock.onStop = function () { k.btn("play").textContent = "Play again"; };

    function update() {
      var t = s.t;
      k.set("t", K.fmt(t));
      k.set("x", K.fmt(P.x(t)));
      k.set("v", K.fmt(P.v(t)));
      k.set("slope", K.fmt(P.v(t)));
      k.set("area", K.fmt(P.x(t)));
      k.set("phase", P.phase(Math.min(t, P.T - 1e-6)));
      k.redraw();
    }

    var G1 = null, G2 = null;
    k.draw = function (ctx, W, H, c) {
      var road = Math.round(H * 0.14), gh = (H - road) / 2;
      var xmax = P.x(P.T), vmax = 0;
      for (var i = 0; i <= 100; i++) vmax = Math.max(vmax, P.v(P.T * i / 100));
      xmax = Math.max(10, xmax) * 1.08; vmax = Math.max(4, vmax) * 1.15;

      // Road strip with the vehicle
      var padL = 40, padR = 14, sx = function (d) { return padL + d / xmax * (W - padL - padR); }, y = road * 0.55;
      ctx.fillStyle = c.bg; ctx.fillRect(padL - 6, y - 12, W - padL - padR + 12, 24);
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(padL - 6, y - 12, W - padL - padR + 12, 24);
      ctx.fillStyle = c.ink; var cx = sx(P.x(s.t));
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx - 14, y - 7, 24, 13, 4); else ctx.rect(cx - 14, y - 7, 24, 13); ctx.fill();

      // Distance–time graph
      G1 = K.graph(ctx, c, { x: 0, y: road, w: W, h: gh }, { xmax: P.T, ymax: xmax, title: "Distance (m) against time (s)" });
      K.curve(ctx, G1, P.x, 0, P.T, c.path, 1.2, [4, 4]);
      if (s.t > 0) K.curve(ctx, G1, P.x, 0, s.t, c.path, 3);
      if (s.slope) {
        // Tangent line at the current time: its slope is the velocity
        var v = P.v(s.t), x0 = P.x(s.t), dt = P.T * 0.12;
        ctx.save(); ctx.beginPath(); ctx.rect(G1.gx, G1.gy, G1.gw, G1.gh); ctx.clip();
        ctx.strokeStyle = c.vy; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(G1.X(s.t - dt), G1.Y(x0 - v * dt)); ctx.lineTo(G1.X(s.t + dt), G1.Y(x0 + v * dt)); ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = c.path; ctx.beginPath(); ctx.arc(G1.X(s.t), G1.Y(P.x(s.t)), 4.5, 0, 7); ctx.fill();

      // Velocity–time graph with the area under it
      G2 = K.graph(ctx, c, { x: 0, y: road + gh, w: W, h: gh }, { xmax: P.T, ymax: vmax, title: "Velocity (m/s) against time (s)" });
      if (s.area && s.t > 0) {
        ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = c.vx;
        ctx.beginPath(); ctx.moveTo(G2.X(0), G2.Y(0));
        for (var j = 0; j <= 120; j++) { var tt = s.t * j / 120; ctx.lineTo(G2.X(tt), G2.Y(P.v(tt))); }
        ctx.lineTo(G2.X(s.t), G2.Y(0)); ctx.closePath(); ctx.fill(); ctx.restore();
      }
      K.curve(ctx, G2, P.v, 0, P.T, c.vx, 1.2, [4, 4]);
      if (s.t > 0) K.curve(ctx, G2, P.v, 0, s.t, c.vx, 3);
      ctx.fillStyle = c.vx; ctx.beginPath(); ctx.arc(G2.X(s.t), G2.Y(P.v(s.t)), 4.5, 0, 7); ctx.fill();

      // Time cursor through both graphs
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(G1.X(s.t), G1.gy); ctx.lineTo(G1.X(s.t), G1.gy + G1.gh); ctx.moveTo(G2.X(s.t), G2.gy); ctx.lineTo(G2.X(s.t), G2.gy + G2.gh); ctx.stroke();
      ctx.setLineDash([]);
    };

    // Drag across the graphs to scrub time
    function scrub(e) {
      if (!G1) return;
      var r = k.canvas.getBoundingClientRect(), px = e.clientX - r.left;
      clock.stop(); k.btn("play").textContent = "Play";
      s.t = Math.max(0, Math.min(P.T, (px - G1.gx) / G1.gw * P.T));
      update();
    }
    var dragging = false;
    k.canvas.addEventListener("pointerdown", function (e) { dragging = true; k.canvas.setPointerCapture(e.pointerId); scrub(e); });
    k.canvas.addEventListener("pointermove", function (e) { if (dragging) scrub(e); });
    k.canvas.addEventListener("pointerup", function () { dragging = false; });
    k.canvas.style.cursor = "ew-resize";

    var showJ = k.bindChips("journey", function () { return s.journey; }, function (j) { s.journey = j; P = profile(JOURNEYS[j]); reset(); });
    k.bindCheck("slope", function (on) { s.slope = on; k.redraw(); });
    k.bindCheck("area", function (on) { s.area = on; k.redraw(); });

    function reset() { clock.stop(); s.t = 0; k.btn("play").textContent = "Play"; update(); }
    function play() {
      if (clock.running) { clock.stop(); k.btn("play").textContent = "Resume"; return; }
      if (s.t >= P.T) s.t = 0;
      k.btn("play").textContent = "Pause";
      clock.start();
    }
    k.onAct({ play: play, reset: reset });
    update();

    return {
      set: function (o) { clock.stop(); if (o.journey) { s.journey = o.journey; P = profile(JOURNEYS[o.journey]); } s.t = o.t || 0; showJ(); k.btn("play").textContent = "Play"; update(); },
      seek: function (t) { clock.stop(); s.t = t; update(); },
      play: function () { s.t = 0; play(); }
    };
  }

  window.GraphSim = { mount: mount, JOURNEYS: JOURNEYS, profile: profile };
})();
