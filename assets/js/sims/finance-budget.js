/*
 * Savings and investment, two views:
 *   budget – a month's income as one long bar split into expenses and savings. Drag the handles
 *            (or use the sliders); savings = income − expenditure, in rupees and as a percentage.
 *   grow   – a sum invested for n years: simple interest vs compound interest, and (optionally)
 *            a few possible paths of an investment in shares, to show risk.
 * Needs sim-kit.js.  FinanceBudgetSim.mount(el, { mode: "budget", income: 30000, food: 30, house: 25, edu: 15, other: 15 })
 */
(function () {
  "use strict";
  var K = window.SimKit;
  var CATS = [["food", "Food"], ["house", "House rent and bills"], ["edu", "Education"], ["other", "Other expenses"]];

  function inr(n, keepPaise) {
    var neg = n < 0; n = Math.abs(n);
    var r = Math.round(n * 100) / 100, ip = Math.floor(r + 1e-9), p = Math.round((r - ip) * 100);
    var s = String(ip), last = s.slice(-3), rest = s.slice(0, -3);
    if (rest) last = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last;
    if (p || keepPaise) last += "." + (p < 10 ? "0" : "") + p;
    return (neg ? "−" : "") + "₹" + last;
  }
  function pct(x) { var r = Math.round(x * 100) / 100; return (Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : String(r)) + "%"; }

  function fitAspect(stage, wide, narrow) {
    var mq = window.matchMedia("(max-width: 760px)");
    function ap() { stage.style.aspectRatio = mq.matches ? narrow : wide; }
    ap(); if (mq.addEventListener) mq.addEventListener("change", ap);
  }

  // small seeded random numbers so "New paths" can be repeated exactly
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "fb";
    var s = Object.assign({ mode: "budget", income: 30000, food: 30, house: 25, edu: 15, other: 15,
      P: 10000, r: 10, n: 5, si: true, ci: true, shares: false, seed: 7 }, opts);
    var anim = 1, drag = -1, geo = null;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "A month's income split into expenses and savings, or the growth of an investment over the years",
      panel: K.chips("mode", "Show", [["budget", "Monthly budget"], ["grow", "Growth of an investment"]]) +
        '<div data-for="budget">' + K.slider(id, "income", "Monthly income", 5000, 100000, 500, "") +
        CATS.map(function (c) { return K.slider(id, c[0], c[1], 0, 80, 1, "%"); }).join("") + '</div>' +
        '<div data-for="grow">' + K.slider(id, "P", "Amount invested, P", 1000, 100000, 1000, "") + K.slider(id, "r", "Rate of interest, R (per year)", 1, 15, 0.5, "%") +
        K.slider(id, "n", "Number of years, N", 1, 10, 1, "") +
        '<div class="checks">' + K.check(id, "si", "Simple interest", s.si) + K.check(id, "ci", "Compound interest", s.ci) + K.check(id, "shares", "Shares (possible paths)", s.shares) + '</div>' +
        K.buttons([["play", "Grow it"], ["paths", "New paths"]]) + '</div>' +
        K.hint("note"),
      readouts: [["r1", "–"], ["r2", "–"], ["r3", "–"], ["r4", "–"], ["r5", "–"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var stage = root.querySelector(".sim-stage");
    fitAspect(stage, "16 / 10", "4 / 3.9");
    var spans = root.querySelectorAll(".sim-readout span");
    var LAB = {
      budget: ["Income", "Expenditure", "Savings", "Savings as % of income", "Savings in a year", "Largest expense"],
      grow: ["Amount invested, P", "Amount with simple interest", "Amount with compound interest", "Extra from compounding", "Gain % with compound interest", "Shares after N years (5 paths)"]
    };

    function spent() { return s.food + s.house + s.edu + s.other; }
    function save() { return 100 - spent(); }
    function money(p) { return s.income * p / 100; }
    function siAmt(t) { return s.P * (1 + s.r * t / 100); }
    function ciAmt(t) { return s.P * Math.pow(1 + s.r / 100, t); }
    function paths() {   // five possible share paths, yearly values; illustration only
      var R = rng(s.seed * 7919 + 13), out = [];
      for (var j = 0; j < 5; j++) {
        var v = [s.P];
        for (var y = 1; y <= 10; y++) {
          var g = 0; for (var q = 0; q < 4; q++) g += R(); g = (g - 2) / 0.577;   // roughly normal
          var ret = (s.r + 4) / 100 + 0.2 * g;
          v.push(Math.max(0, v[y - 1] * (1 + Math.max(-0.6, ret))));
        }
        out.push(v);
      }
      return out;
    }

    function update() {
      LAB[s.mode].forEach(function (t, i) { spans[i].textContent = t; });
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for === s.mode ? "" : "none"; });
      var note = "", cl = s.mode === "budget" ? ["", "", "var(--good)", "var(--good)", "", ""] : ["", "var(--vx)", "var(--path)", "", "var(--path)", "var(--vy)"];
      root.querySelectorAll(".sim-readout b").forEach(function (e, i) { e.className = i === 5 ? "wrap" : ""; e.style.color = cl[i]; e.style.fontWeight = cl[i] ? "700" : ""; });
      if (s.mode === "budget") {
        var exp = money(spent()), sv = money(save());
        var big = CATS.slice().sort(function (a, b) { return s[b[0]] - s[a[0]]; })[0];
        k.set("r1", inr(s.income)); k.set("r2", inr(exp)); k.set("r3", inr(sv)); k.set("r4", pct(save()));
        k.set("r5", inr(sv * 12)); k.set("r6", big[1] + ", " + s[big[0]] + "%");
        note = save() <= 0 ? "Nothing is left to save. Spending equals income; cut an expense to make room for savings."
          : "Savings = Income − Expenditure = " + inr(s.income) + " − " + inr(exp) + " = " + inr(sv) + ". That is " + pct(save()) + " of the income.";
      } else {
        var A1 = siAmt(s.n), A2 = ciAmt(s.n);
        k.set("r1", inr(s.P)); k.set("r2", inr(A1, true)); k.set("r3", inr(A2, true)); k.set("r4", inr(A2 - A1, true));
        k.set("r5", pct((A2 - s.P) / s.P * 100));
        if (s.shares) { var ps = paths().map(function (v) { return v[s.n]; }); k.set("r6", inr(Math.round(Math.min.apply(null, ps))) + " to " + inr(Math.round(Math.max.apply(null, ps)))); }
        else k.set("r6", "–");
        note = "Simple interest is worked out on P every year. Compound interest is worked out on the amount at the start of each year, so it earns interest on interest: A = P(1 + R/100)ᴺ." +
          (s.shares ? " The share paths are an illustration: share prices go up and down, so the result is not fixed. Higher possible return comes with higher risk." : "");
      }
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    var COLS = function (c) { return [c.vx, c.path, c.vy, c.muted, c.good]; };

    function drawBudget(ctx, W, H, c) {
      var narrow = W < 520, x0 = 14, x1 = W - 14, bw = x1 - x0, by = narrow ? 44 : 52, bh = narrow ? 48 : 60;
      var parts = CATS.map(function (q) { return s[q[0]]; }).concat([Math.max(0, save())]), cols = COLS(c);
      ctx.font = "700 " + (narrow ? 13 : 15) + "px " + c.font; ctx.fillStyle = c.ink; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("Monthly income " + inr(s.income) + " = 100%", x0, 12);
      var x = x0, bounds = [];
      parts.forEach(function (p, i) {
        var w = bw * p / 100;
        ctx.fillStyle = cols[i]; ctx.globalAlpha = i === 4 ? 0.9 : 0.8; ctx.fillRect(x, by, w, bh); ctx.globalAlpha = 1;
        if (w > 30) { ctx.fillStyle = c.surface; ctx.font = "700 " + (narrow ? 11 : 13) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(p + "%", x + w / 2, by + bh / 2); }
        x += w; bounds.push(x);
      });
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.strokeRect(x0, by, bw, bh);
      // brace for expenditure and savings
      var ex = x0 + bw * Math.min(100, spent()) / 100;
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1.2; ctx.fillStyle = c.muted; ctx.font = (narrow ? 10 : 12) + "px " + c.font; ctx.textBaseline = "top";
      function brace(a, b, txt, col) {
        if (b - a < 4) return; var y = by + bh + 6;
        ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(a + 1, y); ctx.lineTo(a + 1, y + 6); ctx.lineTo(b - 1, y + 6); ctx.lineTo(b - 1, y); ctx.stroke();
        ctx.fillStyle = col; ctx.textAlign = "center"; var tx = Math.max(x0 + ctx.measureText(txt).width / 2, Math.min(x1 - ctx.measureText(txt).width / 2, (a + b) / 2)); ctx.fillText(txt, tx, y + 10);
      }
      brace(x0, ex, "Expenditure " + inr(money(spent())), c.ink);
      if (save() > 0) brace(ex, x1, (bw * save() / 100 > 120 ? "Savings " : "") + inr(money(save())), c.good);
      // handles
      geo = { x0: x0, bw: bw, by: by, bh: bh };
      for (var i = 0; i < 4; i++) {
        var hx = bounds[i];
        ctx.fillStyle = c.surface; ctx.strokeStyle = c.ink; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(hx - 5, by - 8, 10, bh + 16, 4) : ctx.rect(hx - 5, by - 8, 10, bh + 16); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx - 1.5, by + bh / 2 - 6); ctx.lineTo(hx - 1.5, by + bh / 2 + 6); ctx.moveTo(hx + 1.5, by + bh / 2 - 6); ctx.lineTo(hx + 1.5, by + bh / 2 + 6); ctx.stroke();
      }
      // the table of parts
      var ty = by + bh + (narrow ? 44 : 50), rh = Math.max(22, Math.min(narrow ? 30 : 36, (H - ty - 16) / 6.3)), names = CATS.map(function (q) { return q[1]; }).concat(["Savings"]);
      ctx.textBaseline = "middle";
      names.forEach(function (nm, i) {
        var y = ty + i * rh;
        ctx.fillStyle = cols[i]; ctx.globalAlpha = 0.85; ctx.fillRect(x0, y - 7, 14, 14); ctx.globalAlpha = 1;
        ctx.fillStyle = i === 4 ? c.good : c.ink; ctx.font = (i === 4 ? "700 " : "") + (narrow ? 12 : 14) + "px " + c.font; ctx.textAlign = "left";
        ctx.fillText(nm, x0 + 22, y);
        ctx.textAlign = "right"; ctx.fillText(parts[i] + "%", x0 + bw * (narrow ? 0.66 : 0.6), y);
        ctx.fillText(inr(money(parts[i])), x1, y);
      });
      var ly = ty + 5 * rh + 2;
      ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(x0, ly - rh / 2 + 4); ctx.lineTo(x1, ly - rh / 2 + 4); ctx.stroke();
      ctx.font = "700 " + (narrow ? 12 : 14) + "px " + c.font; ctx.fillStyle = c.ink; ctx.textAlign = "left"; ctx.fillText("Total", x0 + 22, ly + 4);
      ctx.textAlign = "right"; ctx.fillText("100%", x0 + bw * (narrow ? 0.66 : 0.6), ly + 4); ctx.fillText(inr(s.income), x1, ly + 4);
    }

    function drawGrow(ctx, W, H, c) {
      var narrow = W < 520, padL = narrow ? 62 : 74, gx = padL, gy = 30, gw = W - padL - (narrow ? 60 : 132), gh = H - gy - 40;
      var ps = s.shares ? paths() : [];
      var top = Math.max(siAmt(s.n), ciAmt(s.n));
      ps.forEach(function (v) { for (var y = 0; y <= s.n; y++) top = Math.max(top, v[y]); });
      var st = K.niceStep(top, 5), ymax = Math.ceil(top / st) * st;
      var X = function (t) { return gx + t / s.n * gw; }, Y = function (v) { return gy + gh - v / ymax * gh; };
      ctx.font = (narrow ? 10 : 11) + "px " + c.font; ctx.lineWidth = 1;
      ctx.strokeStyle = c.grid; ctx.fillStyle = c.muted; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (var v = 0; v <= ymax + 1e-6; v += st) { ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke(); ctx.fillText(inr(v), gx - 5, Y(v)); }
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (var t = 0; t <= s.n; t++) { ctx.beginPath(); ctx.moveTo(X(t), gy); ctx.lineTo(X(t), gy + gh); ctx.stroke(); ctx.fillText(t, X(t), gy + gh + 4); }
      ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.textAlign = "right"; ctx.fillText("years", gx + gw, gy + gh + 18);
      ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText("Amount (₹)", 4, gy - 10);
      var T = anim * s.n, ends = [];
      function line(f, col, w, dash, dots) {
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.lineJoin = "round"; ctx.beginPath();
        var steps = 60;
        for (var i = 0; i <= steps; i++) { var tt = T * i / steps; if (i === 0) ctx.moveTo(X(tt), Y(f(tt))); else ctx.lineTo(X(tt), Y(f(tt))); }
        ctx.stroke(); ctx.restore();
        if (dots) for (var y = 0; y <= Math.floor(T + 1e-9); y++) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(y), Y(f(y)), 3.5, 0, 7); ctx.fill(); }
      }
      ps.forEach(function (pv) {
        var f = function (tt) { var i = Math.min(Math.floor(tt), s.n - 1), fr = tt - i; return pv[i] + (pv[i + 1] - pv[i]) * fr; };
        ctx.save(); ctx.globalAlpha = 0.55; line(f, c.vy, 1.6, [], false); ctx.restore();
        if (anim >= 1) ends.push([pv[s.n], c.vy, "", 1]);
      });
      if (s.si) { line(siAmt, c.vx, 2.5, [6, 4], true); if (anim >= 1) ends.push([siAmt(s.n), c.vx, "Simple", 2]); }
      if (s.ci) { line(ciAmt, c.path, 3, [], true); if (anim >= 1) ends.push([ciAmt(s.n), c.path, "Compound", 3]); }
      // P line
      ctx.save(); ctx.setLineDash([2, 4]); ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(gx, Y(s.P)); ctx.lineTo(gx + gw, Y(s.P)); ctx.stroke(); ctx.restore();
      // end labels, pushed apart so they never overlap
      var labs = ends.filter(function (e) { return e[2]; }).sort(function (a, b) { return Y(a[0]) - Y(b[0]); }), lastY = -1e9;
      ctx.font = "700 " + (narrow ? 10 : 12) + "px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      labs.forEach(function (e) { var y = Math.max(Y(e[0]), lastY + 14); lastY = y; ctx.fillStyle = e[1]; ctx.fillText(narrow ? e[2] : e[2] + " " + inr(Math.round(e[0])), X(s.n) + 6, y); });
      if (s.shares && anim >= 1) { ctx.fillStyle = c.vy; ctx.font = (narrow ? 10 : 11) + "px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText("thin lines: shares, an illustration only", gx + 4, gy + 2); }
    }

    k.draw = function (ctx, W, H, c) { if (s.mode === "budget") drawBudget(ctx, W, H, c); else drawGrow(ctx, W, H, c); };

    // dragging the budget handles
    function pos(e) { var r = k.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    k.canvas.addEventListener("pointerdown", function (e) {
      if (s.mode !== "budget" || !geo) return;
      var p = pos(e), cum = 0, best = -1, bd = 22;
      if (p[1] < geo.by - 20 || p[1] > geo.by + geo.bh + 20) return;
      for (var i = 0; i < 4; i++) { cum += s[CATS[i][0]]; var d = Math.abs(geo.x0 + geo.bw * cum / 100 - p[0]); if (d < bd) { bd = d; best = i; } }
      if (best < 0) return;
      drag = best; k.canvas.setPointerCapture(e.pointerId);
    });
    k.canvas.addEventListener("pointermove", function (e) {
      if (drag < 0) return;
      var p = pos(e), v = Math.round((p[0] - geo.x0) / geo.bw * 100), before = 0;
      for (var i = 0; i < drag; i++) before += s[CATS[i][0]];
      var key = CATS[drag][0], after = drag < 3 ? s[CATS[drag + 1][0]] : save(), lo = before, hi = before + s[key] + after;
      v = Math.max(lo, Math.min(hi, v));
      var nv = v - before, diff = nv - s[key];
      s[key] = nv; if (drag < 3) s[CATS[drag + 1][0]] -= diff;
      showAll(); update();
    });
    k.canvas.addEventListener("pointerup", function () { drag = -1; });

    var clock = K.clock(function (dt) { anim = Math.min(1, anim + dt / 2.2); update(); return anim < 1; });
    var shows = [];
    shows.push(k.bindSlider("income", function () { return s.income; }, function (v) { s.income = v; update(); }, function (v) { return inr(v); }));
    CATS.forEach(function (q) {
      shows.push(k.bindSlider(q[0], function () { return s[q[0]]; }, function (v) {
        var others = spent() - s[q[0]]; s[q[0]] = Math.min(v, 100 - others); showAll(); update();
      }, function (v) { return v + "%"; }));
    });
    shows.push(k.bindSlider("P", function () { return s.P; }, function (v) { s.P = v; update(); }, function (v) { return inr(v); }));
    shows.push(k.bindSlider("r", function () { return s.r; }, function (v) { s.r = v; update(); }, function (v) { return v + "%"; }));
    shows.push(k.bindSlider("n", function () { return s.n; }, function (v) { s.n = v; update(); }, function (v) { return v + (v === 1 ? " year" : " years"); }));
    var boxes = ["si", "ci", "shares"].map(function (q) { return k.bindCheck(q, function (on) { s[q] = on; update(); }); });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; anim = 1; update(); });
    function showAll() { shows.forEach(function (f) { f(); }); boxes.forEach(function (b, i) { b.checked = s[["si", "ci", "shares"][i]]; }); showM(); }
    function play() { if (s.mode !== "grow") return; clock.stop(); if (reduce) { anim = 1; update(); return; } anim = 0; clock.start(); }
    k.onAct({ play: play, paths: function () { s.seed = (s.seed * 31 + 11) % 9973; s.shares = true; showAll(); update(); } });
    update();
    return {
      set: function (o) { clock.stop(); anim = 1; Object.assign(s, o); showAll(); update(); },
      play: play, seek: function (t) { clock.stop(); anim = t; update(); },
      state: function () { return { s: s, saving: money(save()), si: siAmt(s.n), ci: ciAmt(s.n) }; }
    };
  }
  window.FinanceBudgetSim = { mount: mount };
})();
