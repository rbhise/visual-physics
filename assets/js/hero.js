/*
 * Home page toy: drag back from the ball and let go to throw it through the rings.
 * A dotted line predicts the path while you aim. Real projectile motion with a bounce.
 * Keyboard: the "Throw for me" button launches a ball at a ring.
 */
(function () {
  "use strict";
  var cv = document.getElementById("toy");
  if (!cv) return;
  var ctx = cv.getContext("2d"), W = 0, H = 0, dpr = 1;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PX = 40, G = 9.8 * PX;            // 40 px per metre
  var RING_COLS = ["--c-motion", "--c-energy", "--c-light", "--c-sound", "--c-matter", "--c-acids"];
  var st = { ball: null, trail: [], rings: [], bursts: [], hits: 0, aim: null, touched: false, last: 0, idle: 0, msg: "" };
  var readout = document.getElementById("toy-readout"), counter = document.getElementById("toy-hits");

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function home() { return { x: Math.max(44, W * 0.1), y: H - 34 }; }
  function size() {
    var r = cv.getBoundingClientRect(); dpr = window.devicePixelRatio || 1; W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    if (!st.rings.length) for (var i = 0; i < 3; i++) addRing(i);
    draw();
  }
  function addRing(i) {
    var h = home(), tries = 0, x, y;
    do { x = W * (0.38 + Math.random() * 0.55); y = H * (0.18 + Math.random() * 0.5); tries++; }
    while (tries < 20 && st.rings.some(function (r) { return Math.hypot(r.x - x, r.y - y) < 90; }));
    st.rings.push({ x: x, y: y, r: Math.max(18, Math.min(30, W * 0.045)), col: RING_COLS[(st.hits + (i || 0)) % RING_COLS.length], born: performance.now() });
    void h;
  }

  function launch(vx, vy) {
    var h = home();
    st.ball = { x: h.x, y: h.y, vx: vx, vy: vy, bounces: 0 }; st.trail = [];
    var v = Math.hypot(vx, vy) / PX, ang = Math.atan2(-vy, vx) * 180 / Math.PI;
    if (readout) readout.textContent = "Thrown at " + v.toFixed(1) + " m/s, " + Math.round(ang) + "° above the ground";
    if (reduce) { simulate(3); draw(); } else if (!st.running) { st.running = true; st.last = performance.now(); requestAnimationFrame(tick); }
  }
  // aim at a ring: pick an angle of 55° and solve for the speed that passes through it
  function autoThrow() {
    var h = home(), r = st.rings[Math.floor(Math.random() * st.rings.length)], dx = r.x - h.x, dy = h.y - r.y;
    var th = Math.max(Math.atan2(dy, dx) + 0.35, 0.75);
    var u = Math.sqrt(G * dx * dx / Math.max(1, 2 * Math.cos(th) * Math.cos(th) * (dx * Math.tan(th) - dy)));
    launch(u * Math.cos(th), -u * Math.sin(th));
  }

  function step(dt) {
    var b = st.ball; if (!b) return;
    b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
    st.trail.push([b.x, b.y]); if (st.trail.length > 90) st.trail.shift();
    var gy = H - 26;
    if (b.y > gy) { b.y = gy; b.vy *= -0.5; b.vx *= 0.75; b.bounces++; if (Math.abs(b.vy) < 40 || b.bounces > 3) { st.ball = null; } }
    if (b && (b.x > W + 30 || b.x < -30)) st.ball = null;
    if (!b) return;
    for (var i = st.rings.length - 1; i >= 0; i--) {
      var r = st.rings[i];
      if (Math.hypot(b.x - r.x, b.y - r.y) < r.r) {
        st.rings.splice(i, 1); st.hits++; burst(r);
        if (counter) counter.textContent = st.hits === 1 ? "1 ring" : st.hits + " rings";
        addRing(i);
      }
    }
  }
  function simulate(seconds) { for (var t = 0; t < seconds && st.ball; t += 1 / 120) step(1 / 120); }
  function burst(r) { for (var i = 0; i < 14; i++) { var a = i / 14 * Math.PI * 2; st.bursts.push({ x: r.x, y: r.y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.6, col: r.col }); } }

  function tick(now) {
    var dt = Math.min(0.033, (now - st.last) / 1000); st.last = now;
    step(dt);
    st.bursts.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; });
    st.bursts = st.bursts.filter(function (p) { return p.life > 0; });
    if (!st.touched && !st.ball && !st.aim) { st.idle += dt; if (st.idle > 2.2) { st.idle = 0; autoThrow(); } }
    draw();
    requestAnimationFrame(tick);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var paper = css("--surface"), grid = css("--grid"), ink = css("--ink"), muted = css("--muted"), path = css("--path"), vy = css("--vy");
    ctx.fillStyle = paper; ctx.fillRect(0, 0, W, H);
    // graph paper: minor every 20 px, major every metre (40 px)
    for (var x = 0; x < W; x += 20) { ctx.fillStyle = grid; ctx.globalAlpha = x % 40 ? 0.6 : 1; ctx.fillRect(x, 0, 1, H); }
    for (var y = H - 26; y > 0; y -= 20) { ctx.globalAlpha = (H - 26 - y) % 40 ? 0.6 : 1; ctx.fillRect(0, y, W, 1); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = ink; ctx.fillRect(0, H - 26, W, 2);
    // rings
    var now = performance.now();
    st.rings.forEach(function (r) {
      var grow = Math.min(1, (now - r.born) / 300), col = css(r.col);
      ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(r.x, r.y, r.r * grow, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.12; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
    });
    st.bursts.forEach(function (p) { ctx.globalAlpha = Math.max(0, p.life / 0.6); ctx.fillStyle = css(p.col); ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    // trail
    if (st.trail.length > 1) {
      ctx.strokeStyle = path; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath();
      st.trail.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke();
    }
    var h = home();
    // aiming: rubber band, predicted path
    if (st.aim) {
      var vx = (h.x - st.aim.x) * 4.2, vyv = (h.y - st.aim.y) * 4.2;
      ctx.strokeStyle = muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(st.aim.x, st.aim.y); ctx.stroke();
      ctx.fillStyle = path; ctx.globalAlpha = 0.85;
      for (var t = 0.05; t < 1.6; t += 0.05) { var px = h.x + vx * t, py = h.y + vyv * t + G * t * t / 2; if (py > H - 26 || px > W) break; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      var v = Math.hypot(vx, vyv) / PX, ang = Math.atan2(-vyv, vx) * 180 / Math.PI;
      ctx.fillStyle = ink; ctx.font = "600 13px " + css("--font-data"); ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(v.toFixed(1) + " m/s at " + Math.round(ang) + "°", 12, 12);
    }
    // launcher pad and ball at rest
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(h.x, h.y + 8, 14, Math.PI, 0); ctx.fill();
    var bx = st.ball ? st.ball.x : st.aim ? st.aim.x : h.x, by = st.ball ? st.ball.y : st.aim ? st.aim.y : h.y;
    ctx.fillStyle = vy; ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
    if (!st.touched && !st.aim) {
      ctx.fillStyle = muted; ctx.font = "15px " + css("--font-body"); ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText("Drag the ball back, then let go", h.x + 26, h.y - 40);
    }
  }

  function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  cv.addEventListener("pointerdown", function (e) {
    var p = pos(e), h = home();
    if (Math.hypot(p.x - h.x, p.y - h.y) > 80) return;
    st.touched = true; st.aim = p; cv.setPointerCapture(e.pointerId); draw();
    if (!st.running && !reduce) { st.running = true; st.last = performance.now(); requestAnimationFrame(tick); }
  });
  cv.addEventListener("pointermove", function (e) {
    if (!st.aim) return; var p = pos(e), h = home(), dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy), max = Math.min(160, W * 0.3);
    if (d > max) { p.x = h.x + dx / d * max; p.y = h.y + dy / d * max; }
    st.aim = p; if (reduce) draw();
  });
  cv.addEventListener("pointerup", function () {
    if (!st.aim) return; var h = home(), vx = (h.x - st.aim.x) * 4.2, vy = (h.y - st.aim.y) * 4.2; st.aim = null;
    if (Math.hypot(vx, vy) > 60) launch(vx, vy); else draw();
  });
  var btn = document.getElementById("toy-throw");
  if (btn) btn.addEventListener("click", function () { st.touched = true; autoThrow(); });

  if (window.ResizeObserver) new ResizeObserver(size).observe(cv); else window.addEventListener("resize", size);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", draw);
  size();
  if (!reduce) { st.running = true; st.last = performance.now(); requestAnimationFrame(tick); }
  window.heroToy = { state: st, autoThrow: autoThrow };
})();
