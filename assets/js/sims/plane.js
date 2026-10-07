/*
 * Reflection at a plane surface, in three views:
 *   laws   – a beam of three parallel rays hits a mirror; angles of incidence and reflection are shown.
 *            Tick "rough surface" to see irregular (diffuse) reflection.
 *   image  – an object in front of an upright mirror, its image behind, and the rays that reach an eye.
 *   height – a person in front of a wall mirror: which part of the mirror is needed to see head to toe.
 * Needs sim-kit.js.  PlaneSim.mount(el, { mode: "laws", i: 40 }) → { set, play, seek }
 */
(function () {
  "use strict";
  var K = window.SimKit, D = Math.PI / 180;

  var LABELS = {
    laws:   ["Angle of incidence i", "Angle of reflection r", "Is i = r?", "Surface", "Reflected rays", "Reflection"],
    image:  ["Object distance", "Image distance", "Object height", "Image height", "Image is", "Left and right"],
    height: ["Person's height", "Eye height", "Distance from mirror", "Mirror needed", "Mirror top at", "Mirror bottom at"]
  };
  var TILT = [-17, 11, -6];   // local surface tilt (degrees) at the three hit points of a rough surface

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "psim";
    var s = Object.assign({ mode: "laws", i: 40, rough: false, d: 40, ph: 160, pd: 100, sweep: false }, opts);

    var k = K.frame(root, {
      aspect: window.matchMedia("(max-width: 600px)").matches ? "4 / 3.2" : "5 / 3",
      label: "Rays of light reflecting from a plane mirror",
      panel: K.chips("mode", "Show", [["laws", "Laws of reflection"], ["image", "Image in a mirror"], ["height", "How tall a mirror?"]]) +
        '<div data-for="laws">' + K.slider(id, "i", "Angle of incidence i", 0, 80, 1, "°") +
          '<div style="margin-top:.6rem">' + K.check(id, "rough", "Rough surface (irregular reflection)", s.rough) + '</div></div>' +
        '<div data-for="image">' + K.slider(id, "d", "Object distance from mirror", 10, 100, 1, "cm") + '</div>' +
        '<div data-for="height">' + K.slider(id, "ph", "Person's height", 120, 190, 1, "cm") + K.slider(id, "pd", "Distance from mirror", 50, 150, 1, "cm") + '</div>' +
        K.buttons([["play", "Play"]]) + K.hint("note"),
      readouts: [["r1", "–"], ["r2", "–", "c-path"], ["r3", "–", "c-vy"], ["r4", "–"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");

    function update() {
      LABELS[s.mode].forEach(function (t, j) { spans[j].textContent = t; });
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for === s.mode ? "" : "none"; });
      k.btn("play").style.display = s.mode === "height" ? "none" : "";
      var note = k.el('[data-r="note"]');
      if (s.mode === "laws") {
        k.set("r1", s.i + "°"); k.set("r2", s.i + "°"); k.set("r3", s.rough ? "Yes, at every point" : "Yes");
        k.set("r4", s.rough ? "Rough" : "Smooth"); k.set("r5", s.rough ? "Scattered" : "Parallel"); k.set("r6", s.rough ? "Irregular (diffuse)" : "Regular");
        note.textContent = s.rough
          ? "Each ray still obeys i = r, but the normal points a different way at each bump, so the reflected rays scatter."
          : "Angles are measured from the normal (dashed), the line at right angles to the mirror. The angle of reflection always equals the angle of incidence.";
      } else if (s.mode === "image") {
        k.set("r1", s.d + " cm"); k.set("r2", s.d + " cm behind"); k.set("r3", "20 cm"); k.set("r4", "20 cm");
        k.set("r5", "Virtual, erect"); k.set("r6", "Swapped (lateral inversion)");
        note.textContent = "The rays only seem to come from behind the mirror (dashed lines). The image cannot be caught on a screen: it is virtual.";
      } else {
        var eye = s.ph - 10;
        k.set("r1", s.ph + " cm"); k.set("r2", eye + " cm"); k.set("r3", s.pd + " cm");
        k.set("r4", K.fmt(s.ph / 2, 1) + " cm"); k.set("r5", K.fmt((eye + s.ph) / 2, 1) + " cm"); k.set("r6", K.fmt(eye / 2, 1) + " cm");
        note.textContent = "The mirror needed is always half the person's height, wherever they stand. Move the distance slider to check.";
      }
      k.redraw();
    }

    // Ray from (x,y) in direction (dx,dy) to the canvas edge
    function toEdge(x, y, dx, dy, W, H) {
      var t = 1e9;
      if (dx > 0) t = Math.min(t, (W - x) / dx); if (dx < 0) t = Math.min(t, -x / dx);
      if (dy > 0) t = Math.min(t, (H - y) / dy); if (dy < 0) t = Math.min(t, -y / dy);
      return [x + dx * t, y + dy * t];
    }
    function ray(ctx, x1, y1, x2, y2, col, dash) {
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash ? [6, 5] : []);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
      if (!dash) { var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, a = Math.atan2(y2 - y1, x2 - x1); K.arrow(ctx, mx - Math.cos(a) * 6, my - Math.sin(a) * 6, mx + Math.cos(a) * 6, my + Math.sin(a) * 6, col, 2, 10); }
    }
    function hatch(ctx, x1, y1, x2, y2, side, c) {   // mirror line with hatching on its back
      ctx.strokeStyle = c.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      var L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = -uy * side, ny = ux * side;
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
      for (var t = 6; t < L; t += 10) { var px = x1 + ux * t, py = y1 + uy * t; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + nx * 8 - ux * 6, py + ny * 8 - uy * 6); ctx.stroke(); }
    }
    function label(ctx, t, x, y, col, c, align) { ctx.fillStyle = col; ctx.font = "600 13px " + c.font; ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); }

    function drawLaws(ctx, W, H, c) {
      var my = H * 0.8, x0 = W / 2, gap = Math.min(70, W * 0.1), L = Math.min(H * 0.62, W * 0.42);
      // surface
      if (s.rough) {
        ctx.strokeStyle = c.ink; ctx.lineWidth = 3; ctx.beginPath();
        for (var x = W * 0.1; x <= W * 0.9; x += 4) { var y = my + 5 * Math.sin(x * 0.11) + 3 * Math.sin(x * 0.37); x === W * 0.1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke();
      } else hatch(ctx, W * 0.1, my, W * 0.9, my, 1, c);
      // normal at the middle ray
      var tilt0 = s.rough ? TILT[1] * D : 0;
      ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0, my); ctx.lineTo(x0 + Math.sin(tilt0) * L * 0.9, my - Math.cos(tilt0) * L * 0.9); ctx.stroke(); ctx.restore();
      label(ctx, "normal", x0 + Math.sin(tilt0) * L * 0.9, my - Math.cos(tilt0) * L * 0.9 - 12, c.muted, c);
      var a = s.i * D, dx = Math.sin(a), dy = Math.cos(a);   // incoming direction (moving right and down)
      [-1, 0, 1].forEach(function (j, n) {
        var hx = x0 + j * gap, sx = hx - dx * L, sy = my - dy * L;
        ray(ctx, sx, sy, hx, my, c.vx);
        var t = s.rough ? TILT[n] * D : 0, nx = Math.sin(t), ny = -Math.cos(t);           // local normal (pointing up)
        var dot = dx * nx + dy * ny, rx = dx - 2 * dot * nx, ry = dy - 2 * dot * ny;
        if (ry < -0.05) ray(ctx, hx, my, hx + rx * L, my + ry * L, c.vy);
      });
      {
        // angle arcs on the middle ray
        var nA = -Math.PI / 2 + tilt0, inc = Math.atan2(-dy, -dx), rr = 46;
        var t0 = tilt0, nx0 = Math.sin(t0), ny0 = -Math.cos(t0), dot0 = dx * nx0 + dy * ny0, ref = Math.atan2(dy - 2 * dot0 * ny0, dx - 2 * dot0 * nx0);
        ctx.lineWidth = 2;
        ctx.strokeStyle = c.vx; ctx.beginPath(); ctx.arc(x0, my, rr, Math.min(inc, nA), Math.max(inc, nA)); ctx.stroke();
        ctx.strokeStyle = c.vy; ctx.beginPath(); ctx.arc(x0, my, rr + 8, Math.min(ref, nA), Math.max(ref, nA)); ctx.stroke();
        if (s.i > 4) {
          var mi = (inc + nA) / 2, mr = (ref + nA) / 2;
          label(ctx, "i", x0 + Math.cos(mi) * (rr + 16), my + Math.sin(mi) * (rr + 16), c.vx, c);
          label(ctx, "r", x0 + Math.cos(mr) * (rr + 24), my + Math.sin(mr) * (rr + 24), c.vy, c);
        }
      }
      label(ctx, "incident rays", W * 0.12, H * 0.08, c.vx, c, "left");
      label(ctx, "reflected rays", W * 0.88, H * 0.08, c.vy, c, "right");
    }

    function obj(ctx, x, y0, h, flagDir, col, dash) {   // upright arrow with a flag on one side
      ctx.save(); ctx.setLineDash(dash ? [5, 4] : []);
      K.arrow(ctx, x, y0, x, y0 - h, col, 3, 12);
      ctx.strokeStyle = col; ctx.fillStyle = dash ? "transparent" : col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y0 - h * 0.78); ctx.lineTo(x + flagDir * h * 0.35, y0 - h * 0.64); ctx.lineTo(x, y0 - h * 0.5); ctx.closePath();
      if (dash) ctx.stroke(); else ctx.fill();
      ctx.restore();
    }

    function drawImage(ctx, W, H, c) {
      var xm = W * 0.5, base = H * 0.72, sc = (W * 0.5 - 30) / 105, h = 20 * sc * 1.6, xo = xm - s.d * sc, xi = xm + s.d * sc;
      hatch(ctx, xm, H * 0.08, xm, H * 0.9, 1, c);
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, base); ctx.lineTo(W - 10, base); ctx.stroke();
      obj(ctx, xo, base, h, 1, c.path, false);
      obj(ctx, xi, base, h, -1, c.path, true);
      // eye at lower left
      var ex = Math.max(18, Math.min(xo - 40, W * 0.08)), ey = base - h * 0.45;
      [[xi, base - h], [xi, base]].forEach(function (p, n) {
        var from = n === 0 ? [xo, base - h] : [xo, base];
        var t = (xm - ex) / (p[0] - ex), my = ey + (p[1] - ey) * t;
        ray(ctx, from[0], from[1], xm, my, c.vx); ray(ctx, xm, my, ex, ey, c.vy); ray(ctx, xm, my, p[0], p[1], c.muted, true);
      });
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.ellipse(ex, ey, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.surface; ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
      label(ctx, "object", xo, base - h - 16, c.path, c); label(ctx, "image", xi, base - h - 16, c.path, c);
      label(ctx, "eye", ex, ey + 16, c.muted, c);
      // distance markers
      ctx.fillStyle = c.muted; ctx.font = "12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(s.d + " cm", (xo + xm) / 2, base + 6); ctx.fillText(s.d + " cm", (xi + xm) / 2, base + 6);
      label(ctx, "mirror", xm, H * 0.05, c.muted, c);
    }

    function person(ctx, x, foot, sc, ph, col, dash, face) {
      var head = foot - ph * sc, hr = 10 * sc;
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash(dash ? [5, 4] : []); ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(x, head + hr, hr, 0, Math.PI * 2); ctx.stroke();
      var neck = head + 2 * hr, hip = foot - ph * 0.48 * sc;
      ctx.beginPath(); ctx.moveTo(x, neck); ctx.lineTo(x, hip); ctx.lineTo(x - 14 * sc, foot); ctx.moveTo(x, hip); ctx.lineTo(x + 14 * sc, foot);
      ctx.moveTo(x, neck + 14 * sc); ctx.lineTo(x - 20 * sc, hip - 10 * sc); ctx.moveTo(x, neck + 14 * sc); ctx.lineTo(x + 20 * sc, hip - 10 * sc); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + face * hr * 0.45, head + hr * 0.9, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawHeight(ctx, W, H, c) {
      var floor = H * 0.92, sc = Math.min((H * 0.84) / 200, (W * 0.5 - 30) / 160), xm = W * 0.5;
      var xp = xm - s.pd * sc, xi = xm + s.pd * sc, eye = s.ph - 10;
      var Y = function (cm) { return floor - cm * sc; };
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(10, floor); ctx.lineTo(W - 10, floor); ctx.stroke();
      // wall and the part of the mirror needed
      ctx.strokeStyle = c.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xm, Y(200)); ctx.lineTo(xm, floor); ctx.stroke();
      hatch(ctx, xm, Y((eye + s.ph) / 2), xm, Y(eye / 2), 1, c);
      ctx.strokeStyle = c.good; ctx.lineWidth = 7; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(xm, Y((eye + s.ph) / 2)); ctx.lineTo(xm, Y(eye / 2)); ctx.stroke(); ctx.globalAlpha = 1;
      person(ctx, xp, floor, sc, s.ph, c.path, false, 1);
      person(ctx, xi, floor, sc, s.ph, c.path, true, -1);
      var ex = xp + 4 * sc, ey = Y(eye);
      [[s.ph, (eye + s.ph) / 2], [0, eye / 2]].forEach(function (p) {
        var my = Y(p[1]);
        ray(ctx, xp, Y(p[0]), xm, my, c.vx); ray(ctx, xm, my, ex, ey, c.vy); ray(ctx, xm, my, xi, Y(p[0]), c.muted, true);
      });
      // bracket for mirror length
      var bx = xm + 14;
      ctx.strokeStyle = c.good; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx, Y((eye + s.ph) / 2)); ctx.lineTo(bx + 6, Y((eye + s.ph) / 2)); ctx.lineTo(bx + 6, Y(eye / 2)); ctx.lineTo(bx, Y(eye / 2)); ctx.stroke();
      ctx.fillStyle = c.good; ctx.font = "700 13px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(K.fmt(s.ph / 2, 0) + " cm", bx + 10, Y(((eye + s.ph) / 2 + eye / 2) / 2));
    }

    k.draw = function (ctx, W, H, c) { if (s.mode === "laws") drawLaws(ctx, W, H, c); else if (s.mode === "image") drawImage(ctx, W, H, c); else drawHeight(ctx, W, H, c); };

    var showI = k.bindSlider("i", function () { return s.i; }, function (v) { stop(); s.i = v; update(); }, function (v) { return v + "°"; });
    var showD = k.bindSlider("d", function () { return s.d; }, function (v) { stop(); s.d = v; update(); });
    var showPh = k.bindSlider("ph", function () { return s.ph; }, function (v) { s.ph = v; update(); });
    var showPd = k.bindSlider("pd", function () { return s.pd; }, function (v) { s.pd = v; update(); });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { stop(); s.mode = v; update(); });
    var rough = k.bindCheck("rough", function (on) { s.rough = on; update(); });
    function showAll() { showI(); showD(); showPh(); showPd(); showM(); rough.checked = s.rough; }

    // Play sweeps the angle (laws) or the object distance (image)
    var t = 0, clock = K.clock(function (dt) {
      t += dt;
      if (s.mode === "laws") { s.i = Math.round(Math.min(80, t * 18)); showI(); update(); return s.i < 80; }
      s.d = Math.round(Math.min(100, 10 + t * 20)); showD(); update(); return s.d < 100;
    });
    clock.onStop = function () { k.btn("play").textContent = "Play"; };
    function stop() { if (clock.running) { clock.stop(); k.btn("play").textContent = "Play"; } }
    function play() { stop(); t = 0; k.btn("play").textContent = "Pause"; clock.start(); }
    k.onAct({ play: function () { if (clock.running) stop(); else play(); } });

    update();
    return {
      set: function (o) { stop(); s.sweep = false; Object.assign(s, o); showAll(); update(); },
      play: function () { if (s.sweep) play(); },
      seek: function () {}
    };
  }

  window.PlaneSim = { mount: mount };
})();
