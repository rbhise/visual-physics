/*
 * Chords of a circle (Std 9 Geometry Ch. 6).
 *   chord – drag A or B round the circle. The perpendicular OM from the centre always bisects AB,
 *           and OA² = OM² + AM² links radius, distance and half-chord.
 *   equal – two chords: congruent chords are equidistant from the centre, and the converse.
 * Needs sim-kit.js and math-kit.js.  CircleChordSim.mount(el, { mode: "chord", r: 10, d: 6 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, TAU = Math.PI * 2;
  function n2(x) { return String(+x.toFixed(2)); }
  function cm(x) { return n2(x) + " cm"; }
  function norm(ch) {   // keep 0 ≤ phi ≤ π/2 so that d = r cos(phi) ≥ 0
    ch.phi = Math.max(0.02, Math.min(Math.PI - 0.02, ch.phi));
    if (ch.phi > Math.PI / 2) { ch.rot += Math.PI; ch.phi = Math.PI - ch.phi; }
    ch.rot = ((ch.rot % TAU) + TAU) % TAU;
  }
  var LABELS = {
    chord: ["Radius OA", "Distance OM", "Chord AB", "AM", "MB", "∠OMA"],
    equal: ["Chord AB", "Chord CD", "Distance OM", "Distance ON", "AB = CD?", "OM = ON?"]
  };

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "cc";
    var s = { mode: opts.mode || "chord", r: opts.r || 10 };
    var ch = [{ rot: Math.PI / 2, phi: 0 }, { rot: -Math.PI / 4 - 0.3, phi: 0 }];
    function setD(i, d) { ch[i].phi = Math.acos(Math.max(0, Math.min(0.999, d / s.r))); norm(ch[i]); }
    function getD(i) { return s.r * Math.cos(ch[i].phi); }
    setD(0, opts.d != null ? opts.d : 6); setD(1, opts.d2 != null ? opts.d2 : 6);

    var k = K.frame(root, {
      label: "A circle with chords, the perpendicular from the centre and their lengths",
      panel: K.chips("mode", "Show", [["chord", "One chord"], ["equal", "Two chords"]]) +
        K.slider(id, "r", "Radius", 3, 15, 0.5, "cm") +
        K.slider(id, "d", "Distance of AB from O", 0, 14, 0.1, "cm") +
        '<div data-for="equal">' + K.slider(id, "d2", "Distance of CD from O", 0, 14, 0.1, "cm") + '</div>' +
        K.hint("note"),
      readouts: [["r1", "–", "c-path"], ["r2", "–", "c-vy"], ["r3", "–"], ["r4", "–"], ["r5", "–"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");
    var dIn = root.querySelector('input[data-k="d"]'), d2In = root.querySelector('input[data-k="d2"]');

    function ends(i) { var c = ch[i]; return [[s.r * Math.cos(c.rot - c.phi), s.r * Math.sin(c.rot - c.phi)], [s.r * Math.cos(c.rot + c.phi), s.r * Math.sin(c.rot + c.phi)]]; }
    function mid(i) { var d = getD(i); return [d * Math.cos(ch[i].rot), d * Math.sin(ch[i].rot)]; }

    function update() {
      LABELS[s.mode].forEach(function (t, i) { spans[i].textContent = t; });
      root.querySelectorAll("[data-for]").forEach(function (e) { e.style.display = e.dataset.for === s.mode ? "" : "none"; });
      dIn.max = d2In.max = Math.max(0, s.r - 0.5);
      k.el('[data-r="r2"]').className = s.mode === "equal" ? "c-vx" : "c-vy";
      var d1 = getD(0), L1 = 2 * s.r * Math.sin(ch[0].phi), E = ends(0), Mm = mid(0);
      var note;
      if (s.mode === "chord") {
        var am = M.dist(E[0], Mm), mb = M.dist(E[1], Mm);
        k.set("r1", cm(s.r)); k.set("r2", cm(d1)); k.set("r3", cm(L1)); k.set("r4", cm(am)); k.set("r5", cm(mb));
        k.set("r6", d1 < 0.005 ? "AB is a diameter" : "90°");
        note = d1 < 0.005 ? "The chord passes through the centre: it is a diameter, the longest chord, " + cm(2 * s.r) + "."
          : "OM ⊥ AB and AM = MB = " + cm(am) + ". In right △OMA: OA² = OM² + AM², " + n2(s.r) + "² = " + n2(d1) + "² + " + n2(am) + "².";
      } else {
        var d2 = getD(1), L2 = 2 * s.r * Math.sin(ch[1].phi), eqL = n2(L1) === n2(L2), eqD = n2(d1) === n2(d2);
        k.set("r1", cm(L1)); k.set("r2", cm(L2)); k.set("r3", cm(d1)); k.set("r4", cm(d2));
        k.set("r5", eqL ? "Yes" : "No"); k.set("r6", eqD ? "Yes" : "No");
        note = eqL ? "The chords are congruent, and they are the same distance from the centre. Equal distances also mean equal chords (the converse)."
          : "The chord nearer the centre is the longer one. Make the distances equal and the chords become congruent.";
      }
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    var view = null;
    k.draw = function (ctx, W, H, c) {
      var sc = Math.min(W, H) * 0.42 / s.r, ox = W / 2, oy = H / 2;
      var S = function (p) { return [ox + p[0] * sc, oy - p[1] * sc]; };
      view = { S: S, inv: function (x, y) { return [(x - ox) / sc, (oy - y) / sc]; } };
      var O = S([0, 0]);
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(O[0], O[1], s.r * sc, 0, TAU); ctx.stroke();
      M.dot(ctx, O[0], O[1], 5, c.ink);
      function txt(P, t, col, dx, dy, f) { ctx.fillStyle = col; ctx.font = (f || "700 14px ") + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, P[0] + dx, P[1] + dy); }
      function chord(i, names, col) {
        var E = ends(i), A = S(E[0]), B = S(E[1]), m = mid(i), Mp = S(m), d = getD(i), u = [Math.cos(ch[i].rot), -Math.sin(ch[i].rot)];
        if (s.mode === "chord" && d > 0.005) {
          ctx.fillStyle = c.tint; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(Mp[0], Mp[1]); ctx.lineTo(A[0], A[1]); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
          ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = c.path; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(A[0], A[1]); ctx.stroke(); ctx.restore();
          var ra = S([(E[0][0]) / 2, (E[0][1]) / 2]), nrm = [-(A[1] - O[1]), A[0] - O[0]], L = Math.hypot(nrm[0], nrm[1]) || 1, sg = (nrm[0] * (Mp[0] - O[0]) + nrm[1] * (Mp[1] - O[1])) > 0 ? -1 : 1;
          txt(ra, "r = " + n2(s.r), c.path, sg * nrm[0] / L * 22, sg * nrm[1] / L * 22, "700 12px ");
        }
        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); ctx.lineCap = "butt";
        if (d > 0.005) {
          ctx.strokeStyle = c.vy; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(O[0], O[1]); ctx.lineTo(Mp[0], Mp[1]); ctx.stroke();
          var v = [(B[0] - A[0]), (B[1] - A[1])], vl = Math.hypot(v[0], v[1]) || 1; v = [v[0] / vl, v[1] / vl]; var q = 9;
          ctx.strokeStyle = c.vy; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(Mp[0] - u[0] * q, Mp[1] - u[1] * q); ctx.lineTo(Mp[0] - u[0] * q + v[0] * q, Mp[1] - u[1] * q + v[1] * q); ctx.lineTo(Mp[0] + v[0] * q, Mp[1] + v[1] * q); ctx.stroke();
          // equal ticks on the two halves
          [[A, Mp], [Mp, B]].forEach(function (pq) { var mx = (pq[0][0] + pq[1][0]) / 2, my = (pq[0][1] + pq[1][1]) / 2; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx - u[0] * 7, my - u[1] * 7); ctx.lineTo(mx + u[0] * 7, my + u[1] * 7); ctx.stroke(); });
          txt(Mp, names[2], c.vy, u[0] * 16 + v[0] * 14, u[1] * 16 + v[1] * 14);
          var om = [(O[0] + Mp[0]) / 2, (O[1] + Mp[1]) / 2];
          txt(om, n2(d), c.vy, -v[0] * 18, -v[1] * 18, "700 12px ");
        }
        M.dot(ctx, A[0], A[1], 7, col, c.surface); M.dot(ctx, B[0], B[1], 7, col, c.surface);
        var oa = [A[0] - O[0], A[1] - O[1]], ol = Math.hypot(oa[0], oa[1]), ob = [B[0] - O[0], B[1] - O[1]];
        txt(A, names[0], col, oa[0] / ol * 18, oa[1] / ol * 18); txt(B, names[1], col, ob[0] / ol * 18, ob[1] / ol * 18);
        // chord length beside the chord, clear of the tick marks
        if (d > 0.005) { var lp = [B[0] + (A[0] - B[0]) * 0.25, B[1] + (A[1] - B[1]) * 0.25]; txt(lp, n2(2 * s.r * Math.sin(ch[i].phi)) + " cm", col, -u[0] * 22, -u[1] * 22, "700 12px "); }
      }
      chord(0, ["A", "B", "M"], c.path);
      if (s.mode === "equal") chord(1, ["C", "D", "N"], c.vx);
      txt(O, "O", c.ink, -12, 12);
    };

    var drag = null;
    function pick(e) {
      var r = k.canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, best = null, bd = 30;
      [0, 1].forEach(function (i) { if (i === 1 && s.mode !== "equal") return; ends(i).forEach(function (P, j) { var p = view.S(P), dd = Math.hypot(p[0] - x, p[1] - y); if (dd < bd) { bd = dd; best = [i, j]; } }); });
      return best;
    }
    function move(e) {
      var r = k.canvas.getBoundingClientRect(), w = view.inv(e.clientX - r.left, e.clientY - r.top), a = Math.atan2(w[1], w[0]);
      var i = drag[0], c0 = ch[i], other = drag[1] === 0 ? c0.rot + c0.phi : c0.rot - c0.phi;
      var diff = Math.atan2(Math.sin(other - a), Math.cos(other - a));   // signed, −π..π
      c0.rot = a + diff / 2; c0.phi = Math.abs(diff) / 2;
      norm(c0);
      // keep the drag on the same endpoint after normalising
      var E = ends(i); drag[1] = M.dist(E[0], [s.r * Math.cos(a), s.r * Math.sin(a)]) < M.dist(E[1], [s.r * Math.cos(a), s.r * Math.sin(a)]) ? 0 : 1;
      showD(); showD2(); update();
    }
    k.canvas.addEventListener("pointerdown", function (e) { if (!view) return; drag = pick(e); if (drag) { k.canvas.setPointerCapture(e.pointerId); move(e); } });
    k.canvas.addEventListener("pointermove", function (e) { if (drag) move(e); });
    k.canvas.addEventListener("pointerup", function () { drag = null; });
    k.canvas.addEventListener("pointercancel", function () { drag = null; });

    var showR = k.bindSlider("r", function () { return s.r; }, function (v) { var d1 = getD(0), d2 = getD(1); s.r = v; setD(0, Math.min(d1, v - 0.5)); setD(1, Math.min(d2, v - 0.5)); showD(); showD2(); update(); }, function (v) { return n2(v) + " cm"; });
    var showD = k.bindSlider("d", function () { return +getD(0).toFixed(2); }, function (v) { setD(0, v); update(); }, function (v) { return n2(v) + " cm"; });
    var showD2 = k.bindSlider("d2", function () { return +getD(1).toFixed(2); }, function (v) { setD(1, v); update(); }, function (v) { return n2(v) + " cm"; });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; update(); });
    update(); showD(); showD2();

    return {
      set: function (o) {
        if (o.mode) s.mode = o.mode; if (o.r) s.r = o.r;
        if (o.rot != null) ch[0].rot = o.rot * Math.PI / 180;
        if (o.d != null) setD(0, o.d); else setD(0, Math.min(getD(0), s.r - 0.5));
        if (o.d2 != null) setD(1, o.d2); else setD(1, Math.min(getD(1), s.r - 0.5));
        showR(); dIn.max = d2In.max = Math.max(0, s.r - 0.5); showD(); showD2(); showM(); update();
      },
      play: function () {}, seek: function () {},
      state: function () { return { r: s.r, d: getD(0), d2: getD(1), L1: 2 * s.r * Math.sin(ch[0].phi), L2: 2 * s.r * Math.sin(ch[1].phi) }; }
    };
  }
  window.CircleChordSim = { mount: mount };
})();
