/*
 * Work: a box moves along the floor while a force acts on it at an angle θ to the motion.
 * Work done by the force = F × s × cos θ.
 * Needs sim-kit.js.  WorkSim.mount(el, { F: 50, s: 6, theta: 0 }) → { set, seek, play }
 */
(function () {
  "use strict";
  var K = window.SimKit, DUR = 3;   // seconds of animation for the whole move

  var PRESETS = {
    pull:   { label: "Pull along the floor", F: 50, s: 6, theta: 0 },
    angle:  { label: "Pull at an angle", F: 50, s: 6, theta: 60 },
    carry:  { label: "Force at right angles", F: 50, s: 6, theta: 90 },
    oppose: { label: "Force against the motion", F: 50, s: 6, theta: 180 }
  };

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "wsim";
    var s = Object.assign({ F: 50, s: 6, theta: 0, x: 0 }, opts);
    if (opts.x == null) s.x = s.s;

    var k = K.frame(root, {
      aspect: "5 / 3",
      label: "A box moving along the floor with a force arrow at an angle to the motion",
      panel: K.chips("preset", "Try", Object.keys(PRESETS).map(function (p) { return [p, PRESETS[p].label]; })) +
        K.slider(id, "F", "Force F", 10, 100, 5, "N") +
        K.slider(id, "theta", "Angle θ between force and motion", 0, 180, 15, "°") +
        K.slider(id, "s", "Displacement s", 1, 10, 1, "m") +
        K.hint("note") +
        K.buttons([["play", "Move the box"], ["reset", "Reset"]]),
      readouts: [["along", "Force along the motion (N)", "c-vx"], ["x", "Moved so far (m)"], ["W", "Work W = F s cos θ (J)", "c-path"],
                 ["kind", "Type of work"], ["perp", "Force at right angles (N)"], ["cos", "cos θ"]],
      cols: 3
    });

    function cos() { var c = Math.cos(s.theta * Math.PI / 180); return Math.abs(c) < 1e-9 ? 0 : c; }
    function work(x) { return s.F * x * cos(); }

    var t = 0;
    var clock = K.clock(function (dt) { t += dt; s.x = Math.min(s.s, s.s * t / DUR); update(); return s.x < s.s; });
    clock.onStop = function () { k.btn("play").textContent = "Move again"; };

    function presetKey() { for (var p in PRESETS) { var q = PRESETS[p]; if (q.F === s.F && q.s === s.s && q.theta === s.theta) return p; } return ""; }

    function update() {
      var W = work(s.x), c = cos();
      k.set("along", K.fmt(s.F * c));
      k.set("perp", K.fmt(s.F * Math.sin(s.theta * Math.PI / 180)));
      k.set("cos", K.fmt(c, 2));
      k.set("x", K.fmt(s.x));
      k.set("W", K.fmt(W));
      k.set("kind", c > 0 ? "Positive" : c < 0 ? "Negative" : "Zero");
      k.el('[data-r="note"]').textContent = c > 0.999 ? "Force and motion are in the same direction (θ = 0°): all of the force does work."
        : c > 0 ? "Only the part of the force along the motion does work."
        : c === 0 ? "The force is at right angles to the motion (θ = 90°): it does no work."
        : c > -0.999 ? "Part of the force acts against the motion: the work is negative."
        : "The force is opposite to the motion (θ = 180°), like friction or braking: the work is negative.";
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var floorY = H * 0.62, x0 = W * 0.12, ppm = (W * 0.62) / 10;
      ctx.fillStyle = c.bg; ctx.fillRect(0, floorY, W, H - floorY);
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(W, floorY); ctx.stroke();
      // Start and end marks with displacement arrow
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x0, floorY - 70); ctx.lineTo(x0, floorY + 6); ctx.moveTo(x0 + s.s * ppm, floorY - 70); ctx.lineTo(x0 + s.s * ppm, floorY + 6); ctx.stroke(); ctx.setLineDash([]);
      K.arrow(ctx, x0, floorY + 22, x0 + s.s * ppm, floorY + 22, c.muted, 1.5, 9);
      ctx.font = "12px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("s = " + s.s + " m", x0 + s.s * ppm / 2, floorY + 30);

      // Box
      var side = 46, bx = x0 + s.x * ppm, by = floorY - side;
      ctx.fillStyle = c.tint; ctx.strokeStyle = c.path; ctx.lineWidth = 2;
      ctx.fillRect(bx - side / 2, by, side, side); ctx.strokeRect(bx - side / 2, by, side, side);
      // Motion arrow under the box label
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText("motion →", bx, by - 6);

      // Force arrow from the box centre at angle θ (0 = along the motion, to the right)
      var th = s.theta * Math.PI / 180, L = (40 + s.F * 1.1) * Math.min(1, W / 700), cx = bx, cy = by + side / 2;
      var fx = Math.cos(th) * L, fy = -Math.sin(th) * L;
      // Components
      ctx.setLineDash([4, 3]);
      if (Math.abs(Math.cos(th)) > 0.02) K.arrow(ctx, cx, cy, cx + fx, cy, c.vx, 2.5);
      if (Math.abs(Math.sin(th)) > 0.02) K.arrow(ctx, cx + fx, cy, cx + fx, cy + fy, c.muted, 1.5);
      ctx.setLineDash([]);
      K.arrow(ctx, cx, cy, cx + fx, cy + fy, c.vy, 4);
      ctx.fillStyle = c.vy; ctx.font = "600 13px " + c.font; ctx.textAlign = fx >= 0 ? "left" : "right"; ctx.textBaseline = "bottom";
      ctx.fillText("F = " + s.F + " N", cx + fx + (fx >= 0 ? 6 : -6), cy + fy - 4);
      // Angle arc
      if (s.theta > 0) {
        ctx.strokeStyle = c.ink; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(cx, cy, 22, -th, 0); ctx.stroke();
        ctx.fillStyle = c.ink; ctx.font = "12px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
        ctx.fillText("θ = " + s.theta + "°", cx + 26 * Math.cos(th / 2) + 2, cy - 26 * Math.sin(th / 2));
      }

      // Work bar along the bottom
      var Wmax = 100 * 10, bw = (W - 40) / 2, mid = W / 2, barY = H - 26;
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText("work done by F", 20, barY - 4);
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(20, barY, W - 40, 12);
      ctx.beginPath(); ctx.moveTo(mid, barY - 4); ctx.lineTo(mid, barY + 16); ctx.stroke();
      var wv = work(s.x), w = wv / Wmax * bw;
      ctx.fillStyle = wv >= 0 ? c.path : c.vy; ctx.fillRect(w >= 0 ? mid : mid + w, barY + 1, Math.abs(w), 10);
      ctx.fillStyle = c.muted; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText("−", 26, barY + 13); ctx.fillText("0", mid, barY + 15); ctx.fillText("+", W - 26, barY + 13);
    };

    var shows = {};
    ["F", "theta", "s"].forEach(function (key) { shows[key] = k.bindSlider(key, function () { return s[key]; }, function (v) { s[key] = v; reset(true); }); });
    var showP = k.bindChips("preset", presetKey, function (p) { Object.assign(s, PRESETS[p]); Object.keys(shows).forEach(function (q) { shows[q](); }); reset(true); });

    function reset(toEnd) { clock.stop(); t = toEnd ? DUR : 0; s.x = toEnd ? s.s : 0; k.btn("play").textContent = "Move the box"; if (showP) showP(); update(); }
    function play() { clock.stop(); t = 0; s.x = 0; k.btn("play").textContent = "Moving…"; clock.start(); }
    k.onAct({ play: play, reset: function () { reset(false); } });
    update();

    return {
      set: function (o) { Object.assign(s, o); Object.keys(shows).forEach(function (q) { shows[q](); }); reset(true); },
      seek: function (x) { clock.stop(); s.x = Math.min(s.s, x); update(); },
      play: play
    };
  }

  window.WorkSim = { mount: mount };
})();
