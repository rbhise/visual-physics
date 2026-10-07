/*
 * The electromagnetic spectrum on a logarithmic scale, from gamma rays to radio waves.
 * Slide the wavelength: the band, frequency (ν = c ÷ λ), a thing of about that size and whether
 * the radiation gets through Earth's atmosphere are shown. Each step on the scale is ×10.
 * Needs sim-kit.js.  SpectrumSim.mount(el, { lam: 5e-7 }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit, C = 3e8, LO = -12, HI = 1;   // log10 of wavelength in metres

  // [name, upper limit (m), colour, sources]
  var BANDS = [
    ["Gamma rays", 1e-11, "#7b4fd6", "Exploding stars, radioactive atoms"],
    ["X-rays", 1e-8, "#4f6fd6", "Very hot gas around black holes; X-ray machines"],
    ["Ultraviolet", 4e-7, "#8a5cf0", "Hot young stars; the Sun"],
    ["Visible light", 8e-7, null, "Stars, the Sun, lamps"],
    ["Infrared", 1e-3, "#d0553a", "Warm objects, dust clouds, people"],
    ["Microwaves", 0.3, "#c98a2a", "Afterglow of the Big Bang; microwave ovens"],
    ["Radio waves", Infinity, "#3a9a6a", "Galaxies, pulsars; radio and TV"]
  ];
  var SIZES = [[1e-12, "an atomic nucleus"], [1e-10, "an atom"], [1e-8, "a large molecule"], [1e-7, "a virus"], [1e-6, "a bacterium"],
               [1e-5, "a cell"], [1e-4, "the width of a hair"], [1e-3, "a grain of sand"], [1e-2, "a fingernail"], [0.1, "a mobile phone"], [1, "a person"], [10, "a bus"]];
  // fraction of the radiation that reaches the ground (rough)
  function through(l) {
    if (l < 3e-7) return 0;
    if (l < 4e-7) return (l - 3e-7) / 1e-7 * 0.8;
    if (l <= 8e-7) return 0.85;
    if (l < 2e-5) return 0.45;              // near and mid infrared: partly, through windows
    if (l < 1e-3) return 0.05;              // far infrared: water vapour absorbs
    if (l < 1e-2) return 0.3;
    if (l <= 15) return 0.95;               // radio window
    return 0;
  }
  function band(l) { for (var i = 0; i < BANDS.length; i++) if (l < BANDS[i][1]) return i; return BANDS.length - 1; }
  function visColor(l) {   // approximate colour for 400–800 nm
    var n = l * 1e9, h = n < 450 ? 270 : n < 495 ? 230 : n < 570 ? 130 : n < 590 ? 58 : n < 620 ? 32 : 0;
    return "hsl(" + h + ",85%," + (n > 700 ? 38 : 52) + "%)";
  }
  function colorOf(l) { var b = band(l); return BANDS[b][2] || visColor(l); }
  function fmtLam(l) {
    if (l < 1e-9) return K.fmt(l * 1e12, l < 1e-11 ? 2 : 0) + " pm";
    if (l < 1e-6) return K.fmt(l * 1e9, l < 1e-8 ? 2 : 0) + " nm";
    if (l < 1e-3) return K.fmt(l * 1e6, l < 1e-5 ? 2 : 0) + " µm";
    if (l < 1) return K.fmt(l * 1e3, l < 1e-2 ? 2 : 0) + " mm";
    return K.fmt(l, l < 10 ? 2 : 0) + " m";
  }
  function sci(x) {
    var e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    if (+m.toFixed(2) >= 10) { m /= 10; e++; }
    var sup = String(e).replace(/-/g, "⁻").replace(/\d/g, function (d) { return "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]; });
    return (+m.toFixed(2)) + " × 10" + sup;
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "spsim";
    var s = { L: Math.log10(opts.lam || 5e-7) };

    var k = K.frame(root, {
      aspect: window.matchMedia("(max-width: 600px)").matches ? "4 / 3.2" : "5 / 2.8",
      label: "The electromagnetic spectrum from gamma rays to radio waves, with the chosen wavelength marked",
      panel: K.chips("jump", "Jump to", BANDS.map(function (b, i) { return [i, b[0]]; })) +
        K.slider(id, "L", "Wavelength λ (each step is ×10)", LO, HI, 0.05, "") + K.hint("note"),
      readouts: [["lam", "Wavelength λ", "c-path"], ["nu", "Frequency ν = c ÷ λ", "c-vy"], ["band", "Type"],
                 ["size", "About the size of", "wrap"], ["air", "Through the atmosphere?", "wrap"], ["src", "Sent out by", "wrap"]],
      cols: 3
    });

    function lam() { return Math.pow(10, s.L); }
    function update() {
      var l = lam(), b = band(l), t = through(l), sz = SIZES[0][1];
      SIZES.forEach(function (q) { if (l >= q[0] * 0.5) sz = q[1]; });
      k.set("lam", fmtLam(l)); k.set("nu", sci(C / l) + " Hz"); k.set("band", BANDS[b][0]);
      k.set("size", sz); k.set("air", t > 0.7 ? "Yes, reaches the ground" : t > 0.2 ? "Partly" : "No, absorbed (or reflected) high up"); k.set("src", BANDS[b][3]);
      k.el('[data-r="note"]').textContent = b === 3
        ? "Our eyes detect only this narrow band, about 400 nm (violet) to 800 nm (red). Everything else is invisible to us, but telescopes can detect it."
        : "All these are the same kind of radiation and travel at the same speed, 3 × 10⁸ m/s. Only the wavelength (and so the frequency) is different.";
      k.root.querySelectorAll('[data-group="jump"] button').forEach(function (e) { e.setAttribute("aria-pressed", +e.dataset.v === b); });
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var narrow = W < 520, x0 = 14, x1 = W - 14, X = function (L) { return x0 + (L - LO) / (HI - LO) * (x1 - x0); };
      var sy = H * 0.14, sh = H * 0.15;
      // spectrum strip
      for (var L = LO; L < HI; L += 0.02) { ctx.fillStyle = colorOf(Math.pow(10, L)); ctx.fillRect(X(L), sy, X(L + 0.02) - X(L) + 1, sh); }
      // visible gets a rainbow
      for (var n = 400; n < 800; n += 5) { var Lv = Math.log10(n * 1e-9); ctx.fillStyle = visColor(n * 1e-9); ctx.fillRect(X(Lv), sy, X(Math.log10((n + 5) * 1e-9)) - X(Lv) + 1, sh); }
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1; ctx.strokeRect(x0, sy, x1 - x0, sh);
      // band labels
      ctx.font = (narrow ? "600 9px " : "600 11px ") + c.font; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillStyle = c.ink;
      var lo = LO;
      BANDS.forEach(function (b, i) {
        var hi = Math.min(HI, Math.log10(Math.min(b[1], 10))), mid = (Math.max(lo, LO) + hi) / 2;
        var name = narrow ? ["γ", "X", "UV", "Vis", "IR", "Micro", "Radio"][i] : ["Gamma rays", "X-rays", "Ultraviolet", "Visible", "Infrared", "Microwaves", "Radio waves"][i];
        ctx.fillText(name, X(mid) + (i === 2 && !narrow ? -14 : 0), sy - (i === 3 ? 16 : 3)); lo = hi;
      });
      // scale ticks
      ctx.font = "10px " + c.font; ctx.textBaseline = "top"; ctx.fillStyle = c.muted;
      [[-12, "1 pm"], [-9, "1 nm"], [-6, "1 µm"], [-3, "1 mm"], [0, "1 m"]].forEach(function (q) {
        ctx.fillText(q[1], X(q[0]), sy + sh + 3); ctx.fillRect(X(q[0]), sy + sh, 1, 3);
      });
      // marker
      var mx = X(s.L);
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, sy - 2); ctx.lineTo(mx, sy + sh + 2); ctx.stroke();
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.moveTo(mx - 6, sy + sh + 16); ctx.lineTo(mx + 6, sy + sh + 16); ctx.lineTo(mx, sy + sh + 6); ctx.closePath(); ctx.fill();

      // the wave itself, drawn with a visual wavelength that grows with λ
      var wy = H * 0.52, wa = H * 0.08, vis = 8 + (s.L - LO) / (HI - LO) * (W * 0.45);
      ctx.strokeStyle = colorOf(lam()); ctx.lineWidth = 2.5; ctx.beginPath();
      for (var x = x0; x <= x1; x += 1) { var y = wy - wa * Math.sin(2 * Math.PI * (x - x0) / vis); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
      ctx.fillText(narrow ? "wave (not to scale)" : "the wave (shorter wavelength = higher frequency; not to scale)", x0, wy - wa - 6);

      // atmosphere transmission
      var ay = H * 0.74, ah = H * 0.16;
      ctx.fillStyle = c.muted; ctx.textBaseline = "bottom"; ctx.fillText(narrow ? "reaches the ground" : "how much reaches the ground through the atmosphere", x0, ay - 3);
      ctx.strokeStyle = c.line; ctx.strokeRect(x0, ay, x1 - x0, ah);
      ctx.fillStyle = c.good; ctx.globalAlpha = 0.5;
      for (L = LO; L < HI; L += 0.02) { var t = through(Math.pow(10, L)); if (t > 0) ctx.fillRect(X(L), ay + ah * (1 - t), X(L + 0.02) - X(L) + 0.5, ah * t); }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, ay); ctx.lineTo(mx, ay + ah); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.font = "10px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(narrow ? "blocked" : "blocked: needs a telescope in space", x0 + 4, ay + 3);
    };

    var showL = k.bindSlider("L", function () { return s.L; }, function (v) { s.L = v; update(); }, function () { return fmtLam(lam()); });
    k.root.querySelector('[data-group="jump"]').addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var i = +b.dataset.v, lo = i ? Math.log10(BANDS[i - 1][1]) : LO, hi = Math.min(HI, Math.log10(Math.min(BANDS[i][1], 10)));
      s.L = Math.round(((lo + hi) / 2) / 0.05) * 0.05; if (i === 3) s.L = Math.log10(5.5e-7); showL(); update();
    });
    update();
    return { set: function (o) { if (o.lam) s.L = Math.log10(o.lam); showL(); update(); }, play: function () {}, seek: function () {} };
  }

  window.SpectrumSim = { mount: mount, fmtLam: fmtLam };
})();
