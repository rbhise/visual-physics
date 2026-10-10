/*
 * Venn diagrams. A rectangle for the universal set U, circles for A and B, and a token for every element of U.
 * Drag a token into another region to change A and B. Shade A′, A ∩ B, A ∪ B and more with the chips.
 *   view "sub"   – subsets and complements (lesson 2): readouts U, A, B, the shaded set, its size, subset test
 *   view "ops"   – union and intersection (lesson 3): readouts check n(A ∪ B) = n(A) + n(B) − n(A ∩ B)
 *   view "count" – numbers only, for word problems: sliders for n(A), n(B), n(A ∩ B), n(U)
 * layout "overlap" | "inside" (B drawn inside A) | "apart" (no common part); chosen from the sets when not given.
 * Needs sim-kit.js.  SetsVennSim.mount(el, { view: "sub", U: [...], A: [...], B: [...], shade: "Ac" }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit;
  var NAMES = { A: "A", B: "B", Ac: "A′", Bc: "B′", AiB: "A ∩ B", AuB: "A ∪ B", AuBc: "(A ∪ B)′", AcBc: "A′ ∩ B′" };
  var CHIPS = { sub: ["A", "B", "Ac", "Bc"], ops: ["AiB", "AuB", "Ac", "Bc", "AuBc", "AcBc"], count: ["AiB", "AuB", "AuBc"] };
  var LABELS = {
    sub: ["Universal set U", "Set A", "Set B", "–", "–", "Subset?"],
    ops: ["Set A", "Set B", "–", "n(A), n(B)", "n(A ∩ B), n(A ∪ B)", "n(A) + n(B) − n(A ∩ B)"],
    count: ["Only A", "Only B", "Both", "Neither", "n(A ∪ B)", "n(A) + n(B) − n(A ∩ B)"]
  };

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "venn";
    var s = { view: "sub", U: [], A: [], B: [], shade: "A", layout: "overlap", nameA: "A", nameB: "B", nA: 30, nB: 25, nAB: 10, nU: 60 };
    var G = null, drag = null, dpos = null, downAt = null, moved = false, flash = "";

    var k = K.frame(root, {
      aspect: "16 / 10.5",
      label: "A Venn diagram: a rectangle for the universal set and two circles for sets A and B",
      panel: '<div data-r="chipbox"></div>' +
        '<div data-for="sub ops">' + K.chips("layout", "Draw the circles", [["overlap", "Overlapping"], ["inside", "B inside A"], ["apart", "Separate"]]) + '</div>' +
        '<div data-for="count">' + K.slider(id, "nA", "n(A)", 0, 60, 1, "") + K.slider(id, "nB", "n(B)", 0, 60, 1, "") +
        K.slider(id, "nAB", "n(A ∩ B)", 0, 60, 1, "") + K.slider(id, "nU", "n(U)", 0, 120, 1, "") + '</div>' +
        K.hint("note"),
      readouts: [["r1", "–", "wrap"], ["r2", "–", "wrap c-vx"], ["r3", "–", "wrap c-vy"], ["r4", "–", "wrap c-path"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span"), bs = root.querySelectorAll(".sim-readout b");
    var COLS = { sub: ["", "c-vx", "c-vy", "c-path", "", ""], ops: ["c-vx", "c-vy", "c-path", "", "", ""], count: ["c-vx", "c-vy", "c-path", "", "", ""] };
    var mq = window.matchMedia("(max-width: 760px)");
    function asp() { root.querySelector(".sim-stage").style.aspectRatio = mq.matches ? "4 / 3.2" : "16 / 10.5"; }
    if (mq.addEventListener) mq.addEventListener("change", asp); asp();

    // ---- set helpers
    function has(L, x) { return L.indexOf(x) >= 0; }
    function sortL(L) { return L.slice().sort(function (a, b) { var p = +a, q = +b; return isNaN(p) || isNaN(q) ? String(a).localeCompare(String(b)) : p - q; }); }
    function list(L) { return L.length ? "{" + sortL(L).join(", ") + "}" : "∅"; }
    function inter() { return s.A.filter(function (x) { return has(s.B, x); }); }
    function union() { return s.U.filter(function (x) { return has(s.A, x) || has(s.B, x); }); }
    function shaded() {
      return s.U.filter(function (x) {
        var a = has(s.A, x), b = has(s.B, x);
        return { A: a, B: b, Ac: !a, Bc: !b, AiB: a && b, AuB: a || b, AuBc: !a && !b, AcBc: !a && !b }[s.shade];
      });
    }
    function region(x) { var a = has(s.A, x), b = has(s.B, x); return a && b ? "ab" : a ? "a" : b ? "b" : "u"; }
    function autoLayout() {
      if (!s.B.length || !s.A.length) return "overlap";
      if (s.B.every(function (x) { return has(s.A, x); }) && s.B.length < s.A.length) return "inside";
      if (!inter().length) return "apart";
      return "overlap";
    }
    function fitLayout() {   // make the sets agree with the drawing
      if (s.layout === "inside") s.B.forEach(function (x) { if (!has(s.A, x)) s.A.push(x); });
      if (s.layout === "apart") s.B = s.B.filter(function (x) { return !has(s.A, x); });
    }
    function counts() {
      var ab = Math.min(s.nAB, s.nA, s.nB), un = s.nA + s.nB - ab;
      return { a: s.nA - ab, b: s.nB - ab, ab: ab, un: un, u: Math.max(0, s.nU - un) };
    }

    // ---- readouts and note
    function update() {
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for.split(" ").indexOf(s.view) >= 0 ? "" : "none"; });
      var cb = k.el('[data-r="chipbox"]');
      if (cb.dataset.view !== s.view) {
        cb.dataset.view = s.view;
        cb.innerHTML = K.chips("shade", "Shade", CHIPS[s.view].map(function (q) { return [q, NAMES[q]]; }));
      }
      cb.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === s.shade); });
      var lab = LABELS[s.view].slice(), nm = NAMES[s.shade], note = "";
      if (s.view === "count") {
        if (s.nAB > Math.min(s.nA, s.nB)) { s.nAB = Math.min(s.nA, s.nB); showAB(); }
        var C = counts();
        if (s.nU < C.un) { s.nU = C.un; showU(); }
        C = counts();
        lab[0] = "Only " + s.nameA; lab[1] = "Only " + s.nameB;
        k.set("r1", String(C.a)); k.set("r2", String(C.b)); k.set("r3", String(C.ab)); k.set("r4", String(C.u));
        k.set("r5", String(C.un)); k.set("r6", s.nA + " + " + s.nB + " − " + C.ab + " = " + C.un + " ✓");
        note = "n(A) = " + s.nA + " counts the " + C.ab + " in both, and so does n(B) = " + s.nB + ". Subtract n(A ∩ B) once: n(A ∪ B) = " + C.un +
          ". Of the " + s.nU + " in U, " + C.u + " are in neither set.";
      } else {
        var A = s.A, B = s.B, I = inter(), Un = union(), S = shaded();
        if (s.view === "sub") {
          lab[3] = nm; lab[4] = "n(" + nm + ")";
          k.set("r1", list(s.U)); k.set("r2", list(A)); k.set("r3", list(B)); k.set("r4", list(S)); k.set("r5", String(S.length));
          var bA = B.every(function (x) { return has(A, x); }), aB = A.every(function (x) { return has(B, x); });
          k.set("r6", bA && aB ? "A = B" : bA ? "B ⊆ A" : aB ? "A ⊆ B" : "neither");
          var bad = B.filter(function (x) { return !has(A, x); })[0];
          if (s.shade === "Ac" || s.shade === "Bc") {
            var X = s.shade === "Ac" ? "A" : "B", XL = s.shade === "Ac" ? A : B;
            note = X + "′ = " + list(S) + ": the elements of U that are not in " + X + ". n(" + X + ") + n(" + X + "′) = " + XL.length + " + " + S.length + " = " + s.U.length + " = n(U).";
          } else {
            note = s.shade + " = " + list(s.shade === "A" ? A : B) + ". ";
            if (!B.length) note += "B = ∅, and the empty set is a subset of every set.";
            else if (bA) note += "Every element of B is also in A, so B ⊆ A (B is a subset of A).";
            else note += bad + " ∈ B but " + bad + " ∉ A, so B is not a subset of A.";
          }
        } else {
          lab[2] = nm;
          k.set("r1", list(A)); k.set("r2", list(B)); k.set("r3", list(S));
          k.set("r4", A.length + ", " + B.length); k.set("r5", I.length + ", " + Un.length);
          k.set("r6", A.length + " + " + B.length + " − " + I.length + " = " + Un.length + " ✓");
          if (s.shade === "AiB") note = "A ∩ B = " + list(I) + ": the elements common to A and B.";
          else if (s.shade === "AuB") note = "A ∪ B = " + list(Un) + ": every element of A or B or both, each written once.";
          else if (s.shade === "Ac" || s.shade === "Bc") note = nm + " = " + list(S) + ": the elements of U that are not in " + nm.charAt(0) + ".";
          else note = nm + " = " + list(S) + ". Shade (A ∪ B)′ and then A′ ∩ B′: the same region, so (A ∪ B)′ = A′ ∩ B′.";
          if (s.shade === "AiB" && !I.length && A.length && B.length) note = "A and B have no common element, so A ∩ B = ∅: they are disjoint sets.";
          else if (s.shade === "AiB" || s.shade === "AuB") {
            if (!I.length && A.length && B.length) note += " A and B have no common element: they are disjoint sets.";
            else if (B.length && B.every(function (x) { return has(A, x); })) note += " Here B ⊆ A, so A ∩ B = B and A ∪ B = A.";
          }
        }
      }
      if (flash) { note = flash + " " + note; flash = ""; }
      LABELS[s.view].forEach(function (t, i) { spans[i].textContent = lab[i]; bs[i].className = "wrap " + COLS[s.view][i]; });
      k.el('[data-r="note"]').textContent = note;
      showL();
      k.redraw();
    }

    // ---- geometry
    function circles(W, H) {
      var R = { x: 8, y: 8, w: W - 16, h: H - 16 }, cx = R.x + R.w / 2, cy = R.y + R.h / 2 + 6, lay = s.view === "count" ? "overlap" : s.layout;
      var ca, cb;
      if (lay === "inside") {
        var r = Math.min(R.w * 0.31, R.h * 0.42); ca = { x: cx - r * 0.12, y: cy, r: r }; cb = { x: cx + r * 0.3, y: cy, r: r * 0.56 };
      } else if (lay === "apart") {
        var r2 = Math.min(R.w * 0.2, R.h * 0.4); ca = { x: R.x + R.w * 0.29, y: cy, r: r2 }; cb = { x: R.x + R.w * 0.71, y: cy, r: r2 };
      } else {
        var r3 = Math.min(R.w * 0.25, R.h * 0.41), d = r3 * 1.15; ca = { x: cx - d / 2, y: cy, r: r3 }; cb = { x: cx + d / 2, y: cy, r: r3 };
      }
      return { R: R, ca: ca, cb: cb, lay: lay };
    }
    function inC(p, c) { return Math.hypot(p[0] - c.x, p[1] - c.y) < c.r; }
    function slots(g, tr) {
      var sp = 2 * tr + 5, R = g.R, out = { a: [], b: [], ab: [], u: [] };
      for (var y = R.y + tr + 4; y <= R.y + R.h - tr - 4; y += sp)
        for (var x = R.x + tr + 4; x <= R.x + R.w - tr - 4; x += sp) {
          if (x < R.x + 30 && y < R.y + 30) continue;   // room for the label U
          var da = Math.hypot(x - g.ca.x, y - g.ca.y), db = Math.hypot(x - g.cb.x, y - g.cb.y), m = tr + 3;
          var ia = da < g.ca.r - m, oa = da > g.ca.r + m, ib = db < g.cb.r - m, ob = db > g.cb.r + m;
          var key = ia && ib ? "ab" : ia && ob ? "a" : oa && ib ? "b" : oa && ob ? "u" : null;
          if (key) out[key].push([x, y]);
        }
      var mid = [(g.ca.x + g.cb.x) / 2, g.ca.y];
      var anchor = { a: g.lay === "inside" ? [g.ca.x - g.ca.r * 0.55, g.ca.y] : [g.ca.x - g.ca.r * 0.3, g.ca.y], b: [g.cb.x + g.cb.r * 0.3, g.cb.y], ab: g.lay === "inside" ? [g.cb.x, g.cb.y] : mid };
      ["a", "b", "ab"].forEach(function (q) { var A = anchor[q]; out[q].sort(function (p, r) { return Math.hypot(p[0] - A[0], p[1] - A[1]) - Math.hypot(r[0] - A[0], r[1] - A[1]); }); });
      var corners = [[R.x + R.w, R.y + R.h], [R.x, R.y + R.h], [R.x + R.w, R.y], [R.x, R.y]];
      out.u.sort(function (p, r) {
        function dc(q) { return Math.min.apply(null, corners.map(function (c) { return Math.hypot(q[0] - c[0], q[1] - c[1]); })); }
        return dc(p) - dc(r);
      });
      return out;
    }
    function layoutTokens(W, H) {
      var g = circles(W, H), groups = { a: [], b: [], ab: [], u: [] };
      sortL(s.U).forEach(function (x) { groups[region(x)].push(x); });
      var tr = Math.max(9, Math.min(20, W / 28)), sl;
      for (; tr >= 8; tr -= 0.5) {
        sl = slots(g, tr);
        if (["a", "b", "ab", "u"].every(function (q) { return sl[q].length >= groups[q].length; })) break;
      }
      g.tr = tr; g.at = {};
      ["a", "b", "ab", "u"].forEach(function (q) {
        var pts = sl[q].slice(0, groups[q].length);
        pts.sort(function (p, r) { return Math.abs(p[1] - r[1]) > 2 ? p[1] - r[1] : p[0] - r[0]; });   // read left to right, top to bottom
        groups[q].forEach(function (x, i) { g.at[x] = pts[i] || [g.R.x + 20 + i * 4, g.R.y + g.R.h - 20]; });
      });
      return g;
    }

    // ---- drawing
    k.draw = function (ctx, W, H, c) {
      G = s.view === "count" ? circles(W, H) : layoutTokens(W, H);
      var R = G.R, A = G.ca, B = G.cb;
      function circ(q) { ctx.moveTo(q.x + q.r, q.y); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); }
      function rect() { ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); }
      // shading
      ctx.save();
      var sh = s.shade;
      ctx.fillStyle = c.path; ctx.globalAlpha = 0.24;
      if (sh === "A") { ctx.beginPath(); circ(A); ctx.fill(); }
      else if (sh === "B") { ctx.beginPath(); circ(B); ctx.fill(); }
      else if (sh === "AiB") { ctx.save(); ctx.beginPath(); circ(A); ctx.clip(); ctx.beginPath(); circ(B); ctx.fill(); ctx.restore(); }
      else if (sh === "AuB") { ctx.beginPath(); circ(A); circ(B); ctx.fill("nonzero"); }
      else {
        // complements: shade U, then clear the circles
        rect(); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = c.surface; ctx.beginPath();
        if (sh === "Ac" || sh === "AuBc" || sh === "AcBc") circ(A);
        if (sh === "Bc" || sh === "AuBc" || sh === "AcBc") circ(B);
        ctx.fill("nonzero");
      }
      ctx.restore();
      // outlines and labels
      ctx.lineWidth = 2; ctx.strokeStyle = c.ink; ctx.strokeRect(R.x, R.y, R.w, R.h);
      ctx.strokeStyle = c.vx; ctx.lineWidth = 2.5; ctx.beginPath(); circ(A); ctx.stroke();
      ctx.strokeStyle = c.vy; ctx.beginPath(); circ(B); ctx.stroke();
      ctx.font = "700 16px " + c.font; ctx.textBaseline = "top"; ctx.textAlign = "left"; ctx.fillStyle = c.ink;
      ctx.fillText("U", R.x + 8, R.y + 6);
      var nA = s.view === "count" ? s.nameA : "A", nB = s.view === "count" ? s.nameB : "B";
      function lab(q, t, col, left) {
        var ang = left ? -Math.PI * 0.75 : -Math.PI * 0.25, x = q.x + Math.cos(ang) * (q.r + 6), y = q.y + Math.sin(ang) * (q.r + 6);
        var w = ctx.measureText(t).width, R0 = G.R;
        if (left) x = Math.max(x, R0.x + 30 + w); else x = Math.min(x, R0.x + R0.w - 6 - w);
        y = Math.max(y, R0.y + 24);
        ctx.fillStyle = col; ctx.textAlign = left ? "right" : "left"; ctx.textBaseline = "bottom"; ctx.fillText(t, x, y);
      }
      lab(A, nA, c.vx, true);
      if (G.lay === "inside") { ctx.font = "700 15px " + c.font; ctx.fillStyle = c.vy; ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(nB, B.x, B.y - B.r - 3); }
      else lab(B, nB, c.vy, false);

      if (s.view === "count") {
        var C = counts(), big = Math.max(14, Math.min(24, W / 26));
        ctx.font = "700 " + big + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = c.ink;
        var lens = (A.x + A.r + B.x - B.r) / 2;
        ctx.fillText(String(C.a), (A.x - A.r + B.x - B.r) / 2, A.y);
        ctx.fillText(String(C.ab), lens, A.y);
        ctx.fillText(String(C.b), (A.x + A.r + B.x + B.r) / 2, B.y);
        ctx.font = "13px " + c.font; ctx.fillStyle = c.muted; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
        ctx.fillText("neither: " + C.u, R.x + R.w - 8, R.y + R.h - 6);
        ctx.textAlign = "left"; ctx.fillText("n(U) = " + s.nU, R.x + 8, R.y + R.h - 6);
        return;
      }
      // tokens
      var S = shaded(), tr = G.tr;
      sortL(s.U).forEach(function (x) {
        if (x === drag) return;
        tok(ctx, c, G.at[x], x, has(S, x), tr, false);
      });
      if (drag != null && dpos) tok(ctx, c, dpos, drag, has(S, drag), tr, true);
    };
    function tok(ctx, c, p, x, on, tr, lifted) {
      ctx.beginPath(); ctx.arc(p[0], p[1], tr, 0, Math.PI * 2);
      ctx.fillStyle = on ? c.path : c.surface; ctx.fill();
      ctx.strokeStyle = on ? c.path : c.ink; ctx.lineWidth = lifted ? 3 : 1.5; ctx.stroke();
      var t = String(x); ctx.fillStyle = on ? c.surface : c.ink;
      ctx.font = "700 " + Math.round(tr * (t.length > 2 ? 0.7 : 0.95)) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(t, p[0], p[1] + 1);
    }

    // ---- dragging
    function pt(e) { var r = k.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    k.canvas.addEventListener("pointerdown", function (e) {
      if (!G || s.view === "count") return; var p = pt(e);
      var hit = null; s.U.forEach(function (x) { var q = G.at[x]; if (q && Math.hypot(q[0] - p[0], q[1] - p[1]) <= G.tr + 3) hit = x; });
      if (hit == null) return;
      drag = hit; dpos = G.at[hit]; downAt = p; moved = false; k.canvas.setPointerCapture(e.pointerId);
    });
    k.canvas.addEventListener("pointermove", function (e) {
      if (drag == null) return; var p = pt(e);
      if (!moved && Math.hypot(p[0] - downAt[0], p[1] - downAt[1]) < 5) return;
      moved = true; dpos = p; k.redraw();
    });
    function end() {
      if (drag == null) return; var x = drag, p = dpos, R = G.R;
      drag = null; dpos = null;
      if (moved && p[0] > R.x && p[0] < R.x + R.w && p[1] > R.y && p[1] < R.y + R.h) {
        var a = inC(p, G.ca), b = inC(p, G.cb);
        s.A = s.A.filter(function (y) { return y !== x; }); s.B = s.B.filter(function (y) { return y !== x; });
        if (a) s.A.push(x); if (b) s.B.push(x);
        flash = x + (a ? " ∈ A" : " ∉ A") + ", " + x + (b ? " ∈ B." : " ∉ B.");
      }
      update();
    }
    k.canvas.addEventListener("pointerup", end);
    k.canvas.addEventListener("pointercancel", end);

    // ---- controls
    k.el('[data-r="chipbox"]').addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { s.shade = b.dataset.v; update(); } });
    var showL = k.bindChips("layout", function () { return s.layout; }, function (v) {
      var before = s.A.length + "," + s.B.length + "," + inter().length;
      s.layout = v; fitLayout();
      if (before !== s.A.length + "," + s.B.length + "," + inter().length)
        flash = v === "inside" ? "Drawing B inside A put every element of B into A." : "Separate circles have no common part, so the common elements stay in A only.";
      update();
    });
    function cnt(key) { return k.bindSlider(key, function () { return s[key]; }, function (v) { s[key] = v; update(); }, function (v) { return String(v); }); }
    var showA = cnt("nA"), showB = cnt("nB"), showAB = cnt("nAB"), showU = cnt("nU");

    function set(o) {
      o = Object.assign({}, o);
      ["U", "A", "B"].forEach(function (q) { if (o[q]) o[q] = o[q].map(String); });
      Object.assign(s, o);
      s.A = s.A.filter(function (x) { return has(s.U, x); }); s.B = s.B.filter(function (x) { return has(s.U, x); });
      if (!o.layout && (o.A || o.B)) s.layout = autoLayout();
      fitLayout();
      if (CHIPS[s.view].indexOf(s.shade) < 0) s.shade = CHIPS[s.view][0];
      showA(); showB(); showAB(); showU();
      update();
    }
    set(Object.assign({ U: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], A: [2, 4, 6, 8, 10], B: [3, 6, 9] }, opts));
    return {
      set: set, play: function () {}, seek: function () {},
      state: function () { return { A: sortL(s.A), B: sortL(s.B), U: sortL(s.U), shaded: sortL(shaded()), layout: s.layout, counts: counts() }; }
    };
  }
  window.SetsVennSim = { mount: mount };
})();
