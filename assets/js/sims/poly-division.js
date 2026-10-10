/*
 * Operations on polynomials and synthetic division.
 *   syn – synthetic division of p(x) by x − a, filled in one cell at a time (bring down, multiply, add).
 *         With { graph: true } the graph of p(x) is drawn below the table: the remainder equals p(a)
 *         (remainder theorem), and when it is 0 the graph meets the x-axis at a (factor theorem).
 *         "Find a factor" tries the divisors of the constant term until the remainder is 0.
 *   add, sub, mul – two quadratics p(x), q(x): like terms in columns, or the multiplication grid.
 * Needs sim-kit.js and math-kit.js.  PolyDivSim.mount(el, { mode: "syn", deg: 3, k: [k0, k1, k2, k3, k4], a: 2 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, f = M.frac;
  var SUP = ["", "", "²", "³", "⁴", "⁵", "⁶"];
  var LABELS = {
    syn: ["Dividend p(x)", "Divisor", "Quotient", "Remainder", "p(a) (remainder theorem)", "Is x − a a factor?"],
    add: ["p(x)", "q(x)", "p(x) + q(x)", "Degree of the result", "Check at x = 1", "Rule"],
    sub: ["p(x)", "q(x)", "p(x) − q(x)", "Degree of the result", "Check at x = 1", "Rule"],
    mul: ["p(x)", "q(x)", "p(x) × q(x)", "Degree of the result", "Check at x = 1", "Rule"]
  };

  function polyStr(c, v, zeros) {   // highest power first
    v = v || "x"; var n = c.length - 1, out = "";
    c.forEach(function (k, i) {
      if (!k && !(zeros && i > 0)) return; var p = n - i, a = Math.abs(k);
      var body = (a === 1 && p > 0 ? "" : f(a)) + (p > 0 ? v + SUP[p] : "");
      out += out ? (k < 0 ? " − " : " + ") + body : (k < 0 ? "−" : "") + body;
    });
    return out || "0";
  }
  function trim(c) { var i = 0; while (i < c.length - 1 && c[i] === 0) i++; return c.slice(i); }
  function evalP(c, x) { return c.reduce(function (s, k) { return s * x + k; }, 0); }
  function divisor(a) { return a === 0 ? "x" : a > 0 ? "x − " + f(a) : "x + " + f(-a); }
  function synth(C, a) { var b = [C[0]], pr = [null]; for (var i = 1; i < C.length; i++) { pr.push(a * b[i - 1]); b.push(C[i] + pr[i]); } return { b: b, pr: pr, q: b.slice(0, -1), r: b[b.length - 1] }; }
  function factorise(C) {
    var rest = trim(C.slice()), lin = [], guard = 0;
    while (rest.length > 1 && guard++ < 8) {
      var c0 = rest[rest.length - 1], found = null;
      if (c0 === 0) found = 0;
      else for (var d = 1; d <= Math.abs(c0) && found === null; d++) if (c0 % d === 0) { if (synth(rest, d).r === 0) found = d; else if (synth(rest, -d).r === 0) found = -d; }
      if (found === null) break;
      lin.push(found); rest = synth(rest, found).q;
    }
    var lead = "";
    if (rest.length === 1) lead = rest[0] === 1 ? "" : rest[0] === -1 ? "−" : f(rest[0]);
    else lead = "(" + polyStr(rest) + ")";
    var lf = lin.map(function (r) { return r === 0 ? "x" : "(" + divisor(r) + ")"; }).join("");
    return lin.length ? (rest.length === 1 ? lead + lf : lf + lead) : null;
  }
  function addP(P, Q, sign) { return P.map(function (p, i) { return p + sign * Q[i]; }); }
  function mulP(P, Q) { var out = [0, 0, 0, 0, 0]; P.forEach(function (p, i) { Q.forEach(function (q, j) { out[i + j] += p * q; }); }); return out; }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "pd";
    var s = Object.assign({ mode: "syn", deg: 3, k: [-6, 11, -6, 1, 0], a: 2, graph: false, find: false, shown: 99, P: [2, -3, 1], Q: [1, 2, -4], tried: [] }, opts);
    var clock = null;

    var k = K.frame(root, {
      aspect: "16 / 9",
      label: "A synthetic division table, or the working for adding, subtracting and multiplying polynomials",
      panel: K.chips("mode", "Operation", [["syn", "Synthetic division"], ["add", "Add"], ["sub", "Subtract"], ["mul", "Multiply"]]) +
        '<div data-for="syn">' + '<div class="eqn-show" data-r="eqn" style="font-size:1rem"></div>' + K.chips("deg", "Degree of p(x)", [["2", "2"], ["3", "3"], ["4", "4"]]) +
          '<div data-pw="4">' + K.slider(id, "k4", "Coefficient of x⁴", -9, 9, 1, "") + '</div><div data-pw="3">' + K.slider(id, "k3", "Coefficient of x³", -9, 9, 1, "") + '</div>' +
          K.slider(id, "k2", "Coefficient of x²", -9, 9, 1, "") + K.slider(id, "k1", "Coefficient of x", -20, 20, 1, "") + K.slider(id, "k0", "Constant term", -70, 70, 1, "") +
          K.slider(id, "a", "Divisor x − a: a", -5, 5, 1, "") + '</div>' +
        '<div data-for="add sub mul"><div class="eq-pick"><div class="seg-label">p(x) = <b data-r="pt"></b></div>' + K.slider(id, "p2", "x²", -6, 6, 1, "") + K.slider(id, "p1", "x", -6, 6, 1, "") + K.slider(id, "p0", "constant", -6, 6, 1, "") + '</div>' +
          '<div class="eq-pick"><div class="seg-label">q(x) = <b data-r="qt"></b></div>' + K.slider(id, "q2", "x²", -6, 6, 1, "") + K.slider(id, "q1", "x", -6, 6, 1, "") + K.slider(id, "q0", "constant", -6, 6, 1, "") + '</div></div>' +
        K.buttons([["play", "Divide step by step"], ["find", "Find a factor"]]) + K.hint("note"),
      readouts: [["r1", "–", "c-path wrap"], ["r2", "–", "wrap"], ["r3", "–", "wrap"], ["r4", "–", "c-vy wrap"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span"), stage = k.el(".sim-stage");
    var steps = document.createElement("ol"); steps.className = "steps-list"; steps.setAttribute("aria-live", "polite");
    root.querySelector(".sim-body").appendChild(steps);
    function fitAspect() {
      var narrow = root.clientWidth < 560, a = s.mode === "syn" && s.graph ? (narrow ? "3 / 4" : "5 / 4") : s.mode === "mul" ? (narrow ? "1 / 1" : "16 / 10") : (narrow ? "4 / 3" : "16 / 9");
      if (stage.style.aspectRatio !== a) stage.style.aspectRatio = a;
    }
    window.addEventListener("resize", fitAspect);

    function C() { var out = []; for (var p = s.deg; p >= 0; p--) out.push(s.k[p]); return out; }
    function total() { return 2 * (C().length - 1) + 1; }

    function update() {
      fitAspect();
      LABELS[s.mode].forEach(function (t, i) { spans[i].textContent = t; });
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for.split(" ").indexOf(s.mode) >= 0 ? "" : "none"; });
      root.querySelectorAll("[data-pw]").forEach(function (e) { e.style.display = +e.dataset.pw <= s.deg ? "" : "none"; });
      k.btn("play").style.display = s.mode === "syn" ? "" : "none";
      k.btn("play").textContent = s.graph ? "Step by step" : "Divide step by step";
      k.btn("find").style.display = s.mode === "syn" && s.graph ? "" : "none";
      steps.style.display = s.mode === "syn" ? "" : "none";
      var note = "";
      if (s.mode === "syn") {
        var cc = C(), S = synth(cc, s.a), pa = evalP(cc, s.a), q = trim(S.q), fac = S.r === 0 ? factorise(cc) : null;
        k.el('[data-r="eqn"]').textContent = "(" + polyStr(cc) + ") ÷ (" + divisor(s.a) + ")";
        k.set("r1", polyStr(cc)); k.set("r2", divisor(s.a) + "   (a = " + f(s.a) + ")");
        var done = s.shown >= total();
        k.set("r3", done ? polyStr(q) : "…"); k.set("r4", done ? f(S.r) : "…");
        k.set("r5", "p(" + f(s.a) + ") = " + f(pa) + (done ? (pa === S.r ? "  = remainder ✓" : "") : ""));
        k.set("r6", S.r === 0 ? "Yes" + (fac ? ": p(x) = " + fac : "") : "No: the remainder is " + f(S.r));
        note = "Dividend = Divisor × Quotient + Remainder:  " + polyStr(cc) + " = (" + divisor(s.a) + ")(" + polyStr(q) + ")" + (S.r === 0 ? "" : (S.r < 0 ? " − " : " + ") + f(Math.abs(S.r))) + ".";
        if (s.tried.length) note = "Tried " + s.tried.map(function (t) { return "a = " + f(t[0]) + " (r = " + f(t[1]) + ")"; }).join(", ") + ". " + (S.r === 0 ? "Remainder 0, so " + divisor(s.a) + " is a factor." : "");
        var n = cc.length - 1, L = ['<li class="given" value="0">Write the coefficients ' + cc.map(f).join(", ") + " (0 for a missing power), and a = " + f(s.a) + " for " + divisor(s.a) + ".</li>"];
        L.push("Bring down the first coefficient: " + f(S.b[0]) + ".");
        for (var i = 1; i <= n; i++) {
          L.push("Multiply: " + f(S.b[i - 1]) + " × " + (s.a < 0 ? "(" + f(s.a) + ")" : f(s.a)) + " = " + f(S.pr[i]) + ". Write it under " + f(cc[i]) + ".");
          L.push("Add: " + f(cc[i]) + " + " + (S.pr[i] < 0 ? "(" + f(S.pr[i]) + ")" : f(S.pr[i])) + " = " + f(S.b[i]) + (i === n ? ". This last number is the remainder." : "."));
        }
        L.push("Quotient " + polyStr(q) + ", remainder " + f(S.r) + ".");
        steps.innerHTML = L.map(function (t, j) { return j === 0 ? t : j <= s.shown || (j === L.length - 1 && done) ? "<li" + (j === L.length - 1 ? ' class="final"' : "") + ">" + t + "</li>" : ""; }).join("");
      } else {
        var P = s.P, Q = s.Q, R = s.mode === "mul" ? trim(mulP(P, Q)) : trim(addP(P, Q, s.mode === "add" ? 1 : -1));
        var op = s.mode === "add" ? " + " : s.mode === "sub" ? " − " : " × ";
        k.el('[data-r="pt"]').textContent = polyStr(trim(P)); k.el('[data-r="qt"]').textContent = polyStr(trim(Q));
        k.set("r1", polyStr(trim(P))); k.set("r2", polyStr(trim(Q))); k.set("r3", polyStr(R));
        var zero = R.length === 1 && R[0] === 0;
        k.set("r4", zero ? "not defined (zero polynomial)" : String(R.length - 1));
        var p1 = evalP(P, 1), q1 = evalP(Q, 1), r1 = evalP(R, 1);
        k.set("r5", f(p1) + op + (q1 < 0 ? "(" + f(q1) + ")" : f(q1)) + " = " + f(r1) + " ✓");
        k.set("r6", s.mode === "add" ? "Add the coefficients of like terms" : s.mode === "sub" ? "Change the sign of every term of q(x), then add" : "Multiply every term by every term, then collect like terms");
        note = s.mode === "mul" ? "Each cell is one term of p(x) times one term of q(x). Cells of the same colour are like terms; add them. Degree " + (trim(P).length - 1) + " × degree " + (trim(Q).length - 1) + " gives degree " + (R.length - 1) + "." :
          "Like terms are lined up in columns: x² under x², x under x, numbers under numbers." + (s.mode === "sub" ? " Subtracting q(x) is adding −q(x)." : "");
      }
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    function txt(ctx, t, x, y, col, font, align, base) { ctx.font = font; ctx.fillStyle = col; ctx.textAlign = align || "center"; ctx.textBaseline = base || "middle"; ctx.fillText(t, x, y); }

    function drawSyn(ctx, W, H, c) {
      var cc = C(), n = cc.length - 1, S = synth(cc, s.a), narrow = W < 520, sh = s.shown;
      var tableH = s.graph ? Math.min(H * 0.46, 220) : H;
      var cw = Math.min(narrow ? 58 : 84, (W - 24) / (n + 2.3)), rh = Math.min(narrow ? 36 : 44, (tableH - 70) / 3.6);
      var tw = cw * (n + 2.1), x0 = (W - tw) / 2, y0 = Math.max(narrow ? 34 : 44, (tableH - rh * 3.4 - 30) / 2 + 10);
      var fs = narrow ? 15 : 19;
      txt(ctx, "p(x) = " + polyStr(cc, "x", true), W / 2, y0 - (narrow ? 20 : 26), c.ink, "600 " + (narrow ? 12 : 14) + "px " + c.font);
      var colX = function (i) { return x0 + cw * 1.1 + (i + 0.5) * cw; }, rowY = function (r) { return y0 + (r + 0.5) * rh + (r === 2 ? 8 : 0); };
      // divisor box: a with the bracket
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0 + cw * 1.05, y0 + 2); ctx.lineTo(x0 + cw * 1.05, y0 + rh * 2 + 2); ctx.stroke();
      txt(ctx, f(s.a), x0 + cw * 0.5, rowY(0), c.vy, "700 " + fs + "px " + c.font);
      txt(ctx, "a", x0 + cw * 0.5, rowY(0) + rh * 0.62, c.muted, "11px " + c.font);
      // line above the result row
      ctx.beginPath(); ctx.moveTo(x0 + cw * 1.05, y0 + rh * 2 + 4); ctx.lineTo(x0 + tw, y0 + rh * 2 + 4); ctx.stroke();
      // row 0: coefficients
      for (var i = 0; i <= n; i++) txt(ctx, f(cc[i]), colX(i), rowY(0), c.ink, "700 " + fs + "px " + c.font);
      // progressive cells: step 1 = bring down; step 2i = multiply into col i; step 2i+1 = add col i
      function vis(step) { return sh >= step; }
      for (i = 0; i <= n; i++) {
        var bStep = i === 0 ? 1 : 2 * i + 1, pStep = 2 * i;
        if (i > 0 && vis(pStep)) txt(ctx, f(S.pr[i]), colX(i), rowY(1), c.vx, "700 " + fs + "px " + c.font);
        if (vis(bStep)) {
          var last = i === n;
          if (last) { ctx.strokeStyle = c.vy; ctx.lineWidth = 2.5; ctx.strokeRect(colX(i) - cw * 0.42, rowY(2) - rh * 0.42, cw * 0.84, rh * 0.84); }
          txt(ctx, f(S.b[i]), colX(i), rowY(2), last ? c.vy : c.path, "700 " + fs + "px " + c.font);
        }
      }
      // arrows for the current step
      if (sh >= 1 && sh < total() + 1) {
        var cur = Math.min(sh, total());
        if (cur === 1) K.arrow(ctx, colX(0), rowY(0) + rh * 0.35, colX(0), rowY(2) - rh * 0.4, c.good, 2, 9);
        else if (cur % 2 === 0) { var j = cur / 2; K.arrow(ctx, colX(j - 1) + cw * 0.25, rowY(2) - rh * 0.3, colX(j) - cw * 0.25, rowY(1) + rh * 0.25, c.good, 2, 9); txt(ctx, "× " + f(s.a), (colX(j - 1) + colX(j)) / 2 - 4, rowY(1) + rh * 0.55, c.good, "700 12px " + c.font, "right"); }
        else { var j2 = (cur - 1) / 2; K.arrow(ctx, colX(j2) + cw * 0.36, rowY(0) + rh * 0.2, colX(j2) + cw * 0.36, rowY(2) - rh * 0.3, c.good, 2, 9); txt(ctx, "+", colX(j2) + cw * 0.36 + 4, rowY(1) - rh * 0.5, c.good, "700 14px " + c.font, "left"); }
      }
      // reading the answer
      if (sh >= total()) {
        var q = trim(S.q), ly = rowY(2) + rh * 0.8;
        ctx.strokeStyle = c.path; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(colX(0) - cw * 0.4, ly - 6); ctx.lineTo(colX(n - 1) + cw * 0.4, ly - 6); ctx.stroke(); ctx.setLineDash([]);
        txt(ctx, "quotient " + polyStr(q), (colX(0) + colX(n - 1)) / 2, ly + 6, c.path, "700 " + (narrow ? 12 : 14) + "px " + c.font, "center", "top");
        txt(ctx, "remainder", colX(n), ly + 6, c.vy, "700 " + (narrow ? 11 : 13) + "px " + c.font, "center", "top");
      }
      if (s.graph) drawGraph(ctx, W, H, c, cc, tableH);
    }

    function drawGraph(ctx, W, H, c, cc, top) {
      var box = { x: 8, y: top + 12, w: W - 16, h: H - top - 20 }, m = 4;
      var xs = [s.a]; for (var z = -5; z <= 5; z++) if (evalP(cc, z) === 0) xs.push(z);
      var lo = Math.min.apply(null, xs) - 0.6, hi = Math.max.apply(null, xs) + 0.6;
      if (hi - lo < 3) { var mid = (lo + hi) / 2; lo = mid - 1.5; hi = mid + 1.5; }
      for (var x = lo; x <= hi; x += 0.05) m = Math.max(m, Math.abs(evalP(cc, x)));
      var pa = evalP(cc, s.a); m = Math.max(m, Math.abs(pa));
      var ym = [5, 10, 20, 40, 80, 160, 320, 640].filter(function (v) { return v >= m * 1.05; })[0] || 1000;
      var X = function (x) { return box.x + (x + 5.5) / 11 * box.w; }, Y = function (y) { return box.y + box.h / 2 - y / ym * box.h / 2; };
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      for (x = -5; x <= 5; x++) { ctx.beginPath(); ctx.moveTo(X(x), box.y); ctx.lineTo(X(x), box.y + box.h); ctx.stroke(); }
      for (var g = -4; g <= 4; g++) { ctx.beginPath(); ctx.moveTo(box.x, Y(g * ym / 4)); ctx.lineTo(box.x + box.w, Y(g * ym / 4)); ctx.stroke(); }
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(box.x, Y(0)); ctx.lineTo(box.x + box.w, Y(0)); ctx.moveTo(X(0), box.y); ctx.lineTo(X(0), box.y + box.h); ctx.stroke();
      ctx.font = "10px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "center"; ctx.textBaseline = "top";
      for (x = -5; x <= 5; x++) if (x) ctx.fillText(f(x), X(x), Y(0) + 3);
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      for (g = -4; g <= 4; g += 2) if (g) ctx.fillText(f(g * ym / 4), X(0) - 4, Y(g * ym / 4));
      ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
      ctx.strokeStyle = c.path; ctx.lineWidth = 2.5; ctx.beginPath();
      for (var i = 0; i <= 300; i++) { var xx = -5.5 + 11 * i / 300, py = Math.max(-2000, Math.min(4000, Y(evalP(cc, xx)))); if (i) ctx.lineTo(X(xx), py); else ctx.moveTo(X(xx), py); }
      ctx.stroke(); ctx.restore();
      // integer zeroes
      for (x = -5; x <= 5; x++) if (evalP(cc, x) === 0) M.dot(ctx, X(x), Y(0), 6, c.good, c.surface);
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = c.vy; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(s.a), Y(0)); ctx.lineTo(X(s.a), Y(pa)); ctx.stroke(); ctx.restore();
      M.dot(ctx, X(s.a), Y(pa), 8, c.vy, c.surface);
      var right = X(s.a) < W - 170, lab = pa === 0 ? "p(" + f(s.a) + ") = 0: a zero" : "p(" + f(s.a) + ") = " + f(pa);
      txt(ctx, lab, X(s.a) + (right ? 12 : -12), Y(pa) + (Y(pa) < box.y + 30 ? 14 : -14), c.vy, "700 13px " + c.font, right ? "left" : "right");
    }

    var PC = [null, null, null, null, null];
    function drawOps(ctx, W, H, c) {
      var narrow = W < 520, fs = narrow ? 14 : 18, P = s.P, Q = s.Q;
      var col = [c.path, c.vx, c.vy, c.good, c.ink];   // colours for x⁴ … constant
      function tcol(p) { return [c.ink, c.vy, c.vx, c.path, c.bad][p]; }
      function termTxt(k0, p, first) { var a = Math.abs(k0), body = (a === 1 && p > 0 ? "" : f(a)) + (p > 0 ? "x" + SUP[p] : ""); return (k0 < 0 ? "−" : first ? "" : "+") + body; }
      void col; void PC;
      if (s.mode === "mul") {
        var pt = [], qt = [];
        P.forEach(function (v, i) { if (v) pt.push([v, 2 - i]); }); Q.forEach(function (v, i) { if (v) qt.push([v, 2 - i]); });
        if (!pt.length || !qt.length) { txt(ctx, "One polynomial is 0, so the product is 0.", W / 2, H / 2, c.ink, "700 15px " + c.font); return; }
        var cwid = Math.min(narrow ? 78 : 120, (W - 40) / (qt.length + 1)), rhh = Math.min(narrow ? 40 : 52, (H - 110) / (pt.length + 1));
        var gx = (W - cwid * (qt.length + 1)) / 2, gy = 16;
        qt.forEach(function (t, j) { txt(ctx, termTxt(t[0], t[1], true), gx + cwid * (j + 1.5), gy + rhh / 2, c.ink, "700 " + fs + "px " + c.font); });
        pt.forEach(function (t, i) { txt(ctx, termTxt(t[0], t[1], true), gx + cwid / 2, gy + rhh * (i + 1.5), c.ink, "700 " + fs + "px " + c.font); });
        txt(ctx, "×", gx + cwid / 2, gy + rhh / 2, c.muted, "700 " + fs + "px " + c.font);
        pt.forEach(function (a, i) { qt.forEach(function (b, j) {
          var pw = a[1] + b[1], x = gx + cwid * (j + 1), y = gy + rhh * (i + 1);
          ctx.fillStyle = tcol(pw); ctx.globalAlpha = 0.16; ctx.fillRect(x + 2, y + 2, cwid - 4, rhh - 4); ctx.globalAlpha = 1;
          ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(x, y, cwid, rhh);
          txt(ctx, termTxt(a[0] * b[0], pw, true), x + cwid / 2, y + rhh / 2, tcol(pw), "700 " + fs + "px " + c.font);
        }); });
        var R = mulP(P, Q), ry = gy + rhh * (pt.length + 1) + 30, parts = [], first = true;
        R.forEach(function (v, i) { if (v) { var tt = termTxt(v, 4 - i, true); if (!first) tt = (v < 0 ? "− " : "+ ") + tt.replace(/^−/, ""); parts.push([tt, tcol(4 - i)]); first = false; } });
        if (!parts.length) parts.push(["0", c.ink]);
        ctx.font = "700 " + (fs + 1) + "px " + c.font;
        var widths = parts.map(function (p) { return ctx.measureText(p[0] + " ").width; }), tot = widths.reduce(function (a, b) { return a + b; }, 0) + ctx.measureText("= ").width, xx = (W - tot) / 2;
        txt(ctx, "=", xx, ry, c.ink, "700 " + (fs + 1) + "px " + c.font, "left"); xx += ctx.measureText("= ").width;
        parts.forEach(function (p, i) { txt(ctx, p[0], xx, ry, p[1], "700 " + (fs + 1) + "px " + c.font, "left"); xx += widths[i]; });
        txt(ctx, "like terms have the same colour", W / 2, ry + 26, c.muted, "600 12px " + c.font);
        return;
      }
      var sub = s.mode === "sub", Qs = sub ? Q.map(function (v) { return -v; }) : Q, R2 = addP(P, Q, sub ? -1 : 1);
      var rows = [["p(x)", P], [sub ? "−q(x)" : "+ q(x)", Qs], ["", R2]];
      var lw = narrow ? 64 : 110, cwd = Math.min(narrow ? 90 : 130, (W - lw - 30) / 3), x0 = (W - lw - cwd * 3) / 2, rh = Math.min(54, (H - 60) / 4), y0 = (H - rh * 3.4) / 2;
      rows.forEach(function (r, i) {
        var y = y0 + rh * (i + 0.5) + (i === 2 ? 12 : 0);
        txt(ctx, r[0], x0 + lw - 14, y, i === 1 && sub ? c.bad : c.muted, "700 " + (fs - 2) + "px " + c.font, "right");
        r[1].forEach(function (v, j) {
          var p = 2 - j, faint = v === 0;
          ctx.globalAlpha = faint ? 0.35 : 1;
          txt(ctx, termTxt(v, p, j === 0), x0 + lw + cwd * (j + 0.5), y, i === 2 ? c.path : tcol(p), "700 " + fs + "px " + c.font);
          ctx.globalAlpha = 1;
        });
      });
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2; var ly = y0 + rh * 2 + 6;
      ctx.beginPath(); ctx.moveTo(x0 + lw - 4, ly); ctx.lineTo(x0 + lw + cwd * 3, ly); ctx.stroke();
      ["x²", "x", "number"].forEach(function (h, j) { txt(ctx, h + " column", x0 + lw + cwd * (j + 0.5), y0 - 12, c.muted, "600 11px " + c.font); });
      if (sub) txt(ctx, "q(x) = " + polyStr(trim(Q)) + ": every sign changed", W / 2, y0 + rh * 3.6 + 10, c.bad, "600 12px " + c.font);
    }

    k.draw = function (ctx, W, H, c) { if (s.mode === "syn") drawSyn(ctx, W, H, c); else drawOps(ctx, W, H, c); };

    var shows = {};
    [0, 1, 2, 3, 4].forEach(function (p) { shows["k" + p] = k.bindSlider("k" + p, function () { return s.k[p]; }, function (v) { stop(); s.k[p] = v; s.shown = 99; s.tried = []; update(); }, f); });
    shows.a = k.bindSlider("a", function () { return s.a; }, function (v) { stop(); s.a = v; s.shown = 99; s.tried = []; update(); }, f);
    ["p2", "p1", "p0", "q2", "q1", "q0"].forEach(function (q) {
      var arr = q[0] === "p" ? "P" : "Q", i = 2 - +q[1];
      shows[q] = k.bindSlider(q, function () { return s[arr][i]; }, function (v) { s[arr][i] = v; update(); }, f);
    });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { stop(); s.mode = v; s.shown = 99; update(); });
    var showD = k.bindChips("deg", function () { return String(s.deg); }, function (v) { stop(); s.deg = +v; s.shown = 99; s.tried = []; update(); });

    function stop() { if (clock) clock.stop(); }
    var reduce = function () { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; };
    function play() {
      stop();
      if (s.find) { findFactor(); return; }
      if (s.mode !== "syn") return;
      if (reduce()) { s.shown = 99; update(); return; }
      var n = total(), t = 0; s.shown = 0; update();
      clock = K.clock(function (dt) { t += dt; var sh = Math.min(n, Math.floor(t / 0.8)); if (sh !== s.shown) { s.shown = sh; update(); } return sh < n; });
      clock.start();
    }
    function candidates() {
      var cc = C(), c0 = cc[cc.length - 1], out = [];
      if (c0 === 0) return [0];
      for (var d = 1; d <= Math.min(5, Math.abs(c0)); d++) if (c0 % d === 0) out.push(d, -d);
      return out;
    }
    function findFactor() {
      stop(); s.find = false;
      var list = candidates(), i = 0, cc = C();
      s.tried = []; s.shown = 99;
      function tryOne() { s.a = list[i]; shows.a(); var r = synth(cc, s.a).r; s.tried.push([s.a, r]); update(); i++; return r !== 0 && i < list.length; }
      if (!list.length) { update(); return; }
      if (reduce()) { while (tryOne()) { /* keep going */ } return; }
      var t = 0, go = tryOne();
      if (!go) return;
      clock = K.clock(function (dt) { t += dt; if (t > 1.1) { t = 0; return tryOne(); } return true; });
      clock.start();
    }
    k.onAct({ play: play, find: findFactor });
    update();
    return {
      set: function (o) {
        stop(); o = Object.assign({}, o);
        if (o.p) { var kk = [0, 0, 0, 0, 0]; o.p.slice().reverse().forEach(function (v, i) { kk[i] = v; }); o.k = kk; o.deg = o.p.length - 1; delete o.p; }
        if (o.P) o.P = o.P.slice(); if (o.Q) o.Q = o.Q.slice();
        Object.assign(s, o); if (!("shown" in o)) s.shown = 99; s.tried = [];
        Object.keys(shows).forEach(function (q) { shows[q](); }); showM(); showD(); update();
      },
      play: play,
      seek: function (n) { stop(); s.shown = n; update(); },
      state: function () { var S = synth(C(), s.a); return Object.assign({}, s, { C: C(), q: trim(S.q), r: S.r }); }
    };
  }
  window.PolyDivSim = { mount: mount, synth: synth, factorise: factorise };
})();
