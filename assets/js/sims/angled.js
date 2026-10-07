/*
 * Two plane mirrors at an angle A, seen from above, with an object on the line halfway between them.
 * Every image is drawn where it appears; faded images need more reflections. A reversed flag shows a
 * mirror-reversed copy (odd number of reflections). Number of images n = 360°/A − 1.
 * Needs sim-kit.js.  AngledSim.mount(el, { A: 90 }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit, D = Math.PI / 180;
  var ANGLES = [180, 120, 90, 72, 60, 45, 40, 36, 30];

  function mount(root, opts) {
    opts = opts || {};
    var s = Object.assign({ A: 90, wedges: true }, opts);

    var k = K.frame(root, {
      aspect: window.matchMedia("(max-width: 600px)").matches ? "1 / 0.9" : "5 / 3.4",
      label: "Top view of two mirrors at an angle with an object between them and all its images around a circle",
      panel: K.chips("A", "Angle between the mirrors A", ANGLES.map(function (a) { return [a, a + "°"]; })) +
        K.check(root.id || "asim", "wedges", "Show where each image sits (dashed sectors)", s.wedges) + K.hint("note"),
      readouts: [["A", "Angle A", "c-path"], ["q", "360° ÷ A"], ["n", "Images n = 360°/A − 1", "c-vy"],
                 ["one", "Seen after one reflection"], ["more", "Need two or more reflections"], ["rev", "Mirror-reversed images"]],
      cols: 3
    });

    function images() {   // [{m, count, M:[a,b,c,d]}] — transform about the corner, in maths coordinates (y up)
      var N = Math.round(360 / s.A), A = s.A * D, phi1 = -Math.PI / 2 - A / 2, list = [];
      function rot(t) { return [Math.cos(t), Math.sin(t), -Math.sin(t), Math.cos(t)]; }
      function refl(p) { return [Math.cos(2 * p), Math.sin(2 * p), Math.sin(2 * p), -Math.cos(2 * p)]; }
      for (var m = 1; m < N; m++) {
        var ccw = m <= N / 2, j = ccw ? m : N - m, M;
        if (ccw) M = j % 2 ? refl(phi1 + (j + 1) * A / 2) : rot(j * A);
        else M = j % 2 ? refl(phi1 - (j - 1) * A / 2) : rot(-j * A);
        list.push({ m: m, count: j, M: M });
      }
      return list;
    }

    function update() {
      var N = Math.round(360 / s.A), im = images();
      var one = im.filter(function (x) { return x.count === 1; }).length;
      k.set("A", s.A + "°"); k.set("q", N); k.set("n", N - 1);
      k.set("one", one); k.set("more", N - 1 - one); k.set("rev", im.filter(function (x) { return x.count % 2; }).length);
      k.el('[data-r="note"]').textContent = s.A === 180
        ? "At 180° the two mirrors make one flat mirror, so there is just one image."
        : "360° ÷ " + s.A + "° = " + N + ", so there are " + N + " − 1 = " + (N - 1) + " images. Light bounces between the mirrors to make the extra ones.";
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var A = s.A * D, ox = W / 2, oy = H * 0.5, R = Math.min(W, H) * 0.44, rho = R * 0.62;
      var phi1 = -Math.PI / 2 - A / 2, N = Math.round(360 / s.A);
      // screen point from maths coords
      function P(x, y) { return [ox + x, oy - y]; }
      if (s.wedges) {
        ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = c.line; ctx.lineWidth = 1;
        for (var m = 0; m < N; m++) { var a = phi1 + m * A, q = P(Math.cos(a) * R, Math.sin(a) * R); ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(ox, oy, rho, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }
      // the open wedge in front of the mirrors
      ctx.fillStyle = c.tint; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(ox, oy);
      ctx.arc(ox, oy, R, -(phi1 + A), -phi1); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;

      // object: arrow pointing outward with a flag on one side, drawn in maths coords then transformed
      function drawObj(M, alpha, dash, col) {
        ctx.save(); ctx.translate(ox, oy); ctx.scale(1, -1); ctx.transform(M[0], M[1], M[2], M[3], 0, 0);
        ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3; ctx.lineCap = "round";
        var y0 = -rho + 16, y1 = -rho - 18, sz = Math.max(10, R * 0.06);   // object sits on the bisector (straight down)
        ctx.setLineDash(dash ? [4, 3] : []);
        ctx.beginPath(); ctx.moveTo(0, -rho + sz * 1.3); ctx.lineTo(0, -rho - sz * 1.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-sz * 0.6, -rho - sz * 0.6); ctx.lineTo(0, -rho - sz * 1.4); ctx.lineTo(sz * 0.6, -rho - sz * 0.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -rho + sz * 0.2); ctx.lineTo(sz * 1.1, -rho + sz * 0.6); ctx.lineTo(0, -rho + sz * 1.0); ctx.closePath();
        if (dash) ctx.stroke(); else ctx.fill();
        ctx.restore();
        void y0; void y1;
      }
      var im = images();
      im.forEach(function (x) { drawObj(x.M, x.count === 1 ? 0.9 : Math.max(0.35, 0.8 - 0.12 * x.count), true, c.vy); });
      drawObj([1, 0, 0, 1], 1, false, c.path);
      // reflection counts
      ctx.font = "600 11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = c.muted;
      if (N <= 12) im.forEach(function (x) {
        var a = phi1 + A / 2 + x.m * A, q = P(Math.cos(a) * (rho + R * 0.24), Math.sin(a) * (rho + R * 0.24));
        ctx.fillText(x.count + "×", q[0], q[1]);
      });
      // mirrors with hatching on the back
      [phi1, phi1 + A].forEach(function (a, n) {
        var q = P(Math.cos(a) * R, Math.sin(a) * R);
        ctx.strokeStyle = c.ink; ctx.lineWidth = 5; ctx.lineCap = "butt"; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(q[0], q[1]); ctx.stroke();
        var back = n === 0 ? a - Math.PI / 2 : a + Math.PI / 2, bx = Math.cos(back) * 8, by = -Math.sin(back) * 8;
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1;
        for (var t = 10; t < R; t += 10) { var p = P(Math.cos(a) * t, Math.sin(a) * t); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + bx, p[1] + by); ctx.stroke(); }
      });
      // angle arc
      ctx.strokeStyle = c.path; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox, oy, R * 0.2, -(phi1 + A), -phi1); ctx.stroke();
      ctx.fillStyle = c.path; ctx.font = "700 13px " + c.font; ctx.fillText(s.A + "°", ox, oy + R * 0.2 + 14 + (s.A > 150 ? 6 : 0));
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "left";
      ctx.fillText(W < 520 ? "n× = reflections" : "number × = reflections needed", 10, H - 12);
      ctx.fillStyle = c.path; ctx.textAlign = "right"; ctx.fillText("solid: object", W - 10, H - 26);
      ctx.fillStyle = c.vy; ctx.fillText("dashed: images", W - 10, H - 12);
    };

    var showA = k.bindChips("A", function () { return s.A; }, function (v) { s.A = +v; update(); });
    var wedges = k.bindCheck("wedges", function (on) { s.wedges = on; update(); });
    update();
    return { set: function (o) { Object.assign(s, o); showA(); wedges.checked = s.wedges; update(); }, play: function () {}, seek: function () {} };
  }

  window.AngledSim = { mount: mount };
})();
