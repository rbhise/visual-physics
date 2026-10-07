/*
 * Spherical mirror ray diagram. Choose a concave or convex mirror, move the object, and the three
 * standard rays find the image. With { signs: true } the readouts use the Cartesian sign convention
 * and the diagram shows u and v as signed distances; 1/v + 1/u = 1/f and m = −v/u.
 * Vertical sizes are stretched so the object is easy to see; straight lines stay straight, so the
 * construction is still exact.
 * Needs sim-kit.js.  MirrorSim.mount(el, { type: "concave", u: 30, f: 10, h: 3, signs: false }) → { set, play }
 */
(function () {
  "use strict";
  var K = window.SimKit;

  function solve(s) {
    var fs = s.type === "concave" ? -s.f : s.f, us = -s.u, inv = 1 / fs - 1 / us;
    var inf = Math.abs(inv) < 1e-9, vs = inf ? Infinity : 1 / inv, m = inf ? Infinity : -vs / us;
    return { fs: fs, us: us, vs: vs, m: m, inf: inf };
  }
  function near(a, b) { return Math.abs(a - b) < 1e-6; }

  function describe(s, r) {
    var f = s.f, u = s.u, obj, img, size;
    if (s.type === "convex") { obj = "In front of the mirror"; img = "Behind the mirror, between P and F"; }
    else if (near(u, f)) { obj = "At F"; img = "At infinity"; }
    else if (u < f) { obj = "Between P and F"; img = "Behind the mirror"; }
    else if (u < 2 * f && !near(u, 2 * f)) { obj = "Between F and C"; img = "Beyond C"; }
    else if (near(u, 2 * f)) { obj = "At C"; img = "At C"; }
    else { obj = "Beyond C"; img = "Between F and C"; }
    var am = Math.abs(r.m);
    size = r.inf ? "Highly magnified" : near(am, 1) ? "Same size" : am > 1 ? "Magnified" : "Diminished";
    var nature = r.inf ? "Real, inverted" : r.vs > 0 ? "Virtual, erect" : "Real, inverted";
    return { obj: obj, img: img, size: size, nature: nature };
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "msim";
    var s = Object.assign({ type: "concave", u: 30, f: 10, h: 3, signs: false, sweep: false }, opts);

    var k = K.frame(root, {
      aspect: window.matchMedia("(max-width: 600px)").matches ? "4 / 3.4" : "5 / 3",
      label: "Ray diagram for a spherical mirror: an object arrow, three rays and the image they form",
      panel: K.chips("type", "Mirror", [["concave", "Concave"], ["convex", "Convex"]]) +
        K.slider(id, "u", "Object distance from the mirror", 2, 60, 0.5, "cm") +
        K.slider(id, "f", "Focal length f", 5, 20, 1, "cm") +
        K.slider(id, "h", "Object height", 1, 5, 0.5, "cm") +
        K.buttons([["play", "Move the object closer"]]) + K.hint("note"),
      readouts: [["u", "Object distance u", "c-path"], ["v", "Image distance v", "c-vy"], ["f", "Focal length f"],
                 ["m", s.signs ? "Magnification m" : "Image height", ""], ["nat", "Image", "wrap"], ["pos", "Image position", "wrap"]],
      cols: 3
    });

    function cm(x, signed) { return signed ? (x > 0 ? "+" : x < 0 ? "−" : "") + K.fmt(Math.abs(x), 1) + " cm" : K.fmt(Math.abs(x), 1) + " cm"; }

    function update() {
      var r = solve(s), d = describe(s, r);
      if (s.signs) {
        k.set("u", cm(r.us, true)); k.set("f", cm(r.fs, true));
        k.set("v", r.inf ? "∞" : cm(r.vs, true));
        k.set("m", r.inf ? "∞" : (r.m > 0 ? "+" : r.m < 0 ? "−" : "") + K.fmt(Math.abs(r.m), 2));
      } else {
        k.set("u", K.fmt(s.u, 1) + " cm"); k.set("f", K.fmt(s.f, 1) + " cm");
        k.set("v", r.inf ? "at infinity" : K.fmt(Math.abs(r.vs), 1) + " cm " + (r.vs > 0 ? "behind" : "in front"));
        k.set("m", r.inf ? "very large" : K.fmt(Math.abs(r.m * s.h), 1) + " cm");
      }
      k.set("nat", d.nature + ", " + d.size.toLowerCase());
      k.set("pos", d.img);
      var note = "Object: " + d.obj + ".";
      if (s.signs && !r.inf) note += " 1/v + 1/u = 1/(" + K.fmt(r.vs, 1) + ") + 1/(" + K.fmt(r.us, 1) + ") = 1/(" + K.fmt(r.fs, 1) + ") = 1/f.";
      else if (s.type === "concave" && near(s.u, s.f)) note += " The reflected rays are parallel, so they never meet: the image is at infinity.";
      else if (r.vs > 0) note += " The reflected rays spread out; they only seem to meet behind the mirror (dashed).";
      else note += " The reflected rays really meet in front of the mirror, so the image can be caught on a screen.";
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var r = solve(s), concave = s.type === "concave";
      var xP = concave ? W * 0.7 : W * 0.62, ay = H * 0.5, sx = (xP - 24) / 62,
          big = r.inf ? 5 : Math.max(5, Math.min(Math.abs(r.m * s.h), 9)), sy = (H * 0.4) / big;
      var X = function (x) { return xP + x * sx; }, Y = function (y) { return ay - y * sy; };
      var F = r.fs, C = 2 * r.fs, T = [-s.u, s.h];

      // clip everything to the stage
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();

      // principal axis and marks
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(W, ay); ctx.stroke();
      ctx.font = "600 12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
      [["P", 0], ["F", F], ["C", C]].forEach(function (q) {
        var x = X(q[1]); if (x < 6 || x > W - 6) return;
        ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(x, ay, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillText(q[0], x + (q[0] === "P" ? (concave ? 10 : -10) : 0), ay + 6);
      });

      // mirror: a gentle arc through the pole, hatched on its back
      var ap = H * 0.44, depth = Math.min(16, 220 / s.f), dir = concave ? -1 : 1;
      ctx.strokeStyle = c.ink; ctx.lineWidth = 4; ctx.beginPath();
      for (var y = -ap; y <= ap; y += 4) { var x = xP + dir * depth * (y / ap) * (y / ap); y === -ap ? ctx.moveTo(x, ay + y) : ctx.lineTo(x, ay + y); }
      ctx.stroke();
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
      for (y = -ap + 4; y <= ap; y += 10) { var hx = xP + dir * depth * (y / ap) * (y / ap); ctx.beginPath(); ctx.moveTo(hx + 2, ay + y); ctx.lineTo(hx + 9, ay + y - 6); ctx.stroke(); }

      function seg(p, q, col, dash) {
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash ? [6, 5] : []);
        ctx.beginPath(); ctx.moveTo(X(p[0]), Y(p[1])); ctx.lineTo(X(q[0]), Y(q[1])); ctx.stroke(); ctx.restore();
        if (!dash) {
          var x1 = X(p[0]), y1 = Y(p[1]), x2 = X(q[0]), y2 = Y(q[1]), L = Math.hypot(x2 - x1, y2 - y1);
          if (L > 40) { var a = Math.atan2(y2 - y1, x2 - x1), mx = x1 + (x2 - x1) * 0.5, my = y1 + (y2 - y1) * 0.5; K.arrow(ctx, mx - Math.cos(a) * 5, my - Math.sin(a) * 5, mx + Math.cos(a) * 5, my + Math.sin(a) * 5, col, 2, 9); }
        }
      }
      // reflected ray from hit point M with direction d (cm units) to well off screen
      function out(M, d) { var L = 400; return [M[0] + d[0] * L, M[1] + d[1] * L]; }
      var cols = [c.vx, c.good, c.bad];
      var rays = [];
      // 1: parallel to the axis → through F (or away from F)
      var M1 = [0, s.h], d1 = concave ? [F - 0, 0 - s.h] : [0 - F, s.h - 0];
      rays.push({ M: M1, d: d1, back: concave ? null : [F, 0] });
      // 2: towards F → parallel to the axis
      if (!(concave && near(s.u, s.f))) {
        var y2 = s.h * F / (s.u + F);
        rays.push({ M: [0, y2], d: [-1, 0], back: concave ? null : [F, 0] });
      }
      // 3: towards C → straight back
      if (!(concave && near(s.u, 2 * s.f))) {
        var y3 = 2 * s.h * F / (s.u + 2 * F);
        rays.push({ M: [0, y3], d: [T[0] - 0, T[1] - y3], back: concave ? null : [C, 0] });
      }
      rays.forEach(function (q, n) {
        var col = cols[n % 3], dl = Math.hypot(q.d[0], q.d[1]), d = [q.d[0] / dl, q.d[1] / dl];
        seg(T, q.M, col, false);
        if (!concave) seg(q.M, q.back, col, true);   // convex: incident ray aimed at F or C behind the mirror
        seg(q.M, out(q.M, d), col, false);
        if (!r.inf && r.vs > 0) seg(q.M, [r.vs, r.m * s.h], col, true);   // virtual: extend back to the image
      });

      // object and image
      K.arrow(ctx, X(T[0]), ay, X(T[0]), Y(s.h), c.path, 3.5, 12);
      ctx.fillStyle = c.path; ctx.font = "600 12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.fillText("object", X(T[0]), Y(s.h) - 6);
      if (!r.inf) {
        var ix = X(r.vs), iy = Y(r.m * s.h);
        ctx.save(); if (r.vs > 0) ctx.setLineDash([5, 4]);
        K.arrow(ctx, ix, ay, ix, iy, c.vy, 3.5, 12);
        if (r.vs > 0) { ctx.strokeStyle = c.vy; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ix, ay); ctx.lineTo(ix, iy); ctx.stroke(); }
        ctx.restore();
        ctx.fillStyle = c.vy; ctx.textBaseline = r.m > 0 ? "bottom" : "top";
        if (ix > 0 && ix < W) ctx.fillText("image", Math.max(28, Math.min(W - 28, ix)), Math.max(14, Math.min(H - 14, iy + (r.m > 0 ? -6 : 6))));
        if (ix < 0 || ix > W || iy < 0 || iy > H) { ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("image is off the screen", 10, 10); }
      }

      // sign convention: arrows from P and signed distances
      if (s.signs) {
        var yb = H - 12;
        ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        K.arrow(ctx, X(0), yb, X(0) + 46, yb, c.muted, 1.5, 7); ctx.fillText("+", X(0) + 54, yb);
        K.arrow(ctx, X(0), yb, X(0) - 46, yb, c.muted, 1.5, 7); ctx.fillText("−", X(0) - 54, yb);
        function dim(x0, x1, yy, txt, col) {
          ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(X(x0), yy); ctx.lineTo(X(x1), yy);
          ctx.moveTo(X(x0), yy - 4); ctx.lineTo(X(x0), yy + 4); ctx.moveTo(X(x1), yy - 4); ctx.lineTo(X(x1), yy + 4); ctx.stroke();
          ctx.fillStyle = col; ctx.font = "600 12px " + c.font; ctx.textBaseline = "bottom"; ctx.fillText(txt, (X(x0) + X(x1)) / 2, yy - 3);
        }
        dim(0, T[0], H * 0.14, "u = " + cm(r.us, true), c.path);
        if (!r.inf && Math.abs(X(r.vs) - X(0)) > 24 && X(r.vs) > 10 && X(r.vs) < W - 10) dim(0, r.vs, H * 0.8, "v = " + cm(r.vs, true), c.vy);
      }
      ctx.restore();
    };

    var showU = k.bindSlider("u", function () { return s.u; }, function (v) { stop(); s.u = v; update(); }, function (v) { return (+v).toFixed(1) + " cm"; });
    var showF = k.bindSlider("f", function () { return s.f; }, function (v) { s.f = v; update(); });
    var showH = k.bindSlider("h", function () { return s.h; }, function (v) { s.h = v; update(); }, function (v) { return (+v).toFixed(1) + " cm"; });
    var showT = k.bindChips("type", function () { return s.type; }, function (v) { s.type = v; update(); });
    function showAll() { showU(); showF(); showH(); showT(); }

    // Play: walk the object in from 58 cm to 2 cm
    var clock = K.clock(function (dt) {
      s.u = Math.max(2, Math.round((s.u - dt * 7) * 100) / 100);
      showU(); update(); return s.u > 2;
    });
    clock.onStop = function () { k.btn("play").textContent = "Move the object closer"; };
    function stop() { if (clock.running) { clock.stop(); clock.onStop(); } }
    function play() { stop(); if (s.u <= 3) s.u = 58; k.btn("play").textContent = "Pause"; clock.start(); }
    k.onAct({ play: function () { if (clock.running) stop(); else play(); } });

    update();
    return {
      set: function (o) { stop(); s.sweep = false; Object.assign(s, o); if (o.sweep) s.u = 58; showAll(); update(); },
      play: function () { if (s.sweep) play(); },
      seek: function (u) { stop(); s.u = u; showAll(); update(); },
      state: function () { return Object.assign({}, s, solve(s)); }
    };
  }

  window.MirrorSim = { mount: mount };
})();
