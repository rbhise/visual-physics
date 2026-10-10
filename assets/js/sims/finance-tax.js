/*
 * Income tax with the slab rates used in the Std 9 textbook (financial year 2017–18).
 * Total income − deductions (Section 80C, at most ₹1,50,000; donations under 80G) = taxable income.
 * The taxable income fills the slab ruler; each slab adds its own tax; then education cess 2% and
 * secondary and higher education cess 1% of the income tax.
 * Needs sim-kit.js.  FinanceTaxSim.mount(el, { age: "u60", income: 960000, c80: 170000, don: 10000 })
 */
(function () {
  "use strict";
  var K = window.SimKit, INF = Infinity;
  var SLABS = {
    u60: [[0, 250000, 0], [250000, 500000, 5], [500000, 1000000, 20], [1000000, INF, 30]],
    s60: [[0, 300000, 0], [300000, 500000, 5], [500000, 1000000, 20], [1000000, INF, 30]],
    s80: [[0, 500000, 0], [500000, 1000000, 20], [1000000, INF, 30]]
  };
  var AGE = { u60: "below 60 years", s60: "60 to 80 years", s80: "above 80 years" };
  var CAP80C = 150000;

  function inr(n, keepPaise) {
    var neg = n < 0; n = Math.abs(n);
    var r = Math.round(n * 100) / 100, ip = Math.floor(r + 1e-9), p = Math.round((r - ip) * 100);
    var s = String(ip), last = s.slice(-3), rest = s.slice(0, -3);
    if (rest) last = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last;
    if (p || keepPaise) last += "." + (p < 10 ? "0" : "") + p;
    return (neg ? "−" : "") + "₹" + last;
  }
  function fitAspect(stage, wide, narrow) {
    var mq = window.matchMedia("(max-width: 760px)");
    function ap() { stage.style.aspectRatio = mq.matches ? narrow : wide; }
    ap(); if (mq.addEventListener) mq.addEventListener("change", ap);
  }

  // the tax for a taxable income: pieces per slab, fixed part and the slab it falls in
  function compute(age, ti) {
    var sl = SLABS[age], pieces = [], tax = 0, at = 0;
    sl.forEach(function (b, i) {
      var amt = Math.max(0, Math.min(ti, b[1]) - b[0]), t = amt * b[2] / 100;
      if (ti > b[0]) at = i;
      pieces.push({ lo: b[0], hi: b[1], rate: b[2], amt: amt, tax: t });
      tax += t;
    });
    var fixed = 0; for (var i = 0; i < at; i++) fixed += pieces[i].tax;
    tax = Math.round(tax * 100) / 100;
    var e = Math.round(tax * 2) / 100, h = Math.round(tax) / 100;
    return { pieces: pieces, at: at, fixed: fixed, tax: tax, edu: e, she: h, total: Math.round((tax + e + h) * 100) / 100 };
  }
  function range(b) { return b.lo === 0 ? "Up to " + inr(b.hi) : b.hi === INF ? "Above " + inr(b.lo) : inr(b.lo + 1) + " to " + inr(b.hi); }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "tx";
    var s = Object.assign({ age: "u60", income: 960000, c80: 170000, don: 10000 }, opts);
    var T = 2;   // animation time: 0–1 fills the ruler, then cess, then total
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "Taxable income filling the income tax slabs, with the tax from each slab and the cess added at the end",
      panel: K.chips("age", "Age of the taxpayer", [["u60", "Below 60"], ["s60", "60 to 80"], ["s80", "Above 80"]]) +
        K.slider(id, "income", "Total yearly income", 0, 2000000, 1000, "") +
        K.slider(id, "c80", "Savings under 80C", 0, 300000, 1000, "") +
        K.slider(id, "don", "Donations under 80G", 0, 100000, 1000, "") +
        K.buttons([["play", "Fill the slabs"]]) + K.hint("note"),
      readouts: [["ti", "Taxable income", "c-path"], ["slab", "Slab", "wrap"], ["tax", "Income tax"],
                 ["edu", "Education cess (2%)"], ["she", "Sec. & higher edu. cess (1%)"], ["tot", "Total tax payable", "c-vy"]],
      cols: 3
    });
    fitAspect(root.querySelector(".sim-stage"), "16 / 10", "4 / 4.4");
    var steps = document.createElement("ol"); steps.className = "steps-list"; steps.setAttribute("aria-live", "polite");
    root.querySelector(".sim-body").appendChild(steps);

    function ded80c() { return Math.min(s.c80, CAP80C); }
    function taxable() { return Math.max(0, s.income - ded80c() - s.don); }

    function update() {
      var ti = taxable(), R = compute(s.age, ti), b = R.pieces[R.at];
      k.set("ti", inr(ti)); k.set("slab", range(b) + (b.rate ? " (" + b.rate + "%)" : " (nil)"));
      k.set("tax", inr(R.tax)); k.set("edu", inr(R.edu)); k.set("she", inr(R.she)); k.set("tot", inr(R.total));
      var L = [];
      L.push("Total income = " + inr(s.income));
      var d = [];
      if (s.c80) d.push("80C " + inr(ded80c()) + (s.c80 > CAP80C ? " (you saved " + inr(s.c80) + ", but at most ₹1,50,000 is allowed)" : ""));
      if (s.don) d.push("donation " + inr(s.don));
      L.push(d.length ? "Deductions: " + d.join(" + ") + (d.length > 1 ? " = " + inr(ded80c() + s.don) : "") : "Deductions: none");
      L.push("Taxable income = " + (ded80c() + s.don ? inr(s.income) + " − " + inr(ded80c() + s.don) + " = " : "") + inr(ti));
      if (R.tax === 0) {
        L.push("Age " + AGE[s.age] + ": income up to " + inr(R.pieces[0].hi) + " has no income tax.");
        L.push("Total tax payable = ₹0");
      } else {
        var head = "Age " + AGE[s.age] + ", slab " + range(b).replace(/^(Up|Above)/, function (w) { return w.toLowerCase(); }) + ": Income tax = ";
        var over = inr(ti) + " − " + inr(b.lo);
        L.push(head + (R.fixed ? inr(R.fixed) + " + " : "") + b.rate + "% of (" + over + ")" +
          " = " + (R.fixed ? inr(R.fixed) + " + " : "") + inr(b.tax) + (R.fixed ? " = " + inr(R.tax) : ""));
        L.push("Education cess = 2% of " + inr(R.tax) + " = " + inr(R.edu) + "; secondary and higher education cess = 1% of " + inr(R.tax) + " = " + inr(R.she));
        L.push("Total tax payable = " + inr(R.tax) + " + " + inr(R.edu) + " + " + inr(R.she) + " = " + inr(R.total));
      }
      steps.innerHTML = L.map(function (t, i) { return "<li" + (i === L.length - 1 ? ' class="final"' : "") + ">" + t + "</li>"; }).join("");
      k.el('[data-r="note"]').textContent = s.c80 > CAP80C
        ? "Only ₹1,50,000 of the 80C savings can be deducted, however much more is saved."
        : R.tax === 0 ? "The taxable income stays inside the nil slab, so no income tax is due."
        : "Each slab is taxed only on the part of the income inside it. Cess is a percentage of the income tax, not of the income.";
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var narrow = W < 520, ti = taxable(), R = compute(s.age, ti);
      var fill = ti * Math.min(1, T);
      var max = Math.max(1200000, Math.ceil(ti / 100000) * 100000 + 100000);
      var x0 = 14, x1 = W - 14, rw = x1 - x0, X = function (v) { return x0 + Math.min(v, max) / max * rw; };
      var cols = { 0: c.muted, 5: c.vx, 20: c.path, 30: c.vy };
      var fs = narrow ? 11 : 13;
      ctx.font = "700 " + (narrow ? 13 : 15) + "px " + c.font; ctx.fillStyle = c.ink; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("Taxable income " + inr(ti), x0, 10);
      ctx.font = fs + "px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "right";
      ctx.fillText("age " + AGE[s.age], x1, narrow ? 12 : 12);
      var ry = 40, rh = narrow ? 34 : 40;
      R.pieces.forEach(function (b) {
        var a = X(b.lo), e = X(Math.min(b.hi, max)), col = cols[b.rate];
        ctx.fillStyle = col; ctx.globalAlpha = 0.12; ctx.fillRect(a, ry, e - a, rh); ctx.globalAlpha = 1;
        var f = Math.max(0, Math.min(fill, b.hi) - b.lo);
        if (f > 0) { ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fillRect(a, ry, X(b.lo + f) - a, rh); ctx.globalAlpha = 1; }
        ctx.fillStyle = f > 0 && X(b.lo + f) - a > 34 ? c.surface : col; ctx.font = "700 " + fs + "px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(b.rate ? b.rate + "%" : "Nil", a + 5, ry + rh / 2);
        ctx.strokeStyle = c.ink; ctx.lineWidth = 1; ctx.strokeRect(a, ry, e - a, rh);
      });
      // boundary labels in lakh-style rupees
      ctx.fillStyle = c.muted; ctx.font = (narrow ? 9 : 11) + "px " + c.font; ctx.textBaseline = "top"; ctx.textAlign = "center";
      var lastR = -1e9, alt = 0;
      R.pieces.forEach(function (b, i) {
        if (i === 0) return;
        var t = inr(b.lo).slice(1), w = ctx.measureText(t).width, x = X(b.lo);
        alt = x - w / 2 < lastR + 4 ? 1 - alt : 0; lastR = x + w / 2;
        ctx.strokeStyle = c.muted; ctx.beginPath(); ctx.moveTo(x, ry + rh); ctx.lineTo(x, ry + rh + 3 + alt * 12); ctx.stroke();
        ctx.fillText(t, x, ry + rh + 3 + alt * 12);
      });
      // marker for the income
      var mx = X(fill);
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.moveTo(mx, ry - 1); ctx.lineTo(mx - 6, ry - 10); ctx.lineTo(mx + 6, ry - 10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, ry); ctx.lineTo(mx, ry + rh); ctx.stroke();

      // the tax from each slab
      var y = ry + rh + (narrow ? 34 : 40), lh = Math.max(20, Math.min(30, (H - y - 24) / 9)), total = Math.max(1, R.total);
      fs = narrow ? 11 : lh >= 27 ? 14 : 13;
      ctx.textBaseline = "middle";
      function row(sw, left, mid, right, bold, col) {
        if (sw) { ctx.fillStyle = sw; ctx.globalAlpha = 0.85; ctx.fillRect(x0, y - 6, 12, 12); ctx.globalAlpha = 1; }
        ctx.font = (bold ? "700 " : "") + fs + "px " + c.font; ctx.fillStyle = col || c.ink; ctx.textAlign = "left";
        ctx.fillText(left, x0 + (sw ? 18 : 0), y);
        if (mid) { ctx.fillText(mid, narrow ? x0 + 18 : x0 + rw * 0.4, narrow ? y : y); }
        ctx.textAlign = "right"; ctx.fillText(right, x1, y);
        y += lh;
      }
      R.pieces.forEach(function (b) {
        if (fill <= b.lo && !(b.lo === 0)) return;
        var f = Math.max(0, Math.min(fill, b.hi) - b.lo), t = f * b.rate / 100;
        if (narrow) row(cols[b.rate], b.rate ? b.rate + "% × " + inr(f) : "Nil on " + inr(f), "", b.rate ? "= " + inr(t) : "₹0");
        else row(cols[b.rate], range(b), b.rate ? b.rate + "% × " + inr(f) : "Nil", "= " + inr(t));
      });
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y - lh / 2); ctx.lineTo(x1, y - lh / 2); ctx.stroke();
      if (T >= 1) row(null, "Income tax", "", inr(R.tax), true, c.ink);
      if (T >= 1.25) { row(null, "+ Education cess, 2% of tax", "", inr(R.edu), false, c.muted); row(null, narrow ? "+ Sec. & higher edu. cess, 1%" : "+ Secondary and higher education cess, 1% of tax", "", inr(R.she), false, c.muted); }
      if (T >= 1.5) {
        ctx.fillStyle = c.tint; ctx.fillRect(x0 - 4, y - lh / 2 + 1, rw + 8, lh);
        row(null, "Total tax payable", "", inr(R.total), true, c.vy);
        // a bar: how the total is made up
        if (R.total > 0 && y + 18 < H) {
          var bx = x0, by = y - 4, bw = rw;
          R.pieces.forEach(function (b) { if (b.tax > 0) { var w = bw * b.tax / total; ctx.fillStyle = cols[b.rate]; ctx.globalAlpha = 0.85; ctx.fillRect(bx, by, w, 10); ctx.globalAlpha = 1; bx += w; } });
          ctx.fillStyle = c.ink; ctx.fillRect(bx, by, bw * (R.edu + R.she) / total, 10);
        }
      }
    };

    var clock = K.clock(function (dt) { T = Math.min(1.6, T + dt / 2); k.redraw(); return T < 1.6; });
    var shows = [
      k.bindSlider("income", function () { return s.income; }, function (v) { s.income = v; T = 2; update(); }, function (v) { return inr(v); }),
      k.bindSlider("c80", function () { return s.c80; }, function (v) { s.c80 = v; T = 2; update(); }, function (v) { return inr(v); }),
      k.bindSlider("don", function () { return s.don; }, function (v) { s.don = v; T = 2; update(); }, function (v) { return inr(v); })
    ];
    var showA = k.bindChips("age", function () { return s.age; }, function (v) { s.age = v; T = 2; update(); });
    function play() { clock.stop(); if (reduce) { T = 2; k.redraw(); return; } T = 0; clock.start(); }
    k.onAct({ play: play });
    update();
    return {
      set: function (o) { clock.stop(); T = 2; Object.assign(s, o); shows.forEach(function (f) { f(); }); showA(); update(); },
      play: play, seek: function (t) { clock.stop(); T = t; k.redraw(); },
      state: function () { var R = compute(s.age, taxable()); return { s: s, taxable: taxable(), tax: R.tax, edu: R.edu, she: R.she, total: R.total }; }
    };
  }
  window.FinanceTaxSim = { mount: mount, compute: compute };
})();
