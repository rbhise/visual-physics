/*
 * Game: Hit the Target. Choose the launch angle and speed, fire, and land the ball in the target.
 * Three shots per target. Hits score more the fewer shots you use; from level 4 a wall stands in the way.
 * Physics: projectile motion with g = 9.8 m/s². Range on level ground R = u² sin 2θ ÷ g.
 * Needs sim-kit.js.  TargetGame.mount(el)
 */
(function () {
  "use strict";
  var K = window.SimKit, G = 9.8, XMAX = 100;

  function store(key, val) { try { if (val === undefined) return +(localStorage.getItem(key) || 0); localStorage.setItem(key, val); } catch (e) { return 0; } }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function mount(root) {
    var id = root.id || "tg";
    var s = { ang: 45, u: 20, level: 1, score: 0, shots: 3, best: store("vp-target-best"), shotsLog: [], ball: null, hint: null, over: false, msg: "" };

    var k = K.frame(root, {
      aspect: window.matchMedia("(max-width: 600px)").matches ? "4 / 3" : "5 / 2.6",
      label: "A launcher on the left, a target on the ground and the paths of your shots",
      panel: K.slider(id, "ang", "Launch angle θ", 5, 85, 1, "°") + K.slider(id, "u", "Launch speed u", 10, 35, 0.5, "m/s") +
        K.buttons([["fire", "Fire!"], ["hint", "Hint (−20)"], ["new", "New game"]]) + K.hint("note"),
      readouts: [["level", "Level", "c-path"], ["target", "Target at"], ["shots", "Shots left"],
                 ["score", "Score", "c-vy"], ["best", "Best score"], ["last", "Last shot", "wrap"]],
      cols: 3
    });

    function newTarget() {
      var n = s.level;
      s.tx = Math.round(rnd(Math.min(20 + 3 * n, 60), Math.min(55 + 5 * n, 92)) * 2) / 2;
      s.tw = Math.max(2.5, 8 - 0.7 * n);
      s.wall = null;
      if (n >= 4) for (var tries = 0; tries < 40 && !s.wall; tries++) {
        var w = { x: Math.round(s.tx * rnd(0.4, 0.65)), h: Math.round(rnd(8, Math.min(12 + 2 * n, 26)) - tries * 0.4) };
        if (clearable(w)) s.wall = w;
      }
      s.shots = 3; s.shotsLog = []; s.hint = null;
    }
    // is there some angle (5–85°) and speed (10–35 m/s) that lands on the target and clears the wall with room to spare?
    function clearable(w) {
      for (var a = 5; a <= 85; a++) {
        var th = a * Math.PI / 180, u = Math.sqrt(s.tx * G / Math.sin(2 * th));
        if (u < 10 || u > 35) continue;
        if (w.x * Math.tan(th) * (1 - w.x / s.tx) >= w.h + 1) return true;
      }
      return false;
    }
    function newGame() { s.level = 1; s.score = 0; s.over = false; s.msg = "Set the angle and speed, then press Fire!"; newTarget(); update(); }

    function flight(ang, u) {   // where the shot ends: { x, wall: bool, T }
      var th = ang * Math.PI / 180, ux = u * Math.cos(th), uy = u * Math.sin(th), T = 2 * uy / G, R = ux * T;
      if (s.wall && R > s.wall.x) { var tw = s.wall.x / ux, yw = uy * tw - G * tw * tw / 2; if (yw < s.wall.h) return { x: s.wall.x, wall: true, T: tw, y: Math.max(0, yw) }; }
      return { x: R, wall: false, T: T, y: 0 };
    }

    function update() {
      k.set("level", s.level); k.set("target", K.fmt(s.tx, 1) + " m"); k.set("shots", s.over ? "–" : s.shots);
      k.set("score", s.score); k.set("best", Math.max(s.best, s.score)); k.set("last", s.last || "–");
      k.el('[data-r="note"]').textContent = s.msg;
      k.btn("fire").disabled = s.over || !!s.ball; k.btn("hint").disabled = s.over || !!s.ball || s.hint !== null;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var narrow = W < 520, gy = H - 28, x0 = narrow ? 24 : 36, sc = (W - x0 - 14) / XMAX;
      var X = function (x) { return x0 + x * sc; }, Y = function (y) { return gy - y * sc; };
      // sky grid
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      for (var gx = 0; gx <= XMAX; gx += 10) { ctx.beginPath(); ctx.moveTo(X(gx), gy); ctx.lineTo(X(gx), 8); ctx.stroke(); }
      ctx.fillStyle = c.muted; ctx.font = "10px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (gx = 0; gx <= XMAX; gx += narrow ? 20 : 10) ctx.fillText(gx + " m", X(gx), gy + 6);
      // ground
      ctx.fillStyle = c.line; ctx.fillRect(0, gy, W, 3);
      // target
      var tl = X(s.tx - s.tw / 2), tr = X(s.tx + s.tw / 2);
      ctx.fillStyle = c.good; ctx.globalAlpha = 0.25; ctx.fillRect(tl, gy - 10, tr - tl, 10); ctx.globalAlpha = 1;
      ctx.fillStyle = c.good; ctx.fillRect(tl, gy - 3, tr - tl, 4);
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(s.tx), gy); ctx.lineTo(X(s.tx), gy - 34); ctx.stroke();
      ctx.fillStyle = c.bad; ctx.beginPath(); ctx.moveTo(X(s.tx), gy - 34); ctx.lineTo(X(s.tx) + 16, gy - 28); ctx.lineTo(X(s.tx), gy - 22); ctx.closePath(); ctx.fill();
      // wall
      if (s.wall) { ctx.fillStyle = c.ink; ctx.fillRect(X(s.wall.x) - 4, Y(s.wall.h), 8, gy - Y(s.wall.h)); ctx.fillStyle = c.muted; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(s.wall.h + " m", X(s.wall.x), Y(s.wall.h) - 3); }
      // earlier shots on this target
      function path(ang, u, upto, col, dash) {
        if (!(upto > 0)) return;
        var th = ang * Math.PI / 180, ux = u * Math.cos(th), uy = u * Math.sin(th);
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash ? [5, 5] : []); ctx.beginPath();
        for (var t = 0; t <= upto + 1e-9; t += upto / 80) { var px = X(ux * t), py = Y(Math.max(0, uy * t - G * t * t / 2)); t ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke(); ctx.restore();
      }
      s.shotsLog.forEach(function (q) { ctx.globalAlpha = 0.35; path(q.ang, q.u, q.T, c.path, false); ctx.globalAlpha = 1; });
      // current flight
      if (s.ball) {
        var b = s.ball, th = b.ang * Math.PI / 180, t = Math.min(b.t, b.T);
        path(b.ang, b.u, t, c.path, false);
        var bx = X(b.u * Math.cos(th) * t), by = Y(Math.max(0, b.u * Math.sin(th) * t - G * t * t / 2));
        ctx.fillStyle = c.vy; ctx.beginPath(); ctx.arc(bx, Math.max(6, by), 6, 0, Math.PI * 2); ctx.fill();
        if (by < 0) { ctx.fillStyle = c.muted; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("▲", bx, 2); }
      }
      // launcher
      var th0 = s.ang * Math.PI / 180, L = 26;
      ctx.strokeStyle = c.ink; ctx.lineWidth = 8; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(X(0), gy - 4); ctx.lineTo(X(0) + L * Math.cos(th0), gy - 4 - L * Math.sin(th0)); ctx.stroke(); ctx.lineCap = "butt";
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(X(0), gy - 4, 9, Math.PI, 0); ctx.fill();
      // game over / banner
      if (s.over || s.banner) {
        ctx.fillStyle = c.surface; ctx.globalAlpha = 0.88; ctx.fillRect(W / 2 - 150, H * 0.18, 300, 70); ctx.globalAlpha = 1;
        ctx.strokeStyle = s.over ? c.bad : c.good; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 150, H * 0.18, 300, 70);
        ctx.fillStyle = s.over ? c.bad : c.good; ctx.font = "700 20px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(s.over ? "Game over" : s.banner, W / 2, H * 0.18 + 24);
        ctx.fillStyle = c.ink; ctx.font = "13px " + c.font; ctx.fillText(s.over ? "Score " + s.score + " · press New game" : "Level " + s.level, W / 2, H * 0.18 + 50);
      }
    };

    var showA = k.bindSlider("ang", function () { return s.ang; }, function (v) { s.ang = v; s.hint = null; update(); }, function (v) { return v + "°"; });
    var showU = k.bindSlider("u", function () { return s.u; }, function (v) { s.u = v; s.hint = null; update(); }, function (v) { return (+v).toFixed(1) + " m/s"; });

    var clock = K.clock(function (dt) {
      var b = s.ball; b.t += dt * 1.6;
      if (b.t < b.T) { k.redraw(); return true; }
      land(b); return false;
    });
    function land(b) {
      s.ball = null; s.shotsLog.push({ ang: b.ang, u: b.u, T: b.T }); s.shots--;
      var hit = !b.wall && Math.abs(b.x - s.tx) <= s.tw / 2;
      if (hit) {
        var pts = [100, 60, 30][2 - s.shots] + 10 * s.level;
        s.score += pts; s.last = "Hit! +" + pts; s.msg = "Bullseye! Landed at " + K.fmt(b.x, 1) + " m. On to level " + (s.level + 1) + ".";
        s.banner = "Hit! +" + pts; s.level++; newTarget();
        setTimeout(function () { s.banner = null; k.redraw(); }, 1200);
      } else {
        var d = b.x - s.tx;
        s.last = b.wall ? "Hit the wall" : (d < 0 ? "Short by " : "Long by ") + K.fmt(Math.abs(d), 1) + " m";
        s.msg = b.wall ? "The ball hit the wall at height " + K.fmt(b.y, 1) + " m. Try a steeper angle or more speed." : "Landed at " + K.fmt(b.x, 1) + " m. " + (d < 0 ? "Aim further: more speed, or an angle closer to 45°." : "Too far: less speed, or move the angle away from 45°.");
        if (s.shots <= 0) { s.over = true; s.msg = "Out of shots. Final score " + s.score + ". The target was at " + K.fmt(s.tx, 1) + " m."; if (s.score > s.best) { s.best = s.score; store("vp-target-best", s.score); } }
      }
      update();
    }
    function fire() {
      if (s.over || s.ball) return;
      var f = flight(s.ang, s.u);
      s.ball = { ang: s.ang, u: s.u, t: 0, T: f.T, x: f.x, wall: f.wall, y: f.y };
      s.hint = null; update();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { s.ball.t = f.T; land(s.ball); } else clock.start();
    }
    k.onAct({
      fire: fire,
      hint: function () {
        var R = s.u * s.u * Math.sin(2 * s.ang * Math.PI / 180) / G;
        s.score = Math.max(0, s.score - 20); s.hint = R;
        s.msg = "Hint: R = u² sin 2θ ÷ g = " + K.fmt(s.u, 1) + "² × sin " + 2 * s.ang + "° ÷ 9.8 = " + K.fmt(R, 1) + " m" + (s.wall ? " (if the wall were not there)." : ".");
        update();
      },
      "new": function () { clock.stop(); s.ball = null; newGame(); }
    });
    root.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.type === "range") fire(); });

    newGame();
    return { state: function () { return s; }, fire: fire, set: function (o) { Object.assign(s, o); showA(); showU(); update(); }, flight: flight };
  }

  window.TargetGame = { mount: mount };
})();
