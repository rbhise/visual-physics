/*
 * Distance vs displacement on a map.
 * Usage:
 *   const sim = DisplacementSim.mount(document.getElementById("sim"), { preset: "lshape" });
 *   sim.preset("roundtrip", true);   // second argument starts walking immediately
 * The student can also tap the map to add turning points to the route.
 */
(function () {
  "use strict";

  var WORLD = { w: 100, h: 60 };   // metres
  var SNAP = 5;

  function circle(cx, cy, r, from, to, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var a = (from + (to - from) * i / n) * Math.PI / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }

  var PRESETS = {
    straight:  { label: "Straight walk", pts: [[15, 30], [85, 30]] },
    roundtrip: { label: "There and back", pts: [[15, 30], [85, 30], [15, 30]] },
    lshape:    { label: "40 m east, 30 m north", pts: [[25, 10], [65, 10], [65, 40]] },
    park:      { label: "Lap of a park", pts: [[20, 10], [80, 10], [80, 50], [20, 50], [20, 10]] },
    halfLap:   { label: "Half lap of a track", pts: circle(50, 30, 20, 180, 360, 48) },
    fullLap:   { label: "Full lap of a track", pts: circle(50, 30, 20, 180, 540, 96) },
    schoolA:   { label: "To school: route A", pts: [[10, 10], [80, 10], [80, 45]], ghost: [[10, 10], [10, 52], [60, 52], [60, 45], [80, 45]], end: "School" },
    schoolB:   { label: "To school: route B", pts: [[10, 10], [10, 52], [60, 52], [60, 45], [80, 45]], ghost: [[10, 10], [80, 10], [80, 45]], end: "School" }
  };

  function segLen(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }
  function pathLen(pts) { var L = 0; for (var i = 1; i < pts.length; i++) L += segLen(pts[i - 1], pts[i]); return L; }

  // Position after walking distance d along the route
  function pointAt(pts, d) {
    for (var i = 1; i < pts.length; i++) {
      var l = segLen(pts[i - 1], pts[i]);
      if (d <= l || i === pts.length - 1) {
        var f = l ? Math.min(1, d / l) : 0;
        return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f, i];
      }
      d -= l;
    }
    return [pts[0][0], pts[0][1], 1];
  }

  function direction(dx, dy) {
    if (Math.hypot(dx, dy) < 0.05) return "none";
    if (Math.abs(dy) < 0.05) return dx > 0 ? "East" : "West";
    if (Math.abs(dx) < 0.05) return dy > 0 ? "North" : "South";
    var a = Math.atan(Math.abs(dy) / Math.abs(dx)) * 180 / Math.PI;
    return Math.round(a) + "° " + (dy > 0 ? "N" : "S") + " of " + (dx > 0 ? "E" : "W");
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "dsim";
    var pts = [], ghost = null, endLabel = null, walked = 0, running = false, last = 0, gen = 0, speed = 12, presetName = null;

    root.classList.add("sim");
    root.innerHTML =
      '<div class="sim-body">' +
        '<div class="sim-stage"><canvas role="img" aria-label="Map with a walking route. Tap to add turning points."></canvas></div>' +
        '<div class="sim-panel">' +
          '<div><div class="seg-label">Pick a route</div><div class="preset-list">' +
            Object.keys(PRESETS).map(function (k) { return '<button type="button" class="chip" data-preset="' + k + '" aria-pressed="false">' + PRESETS[k].label + '</button>'; }).join("") +
          '</div></div>' +
          '<p class="sim-hint">Or tap the map to draw your own route. Each tap adds a turn.</p>' +
          '<div class="btns"><button type="button" class="btn primary" data-act="walk">Walk</button>' +
          '<button type="button" class="btn" data-act="undo">Undo</button>' +
          '<button type="button" class="btn" data-act="clear">Clear</button></div>' +
        '</div>' +
        '<div class="sim-readout" style="--cols:3">' +
          '<div><span>Distance (m)</span><b data-r="dist" class="c-path">0.0</b></div>' +
          '<div><span>Displacement (m)</span><b data-r="disp" class="c-vx">0.0</b></div>' +
          '<div><span>Direction</span><b data-r="dir">none</b></div>' +
        '</div>' +
      '</div>';

    var canvas = root.querySelector("canvas"), ctx = canvas.getContext("2d");
    var stage = root.querySelector(".sim-stage");
    stage.style.aspectRatio = "5 / 3.2";   // match the 100 m × 60 m map so it fills phones
    var walkBtn = root.querySelector('[data-act="walk"]');
    var R = { dist: root.querySelector('[data-r="dist"]'), disp: root.querySelector('[data-r="disp"]'), dir: root.querySelector('[data-r="dir"]') };
    var W = 0, Hc = 0, dpr = 1;

    function view() {
      var pad = 18, k = Math.min((W - 2 * pad) / WORLD.w, (Hc - 2 * pad) / WORLD.h);
      var ox = (W - WORLD.w * k) / 2, oy = (Hc - WORLD.h * k) / 2;
      return {
        k: k, ox: ox, oy: oy,
        X: function (x) { return ox + x * k; },
        Y: function (y) { return oy + (WORLD.h - y) * k; },
        toWorld: function (px, py) { return [(px - ox) / k, WORLD.h - (py - oy) / k]; }
      };
    }

    function update() {
      var total = pathLen(pts);
      var d = Math.min(walked, total);
      var p = pts.length ? pointAt(pts, d) : null;
      var dx = p ? p[0] - pts[0][0] : 0, dy = p ? p[1] - pts[0][1] : 0;
      R.dist.textContent = d.toFixed(1);
      R.disp.textContent = Math.hypot(dx, dy).toFixed(1);
      R.dir.textContent = direction(dx, dy);
      walkBtn.disabled = pts.length < 2;
      draw();
    }

    function stop() { running = false; gen++; walkBtn.textContent = "Walk"; }

    function setPts(next, name) {
      stop();
      pts = next.map(function (q) { return q.slice(); });
      ghost = name && PRESETS[name].ghost || null;
      endLabel = name && PRESETS[name].end || null;
      presetName = name || null;
      walked = 0;
      root.querySelectorAll("[data-preset]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.preset === presetName); });
      update();
    }

    function walk() {
      if (pts.length < 2) return;
      if (running) { stop(); walkBtn.textContent = "Resume"; return; }
      if (walked >= pathLen(pts)) walked = 0;
      running = true;
      walkBtn.textContent = "Pause";
      speed = Math.max(8, pathLen(pts) / 6);   // every route takes about 6 s or less
      last = performance.now();
      var my = ++gen;
      requestAnimationFrame(function step(now) {
        if (!running || my !== gen) return;
        walked += Math.min(0.05, (now - last) / 1000) * speed;
        last = now;
        if (walked >= pathLen(pts)) { walked = pathLen(pts); running = false; walkBtn.textContent = "Walk again"; }
        update();
        if (running) requestAnimationFrame(step);
      });
    }

    // Controls
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b || !root.contains(b)) return;
      if (b.dataset.preset) setPts(PRESETS[b.dataset.preset].pts, b.dataset.preset);
      else if (b.dataset.act === "walk") walk();
      else if (b.dataset.act === "undo") { if (pts.length) setPts(pts.slice(0, -1)); }
      else if (b.dataset.act === "clear") setPts([]);
    });

    canvas.addEventListener("pointerup", function (e) {
      if (running) return;
      var r = canvas.getBoundingClientRect(), v = view();
      var w = v.toWorld(e.clientX - r.left, e.clientY - r.top);
      var x = Math.round(w[0] / SNAP) * SNAP, y = Math.round(w[1] / SNAP) * SNAP;
      if (x < 0 || x > WORLD.w || y < 0 || y > WORLD.h) return;
      // Tapping over a preset starts a fresh route; otherwise each tap adds a turn
      var next = (presetName ? [] : pts).concat([[x, y]]);
      if (next.length > 1 && segLen(next[next.length - 2], next[next.length - 1]) < 0.01) return;
      setPts(next);
      walked = pathLen(pts);   // show the finished result straight away
      update();
    });

    // Drawing
    function colors() {
      var cs = getComputedStyle(root), c = {};
      ["surface", "ink", "muted", "line", "grid", "path", "vx", "vy", "tint"].forEach(function (k) { c[k] = cs.getPropertyValue("--" + k).trim(); });
      c.font = cs.getPropertyValue("--font-data");
      return c;
    }

    function arrow(x1, y1, x2, y2, col, w) {
      var len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 3) return;
      var a = Math.atan2(y2 - y1, x2 - x1), hd = Math.min(13, len * 0.4);
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w;
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

      // Map grid: 5 m light, 10 m darker
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

      if (!pts.length) {
        ctx.fillStyle = c.muted; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "15px " + c.font;
        ctx.fillText("Tap the map to place the start", W / 2, Hc / 2);
        return;
      }

      // The other route, faded, for comparing two routes between the same points
      if (ghost) {
        ctx.strokeStyle = c.muted; ctx.globalAlpha = 0.35; ctx.lineWidth = 3; ctx.lineJoin = "round";
        ctx.beginPath(); ghost.forEach(function (q, i) { i ? ctx.lineTo(v.X(q[0]), v.Y(q[1])) : ctx.moveTo(v.X(q[0]), v.Y(q[1])); }); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Planned route
      ctx.setLineDash([6, 6]); ctx.strokeStyle = c.path; ctx.globalAlpha = 0.45; ctx.lineWidth = 2;
      ctx.beginPath(); pts.forEach(function (q, i) { i ? ctx.lineTo(v.X(q[0]), v.Y(q[1])) : ctx.moveTo(v.X(q[0]), v.Y(q[1])); }); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;

      // Walked route (distance)
      var total = pathLen(pts), d = Math.min(walked, total), p = pointAt(pts, d);
      if (d > 0) {
        ctx.strokeStyle = c.path; ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(v.X(pts[0][0]), v.Y(pts[0][1]));
        for (var i = 1; i < p[2]; i++) ctx.lineTo(v.X(pts[i][0]), v.Y(pts[i][1]));
        ctx.lineTo(v.X(p[0]), v.Y(p[1])); ctx.stroke();
      }

      // Turning points (only for hand-drawn or short routes)
      if (pts.length <= 8) {
        ctx.fillStyle = c.path;
        pts.slice(1).forEach(function (q) { ctx.beginPath(); ctx.arc(v.X(q[0]), v.Y(q[1]), 3.5, 0, 7); ctx.fill(); });
      }

      // Displacement arrow: straight from start to current position
      if (d > 0) arrow(v.X(pts[0][0]), v.Y(pts[0][1]), v.X(p[0]), v.Y(p[1]), c.vx, 3.5);

      // Start marker
      ctx.fillStyle = c.ink;
      ctx.beginPath(); ctx.arc(v.X(pts[0][0]), v.Y(pts[0][1]), 6, 0, 7); ctx.fill();
      ctx.font = "600 12px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(endLabel ? "Home" : "Start", v.X(pts[0][0]) + 8, v.Y(pts[0][1]) + 6);
      if (endLabel) {
        var e = pts[pts.length - 1];
        ctx.fillStyle = c.ink; ctx.fillRect(v.X(e[0]) - 6, v.Y(e[1]) - 6, 12, 12);
        ctx.textBaseline = "bottom"; ctx.fillText(endLabel, v.X(e[0]) + 9, v.Y(e[1]) - 6);
      }

      // Walker
      ctx.fillStyle = c.vy; ctx.strokeStyle = c.surface; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(v.X(p[0]), v.Y(p[1]), 8, 0, 7); ctx.fill(); ctx.stroke();
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

    setPts(PRESETS[opts.preset || "lshape"].pts, opts.preset || "lshape");
    walked = pathLen(pts);   // open showing a finished walk
    update();
    resize();

    return {
      preset: function (name, go) { setPts(PRESETS[name].pts, name); if (go) walk(); }
    };
  }

  window.DisplacementSim = { mount: mount };
})();
