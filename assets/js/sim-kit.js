/*
 * SimKit: shared building blocks for the lesson simulations.
 * Every simulation uses the same frame: a canvas stage, a control panel and a row of live readouts.
 *
 *   var k = SimKit.frame(root, {
 *     aspect: "5 / 3.2",
 *     label: "What the canvas shows, for screen readers",
 *     panel: SimKit.chips(...) + SimKit.slider(...) + SimKit.buttons([...]),
 *     readouts: [["t", "Time (s)"], ["v", "Velocity (m/s)", "c-path"]],
 *     cols: 3
 *   });
 *   k.draw = function (ctx, W, H, c) { ... };   // called on resize, theme change and k.redraw()
 *   k.set("t", "1.0");                          // update a readout
 *
 *   var clock = SimKit.clock(function (dt) { ...; return keepGoing; });
 *   clock.start(); clock.stop(); clock.running
 */
(function () {
  "use strict";

  var COLOR_KEYS = ["surface", "bg", "ink", "muted", "line", "grid", "path", "vx", "vy", "tint", "good", "bad"];

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

  function slider(id, key, label, min, max, step, unit) {
    return '<div class="ctl"><label for="' + id + '-' + key + '">' + label + ' <output id="' + id + '-' + key + '-out"></output></label>' +
      '<input type="range" id="' + id + '-' + key + '" data-k="' + key + '" data-unit="' + esc(unit || "") + '" min="' + min + '" max="' + max + '" step="' + step + '"></div>';
  }

  function chips(group, label, options) {
    return '<div><div class="seg-label">' + label + '</div><div class="preset-list" data-group="' + group + '">' +
      options.map(function (o) { return '<button type="button" class="chip" data-v="' + o[0] + '" aria-pressed="false">' + o[1] + '</button>'; }).join("") +
      '</div></div>';
  }

  function check(id, key, label, on) {
    return '<label><input type="checkbox" id="' + id + '-' + key + '" data-check="' + key + '"' + (on ? " checked" : "") + '> ' + label + '</label>';
  }

  function buttons(list) {
    return '<div class="btns">' + list.map(function (b, i) {
      return '<button type="button" class="btn' + (i === 0 ? " primary" : "") + '" data-act="' + b[0] + '">' + b[1] + '</button>';
    }).join("") + '</div>';
  }

  function hint(key) { return '<p class="sim-hint" data-r="' + key + '"></p>'; }

  function frame(root, o) {
    root.classList.add("sim");
    var cols = o.cols || o.readouts.length;
    root.innerHTML =
      '<div class="sim-body">' +
        '<div class="sim-stage"><canvas role="img" aria-label="' + esc(o.label || "Simulation") + '"></canvas></div>' +
        '<div class="sim-panel">' + o.panel + '</div>' +
        '<div class="sim-readout' + (o.readouts.length > cols ? " two-rows" : "") + '" style="--cols:' + cols + '">' +
          o.readouts.map(function (r) { return '<div><span>' + r[1] + '</span><b data-r="' + r[0] + '" class="' + (r[2] || "") + '">–</b></div>'; }).join("") +
        '</div>' +
      '</div>';

    var canvas = root.querySelector("canvas"), ctx = canvas.getContext("2d");
    var stage = root.querySelector(".sim-stage");
    if (o.aspect) stage.style.aspectRatio = o.aspect;
    var R = {};
    root.querySelectorAll("[data-r]").forEach(function (e) { R[e.dataset.r] = e; });

    var k = {
      root: root, canvas: canvas, ctx: ctx, W: 0, H: 0, dpr: 1, draw: null,
      set: function (key, val) { if (R[key]) R[key].textContent = val; },
      el: function (sel) { return root.querySelector(sel); },
      colors: function () {
        var cs = getComputedStyle(root), c = {};
        COLOR_KEYS.forEach(function (n) { c[n] = cs.getPropertyValue("--" + n).trim(); });
        c.font = cs.getPropertyValue("--font-data") || "monospace";
        return c;
      },
      redraw: function () {
        if (!k.W || !k.draw) return;
        ctx.setTransform(k.dpr, 0, 0, k.dpr, 0, 0);
        var c = k.colors();
        ctx.fillStyle = c.surface; ctx.fillRect(0, 0, k.W, k.H);
        k.draw(ctx, k.W, k.H, c);
      },
      // Sliders: keep the input, its output label and a value in sync
      bindSlider: function (key, get, set, fmt) {
        var inp = root.querySelector('input[data-k="' + key + '"]');
        var out = document.getElementById(inp.id + "-out");
        function show() { var v = get(); inp.value = v; out.textContent = (fmt ? fmt(v) : v + " " + inp.dataset.unit).trim(); }
        inp.addEventListener("input", function () { set(+inp.value); show(); });
        show();
        return show;
      },
      bindChips: function (group, get, set) {
        var box = root.querySelector('[data-group="' + group + '"]');
        function show() { box.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === String(get())); }); }
        box.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { set(b.dataset.v); show(); } });
        show();
        return show;
      },
      bindCheck: function (key, set) {
        var inp = root.querySelector('input[data-check="' + key + '"]');
        inp.addEventListener("change", function () { set(inp.checked); });
        return inp;
      },
      onAct: function (map) {
        root.addEventListener("click", function (e) {
          var b = e.target.closest("[data-act]");
          if (b && root.contains(b) && map[b.dataset.act]) map[b.dataset.act](b);
        });
      },
      btn: function (act) { return root.querySelector('[data-act="' + act + '"]'); }
    };

    function resize() {
      var r = stage.getBoundingClientRect();
      k.dpr = window.devicePixelRatio || 1; k.W = r.width; k.H = r.height;
      canvas.width = Math.round(k.W * k.dpr); canvas.height = Math.round(k.H * k.dpr);
      k.redraw();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else window.addEventListener("resize", resize);
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", function () { k.redraw(); });
    new MutationObserver(function () { k.redraw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    k.resize = resize;
    requestAnimationFrame(resize);
    return k;
  }

  // Animation clock. step(dt) returns false to stop.
  function clock(step) {
    var gen = 0, last = 0;
    var c = {
      running: false,
      start: function () {
        if (c.running) return;
        c.running = true; last = performance.now();
        var my = ++gen;
        requestAnimationFrame(function tick(now) {
          if (!c.running || my !== gen) return;
          var dt = Math.min(0.05, (now - last) / 1000); last = now;
          if (step(dt) === false) { c.running = false; if (c.onStop) c.onStop(); return; }
          requestAnimationFrame(tick);
        });
      },
      stop: function () { c.running = false; gen++; }
    };
    return c;
  }

  function arrow(ctx, x1, y1, x2, y2, col, w, head) {
    var len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 2) return;
    var a = Math.atan2(y2 - y1, x2 - x1), hd = Math.min(head || 12, len * 0.45);
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w || 2.5; ctx.lineCap = "round"; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hd * 0.6, y2 - Math.sin(a) * hd * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - hd * Math.cos(a - 0.42), y2 - hd * Math.sin(a - 0.42));
    ctx.lineTo(x2 - hd * Math.cos(a + 0.42), y2 - hd * Math.sin(a + 0.42));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function niceStep(span, n) {
    var raw = span / (n || 5), p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
  }

  // Line graph with axes. box = {x, y, w, h}; o = {xmax, ymin, ymax, xlabel, ylabel, title}
  // Returns mapping functions X(t) and Y(v) for drawing extra marks.
  function graph(ctx, c, box, o) {
    var padL = 40, padB = 30, padT = o.title ? 22 : 8, padR = 10;
    var gx = box.x + padL, gy = box.y + padT, gw = box.w - padL - padR, gh = box.h - padT - padB;
    var ymin = o.ymin || 0, ymax = o.ymax;
    var X = function (t) { return gx + (t / o.xmax) * gw; };
    var Y = function (v) { return gy + gh - ((v - ymin) / (ymax - ymin)) * gh; };
    ctx.save();
    ctx.font = "11px " + c.font; ctx.lineWidth = 1;
    // grid and tick labels
    var sx = niceStep(o.xmax, 5), sy = niceStep(ymax - ymin, 4);
    ctx.fillStyle = c.muted; ctx.strokeStyle = c.grid;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (var t = 0; t <= o.xmax + 1e-9; t += sx) {
      ctx.beginPath(); ctx.moveTo(X(t), gy); ctx.lineTo(X(t), gy + gh); ctx.stroke();
      ctx.fillText(+t.toFixed(2), X(t), gy + gh + 4);
    }
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (var v = Math.ceil(ymin / sy) * sy; v <= ymax + 1e-9; v += sy) {
      ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke();
      ctx.fillText(+v.toFixed(2), gx - 5, Y(v));
    }
    // axes
    ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    if (ymin < 0) { ctx.beginPath(); ctx.moveTo(gx, Y(0)); ctx.lineTo(gx + gw, Y(0)); ctx.stroke(); }
    // labels
    ctx.fillStyle = c.muted; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
    ctx.fillText(o.xlabel || "time (s)", gx + gw, gy + gh + 28);
    if (o.title) {
      ctx.font = "600 12px " + c.font; ctx.fillStyle = c.ink; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(o.title, box.x + 4, box.y + 2);
    }
    ctx.restore();
    return { X: X, Y: Y, gx: gx, gy: gy, gw: gw, gh: gh };
  }

  // Plot y = f(t) from t0 to t1 on a graph mapping
  function curve(ctx, g, f, t0, t1, col, w, dash) {
    var n = 80;
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = w || 2.5; ctx.setLineDash(dash || []); ctx.lineJoin = "round";
    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var t = t0 + (t1 - t0) * i / n;
      if (i === 0) ctx.moveTo(g.X(t), g.Y(f(t))); else ctx.lineTo(g.X(t), g.Y(f(t)));
    }
    ctx.stroke();
    ctx.restore();
  }

  function fmt(n, d) { if (Math.abs(n) < 0.0005) n = 0; return n.toFixed(d == null ? 1 : d); }

  window.SimKit = { frame: frame, clock: clock, slider: slider, chips: chips, check: check, buttons: buttons, hint: hint, arrow: arrow, graph: graph, curve: curve, niceStep: niceStep, fmt: fmt };
})();
