/*
 * Mean, median and mode on a dot plot. Each dot is one observation on a number line from 0 to 20.
 * Drag a dot to change it, tap the line to add one. The number line is a see-saw: it balances
 * on its support only when the support is at the mean. The sorted row on top shows the median;
 * the tallest stack is the mode. Optional frequency table with Σfx.
 * Needs sim-kit.js.  StatsCenterSim.mount(el, { vals: [12, 15, 8, 17, 15, 10, 14] })
 */
(function () {
  "use strict";
  var K = window.SimKit, MAXV = 20;

  function fitAspect(stage, wide, narrow) {
    var mq = window.matchMedia("(max-width: 760px)");
    function ap() { stage.style.aspectRatio = mq.matches ? narrow : wide; }
    ap(); if (mq.addEventListener) mq.addEventListener("change", ap);
  }
  function num(x) {   // exact when it terminates within 2 places, else ≈
    var r = Math.round(x * 100) / 100;
    return { txt: String(r), exact: Math.abs(x - r) < 1e-9 };
  }
  function ord(n) { var s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "mc";
    var s = Object.assign({ vals: [12, 15, 8, 17, 15, 10, 14], fulcrum: null, table: false, sel: -1 }, opts);
    s.vals = s.vals.slice();
    var drag = null, P = null, fAnim = null;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var k = K.frame(root, {
      aspect: "16 / 10",
      label: "A dot plot on a see-saw number line showing the mean as the balance point, the median in the sorted row and the mode as the tallest stack",
      panel: '<div class="checks">' + K.check(id, "table", "Frequency table", s.table) + '</div>' +
        K.buttons([["balance", "Balance it"], ["add", "Add a value"], ["remove", "Remove"]]) +
        K.hint("note"),
      readouts: [["n", "Number of observations, n"], ["sum", "Sum of observations"], ["bal", "See-saw", "wrap"],
                 ["mean", "Mean", "c-path"], ["med", "Median", "c-vx"], ["mode", "Mode", "c-vy"]],
      cols: 3
    });
    fitAspect(root.querySelector(".sim-stage"), "16 / 10", "4 / 4.2");
    var body = root.querySelector(".sim-body");
    var tbl = document.createElement("div"); tbl.className = "table-wrap"; tbl.style.cssText = "grid-column:1/-1;margin:0;padding:0.6rem 0.8rem;border-top:1px solid var(--line);overflow-x:auto";
    body.appendChild(tbl);
    var steps = document.createElement("ol"); steps.className = "steps-list"; steps.setAttribute("aria-live", "polite");
    body.appendChild(steps);

    function sorted() { return s.vals.slice().sort(function (a, b) { return a - b; }); }
    function sum() { return s.vals.reduce(function (a, b) { return a + b; }, 0); }
    function mean() { return s.vals.length ? sum() / s.vals.length : 0; }
    function median() { var a = sorted(), n = a.length; if (!n) return NaN; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; }
    function freq() { var f = []; for (var v = 0; v <= MAXV; v++) f.push(0); s.vals.forEach(function (v) { f[v]++; }); return f; }
    function modes() { var f = freq(), m = Math.max.apply(null, f); if (m <= 1 && s.vals.length > 1) return []; var out = []; f.forEach(function (c, v) { if (c === m && m > 0) out.push(v); }); return out; }
    function fulc() { return s.fulcrum == null ? mean() : s.fulcrum; }

    function update() {
      var n = s.vals.length, a = sorted(), mn = num(mean()), md = median(), mo = modes(), f = freq();
      k.set("n", String(n)); k.set("sum", String(sum()));
      k.set("mean", n ? (mn.exact ? "" : "≈ ") + mn.txt : "–");
      k.set("med", n ? String(md) : "–");
      k.set("mode", !n ? "–" : mo.length ? mo.join(" and ") : "none");
      var d = mean() - fulc();
      k.set("bal", !n ? "–" : Math.abs(d) < 1e-9 ? "balanced: support at the mean" : d > 0 ? "tips right: move the support right" : "tips left: move the support left");
      // steps
      var L = [];
      if (n) {
        L.push("In order: " + a.join(", ") + "  (n = " + n + ")");
        if (s.table) {
          var fx = 0, N = 0; f.forEach(function (c, v) { fx += c * v; N += c; });
          L.push("Mean = Σfᵢxᵢ ÷ N = " + fx + " ÷ " + N + (mn.exact ? " = " : " ≈ ") + mn.txt);
        } else L.push("Mean = sum ÷ n = " + sum() + " ÷ " + n + (mn.exact ? " = " : " ≈ ") + mn.txt);
        if (n % 2) L.push("n = " + n + " is odd: median = the ((" + n + " + 1) ÷ 2) = " + ord((n + 1) / 2) + " value = " + md);
        else L.push("n = " + n + " is even: median = (" + ord(n / 2) + " value + " + ord(n / 2 + 1) + " value) ÷ 2 = (" + a[n / 2 - 1] + " + " + a[n / 2] + ") ÷ 2 = " + md);
        var mx = Math.max.apply(null, f);
        L.push(mo.length ? "Mode = " + mo.join(" and ") + ": " + (mo.length > 1 ? "they occur" : "it occurs") + " most often (" + mx + " time" + (mx > 1 ? "s" : "") + ")" : "Every observation occurs only once, so there is no mode");
      }
      steps.innerHTML = L.map(function (t, i) { return "<li" + (i === L.length - 1 ? ' class="final"' : "") + ">" + t + "</li>"; }).join("");
      // frequency table
      tbl.style.display = s.table ? "" : "none";
      if (s.table) {
        var xs = []; f.forEach(function (c, v) { if (c) xs.push(v); });
        var td = 'style="text-align:center;padding:0.25rem 0.5rem"', th = 'style="text-align:left;padding:0.25rem 0.5rem"';
        var tot = 0, N2 = 0;
        tbl.innerHTML = '<table class="compare" style="margin:0;font-family:var(--font-data);font-size:0.85rem"><tbody>' +
          '<tr><th ' + th + '>Observation xᵢ</th>' + xs.map(function (v) { return "<td " + td + ">" + v + "</td>"; }).join("") + "<td " + td + "><b>Total</b></td></tr>" +
          '<tr><th ' + th + '>Frequency fᵢ</th>' + xs.map(function (v) { N2 += f[v]; return "<td " + td + ">" + f[v] + "</td>"; }).join("") + "<td " + td + "><b>N = " + N2 + "</b></td></tr>" +
          '<tr><th ' + th + '>fᵢ × xᵢ</th>' + xs.map(function (v) { tot += f[v] * v; return "<td " + td + ">" + f[v] * v + "</td>"; }).join("") + "<td " + td + "><b>Σfᵢxᵢ = " + tot + "</b></td></tr>" +
          "</tbody></table>";
      }
      k.el('[data-r="note"]').textContent = "Drag a dot to change it, or tap the line to add one. The mean is the balance point of the see-saw; the median is the middle of the sorted row; the mode is the tallest stack.";
      k.btn("remove").disabled = n <= 1;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var narrow = W < 520, fs = narrow ? 10 : 12, n = s.vals.length, a = sorted();
      // sorted row
      var bw = Math.min(narrow ? 22 : 30, (W - 16) / Math.max(n, 1)), bx0 = (W - bw * n) / 2, by = narrow ? 22 : 26, bh = narrow ? 20 : 24;
      ctx.font = fs + "px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("In order (" + n + " values):", 8, 6);
      var mids = n % 2 ? [(n - 1) / 2] : [n / 2 - 1, n / 2];
      a.forEach(function (v, i) {
        var mid = mids.indexOf(i) >= 0, x = bx0 + i * bw;
        ctx.fillStyle = mid ? c.vx : c.tint; ctx.fillRect(x + 1, by, bw - 2, bh);
        ctx.fillStyle = mid ? c.surface : c.ink; ctx.font = (mid ? "700 " : "") + (bw < 20 ? 9 : fs) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(v, x + bw / 2, by + bh / 2 + 0.5);
      });
      if (n) {
        var mx = bx0 + (mids[0] + (mids.length === 2 ? 1 : 0.5)) * bw;
        ctx.fillStyle = c.vx; ctx.font = "700 " + fs + "px " + c.font; ctx.textBaseline = "top"; ctx.textAlign = "center";
        var mt = n % 2 ? ord(mids[0] + 1) + " value is the median" : "median = mean of the " + ord(mids[0] + 1) + " and " + ord(mids[1] + 1);
        ctx.fillText(mt, Math.max(8 + ctx.measureText(mt).width / 2, Math.min(W - 8 - ctx.measureText(mt).width / 2, mx)), by + bh + 3);
      }
      // the see-saw
      var padX = narrow ? 14 : 24, gx = padX, gw = W - 2 * padX, axisY = H - (narrow ? 64 : 72);
      var X = function (v) { return gx + v / MAXV * gw; }, slot = gw / MAXV, r = Math.min(slot * 0.42, narrow ? 7 : 12);
      P = { X: X, ix: function (px) { return (px - gx) / gw * MAXV; }, axisY: axisY, r: r, top: by + bh + 22 };
      var F = fulc(), d = mean() - F, ang = Math.max(-0.05, Math.min(0.05, d * 0.02)), px = X(F), mo = modes(), f = freq();
      // support (fixed)
      ctx.fillStyle = c.muted; ctx.beginPath(); ctx.moveTo(px, axisY + 4); ctx.lineTo(px - 14, axisY + 34); ctx.lineTo(px + 14, axisY + 34); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8, axisY + 34.5); ctx.lineTo(W - 8, axisY + 34.5); ctx.stroke();
      if (n) { ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = c.path; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(mean()), P.top + 16); ctx.lineTo(X(mean()), axisY - 2); ctx.stroke(); ctx.restore(); }
      ctx.save(); ctx.translate(px, axisY); ctx.rotate(ang); ctx.translate(-px, -axisY);
      // beam with scale
      ctx.fillStyle = c.ink; ctx.fillRect(gx - 6, axisY, gw + 12, 4);
      ctx.font = fs + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = c.muted;
      for (var v = 0; v <= MAXV; v++) { ctx.fillRect(X(v) - 0.5, axisY + 4, 1, 4); if (!narrow || v % 2 === 0) ctx.fillText(v, X(v), axisY + 9); }
      // dots
      for (v = 0; v <= MAXV; v++) for (var j = 0; j < f[v]; j++) {
        var isMode = mo.indexOf(v) >= 0;
        ctx.fillStyle = isMode ? c.vy : c.path; ctx.beginPath(); ctx.arc(X(v), axisY - r - 1 - j * (2 * r + 1), r, 0, 7); ctx.fill();
      }
      if (mo.length) {
        ctx.fillStyle = c.vy; ctx.font = "700 " + fs + "px " + c.font; ctx.textBaseline = "bottom";
        mo.forEach(function (m) { ctx.fillText("mode", X(m), axisY - 2 - f[m] * (2 * r + 1) - 2); });
      }
      ctx.restore();
      if (n) {
        // mean marker
        var mxp = X(mean());
        var mn = num(mean()), lab = "mean " + (mn.exact ? "" : "≈ ") + mn.txt;
        ctx.font = "700 " + fs + "px " + c.font; ctx.fillStyle = c.path; ctx.textBaseline = "top";
        var lw = ctx.measureText(lab).width; ctx.textAlign = "center";
        ctx.fillText(lab, Math.max(lw / 2 + 4, Math.min(W - lw / 2 - 4, mxp)), P.top - 2 + (narrow ? 0 : 0));
        // median marker under the support line
        var md = median(), mdp = X(md), mtx = "median " + md;
        ctx.fillStyle = c.vx; ctx.beginPath(); ctx.moveTo(mdp, axisY + 38); ctx.lineTo(mdp - 6, axisY + 48); ctx.lineTo(mdp + 6, axisY + 48); ctx.closePath(); ctx.fill();
        var mw = ctx.measureText(mtx).width; ctx.textBaseline = "top";
        ctx.fillText(mtx, Math.max(mw / 2 + 4, Math.min(W - mw / 2 - 4, mdp)), axisY + 50);
      }
    };

    function pos(e) { var r = k.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    k.canvas.addEventListener("pointerdown", function (e) {
      if (!P) return;
      var p = pos(e), v = Math.round(P.ix(p[0]));
      if (v < 0 || v > MAXV) return;
      if (p[1] > P.axisY + 2 && p[1] < P.axisY + 36 && Math.abs(p[0] - P.X(fulc())) < 22) { drag = { fulcrum: true }; s.fulcrum = fulc(); }
      else if (p[1] < P.axisY + 8 && p[1] > P.top) {
        var i = s.vals.lastIndexOf(v); s.fulcrum = fulc();
        if (i < 0) { s.vals.push(v); i = s.vals.length - 1; }
        drag = { i: i }; s.sel = i;
      } else return;
      k.canvas.setPointerCapture(e.pointerId); update();
    });
    k.canvas.addEventListener("pointermove", function (e) {
      if (!drag) return;
      var p = pos(e), x = P.ix(p[0]);
      if (drag.fulcrum) s.fulcrum = Math.max(0, Math.min(MAXV, Math.round(x * 4) / 4));
      else s.vals[drag.i] = Math.max(0, Math.min(MAXV, Math.round(x)));
      update();
    });
    k.canvas.addEventListener("pointerup", function () { drag = null; });

    var clock = K.clock(function (dt) {
      var target = mean(), d = target - s.fulcrum, step = dt * 6;
      if (Math.abs(d) <= step) { s.fulcrum = null; update(); return false; }
      s.fulcrum += Math.sign(d) * step; update(); return true;
    });
    var tableBox = k.bindCheck("table", function (on) { s.table = on; update(); });
    k.onAct({
      balance: function () { if (s.fulcrum == null) return; if (reduce) { s.fulcrum = null; update(); return; } clock.start(); },
      add: function () { s.fulcrum = fulc(); s.vals.push(Math.round(median()) || 10); s.sel = s.vals.length - 1; update(); },
      remove: function () { if (s.vals.length <= 1) return; s.fulcrum = fulc(); s.vals.splice(s.sel >= 0 && s.sel < s.vals.length ? s.sel : s.vals.length - 1, 1); s.sel = -1; update(); }
    });
    update();
    return {
      set: function (o) { clock.stop(); Object.assign(s, o); if (o.vals) s.vals = o.vals.slice(); if (!("fulcrum" in o)) s.fulcrum = null; s.sel = -1; tableBox.checked = s.table; update(); },
      play: function () { if (s.fulcrum == null) return; if (reduce) { s.fulcrum = null; update(); } else clock.start(); },
      seek: function () {},
      state: function () { return { vals: s.vals.slice(), mean: mean(), median: median(), modes: modes() }; }
    };
  }
  window.StatsCenterSim = { mount: mount };
})();
