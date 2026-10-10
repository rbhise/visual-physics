/*
 * Surface area and volume (Std 9 Geometry Ch. 9): cuboid, cube, cylinder, cone, sphere, hemisphere.
 * Views: "solid" (3-D drawing with labelled measures; drag to tilt), "net" (cuboid/cube net; cylinder and cone unroll),
 * "cut" (the cone's curved surface cut into pieces and laid out as a near-rectangle πr by l),
 * "fill" (three cones of water fill a cylinder; two cones with h = r fill a hemisphere),
 * "circles" (the string that covers a sphere covers four circles of radius r) and "cyl" (sphere or hemisphere in a cylinder).
 * π can be 22/7 or 3.14, as in the textbook's examples.
 * Needs sim-kit.js.  VolumeSim.mount(el, { modes: ["cuboid", "cube", "cylinder"], mode: "cuboid", d: {...}, view, pi }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, TAU = Math.PI * 2;
  var NAMES = { cuboid: "Cuboid", cube: "Cube", cylinder: "Cylinder", cone: "Cone", sphere: "Sphere", hemisphere: "Hemisphere" };
  var DIMS = {   // [key, label, min, max, step]
    cuboid: [["l", "Length l", 1, 30, 0.5], ["b", "Breadth b", 1, 30, 0.5], ["h", "Height h", 1, 30, 0.5]],
    cube: [["a", "Side l", 1, 30, 0.5]],
    cylinder: [["r", "Radius r", 0.5, 21, 0.5], ["h", "Height h", 1, 40, 0.5]],
    cone: [["r", "Radius r", 0.5, 21, 0.5], ["h", "Height h", 1, 40, 0.5]],
    sphere: [["r", "Radius r", 0.5, 21, 0.5]],
    hemisphere: [["r", "Radius r", 0.5, 21, 0.5]]
  };
  var DEF = { cuboid: { l: 10, b: 6, h: 4 }, cube: { a: 5 }, cylinder: { r: 7, h: 10 }, cone: { r: 7, h: 24 }, sphere: { r: 7 }, hemisphere: { r: 7 } };
  var VIEWS = {
    cuboid: ["solid", "net"], cube: ["solid", "net"], cylinder: ["solid", "net"],
    cone: ["solid", "net", "cut", "fill"], sphere: ["solid", "circles", "cyl"], hemisphere: ["solid", "fill", "cyl"]
  };
  var VIEWNAMES = [["solid", "3-D"], ["net", "Net"], ["cut", "Cut and rearrange"], ["fill", "Fill with cones"], ["circles", "Four circles"], ["cyl", "In a cylinder"]];

  // exact numbers stay exact; anything rounded to 2 d.p. gets "≈"
  function num(v) {
    if (!isFinite(v)) return "–";
    var r2 = Math.round(v * 100) / 100, s = String(Math.abs(r2 - Math.round(r2)) < 1e-9 ? Math.round(r2) : r2);
    return (Math.abs(v - r2) > 1e-7 * Math.max(1, Math.abs(v)) ? "≈ " : "") + s;
  }
  function eq(v) { var t = num(v); return t.indexOf("≈") === 0 ? " " + t : " = " + t; }
  function bare(v) { return num(v).replace("≈ ", ""); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  function calc(mode, d, piName) {
    var P = piName === "3.14" ? 3.14 : 22 / 7, pt = piName === "3.14" ? "3.14" : "22/7", o = { pi: P, pt: pt };
    if (mode === "cuboid") { o.lsa = 2 * d.h * (d.l + d.b); o.tsa = 2 * (d.l * d.b + d.b * d.h + d.l * d.h); o.vol = d.l * d.b * d.h; }
    if (mode === "cube") { o.face = d.a * d.a; o.lsa = 4 * d.a * d.a; o.tsa = 6 * d.a * d.a; o.vol = d.a * d.a * d.a; }
    if (mode === "cylinder") { o.csa = 2 * P * d.r * d.h; o.tsa = 2 * P * d.r * (d.r + d.h); o.vol = P * d.r * d.r * d.h; o.circ = 2 * P * d.r; o.base = P * d.r * d.r; }
    if (mode === "cone") { o.l2 = d.r * d.r + d.h * d.h; o.l = Math.sqrt(o.l2); o.csa = P * d.r * o.l; o.tsa = P * d.r * (o.l + d.r); o.vol = P * d.r * d.r * d.h / 3; o.circ = 2 * P * d.r; o.cyl = P * d.r * d.r * d.h; o.theta = 360 * d.r / o.l; o.half = P * d.r; }
    if (mode === "sphere") { o.circle = P * d.r * d.r; o.sa = 4 * P * d.r * d.r; o.vol = 4 * P * d.r * d.r * d.r / 3; o.cyl = 2 * P * d.r * d.r * d.r; o.cylcsa = 4 * P * d.r * d.r; }
    if (mode === "hemisphere") { o.csa = 2 * P * d.r * d.r; o.flat = P * d.r * d.r; o.tsa = 3 * P * d.r * d.r; o.vol = 2 * P * d.r * d.r * d.r / 3; o.cyl = P * d.r * d.r * d.r; o.cone = P * d.r * d.r * d.r / 3; }
    return o;
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "vs", modes = opts.modes || ["cuboid", "cube", "cylinder", "cone", "sphere", "hemisphere"];
    var s = { mode: opts.mode || modes[0], view: opts.view || "solid", pi: opts.pi || "22/7", prog: 1, hint: true, tilt: 0.3, turn: 30, cubes: true, d: JSON.parse(JSON.stringify(DEF)) };
    if (opts.d) Object.assign(s.d[s.mode], opts.d);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches, clock = null;

    var k = K.frame(root, {
      label: "A solid drawn in 3-D, its net, and its surface area and volume",
      panel: (modes.length > 1 ? K.chips("mode", "Solid", modes.map(function (m) { return [m, NAMES[m]]; })) : "") +
        K.chips("view", "View", VIEWNAMES) +
        K.slider(id, "x0", "", 0, 1, 1, "") + '<div data-wrap="x1">' + K.slider(id, "x1", "", 0, 1, 1, "") + '</div>' + '<div data-wrap="x2">' + K.slider(id, "x2", "", 0, 1, 1, "") + '</div>' +
        '<div data-wrap="pi">' + K.chips("pi", "Value of π", [["22/7", "22/7"], ["3.14", "3.14"]]) + '</div>' +
        '<div data-wrap="cubes" class="checks">' + K.check(id, "cubes", "Show 1 cm cubes", true) + '</div>' +
        '<div data-wrap="play">' + K.buttons([["play", "Play"]]) + '</div>' +
        K.hint("note"),
      readouts: [["r1", "–", "c-vy"], ["r2", "–", "c-vx"], ["r3", "–", "c-path"], ["r4", "–"], ["r5", "–"], ["r6", "–"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span"), cells = root.querySelectorAll(".sim-readout > div");
    var ins = [0, 1, 2].map(function (i) { return root.querySelector('input[data-k="x' + i + '"]'); });
    var outs = ins.map(function (inp) { return document.getElementById(inp.id + "-out"); });
    var labs = ins.map(function (inp) { return inp.parentNode.querySelector("label"); });
    var cubeBox = root.querySelector('input[data-check="cubes"]');

    function maxProg() { return s.view === "fill" ? (s.mode === "hemisphere" ? 2 : 3) : s.view === "circles" ? 4 : 1; }
    function cubesOK() { var d = s.d[s.mode], v = s.mode === "cube" ? [d.a] : [d.l, d.b, d.h]; return v.every(function (x) { return x === Math.round(x) && x <= 15; }); }
    function show(el, on) { el.style.display = on ? "" : "none"; }
    function syncCtl() {
      var D = DIMS[s.mode];
      [0, 1, 2].forEach(function (i) {
        var wrap = i ? root.querySelector('[data-wrap="x' + i + '"]') : ins[0].parentNode;
        if (!D[i]) { show(wrap, false); return; }
        show(wrap, true);
        labs[i].firstChild.nodeValue = D[i][1] + " ";
        ins[i].min = D[i][2]; ins[i].max = D[i][3]; ins[i].step = D[i][4]; ins[i].value = s.d[s.mode][D[i][0]];
        outs[i].textContent = bare(s.d[s.mode][D[i][0]]) + " cm";
      });
      var vs = VIEWS[s.mode];
      if (vs.indexOf(s.view) < 0) s.view = "solid";
      root.querySelectorAll('[data-group="view"] button').forEach(function (b) { show(b, vs.indexOf(b.dataset.v) >= 0); b.setAttribute("aria-pressed", String(b.dataset.v === s.view)); });
      root.querySelectorAll('[data-group="mode"] button').forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === s.mode)); });
      root.querySelectorAll('[data-group="pi"] button').forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === s.pi)); });
      show(root.querySelector('[data-wrap="pi"]'), s.mode !== "cuboid" && s.mode !== "cube");
      show(root.querySelector('[data-wrap="cubes"]'), (s.mode === "cuboid" || s.mode === "cube") && s.view === "solid");
      cubeBox.checked = s.cubes;
      show(root.querySelector('[data-wrap="play"]'), s.view !== "solid" && !(s.view === "net" && (s.mode === "cuboid" || s.mode === "cube")) && s.view !== "cyl");
    }

    function update() {
      syncCtl();
      var d = s.d[s.mode], o = calc(s.mode, d, s.pi), R = [], note = "", v = s.view, u2 = " cm²", u3 = " cm³", pt = o.pt;
      if (s.mode === "cuboid") {
        R = [["Length l", bare(d.l) + " cm"], ["Breadth b", bare(d.b) + " cm"], ["Height h", bare(d.h) + " cm"], ["Lateral SA 2(l + b)h", num(o.lsa) + u2], ["Total SA 2(lb + bh + lh)", num(o.tsa) + u2], ["Volume l × b × h", num(o.vol) + u3]];
        note = v === "net" ? "The net has 6 rectangles in 3 equal pairs: two " + bare(d.l) + " × " + bare(d.b) + ", two " + bare(d.b) + " × " + bare(d.h) + " and two " + bare(d.l) + " × " + bare(d.h) + ". Their total area is " + num(o.tsa) + " cm²."
          : "Total SA = 2(" + bare(d.l) + "×" + bare(d.b) + " + " + bare(d.b) + "×" + bare(d.h) + " + " + bare(d.l) + "×" + bare(d.h) + ")" + eq(o.tsa) + " cm². Volume = " + bare(d.l) + " × " + bare(d.b) + " × " + bare(d.h) + "" + eq(o.vol) + " cm³" +
            (s.cubes && cubesOK() ? ": that many 1 cm cubes fill it." : ".");
      } else if (s.mode === "cube") {
        R = [["Side l", bare(d.a) + " cm"], ["One face l²", num(o.face) + u2], ["Lateral SA 4l²", num(o.lsa) + u2], ["Total SA 6l²", num(o.tsa) + u2], ["Volume l³", num(o.vol) + u3]];
        note = v === "net" ? "The net is 6 congruent squares, each " + bare(d.a) + " × " + bare(d.a) + "" + eq(o.face) + " cm². Total SA = 6 × " + num(o.face) + "" + eq(o.tsa) + " cm²."
          : "A cube has 6 congruent square faces of " + num(o.face) + " cm². The 4 side faces make the lateral surface: 4 × " + num(o.face) + "" + eq(o.lsa) + " cm². Volume = " + bare(d.a) + "³" + eq(o.vol) + " cm³.";
      } else if (s.mode === "cylinder") {
        R = [["Radius r", bare(d.r) + " cm"], ["Height h", bare(d.h) + " cm"], ["Circumference 2πr", num(o.circ) + " cm"], ["Curved SA 2πrh", num(o.csa) + u2], ["Total SA 2πr(r + h)", num(o.tsa) + u2], ["Volume πr²h", num(o.vol) + u3]];
        note = v === "net" ? "The curved surface unrolls into a rectangle 2πr = " + bare(o.circ) + " cm long and h = " + bare(d.h) + " cm wide, so its area is 2πrh" + eq(o.csa) + " cm². Add the two circles, πr² each, for the total."
          : "Curved SA = 2 × " + pt + " × " + bare(d.r) + " × " + bare(d.h) + "" + eq(o.csa) + " cm². Volume = " + pt + " × " + bare(d.r) + "² × " + bare(d.h) + "" + eq(o.vol) + " cm³ (π = " + pt + ").";
      } else if (s.mode === "cone") {
        R = [["Radius r", bare(d.r) + " cm"], ["Height h", bare(d.h) + " cm"], ["Slant height l", num(o.l) + " cm"], ["Curved SA πrl", num(o.csa) + u2], ["Total SA πr(l + r)", num(o.tsa) + u2], ["Volume ⅓πr²h", num(o.vol) + u3]];
        if (v === "fill") R[2] = ["Cylinder πr²h", num(o.cyl) + u3];
        note = v === "net" ? "The curved surface opens into a sector of radius l = " + bare(o.l) + " cm. Its arc is the base circumference 2πr = " + bare(o.circ) + " cm, and its angle is " + num(o.theta) + "°."
          : v === "cut" ? "Cut the sector into thin pieces and lay them head to tail. They make a shape close to a rectangle: length half the circumference, πr" + eq(o.half) + " cm, breadth l" + eq(o.l) + " cm. So curved SA = πr × l" + eq(o.csa) + " cm²."
          : v === "fill" ? "A cylinder with the same base and height holds πr²h" + eq(o.cyl) + " cm³. Three conefuls fill it, so the cone holds ⅓πr²h" + eq(o.vol) + " cm³."
          : "l² = r² + h² = " + bare(d.r) + "² + " + bare(d.h) + "² = " + bare(o.l2) + ", so l" + eq(o.l) + " cm. Volume = ⅓ × " + pt + " × " + bare(d.r) + "² × " + bare(d.h) + "" + eq(o.vol) + " cm³.";
      } else if (s.mode === "sphere") {
        if (v === "cyl") {
          R = [["Radius r", bare(d.r) + " cm"], ["Surface area 4πr²", num(o.sa) + u2], ["Volume ⁴⁄₃πr³", num(o.vol) + u3], ["Cylinder curved SA", num(o.cylcsa) + u2], ["Cylinder volume", num(o.cyl) + u3], ["Sphere : cylinder", "2 : 3"]];
          note = "The sphere just fits in a cylinder of radius r and height 2r. The sphere's surface 4πr² equals the cylinder's curved surface 2πr × 2r, and its volume is ⅔ of the cylinder's.";
        } else {
          R = [["Radius r", bare(d.r) + " cm"], ["Diameter 2r", bare(2 * d.r) + " cm"], ["One circle πr²", num(o.circle) + u2], ["Surface area 4πr²", num(o.sa) + u2], ["Volume ⁴⁄₃πr³", num(o.vol) + u3]];
          note = v === "circles" ? "The string that covers the sphere also covers 4 circles of radius r. So surface area = 4 × πr² = 4 × " + num(o.circle) + "" + eq(o.sa) + " cm²."
            : "Surface area = 4 × " + pt + " × " + bare(d.r) + "²" + eq(o.sa) + " cm². Volume = ⁴⁄₃ × " + pt + " × " + bare(d.r) + "³" + eq(o.vol) + " cm³.";
        }
      } else {
        R = [["Radius r", bare(d.r) + " cm"], ["Curved SA 2πr²", num(o.csa) + u2], ["Flat face πr²", num(o.flat) + u2], ["Total SA 3πr²", num(o.tsa) + u2], ["Volume ⅔πr³", num(o.vol) + u3]];
        if (v === "fill") R.push(["Cone (h = r) ⅓πr³", num(o.cone) + u3]);
        if (v === "cyl") R.push(["Cylinder πr² × r", num(o.cyl) + u3]);
        note = v === "fill" ? "A cone with the same radius and height h = r holds ⅓πr³" + eq(o.cone) + " cm³. Two conefuls fill the hemisphere: 2 × ⅓πr³ = ⅔πr³" + eq(o.vol) + " cm³."
          : v === "cyl" ? "The hemisphere fits in a cylinder of radius r and height r, volume πr³" + eq(o.cyl) + " cm³. The hemisphere holds ⅔ of it: " + num(o.vol) + " cm³."
          : "Half a sphere: curved SA = ½ × 4πr² = 2πr²" + eq(o.csa) + " cm². A solid hemisphere also has a flat circle πr², so total SA = 3πr²" + eq(o.tsa) + " cm².";
      }
      cells.forEach(function (cell, i) { cell.style.display = R[i] ? "" : "none"; if (R[i]) { spans[i].textContent = R[i][0]; k.set("r" + (i + 1), R[i][1]); } });
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    // ---------- drawing ----------
    k.draw = function (ctx, W, H, c) {
      var d = s.d[s.mode], o = calc(s.mode, d, s.pi), pad = W < 480 ? 34 : 46, E = s.tilt, small = W < 480;
      var F12 = small ? "11px " : "12px ", B13 = small ? "700 12px " : "700 13px ";
      function fit(w, h) { return Math.min((W - pad * 2) / w, (H - pad * 2) / h); }
      function txt(t, x, y, col, al, bl, f) { ctx.fillStyle = col; ctx.font = (f || B13) + c.font; ctx.textAlign = al || "center"; ctx.textBaseline = bl || "middle"; ctx.fillText(t, x, y); }
      function ln(x1, y1, x2, y2, col, w, dash) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 2; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
      function ell(cx, cy, rx, ry, a0, a1, col, w, dash) { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 2; ctx.setLineDash(dash || []); ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(rx, 0.1), Math.max(ry, 0.1), 0, a0, a1); ctx.stroke(); ctx.restore(); }
      function fillEll(cx, cy, rx, ry, a0, a1, col, alpha) { ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(rx, 0.1), Math.max(ry, 0.1), 0, a0, a1); ctx.fill(); ctx.restore(); }
      function poly(pts, fill, alpha, stroke, w) { ctx.save(); ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); if (fill) { ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha = 1; } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = w || 2; ctx.stroke(); } ctx.restore(); }
      function txtBg(t, x, y, col, al, f) { ctx.font = (f || B13) + c.font; var w = ctx.measureText(t).width, x0 = al === "left" ? x : al === "right" ? x - w : x - w / 2; ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = c.surface; ctx.fillRect(x0 - 3, y - 9, w + 6, 18); ctx.restore(); txt(t, x, y, col, al, "middle", f); }
      function dot(x, y) { ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, TAU); ctx.fill(); }
      function coneShape(cx, ty, by, rx, ry) { ctx.beginPath(); ctx.moveTo(cx, ty); ctx.lineTo(cx - rx, by); ctx.ellipse(cx, by, rx, ry, 0, Math.PI, 0, true); ctx.closePath(); }
      function coneOutline(cx, ty, by, rx, ry) { ell(cx, by, rx, ry, 0, Math.PI, c.ink, 2); ell(cx, by, rx, ry, Math.PI, TAU, c.muted, 1.4, [5, 4]); ln(cx, ty, cx - rx, by, c.ink, 2); ln(cx, ty, cx + rx, by, c.ink, 2); }
      // a cone (apex up) that empties as it is poured: wl = fraction of its volume still inside
      function pouringCone(cx, ty, by, rx, ry, hpx, wl) {
        ctx.save(); coneShape(cx, ty, by, rx, ry); ctx.clip();
        if (wl > 0) { var top = hpx * (1 - Math.cbrt(1 - wl)), wy = by - top; ctx.globalAlpha = 0.35; ctx.fillStyle = c.vx; ctx.fillRect(cx - rx - 2, wy, 2 * rx + 4, by - wy + ry + 2); }
        ctx.restore(); coneOutline(cx, ty, by, rx, ry);
      }
      var m = s.mode, v = s.view;
      if (v === "solid" && s.hint) txt(small ? "drag to tilt" : "drag the solid to tilt it", 10, 14, c.muted, "left", "middle", F12);

      if ((m === "cuboid" || m === "cube") && v === "solid") {
        var L = m === "cube" ? d.a : d.l, B = m === "cube" ? d.a : d.b, Hh = m === "cube" ? d.a : d.h, depth = 0.25 + s.tilt, dx = Math.cos(s.turn * Math.PI / 180) * depth, dy = Math.sin(s.turn * Math.PI / 180) * depth;
        var sc = Math.min((W - pad * 2 - 20) / (L + B * dx), (H - pad * 2) / (Hh + B * dy)), x0 = (W - (L + B * dx) * sc) / 2 + 10, y0 = (H + (Hh + B * dy) * sc) / 2;
        var P = function (x, y, z) { return [x0 + (x + z * dx) * sc, y0 - (y + z * dy) * sc]; };
        var p = [P(0, 0, 0), P(L, 0, 0), P(L, Hh, 0), P(0, Hh, 0), P(0, 0, B), P(L, 0, B), P(L, Hh, B), P(0, Hh, B)];
        poly([p[3], p[2], p[6], p[7]], c.tint, 1); poly([p[1], p[5], p[6], p[2]], c.tint, 0.6); poly([p[0], p[1], p[2], p[3]], c.tint, 0.85);
        if (s.cubes && cubesOK()) {   // 1 cm grid on the three visible faces
          var gl = function (a, b2) { ln(a[0], a[1], b2[0], b2[1], c.muted, 0.8); };
          for (var gx = 1; gx < L; gx++) { gl(P(gx, 0, 0), P(gx, Hh, 0)); gl(P(gx, Hh, 0), P(gx, Hh, B)); }
          for (var gy = 1; gy < Hh; gy++) { gl(P(0, gy, 0), P(L, gy, 0)); gl(P(L, gy, 0), P(L, gy, B)); }
          for (var gz = 1; gz < B; gz++) { gl(P(L, 0, gz), P(L, Hh, gz)); gl(P(0, Hh, gz), P(L, Hh, gz)); }
        }
        [[4, 5], [4, 7], [0, 4]].forEach(function (e) { ln(p[e[0]][0], p[e[0]][1], p[e[1]][0], p[e[1]][1], c.muted, 1.5, [5, 4]); });
        [[0, 1], [1, 2], [2, 3], [3, 0], [1, 5], [5, 6], [6, 2], [3, 7], [7, 6]].forEach(function (e) { ln(p[e[0]][0], p[e[0]][1], p[e[1]][0], p[e[1]][1], c.ink, 2.2); });
        ln(p[0][0], p[0][1], p[1][0], p[1][1], c.vy, 3.5); ln(p[1][0], p[1][1], p[5][0], p[5][1], c.vx, 3.5); ln(p[0][0], p[0][1], p[3][0], p[3][1], c.path, 3.5);
        var nm = m === "cube" ? ["l", "l", "l"] : ["l", "b", "h"];
        txt(nm[0] + " = " + bare(L), (p[0][0] + p[1][0]) / 2, p[0][1] + 16, c.vy);
        txt(nm[1] + " = " + bare(B), (p[1][0] + p[5][0]) / 2 + 10, (p[1][1] + p[5][1]) / 2 + 6, c.vx, "left");
        txt(nm[2] + " = " + bare(Hh), p[0][0] - 8, (p[0][1] + p[3][1]) / 2, c.path, "right");
        return;
      }
      if ((m === "cuboid" || m === "cube") && v === "net") {
        var L2 = m === "cube" ? d.a : d.l, B2 = m === "cube" ? d.a : d.b, H2 = m === "cube" ? d.a : d.h;
        var tw = 2 * L2 + 2 * B2, th = H2 + 2 * B2, sc2 = Math.min((W - pad * 2) / tw, (H - pad * 2 - 18) / th), X0 = (W - tw * sc2) / 2, Y0 = (H - 18 - th * sc2) / 2;
        var lf = small ? "600 10px " : "600 12px ";
        var R2 = function (x, y, w, h, lab, col) { var a = [X0 + x * sc2, Y0 + y * sc2]; poly([a, [a[0] + w * sc2, a[1]], [a[0] + w * sc2, a[1] + h * sc2], [a[0], a[1] + h * sc2]], col, 0.85, c.ink, 1.8); ctx.font = lf + c.font; if (ctx.measureText(lab).width + 6 < w * sc2 && h * sc2 > 16) txt(lab, a[0] + w * sc2 / 2, a[1] + h * sc2 / 2, c.ink, "center", "middle", lf); };
        var fl = function (p1, q1) { return m === "cube" ? "l × l" : bare(p1) + " × " + bare(q1); };
        R2(B2, 0, L2, B2, fl(L2, B2), c.tint); R2(0, B2, B2, H2, fl(B2, H2), c.surface); R2(B2, B2, L2, H2, fl(L2, H2), c.tint);
        R2(B2 + L2, B2, B2, H2, fl(B2, H2), c.surface); R2(2 * B2 + L2, B2, L2, H2, fl(L2, H2), c.tint); R2(B2, B2 + H2, L2, B2, fl(L2, B2), c.surface);
        txt(m === "cube" ? "6 faces, each l² = " + bare(d.a * d.a) + " cm²" : "3 pairs of faces: 2(lb + bh + lh)", W / 2, Y0 + th * sc2 + 18, c.muted, "center", "middle", F12);
        return;
      }
      if ((m === "cylinder" || m === "cone") && v === "solid") {
        var r = d.r, h = d.h, sc3 = fit(2 * r, h + 2 * E * r), cx = W / 2 - (small ? 8 : 0), by = H / 2 + (h * sc3) / 2, ty = by - h * sc3, rx = r * sc3, ry = E * r * sc3;
        if (m === "cylinder") {
          poly([[cx - rx, ty], [cx + rx, ty], [cx + rx, by], [cx - rx, by]], c.tint, 0.85);
          fillEll(cx, by, rx, ry, 0, Math.PI, c.tint, 0.85); fillEll(cx, ty, rx, ry, 0, TAU, c.tint, 1);
          ell(cx, ty, rx, ry, 0, TAU, c.ink, 2.2); ell(cx, by, rx, ry, 0, Math.PI, c.ink, 2.2); ell(cx, by, rx, ry, Math.PI, TAU, c.muted, 1.5, [5, 4]);
          ln(cx - rx, ty, cx - rx, by, c.ink, 2.2); ln(cx + rx, ty, cx + rx, by, c.ink, 2.2);
          ln(cx, ty, cx + rx, ty, c.vy, 3); txt("r = " + bare(r), cx + rx / 2, ty - ry - 10, c.vy);
          ln(cx + rx + 12, ty, cx + rx + 12, by, c.vx, 2.5); txt("h = " + bare(h), cx + rx + 18, (ty + by) / 2, c.vx, "left");
          dot(cx, ty);
        } else {
          ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = c.tint; coneShape(cx, ty, by, rx, ry); ctx.fill(); ctx.restore();
          ell(cx, by, rx, ry, 0, Math.PI, c.ink, 2.2); ell(cx, by, rx, ry, Math.PI, TAU, c.muted, 1.5, [5, 4]);
          ln(cx, ty, cx - rx, by, c.ink, 2.2);
          poly([[cx, ty], [cx, by], [cx + rx, by]], c.path, 0.12);
          ln(cx, ty, cx, by, c.vx, 2.5, [6, 4]); ln(cx, by, cx + rx, by, c.vy, 3); ln(cx, ty, cx + rx, by, c.path, 3.2);
          var q = 9; ln(cx, by - q, cx + q, by - q, c.vx, 1.5); ln(cx + q, by - q, cx + q, by, c.vx, 1.5);
          txt("h = " + bare(h), cx - 8, (ty + by) / 2, c.vx, "right");
          txt("r = " + bare(r), cx + rx / 2, by + ry + 12, c.vy);
          txt("l" + eq(o.l), cx + rx / 2 + 10, (ty + by) / 2 - 6, c.path, "left");
          dot(cx, by);
        }
        return;
      }
      if (m === "cylinder" && v === "net") {
        var r4 = d.r, h4 = d.h, C4 = TAU * r4, u = ease(s.prog), wNow = 2 * r4 + (C4 - 2 * r4) * u;
        var sc4 = Math.min((W - pad * 2 - 40) / Math.max(C4, 2 * r4), (H - 24) / (h4 + 4 * r4)), cx4 = W / 2 + 10, top4 = (H - (h4 + 4 * r4) * sc4) / 2 + 2 * r4 * sc4;
        var x4 = cx4 - wNow * sc4 / 2, y4 = top4;
        poly([[x4, y4], [x4 + wNow * sc4, y4], [x4 + wNow * sc4, y4 + h4 * sc4], [x4, y4 + h4 * sc4]], c.tint, 0.85, c.ink, 2);
        if (u < 1) { for (var i = 1; i < 6; i++) { var xx = x4 + wNow * sc4 * (0.5 - 0.5 * Math.cos(i / 6 * Math.PI)); ln(xx, y4, xx, y4 + h4 * sc4, c.line, 1); } }
        [[cx4, y4 - r4 * sc4], [cx4, y4 + h4 * sc4 + r4 * sc4]].forEach(function (pc) { ctx.save(); ctx.fillStyle = c.tint; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(pc[0], pc[1], r4 * sc4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); });
        ln(cx4, y4 - r4 * sc4, cx4 + r4 * sc4, y4 - r4 * sc4, c.vy, 2.5); txt("r = " + bare(r4), cx4 + r4 * sc4 + 8, y4 - r4 * sc4, c.vy, "left");
        ln(x4 - 10, y4, x4 - 10, y4 + h4 * sc4, c.vx, 2.5); txt("h = " + bare(h4), x4 - 16, y4 + h4 * sc4 / 2, c.vx, "right");
        if (u >= 1) { ln(x4, y4 + h4 * sc4, x4 + wNow * sc4, y4 + h4 * sc4, c.path, 3.5); txt("2πr = " + bare(o.circ), x4 + wNow * sc4 / 2, y4 + h4 * sc4 / 2, c.path); }
        return;
      }
      if (m === "cone" && v === "net") {
        var l5 = o.l, r5 = d.r, th5 = TAU * r5 / l5, u5 = ease(s.prog), a0 = 2 * Math.asin(Math.min(1, r5 / l5)), ang = a0 + (th5 - a0) * u5;
        var pts = [[0, 0]]; for (var j = 0; j <= 40; j++) { var t = Math.PI / 2 - th5 / 2 + th5 * j / 40; pts.push([l5 * Math.cos(t), l5 * Math.sin(t)]); }
        var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
        var mnx = Math.min.apply(null, xs), mxx = Math.max.apply(null, xs), mny = Math.min.apply(null, ys), mxy = Math.max.apply(null, ys);
        var gap = Math.max(r5 * 0.5, l5 * 0.08), tw5 = (mxx - mnx) + gap + 2 * r5, th5b = Math.max(mxy - mny, 2 * r5), sc5 = Math.min((W - pad * 2) / tw5, (H - pad * 2 - 10) / th5b);
        var ox5 = (W - tw5 * sc5) / 2 - mnx * sc5, oy5 = (H - 10 - th5b * sc5) / 2 - mny * sc5;
        ctx.save(); ctx.fillStyle = c.tint; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(ox5, oy5); ctx.arc(ox5, oy5, l5 * sc5, Math.PI / 2 - ang / 2, Math.PI / 2 + ang / 2); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        ctx.save(); ctx.strokeStyle = c.vy; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(ox5, oy5, l5 * sc5, Math.PI / 2 - ang / 2, Math.PI / 2 + ang / 2); ctx.stroke(); ctx.restore();
        var ea = Math.PI / 2 - ang / 2; ln(ox5, oy5, ox5 + Math.cos(ea) * l5 * sc5, oy5 + Math.sin(ea) * l5 * sc5, c.path, 3.2);
        txtBg("l" + eq(l5), ox5 + Math.cos(ea) * l5 * sc5 * 0.5 + 6, oy5 + Math.sin(ea) * l5 * sc5 * 0.5 + 14, c.path, "left");
        if (u5 >= 1) {
          var arcLabY = Math.min(H - 10, oy5 + l5 * sc5 + 16);
          txt("arc = 2πr = " + bare(o.circ), ox5, arcLabY, c.vy);
          ctx.save(); ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ox5, oy5, Math.min(26, l5 * sc5 * 0.3), Math.PI / 2 - ang / 2, Math.PI / 2 + ang / 2); ctx.stroke(); ctx.restore();
          txt(num(o.theta) + "°", ox5, oy5 - 12, c.muted, "center", "middle", "700 12px ");
        }
        var bcx = ox5 + mxx * sc5 + gap * sc5 + r5 * sc5, bcy = (H - 10) / 2;
        ctx.save(); ctx.fillStyle = c.tint; ctx.beginPath(); ctx.arc(bcx, bcy, r5 * sc5, 0, TAU); ctx.fill(); ctx.strokeStyle = c.vy; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
        ln(bcx, bcy, bcx + r5 * sc5, bcy, c.vy, 2.5); txt("r = " + bare(r5), bcx, bcy - Math.max(12, r5 * sc5 * 0.3), c.vy);
        return;
      }
      if (m === "cone" && v === "cut") {
        var l6 = o.l, r6 = d.r, th6 = TAU * r6 / l6, n = 16, dl = th6 / n, w6 = 2 * l6 * Math.sin(dl / 2);
        // sector bounding box (apex at 0,0, opening downwards)
        var sp = [[0, 0]]; for (var j2 = 0; j2 <= 48; j2++) { var t2 = Math.PI / 2 - th6 / 2 + th6 * j2 / 48; sp.push([l6 * Math.cos(t2), l6 * Math.sin(t2)]); }
        var sx = sp.map(function (p) { return p[0]; }), sy = sp.map(function (p) { return p[1]; });
        var sW = Math.max.apply(null, sx) - Math.min.apply(null, sx), sH = Math.max.apply(null, sy) - Math.min.apply(null, sy), sTop = Math.min.apply(null, sy);
        var rW = (n / 2) * w6 + w6 / 2, rH = l6, sc6 = Math.min((W - pad * 2 - 36) / Math.max(sW, rW), (H - pad * 2 - 14) / Math.max(sH, rH));
        var cxs = W / 2 - (Math.max.apply(null, sx) + Math.min.apply(null, sx)) / 2 * sc6, cys = (H - 14) / 2 - (sTop + sH / 2) * sc6;   // sector apex on screen
        var X0r = (W + 36) / 2 - rW * sc6 / 2, Y0r = (H - 14) / 2 - rH * sc6 / 2;
        var pr = s.prog;
        for (var i6 = 0; i6 < n; i6++) {
          var phi = -th6 / 2 + dl * (i6 + 0.5), up = i6 % 2 === 0, kk = Math.floor(i6 / 2);
          var tx = up ? X0r + (kk * w6 + w6 / 2) * sc6 : X0r + (kk + 1) * w6 * sc6, ty6 = up ? Y0r : Y0r + rH * sc6;
          var rot = up ? 0 : (phi >= 0 ? Math.PI : -Math.PI);
          var tt = ease(pr * 1.5 - (i6 / n) * 0.5);
          var ax = cxs + (tx - cxs) * tt, ay = cys + (ty6 - cys) * tt, ro = phi + (rot - phi) * tt;
          // each piece is drawn centred on "down" (π/2); in the sector it is turned by phi about the apex
          ctx.save(); ctx.translate(ax, ay); ctx.rotate(ro);
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, l6 * sc6, Math.PI / 2 - dl / 2, Math.PI / 2 + dl / 2); ctx.closePath();
          ctx.globalAlpha = 0.9; ctx.fillStyle = up ? c.tint : c.grid; ctx.fill(); ctx.globalAlpha = 1; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, l6 * sc6, Math.PI / 2 - dl / 2, Math.PI / 2 + dl / 2); ctx.strokeStyle = c.vy; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.restore();
        }
        if (pr >= 1) {
          var yb = Y0r + rH * sc6 + 14;
          ln(X0r, Y0r + rH * sc6 + 5, X0r + (n / 2) * w6 * sc6, Y0r + rH * sc6 + 5, c.vy, 2);
          txt("πr" + eq(o.half), X0r + (n / 2) * w6 * sc6 / 2, Math.min(H - 8, yb + 4), c.vy);
          ln(X0r - 10, Y0r, X0r - 10, Y0r + rH * sc6, c.path, 2.5);
          txt("l" + eq(l6), X0r - 16, Y0r + rH * sc6 / 2, c.path, "right");
        } else if (pr <= 0) {
          txt("arc = 2πr", cxs, Math.min(H - 8, cys + l6 * sc6 + 14), c.vy, "center", "middle", F12);
        }
        return;
      }
      if (m === "cone" && v === "fill") {
        var r7 = d.r, h7 = d.h, g7 = r7 * 0.8, tw7 = 4 * r7 + g7, sc7 = Math.min((W - pad * 2 - 30) / tw7, (H - pad * 2) / (h7 + 2 * E * r7)), rx7 = r7 * sc7, ry7 = E * r7 * sc7;
        var by7 = H / 2 + h7 * sc7 / 2 + ry7 / 2 - 6, ty7 = by7 - h7 * sc7, cxA = (W - 30 - tw7 * sc7) / 2 + rx7, cxB = cxA + rx7 + g7 * sc7 + rx7;
        var pours = clamp(s.prog, 0, 3), done = Math.floor(pours + 1e-9), part = pours - done;
        var lev = pours / 3, wy = by7 - lev * h7 * sc7;
        if (lev > 0) { poly([[cxB - rx7, wy], [cxB + rx7, wy], [cxB + rx7, by7], [cxB - rx7, by7]], c.vx, 0.35); fillEll(cxB, by7, rx7, ry7, 0, Math.PI, c.vx, 0.35); fillEll(cxB, wy, rx7, ry7, 0, TAU, c.vx, 0.55); }
        ell(cxB, ty7, rx7, ry7, 0, TAU, c.ink, 2); ell(cxB, by7, rx7, ry7, 0, Math.PI, c.ink, 2); ell(cxB, by7, rx7, ry7, Math.PI, TAU, c.muted, 1.4, [5, 4]);
        ln(cxB - rx7, ty7, cxB - rx7, by7, c.ink, 2); ln(cxB + rx7, ty7, cxB + rx7, by7, c.ink, 2);
        [1, 2].forEach(function (q2) { var yy = by7 - q2 / 3 * h7 * sc7; ln(cxB + rx7 - 10, yy, cxB + rx7 + 6, yy, c.muted, 1.5); txt(q2 + "/3", cxB + rx7 + 10, yy, c.muted, "left", "middle", F12); });
        pouringCone(cxA, ty7, by7, rx7, ry7, h7 * sc7, done >= 3 ? 0 : 1 - part);
        txt("cone", cxA, by7 + ry7 + 14, c.ink, "center", "middle", "600 12px "); txt("cylinder", cxB, by7 + ry7 + 14, c.ink, "center", "middle", "600 12px ");
        txt(done >= 3 ? "3 conefuls fill it" : "conefuls poured: " + done, cxB, Math.max(12, ty7 - ry7 - 12), c.vx);
        return;
      }
      if (m === "hemisphere" && v === "fill") {
        var r8 = d.r, g8 = r8 * 0.7, tw8 = 4 * r8 + g8, sc8 = Math.min((W - pad * 2 - 44) / tw8, (H - pad * 2 - 20) / (r8 + 2 * E * r8)), rr8 = r8 * sc8, ry8 = E * rr8;
        var base8 = H / 2 + rr8 / 2 + 2, cxC = (W + 44 - tw8 * sc8) / 2 + rr8, cxH = cxC + rr8 + g8 * sc8 + rr8, rim = base8 - rr8;
        var pours8 = clamp(s.prog, 0, 2), done8 = Math.floor(pours8 + 1e-9), part8 = pours8 - done8, f8 = pours8 / 2;
        // bowl: dome down, rim on top
        ctx.save(); ctx.fillStyle = c.tint; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(cxH, rim, rr8, 0, Math.PI); ctx.ellipse(cxH, rim, rr8, ry8, 0, Math.PI, 0, true); ctx.fill(); ctx.restore();
        if (f8 > 0) {   // depth dd of water with volume f8 × ⅔πr³: dd²(3 − dd) = 2 f8 (in units of r)
          var lo = 0, hi = 1; for (var it = 0; it < 40; it++) { var mid = (lo + hi) / 2; if (mid * mid * (3 - mid) < 2 * f8) lo = mid; else hi = mid; }
          var dd = lo, wy8 = base8 - dd * rr8, wr = Math.sqrt(Math.max(0, 1 - (1 - dd) * (1 - dd))) * rr8;
          ctx.save(); ctx.beginPath(); ctx.arc(cxH, rim, rr8, 0, Math.PI); ctx.closePath(); ctx.clip();
          ctx.globalAlpha = 0.4; ctx.fillStyle = c.vx; ctx.fillRect(cxH - rr8, wy8, 2 * rr8, base8 - wy8 + 2); ctx.restore();
          fillEll(cxH, wy8, wr, E * wr, 0, TAU, c.vx, 0.5);
        }
        ctx.save(); ctx.strokeStyle = c.ink; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(cxH, rim, rr8, 0, Math.PI); ctx.stroke(); ctx.restore();
        ell(cxH, rim, rr8, ry8, 0, TAU, c.ink, 2.2);
        ln(cxH, rim, cxH + rr8, rim, c.vy, 2.5); txtBg("r", cxH + rr8 / 2, rim - 10, c.vy);
        pouringCone(cxC, base8 - rr8, base8, rr8, ry8, rr8, done8 >= 2 ? 0 : 1 - part8);
        ln(cxC - rr8 - 10, base8 - rr8, cxC - rr8 - 10, base8, c.vx, 2.5); txt("h = r", cxC - rr8 - 14, base8 - rr8 / 2, c.vx, "right", "middle", small ? "700 11px " : "700 12px ");
        txt("cone", cxC, base8 + ry8 + 14, c.ink, "center", "middle", "600 12px "); txt("hemisphere", cxH, base8 + 14, c.ink, "center", "middle", "600 12px ");
        txt(done8 >= 2 ? "2 conefuls fill it" : "conefuls poured: " + done8, cxH, Math.max(12, rim - ry8 - 30), c.vx);
        return;
      }
      if (m === "sphere" && v === "circles") {
        var r9 = d.r, g9 = r9 * 0.5, tw9 = 2 * r9 + g9 * 1.6 + 4 * r9 + g9 * 0.5, th9 = 4 * r9 + g9 * 0.5, sc9 = Math.min((W - pad * 2 + 20) / tw9, (H - pad * 2 + 20) / th9), rr9 = r9 * sc9;
        var left9 = (W - tw9 * sc9) / 2, cxS = left9 + rr9, cyS = H / 2, gx9 = left9 + (2 * r9 + g9 * 1.6) * sc9, gy9 = H / 2 - th9 * sc9 / 2;
        // the sphere, wound with string
        fillEll(cxS, cyS, rr9, rr9, 0, TAU, c.tint, 0.9);
        ctx.save(); ctx.beginPath(); ctx.arc(cxS, cyS, rr9, 0, TAU); ctx.clip();
        var bands = Math.max(6, Math.round(rr9 / 4));
        for (var b9 = 1; b9 < bands; b9++) { var yy9 = -1 + 2 * b9 / bands, rw = Math.sqrt(1 - yy9 * yy9) * rr9; ell(cxS, cyS + yy9 * rr9, rw, E * rw, 0, Math.PI, c.vx, 1.2); }
        ctx.restore();
        ell(cxS, cyS, rr9, rr9, 0, TAU, c.ink, 2.2);
        ln(cxS, cyS, cxS + rr9, cyS, c.vy, 3); dot(cxS, cyS); txtBg("r = " + bare(r9), cxS + rr9 / 2, cyS - 12, c.vy);
        var pr9 = clamp(s.prog, 0, 4);
        for (var q9 = 0; q9 < 4; q9++) {
          var ccx = gx9 + rr9 + (q9 % 2) * (2 * rr9 + g9 * 0.5 * sc9), ccy = gy9 + rr9 + Math.floor(q9 / 2) * (2 * rr9 + g9 * 0.5 * sc9), f9 = clamp(pr9 - q9, 0, 1);
          ctx.save(); ctx.strokeStyle = c.ink; ctx.lineWidth = 1.6; ctx.setLineDash(f9 >= 1 ? [] : [4, 4]); ctx.beginPath(); ctx.arc(ccx, ccy, rr9, 0, TAU); ctx.stroke(); ctx.restore();
          if (f9 > 0) {   // string coiled from the edge inwards: the covered ring has area f9 × πr²
            var rin = rr9 * Math.sqrt(1 - f9);
            ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = c.vx; ctx.beginPath(); ctx.arc(ccx, ccy, rr9, 0, TAU); ctx.arc(ccx, ccy, rin, 0, TAU, true); ctx.fill(); ctx.restore();
            var rings = Math.max(4, Math.round(rr9 / 4));
            for (var g = 1; g <= rings; g++) { var rg = rr9 * g / rings; if (rg >= rin - 0.5) ell(ccx, ccy, rg, rg, 0, TAU, c.vx, 1.1); }
          }
          txt(String(q9 + 1), ccx, ccy, c.ink, "center", "middle", B13);
        }
        txt("πr² each", gx9 + 2 * rr9 + g9 * 0.25 * sc9, Math.min(H - 8, gy9 + th9 * sc9 + 12), c.muted, "center", "middle", F12);
        return;
      }
      if (m === "sphere" || m === "hemisphere") {
        var r10 = d.r, hemi = m === "hemisphere", inCyl = v === "cyl";
        var sc10 = Math.min((W - pad * 2 - 50) / (2 * r10), (H - pad * 2) / ((hemi ? r10 : 2 * r10) + 2 * E * r10)), cx10 = W / 2 - 14, rr = r10 * sc10, ry10 = E * rr;
        var cy10 = hemi ? H / 2 - rr / 2 : H / 2;   // centre of the sphere (or of the flat face)
        if (inCyl) {
          var cTop = hemi ? cy10 : cy10 - rr, cBot = cy10 + rr;
          poly([[cx10 - rr, cTop], [cx10 + rr, cTop], [cx10 + rr, cBot], [cx10 - rr, cBot]], c.grid, 0.6);
          ell(cx10, cTop, rr, ry10, 0, TAU, c.muted, 1.8); ell(cx10, cBot, rr, ry10, 0, Math.PI, c.muted, 1.8); ell(cx10, cBot, rr, ry10, Math.PI, TAU, c.muted, 1.2, [4, 4]);
          ln(cx10 - rr, cTop, cx10 - rr, cBot, c.muted, 1.8); ln(cx10 + rr, cTop, cx10 + rr, cBot, c.muted, 1.8);
          ln(cx10 + rr + 12, cTop, cx10 + rr + 12, cBot, c.vx, 2.5); txt(hemi ? "h = r" : "h = 2r", cx10 + rr + 18, (cTop + cBot) / 2, c.vx, "left");
        }
        ctx.save(); ctx.fillStyle = c.tint; ctx.globalAlpha = 0.9; ctx.beginPath();
        if (hemi) { ctx.arc(cx10, cy10, rr, 0, Math.PI); ctx.ellipse(cx10, cy10, rr, ry10, 0, Math.PI, 0, true); } else ctx.arc(cx10, cy10, rr, 0, TAU);
        ctx.fill(); ctx.restore();
        ctx.save(); ctx.strokeStyle = c.ink; ctx.lineWidth = 2.2; ctx.beginPath(); if (hemi) ctx.arc(cx10, cy10, rr, 0, Math.PI); else ctx.arc(cx10, cy10, rr, 0, TAU); ctx.stroke(); ctx.restore();
        if (hemi) { fillEll(cx10, cy10, rr, ry10, 0, TAU, c.path, 0.18); ell(cx10, cy10, rr, ry10, 0, TAU, c.ink, 2.2); }
        else { ell(cx10, cy10, rr, ry10, 0, Math.PI, c.ink, 1.6); ell(cx10, cy10, rr, ry10, Math.PI, TAU, c.muted, 1.3, [5, 4]); }
        ln(cx10, cy10, cx10 + rr, cy10, c.vy, 3); txtBg("r = " + bare(r10), cx10 + rr / 2, cy10 - 13, c.vy);
        dot(cx10, cy10);
        if (hemi && !inCyl) { txt("flat face πr²", cx10, cy10 - ry10 - 12, c.path, "center", "middle", "600 12px "); txt("curved 2πr²", cx10, cy10 + rr * 0.6, c.ink, "center", "middle", "600 12px "); }
        return;
      }
    };

    // ---------- drag to tilt ----------
    var drag = null;
    k.canvas.addEventListener("pointerdown", function (e) { drag = { x: e.clientX, y: e.clientY, t: s.tilt, a: s.turn }; try { k.canvas.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
    k.canvas.addEventListener("pointermove", function (e) {
      if (!drag) return;
      s.tilt = clamp(drag.t + (e.clientY - drag.y) / 300, 0.12, 0.55);
      s.turn = clamp(drag.a - (e.clientX - drag.x) / 3, 12, 75);
      k.redraw();
    });
    ["pointerup", "pointercancel"].forEach(function (ev) { k.canvas.addEventListener(ev, function () { drag = null; }); });

    // ---------- controls ----------
    function animate(to, secs) {
      if (clock) clock.stop();
      if (reduce) { s.prog = to; update(); return; }
      s.prog = 0; update();
      clock = K.clock(function (dt) { s.prog = Math.min(to, s.prog + dt * to / secs); update(); return s.prog < to; });
      clock.start();
    }
    function play() {
      var v = s.view;
      if (v === "net" && (s.mode === "cylinder" || s.mode === "cone")) animate(1, 2.2);
      else if (v === "cut") animate(1, 3.5);
      else if (v === "fill") animate(maxProg(), maxProg() * 2);
      else if (v === "circles") animate(4, 6);
    }
    ins.forEach(function (inp, i) { inp.addEventListener("input", function () { var D = DIMS[s.mode][i]; s.d[s.mode][D[0]] = +inp.value; update(); }); });
    cubeBox.addEventListener("change", function () { s.cubes = cubeBox.checked; update(); });
    root.addEventListener("click", function (e) {
      var b = e.target.closest(".preset-list button"); if (!b) return;
      var g = b.parentNode.dataset.group;
      if (clock) clock.stop();
      if (g === "mode") { s.mode = b.dataset.v; s.view = "solid"; }
      if (g === "view") s.view = b.dataset.v;
      if (g === "pi") s.pi = b.dataset.v;
      s.prog = maxProg();
      update();
    });
    k.onAct({ play: play });
    s.prog = maxProg();
    update();
    return {
      set: function (o) {
        if (clock) clock.stop();
        if (o.mode) s.mode = o.mode;
        if (o.view) s.view = o.view; else if (o.mode) s.view = "solid";
        if (o.pi) s.pi = String(o.pi);
        if (o.d) Object.assign(s.d[s.mode], o.d);
        if (o.cubes != null) s.cubes = !!o.cubes;
        if (o.hint != null) s.hint = !!o.hint;
        if (o.tilt != null) s.tilt = o.tilt;
        if (o.turn != null) s.turn = o.turn;
        if (VIEWS[s.mode].indexOf(s.view) < 0) s.view = "solid";
        s.prog = o.prog != null ? o.prog : maxProg(); update();
      },
      play: play,
      seek: function (t) { if (clock) clock.stop(); s.prog = t; update(); },
      state: function () { return Object.assign({ mode: s.mode, view: s.view, prog: s.prog }, calc(s.mode, s.d[s.mode], s.pi)); }
    };
  }
  window.VolumeSim = { mount: mount, calc: calc };
})();
