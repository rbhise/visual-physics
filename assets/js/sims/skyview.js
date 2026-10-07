/*
 * Why put telescopes in space? Radiation of five kinds falls on Earth from a distant galaxy.
 * The atmosphere stops some of it high up, some lower down, and lets some through.
 * Choose where to put the telescope and which radiation to look at; the star image at the side
 * shows how the moving air blurs and twinkles visible light at the ground.
 * Needs sim-kit.js.  SkyViewSim.mount(el, { band: "visible", site: "ground" }) → { set, play }
 */
(function () {
  "use strict";
  var K = window.SimKit;
  // stop height in km (0 = reaches the ground; 3 = reaches a high mountain but not sea level)
  var BANDS = {
    radio:   { name: "Radio", lam: "longer than about 1 mm", stop: 0, tel: "GMRT near Pune (30 dishes of 45 m)", col: "#3a9a6a" },
    ir:      { name: "Infrared", lam: "800 nm to 1 mm", stop: 4, tel: "James Webb Space Telescope", col: "#d0553a" },
    visible: { name: "Visible", lam: "400 nm to 800 nm", stop: 0, tel: "Hubble Space Telescope; large telescopes on mountains", col: "#e0a400" },
    uv:      { name: "Ultraviolet", lam: "10 nm to 400 nm", stop: 30, tel: "Astrosat (ISRO)", col: "#8a5cf0" },
    xray:    { name: "X-rays", lam: "0.01 nm to 10 nm", stop: 80, tel: "Chandra X-ray Observatory; Astrosat", col: "#4f6fd6" }
  };
  var ORDER = ["radio", "ir", "visible", "uv", "xray"];
  var SITES = { ground: ["At sea level", 0], mountain: ["On a high mountain", 4.5], space: ["In space (above 500 km)", 600] };

  function mount(root, opts) {
    opts = opts || {};
    var s = Object.assign({ band: "visible", site: "ground", t: 0 }, opts);

    var k = K.frame(root, {
      aspect: window.matchMedia("(max-width: 600px)").matches ? "4 / 3.6" : "5 / 3",
      label: "Five kinds of radiation coming down through Earth's atmosphere, and where each one is stopped",
      panel: K.chips("band", "Radiation", ORDER.map(function (b) { return [b, BANDS[b].name]; })) +
        K.chips("site", "Put the telescope", Object.keys(SITES).map(function (q) { return [q, SITES[q][0]]; })) + K.hint("note"),
      readouts: [["band", "Radiation", "c-path"], ["lam", "Wavelength", "wrap"], ["stop", "Stopped by the air at", "wrap"],
                 ["see", "Can the telescope detect it?", "c-vy"], ["img", "Image quality", "wrap"], ["tel", "A real telescope for it", "wrap"]],
      cols: 3
    });

    function sees() { var b = BANDS[s.band], h = SITES[s.site][1]; return b.stop === 0 || h > b.stop; }
    function update() {
      var b = BANDS[s.band], ok = sees();
      k.set("band", b.name); k.set("lam", b.lam);
      k.set("stop", b.stop === 0 ? "Not stopped: reaches the ground" : b.stop < 10 ? "Low down, by water vapour (a few km)" : b.stop < 50 ? "About " + b.stop + " km up (ozone layer)" : "About " + b.stop + " km up");
      k.set("see", ok ? "Yes" : "No");
      k.set("img", !ok ? "Nothing arrives" : s.site === "space" ? "Sharp and steady" : s.band === "visible" ? (s.site === "mountain" ? "Some blurring" : "Blurred, twinkling, dimmed") : s.band === "radio" ? "Good, even in cloud or daytime" : "Dimmed by the air");
      k.set("tel", b.tel);
      k.el('[data-r="note"]').textContent = s.site === "space"
        ? "Above the atmosphere a telescope can detect every kind of radiation, by day or night, with no clouds, no city lights and no shimmering air."
        : ok ? "This radiation gets through the air to here. Moving air still bends light a little, which makes stars twinkle and images blur."
             : "The atmosphere stops this radiation before it reaches the telescope. To study it, the telescope has to go above the atmosphere.";
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var narrow = W < 520, gx = narrow ? W - 2 : W * 0.78, top = 34, ground = H - 26;
      // height scale: log-ish so 0–600 km fits: y = ground - f(h)
      var hy = function (h) { return ground - (Math.log10(1 + h) / Math.log10(601)) * (ground - top); };
      // sky gradient: thick air near the ground
      var grd = ctx.createLinearGradient(0, top, 0, ground);
      grd.addColorStop(0, "rgba(20,30,60,0.0)"); grd.addColorStop(0.45, "rgba(80,140,220,0.10)"); grd.addColorStop(1, "rgba(80,140,220,0.32)");
      ctx.fillStyle = grd; ctx.fillRect(0, top, gx, ground - top);
      // layer lines
      ctx.font = "10px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillStyle = c.muted; ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      [[4.5, "4.5 km: high mountain"], [30, "30 km: ozone layer"], [80, "80 km"], [600, "600 km: space telescope"]].forEach(function (q) {
        var y = hy(q[0]); ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(gx, y); ctx.stroke(); ctx.setLineDash([]);
        if (!narrow || q[0] !== 80) ctx.fillText(narrow ? q[1].split(":")[0] : q[1], 4, y - 1);
      });
      // ground and mountain
      ctx.fillStyle = "rgba(120,100,70,0.5)"; ctx.fillRect(0, ground, gx, H - ground);
      var mx = gx * 0.86, my = hy(4.5);
      ctx.beginPath(); ctx.moveTo(mx - gx * 0.16, ground); ctx.lineTo(mx, my); ctx.lineTo(mx + gx * 0.16, ground); ctx.closePath(); ctx.fill();
      // radiation columns
      var cw = (gx * 0.66) / ORDER.length, x0 = gx * 0.08;
      ORDER.forEach(function (key, i) {
        var b = BANDS[key], x = x0 + (i + 0.5) * cw, yEnd = b.stop === 0 ? ground : hy(b.stop), sel = key === s.band;
        ctx.strokeStyle = b.col; ctx.lineWidth = sel ? 4 : 2; ctx.globalAlpha = sel ? 1 : 0.45;
        ctx.beginPath();
        for (var y = top - 10; y < yEnd; y += 2) { var xx = x + 4 * Math.sin((y + i * 9) * (0.35 - i * 0.05)); y === top - 10 ? ctx.moveTo(xx, y) : ctx.lineTo(xx, y); }
        ctx.stroke();
        if (b.stop > 0) { ctx.fillStyle = b.col; ctx.beginPath(); ctx.arc(x, yEnd, sel ? 6 : 4, 0, Math.PI * 2); ctx.fill(); }
        else K.arrow(ctx, x, yEnd - 14, x, yEnd - 1, b.col, sel ? 4 : 2, 9);
        ctx.globalAlpha = 1;
        ctx.fillStyle = sel ? c.ink : c.muted; ctx.font = (sel ? "700 " : "") + (narrow ? "9px " : "11px ") + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(narrow ? ["Radio", "IR", "Vis", "UV", "X"][i] : b.name, x, 4);
      });
      // telescope marker
      var ty = s.site === "space" ? hy(600) + 14 : s.site === "mountain" ? my - 2 : ground - 2, tx = s.site === "mountain" ? mx : s.site === "space" ? gx * 0.86 : gx * 0.86 - gx * 0.3;
      if (s.site === "ground") tx = Math.min(gx - 20, mx - gx * 0.2);
      ctx.fillStyle = c.path; ctx.save(); ctx.translate(tx, ty); ctx.rotate(-Math.PI / 4); ctx.fillRect(-4, -18, 8, 18); ctx.restore();
      if (s.site === "space") { ctx.fillStyle = c.path; ctx.fillRect(tx - 16, ty - 4, 10, 6); ctx.fillRect(tx + 6, ty - 4, 10, 6); }
      ctx.fillStyle = c.path; ctx.font = "600 11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("telescope", tx, ty + 4);

      // star image panel
      if (!narrow) {
        var px = gx + 14, pw = W - px - 12, ph = pw, py = H * 0.25;
        ctx.fillStyle = "#0b1020"; ctx.fillRect(px, py, pw, ph);
        ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText("what it sees", px + pw / 2, py - 4);
        var cx = px + pw / 2, cyy = py + ph / 2;
        if (sees()) {
          var blur = s.site === "space" || s.band === "radio" ? 0 : s.site === "mountain" ? 3 : 8, dim = s.site === "space" ? 1 : s.site === "mountain" ? 0.85 : 0.6;
          var jx = blur ? Math.sin(s.t * 13) * blur * 0.4 : 0, jy = blur ? Math.cos(s.t * 17) * blur * 0.4 : 0;
          var g2 = ctx.createRadialGradient(cx + jx, cyy + jy, 0, cx + jx, cyy + jy, 3 + blur * 2);
          g2.addColorStop(0, "rgba(255,255,255," + dim + ")"); g2.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx + jx, cyy + jy, 3 + blur * 2, 0, Math.PI * 2); ctx.fill();
        } else { ctx.fillStyle = "#6b7280"; ctx.textBaseline = "middle"; ctx.fillText("nothing", cx, cyy); }
      }
    };

    var showB = k.bindChips("band", function () { return s.band; }, function (v) { s.band = v; update(); });
    var showS = k.bindChips("site", function () { return s.site; }, function (v) { s.site = v; update(); });
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var clock = K.clock(function (dt) { s.t += dt; if (s.site !== "space" && s.band === "visible") k.redraw(); return true; });
    if (!reduce) clock.start();
    update();
    return { set: function (o) { Object.assign(s, o); showB(); showS(); update(); }, play: function () {}, seek: function (t) { clock.stop(); s.t = t; k.redraw(); } };
  }

  window.SkyViewSim = { mount: mount };
})();
