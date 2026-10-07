/*
 * Indicators and the pH scale: ten test tubes of everyday solutions coloured by the chosen indicator.
 * Click a tube to see its pH, its place on the scale, and how many H⁺ ions it has compared with pure water.
 * Needs sim-kit.js.  PhSim.mount(el, { ind: "litmus", pick: 2 }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit;

  var SUBS = [
    { name: "Dilute HCl", pH: 1 }, { name: "Lemon juice", pH: 2.4 }, { name: "Vinegar", pH: 2.9 }, { name: "Tomato juice", pH: 4.2 },
    { name: "Milk", pH: 6.6 }, { name: "Pure water", pH: 7 }, { name: "Baking soda", pH: 8.3 }, { name: "Soap solution", pH: 10 },
    { name: "Ammonia solution", pH: 11.5 }, { name: "Dilute NaOH", pH: 13 }
  ];

  // Indicator colour as a function of pH (approximate transition ranges)
  var UNIVERSAL = ["#d7191c", "#e8452a", "#f07a2a", "#f5a623", "#f2c94c", "#e6e04a", "#b5d94a", "#5bbf4a", "#2fa36b", "#2a8f9a", "#2f6fbf", "#3b4fb8", "#4b3aa8", "#5a2e98", "#5b2580"];
  var IND = {
    none:     { label: "No indicator", col: function () { return "rgba(200,220,235,0.55)"; }, name: function () { return "colourless"; } },
    litmus:   { label: "Litmus", col: function (p) { return p < 6.5 ? "#d23a3a" : p <= 7.5 ? "#8a4fa8" : "#3a62c9"; }, name: function (p) { return p < 6.5 ? "red" : p <= 7.5 ? "purple" : "blue"; } },
    phenol:   { label: "Phenolphthalein", col: function (p) { return p < 8.2 ? "rgba(235,240,245,0.6)" : "#e0409a"; }, name: function (p) { return p < 8.2 ? "colourless" : "pink"; } },
    methyl:   { label: "Methyl orange", col: function (p) { return p < 3.1 ? "#d9342b" : p < 4.4 ? "#f07d25" : "#f2c230"; }, name: function (p) { return p < 3.1 ? "red" : p < 4.4 ? "orange" : "yellow"; } },
    turmeric: { label: "Turmeric", col: function (p) { return p < 8 ? "#f2c02e" : "#a5402a"; }, name: function (p) { return p < 8 ? "yellow" : "red-brown"; } },
    universal:{ label: "Universal indicator", col: function (p) { return UNIVERSAL[Math.max(0, Math.min(14, Math.round(p)))]; }, name: function (p) { return "pH colour " + Math.round(p); } }
  };

  function nature(p) { return p < 7 ? (p < 3 ? "Very acidic" : "Mildly acidic") : p > 7 ? (p > 11 ? "Very basic" : "Mildly basic") : "Neutral"; }

  function mount(root, opts) {
    opts = opts || {};
    var s = Object.assign({ ind: "litmus", pick: 2 }, opts);
    var rects = [];

    var k = K.frame(root, {
      aspect: "5 / 3",
      label: "Ten test tubes of common solutions coloured by an indicator, above a pH scale. Select a tube to see its pH.",
      panel: K.chips("ind", "Indicator", Object.keys(IND).map(function (q) { return [q, IND[q].label]; })) +
        '<div class="ctl"><label for="' + (root.id || "ph") + '-pick">Solution (or tap a test tube)</label><select id="' + (root.id || "ph") + '-pick" class="sel">' +
          SUBS.map(function (x, i) { return '<option value="' + i + '">' + x.name + '</option>'; }).join("") + '</select></div>' + K.hint("note"),
      readouts: [["sub", "Solution"], ["pH", "pH", "c-path"], ["nat", "Nature"],
                 ["col", "Indicator colour", "c-vy"], ["h", "H⁺ ions compared with water", "wrap"], ["ions", "More of"]],
      cols: 3
    });

    var sel = root.querySelector("select.sel");
    sel.addEventListener("change", function () { s.pick = +sel.value; update(); });
    function update() {
      var x = SUBS[s.pick], d = 7 - x.pH;
      sel.value = s.pick;
      k.set("sub", x.name); k.set("pH", x.pH); k.set("nat", nature(x.pH));
      k.set("col", IND[s.ind].name(x.pH));
      k.set("h", d === 0 ? "the same" : d > 0 ? (+Math.pow(10, d).toPrecision(2)).toLocaleString("en-IN") + " times more" : (+Math.pow(10, -d).toPrecision(2)).toLocaleString("en-IN") + " times fewer");
      k.set("ions", x.pH < 7 ? "H⁺ than OH⁻" : x.pH > 7 ? "OH⁻ than H⁺" : "equal H⁺ and OH⁻");
      k.el('[data-r="note"]').textContent = s.ind === "none" ? "Most of these solutions look alike. An indicator changes colour to show whether a solution is acidic, neutral or basic."
        : s.ind === "universal" ? "Universal indicator is a mixture of indicators: it shows a different colour for each part of the pH scale."
        : IND[s.ind].label + ": " + ({ litmus: "red in acids, blue in bases.", phenol: "colourless in acids and neutral solutions, pink in bases.", methyl: "red in strong acids, yellow in neutral and basic solutions.", turmeric: "yellow in acids, red-brown in bases." })[s.ind];
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var n = SUBS.length, narrow = W < 520, perRow = narrow ? 5 : 10, rows = Math.ceil(n / perRow);
      var tw = Math.min(34, (W - 20) / perRow - 10), th = narrow ? H * 0.26 : H * 0.42, gap = (W - perRow * tw) / (perRow + 1);
      rects = [];
      SUBS.forEach(function (x, i) {
        var row = Math.floor(i / perRow), col = i % perRow, tx = gap + col * (tw + gap), ty = 14 + row * (th + 34);
        var liquid = th * 0.62, sel = i === s.pick;
        ctx.fillStyle = IND[s.ind].col(x.pH);
        ctx.beginPath(); ctx.moveTo(tx, ty + th - liquid); ctx.lineTo(tx, ty + th - tw / 2); ctx.arc(tx + tw / 2, ty + th - tw / 2, tw / 2, Math.PI, 0, true); ctx.lineTo(tx + tw, ty + th - liquid); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = sel ? c.path : c.ink; ctx.lineWidth = sel ? 3 : 1.5;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty + th - tw / 2); ctx.arc(tx + tw / 2, ty + th - tw / 2, tw / 2, Math.PI, 0, true); ctx.lineTo(tx + tw, ty); ctx.stroke();
        ctx.fillStyle = sel ? c.path : c.muted; ctx.font = (sel ? "700 " : "") + "10px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(String(x.pH), tx + tw / 2, ty + th + 4);
        rects.push([tx - gap / 2, ty, tw + gap, th + 20, i]);
      });
      // pH scale bar
      var sy = 14 + rows * (th + 34) + 6, sx = 16, sw = W - 32, sh = 16;
      for (var p = 0; p < 14; p++) { ctx.fillStyle = UNIVERSAL[p]; ctx.fillRect(sx + sw * p / 14, sy, sw / 14 + 1, sh); }
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1; ctx.strokeRect(sx, sy, sw, sh);
      ctx.fillStyle = c.ink; ctx.font = "10px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (p = 0; p <= 14; p += narrow ? 2 : 1) ctx.fillText(p, sx + sw * p / 14, sy + sh + 3);
      ctx.font = "600 11px " + c.font; ctx.textAlign = "left"; ctx.fillText("← acidic", sx, sy + sh + 16);
      ctx.textAlign = "center"; ctx.fillText("neutral 7", sx + sw / 2, sy + sh + 16);
      ctx.textAlign = "right"; ctx.fillText("basic →", sx + sw, sy + sh + 16);
      var mx = sx + sw * SUBS[s.pick].pH / 14;
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.moveTo(mx, sy - 2); ctx.lineTo(mx - 7, sy - 12); ctx.lineTo(mx + 7, sy - 12); ctx.closePath(); ctx.fill();
      ctx.font = "600 11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(SUBS[s.pick].name, Math.max(50, Math.min(W - 50, mx)), sy - 13);
    };

    k.canvas.addEventListener("click", function (e) {
      var r = k.canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      rects.forEach(function (q) { if (x >= q[0] && x <= q[0] + q[2] && y >= q[1] && y <= q[1] + q[3]) { s.pick = q[4]; update(); } });
    });
    k.canvas.style.cursor = "pointer";
    var showI = k.bindChips("ind", function () { return s.ind; }, function (v) { s.ind = v; update(); });
    update();

    return { set: function (o) { Object.assign(s, o); showI(); update(); }, seek: function () {}, play: function () {} };
  }

  window.PhSim = { mount: mount, SUBS: SUBS };
})();
