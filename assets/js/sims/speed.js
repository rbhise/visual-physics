/*
 * Speed vs velocity: a cyclist on a map, moving at a steady speed along a chosen route.
 * Usage:
 *   const sim = SpeedSim.mount(document.getElementById("sim"), { route: "track", speed: 5 });
 *   sim.route("backforth", true);   // second argument starts riding immediately
 *   sim.speed(8);
 * The ink arrow on the cyclist is the velocity: its length is the speed, its direction the direction of motion.
 */
(function () {
  "use strict";

  var WORLD = { w: 100, h: 60 };

  function circle(cx, cy, r, from, to, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var a = (from + (to - from) * i / n) * Math.PI / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }

  var ROUTES = {
    straight:  { label: "Straight road", pts: [[10, 30], [90, 30]],
                 note: "Same speed, same direction the whole way, so the velocity never changes." },
    backforth: { label: "There and back", pts: [[15, 30], [75, 30], [15, 30]],
                 note: "At the turn the direction reverses. The speed is the same, but the velocity has changed." },
    track:     { label: "Circular track", pts: circle(50, 30, 22, -90, 270, 120),
                 note: "The speed stays the same, but the direction turns all the time, so the velocity keeps changing." }
  };

  function segLen(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }
  function pathLen(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += segLen(pts[i - 1], pts[i]); return L; }

  // Position and unit direction after travelling distance d along the route
  function pointAt(pts, d) {
    for (var i = 1; i < pts.length; i++) {
      var l = segLen(pts[i - 1], pts[i]);
      if (d <= l || i === pts.length - 1) {
        var f = l ? Math.min(1, d / l) : 0;
        var ux = l ? (pts[i][0] - pts[i - 1][0]) / l : 1, uy = l ? (pts[i][1] - pts[i - 1][1]) / l : 0;
        return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f, ux: ux, uy: uy, seg: i };
      }
      d -= l;
    }
  }

  function direction(dx, dy) {
    if (Math.hypot(dx, dy) < 0.05) return "";
    if (Math.abs(dy) < 0.05) return dx > 0 ? "E" : "W";
    if (Math.abs(dx) < 0.05) return dy > 0 ? "N" : "S";
    var a = Math.atan(Math.abs(dy) / Math.abs(dx)) * 180 / Math.PI;
    return Math.round(a) + "° " + (dy > 0 ? "N" : "S") + " of " + (dx > 0 ? "E" : "W");
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "ssim";
    var routeName = opts.route || "track", speed = opts.speed || 5;
    var pts = ROUTES[routeName].pts, d = 0, t = 0, running = false, last = 0, gen = 0;

    root.classList.add("sim");
    root.innerHTML =
      '<div class="sim-body">' +
        '<div class="sim-stage"><canvas role="img" aria-label="Top view of a cyclist moving along a route, with a velocity arrow"></canvas></div>' +
        '<div class="sim-panel">' +
          '<div><div class="seg-label">Route</div><div class="preset-list">' +
            Object.keys(ROUTES).map(function (k) { return '<button type="button" class="chip" data-route="' + k + '" aria-pressed="false">' + ROUTES[k].label + '</button>'; }).join("") +
          '</div></div>' +
          '<div class="ctl"><label for="' + id + '-speed">Speed <output id="' + id + '-speed-out"></output></label>' +
            '<input type="range" id="' + id + '-speed" min="1" max="10" step="0.5"></div>' +
          '<p class="sim-hint" data-r="note"></p>' +
          '<div class="btns"><button type="button" class="btn primary" data-act="go">Ride</button>' +
          '<button type="button" class="btn" data-act="reset">Reset</button></div>' +
        '</div>' +
        '<div class="sim-readout two-rows" style="--cols:3">' +
          cell("t", "Time (s)", "") + cell("dist", "Distance (m)", "c-path") + cell("disp", "Displacement (m)", "c-vx") +
          cell("spd", "Speed (m/s)", "") + cell("avs", "Avg speed (m/s)", "") + cell("avv", "Avg velocity (m/s)", "wrap") +
        '</div>' +
      '</div>';

    function cell(k, label, cls) { return '<div><span>' + label + '</span><b data-r="' + k + '" class="' + cls + '">0.0</b></div>'; }

    var canvas = root.querySelector("canvas"), ctx = canvas.getContext("2d");
    var stage = root.querySelector(".sim-stage");
    stage.style.aspectRatio = "5 / 3.2";
    var goBtn = root.querySelector('[data-act="go"]');
    var slider = root.querySelector('input[type="range"]');
    var R = {};
    root.querySelectorAll("[data-r]").forEach(function (e) { R[e.dataset.r] = e; });
    var W = 0, Hc = 0, dpr = 1;

    function total() { return pathLen(pts); }

    function update() {
      var p = pointAt(pts, d);
      var dx = p.x - pts[0][0], dy = p.y - pts[0][1], disp = Math.hypot(dx, dy);
      R.t.textContent = t.toFixed(1);
      R.dist.textContent = d.toFixed(1);
      R.disp.textContent = disp.toFixed(1);
      R.spd.textContent = (d > 0 && d < total() || running ? speed : 0).toFixed(1);
      R.avs.textContent = t > 0 ? (d / t).toFixed(1) : "–";
      R.avv.textContent = t > 0 ? (disp / t).toFixed(1) + (disp / t >= 0.05 ? " " + direction(dx, dy) : "") : "–";
      document.getElementById(id + "-speed-out").textContent = speed + " m/s (" + (speed * 3.6).toFixed(0) + " km/h)";
      slider.value = speed;
      R.note.textContent = ROUTES[routeName].note;
      root.querySelectorAll("[data-route]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.route === routeName); });
      draw();
    }

    function stop() { running = false; gen++; goBtn.textContent = "Ride"; }

    function go() {
      if (running) { stop(); goBtn.textContent = "Resume"; return; }
      if (d >= total()) { d = 0; t = 0; }
      running = true; goBtn.textContent = "Pause";
      last = performance.now();
      var my = ++gen;
      requestAnimationFrame(function step(now) {
        if (!running || my !== gen) return;
        var dt = Math.min(0.05, (now - last) / 1000);
        t += dt; d += dt * speed;
        last = now;
        if (d >= total()) { t -= (d - total()) / speed; d = total(); running = false; goBtn.textContent = "Ride again"; }
        update();
        if (running) requestAnimationFrame(step);
      });
    }

    function setRoute(name) { stop(); routeName = name; pts = ROUTES[name].pts; d = 0; t = 0; update(); }

    root.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b || !root.contains(b)) return;
      if (b.dataset.route) setRoute(b.dataset.route);
      else if (b.dataset.act === "go") go();
      else if (b.dataset.act === "reset") { stop(); d = 0; t = 0; update(); }
    });
    slider.addEventListener("input", function () { speed = +slider.value; update(); });

    // Drawing
    function colors() {
      var cs = getComputedStyle(root), c = {};
      ["surface", "ink", "muted", "line", "grid", "path", "vx", "vy"].forEach(function (k) { c[k] = cs.getPropertyValue("--" + k).trim(); });
      c.font = cs.getPropertyValue("--font-data");
      return c;
    }

    function view() {
      var pad = 18, k = Math.min((W - 2 * pad) / WORLD.w, (Hc - 2 * pad) / WORLD.h);
      var ox = (W - WORLD.w * k) / 2, oy = (Hc - WORLD.h * k) / 2;
      return { k: k, X: function (x) { return ox + x * k; }, Y: function (y) { return oy + (WORLD.h - y) * k; } };
    }

    function arrow(x1, y1, x2, y2, col, w) {
      var len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 3) return;
      var a = Math.atan2(y2 - y1, x2 - x1), hd = Math.min(13, len * 0.4);
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hd * 0.6, y2 - Math.sin(a) * hd * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hd * Math.cos(a - 0.42), y2 - hd * Math.sin(a - 0.42));
      ctx.lineTo(x2 - hd * Math.cos(a + 0.42), y2 - hd * Math.sin(a + 0.42));
      ctx.closePath(); ctx.fill();
    }

    function draw() {
      if (!W) return;
      var c = colors(), v = view();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = c.surface; ctx.fillRect(0, 0, W, Hc);
      for (var gx = 0; gx <= WORLD.w; gx += 5) {
        ctx.strokeStyle = gx % 10 ? c.grid : c.line; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(v.X(gx), v.Y(0)); ctx.lineTo(v.X(gx), v.Y(WORLD.h)); ctx.stroke();
      }
      for (var gy = 0; gy <= WORLD.h; gy += 5) {
        ctx.strokeStyle = gy % 10 ? c.grid : c.line;
        ctx.beginPath(); ctx.moveTo(v.X(0), v.Y(gy)); ctx.lineTo(v.X(WORLD.w), v.Y(gy)); ctx.stroke();
      }
      // Compass and scale bar
      ctx.font = "600 12px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      var cx = v.X(WORLD.w) - 16, cy = v.Y(WORLD.h) + 26;
      arrow(cx, cy + 10, cx, cy - 10, c.muted, 1.5);
      ctx.fillText("N", cx, cy - 20);
      var sx = v.X(2), sy = v.Y(2);
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx, sy); ctx.lineTo(sx + 10 * v.k, sy); ctx.lineTo(sx + 10 * v.k, sy - 4); ctx.stroke();
      ctx.fillStyle = c.ink; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText("10 m", sx + 10 * v.k + 6, sy + 2);

      // Route (road) and travelled path
      ctx.strokeStyle = c.line; ctx.lineWidth = 14; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath(); pts.forEach(function (q, i) { i ? ctx.lineTo(v.X(q[0]), v.Y(q[1])) : ctx.moveTo(v.X(q[0]), v.Y(q[1])); }); ctx.stroke();
      var p = pointAt(pts, d);
      if (d > 0) {
        ctx.strokeStyle = c.path; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(v.X(pts[0][0]), v.Y(pts[0][1]));
        for (var i = 1; i < p.seg; i++) ctx.lineTo(v.X(pts[i][0]), v.Y(pts[i][1]));
        ctx.lineTo(v.X(p.x), v.Y(p.y)); ctx.stroke();
        arrow(v.X(pts[0][0]), v.Y(pts[0][1]), v.X(p.x), v.Y(p.y), c.vx, 3);
      }
      // Start
      ctx.fillStyle = c.ink;
      ctx.beginPath(); ctx.arc(v.X(pts[0][0]), v.Y(pts[0][1]), 5, 0, 7); ctx.fill();
      ctx.font = "600 12px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("Start", v.X(pts[0][0]) + 8, v.Y(pts[0][1]) + 8);

      // Cyclist and velocity arrow (length grows with speed)
      var bx = v.X(p.x), by = v.Y(p.y), L = (12 + speed * 5.5) * v.k / 4.5;
      if (d < total() || running) arrow(bx, by, bx + p.ux * L, by - p.uy * L, c.ink, 3.5);
      ctx.fillStyle = c.vy; ctx.strokeStyle = c.surface; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(bx, by, 8, 0, 7); ctx.fill(); ctx.stroke();
      if (d < total() || running) {
        ctx.fillStyle = c.ink; ctx.font = "italic 600 14px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("v", bx + p.ux * (L + 12), by - p.uy * (L + 12));
      }
    }

    function resize() {
      var r = stage.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1; W = r.width; Hc = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hc * dpr);
      draw();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", draw);
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

    // Open part-way round the track so the first view already shows the arrows
    if (opts.startAt != null) { d = Math.min(total(), opts.startAt); t = d / speed; }
    update();
    resize();

    return {
      route: function (name, go_) { setRoute(name); if (go_) go(); },
      speed: function (s) { speed = s; update(); }
    };
  }

  window.SpeedSim = { mount: mount };
})();
