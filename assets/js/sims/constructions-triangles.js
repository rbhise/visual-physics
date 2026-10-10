/*
 * Constructing triangles (Std 9 Geometry Ch. 4), drawn step by step with compass arcs.
 *   sum   – base BC, ∠B and AB + AC
 *   diff  – base BC, ∠B and AB − AC (or AC − AB)
 *   perim – ∠B, ∠C and the perimeter AB + BC + CA
 * Needs sim-kit.js and math-kit.js.  ConstrTriSim.mount(el, { mode: "sum", a: 8, B: 60, sum: 12 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, R = Math.PI / 180;
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function n2(x) { return String(+x.toFixed(2)); }
  function cm(x) { return n2(x) + " cm"; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
  function add(a, b, k) { return [a[0] + b[0] * (k == null ? 1 : k), a[1] + b[1] * (k == null ? 1 : k)]; }

  // the perpendicular bisector of PQ as drawn with arcs: midpoint, unit normal, arc radius, half-chord h
  function pb(P, Q) {
    var d = M.dist(P, Q), mid = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2], u = [(Q[0] - P[0]) / d, (Q[1] - P[1]) / d], n = [-u[1], u[0]];
    var rr = d * 0.68, h = Math.sqrt(rr * rr - d * d / 4);
    return { P: P, Q: Q, mid: mid, n: n, rr: rr, h: h };
  }

  function solve(s) {
    var g = { ok: true };
    if (s.mode === "perim") {
      var al = 180 - s.B - s.C;
      if (al <= 0) return { ok: false, why: "∠B + ∠C = " + (s.B + s.C) + "°. The angles of a triangle add up to 180°, so ∠B + ∠C must be less than 180°." };
      var kk = s.per / (Math.sin(al * R) + Math.sin(s.B * R) + Math.sin(s.C * R));
      var a = kk * Math.sin(al * R), b = kk * Math.sin(s.B * R), c = kk * Math.sin(s.C * R);
      g.X = [0, 0]; g.Bp = [c, 0]; g.Cp = [c + a, 0]; g.Y = [s.per, 0];
      g.A = [c + c * Math.cos(s.B * R), c * Math.sin(s.B * R)];
      g.pb1 = pb(g.X, g.A); g.pb2 = pb(g.A, g.Y);
      return g;
    }
    var a2 = s.a, u = [Math.cos(s.B * R), Math.sin(s.B * R)], t, D;
    g.Bp = [0, 0]; g.Cp = [a2, 0]; g.u = u;
    if (s.mode === "sum") {
      if (s.sum <= a2) return { ok: false, why: "AB + AC must be more than BC (" + n2(a2) + " cm): two sides of a triangle add up to more than the third." };
      D = [u[0] * s.sum, u[1] * s.sum]; t = (s.sum * s.sum - a2 * a2) / (2 * (s.sum - a2 * Math.cos(s.B * R)));
    } else if (s.side === "AB") {
      if (s.diff >= a2) return { ok: false, why: "AB − AC must be less than BC (" + n2(a2) + " cm)." };
      var den = a2 * Math.cos(s.B * R) - s.diff;
      if (den <= 1e-9) return { ok: false, why: "With ∠B = " + s.B + "°, the side AB cannot be longer than AC by " + n2(s.diff) + " cm. Make ∠B smaller or the difference smaller." };
      D = [u[0] * s.diff, u[1] * s.diff]; t = (a2 * a2 - s.diff * s.diff) / (2 * den);
    } else {
      if (s.diff >= a2) return { ok: false, why: "AC − AB must be less than BC (" + n2(a2) + " cm)." };
      var den2 = a2 * Math.cos(s.B * R) + s.diff;
      if (den2 <= 1e-9) return { ok: false, why: "No triangle fits these measures." };
      D = [-u[0] * s.diff, -u[1] * s.diff]; t = (a2 * a2 - s.diff * s.diff) / (2 * den2);
    }
    g.D = D; g.A = [u[0] * t, u[1] * t]; g.t = t; g.pb = pb(D, g.Cp);
    return g;
  }

  function steps(s) {
    var b = s.B + "°";
    if (s.mode === "sum") return [
      "Draw base BC = " + n2(s.a) + " cm.",
      "At B draw ray BX with ∠XBC = " + b + ".",
      "Mark D on ray BX with BD = " + n2(s.sum) + " cm (= AB + AC).",
      "Join DC.",
      "Draw the perpendicular bisector of DC. It meets ray BX at A.",
      "Join AC. △ABC is the required triangle."];
    if (s.mode === "diff" && s.side === "AB") return [
      "Draw base BC = " + n2(s.a) + " cm.",
      "At B draw ray BX with ∠XBC = " + b + ".",
      "Mark D on ray BX with BD = " + n2(s.diff) + " cm (= AB − AC).",
      "Join DC.",
      "Draw the perpendicular bisector of DC. It meets ray BX at A.",
      "Join AC. △ABC is the required triangle."];
    if (s.mode === "diff") return [
      "Draw base BC = " + n2(s.a) + " cm.",
      "At B draw ray BX with ∠XBC = " + b + ".",
      "Mark D on the ray opposite to BX with BD = " + n2(s.diff) + " cm (= AC − AB).",
      "Join DC.",
      "Draw the perpendicular bisector of DC. It meets ray BX at A.",
      "Join AC. △ABC is the required triangle."];
    return [
      "Draw XY = " + n2(s.per) + " cm (= AB + BC + CA).",
      "At X draw an angle of ½∠B = " + n2(s.B / 2) + "°, at Y an angle of ½∠C = " + n2(s.C / 2) + "°. The rays meet at A.",
      "Draw the perpendicular bisector of AX. It meets XY at B.",
      "Draw the perpendicular bisector of AY. It meets XY at C.",
      "Join AB and AC. △ABC is the required triangle."];
  }
  function why(s) {
    if (s.mode === "sum") return "A is on the perpendicular bisector of DC, so AD = AC. Then AB + AC = AB + AD = BD = " + n2(s.sum) + " cm.";
    if (s.mode === "diff" && s.side === "AB") return "A is on the perpendicular bisector of DC, so AD = AC. Then AB − AC = AB − AD = BD = " + n2(s.diff) + " cm.";
    if (s.mode === "diff") return "A is on the perpendicular bisector of DC, so AC = AD = AB + BD. So AC − AB = BD = " + n2(s.diff) + " cm.";
    return "BX = BA and CY = CA (perpendicular bisectors), so the perimeter is XB + BC + CY = XY. Also ∠ABC = ∠BXA + ∠BAX = 2 × ½∠B (exterior angle).";
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "ct";
    var s = Object.assign({ mode: "sum", side: "AB", a: 8, B: 60, C: 60, sum: 12, diff: 2, per: 12 }, opts);
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches, clock = null;
    function nSteps() { return s.mode === "perim" ? 4 : 5; }
    s.prog = opts.prog != null ? opts.prog : nSteps();

    var k = K.frame(root, {
      label: "A triangle constructed step by step with compass and ruler",
      panel: K.chips("mode", "Given", [["sum", "BC, ∠B, AB + AC"], ["diff", "BC, ∠B, difference"], ["perim", "∠B, ∠C, perimeter"]]) +
        '<div data-for="diff"><div class="seg" data-group="side"><button type="button" data-v="AB" aria-pressed="true">AB − AC</button><button type="button" data-v="AC" aria-pressed="false">AC − AB</button></div></div>' +
        '<div data-for="sum diff">' + K.slider(id, "a", "Base BC", 2, 10, 0.1, "cm") + '</div>' +
        K.slider(id, "B", "∠B", 20, 150, 1, "°") +
        '<div data-for="perim">' + K.slider(id, "C", "∠C", 20, 150, 1, "°") + K.slider(id, "per", "Perimeter", 5, 30, 0.1, "cm") + '</div>' +
        '<div data-for="sum">' + K.slider(id, "sum", "AB + AC", 2, 20, 0.1, "cm") + '</div>' +
        '<div data-for="diff">' + K.slider(id, "diff", "Difference of sides", 0.1, 8, 0.1, "cm") + '</div>' +
        K.buttons([["play", "Play construction"], ["step", "Next step"]]) +
        K.hint("note"),
      readouts: [["ab", "AB", "c-path"], ["ac", "AC", "c-vy"], ["bc", "BC"], ["gb", "∠B"], ["gc", "∠C"], ["chk", "Check", "wrap"]],
      cols: 3
    });
    var list = document.createElement("ol"); list.className = "steps-list"; list.setAttribute("aria-live", "polite");
    root.querySelector(".sim-body").appendChild(list);
    var sideBox = root.querySelector('[data-group="side"]');

    function update() {
      var N = nSteps(); s.prog = clamp(s.prog, 0, N);
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for.split(" ").indexOf(s.mode) >= 0 ? "" : "none"; });
      sideBox.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === s.side)); });
      root.querySelector('input[data-k="diff"]').parentNode.querySelector("label").firstChild.nodeValue = (s.side === "AB" ? "AB − AC" : "AC − AB") + " ";
      var g = solve(s), done = s.prog >= N - 1e-9, n = Math.floor(s.prog + 1e-9), cur = Math.min(N, Math.ceil(s.prog - 1e-9));
      if (!g.ok) {
        ["ab", "ac", "bc", "gb", "gc"].forEach(function (q) { k.set(q, "–"); }); k.set("chk", "No triangle");
        k.el('[data-r="note"]').textContent = g.why;
        list.innerHTML = "";
      } else {
        var A = g.A, B = g.Bp, C = g.Cp, ab = M.dist(A, B), ac = M.dist(A, C), bc = M.dist(B, C);
        if (done) {
          k.set("ab", cm(ab)); k.set("ac", cm(ac)); k.set("bc", cm(bc));
          k.set("gb", n2(M.angleAt(A, B, C)) + "°"); k.set("gc", n2(M.angleAt(A, C, B)) + "°");
          k.set("chk", s.mode === "sum" ? "AB + AC = " + n2(ab) + " + " + n2(ac) + " = " + n2(ab + ac) + " cm"
            : s.mode === "perim" ? "AB + BC + CA = " + n2(ab + bc + ac) + " cm"
            : s.side === "AB" ? "AB − AC = " + n2(ab) + " − " + n2(ac) + " = " + n2(ab - ac) + " cm" : "AC − AB = " + n2(ac) + " − " + n2(ab) + " = " + n2(ac - ab) + " cm");
          k.el('[data-r="note"]').textContent = why(s);
        } else {
          ["ab", "ac", "gc"].forEach(function (q) { k.set(q, "–"); });
          k.set("bc", s.mode === "perim" ? "–" : cm(bc)); k.set("gb", s.mode === "perim" ? "–" : s.B + "°");
          k.set("chk", "Step " + (cur + 1) + " of " + (N + 1));
          k.el('[data-r="note"]').textContent = "Follow the steps below. Press “Next step” to draw the next one.";
        }
        list.innerHTML = steps(s).map(function (t, i) {
          var st = i <= cur ? (i === cur && !done ? "font-weight:700" : "") : "opacity:.45";
          return '<li style="' + st + '"' + (i === N && done ? ' class="final"' : "") + ">" + t + "</li>";
        }).join("");
      }
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var g = solve(s);
      if (!g.ok) {
        ctx.fillStyle = c.bad; ctx.font = "700 15px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("No triangle can be drawn", W / 2, H / 2 - 12);
        ctx.fillStyle = c.muted; ctx.font = "13px " + c.font; ctx.fillText("see the note beside the picture", W / 2, H / 2 + 12);
        return;
      }
      var pts = [g.A, g.Bp, g.Cp];
      if (g.D) { pts.push(g.D, add(g.pb.mid, g.pb.n, g.pb.h), add(g.pb.mid, g.pb.n, -g.pb.h)); var LL = Math.max(g.t, s.mode === "sum" ? s.sum : s.diff) * 1.12 + 0.5; pts.push([g.u[0] * LL, g.u[1] * LL]); }
      else { pts.push(g.X, g.Y); [g.pb1, g.pb2].forEach(function (q) { pts.push(add(q.mid, q.n, q.h), add(q.mid, q.n, -q.h)); }); }
      var xs = pts.map(function (p) { return p[0]; }), ys = pts.map(function (p) { return p[1]; });
      var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
      var sc = Math.min((W - 70) / (maxx - minx || 1), (H - 64) / (maxy - miny || 1));
      var ox = (W - (maxx - minx) * sc) / 2 - minx * sc, oy = (H + (maxy - miny) * sc) / 2 + miny * sc;
      var S = function (p) { return [ox + p[0] * sc, oy - p[1] * sc]; };
      var f = function (i) { return clamp(s.prog - (i - 1), 0, 1); };
      function seg(P, Q, col, w, frac, dash) {
        var u = frac == null ? 1 : frac; if (u <= 0) return; var a = S(P), b = S(Q);
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.setLineDash(dash || []);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u); ctx.stroke(); ctx.restore();
      }
      function arc(Cn, r, a0, a1, frac) {
        if (frac <= 0) return; var p = S(Cn), e = a0 + (a1 - a0) * frac;
        ctx.save(); ctx.strokeStyle = c.vx; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(p[0], p[1], r * sc, -a0, -e, a1 > a0); ctx.stroke(); ctx.restore();
      }
      function lab(P, t, col, dx, dy, size) { var p = S(P); ctx.fillStyle = col; ctx.font = "700 " + (size || 15) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, p[0] + dx, p[1] + dy); }
      function dot(P, col, r) { var p = S(P); M.dot(ctx, p[0], p[1], r || 4.5, col); }
      // a perpendicular bisector drawn with four arcs then the line, reaching point "hit"
      function bis(q, frac, hit) {
        if (frac <= 0) return;
        var X = add(q.mid, q.n, q.h), Y = add(q.mid, q.n, -q.h), w = 0.3;
        var aPX = Math.atan2(X[1] - q.P[1], X[0] - q.P[0]), aPY = Math.atan2(Y[1] - q.P[1], Y[0] - q.P[0]);
        var aQX = Math.atan2(X[1] - q.Q[1], X[0] - q.Q[0]), aQY = Math.atan2(Y[1] - q.Q[1], Y[0] - q.Q[0]);
        var u1 = clamp(frac * 1.6, 0, 1);
        arc(q.P, q.rr, aPX - w, aPX + w, u1); arc(q.P, q.rr, aPY - w, aPY + w, u1);
        arc(q.Q, q.rr, aQX - w, aQX + w, u1); arc(q.Q, q.rr, aQY - w, aQY + w, u1);
        var u2 = clamp((frac - 0.6) / 0.4, 0, 1);
        if (u2 > 0) {
          var th = (hit[0] - q.mid[0]) * q.n[0] + (hit[1] - q.mid[1]) * q.n[1];
          var lo = Math.min(-q.h, th) - 0.4, hi = Math.max(q.h, th) + 0.4;
          seg(add(q.mid, q.n, lo), add(q.mid, q.n, hi), c.vx, 1.6, u2, [6, 4]);
          if (u2 >= 1) { var m = S(q.mid), vv = [q.Q[0] - q.P[0], q.Q[1] - q.P[1]], L = Math.hypot(vv[0], vv[1]); vv = [vv[0] / L, -vv[1] / L]; var nn = [q.n[0], -q.n[1]], z = 7;
            ctx.save(); ctx.strokeStyle = c.vx; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(m[0] + vv[0] * z, m[1] + vv[1] * z); ctx.lineTo(m[0] + vv[0] * z + nn[0] * z, m[1] + vv[1] * z + nn[1] * z); ctx.lineTo(m[0] + nn[0] * z, m[1] + nn[1] * z); ctx.stroke(); ctx.restore(); }
        }
      }
      var A = g.A, B = g.Bp, C = g.Cp, G = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
      function vlab(P, t, col) { var p = S(P), q = S(G), dx = p[0] - q[0], dy = p[1] - q[1], d = Math.hypot(dx, dy) || 1; ctx.fillStyle = col; ctx.font = "700 15px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, p[0] + dx / d * 17, p[1] + dy / d * 17); }
      var N = nSteps(), done = s.prog >= N - 1e-9;

      if (s.mode !== "perim") {
        var u = g.u, L = Math.max(g.t, s.mode === "sum" ? s.sum : s.diff) * 1.12 + 0.5, Xp = [u[0] * L, u[1] * L];
        // step 5 / done: triangle fill
        if (done) { var a1 = S(A), b1 = S(B), c1 = S(C); ctx.fillStyle = c.tint; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(c1[0], c1[1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
        seg(B, C, c.ink, 3);
        dot(B, c.ink); dot(C, c.ink);
        // step 1: ray BX
        seg(B, Xp, c.muted, 2, f(1));
        if (f(1) >= 1) { lab(Xp, "X", c.muted, 10 * u[0] + 4, -10 * u[1] - 4, 13); M.arc(ctx, S(B), S(C), S(Xp), 20, c.muted, s.B + "°", c); }
        // step 2: D with a compass arc from B
        var D = g.D, aD = Math.atan2(D[1], D[0]), rD = M.dist(B, D);
        if (s.mode === "diff" && s.side === "AC" && f(2) > 0) seg(B, add(D, [-u[0], -u[1]], 0.5), c.muted, 2, f(2), [5, 4]);
        arc(B, rD, aD - 0.18, aD + 0.18, f(2));
        if (f(2) >= 1) { dot(D, c.vx); lab(D, "D", c.vx, -u[1] * 18, -u[0] * 18, 14); }
        // step 3: DC
        seg(D, C, c.vx, 1.8, f(3));
        // step 4: perpendicular bisector of DC, A on ray BX
        bis(g.pb, f(4), A);
        if (f(4) >= 1) { dot(A, c.path, 5); }
        // step 5: AC
        if (f(5) > 0) { seg(A, C, c.vy, 3, f(5)); }
        if (f(4) >= 1) { seg(B, A, c.path, 3); vlab(A, "A", c.path); }
        if (done) {   // equal marks on AD and AC
          [[A, D], [A, C]].forEach(function (pq) { var m = S([(pq[0][0] + pq[1][0]) / 2, (pq[0][1] + pq[1][1]) / 2]), a = Math.atan2(S(pq[1])[1] - S(pq[0])[1], S(pq[1])[0] - S(pq[0])[0]) + Math.PI / 2; ctx.strokeStyle = c.vy; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(m[0] - Math.cos(a) * 6, m[1] - Math.sin(a) * 6); ctx.lineTo(m[0] + Math.cos(a) * 6, m[1] + Math.sin(a) * 6); ctx.stroke(); });
        }
        vlab(B, "B", c.ink); vlab(C, "C", c.ink);
      } else {
        var X = g.X, Y = g.Y;
        if (done) { var a2 = S(A), b2 = S(B), c2 = S(C); ctx.fillStyle = c.tint; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(c2[0], c2[1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
        seg(X, Y, c.ink, 3); dot(X, c.ink); dot(Y, c.ink);
        lab(X, "X", c.ink, -6, 16); lab(Y, "Y", c.ink, 6, 16);
        // step 1: the two half-angle rays meeting at A
        seg(X, A, c.muted, 2, f(1)); seg(Y, A, c.muted, 2, f(1));
        if (f(1) >= 1) {
          M.arc(ctx, S(X), S(Y), S(A), 34, c.muted, n2(s.B / 2) + "°", c); M.arc(ctx, S(Y), S(X), S(A), 34, c.muted, n2(s.C / 2) + "°", c);
          dot(A, c.path, 5); vlab(A, "A", c.path);
        }
        bis(g.pb1, f(2), B); if (f(2) >= 1) { dot(B, c.path, 5); vlab(B, "B", c.ink); }
        bis(g.pb2, f(3), C); if (f(3) >= 1) { dot(C, c.vy, 5); vlab(C, "C", c.ink); }
        if (f(4) > 0) { seg(B, A, c.path, 3, f(4)); seg(C, A, c.vy, 3, f(4)); }
        if (done) { M.arc(ctx, S(B), S(C), S(A), 20, c.path, null, c); M.arc(ctx, S(C), S(B), S(A), 20, c.vy, null, c); }
      }
    };

    function animateTo(tg) {
      if (clock) clock.stop();
      if (reduce) { s.prog = tg; update(); return; }
      clock = K.clock(function (dt) { s.prog = Math.min(tg, s.prog + dt / 1.2); update(); return s.prog < tg; });
      clock.start();
    }
    function play() { s.prog = 0; update(); animateTo(nSteps()); }
    var keys = ["a", "B", "C", "sum", "diff", "per"];
    var shows = keys.map(function (q) {
      return k.bindSlider(q, function () { return s[q]; }, function (v) { s[q] = v; if (clock) clock.stop(); s.prog = nSteps(); update(); },
        function (v) { return q === "B" || q === "C" ? v + "°" : n2(v) + " cm"; });
    });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; if (clock) clock.stop(); s.prog = nSteps(); update(); });
    sideBox.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { s.side = b.dataset.v; s.prog = nSteps(); update(); } });
    k.onAct({ play: play, step: function () { var n = Math.floor(s.prog + 1e-9); if (n >= nSteps()) { s.prog = 0; update(); } else animateTo(n + 1); } });
    update();
    return {
      set: function (o) { if (clock) clock.stop(); Object.assign(s, o); s.prog = o.prog != null ? o.prog : nSteps(); shows.forEach(function (fn) { fn(); }); showM(); update(); },
      play: play,
      seek: function (t) { if (clock) clock.stop(); s.prog = t; update(); },
      state: function () { var g = solve(s); if (!g.ok) return { ok: false }; return { ok: true, AB: M.dist(g.A, g.Bp), AC: M.dist(g.A, g.Cp), BC: M.dist(g.Bp, g.Cp) }; }
    };
  }
  window.ConstrTriSim = { mount: mount, solve: solve };
})();
