/*
 * Conservation of momentum: two balls on a straight frictionless track collide (bouncy or sticky),
 * or push apart from rest (recoil). Bars compare momentum before and after.
 * Needs sim-kit.js.  CollisionSim.mount(el, { m1: 1, m2: 1, u1: 4, u2: 0, mode: "bouncy" }) → { set, seek, play }
 */
(function () {
  "use strict";
  var K = window.SimKit, WORLD = 24, TMAX = 8, J = 6;   // recoil impulse in kg·m/s

  var PRESETS = {
    equal:  { label: "Equal masses",    m1: 1, m2: 1, u1: 4, u2: 0, mode: "bouncy" },
    heavy:  { label: "Heavy hits light", m1: 3, m2: 1, u1: 3, u2: 0, mode: "bouncy" },
    sticky: { label: "Stick together",  m1: 2, m2: 1, u1: 3, u2: 0, mode: "sticky" },
    headon: { label: "Head-on",         m1: 2, m2: 2, u1: 3, u2: -3, mode: "bouncy" },
    recoil: { label: "Recoil",          m1: 3, m2: 1, u1: 0, u2: 0, mode: "recoil" }
  };

  function radius(m) { return 0.45 + 0.35 * Math.cbrt(m); }

  // Final velocities after the interaction
  function after(s) {
    if (s.mode === "recoil") return { v1: -J / s.m1, v2: J / s.m2 };
    if (s.mode === "sticky") { var v = (s.m1 * s.u1 + s.m2 * s.u2) / (s.m1 + s.m2); return { v1: v, v2: v }; }
    var M = s.m1 + s.m2;
    return { v1: ((s.m1 - s.m2) * s.u1 + 2 * s.m2 * s.u2) / M, v2: ((s.m2 - s.m1) * s.u2 + 2 * s.m1 * s.u1) / M };
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "msim";
    var s = Object.assign({ m1: 1, m2: 1, u1: 4, u2: 0, mode: "bouncy" }, opts);
    var st;   // running state: positions, velocities, time, hit flag

    var k = K.frame(root, {
      aspect: "5 / 3.4",
      label: "Two balls on a track before and after a collision, with momentum bars",
      panel: K.chips("preset", "Try", Object.keys(PRESETS).map(function (p) { return [p, PRESETS[p].label]; })) +
        K.slider(id, "m1", "Mass of ball A", 0.5, 5, 0.5, "kg") +
        K.slider(id, "u1", "Velocity of A", -4, 6, 1, "m/s") +
        K.slider(id, "m2", "Mass of ball B", 0.5, 5, 0.5, "kg") +
        K.slider(id, "u2", "Velocity of B", -6, 4, 1, "m/s") +
        K.hint("note") +
        K.buttons([["play", "Play"], ["reset", "Reset"]]),
      readouts: [["p1", "A before (kg·m/s)", "c-path"], ["p2", "B before (kg·m/s)", "c-vy"], ["pt", "Total before (kg·m/s)"],
                 ["q1", "A after (kg·m/s)", "c-path"], ["q2", "B after (kg·m/s)", "c-vy"], ["qt", "Total after (kg·m/s)"]],
      cols: 3
    });

    function start() {
      var r1 = radius(s.m1), r2 = radius(s.m2);
      if (s.mode === "recoil") st = { x1: WORLD / 2 - r1, x2: WORLD / 2 + r2, v1: 0, v2: 0, t: 0, hit: false };
      else st = { x1: 5, x2: 15, v1: s.u1, v2: s.u2, t: 0, hit: false };
    }

    function step(dt) {
      st.t += dt;
      if (s.mode === "recoil") {
        if (!st.hit && st.t >= 0.6) { var a = after(s); st.v1 = a.v1; st.v2 = a.v2; st.hit = true; }
      } else if (!st.hit && st.x2 - st.x1 <= radius(s.m1) + radius(s.m2) && st.v1 > st.v2) {
        var b = after(s); st.v1 = b.v1; st.v2 = b.v2; st.hit = true;
      }
      st.x1 += st.v1 * dt; st.x2 += st.v2 * dt;
      if (s.mode === "sticky" && st.hit) st.x2 = st.x1 + radius(s.m1) + radius(s.m2);
    }

    var clock = K.clock(function (dt) {
      step(dt);
      update();
      var out = (st.x1 < -2 && st.x2 < -2) || (st.x1 > WORLD + 2 && st.x2 > WORLD + 2) || st.x1 < -3 || st.x2 > WORLD + 3;
      return st.t < TMAX && !out;
    });
    clock.onStop = function () { k.btn("play").textContent = "Play again"; };

    function willHit() { return s.mode !== "bouncy" && s.mode !== "sticky" ? true : s.u1 > s.u2; }

    function update() {
      var a = after(s), b1 = s.mode === "recoil" ? 0 : s.u1, b2 = s.mode === "recoil" ? 0 : s.u2;
      var p1 = s.m1 * b1, p2 = s.m2 * b2;
      k.set("p1", K.fmt(p1)); k.set("p2", K.fmt(p2)); k.set("pt", K.fmt(p1 + p2));
      if (st.hit) { k.set("q1", K.fmt(s.m1 * a.v1)); k.set("q2", K.fmt(s.m2 * a.v2)); k.set("qt", K.fmt(s.m1 * a.v1 + s.m2 * a.v2)); }
      else { k.set("q1", "–"); k.set("q2", "–"); k.set("qt", "–"); }
      var note = s.mode === "recoil" ? "Both start at rest, so the total momentum is 0. They push apart with equal and opposite momentum."
        : !willHit() ? "Ball A is not catching up with ball B, so they will not collide. Make A faster or B slower."
        : s.mode === "sticky" ? "The balls stick together and move off as one. Momentum is still conserved."
        : "Positive momentum points right, negative points left. Watch the total before and after.";
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var trackY = H * 0.42, ppm = W / WORLD, X = function (x) { return x * ppm; };
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, trackY); ctx.lineTo(W, trackY); ctx.stroke();
      [[st.x1, s.m1, st.v1, c.path, "A"], [st.x2, s.m2, st.v2, c.vy, "B"]].forEach(function (b) {
        var r = radius(b[1]) * ppm;
        ctx.fillStyle = b[3]; ctx.beginPath(); ctx.arc(X(b[0]), trackY - r, r, 0, 7); ctx.fill();
        ctx.fillStyle = c.surface; ctx.font = "600 12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(b[4], X(b[0]), trackY - r);
        if (Math.abs(b[2]) > 0.01) K.arrow(ctx, X(b[0]), trackY - 2 * r - 12, X(b[0]) + b[2] * ppm * 0.8, trackY - 2 * r - 12, b[3], 2.5);
      });

      // Momentum bars: before and after, each with A, B and the total
      var a = after(s), b1 = s.mode === "recoil" ? 0 : s.u1, b2 = s.mode === "recoil" ? 0 : s.u2;
      var rows = [["before", s.m1 * b1, s.m2 * b2], ["after", st.hit ? s.m1 * a.v1 : null, st.hit ? s.m2 * a.v2 : null]];
      var pmax = Math.max(6, Math.abs(s.m1 * b1), Math.abs(s.m2 * b2), Math.abs(s.m1 * a.v1), Math.abs(s.m2 * a.v2), Math.abs(s.m1 * b1 + s.m2 * b2));
      var mid = W * 0.58, half = W * 0.36, top = H * 0.56, rowH = (H - top - 10) / 2;
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(mid, top); ctx.lineTo(mid, H - 6); ctx.stroke();
      ctx.font = "11px " + c.font;
      rows.forEach(function (row, i) {
        var y0 = top + i * rowH;
        ctx.fillStyle = c.ink; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.font = "600 12px " + c.font;
        ctx.fillText("Momentum " + row[0], 6, y0 + 2);
        if (row[1] === null) { ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.fillText("after the collision", 6, y0 + 18); return; }
        [[row[1], c.path, "A"], [row[2], c.vy, "B"], [row[1] + row[2], c.ink, "total"]].forEach(function (bar, j) {
          var y = y0 + 6 + j * (rowH - 10) / 3, h = (rowH - 10) / 3 - 4, w = bar[0] / pmax * half;
          ctx.fillStyle = bar[1]; ctx.globalAlpha = j === 2 ? 1 : 0.85;
          ctx.fillRect(w >= 0 ? mid : mid + w, y, Math.abs(w), h); ctx.globalAlpha = 1;
          ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textBaseline = "middle"; ctx.textAlign = "right";
          ctx.fillText(bar[2] + " " + K.fmt(bar[0]), mid - 6 + (w < 0 ? w : 0), y + h / 2);
        });
      });
    };

    var shows = {};
    ["m1", "u1", "m2", "u2"].forEach(function (key) {
      shows[key] = k.bindSlider(key, function () { return s[key]; }, function (v) { s[key] = v; if (s.mode === "recoil") s.mode = "bouncy"; reset(); });
    });
    function presetKey() { for (var p in PRESETS) { var q = PRESETS[p]; if (q.m1 === s.m1 && q.m2 === s.m2 && q.u1 === s.u1 && q.u2 === s.u2 && q.mode === s.mode) return p; } return ""; }
    var showP = k.bindChips("preset", presetKey, function (p) { Object.assign(s, PRESETS[p]); Object.keys(shows).forEach(function (q) { shows[q](); }); reset(); });

    function reset() { clock.stop(); start(); k.btn("play").textContent = "Play"; if (showP) showP(); update(); }
    function play() {
      if (clock.running) { clock.stop(); k.btn("play").textContent = "Resume"; return; }
      if (st.t > 0 && !clock.running && k.btn("play").textContent !== "Resume") start();
      k.btn("play").textContent = "Pause";
      clock.start();
    }
    k.onAct({ play: play, reset: reset });
    start(); update();

    return {
      set: function (o) { Object.assign(s, o); Object.keys(shows).forEach(function (q) { shows[q](); }); reset(); },
      seek: function (t) { clock.stop(); start(); var n = Math.round(t / 0.01); for (var i = 0; i < n; i++) step(0.01); update(); },
      play: function () { reset(); play(); }
    };
  }

  window.CollisionSim = { mount: mount, after: after };
})();
