/*
 * SONAR: a ship sends ultrasonic pulses down and times the echo from the sea bed.
 * depth = v × t ÷ 2. Move the ship along to map the sea bed.
 * Needs sim-kit.js.  SonarSim.mount(el, { x: 30, v: 1500 }) → { set, play, seek }
 */
(function () {
  "use strict";
  var K = window.SimKit, MAXD = 3300;
  // sea-bed profile: [position %, depth m]
  var BED = [[0, 600], [12, 600], [18, 1500], [34, 1500], [40, 3000], [54, 3000], [60, 1800], [78, 1800], [84, 900], [100, 900]];

  function depthAt(x) {
    for (var i = 1; i < BED.length; i++) if (x <= BED[i][0]) { var a = BED[i - 1], b = BED[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); }
    return BED[BED.length - 1][1];
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "snsim";
    var s = Object.assign({ x: 25, v: 1500, time: 0, cruise: false, map: [] }, opts);

    var k = K.frame(root, {
      aspect: window.matchMedia("(max-width: 600px)").matches ? "4 / 3.4" : "5 / 3",
      label: "A ship on the sea sending sound pulses to the sea bed and timing the echoes",
      panel: K.slider(id, "x", "Ship's position along the route", 0, 100, 1, "%") +
        K.slider(id, "v", "Speed of sound in sea water", 1450, 1560, 10, "m/s") +
        K.buttons([["ping", "Send a pulse"], ["cruise", "Map the sea bed"]]) + K.hint("note"),
      readouts: [["t", "Echo time t", "c-vy"], ["v", "Speed v"], ["d", "Depth = v × t ÷ 2", "c-path"],
                 ["path", "Pulse travels"], ["f", "Pulse frequency"], ["kind", "Kind of sound"]],
      cols: 3
    });

    function D() { return Math.round(depthAt(s.x)); }
    function T() { return 2 * D() / s.v; }
    function update() {
      k.set("t", K.fmt(T(), 2) + " s"); k.set("v", s.v + " m/s"); k.set("d", D() + " m");
      k.set("path", 2 * D() + " m"); k.set("f", "about 50 kHz"); k.set("kind", "Ultrasound");
      k.el('[data-r="note"]').textContent = "Depth = " + s.v + " × " + K.fmt(T(), 2) + " ÷ 2 = " + D() + " m. Divide by 2 because the pulse goes down and comes back up.";
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var sea = H * 0.16, bot = H - 14, Y = function (d) { return sea + d / MAXD * (bot - sea); }, X = function (p) { return 36 + p / 100 * (W - 72); };
      // water
      ctx.fillStyle = "rgba(60,130,210,0.12)"; ctx.fillRect(0, sea, W, H - sea);
      // sea bed
      ctx.fillStyle = "rgba(150,120,80,0.45)"; ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, Y(depthAt(0)));
      for (var p = 0; p <= 100; p += 1) ctx.lineTo(X(p), Y(depthAt(p)));
      ctx.lineTo(W, Y(depthAt(100))); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath();
      for (p = 0; p <= 100; p += 1) { var yy = Y(depthAt(p)); p ? ctx.lineTo(X(p), yy) : ctx.moveTo(X(p), yy); }
      ctx.stroke();
      // mapped points
      ctx.fillStyle = c.path; s.map.forEach(function (q) { ctx.beginPath(); ctx.arc(X(q[0]), Y(q[1]), 2.5, 0, Math.PI * 2); ctx.fill(); });
      // sea surface and ship
      ctx.strokeStyle = c.vx; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, sea); ctx.lineTo(W, sea); ctx.stroke();
      var sx = X(s.x);
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.moveTo(sx - 28, sea - 12); ctx.lineTo(sx + 28, sea - 12); ctx.lineTo(sx + 18, sea + 4); ctx.lineTo(sx - 18, sea + 4); ctx.closePath(); ctx.fill();
      ctx.fillRect(sx - 8, sea - 24, 18, 12);
      // depth line
      var yb = Y(D());
      ctx.save(); ctx.setLineDash([4, 5]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx, sea + 4); ctx.lineTo(sx, yb); ctx.stroke(); ctx.restore();
      ctx.fillStyle = c.path; ctx.font = "700 13px " + c.font; ctx.textBaseline = "middle";
      var right = s.x < 70; ctx.textAlign = right ? "left" : "right";
      ctx.fillText(D() + " m", sx + (right ? 8 : -8), (sea + yb) / 2);
      // pulse
      var t = T(), f = s.time / (t / 2);
      if (s.time > 0 && f < 2) {
        var y = f <= 1 ? sea + 4 + f * (yb - sea - 4) : yb - (f - 1) * (yb - sea - 4), col = f <= 1 ? c.path : c.vy;
        for (var a = 0; a < 3; a++) {
          ctx.strokeStyle = col; ctx.globalAlpha = 1 - a * 0.3; ctx.lineWidth = 2.5; ctx.beginPath();
          var off = (f <= 1 ? -1 : 1) * a * 7;
          if (f <= 1) ctx.arc(sx, y + off - 14, 16, 0.5, Math.PI - 0.5); else ctx.arc(sx, y + off + 14, 16, Math.PI + 0.5, -0.5);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.textAlign = "right"; ctx.fillText(s.time > 0 ? "timer: " + K.fmt(Math.min(s.time, t), 2) + " s" : "", W - 8, sea - 2);
    };

    var showX = k.bindSlider("x", function () { return s.x; }, function (x) { stop(); s.x = x; s.time = 0; update(); }, function (x) { return x + "%"; });
    var showV = k.bindSlider("v", function () { return s.v; }, function (x) { stop(); s.v = x; s.time = 0; update(); }, function (x) { return x + " m/s"; });

    // one pulse takes about 1.6 s on screen; cruising moves the ship and pings repeatedly
    var clock = K.clock(function (dt) {
      var t = T();
      s.time += dt * t / 1.6;
      if (s.time >= t) {
        s.map.push([s.x, D()]);
        if (!s.cruise || s.x >= 100) { s.time = 0; update(); return false; }
        s.x = Math.min(100, s.x + 4); showX(); s.time = 1e-6; update(); return true;
      }
      k.redraw(); return true;
    });
    clock.onStop = function () { s.cruise = false; k.btn("cruise").textContent = "Map the sea bed"; };
    function stop() { if (clock.running) { clock.stop(); clock.onStop(); } }
    function ping() { stop(); s.time = 1e-6; clock.start(); }
    function cruise() { if (clock.running && s.cruise) { stop(); return; } stop(); s.map = []; s.x = 0; showX(); update(); s.cruise = true; k.btn("cruise").textContent = "Stop"; s.time = 1e-6; clock.start(); }
    k.onAct({ ping: ping, cruise: cruise });

    update();
    return {
      set: function (o) { stop(); s.sweep = false; Object.assign(s, o); s.time = 0; showX(); showV(); update(); },
      play: function () { if (s.sweep) cruise(); else ping(); },
      seek: function (t) { stop(); s.time = t; k.redraw(); }
    };
  }

  window.SonarSim = { mount: mount };
})();
