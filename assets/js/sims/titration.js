/*
 * Neutralisation by titration: a base is added from a burette to 20 mL of acid in a flask.
 * The pH is worked out from the excess H⁺ or OH⁻, and the curve is drawn as the base goes in.
 * All solutions are 0.1 M strong acids and bases (sulphuric acid 0.05 M, so it has the same H⁺).
 * Needs sim-kit.js.  TitrationSim.mount(el, { acid: "HCl", base: "NaOH", ind: "phenol", v: 0 }) → { set, seek, play }
 */
(function () {
  "use strict";
  var K = window.SimKit, VA = 20, VMAX = 40;

  var ACIDS = { HCl: { label: "Hydrochloric acid", f: "HCl", hPer: 1, conc: 0.1 }, HNO3: { label: "Nitric acid", f: "HNO₃", hPer: 1, conc: 0.1 }, H2SO4: { label: "Sulphuric acid", f: "H₂SO₄", hPer: 2, conc: 0.05 } };
  var BASES = { NaOH: { label: "Sodium hydroxide", f: "NaOH", m: "Na" }, KOH: { label: "Potassium hydroxide", f: "KOH", m: "K" } };
  var SALTS = {
    HCl: function (m) { return m + "Cl"; }, HNO3: function (m) { return m + "NO₃"; }, H2SO4: function (m) { return m + "₂SO₄"; }
  };
  var EQN = {
    HCl: function (b) { return "HCl + " + b.f + " → " + b.m + "Cl + H₂O"; },
    HNO3: function (b) { return "HNO₃ + " + b.f + " → " + b.m + "NO₃ + H₂O"; },
    H2SO4: function (b) { return "H₂SO₄ + 2" + b.f + " → " + b.m + "₂SO₄ + 2H₂O"; }
  };
  var IND = {
    phenol: { label: "Phenolphthalein", col: function (p) { return p < 8.2 ? "rgba(225,235,245,0.55)" : "#e0409a"; } },
    methyl: { label: "Methyl orange", col: function (p) { return p < 3.1 ? "#d9342b" : p < 4.4 ? "#f07d25" : "#f2c230"; } },
    universal: { label: "Universal", col: function (p) { var U = ["#d7191c", "#e8452a", "#f07a2a", "#f5a623", "#f2c94c", "#e6e04a", "#b5d94a", "#5bbf4a", "#2fa36b", "#2a8f9a", "#2f6fbf", "#3b4fb8", "#4b3aa8", "#5a2e98", "#5b2580"]; return U[Math.max(0, Math.min(14, Math.round(p)))]; } }
  };

  // pH after adding v mL of 0.1 M base to 20 mL of acid
  function pH(acid, v) {
    var a = ACIDS[acid], nH = a.conc * a.hPer * VA, nOH = 0.1 * v, vol = (VA + v) / 1000;   // millimoles, litres
    if (Math.abs(nH - nOH) < 1e-9) return 7;
    if (nH > nOH) return -Math.log10((nH - nOH) / 1000 / vol);
    return 14 + Math.log10((nOH - nH) / 1000 / vol);
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "tsim";
    var s = Object.assign({ acid: "HCl", base: "NaOH", ind: "phenol", v: 0 }, opts);

    var k = K.frame(root, {
      aspect: "5 / 3.2",
      label: "A burette adding base to acid in a flask, with a pH curve",
      panel: K.chips("acid", "Acid in the flask (20 mL)", Object.keys(ACIDS).map(function (q) { return [q, ACIDS[q].label]; })) +
        K.chips("base", "Base in the burette (0.1 M)", Object.keys(BASES).map(function (q) { return [q, BASES[q].label]; })) +
        K.chips("ind", "Indicator", Object.keys(IND).map(function (q) { return [q, IND[q].label]; })) +
        K.slider(id, "v", "Base added", 0, 40, 0.5, "mL") +
        K.hint("note") +
        K.buttons([["play", "Run the titration"], ["reset", "Empty the flask"]]),
      readouts: [["v", "Base added (mL)"], ["pH", "pH", "c-path"], ["state", "Solution"],
                 ["h", "H⁺ left (mmol)", "c-vy"], ["oh", "Extra OH⁻ (mmol)", "c-vx"], ["salt", "Salt formed (mmol)"]],
      cols: 3
    });

    var clock = K.clock(function (dt) {
      var near = Math.abs(s.v - VA) < 2;
      s.v = Math.min(VMAX, s.v + dt * (near ? 1.5 : 6));
      showV(); update(); return s.v < VMAX;
    });
    clock.onStop = function () { k.btn("play").textContent = "Run again"; };

    function update() {
      var a = ACIDS[s.acid], b = BASES[s.base], nH = a.conc * a.hPer * VA, nOH = 0.1 * s.v, p = pH(s.acid, s.v);
      k.set("v", K.fmt(s.v, 1)); k.set("pH", K.fmt(p, 2));
      k.set("state", Math.abs(p - 7) < 0.05 ? "Neutral" : p < 7 ? "Acidic" : "Basic");
      k.set("h", K.fmt(Math.max(0, nH - nOH), 2)); k.set("oh", K.fmt(Math.max(0, nOH - nH), 2));
      var saltMol = Math.min(nH, nOH) / a.hPer;
      k.set("salt", K.fmt(saltMol, 2) + " " + SALTS[s.acid](b.m));
      k.el('[data-r="note"]').textContent = EQN[s.acid](b) + ". " + (Math.abs(nOH - nH) < 1e-9 ? "Exactly neutralised: every H⁺ has met an OH⁻ to form water, leaving only salt in water (pH 7)."
        : nOH < nH ? "H⁺ + OH⁻ → H₂O: each drop of base removes some acid. The pH changes slowly until close to " + VA + " mL."
        : "All the acid is used up. Extra OH⁻ makes the solution basic.");
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var p = pH(s.acid, s.v), left = W * 0.34;
      // Burette
      var bx = left * 0.5, top = 10, bh = H * 0.42, bw = 16;
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.strokeRect(bx - bw / 2, top, bw, bh);
      var level = (s.v / 50) * bh;
      ctx.fillStyle = "rgba(120,160,220,0.45)"; ctx.fillRect(bx - bw / 2 + 1, top + level, bw - 2, bh - level - 1);
      ctx.beginPath(); ctx.moveTo(bx - 3, top + bh); ctx.lineTo(bx - 1, top + bh + 18); ctx.lineTo(bx + 1, top + bh + 18); ctx.lineTo(bx + 3, top + bh); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.font = "10px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(BASES[s.base].f, bx + bw / 2 + 4, top + 4);
      if (clock.running) { ctx.fillStyle = "rgba(120,160,220,0.8)"; ctx.beginPath(); ctx.arc(bx, top + bh + 26, 3, 0, 7); ctx.fill(); }
      // Flask
      var fy = top + bh + 34, fh = H - fy - 26, fw = Math.min(left * 0.9, 150), neck = fw * 0.22;
      var fill = 0.35 + 0.25 * (s.v / VMAX);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(bx - neck / 2, fy); ctx.lineTo(bx - neck / 2, fy + fh * 0.3); ctx.lineTo(bx - fw / 2, fy + fh); ctx.lineTo(bx + fw / 2, fy + fh); ctx.lineTo(bx + neck / 2, fy + fh * 0.3); ctx.lineTo(bx + neck / 2, fy); ctx.closePath();
      ctx.clip();
      ctx.fillStyle = IND[s.ind].col(p); ctx.fillRect(bx - fw / 2, fy + fh * (1 - fill), fw, fh * fill);
      ctx.restore();
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx - neck / 2, fy); ctx.lineTo(bx - neck / 2, fy + fh * 0.3); ctx.lineTo(bx - fw / 2, fy + fh); ctx.lineTo(bx + fw / 2, fy + fh); ctx.lineTo(bx + neck / 2, fy + fh * 0.3); ctx.lineTo(bx + neck / 2, fy); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.font = "10px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("20 mL " + ACIDS[s.acid].f, bx, fy + fh + 4);

      // pH curve
      var g = K.graph(ctx, c, { x: left, y: 0, w: W - left, h: H }, { xmax: VMAX, ymax: 14, xlabel: "base added (mL)", title: "pH against volume of base" });
      ctx.strokeStyle = c.line; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(g.X(0), g.Y(7)); ctx.lineTo(g.X(VMAX), g.Y(7)); ctx.moveTo(g.X(VA), g.Y(0)); ctx.lineTo(g.X(VA), g.Y(14)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = c.muted; ctx.font = "10px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText("neutral, 20 mL", g.X(VA) + 4, g.Y(7) - 2);
      ctx.strokeStyle = c.path; ctx.lineWidth = 2.5; ctx.beginPath();
      for (var i = 0; i <= 400; i++) { var vv = s.v * i / 400, yy = g.Y(pH(s.acid, vv)); i ? ctx.lineTo(g.X(vv), yy) : ctx.moveTo(g.X(vv), yy); }
      ctx.stroke();
      ctx.fillStyle = c.path; ctx.beginPath(); ctx.arc(g.X(s.v), g.Y(p), 5, 0, 7); ctx.fill();
    };

    var showV = k.bindSlider("v", function () { return s.v; }, function (v) { clock.stop(); s.v = v; k.btn("play").textContent = "Run the titration"; update(); }, function (v) { return (+v).toFixed(1) + " mL"; });
    var showA = k.bindChips("acid", function () { return s.acid; }, function (v) { s.acid = v; update(); });
    var showB = k.bindChips("base", function () { return s.base; }, function (v) { s.base = v; update(); });
    var showI = k.bindChips("ind", function () { return s.ind; }, function (v) { s.ind = v; update(); });

    function reset() { clock.stop(); s.v = 0; showV(); k.btn("play").textContent = "Run the titration"; update(); }
    function play() { if (clock.running) { clock.stop(); k.btn("play").textContent = "Resume"; return; } if (s.v >= VMAX) s.v = 0; k.btn("play").textContent = "Pause"; clock.start(); }
    k.onAct({ play: play, reset: reset });
    update();

    return {
      set: function (o) { Object.assign(s, o); showV(); showA(); showB(); showI(); update(); },
      seek: function (v) { clock.stop(); s.v = v; showV(); update(); },
      play: function () { s.v = 0; play(); }
    };
  }

  window.TitrationSim = { mount: mount, pH: pH };
})();
