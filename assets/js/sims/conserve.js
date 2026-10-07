/*
 * Conservation of energy: free fall, a pendulum and a smooth slide, with live energy bars.
 * Potential energy mgh turns into kinetic energy ½mv² and back; their total stays the same.
 * Needs sim-kit.js.  ConserveSim.mount(el, { mode: "fall", m: 2, h: 4 }) → { set, seek, play }
 */
(function () {
  "use strict";
  var K = window.SimKit, G = 9.8, LP = 4, SLIDE_L = 6, SLIDE_END = 11;

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "csim";
    var s = Object.assign({ mode: "fall", m: 2, h: 4 }, opts);
    var st = {};

    var k = K.frame(root, {
      aspect: "5 / 3.2",
      label: "A ball falling, a pendulum swinging or a ball sliding, with energy bars that keep the same total",
      panel: K.chips("mode", "Situation", [["fall", "Free fall"], ["pendulum", "Pendulum"], ["slide", "Smooth slide"]]) +
        K.slider(id, "m", "Mass m", 0.5, 5, 0.5, "kg") +
        K.slider(id, "h", "Starting height h", 1, 5, 0.5, "m") +
        K.hint("note") +
        K.buttons([["play", "Release"], ["reset", "Reset"]]),
      readouts: [["y", "Height (m)"], ["v", "Speed (m/s)"], ["t", "Time (s)"],
                 ["pe", "PE = mgh (J)", "c-path"], ["ke", "KE = ½mv² (J)", "c-vy"], ["tot", "PE + KE (J)", "c-vx"]],
      cols: 3
    });

    function hEff() { return s.mode === "pendulum" ? Math.min(s.h, 3) : s.h; }
    function slideY(x) { return x >= SLIDE_L ? 0 : hEff() * (1 + Math.cos(Math.PI * x / SLIDE_L)) / 2; }
    function slideDY(x) { return x >= SLIDE_L ? 0 : -hEff() * Math.PI / (2 * SLIDE_L) * Math.sin(Math.PI * x / SLIDE_L); }

    function start() {
      st = { t: 0, done: false };
      if (s.mode === "fall") { st.y = hEff(); st.v = 0; }
      else if (s.mode === "pendulum") { st.th = Math.acos(1 - hEff() / LP); st.w = 0; }
      else { st.x = 0.05; }
      derive();
    }

    function derive() {
      if (s.mode === "pendulum") { st.y = LP * (1 - Math.cos(st.th)); st.v = LP * Math.abs(st.w); }
      else if (s.mode === "slide") { st.y = slideY(st.x); st.v = Math.sqrt(Math.max(0, 2 * G * (slideY(0.05) - st.y))); }
    }

    function step(dt) {
      st.t += dt;
      if (s.mode === "fall") {
        st.v += G * dt; st.y -= st.v * dt - 0.5 * G * dt * dt;
        if (st.y <= 0) { st.v = Math.sqrt(2 * G * hEff()); st.y = 0; st.done = true; }
      } else if (s.mode === "pendulum") {
        var n = 10, h = dt / n;
        for (var i = 0; i < n; i++) {   // RK4 for θ'' = −(g/L) sin θ
          var f = function (th) { return -(G / LP) * Math.sin(th); };
          var k1t = st.w, k1w = f(st.th);
          var k2t = st.w + h / 2 * k1w, k2w = f(st.th + h / 2 * k1t);
          var k3t = st.w + h / 2 * k2w, k3w = f(st.th + h / 2 * k2t);
          var k4t = st.w + h * k3w, k4w = f(st.th + h * k3t);
          st.th += h / 6 * (k1t + 2 * k2t + 2 * k3t + k4t); st.w += h / 6 * (k1w + 2 * k2w + 2 * k3w + k4w);
        }
        derive();
      } else {
        var n2 = 10, h2 = dt / n2;
        for (var j = 0; j < n2; j++) {
          var v = Math.sqrt(Math.max(1e-4, 2 * G * (slideY(0.05) - slideY(st.x))));
          st.x += v / Math.sqrt(1 + Math.pow(slideDY(st.x), 2)) * h2;
        }
        if (st.x >= SLIDE_END) { st.x = SLIDE_END; st.done = true; }
        derive();
      }
    }

    var clock = K.clock(function (dt) { step(dt * 0.7); update(); return !st.done && st.t < 30; });
    clock.onStop = function () { k.btn("play").textContent = "Release again"; };

    function update() {
      var pe = s.m * G * st.y, ke = 0.5 * s.m * st.v * st.v;
      k.set("y", K.fmt(st.y, 2)); k.set("v", K.fmt(st.v, 2)); k.set("t", K.fmt(st.t, 2));
      k.set("pe", K.fmt(pe)); k.set("ke", K.fmt(ke)); k.set("tot", K.fmt(pe + ke));
      k.el('[data-r="note"]').textContent = s.mode === "fall" ? "As the ball falls, potential energy turns into kinetic energy. The total stays " + K.fmt(s.m * G * hEff()) + " J."
        : s.mode === "pendulum" ? "Highest point: all potential energy. Lowest point: all kinetic energy. The total stays the same (no air resistance)." + (s.h > 3 ? " Height is capped at 3 m for the pendulum." : "")
        : "Whatever the shape of the slide, the speed at the bottom is √(2gh) = " + K.fmt(Math.sqrt(2 * G * hEff()), 2) + " m/s. Mass makes no difference.";
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var sceneW = W * 0.68, ground = H - 26, top = 16, ppm = s.mode === "slide" ? Math.min((ground - top) / 5.4, (sceneW - 40) / 11.5) : (ground - top) / 5.4;
      var X0 = 30;
      // Ground
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(sceneW, ground); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.font = "10px " + c.font; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (var m = 0; m <= 5; m++) { var yy = ground - m * ppm; ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X0, yy); ctx.lineTo(sceneW, yy); ctx.stroke(); ctx.fillText(m + " m", X0 - 4, yy); }
      var r = 7 + 4 * Math.cbrt(s.m), bx, by;
      if (s.mode === "fall") {
        bx = X0 + sceneW * 0.4;
        // A, B, C markers: top, halfway, ground
        [["A", hEff()], ["B", hEff() / 2], ["C", 0]].forEach(function (p) {
          var yy = ground - p[1] * ppm;
          ctx.strokeStyle = c.muted; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(bx + 18, yy); ctx.lineTo(bx + 60, yy); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = c.ink; ctx.font = "600 12px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(p[0], bx + 64, yy);
        });
        by = ground - st.y * ppm - r;
      } else if (s.mode === "pendulum") {
        var px = X0 + sceneW * 0.45, py = ground - (LP + 0.2) * ppm;
        bx = px + LP * Math.sin(st.th) * ppm; by = py + LP * Math.cos(st.th) * ppm;
        ctx.strokeStyle = c.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - 30, py); ctx.lineTo(px + 30, py); ctx.stroke();
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
        ctx.strokeStyle = c.line; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(px, py, LP * ppm, Math.PI / 2 - Math.acos(1 - hEff() / LP), Math.PI / 2 + Math.acos(1 - hEff() / LP)); ctx.stroke(); ctx.setLineDash([]);
        // Bob drawn with its centre on the arc; the arc's lowest point sits 0.2 m above ground
        by -= 0;
      } else {
        ctx.strokeStyle = c.line; ctx.lineWidth = 6; ctx.beginPath();
        for (var i = 0; i <= 60; i++) { var x = SLIDE_END * i / 60; var Y = ground - slideY(x) * ppm; i ? ctx.lineTo(X0 + x * ppm, Y) : ctx.moveTo(X0 + x * ppm, Y); }
        ctx.stroke();
        bx = X0 + st.x * ppm; by = ground - slideY(st.x) * ppm - r;
      }
      ctx.fillStyle = c.vy; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill();

      // Energy bars on the right
      var total = s.m * G * hEff(), pe = s.m * G * st.y, ke = 0.5 * s.m * st.v * st.v;
      var bx0 = sceneW + 30, bw = (W - bx0 - 16) / 3 - 8, base = ground, full = ground - top - 30;
      [["PE", pe, c.path], ["KE", ke, c.vy], ["Sum", pe + ke, c.vx]].forEach(function (b, i) {
        var x = bx0 + i * (bw + 8), hgt = full * b[1] / total;
        ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(x, base - full, bw, full);
        ctx.fillStyle = b[2]; ctx.fillRect(x, base - hgt, bw, hgt);
        ctx.fillStyle = c.ink; ctx.font = "600 11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(b[0], x + bw / 2, base + 4);
      });
      ctx.fillStyle = c.muted; ctx.font = "10px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText("energy (J)", bx0, base - full - 4);
    };

    var shows = {};
    ["m", "h"].forEach(function (key) { shows[key] = k.bindSlider(key, function () { return s[key]; }, function (v) { s[key] = v; reset(); }); });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; reset(); });

    function reset() { clock.stop(); start(); k.btn("play").textContent = "Release"; update(); }
    function play() {
      if (clock.running) { clock.stop(); k.btn("play").textContent = "Resume"; return; }
      if (st.done) start();
      k.btn("play").textContent = "Pause";
      clock.start();
    }
    k.onAct({ play: play, reset: reset });
    start(); update();

    return {
      set: function (o) { Object.assign(s, o); Object.keys(shows).forEach(function (q) { shows[q](); }); showM(); reset(); },
      seek: function (t) { clock.stop(); start(); var n = Math.round(t / 0.005); for (var i = 0; i < n && !st.done; i++) step(0.005); update(); },
      play: function () { reset(); play(); }
    };
  }

  window.ConserveSim = { mount: mount };
})();
