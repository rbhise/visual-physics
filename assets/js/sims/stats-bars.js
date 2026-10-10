/*
 * Bar graphs: the same data drawn as a simple bar graph (totals), a double bar graph,
 * a subdivided bar graph and a percentage bar graph. Choose the scale; tap a bar to read it;
 * drag the top of a bar (double and subdivided graphs) to change the data.
 * Needs sim-kit.js.  StatsBarSim.mount(el, { data: "div", form: "double" })
 */
(function () {
  "use strict";
  var K = window.SimKit;
  var DATA = {
    div: { title: "Students in the Std 9 divisions", groups: ["Div A", "Div B", "Div C", "Div D"], series: ["Boys", "Girls"], vals: [[24, 16], [20, 25], [30, 20], [15, 25]], unit: "students", xlab: "Division" },
    crop: { title: "Crop yield on a farm", groups: ["2021", "2022", "2023", "2024"], series: ["Rice", "Wheat"], vals: [[60, 40], [75, 45], [50, 70], [90, 30]], unit: "quintals", xlab: "Year" },
    fruit: { title: "Fruit sold by a shop", groups: ["Mon", "Tue", "Wed", "Thu", "Fri"], series: ["Mangoes", "Bananas"], vals: [[35, 45], [20, 60], [45, 30], [30, 30], [50, 25]], unit: "dozen", xlab: "Day" }
  };
  var FORMS = { simple: "Simple bar graph (totals)", double: "Double bar graph", subdivided: "Subdivided bar graph", percentage: "Percentage bar graph" };

  function fitAspect(stage, wide, narrow) {
    var mq = window.matchMedia("(max-width: 760px)");
    function ap() { stage.style.aspectRatio = mq.matches ? narrow : wide; }
    ap(); if (mq.addEventListener) mq.addEventListener("change", ap);
  }
  function num(x) { var r = Math.round(x * 10) / 10; return String(r); }

  function mount(root, opts) {
    opts = opts || {};
    var s = Object.assign({ data: "div", form: "double", scale: 0, sel: [0, 0] }, opts);
    var D = null, grow = 1, rects = [], drag = null, G = null;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function load(name, vals) { var src = DATA[name] || DATA.div; D = JSON.parse(JSON.stringify(src)); if (vals) D.vals = vals.map(function (r) { return r.slice(); }); }
    load(s.data, opts.vals);

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "A bar graph of two sets of data that can be drawn as a double, subdivided or percentage bar graph",
      panel: K.chips("data", "Data", [["div", "Students"], ["crop", "Crops"], ["fruit", "Fruit"]]) +
        K.chips("form", "Draw it as", [["simple", "Simple (totals)"], ["double", "Double"], ["subdivided", "Subdivided"], ["percentage", "Percentage"]]) +
        '<div data-show="scale">' + K.chips("scale", "Scale on the Y-axis: 1 division =", [["0", "Auto"], ["5", "5"], ["10", "10"], ["20", "20"], ["25", "25"]]) + '</div>' +
        K.buttons([["play", "Draw the bars"]]) + K.hint("note"),
      readouts: [["form", "Graph", "wrap"], ["scale", "Scale", "wrap"], ["sel", "Selected bar", "c-path wrap"],
                 ["val", "Value"], ["tot", "Total for the group"], ["pc", "Percentage of the group", "wrap"]],
      cols: 3
    });
    fitAspect(root.querySelector(".sim-stage"), "16 / 10", "4 / 3.8");

    function total(g) { return D.vals[g][0] + D.vals[g][1]; }
    function scaleOf() {
      if (s.form === "percentage") return 10;
      var top = maxNeeded();
      if (+s.scale) return +s.scale;
      return K.niceStep(top, 6);
    }
    function maxNeeded() {
      var m = 0;
      D.vals.forEach(function (v, g) { m = Math.max(m, s.form === "double" ? Math.max(v[0], v[1]) : total(g)); });
      return Math.max(m, 1);
    }
    function ymax() { if (s.form === "percentage") return 100; var st = scaleOf(); return Math.max(st, Math.ceil(maxNeeded() / st) * st); }
    function pctCalc(g, i) {
      var v = D.vals[g][i], t = total(g), p = t ? v / t * 100 : 0, exact = Math.abs(p * 10 - Math.round(p * 10)) < 1e-9;
      return v + " ÷ " + t + " × 100 " + (exact ? "= " : "≈ ") + num(p) + "%";
    }

    function update() {
      root.querySelector('[data-show="scale"]').style.display = s.form === "percentage" ? "none" : "";
      var g = Math.min(s.sel[0], D.groups.length - 1), i = s.form === "simple" ? -1 : s.sel[1];
      k.set("form", FORMS[s.form]);
      k.set("scale", "1 division = " + scaleOf() + (s.form === "percentage" ? "%" : " " + D.unit));
      k.set("sel", D.groups[g] + (i >= 0 ? ", " + D.series[i] : ", total"));
      k.set("val", (i >= 0 ? D.vals[g][i] : total(g)) + " " + D.unit);
      k.set("tot", D.vals[g][0] + " + " + D.vals[g][1] + " = " + total(g));
      k.set("pc", i >= 0 ? pctCalc(g, i) : "100%");
      var note = {
        simple: "One bar for each group. Its height is the total: " + D.groups.map(function (n, j) { return total(j); }).join(", ") + " " + D.unit + ".",
        double: "Two bars side by side for each " + D.xlab.toLowerCase() + ": easy to compare " + D.series[0].toLowerCase() + " with " + D.series[1].toLowerCase() + ". Drag the top of a bar to change it.",
        subdivided: "One bar for each " + D.xlab.toLowerCase() + ", as tall as the total, divided into its two parts. Drag the top of a part to change it.",
        percentage: "Every bar is 100% tall. Each part is (part ÷ total) × 100, so " + D.groups.length + " groups of different sizes can be compared fairly."
      }[s.form];
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var narrow = W < 520, fs = narrow ? 10 : 12;
      var padL = narrow ? 34 : 46, padB = narrow ? 40 : 46, padT = narrow ? 50 : 56, padR = 10;
      var gx = padL, gy = padT, gw = W - padL - padR, gh = H - padT - padB;
      var top = ymax(), st = scaleOf(), Y = function (v) { return gy + gh - v / top * gh; };
      G = { gy: gy, gh: gh, top: top };
      var cols = [c.path, c.vy];
      // title and legend
      ctx.font = "700 " + (narrow ? 12 : 14) + "px " + c.font; ctx.fillStyle = c.ink; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(D.title, 8, 8);
      ctx.font = fs + "px " + c.font; var lx = 8, ly = narrow ? 26 : 30;
      if (s.form === "simple") { ctx.fillStyle = c.vx; ctx.fillRect(lx, ly, 12, 12); ctx.fillStyle = c.ink; ctx.fillText("Total " + D.unit, lx + 16, ly); }
      else D.series.forEach(function (nm, i) { ctx.fillStyle = cols[i]; ctx.fillRect(lx, ly, 12, 12); ctx.fillStyle = c.ink; ctx.fillText(nm, lx + 16, ly); lx += ctx.measureText(nm).width + 34; });
      ctx.textAlign = "right"; ctx.fillStyle = c.muted; ctx.fillText(s.form === "percentage" ? "Y-axis: percentage" : "Y-axis: " + D.unit, W - 8, ly);
      // grid and scale
      var nt = Math.round(top / st), every = Math.max(1, Math.ceil(nt / (narrow ? 8 : 12)));
      ctx.lineWidth = 1; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (var t = 0; t <= nt; t++) {
        var v = t * st; ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(gx, Math.round(Y(v)) + 0.5); ctx.lineTo(gx + gw, Math.round(Y(v)) + 0.5); ctx.stroke();
        if (t % every === 0) { ctx.fillStyle = c.muted; ctx.fillText(v + (s.form === "percentage" && !narrow ? "%" : ""), gx - 5, Y(v)); }
      }
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx, gy - 6); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
      var n = D.groups.length, slot = gw / n;
      rects = [];
      ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = c.ink; ctx.font = fs + "px " + c.font;
      D.groups.forEach(function (nm, g) { ctx.fillText(nm, gx + slot * (g + 0.5), gy + gh + 5); });
      ctx.fillStyle = c.muted; ctx.textAlign = "right"; ctx.fillText(D.xlab + " →", gx + gw, gy + gh + (narrow ? 20 : 24));
      function bar(x, y0, y1, w, col, g, i, label, labIn) {
        var hpx = y0 - y1;
        ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(x, y1, w, hpx); ctx.globalAlpha = 1;
        rects.push({ x: x, y: y1, w: w, h: hpx, g: g, i: i });
        var on = s.sel[0] === g && (s.form === "simple" || s.sel[1] === i);
        if (on) { ctx.strokeStyle = c.ink; ctx.lineWidth = 3; ctx.strokeRect(x - 1.5, y1 - 1.5, w + 3, hpx + 3); }
        if (label != null && grow >= 1) {
          ctx.font = "700 " + fs + "px " + c.font; ctx.textAlign = "center";
          if (labIn) { if (hpx > fs + 6) { ctx.fillStyle = c.surface; ctx.textBaseline = "middle"; ctx.fillText(label, x + w / 2, y1 + hpx / 2); } }
          else { ctx.fillStyle = c.ink; ctx.textBaseline = "bottom"; ctx.fillText(label, x + w / 2, y1 - 3); }
        }
      }
      D.vals.forEach(function (v, g) {
        var cx = gx + slot * (g + 0.5), base = Y(0), tt = total(g);
        if (s.form === "double") {
          var w = Math.min(slot * 0.32, 60);
          bar(cx - w - 1, base, Y(v[0] * grow), w, cols[0], g, 0, v[0]);
          bar(cx + 1, base, Y(v[1] * grow), w, cols[1], g, 1, v[1]);
        } else if (s.form === "simple") {
          var w1 = Math.min(slot * 0.45, 70);
          bar(cx - w1 / 2, base, Y(tt * grow), w1, c.vx, g, 0, tt);
        } else {
          var w2 = Math.min(slot * 0.45, 70), a = v[0], b = v[1];
          if (s.form === "percentage") { a = tt ? v[0] / tt * 100 : 0; b = 100 - a; }
          var ra = num(a), rb = num(100 - +num(a));
          bar(cx - w2 / 2, base, Y(a * grow), w2, cols[0], g, 0, s.form === "percentage" ? ra + "%" : v[0], true);
          bar(cx - w2 / 2, Y(a * grow), Y((a + b) * grow), w2, cols[1], g, 1, s.form === "percentage" ? rb + "%" : v[1], true);
          if (s.form === "subdivided" && grow >= 1) { ctx.fillStyle = c.ink; ctx.font = "700 " + fs + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(tt, cx, Y(tt) - 3); }
        }
      });
    };

    function pos(e) { var r = k.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    k.canvas.addEventListener("pointerdown", function (e) {
      var p = pos(e), hit = null;
      rects.forEach(function (r) { if (p[0] >= r.x - 4 && p[0] <= r.x + r.w + 4 && p[1] >= r.y - 10 && p[1] <= r.y + r.h + 2) hit = r; });
      if (!hit) return;
      s.sel = [hit.g, hit.i];
      if ((s.form === "double" || s.form === "subdivided") && Math.abs(p[1] - hit.y) < 14) { drag = hit; k.canvas.setPointerCapture(e.pointerId); }
      update();
    });
    k.canvas.addEventListener("pointermove", function (e) {
      if (!drag || !G) return;
      var p = pos(e), v = Math.round((G.gy + G.gh - p[1]) / G.gh * G.top), g = drag.g;
      if (s.form === "double") D.vals[g][drag.i] = Math.max(0, Math.min(200, v));
      else if (drag.i === 0) D.vals[g][0] = Math.max(0, Math.min(200, v));
      else D.vals[g][1] = Math.max(0, Math.min(200, v - D.vals[g][0]));
      update();
    });
    k.canvas.addEventListener("pointerup", function () { drag = null; });
    k.canvas.style.cursor = "pointer";

    var clock = K.clock(function (dt) { grow = Math.min(1, grow + dt / 1.2); k.redraw(); return grow < 1; });
    function play() { clock.stop(); if (reduce) { grow = 1; k.redraw(); return; } grow = 0; clock.start(); }
    var showD = k.bindChips("data", function () { return s.data; }, function (v) { s.data = v; load(v); s.sel = [0, 0]; update(); });
    var showF = k.bindChips("form", function () { return s.form; }, function (v) { s.form = v; update(); play(); });
    var showS = k.bindChips("scale", function () { return String(s.scale); }, function (v) { s.scale = +v; update(); });
    k.onAct({ play: play });
    update();
    return {
      set: function (o) {
        clock.stop(); grow = 1;
        if (o.data || o.vals) load(o.data || s.data, o.vals);
        Object.assign(s, o); if (!o.sel && o.data) s.sel = s.sel || [0, 0];
        showD(); showF(); showS(); update();
      },
      play: play, seek: function (t) { clock.stop(); grow = t; k.redraw(); },
      state: function () { return { s: s, D: D, ymax: ymax(), scale: scaleOf() }; }
    };
  }
  window.StatsBarSim = { mount: mount };
})();
