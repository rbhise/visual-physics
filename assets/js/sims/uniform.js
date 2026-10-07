/*
 * Uniform vs non-uniform motion: two cars, a mark dropped every second, and a live distance–time graph.
 * Needs sim-kit.js.  UniformSim.mount(el, { profile: "speedup", speedA: 10 }) → { set, seek, play }
 */
(function () {
  "use strict";
  var K = window.SimKit, T = 10;

  var TRAFFIC = [12, 12, 0, 0, 15, 15, 15, 0, 10, 10];   // m/s in each second
  var PROFILES = {
    speedup:  { label: "Speeding up", x: function (t) { return t * t; } },
    slowdown: { label: "Slowing down", x: function (t) { return 20 * t - t * t; } },
    traffic:  { label: "Heavy traffic", x: function (t) {
      var x = 0;
      for (var i = 0; i < TRAFFIC.length && i < t; i++) x += TRAFFIC[i] * Math.min(1, t - i);
      return x;
    } }
  };

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "usim";
    var s = { t: opts.t || 0, profile: opts.profile || "speedup", speedA: opts.speedA || 10 };

    var k = K.frame(root, {
      aspect: "5 / 3.6",
      label: "Two cars on parallel lanes with a mark every second, and a distance–time graph below",
      panel: K.chips("profile", "Car B", Object.keys(PROFILES).map(function (p) { return [p, PROFILES[p].label]; })) +
        K.slider(id, "speedA", "Car A speed", 2, 15, 1, "m/s") +
        K.hint("note") +
        K.buttons([["play", "Play"], ["reset", "Reset"]]),
      readouts: [["t", "Time (s)"], ["xa", "A distance (m)", "c-path"], ["xb", "B distance (m)", "c-vy"],
                 ["da", "A in last second (m)", "c-path"], ["db", "B in last second (m)", "c-vy"], ["gap", "A ahead of B by (m)"]],
      cols: 3
    });

    function xA(t) { return s.speedA * t; }
    function xB(t) { return PROFILES[s.profile].x(t); }
    function maxX() { return Math.max(xA(T), xB(T), 100); }

    var clock = K.clock(function (dt) {
      s.t = Math.min(T, s.t + dt);
      update();
      return s.t < T;
    });
    clock.onStop = function () { k.btn("play").textContent = "Play again"; };

    function update() {
      var t = s.t, n = Math.floor(t + 1e-9);
      k.set("t", K.fmt(t));
      k.set("xa", K.fmt(xA(t)));
      k.set("xb", K.fmt(xB(t)));
      k.set("da", n >= 1 ? K.fmt(xA(n) - xA(n - 1)) : "–");
      k.set("db", n >= 1 ? K.fmt(xB(n) - xB(n - 1)) : "–");
      k.set("gap", K.fmt(xA(t) - xB(t)));
      k.el('[data-r="note"]').textContent = "Car A covers " + s.speedA + " m every second: uniform motion. Car B covers different distances in equal times: non-uniform motion.";
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var top = Math.round(H * 0.36), padL = 40, padR = 14;
      var mx = maxX(), sx = function (x) { return padL + (x / mx) * (W - padL - padR); };
      // Lanes
      [["A", xA, c.path, 0.3], ["B", xB, c.vy, 0.72]].forEach(function (L) {
        var y = top * L[3];
        ctx.fillStyle = c.bg; ctx.fillRect(padL, y - 13, W - padL - padR, 26);
        ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(padL, y - 13, W - padL - padR, 26);
        ctx.font = "600 13px " + c.font; ctx.fillStyle = L[2]; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(L[0], padL - 10, y);
        // One mark per second
        ctx.font = "10px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
        for (var i = 0; i <= Math.floor(s.t + 1e-9); i++) {
          var x = sx(L[1](i));
          ctx.fillStyle = L[2]; ctx.beginPath(); ctx.arc(x, y + 9, 2.5, 0, 7); ctx.fill();
        }
        // Car
        var cx = sx(L[1](s.t));
        ctx.fillStyle = L[2];
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(cx - 14, y - 9, 22, 13, 4); else ctx.rect(cx - 14, y - 9, 22, 13); ctx.fill();
      });
      ctx.font = "10px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("dots: position at each second", padL, top * 0.72 + 17);

      // Distance–time graph
      var g = K.graph(ctx, c, { x: 0, y: top + 12, w: W, h: H - top - 14 }, { xmax: T, ymax: mx, title: "Distance (m) against time (s)" });
      K.curve(ctx, g, xA, 0, T, c.path, 1.2, [4, 4]);
      K.curve(ctx, g, xB, 0, T, c.vy, 1.2, [4, 4]);
      if (s.t > 0) { K.curve(ctx, g, xA, 0, s.t, c.path, 3); K.curve(ctx, g, xB, 0, s.t, c.vy, 3); }
      ctx.fillStyle = c.path; ctx.beginPath(); ctx.arc(g.X(s.t), g.Y(xA(s.t)), 4, 0, 7); ctx.fill();
      ctx.fillStyle = c.vy; ctx.beginPath(); ctx.arc(g.X(s.t), g.Y(xB(s.t)), 4, 0, 7); ctx.fill();
    };

    var showProfile = k.bindChips("profile", function () { return s.profile; }, function (v) { clock.stop(); s.profile = v; s.t = 0; k.btn("play").textContent = "Play"; update(); });
    var showA = k.bindSlider("speedA", function () { return s.speedA; }, function (v) { clock.stop(); s.speedA = v; s.t = 0; k.btn("play").textContent = "Play"; update(); });

    function play() {
      if (clock.running) { clock.stop(); k.btn("play").textContent = "Resume"; return; }
      if (s.t >= T) s.t = 0;
      k.btn("play").textContent = "Pause";
      clock.start();
    }
    k.onAct({ play: play, reset: function () { clock.stop(); s.t = 0; k.btn("play").textContent = "Play"; update(); } });
    update();

    return {
      set: function (o) { clock.stop(); Object.assign(s, o); if (!("t" in o)) s.t = 0; showProfile(); showA(); k.btn("play").textContent = "Play"; update(); },
      seek: function (t) { clock.stop(); s.t = t; update(); },
      play: function () { s.t = 0; play(); }
    };
  }

  window.UniformSim = { mount: mount, PROFILES: PROFILES };
})();
