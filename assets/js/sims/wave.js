/*
 * Sound as a wave. A speaker pushes air particles back and forth: compressions and rarefactions
 * travel away from it, while each particle only shakes about its own place. Below, a graph shows
 * the air density along the same stretch, with wavelength and amplitude marked.
 * Switch to "string" to compare with a transverse wave. Tick "vacuum" to remove the air.
 * The motion is slowed down enormously so it can be seen; speed in air is taken as 340 m/s.
 * Needs sim-kit.js.  WaveSim.mount(el, { f: 340, amp: 3, mode: "long" }) → { set, play, seek }
 */
(function () {
  "use strict";
  var K = window.SimKit, V = 340, WINDOW = 4;   // speed (m/s) and length of air shown (m)

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "wsim";
    var s = Object.assign({ f: 340, amp: 3, mode: "long", vacuum: false, t: 0 }, opts);
    // fixed random offsets so the particles look like air rather than a grid
    var seed = 7, J = []; for (var i = 0; i < 2000; i++) { seed = (seed * 16807) % 2147483647; J.push(seed / 2147483647 - 0.5); }

    var k = K.frame(root, {
      aspect: window.matchMedia("(max-width: 600px)").matches ? "4 / 3.6" : "5 / 3",
      label: "Air particles in front of a vibrating speaker, and a graph of air density along the same distance",
      panel: K.chips("mode", "Wave in", [["long", "Air (longitudinal)"], ["trans", "String (transverse)"]]) +
        K.slider(id, "f", "Frequency ν", 170, 1020, 10, "Hz") +
        K.slider(id, "amp", "Amplitude (loudness)", 1, 5, 1, "") +
        '<div>' + K.check(id, "vacuum", "Remove the air (vacuum)", s.vacuum) + '</div>' +
        K.buttons([["play", "Pause"]]) + K.hint("note"),
      readouts: [["f", "Frequency ν", "c-path"], ["T", "Time period T"], ["lam", "Wavelength λ = v ÷ ν", "c-vy"],
                 ["v", "Speed v"], ["pitch", "Pitch"], ["loud", "Loudness"]],
      cols: 3
    });

    function lam() { return V / s.f; }
    function update() {
      var vac = s.vacuum && s.mode === "long";
      k.set("f", s.f + " Hz"); k.set("T", K.fmt(1000 / s.f, 2) + " ms");
      k.set("lam", vac ? "–" : K.fmt(lam(), 2) + " m"); k.set("v", vac ? "no sound" : V + " m/s");
      k.set("pitch", s.f < 400 ? "Low" : s.f < 700 ? "Medium" : "High");
      k.set("loud", ["Very soft", "Soft", "Moderate", "Loud", "Very loud"][s.amp - 1]);
      k.el('[data-r="note"]').textContent = vac
        ? "The speaker still vibrates, but with no particles to pass the vibration on, no sound travels. Sound needs a medium."
        : s.mode === "long"
          ? "Each particle (the red one, for example) only moves back and forth about its own place. What travels is the pattern of compressions (C) and rarefactions (R)."
          : "On a string the particles move up and down, at right angles to the direction the wave travels: a transverse wave with crests and troughs.";
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var vac = s.vacuum && s.mode === "long", narrow = W < 520;
      var xs = narrow ? 44 : 64, xe = W - 12, Lpx = xe - xs, lpx = lam() / WINDOW * Lpx;
      var kk = 2 * Math.PI / lpx, cvis = Lpx / 4, om = kk * cvis, ph = om * s.t;   // visual speed: crosses the strip in 4 s
      var A = Math.min(22, (s.amp / 5) * 0.14 * lpx), top = H * 0.06, band = H * (narrow ? 0.42 : 0.4);
      var disp = function (x) { var u = x - xs; return u < 0 ? 0 : A * Math.sin(kk * u - ph); };

      // speaker
      var sy = top + band / 2, cone = disp(xs) * 0.6;
      ctx.fillStyle = c.ink; ctx.fillRect(6, sy - 14, 12, 28);
      ctx.beginPath(); ctx.moveTo(18, sy - 10); ctx.lineTo(xs - 18 + cone, sy - band * 0.42); ctx.lineTo(xs - 18 + cone, sy + band * 0.42); ctx.lineTo(18, sy + 10); ctx.closePath();
      ctx.fillStyle = c.line; ctx.fill(); ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.stroke();

      if (s.mode === "long") {
        if (!vac) {
          var cols = Math.round(Lpx / (narrow ? 5 : 6)), rows = narrow ? 8 : 10, sp = Lpx / cols, n = 0;
          ctx.fillStyle = c.muted;
          for (var r = 0; r < rows; r++) for (var q = 0; q < cols; q++, n++) {
            var x0 = xs + (q + 0.5 + J[n % J.length] * 0.6) * sp, y0 = top + (r + 0.5 + J[(n * 7) % J.length] * 0.5) * band / rows;
            ctx.beginPath(); ctx.arc(x0 + disp(x0), y0, 1.8, 0, Math.PI * 2); ctx.fill();
          }
          // a tagged particle
          var tx = xs + Lpx * 0.42, ty = top + band * 0.5;
          ctx.strokeStyle = c.bad; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx - A, ty + 9); ctx.lineTo(tx + A, ty + 9); ctx.stroke();
          ctx.fillStyle = c.bad; ctx.beginPath(); ctx.arc(tx + disp(tx), ty, 4.5, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = c.muted; ctx.font = "13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("vacuum: no particles", xs + Lpx / 2, sy);
        }
      } else {
        // string: beads moving up and down
        var nb = Math.round(Lpx / 10), Ay = Math.min(band * 0.4, A * 2.2);
        ctx.strokeStyle = c.line; ctx.lineWidth = 1.5; ctx.beginPath();
        for (var b = 0; b <= nb; b++) { var bx = xs + b * Lpx / nb, by = sy - Ay / A * disp(bx); b ? ctx.lineTo(bx, by) : ctx.moveTo(bx, by); }
        ctx.stroke();
        for (b = 0; b <= nb; b++) {
          var px = xs + b * Lpx / nb; ctx.fillStyle = Math.abs(px - (xs + Lpx * 0.42)) < Lpx / nb / 2 ? c.bad : c.muted;
          ctx.beginPath(); ctx.arc(px, sy - Ay / A * disp(px), px === xs ? 2 : 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      // direction of travel
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "right"; ctx.textBaseline = "top";
      if (!vac) K.arrow(ctx, xe - 110, top + band + 8, xe - 40, top + band + 8, c.muted, 1.5, 8);
      if (!vac && !narrow) ctx.fillText("wave travels", xe - 116, top + band + 2);

      // graph of density (or displacement on a string)
      var gy0 = H * 0.56, gh = H * 0.36, mid = gy0 + gh / 2, gA = (s.amp / 5) * gh * 0.34;
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(xs, mid); ctx.lineTo(xe, mid); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText(s.mode === "long" ? (narrow ? "air density" : "air density (above the line: compressed)") : "displacement of the string", xs, gy0 - 2);
      if (vac) return;
      // density is highest where neighbouring particles crowd together: proportional to −d(disp)/dx
      var G = function (x) { var u = x - xs; return s.mode === "long" ? -Math.cos(kk * u - ph) : Math.sin(kk * u - ph); };
      ctx.strokeStyle = c.path; ctx.lineWidth = 2.5; ctx.beginPath();
      for (var gx = xs; gx <= xe; gx += 2) { var gyv = mid - gA * G(gx); gx === xs ? ctx.moveTo(gx, gyv) : ctx.lineTo(gx, gyv); }
      ctx.stroke();
      // mark crests: first two peaks after xs
      var u0 = ((ph / kk) + (s.mode === "long" ? lpx / 2 : lpx / 4)) % lpx;   // first peak position (from xs)
      var peaks = []; for (var p = u0; p < Lpx; p += lpx) peaks.push(xs + p);
      ctx.font = "600 12px " + c.font; ctx.textAlign = "center";
      peaks.forEach(function (x) {
        ctx.fillStyle = c.path; ctx.textBaseline = "bottom"; if (lpx > 40) ctx.fillText(s.mode === "long" ? "C" : "crest", x, mid - gA - 4);
        var tr = x + lpx / 2; if (tr < xe - 24) { ctx.textBaseline = "top"; if (lpx > 40) ctx.fillText(s.mode === "long" ? "R" : "trough", tr, mid + gA + 4); }
      });
      // wavelength bracket between first two peaks
      if (peaks.length > 1) {
        var y = gy0 + gh + 6, a = peaks[0], bb = peaks[1];
        ctx.strokeStyle = c.vy; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a, y - 5); ctx.lineTo(a, y + 5); ctx.moveTo(a, y); ctx.lineTo(bb, y); ctx.moveTo(bb, y - 5); ctx.lineTo(bb, y + 5); ctx.stroke();
        ctx.fillStyle = c.vy; ctx.textBaseline = "top"; ctx.fillText("λ = " + K.fmt(lam(), 2) + " m", (a + bb) / 2, y + 2);
        ctx.setLineDash([3, 4]); ctx.strokeStyle = c.vy; ctx.beginPath(); ctx.moveTo(a, mid - gA); ctx.lineTo(a, y); ctx.moveTo(bb, mid - gA); ctx.lineTo(bb, y); ctx.stroke(); ctx.setLineDash([]);
      }
      // amplitude bracket at the left
      ctx.strokeStyle = c.vx; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xs - 10, mid); ctx.lineTo(xs - 10, mid - gA); ctx.stroke();
      ctx.fillStyle = c.vx; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText("A", xs - 14, mid - gA / 2);
    };

    var showF = k.bindSlider("f", function () { return s.f; }, function (v) { s.f = v; update(); }, function (v) { return v + " Hz"; });
    var showA = k.bindSlider("amp", function () { return s.amp; }, function (v) { s.amp = v; update(); }, function (v) { return String(v); });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; update(); });
    var vac = k.bindCheck("vacuum", function (on) { s.vacuum = on; update(); });

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var clock = K.clock(function (dt) { s.t += dt; k.redraw(); return true; });
    function setBtn() { k.btn("play").textContent = clock.running ? "Pause" : "Play"; }
    k.onAct({ play: function () { if (clock.running) clock.stop(); else clock.start(); setBtn(); } });
    if (!reduce) clock.start(); setBtn();

    update();
    return {
      set: function (o) { Object.assign(s, o); showF(); showA(); showM(); vac.checked = s.vacuum; update(); },
      play: function () { if (!clock.running) { clock.start(); setBtn(); } },
      seek: function (t) { clock.stop(); setBtn(); s.t = t; k.redraw(); }
    };
  }

  window.WaveSim = { mount: mount };
})();
