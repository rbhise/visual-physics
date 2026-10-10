/*
 * Frequency tables. The raw data sits at the top; "Sort the data" sends each value to its row,
 * adding a tally mark. Ungrouped (one row per value) or grouped (class intervals, inclusive or
 * exclusive), then a cumulative frequency column (less than or more than) fills row by row.
 * Needs sim-kit.js.  StatsFreqSim.mount(el, { data: "marks", width: 10, form: "excl", cf: "less" })
 */
(function () {
  "use strict";
  var K = window.SimKit;
  var DATA = {
    marks: { title: "Marks out of 50 scored by 30 students", unit: "marks", grouped: true,
      values: [23, 35, 41, 12, 28, 30, 45, 19, 33, 27, 38, 22, 15, 40, 31, 26, 48, 36, 29, 10, 34, 20, 42, 25, 37, 30, 18, 44, 32, 39] },
    family: { title: "Number of members in the families of 25 students", unit: "members", grouped: false,
      values: [4, 3, 5, 4, 6, 2, 4, 3, 5, 7, 4, 3, 4, 5, 6, 3, 4, 2, 5, 4, 3, 6, 4, 5, 3] }
  };

  function fitAspect(stage, wide, narrow) {
    var mq = window.matchMedia("(max-width: 760px)");
    function ap() { stage.style.aspectRatio = mq.matches ? narrow : wide; }
    ap(); if (mq.addEventListener) mq.addEventListener("change", ap);
  }
  function num(x) { return String(Math.round(x * 100) / 100); }

  function mount(root, opts) {
    opts = opts || {};
    var s = Object.assign({ data: "marks", width: 10, form: "excl", cf: "less", sel: 0 }, opts);
    var D = DATA[s.data], vals = (opts.values || D.values).slice();
    if (!("grouped" in opts)) s.grouped = D.grouped;
    var placed = vals.length, frac = 0, cfShown = 99, phase = 0, rowsGeo = null;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var k = K.frame(root, {
      aspect: "16 / 10.5",
      label: "Raw data values being sorted into a frequency table with tally marks, frequencies and cumulative frequencies",
      panel: K.chips("data", "Data", [["marks", "Test marks"], ["family", "Family size"]]) +
        K.chips("grouped", "Table", [["0", "Ungrouped"], ["1", "Grouped"]]) +
        '<div data-show="grp" style="display:flex;flex-direction:column;gap:0.9rem">' + K.chips("width", "Class width", [["5", "5"], ["10", "10"]]) +
        K.chips("form", "Classes", [["excl", "Exclusive (10–20)"], ["incl", "Inclusive (10–19)"]]) + '</div>' +
        K.chips("cf", "Cumulative frequency", [["none", "Hide"], ["less", "Less than"], ["more", "More than"]]) +
        K.buttons([["play", "Sort the data"], ["one", "One value"], ["reset", "Reset"]]) + K.hint("note"),
      readouts: [["n", "Number of values, N"], ["cls", "Classes", "wrap"], ["sel", "Selected row", "c-path"],
                 ["cm", "Class mark", "wrap"], ["f", "Frequency", "c-vx"], ["cf", "Cumulative frequency", "wrap"]],
      cols: 3
    });
    fitAspect(root.querySelector(".sim-stage"), "16 / 10.5", "4 / 5");
    var spans = root.querySelectorAll(".sim-readout span");

    function classes() {   // [{lo, hi, label, mark, test(v)}]
      var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), out = [];
      if (!s.grouped) {
        for (var v = mn; v <= mx; v++) (function (v) { out.push({ lo: v, hi: v, label: String(v), mark: v, test: function (x) { return x === v; } }); })(v);
        return out;
      }
      var w = s.width, st = Math.floor(mn / w) * w;
      for (var lo = st; lo <= mx; lo += w) (function (lo) {
        var hi = s.form === "excl" ? lo + w : lo + w - 1;
        out.push({ lo: lo, hi: hi, label: lo + "–" + hi, mark: (lo + hi) / 2,
          test: s.form === "excl" ? function (x) { return x >= lo && x < lo + w; } : function (x) { return x >= lo && x <= lo + w - 1; } });
      })(lo);
      return out;
    }
    function freqs(C, upto) { return C.map(function (c) { var f = 0; for (var i = 0; i < upto; i++) if (c.test(vals[i])) f++; return f; }); }
    function cumul(F) {
      var out = F.map(function () { return 0; }), run = 0, i;
      if (s.cf === "more") for (i = F.length - 1; i >= 0; i--) { run += F[i]; out[i] = run; }
      else for (i = 0; i < F.length; i++) { run += F[i]; out[i] = run; }
      return out;
    }
    function cfOrder(i, n) { return s.cf === "more" ? n - 1 - i : i; }   // order in which the c.f. cells fill
    function cfMeaning(c, v) {
      if (s.cf === "more") return v + " value" + (v === 1 ? "" : "s") + " of " + c.lo + " or more";
      if (!s.grouped || s.form === "incl") return v + " value" + (v === 1 ? "" : "s") + " of " + c.hi + " or less";
      return v + " value" + (v === 1 ? "" : "s") + " less than " + c.hi;
    }

    function update() {
      root.querySelector('[data-show="grp"]').style.display = s.grouped ? "flex" : "none";
      var C = classes(), F = freqs(C, placed), CF = cumul(F), i = Math.min(s.sel, C.length - 1);
      spans[2].textContent = s.grouped ? "Selected class" : "Selected value";
      k.set("n", placed < vals.length ? placed + " of " + vals.length + " sorted" : String(vals.length));
      k.set("cls", s.grouped ? C.length + " classes of width " + s.width + (s.form === "excl" ? ", exclusive" : ", inclusive") : "values " + C[0].lo + " to " + C[C.length - 1].lo);
      k.set("sel", C[i].label + (s.grouped ? "" : " " + D.unit));
      k.set("cm", s.grouped ? "(" + C[i].lo + " + " + C[i].hi + ") ÷ 2 = " + num(C[i].mark) : "–");
      k.set("f", String(F[i]));
      k.set("cf", s.cf === "none" ? "–" : placed < vals.length || cfOrder(i, C.length) >= cfShown ? "…" : CF[i] + ": " + cfMeaning(C[i], CF[i]));
      var note;
      if (placed < vals.length) note = "Sorting: each value adds one tally mark to the row it belongs to. Every fifth mark is drawn across the four before it.";
      else if (s.cf !== "none" && cfShown < C.length) note = s.cf === "less" ? "Less than c.f.: add each frequency to the total of the rows above it." : "More than c.f.: start at the bottom and add each frequency to the total of the rows below it.";
      else if (s.grouped && s.form === "excl") note = "Exclusive classes: the upper limit is not included, so a value of " + C[1].lo + " goes into " + C[1].label + ", not " + C[0].label + ". Total of the frequencies = N = " + vals.length + ".";
      else if (s.grouped) note = "Inclusive classes: both limits are included, so " + C[0].hi + " is in " + C[0].label + " and " + C[1].lo + " is in " + C[1].label + ". Total of the frequencies = N = " + vals.length + ".";
      else note = "An ungrouped table has one row for each value. Total of the frequencies = N = " + vals.length + ".";
      if (placed === vals.length && s.cf !== "none" && cfShown >= C.length) note += s.cf === "less" ? " The last less-than c.f. equals N." : " The first more-than c.f. equals N.";
      k.el('[data-r="note"]').textContent = note;
      k.btn("one").disabled = placed >= vals.length;
      k.redraw();
    }

    function tally(ctx, x, y, f, col, h) {
      ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.lineCap = "round";
      var gx = x;
      for (var g = 0; g < f; g += 5) {
        var m = Math.min(5, f - g);
        for (var j = 0; j < Math.min(4, m); j++) { ctx.beginPath(); ctx.moveTo(gx + j * 5, y - h / 2); ctx.lineTo(gx + j * 5, y + h / 2); ctx.stroke(); }
        if (m === 5) { ctx.beginPath(); ctx.moveTo(gx - 3, y + h / 2 - 1); ctx.lineTo(gx + 18, y - h / 2 + 1); ctx.stroke(); }
        gx += 27;
      }
      ctx.lineCap = "butt";
    }

    k.draw = function (ctx, W, H, c) {
      var narrow = W < 520, fs = narrow ? 11 : 13, C = classes(), F = freqs(C, placed), CF = cumul(F);
      var cols = narrow ? 10 : 15, tw = Math.min(narrow ? 34 : 44, (W - 16) / cols), th = narrow ? 22 : 24, x0 = (W - tw * cols) / 2;
      ctx.font = "700 " + (narrow ? 12 : 14) + "px " + c.font; ctx.fillStyle = c.ink; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(D.title + " (raw data)", 8, 8);
      var ty0 = narrow ? 28 : 32, tiles = [];
      vals.forEach(function (v, i) {
        var x = x0 + (i % cols) * tw, y = ty0 + Math.floor(i / cols) * th;
        tiles.push([x + tw / 2, y + th / 2]);
        var cur = i === placed && phase === 1;
        ctx.fillStyle = cur ? c.vy : i < placed ? c.grid : c.tint; ctx.fillRect(x + 1.5, y + 1.5, tw - 3, th - 3);
        ctx.fillStyle = cur ? c.surface : i < placed ? c.muted : c.ink; ctx.font = (cur ? "700 " : "") + fs + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(v, x + tw / 2, y + th / 2 + 0.5);
      });
      // the table
      var top = ty0 + Math.ceil(vals.length / cols) * th + (narrow ? 12 : 16), showCm = s.grouped && !narrow, showCf = s.cf !== "none";
      var heads = [s.grouped ? "Class" : D.unit.charAt(0).toUpperCase() + D.unit.slice(1), "Tally marks", narrow ? "Freq." : "Frequency"];
      var wts = [1.1, 1.9, 1];
      if (showCm) { heads.push("Class mark"); wts.push(1); }
      if (showCf) { heads.push(narrow ? (s.cf === "less" ? "c.f. (less than)" : "c.f. (more than)") : (s.cf === "less" ? "c.f. (less than)" : "c.f. (more than)")); wts.push(narrow ? 1.25 : 1.5); }
      var tot = wts.reduce(function (a, b) { return a + b; }, 0), tx = 8, twid = W - 16, xs = [tx];
      wts.forEach(function (w) { xs.push(xs[xs.length - 1] + twid * w / tot); });
      var rh = Math.max(18, Math.min(narrow ? 30 : 36, (H - top - 6) / (C.length + 2)));
      ctx.fillStyle = c.tint; ctx.fillRect(tx, top, twid, rh);
      ctx.font = "700 " + (narrow ? 10 : 12) + "px " + c.font; ctx.fillStyle = c.ink; ctx.textBaseline = "middle"; ctx.textAlign = "center";
      heads.forEach(function (h, j) {
        var cx = (xs[j] + xs[j + 1]) / 2, w = xs[j + 1] - xs[j] - 4;
        if (ctx.measureText(h).width > w && h.indexOf(" ") > 0) {
          var cut = h.indexOf(" ("); if (cut < 0) cut = h.indexOf(" ");
          ctx.font = "700 9px " + c.font; ctx.fillText(h.slice(0, cut), cx, top + rh / 2 - 6); ctx.fillText(h.slice(cut + 1), cx, top + rh / 2 + 6);
          ctx.font = "700 " + (narrow ? 10 : 12) + "px " + c.font;
        } else ctx.fillText(h, cx, top + rh / 2);
      });
      rowsGeo = { top: top + rh, rh: rh, n: C.length };
      C.forEach(function (cl, i) {
        var y = top + rh * (i + 1), yc = y + rh / 2;
        if (i === s.sel) { ctx.fillStyle = c.path; ctx.globalAlpha = 0.12; ctx.fillRect(tx, y, twid, rh); ctx.globalAlpha = 1; }
        ctx.font = fs + "px " + c.font; ctx.fillStyle = i === s.sel ? c.path : c.ink; ctx.textAlign = "center";
        ctx.fillText(cl.label, (xs[0] + xs[1]) / 2, yc);
        tally(ctx, xs[1] + 10, yc, F[i], c.vy, Math.min(14, rh - 6));
        ctx.font = "700 " + fs + "px " + c.font; ctx.fillStyle = c.vx; ctx.fillText(F[i], (xs[2] + xs[3]) / 2, yc);
        var j = 3;
        if (showCm) { ctx.font = fs + "px " + c.font; ctx.fillStyle = c.ink; ctx.fillText(num(cl.mark), (xs[3] + xs[4]) / 2, yc); j = 4; }
        if (showCf && placed >= vals.length && cfOrder(i, C.length) < cfShown) {
          ctx.font = "700 " + fs + "px " + c.font; ctx.fillStyle = c.path; ctx.fillText(CF[i], (xs[j] + xs[j + 1]) / 2, yc);
          var prev = s.cf === "more" ? i + 1 : i - 1;
          if (prev >= 0 && prev < C.length && !narrow) { ctx.font = (narrow ? 9 : 10) + "px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "left"; ctx.fillText("= " + CF[prev] + " + " + F[i], (xs[j] + xs[j + 1]) / 2 + 16, yc); ctx.textAlign = "center"; }
        }
        ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx + twid, y); ctx.stroke();
      });
      var yT = top + rh * (C.length + 1);
      ctx.strokeStyle = c.ink; ctx.beginPath(); ctx.moveTo(tx, yT); ctx.lineTo(tx + twid, yT); ctx.stroke();
      ctx.font = "700 " + fs + "px " + c.font; ctx.fillStyle = c.ink; ctx.textAlign = "center";
      ctx.fillText("Total", (xs[0] + xs[1]) / 2, yT + rh / 2);
      ctx.fillStyle = c.vx; ctx.fillText("N = " + F.reduce(function (a, b) { return a + b; }, 0), (xs[2] + xs[3]) / 2, yT + rh / 2);
      ctx.strokeStyle = c.line; for (var q = 1; q < xs.length - 1; q++) { ctx.beginPath(); ctx.moveTo(xs[q], top); ctx.lineTo(xs[q], yT + rh); ctx.stroke(); }
      ctx.strokeRect(tx, top, twid, yT + rh - top);
      // the value in flight
      if (phase === 1 && placed < vals.length) {
        var v = vals[placed], ri = C.findIndex(function (cl) { return cl.test(v); });
        var a = tiles[placed], b = [xs[1] + 10 + Math.floor(F[ri] / 5) * 27 + (F[ri] % 5) * 5, top + rh * (ri + 1) + rh / 2];
        var e = frac < 0.5 ? 2 * frac * frac : 1 - Math.pow(-2 * frac + 2, 2) / 2;
        var px = a[0] + (b[0] - a[0]) * e, py = a[1] + (b[1] - a[1]) * e - Math.sin(Math.PI * e) * 30;
        ctx.fillStyle = c.vy; ctx.beginPath(); ctx.arc(px, py, narrow ? 12 : 14, 0, 7); ctx.fill();
        ctx.fillStyle = c.surface; ctx.font = "700 " + fs + "px " + c.font; ctx.textAlign = "center"; ctx.fillText(v, px, py + 0.5);
      }
    };

    k.canvas.addEventListener("pointerdown", function (e) {
      if (!rowsGeo) return;
      var r = k.canvas.getBoundingClientRect(), i = Math.floor((e.clientY - r.top - rowsGeo.top) / rowsGeo.rh);
      if (i >= 0 && i < rowsGeo.n) { s.sel = i; update(); }
    });
    k.canvas.style.cursor = "pointer";

    var clock = K.clock(function (dt) {
      if (phase === 1) {
        frac += dt / 0.3;
        if (frac >= 1) { frac = 0; placed++; if (placed >= vals.length) { phase = s.cf === "none" ? 0 : 2; cfShown = 0; } update(); }
        else k.redraw();
        return phase !== 0;
      }
      if (phase === 2) {
        frac += dt / 0.5;
        if (frac >= 1) { frac = 0; cfShown++; update(); if (cfShown >= classes().length) { phase = 0; return false; } }
        return true;
      }
      return false;
    });
    function finish() { clock.stop(); phase = 0; frac = 0; placed = vals.length; cfShown = 99; }
    function play() {
      clock.stop();
      if (reduce) { finish(); update(); return; }
      if (placed >= vals.length) placed = 0;
      phase = 1; frac = 0; cfShown = 0; update(); clock.start();
    }
    function load() { D = DATA[s.data]; vals = (s.values || D.values).slice(); }
    var showD = k.bindChips("data", function () { return s.data; }, function (v) { s.data = v; s.values = null; load(); s.grouped = D.grouped; s.sel = 0; finish(); showAll(); update(); });
    var showG = k.bindChips("grouped", function () { return s.grouped ? "1" : "0"; }, function (v) { s.grouped = v === "1"; s.sel = 0; finish(); update(); });
    var showW = k.bindChips("width", function () { return String(s.width); }, function (v) { s.width = +v; s.sel = 0; finish(); update(); });
    var showF = k.bindChips("form", function () { return s.form; }, function (v) { s.form = v; finish(); update(); });
    var showC = k.bindChips("cf", function () { return s.cf; }, function (v) {
      s.cf = v; clock.stop();
      if (placed >= vals.length && v !== "none" && !reduce) { phase = 2; frac = 0; cfShown = 0; update(); clock.start(); } else { cfShown = 99; update(); }
    });
    function showAll() { showD(); showG(); showW(); showF(); showC(); }
    k.onAct({
      play: play,
      one: function () { clock.stop(); phase = 0; if (placed >= vals.length) return; placed++; if (placed >= vals.length) cfShown = 99; update(); },
      reset: function () { clock.stop(); phase = 0; placed = 0; cfShown = 0; update(); }
    });
    update();
    return {
      set: function (o) {
        var dataChanged = o.data && o.data !== s.data;
        Object.assign(s, o);
        if (dataChanged || o.values) { load(); if (!("grouped" in o)) s.grouped = D.grouped; }
        if (!("sel" in o)) s.sel = 0;
        finish(); showAll(); update();
      },
      play: play, seek: function () { finish(); update(); },
      state: function () { var C = classes(), F = freqs(C, placed); return { s: s, classes: C.map(function (c) { return c.label; }), f: F, cf: cumul(F) }; }
    };
  }
  window.StatsFreqSim = { mount: mount };
})();
