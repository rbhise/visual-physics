/*
 * Rational numbers as decimals, two views:
 *   divide – long division of p by q, one digit at a time. Every remainder is marked on a "remainder wheel"
 *            with q places (0 … q − 1). When a remainder comes back, the digits repeat; if the remainder
 *            becomes 0, the decimal terminates. The prime factors of q (in lowest terms) decide which.
 *   back   – a recurring decimal turned into p/q: multiply x by a power of 10 so the repeating tails line up,
 *            then subtract.
 * Needs sim-kit.js and math-kit.js.  RealDecimalSim.mount(el, { mode: "divide", p: 1, q: 6 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit;
  var LABELS = {
    divide: ["In lowest terms", "Denominator q", "Type of decimal", "Decimal form", "Repeating block", "Why"],
    back:   ["Recurring decimal", "Multiply x by", "Subtract", "x as a fraction", "Lowest terms", "Check"]
  };
  var PRESETS = ["0.(7)", "0.(36)", "0.(72)", "0.1(6)", "0.58(3)", "2.(15)", "1.2(45)", "0.(285714)", "3.(0)"];

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a; }
  function factors(n) { var out = [], d = 2; while (n > 1 && d * d <= n) { while (n % d === 0) { out.push(d); n /= d; } d++; } if (n > 1) out.push(n); return out; }
  function factorText(n) {
    var f = factors(n), cnt = {}, order = [];
    f.forEach(function (p) { if (!cnt[p]) { cnt[p] = 0; order.push(p); } cnt[p]++; });
    var sup = { 1: "", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶" };
    return order.map(function (p) { return p + (sup[cnt[p]] != null ? sup[cnt[p]] : "^" + cnt[p]); }).join(" × ") || "1";
  }

  // long division of P by Q (lowest terms, P ≥ 0)
  function divide(P, Q) {
    var I = Math.floor(P / Q), r = P % Q, digits = [], rems = [r], seen = {}, start = -1;
    seen[r] = 0;
    while (r !== 0 && digits.length < 80) {
      var d = Math.floor(10 * r / Q), nr = (10 * r) % Q;
      digits.push(d); rems.push(nr);
      if (nr !== 0 && seen[nr] != null) { start = seen[nr]; break; }
      seen[nr] = digits.length; r = nr;
    }
    return { I: I, digits: digits, rems: rems, start: start, term: start < 0 };
  }

  // "1.2(45)" → { I: "1", pre: "2", rep: "45" }
  function parseDec(t) {
    var m = /^(\d+)\.(\d*)\((\d+)\)$/.exec(t);
    return m ? { I: m[1], pre: m[2], rep: m[3] } : { I: "0", pre: "", rep: "3" };
  }
  function over(t) { return '<i style="font-style:normal;text-decoration:overline">' + t + "</i>"; }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "rd";
    var s = Object.assign({ mode: "divide", p: 1, q: 6, dec: "0.(36)", shown: 99 }, opts);
    var clock = null, anim = 1;

    var k = K.frame(root, {
      aspect: "4 / 3",
      label: "Long division of a fraction, with each remainder marked on a wheel; the decimal repeats when a remainder comes back",
      panel: K.chips("mode", "Show", [["divide", "Fraction → decimal"], ["back", "Recurring decimal → p/q"]]) +
        '<div data-for="divide">' + K.slider(id, "p", "Numerator p", 1, 99, 1, "") + K.slider(id, "q", "Denominator q", 2, 40, 1, "") + '</div>' +
        '<div data-for="back"><label class="seg-label" for="' + id + '-dec">Recurring decimal</label><select class="sel" id="' + id + '-dec">' +
          PRESETS.map(function (p) { var d = parseDec(p); return '<option value="' + p + '">' + d.I + "." + d.pre + d.rep + d.rep + "… (" + d.rep + " repeats)</option>"; }).join("") + '</select></div>' +
        K.buttons([["play", "Divide step by step"]]) + K.hint("note"),
      readouts: [["r1", "–", "c-path"], ["r2", "–"], ["r3", "–", "wrap"], ["r4", "–", "c-vy"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");
    var steps = document.createElement("ol"); steps.className = "steps-list"; steps.setAttribute("aria-live", "polite");
    root.querySelector(".sim-body").appendChild(steps);
    var sel = k.el("#" + id + "-dec"), stage = k.el(".sim-stage");
    function fitAspect() { var a = root.clientWidth < 560 ? "1 / 1" : "4 / 3"; if (stage.style.aspectRatio !== a) stage.style.aspectRatio = a; }
    fitAspect(); window.addEventListener("resize", fitAspect);

    function info() {
      var g = gcd(s.p, s.q), P = s.p / g, Q = s.q / g, D = divide(P, Q);
      D.P = P; D.Q = Q; D.g = g;
      return D;
    }
    function decHTML(D, upto) {   // decimal with an overline on the repeating block
      var n = D.digits.length, show = Math.min(upto, n);
      if (n === 0) return String(D.I);
      if (D.term) return D.I + "." + D.digits.slice(0, show).join("") + (show < n ? "…" : "");
      if (show < n) return D.I + "." + D.digits.slice(0, show).join("") + "…";
      return D.I + "." + D.digits.slice(0, D.start).join("") + over(D.digits.slice(D.start).join(""));
    }
    // recurring decimal → fraction
    function back() {
      var d = parseDec(s.dec), n = d.pre.length, kk = d.rep.length;
      var big = Number(d.I + d.pre + d.rep), small = Number(d.I + d.pre);
      var num = big - small, den = Math.pow(10, n + kk) - Math.pow(10, n), g = gcd(num, den);
      return { d: d, n: n, k: kk, num: num, den: den, P: num / g, Q: den / g, hi: Math.pow(10, n + kk), lo: Math.pow(10, n) };
    }
    function tail(d, times) { var t = ""; for (var i = 0; i < times; i++) t += d.rep; return t; }
    function shifted(B, mult) {   // the decimal 'x' multiplied by mult (a power of 10), as text with "…"
      var d = B.d, digits = d.pre + tail(d, 4), sh = String(mult).length - 1;
      var ip = String(Number(d.I + digits.slice(0, sh))), fp = digits.slice(sh);
      return { ip: ip, fp: fp };
    }

    function update() {
      LABELS[s.mode].forEach(function (t, i) { spans[i].textContent = t; });
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for === s.mode ? "" : "none"; });
      k.btn("play").textContent = s.mode === "divide" ? "Divide step by step" : "Show the steps";
      var note = "", R4 = k.el('[data-r="r4"]');
      if (s.mode === "divide") {
        var D = info(), Q = D.Q, f = factorText(Q), only25 = factors(Q).every(function (p) { return p === 2 || p === 5; });
        k.set("r1", D.P + "/" + Q + (D.g > 1 ? "  (÷ " + D.g + ")" : ""));
        k.set("r2", Q === 1 ? "1" : Q + " = " + f);
        k.set("r3", D.digits.length === 0 ? "A whole number" : D.term ? "Terminating" : "Non-terminating recurring");
        R4.innerHTML = decHTML(D, 99);
        k.set("r5", D.term ? "none" : D.digits.slice(D.start).join("") + " (" + (D.digits.length - D.start) + " digit" + (D.digits.length - D.start > 1 ? "s" : "") + ")");
        k.set("r6", Q === 1 ? "q = 1 after cancelling" : only25 ? "q has no prime factor other than 2 and 5" : "q has the prime factor " + factors(Q).filter(function (p) { return p !== 2 && p !== 5; })[0] + ", not just 2s and 5s");
        note = D.digits.length === 0 ? D.P + "/" + Q + " is a whole number." :
          D.term ? "The remainder reached 0, so the division stops: " + D.P + "/" + Q + " is a terminating decimal." :
          "Only " + Q + " remainders (0 to " + (Q - 1) + ") are possible, so one must come back. Remainder " + D.rems[D.rems.length - 1] + " came back, so the digits " + D.digits.slice(D.start).join("") + " repeat for ever.";
        // working
        var html = '<li class="given" value="0">' + D.P + " ÷ " + Q + " = " + D.I + " remainder " + D.rems[0] + "</li>";
        var nShow = Math.min(s.shown, D.digits.length), lim = 14;
        for (var i = 0; i < nShow && i < lim; i++) {
          var r = D.rems[i], back2 = !D.term && i === D.digits.length - 1;
          html += "<li>" + (10 * r) + " ÷ " + Q + " = " + D.digits[i] + ", remainder " + D.rems[i + 1] + (back2 ? "  ← seen before" : "") + "</li>";
        }
        if (nShow > lim) html += '<li class="given">… ' + (nShow - lim) + " more steps</li>";
        if (s.shown >= D.digits.length) html += '<li class="final">' + D.P + "/" + Q + " = " + decHTML(D, 99) + (D.term ? "" : "  (" + D.I + "." + D.digits.join("") + D.digits.slice(D.start).join("") + "…)") + "</li>";
        steps.innerHTML = html;
      } else {
        var B = back(), d = B.d, xs = d.I + "." + d.pre + tail(d, 3) + "…";
        R4.textContent = B.num + "/" + B.den;
        k.el('[data-r="r1"]').innerHTML = d.I + "." + d.pre + over(d.rep);
        k.set("r2", B.n ? B.hi + " and by " + B.lo : String(B.hi));
        k.set("r3", (B.n ? B.hi + "x − " + B.lo + "x = " : B.hi + "x − x = ") + (B.hi - B.lo) + "x");
        k.set("r5", B.Q === 1 ? String(B.P) : B.P + "/" + B.Q);
        var D2 = divide(B.P, B.Q);
        k.el('[data-r="r6"]').innerHTML = (B.Q === 1 ? B.P : B.P + "/" + B.Q) + " = " + decHTML(D2, 99) + " ✓";
        note = "Multiply so that the repeating tails line up exactly, then subtract: the endless tails cancel and leave a whole number.";
        if (d.rep === "0") note = "A repeating 0 is just a terminating decimal: 3.000… = 3.";
        var A1 = shifted(B, B.hi), A0 = shifted(B, B.lo);
        var L = ['<li class="given" value="0">Let x = ' + xs + "</li>"];
        if (B.n) L.push("Multiply by " + B.lo + " so the repeating part starts right after the point: " + B.lo + "x = " + A0.ip + "." + A0.fp + "…");
        L.push("Multiply by " + B.hi + " to move one whole block of " + B.k + " digit" + (B.k > 1 ? "s" : "") + " across: " + B.hi + "x = " + A1.ip + "." + A1.fp + "…");
        L.push("Subtract: " + B.hi + "x − " + (B.n ? B.lo + "x" : "x") + " = " + A1.ip + "." + A1.fp.slice(0, 3) + "… − " + A0.ip + "." + A0.fp.slice(0, 3) + "… = " + B.num + ", so " + B.den + "x = " + B.num);
        L.push("x = " + B.num + "/" + B.den + (B.P !== B.num ? " = " + (B.Q === 1 ? B.P : B.P + "/" + B.Q) : ""));
        steps.innerHTML = L[0] + L.slice(1).map(function (t, i) { return i + 1 <= s.shown ? "<li" + (i + 2 === L.length ? ' class="final"' : "") + ">" + t + "</li>" : ""; }).join("");
      }
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    // ---------- drawing ----------
    function drawDivide(ctx, W, H, c) {
      var D = info(), Q = D.Q, n = D.digits.length, show = Math.min(s.shown, n), narrow = W < 520;
      // digits band
      var box = narrow ? 24 : 32, x0 = 14, y0 = 14;
      var head = D.P + "/" + Q + " = " + D.I + ".";
      ctx.font = "700 " + (narrow ? 15 : 19) + "px " + c.font; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillStyle = c.ink;
      var hw = ctx.measureText(head).width;
      var extra = D.term || show < n ? 0 : Math.min(n - D.start, 8);    // one faded extra block to show the repeat
      var total = show + extra + (D.term && show === n ? 0 : 1);
      var perRow = Math.max(4, Math.floor((W - x0 - hw - 10) / box)), rows = Math.max(1, Math.ceil(total / perRow));
      ctx.fillText(head, x0, y0 + box / 2);
      var cx0 = x0 + hw + 4;
      function cell(i) { return [cx0 + (i % perRow) * box, y0 + Math.floor(i / perRow) * (box + 10)]; }
      ctx.font = "700 " + (narrow ? 15 : 19) + "px " + c.font; ctx.textAlign = "center";
      for (var i = 0; i < show; i++) {
        var p = cell(i), rep = !D.term && i >= D.start && show === n;
        ctx.fillStyle = rep ? c.tint : c.bg; ctx.fillRect(p[0] + 1, p[1], box - 2, box);
        ctx.strokeStyle = rep ? c.path : c.line; ctx.lineWidth = 1; ctx.strokeRect(p[0] + 1.5, p[1] + 0.5, box - 3, box - 1);
        ctx.fillStyle = rep ? c.path : c.ink; ctx.fillText(D.digits[i], p[0] + box / 2, p[1] + box / 2 + 1);
        if (rep) { ctx.strokeStyle = c.path; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(p[0] + 3, p[1] - 4); ctx.lineTo(p[0] + box - 3, p[1] - 4); ctx.stroke(); }
      }
      for (i = 0; i < extra; i++) {
        var q2 = cell(show + i); ctx.globalAlpha = 0.45; ctx.fillStyle = c.path; ctx.fillText(D.digits[D.start + i], q2[0] + box / 2, q2[1] + box / 2 + 1); ctx.globalAlpha = 1;
      }
      if (!(D.term && show === n)) { var q3 = cell(show + extra); ctx.fillStyle = c.muted; ctx.fillText("…", q3[0] + box / 2, q3[1] + box / 2); }
      var bandH = y0 + rows * (box + 10) + 6;

      // remainder wheel
      var areaW = narrow ? W : W * 0.58, top = bandH + 8;
      var R = Math.max(40, Math.min(areaW / 2 - 40, (H - top) / 2 - 26)), cx = areaW / 2, cy = top + (H - top) / 2;
      function pos(r) { var a = -Math.PI / 2 + 2 * Math.PI * r / Q; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; }
      ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
      ctx.font = "600 11px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (R > 80) { ctx.fillText("remainders", cx, cy - 8); ctx.fillText("0 to " + (Q - 1), cx, cy + 8); }
      var visited = D.rems.slice(0, show + 1), labelEvery = Q > 24 ? (narrow ? 5 : 2) : 1;
      // arrows between successive remainders
      for (i = 0; i < show; i++) {
        var a = pos(D.rems[i]), b = pos(D.rems[i + 1]), inCycle = !D.term && show === n && i >= D.start;
        var col = inCycle ? c.path : c.vx;
        if (D.rems[i] === D.rems[i + 1]) {   // a remainder that repeats at once: small loop
          ctx.strokeStyle = col; ctx.lineWidth = 2; var o = [(a[0] - cx) / R, (a[1] - cy) / R];
          ctx.beginPath(); ctx.arc(a[0] + o[0] * 14, a[1] + o[1] * 14, 11, 0, 2 * Math.PI); ctx.stroke();
        } else {
          var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, sh = 0.55;
          var ex = cx + (mx - cx) * sh, ey = cy + (my - cy) * sh;
          ctx.strokeStyle = col; ctx.lineWidth = inCycle ? 2.5 : 1.8; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(ex, ey, b[0], b[1]); ctx.stroke();
          var t = 0.9, hx = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * ex + t * t * b[0], hy = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * ey + t * t * b[1];
          K.arrow(ctx, hx, hy, b[0] + (hx - b[0]) * 0.25, b[1] + (hy - b[1]) * 0.25, col, 2, 9);
        }
      }
      for (var r = 0; r < Q; r++) {
        var pp = pos(r), on = visited.indexOf(r) >= 0, isZero = r === 0;
        var colr = isZero ? c.good : on ? c.vy : c.grid;
        ctx.fillStyle = colr; ctx.beginPath(); ctx.arc(pp[0], pp[1], on || isZero ? 6 : 3.5, 0, 2 * Math.PI); ctx.fill();
        if (on && !isZero) { ctx.strokeStyle = c.surface; ctx.lineWidth = 1.5; ctx.stroke(); }
        if (r % labelEvery === 0 || on) {
          var o2 = [(pp[0] - cx) / R, (pp[1] - cy) / R];
          ctx.fillStyle = on ? c.vy : isZero ? c.good : c.muted; ctx.font = (on || isZero ? "700 " : "") + "11px " + c.font;
          ctx.fillText(r, pp[0] + o2[0] * 15, pp[1] + o2[1] * 15);
        }
      }
      if (show >= n && n > 0) {
        var last = pos(D.rems[n]);
        ctx.strokeStyle = D.term ? c.good : c.path; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(last[0], last[1], 11, 0, 2 * Math.PI); ctx.stroke();
      }

      // table of remainders (wide screens)
      if (!narrow) {
        var tx = W * 0.6, tw = W - tx - 14, rowH = 22, maxRows = Math.floor((H - top - 30) / rowH), ty = top + 4;
        ctx.font = "600 12px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        var cols = [tx, tx + tw * 0.4, tx + tw * 0.74];
        ctx.fillText("remainder", cols[0], ty + 8); ctx.fillText("divide", cols[1], ty + 8); ctx.fillText("digit", cols[2], ty + 8);
        ctx.strokeStyle = c.line; ctx.beginPath(); ctx.moveTo(tx, ty + 20); ctx.lineTo(tx + tw, ty + 20); ctx.stroke();
        var startRow = Math.max(0, show - maxRows);
        for (i = startRow; i < show; i++) {
          var yy = ty + 20 + (i - startRow + 0.5) * rowH + 2, cyc = !D.term && show === n && i >= D.start;
          ctx.font = "14px " + c.font;
          ctx.fillStyle = c.vy; ctx.fillText(D.rems[i], cols[0] + 8, yy);
          ctx.fillStyle = c.ink; ctx.fillText(10 * D.rems[i] + " ÷ " + Q, cols[1], yy);
          ctx.font = "700 14px " + c.font; ctx.fillStyle = cyc ? c.path : c.ink; ctx.fillText(D.digits[i], cols[2] + 10, yy);
        }
        if (show >= n && n > 0) {
          var yE = ty + 20 + (Math.min(show, maxRows) + 0.5) * rowH + 2;
          ctx.font = "700 13px " + c.font; ctx.fillStyle = D.term ? c.good : c.path;
          ctx.fillText(D.term ? "remainder 0: stop" : "remainder " + D.rems[n] + " again: repeat", cols[0], yE);
        }
      }
    }

    function drawBack(ctx, W, H, c) {
      var B = back(), d = B.d, narrow = W < 520, m = B.n ? 4 : 3;
      var fs = narrow ? 15 : 24, cw = narrow ? 12 : 19, lh = narrow ? 46 : 70;
      var A1 = shifted(B, B.hi), A0 = shifted(B, B.lo);
      var rows = [{ lab: B.hi + "x", ip: A1.ip, fp: A1.fp, col: c.path }, { lab: B.n ? B.lo + "x" : "x", ip: A0.ip, fp: A0.fp, col: c.vx }];
      var nf = Math.max(B.k, Math.floor(Math.min(narrow ? 13 : 20, (W * 0.5) / cw) / B.k) * B.k);
      var pointX = Math.round(W * (narrow ? 0.44 : 0.4)), y = Math.max(narrow ? 30 : 40, (H - lh * 4.2) / 2);
      ctx.textBaseline = "middle";
      function row(R, yy, alpha) {
        ctx.globalAlpha = alpha;
        ctx.font = "700 " + fs + "px " + c.font; ctx.textAlign = "right"; ctx.fillStyle = R.col;
        ctx.fillText(R.lab + " =", pointX - R.ip.length * cw - 10, yy);
        ctx.textAlign = "center"; ctx.fillStyle = c.ink;
        for (var i = 0; i < R.ip.length; i++) ctx.fillText(R.ip[R.ip.length - 1 - i], pointX - (i + 0.5) * cw - 4, yy);
        ctx.fillText(".", pointX, yy);
        for (i = 0; i < nf; i++) {   // the tail, one shaded box per repeating block
          if (Math.floor(i / B.k) % 2 === 0) { ctx.fillStyle = c.tint; ctx.fillRect(pointX + 5 + i * cw, yy - lh * 0.3, cw, lh * 0.6); }
          ctx.fillStyle = c.ink; ctx.fillText(R.fp[i % R.fp.length], pointX + 5 + (i + 0.5) * cw, yy);
        }
        ctx.fillStyle = c.muted; ctx.textAlign = "left"; ctx.fillText("…", pointX + 7 + nf * cw, yy);
        ctx.globalAlpha = 1;
      }
      row(rows[0], y, s.shown >= m - 2 ? 1 : 0.2);
      row(rows[1], y + lh, 1);
      ctx.fillStyle = c.ink; ctx.font = "700 " + fs + "px " + c.font; ctx.textAlign = "left";
      ctx.fillText("−", 12, y + lh);
      var ly = y + lh * 1.55;
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(12, ly); ctx.lineTo(W - 12, ly); ctx.stroke();
      if (s.shown >= m - 1) {
        ctx.strokeStyle = c.bad; ctx.lineWidth = 2;
        [y, y + lh].forEach(function (yy) { ctx.beginPath(); ctx.moveTo(pointX + 5, yy + 3); ctx.lineTo(pointX + 5 + nf * cw, yy - 3); ctx.stroke(); });
        ctx.font = "700 " + (narrow ? 11 : 13) + "px " + c.font; ctx.fillStyle = c.bad; ctx.textAlign = "left";
        ctx.fillText("the same tails cancel", pointX + 6, y + lh * 0.5);
        ctx.font = "700 " + fs + "px " + c.font; ctx.fillStyle = c.vy; ctx.textAlign = "right";
        ctx.fillText(B.den + "x = " + B.num, pointX + String(B.num).length * cw * 0.5, ly + lh * 0.55);
      }
      if (s.shown >= m) {
        ctx.font = "700 " + (fs + 3) + "px " + c.font; ctx.fillStyle = c.good; ctx.textAlign = "center";
        ctx.fillText("x = " + B.num + "/" + B.den + (B.P !== B.num ? " = " + (B.Q === 1 ? B.P : B.P + "/" + B.Q) : ""), W / 2, ly + lh * 1.45);
      }
      if (s.shown >= m - 2 && d.rep !== "0") {
        ctx.font = "600 " + (narrow ? 11 : 13) + "px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "center";
        var t1 = "The block “" + d.rep + "” has " + B.k + " digit" + (B.k > 1 ? "s" : "") + ",", t2 = "so the two rows differ by × " + (B.hi / B.lo) + ".";
        ctx.fillText(t1, W / 2, ly + lh * 2.2); ctx.fillText(t2, W / 2, ly + lh * 2.2 + (narrow ? 15 : 19));
      }
    }

    k.draw = function (ctx, W, H, c) { if (s.mode === "divide") drawDivide(ctx, W, H, c); else drawBack(ctx, W, H, c); };

    var showP = k.bindSlider("p", function () { return s.p; }, function (v) { stop(); s.p = v; s.shown = 99; update(); }, String);
    var showQ = k.bindSlider("q", function () { return s.q; }, function (v) { stop(); s.q = v; s.shown = 99; update(); }, String);
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { stop(); s.mode = v; s.shown = 99; update(); });
    sel.value = s.dec;
    sel.addEventListener("change", function () { stop(); s.dec = sel.value; s.shown = 99; update(); });

    function addOpt(v) {
      if ([].some.call(sel.options, function (o) { return o.value === v; })) return;
      var d = parseDec(v), o = document.createElement("option"); o.value = v; o.textContent = d.I + "." + d.pre + d.rep + d.rep + "… (" + d.rep + " repeats)"; sel.appendChild(o);
    }
    function stop() { if (clock) clock.stop(); }
    function play() {
      stop();
      var total = s.mode === "divide" ? info().digits.length : (back().n ? 4 : 3), t = 0, per = s.mode === "divide" ? 0.7 : 1.1;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { s.shown = 99; update(); return; }
      s.shown = 0; update();
      clock = K.clock(function (dt) { t += dt; var n = Math.floor(t / per); if (n !== s.shown) { s.shown = n; update(); } return n < total; });
      clock.start();
    }
    k.onAct({ play: play });
    update();
    return {
      set: function (o) { stop(); Object.assign(s, o); if (!("shown" in o)) s.shown = 99; showP(); showQ(); showM(); addOpt(s.dec); sel.value = s.dec; update(); },
      play: play,
      seek: function (n) { stop(); s.shown = n; update(); },
      state: function () { var D = info(); return Object.assign({}, s, { P: D.P, Q: D.Q, digits: D.digits.join(""), start: D.start, term: D.term, back: back() }); }
    };
  }
  window.RealDecimalSim = { mount: mount };
})();
