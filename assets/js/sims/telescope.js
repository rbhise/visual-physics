/*
 * How telescopes collect light. Parallel rays from a distant star enter from the left.
 *   refractor  – a convex objective lens brings them to a focus; an eyepiece lens sends them to the eye.
 *   newtonian  – a concave mirror at the back; a small plane mirror at 45° sends the light out of the side.
 *   cassegrain – a concave mirror with a hole; a small convex mirror sends the light back through the hole.
 *   radio      – a parabolic dish reflects radio waves to a receiver at its focus.
 * The aperture slider shows how much more light a wider telescope gathers than the eye (pupil ≈ 7 mm).
 * Needs sim-kit.js.  TelescopeSim.mount(el, { type: "refractor", D: 10 }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit, PUPIL = 0.7;   // cm
  var INFO = {
    refractor:  { name: "Refracting (Galilean)", collect: "Convex objective lens", eye: "Eyepiece lens", note: "Lenses refract the light. Big lenses are heavy, sag under their own weight and give coloured fringes, so very large telescopes use mirrors instead." },
    newtonian:  { name: "Reflecting (Newtonian)", collect: "Concave mirror", eye: "Plane mirror at 45°, then eyepiece", note: "Newton's design: the big concave mirror at the back reflects the light to a focus; a small flat mirror turns it out through the side of the tube." },
    cassegrain: { name: "Reflecting (Cassegrain)", collect: "Concave mirror with a hole", eye: "Convex mirror, then eyepiece behind", note: "A small convex mirror reflects the light back through a hole in the big mirror, so the eyepiece is at the back and the tube can be short." },
    radio:      { name: "Radio telescope", collect: "Parabolic metal dish", eye: "Radio receiver at the focus", note: "A dish collects radio waves the way a concave mirror collects light. The signals go to computers that turn them into images." }
  };

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "tsim";
    var s = Object.assign({ type: "refractor", D: 10 }, opts);

    var k = K.frame(root, {
      aspect: window.matchMedia("(max-width: 600px)").matches ? "4 / 3" : "5 / 2.8",
      label: "Ray diagram of a telescope collecting parallel light from a distant star",
      panel: K.chips("type", "Telescope", [["refractor", "Refracting"], ["newtonian", "Newtonian"], ["cassegrain", "Cassegrain"], ["radio", "Radio dish"]]) +
        '<div data-for="optical">' + K.slider(id, "D", "Aperture (width of the lens or mirror)", 5, 250, 1, "cm") + '</div>' + K.hint("note"),
      readouts: [["name", "Type", "wrap"], ["collect", "Light is collected by", "wrap"], ["eye", "Then sent to the eye by", "wrap"],
                 ["D", "Aperture D", "c-path"], ["gain", "Light gathered compared with your eye", "c-vy"], ["area", "Collecting area"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");

    function update() {
      var I = INFO[s.type], radio = s.type === "radio";
      k.set("name", I.name); k.set("collect", I.collect); k.set("eye", I.eye);
      spans[2].textContent = radio ? "Signal goes to" : "Then sent to the eye by";
      spans[1].textContent = radio ? "Radio waves are collected by" : "Light is collected by";
      spans[4].textContent = radio ? "Dishes at the GMRT" : "Light gathered compared with your eye";
      root.querySelector('[data-for="optical"]').style.display = radio ? "none" : "";
      if (radio) {
        k.set("D", "45 m (one GMRT dish)"); k.set("gain", "30, working together"); k.set("area", Math.round(Math.PI * 22.5 * 22.5).toLocaleString("en-IN") + " m² per dish");
      } else {
        var g = Math.pow(s.D / PUPIL, 2);
        k.set("D", s.D >= 100 ? K.fmt(s.D / 100, 2) + " m" : s.D + " cm");
        k.set("gain", "about " + Math.round(g).toLocaleString("en-IN") + " times");
        k.set("area", Math.round(Math.PI * Math.pow(s.D / 2, 2)).toLocaleString("en-IN") + " cm²");
      }
      k.el('[data-r="note"]').textContent = I.note + (radio ? "" : " Light gathered depends on area: double the width and you collect four times as much light.");
      k.redraw();
    }

    function lens(ctx, x, cy, h, c, convex) {
      ctx.fillStyle = "rgba(120,170,220,0.35)"; ctx.strokeStyle = c.vx; ctx.lineWidth = 1.5; ctx.beginPath();
      var b = convex ? 10 : -6;
      ctx.moveTo(x, cy - h); ctx.quadraticCurveTo(x + b, cy, x, cy + h); ctx.quadraticCurveTo(x - b, cy, x, cy - h); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    function ray(ctx, pts, col) {
      ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
      var a = pts[0], b = pts[1], mx = a[0] + (b[0] - a[0]) * 0.4, my = a[1] + (b[1] - a[1]) * 0.4, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      K.arrow(ctx, mx - Math.cos(ang) * 5, my - Math.sin(ang) * 5, mx + Math.cos(ang) * 5, my + Math.sin(ang) * 5, col, 1.8, 8);
    }
    function eye(ctx, x, y, c, dir) {
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.ellipse(x, y, 7, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.surface; ctx.beginPath(); ctx.arc(x - dir * 3, y, 3, 0, Math.PI * 2); ctx.fill();
    }
    function label(ctx, t, x, y, c, col, align) { ctx.fillStyle = col || c.muted; ctx.font = "11px " + c.font; ctx.textAlign = align || "center"; ctx.textBaseline = "middle"; ctx.fillText(t, x, y); }

    k.draw = function (ctx, W, H, c) {
      var cy = H * 0.5, narrow = W < 520, hw = Math.min(H * 0.3, 22 + 50 * Math.sqrt(s.D / 250)), col = c.vy;
      var tubeL = W * 0.14, tubeR = W * 0.84;
      var ys = [-0.75, 0, 0.75].map(function (f) { return cy + f * hw * 0.9; });
      if (s.type === "radio") {
        // parabolic dish facing left, receiver at focus
        var vx = W * 0.72, fpx = W * 0.22, a = 1 / (4 * fpx), ap = H * 0.4, fx = vx - fpx;
        ctx.strokeStyle = c.ink; ctx.lineWidth = 4; ctx.beginPath();
        for (var y = -ap; y <= ap; y += 3) { var x = vx - a * y * y; y === -ap ? ctx.moveTo(x, cy + y) : ctx.lineTo(x, cy + y); }
        ctx.stroke();
        ctx.strokeStyle = c.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(vx - a * ap * ap, cy - ap); ctx.lineTo(fx, cy); ctx.lineTo(vx - a * ap * ap, cy + ap); ctx.moveTo(vx, cy); ctx.lineTo(vx + 40, cy + H * 0.36); ctx.stroke();
        [-0.85, -0.5, -0.2, 0.2, 0.5, 0.85].forEach(function (f) {
          var yy = f * ap, hx = vx - a * yy * yy;
          ray(ctx, [[10, cy + yy], [hx, cy + yy], [fx, cy]], c.good);
        });
        ctx.fillStyle = c.vy; ctx.fillRect(fx - 7, cy - 7, 14, 14);
        label(ctx, "receiver", fx, cy - 18, c, c.vy); label(ctx, "parabolic dish", vx + 6, cy - ap - 10, c, c.ink, "right");
        label(ctx, "radio waves from space", 10, cy - ap * 0.95, c, c.good, "left");
        return;
      }
      // tube
      ctx.strokeStyle = c.line; ctx.lineWidth = 2; ctx.strokeRect(tubeL, cy - hw - 8, tubeR - tubeL, 2 * hw + 16);
      label(ctx, "starlight", 10, ys[0] - 14, c, col, "left");
      if (s.type === "refractor") {
        var xo = tubeL + 8, fo = (tubeR - tubeL) * 0.72, xf = xo + fo, fe = (tubeR - tubeL) * 0.12, xe = xf + fe;
        lens(ctx, xo, cy, hw + 6, c, true); lens(ctx, xe, cy, hw * 0.35 + 6, c, true);
        ys.forEach(function (y) {
          var off = (y - cy) * fe / fo;   // after the eyepiece the beam is narrower by fe/fo
          ray(ctx, [[8, y], [xo, y], [xf, cy], [xe, cy - off], [W - 14, cy - off]], col);
        });
        eye(ctx, W - 10, cy, c, -1);
        label(ctx, "objective lens", xo, cy + hw + 22, c); label(ctx, "focus", xf, cy + 12, c); label(ctx, "eyepiece", xe, cy + hw * 0.35 + 22, c);
      } else if (s.type === "newtonian") {
        var xm = tubeR - 6, fm = (tubeR - tubeL) * 0.78, xfoc = xm - fm, xp = xfoc + hw * 0.55, yTop = cy - hw - 8;
        // concave primary
        ctx.strokeStyle = c.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xm - 8, cy - hw); ctx.quadraticCurveTo(xm + 8, cy, xm - 8, cy + hw); ctx.stroke();
        // flat secondary at 45°
        var sm = hw * 0.32;
        ctx.strokeStyle = c.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xp - sm * 0.7, cy - sm * 0.7); ctx.lineTo(xp + sm * 0.7, cy + sm * 0.7); ctx.stroke();
        ys.forEach(function (y) {
          if (Math.abs(y - cy) < 1) { ray(ctx, [[8, y], [xp - 4, y]], col); return; }   // the centre is blocked by the small mirror
          var tt = (xm - xp) / (xm - xfoc), yAt = y + (cy - y) * tt;   // where the converging ray meets the flat mirror (approx.)
          ray(ctx, [[8, y], [xm - 4, y], [xp, yAt], [xp + (y - cy) * 0.25, yTop - 26]], col);
        });
        ctx.fillStyle = c.line; ctx.fillRect(xp - 10, yTop - 26, 20, 18);
        eye(ctx, xp, yTop - 40, c, 0);
        label(ctx, "concave mirror", xm, cy + hw + 22, c, c.ink, "right"); label(ctx, "plane mirror", xp, cy + sm + 14, c); label(ctx, "eyepiece", xp + 18, yTop - 17, c, c.muted, "left");
      } else {
        var xm2 = tubeR - 10, xs2 = tubeL + (tubeR - tubeL) * 0.32, hole = 7, yHole = cy;
        ctx.strokeStyle = c.ink; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(xm2 - 8, cy - hw); ctx.quadraticCurveTo(xm2 + 4, cy - hw * 0.5, xm2, cy - hole); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(xm2 - 8, cy + hw); ctx.quadraticCurveTo(xm2 + 4, cy + hw * 0.5, xm2, cy + hole); ctx.stroke();
        var sh = hw * 0.28; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(xs2 + 4, cy - sh); ctx.quadraticCurveTo(xs2 - 6, cy, xs2 + 4, cy + sh); ctx.stroke();
        ys.forEach(function (y) {
          if (Math.abs(y - cy) < 1) return;   // blocked by the small mirror
          var t = (xm2 - xs2) / (xm2 - xs2 + (tubeR - tubeL) * 0.12), ys2 = y + (cy - y) * t;
          ray(ctx, [[8, y], [xm2 - 4 * Math.abs(y - cy) / hw, y], [xs2 + 2, ys2], [W - 26, yHole]], col);
        });
        // central ray hits the back of the secondary
        ray(ctx, [[8, cy], [xs2 - 6, cy]], col);
        eye(ctx, W - 12, cy, c, -1);
        label(ctx, "concave mirror (with hole)", xm2, cy + hw + 22, c, c.ink, "right"); label(ctx, "convex mirror", xs2, cy - sh - 12, c);
      }
      // what you see: more stars with bigger aperture
      var bx = 10, by = H - (narrow ? 58 : 66), bw = narrow ? 70 : 90, bh = narrow ? 48 : 56;
      ctx.fillStyle = "#0b1020"; ctx.fillRect(bx, by, bw, bh);
      var nstars = Math.round(4 + 26 * Math.log10(1 + Math.pow(s.D / PUPIL, 2)) / Math.log10(1 + Math.pow(250 / PUPIL, 2)) * 3);
      var seed = 11; for (var i = 0; i < nstars; i++) { seed = (seed * 16807) % 2147483647; var px = bx + 3 + (seed % 1000) / 1000 * (bw - 6); seed = (seed * 16807) % 2147483647; var py = by + 3 + (seed % 1000) / 1000 * (bh - 6);
        ctx.fillStyle = "#fff"; ctx.globalAlpha = i < 4 ? 1 : 0.55; ctx.fillRect(px, py, i < 4 ? 2 : 1.3, i < 4 ? 2 : 1.3); }
      ctx.globalAlpha = 1; label(ctx, "what you see", bx + bw + 6, by + bh / 2, c, c.muted, "left");
    };

    var showD = k.bindSlider("D", function () { return s.D; }, function (v) { s.D = v; update(); }, function (v) { return v >= 100 ? (v / 100).toFixed(2) + " m" : v + " cm"; });
    var showT = k.bindChips("type", function () { return s.type; }, function (v) { s.type = v; update(); });
    update();
    return { set: function (o) { Object.assign(s, o); showD(); showT(); update(); }, play: function () {}, seek: function () {} };
  }

  window.TelescopeSim = { mount: mount };
})();
