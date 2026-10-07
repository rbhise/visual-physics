/*
 * Uniform circular motion: an object goes round at constant speed. The path can be a polygon
 * (direction changes only at corners) or a circle (direction changes all the time).
 * "Let go" releases the object, which then flies off along the tangent.
 * Needs sim-kit.js.  CircleSim.mount(el, { r: 15, T: 6, sides: 0 }) → { set, seek, play, release }
 */
(function () {
  "use strict";
  var K = window.SimKit;

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "csim";
    var s = { r: opts.r || 15, T: opts.T || 6, sides: opts.sides || 0, t: opts.t || 0, ghosts: true, free: null };

    var k = K.frame(root, {
      aspect: "5 / 3.6",
      label: "An object moving round a circle or polygon with its velocity arrow",
      panel: K.chips("sides", "Path", [["4", "Square"], ["8", "8 sides"], ["16", "16 sides"], ["0", "Circle"]]) +
        K.slider(id, "r", "Radius r", 5, 20, 1, "m") +
        K.slider(id, "T", "Time for one round", 2, 12, 1, "s") +
        '<div class="checks">' + K.check(id, "ghosts", "Show earlier velocity arrows", true) + '</div>' +
        K.buttons([["play", "Play"], ["release", "Let go"], ["reset", "Reset"]]),
      readouts: [["v", "Speed (m/s)", "c-path"], ["lap", "Distance per round (m)"], ["t", "Time (s)"],
                 ["ang", "Angle turned (°)"], ["dir", "Direction of velocity", "wrap"], ["state", "State"]],
      cols: 3
    });

    function perim() { return s.sides ? s.sides * 2 * s.r * Math.sin(Math.PI / s.sides) : 2 * Math.PI * s.r; }
    function speed() { return perim() / s.T; }

    // Position and direction at time t (starts at the bottom, moving anticlockwise, i.e. east)
    function at(t) {
      var f = (t / s.T) % 1;
      if (!s.sides) {
        var a = -Math.PI / 2 + f * 2 * Math.PI;
        return { x: s.r * Math.cos(a), y: s.r * Math.sin(a), ux: -Math.sin(a), uy: Math.cos(a) };
      }
      var n = s.sides, side = f * n, i = Math.floor(side), g = side - i;
      var a0 = -Math.PI / 2 - Math.PI / n + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n;
      var x0 = s.r * Math.cos(a0), y0 = s.r * Math.sin(a0), x1 = s.r * Math.cos(a1), y1 = s.r * Math.sin(a1);
      var L = Math.hypot(x1 - x0, y1 - y0);
      return { x: x0 + (x1 - x0) * g, y: y0 + (y1 - y0) * g, ux: (x1 - x0) / L, uy: (y1 - y0) / L };
    }

    function bearing(ux, uy) {
      var deg = (Math.atan2(ux, uy) * 180 / Math.PI + 360) % 360;   // 0 = north, clockwise
      var names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      return names[Math.round(deg / 45) % 8] + " (" + Math.round(deg) + "°)";
    }

    var clock = K.clock(function (dt) {
      s.t += dt;
      if (s.free) { s.free.x += s.free.ux * speed() * dt; s.free.y += s.free.uy * speed() * dt; if (Math.hypot(s.free.x, s.free.y) > 3 * s.r) { update(); return false; } }
      update();
      return true;
    });
    clock.onStop = function () { k.btn("play").textContent = "Play"; };

    function update() {
      var p = s.free || at(s.t);
      k.set("v", K.fmt(speed(), 2));
      k.set("lap", K.fmt(perim()));
      k.set("t", K.fmt(s.t));
      k.set("ang", s.free ? "–" : Math.round(((s.t / s.T) % 1) * 360));
      k.set("dir", bearing(p.ux, p.uy));
      k.set("state", s.free ? "Let go: straight line" : "Going round");
      k.btn("release").disabled = !!s.free;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var sc = Math.min(W, H) / (2 * 20 * 1.45), cx = W / 2, cy = H / 2;
      var X = function (x) { return cx + x * sc; }, Y = function (y) { return cy - y * sc; };
      // Path
      ctx.strokeStyle = c.line; ctx.lineWidth = 10; ctx.lineJoin = "round";
      ctx.beginPath();
      if (!s.sides) ctx.arc(cx, cy, s.r * sc, 0, Math.PI * 2);
      else for (var i = 0; i <= s.sides; i++) { var a = -Math.PI / 2 - Math.PI / s.sides + i * 2 * Math.PI / s.sides; i ? ctx.lineTo(X(s.r * Math.cos(a)), Y(s.r * Math.sin(a))) : ctx.moveTo(X(s.r * Math.cos(a)), Y(s.r * Math.sin(a))); }
      ctx.stroke();
      ctx.fillStyle = c.muted; ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 7); ctx.fill();

      var L = 22 + speed() * 3;
      // Earlier velocity arrows, every 1/8 of a round
      if (s.ghosts) {
        ctx.globalAlpha = 0.35;
        for (var j = 0; j < 8; j++) {
          var q = at(s.T * (j + 0.5) / 8);
          K.arrow(ctx, X(q.x), Y(q.y), X(q.x) + q.ux * L, Y(q.y) - q.uy * L, c.path, 2);
        }
        ctx.globalAlpha = 1;
      }
      var p = s.free || at(s.t);
      if (s.free) {
        ctx.strokeStyle = c.vy; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(X(s.free.x0), Y(s.free.y0)); ctx.lineTo(X(p.x), Y(p.y)); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(X(p.x), Y(p.y)); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = "11px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText("r", (cx + X(p.x)) / 2 + 8, (cy + Y(p.y)) / 2);
      }
      K.arrow(ctx, X(p.x), Y(p.y), X(p.x) + p.ux * L, Y(p.y) - p.uy * L, c.ink, 3);
      ctx.fillStyle = c.vy; ctx.strokeStyle = c.surface; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 8, 0, 7); ctx.fill(); ctx.stroke();
      ctx.font = "italic 600 14px " + c.font; ctx.fillStyle = c.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("v", X(p.x) + p.ux * (L + 12), Y(p.y) - p.uy * (L + 12));
    };

    var showS = k.bindChips("sides", function () { return String(s.sides); }, function (v) { s.sides = +v; s.free = null; update(); });
    var showR = k.bindSlider("r", function () { return s.r; }, function (v) { s.r = v; s.free = null; update(); });
    var showT = k.bindSlider("T", function () { return s.T; }, function (v) { s.T = v; update(); });
    k.bindCheck("ghosts", function (on) { s.ghosts = on; k.redraw(); });

    function play() {
      if (clock.running) { clock.stop(); k.btn("play").textContent = "Play"; return; }
      if (s.free && Math.hypot(s.free.x, s.free.y) > 3 * s.r) { s.free = null; }
      k.btn("play").textContent = "Pause";
      clock.start();
    }
    function release() {
      var p = at(s.t);
      s.free = { x: p.x, y: p.y, x0: p.x, y0: p.y, ux: p.ux, uy: p.uy };
      if (!clock.running) play();
      update();
    }
    k.onAct({ play: play, release: release, reset: function () { clock.stop(); s.t = 0; s.free = null; k.btn("play").textContent = "Play"; update(); } });
    update();

    return {
      set: function (o) { clock.stop(); Object.assign(s, o); s.free = null; if (!("t" in o)) s.t = 0; showS(); showR(); showT(); k.btn("play").textContent = "Play"; update(); },
      seek: function (t) { clock.stop(); s.t = t; update(); },
      play: function () { play(); },
      release: function (t) { if (t != null) s.t = t; var p = at(s.t); s.free = { x: p.x, y: p.y, x0: p.x, y0: p.y, ux: p.ux, uy: p.uy }; update(); },
      fly: function (d) { if (s.free) { s.free.x += s.free.ux * d; s.free.y += s.free.uy * d; update(); } }
    };
  }

  window.CircleSim = { mount: mount };
})();
