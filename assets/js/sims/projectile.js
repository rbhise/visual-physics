/*
 * Projectile motion simulation (no air resistance).
 * Usage:
 *   const sim = ProjectileSim.mount(document.getElementById("sim"), { v0: 20, angle: 45, h: 0 });
 *   sim.set({ v0: 20, angle: 30 }, true);   // second argument launches immediately
 *   opts.onLand: optional callback fired each time the ball lands
 * Plain browser script, no build step and no libraries, so it works on GitHub Pages and from a local file.
 */
(function () {
  "use strict";

  var PLANETS = { Earth: 9.81, Moon: 1.62, Mars: 3.71 };
  var RATES = [0.5, 1, 2];
  var MAX_TRAILS = 4;

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  function niceStep(span) {
    var raw = span / 6, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
  }

  function fmt(n, d) { return (Math.abs(n) < 0.005 ? 0 : n).toFixed(d == null ? 2 : d); }

  // Analytic results for a launch from height h (metres) above the ground.
  function solve(p) {
    var a = p.angle * Math.PI / 180;
    var vx = p.v0 * Math.cos(a), vy = p.v0 * Math.sin(a);
    var T = (vy + Math.sqrt(vy * vy + 2 * p.g * p.h)) / p.g;
    return {
      vx: vx, vy: vy, T: T,
      R: vx * T,
      H: p.h + (vy > 0 ? vy * vy / (2 * p.g) : 0),
      tApex: vy > 0 ? vy / p.g : 0
    };
  }

  function stateAt(p, s, t) {
    return { x: s.vx * t, y: p.h + s.vy * t - 0.5 * p.g * t * t, vx: s.vx, vy: s.vy - p.g * t };
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "sim";
    var p = {
      v0: opts.v0 != null ? opts.v0 : 20,
      angle: opts.angle != null ? opts.angle : 45,
      h: opts.h != null ? opts.h : 0,
      g: PLANETS.Earth
    };
    var planet = "Earth", rate = 1;
    var show = { vectors: true, components: true, trails: true };
    var t = 0, running = false, flown = false, last = 0, trails = [], gen = 0;

    root.classList.add("sim");
    root.innerHTML =
      '<div class="sim-body">' +
        '<div class="sim-stage"><canvas role="img" aria-label="Projectile path drawn on a grid in metres"></canvas></div>' +
        '<div class="sim-panel">' +
          slider("v0", "Launch speed", 2, 40, 1, "m/s") +
          slider("angle", "Launch angle", 0, 90, 1, "°") +
          slider("h", "Launch height", 0, 40, 1, "m") +
          '<div><div class="seg-label">Gravity</div><div class="seg" data-k="planet">' +
            Object.keys(PLANETS).map(function (k) { return '<button type="button" data-v="' + k + '" aria-pressed="' + (k === planet) + '">' + k + '</button>'; }).join("") +
          '</div></div>' +
          '<div><div class="seg-label">Playback</div><div class="seg" data-k="rate">' +
            RATES.map(function (r) { return '<button type="button" data-v="' + r + '" aria-pressed="' + (r === rate) + '">' + r + '×</button>'; }).join("") +
          '</div></div>' +
          '<div class="checks">' +
            check("vectors", "Velocity arrow") + check("components", "Components") + check("trails", "Keep old paths") +
          '</div>' +
          '<dl class="sim-result" aria-live="polite"></dl>' +
          '<div class="btns"><button type="button" class="btn primary" data-act="launch">Launch</button>' +
          '<button type="button" class="btn" data-act="clear">Clear</button></div>' +
        '</div>' +
      '<div class="sim-readout">' +
        ['t (s)', 'x (m)', 'y (m)', 'vx (m/s)', 'vy (m/s)'].map(function (l, i) {
          return '<div><span>' + l + '</span><b data-r="' + i + '">0.00</b></div>';
        }).join("") +
      '</div>' +
      '</div>';

    function slider(k, label, min, max, step, unit) {
      return '<div class="ctl"><label for="' + id + '-' + k + '">' + label +
        ' <output id="' + id + '-' + k + '-out"></output></label>' +
        '<input type="range" id="' + id + '-' + k + '" data-k="' + k + '" data-unit="' + unit + '" min="' + min + '" max="' + max + '" step="' + step + '"></div>';
    }
    function check(k, label) {
      return '<label><input type="checkbox" id="' + id + '-' + k + '" data-show="' + k + '" checked> ' + label + '</label>';
    }

    var canvas = root.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    var stage = root.querySelector(".sim-stage");
    var result = root.querySelector(".sim-result");
    var launchBtn = root.querySelector('[data-act="launch"]');
    var readout = root.querySelectorAll("[data-r]");
    var W = 0, Hc = 0, dpr = 1;

    function syncInputs() {
      root.querySelectorAll('input[type="range"]').forEach(function (inp) {
        var k = inp.dataset.k;
        inp.value = p[k];
        document.getElementById(inp.id + "-out").textContent = p[k] + " " + inp.dataset.unit;
      });
      root.querySelectorAll('.seg[data-k="planet"] button').forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === planet); });
      root.querySelectorAll('.seg[data-k="rate"] button').forEach(function (b) { b.setAttribute("aria-pressed", +b.dataset.v === rate); });
    }

    function showResults() {
      var s = solve(p);
      result.innerHTML =
        "<dt>Flight time</dt><dd>" + fmt(s.T) + " s</dd>" +
        "<dt>Range</dt><dd>" + fmt(s.R, 1) + " m</dd>" +
        "<dt>Max height</dt><dd>" + fmt(s.H, 1) + " m</dd>";
    }

    function resetFlight() {
      running = false; flown = false; t = 0;
      launchBtn.textContent = "Launch";
      updateReadout();
      showResults();
      draw();
    }

    function updateReadout() {
      var s = solve(p), st = stateAt(p, s, t);
      var vals = [t, st.x, Math.max(0, st.y), st.vx, st.vy];
      for (var i = 0; i < 5; i++) readout[i].textContent = fmt(vals[i]);
    }

    // --- Controls ---
    root.addEventListener("input", function (e) {
      var k = e.target.dataset.k;
      if (!k) return;
      p[k] = +e.target.value;
      syncInputs();
      resetFlight();
    });
    root.addEventListener("change", function (e) {
      var k = e.target.dataset.show;
      if (!k) return;
      show[k] = e.target.checked;
      draw();
    });
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b || !root.contains(b)) return;
      var seg = b.parentElement.dataset.k;
      if (seg === "planet") { planet = b.dataset.v; p.g = PLANETS[planet]; syncInputs(); resetFlight(); }
      else if (seg === "rate") { rate = +b.dataset.v; syncInputs(); }
      else if (b.dataset.act === "launch") launch();
      else if (b.dataset.act === "clear") { trails = []; resetFlight(); }
    });

    function launch() {
      if (running) { running = false; launchBtn.textContent = "Resume"; return; }
      if (flown || t === 0) { t = 0; flown = false; }
      running = true;
      launchBtn.textContent = "Pause";
      last = performance.now();
      var my = ++gen;
      requestAnimationFrame(function step(now) {
        if (!running || my !== gen) return;
        tick(now);
        if (running) requestAnimationFrame(step);
      });
    }

    function tick(now) {
      var dt = Math.min(0.05, (now - last) / 1000) * rate;
      last = now;
      var s = solve(p);
      t += dt;
      if (t >= s.T) {
        t = s.T; running = false; flown = true;
        launchBtn.textContent = "Launch again";
        trails.push({ p: Object.assign({}, p) });
        if (trails.length > MAX_TRAILS) trails.shift();
        if (opts.onLand) setTimeout(opts.onLand, 0);
      }
      updateReadout();
      draw();
    }

    // --- Drawing ---
    function colors() {
      var cs = getComputedStyle(root);
      var c = {};
      ["surface", "ink", "muted", "line", "grid", "path", "vx", "vy"].forEach(function (k) { c[k] = cs.getPropertyValue("--" + k).trim(); });
      return c;
    }

    function resize() {
      var r = stage.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      W = r.width; Hc = r.height;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(Hc * dpr);
      draw();
    }

    function view() {
      var all = [p].concat(show.trails ? trails.map(function (tr) { return tr.p; }) : []);
      var maxX = 10, maxY = 5;
      all.forEach(function (q) { var s = solve(q); maxX = Math.max(maxX, s.R); maxY = Math.max(maxY, s.H); });
      var pad = { l: 44, r: 16, t: 16, b: 34 };
      var sx = (W - pad.l - pad.r) / (maxX * 1.08), sy = (Hc - pad.t - pad.b) / (maxY * 1.12);
      var k = Math.min(sx, sy);
      return {
        k: k, pad: pad,
        X: function (x) { return pad.l + x * k; },
        Y: function (y) { return Hc - pad.b - y * k; },
        wX: (W - pad.l - pad.r) / k, wY: (Hc - pad.t - pad.b) / k
      };
    }

    function pathOf(q, v, t1) {
      var s = solve(q), n = 80, end = t1 == null ? s.T : t1;
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var st = stateAt(q, s, end * i / n);
        if (i === 0) ctx.moveTo(v.X(st.x), v.Y(st.y)); else ctx.lineTo(v.X(st.x), v.Y(Math.max(0, st.y)));
      }
    }

    function arrow(x1, y1, x2, y2, col, w) {
      var len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 2) return;
      var a = Math.atan2(y2 - y1, x2 - x1), hd = Math.min(10, len * 0.4);
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hd * 0.6, y2 - Math.sin(a) * hd * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hd * Math.cos(a - 0.45), y2 - hd * Math.sin(a - 0.45));
      ctx.lineTo(x2 - hd * Math.cos(a + 0.45), y2 - hd * Math.sin(a + 0.45));
      ctx.closePath(); ctx.fill();
    }

    function draw() {
      if (!W) return;
      var c = colors(), v = view(), s = solve(p);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = c.surface; ctx.fillRect(0, 0, W, Hc);

      // Grid and axis labels (metres)
      var step = niceStep(Math.max(v.wX, v.wY * 1.4));
      ctx.lineWidth = 1; ctx.strokeStyle = c.grid;
      ctx.font = "11px " + getComputedStyle(root).getPropertyValue("--font-data");
      ctx.fillStyle = c.muted;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (var gx = 0; gx <= v.wX; gx += step) {
        ctx.beginPath(); ctx.moveTo(v.X(gx), v.pad.t); ctx.lineTo(v.X(gx), v.Y(0)); ctx.stroke();
        ctx.fillText(+gx.toFixed(2), v.X(gx), v.Y(0) + 6);
      }
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (var gy = 0; gy <= v.wY; gy += step) {
        ctx.beginPath(); ctx.moveTo(v.X(0), v.Y(gy)); ctx.lineTo(W - v.pad.r, v.Y(gy)); ctx.stroke();
        if (gy > 0) ctx.fillText(+gy.toFixed(2), v.X(0) - 6, v.Y(gy));
      }
      ctx.textAlign = "right"; ctx.textBaseline = "bottom";
      ctx.fillText("metres", W - v.pad.r, v.Y(0) + 30);

      // Ground and launch platform
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(v.X(0) - 8, v.Y(0)); ctx.lineTo(W - v.pad.r, v.Y(0)); ctx.stroke();
      if (p.h > 0) {
        ctx.fillStyle = c.line;
        ctx.fillRect(v.X(0) - 10, v.Y(p.h), 10, v.Y(0) - v.Y(p.h));
      }

      // Old paths
      if (show.trails) {
        trails.forEach(function (tr, i) {
          ctx.globalAlpha = 0.25 + 0.12 * i;
          ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.setLineDash([]);
          pathOf(tr.p, v); ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }

      // Predicted path (dashed) and flown path (solid)
      ctx.strokeStyle = c.path; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.globalAlpha = 0.6;
      pathOf(p, v); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (t > 0) { ctx.lineWidth = 3; pathOf(p, v, t); ctx.stroke(); }

      // Apex and landing markers once the flight has passed them
      ctx.font = "12px " + getComputedStyle(root).getPropertyValue("--font-data");
      ctx.fillStyle = c.ink; ctx.textBaseline = "bottom";
      if (s.tApex > 0 && t >= s.tApex) {
        var ap = stateAt(p, s, s.tApex);
        ctx.textAlign = "center";
        ctx.fillText("max " + fmt(s.H, 1) + " m", v.X(ap.x), v.Y(ap.y) - 8);
      }
      if (flown) {
        ctx.textAlign = s.R * v.k > W - 120 ? "right" : "center";
        ctx.fillText("range " + fmt(s.R, 1) + " m", v.X(s.R), v.Y(0) - 8);
      }

      // Ball and velocity vectors
      var st = stateAt(p, s, t), bx = v.X(st.x), by = v.Y(Math.max(0, st.y));
      var vk = 70 / Math.max(p.v0, 1);
      if (show.components) {
        ctx.setLineDash([4, 3]);
        arrow(bx, by, bx + st.vx * vk, by, c.vx, 2.5);
        arrow(bx, by, bx, by - st.vy * vk, c.vy, 2.5);
        ctx.setLineDash([]);
      }
      if (show.vectors) arrow(bx, by, bx + st.vx * vk, by - st.vy * vk, c.ink, 2.5);
      ctx.fillStyle = c.path;
      ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c.surface; ctx.lineWidth = 2; ctx.stroke();
    }

    // Redraw on resize and theme changes
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", draw);
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });

    syncInputs();
    showResults();
    updateReadout();
    resize();

    return {
      set: function (next, go) {
        for (var k in next) {
          if (k === "planet") { planet = next[k]; p.g = PLANETS[planet]; }
          else if (k in p) p[k] = next[k];
        }
        syncInputs();
        resetFlight();
        if (go) launch();
      },
      clearTrails: function () { trails = []; draw(); }
    };
  }

  window.ProjectileSim = { mount: mount, solve: solve };
})();
