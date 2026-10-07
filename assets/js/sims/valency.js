/*
 * Writing chemical formulae by cross-multiplying valencies (the criss-cross method).
 * Needs sim-kit.js and chem-kit.js.  FormulaSim.mount(el, { cat: "Al", an: "O" }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit, CH = window.ChemKit;

  var CATIONS = {
    Na:  { sym: "Na", name: "Sodium", v: 1 }, K: { sym: "K", name: "Potassium", v: 1 }, NH4: { sym: "NH4", name: "Ammonium", v: 1, poly: true },
    Mg:  { sym: "Mg", name: "Magnesium", v: 2 }, Ca: { sym: "Ca", name: "Calcium", v: 2 }, Cu: { sym: "Cu", name: "Copper(II)", v: 2 },
    Fe2: { sym: "Fe", name: "Iron(II)", v: 2 }, Fe3: { sym: "Fe", name: "Iron(III)", v: 3 }, Al: { sym: "Al", name: "Aluminium", v: 3 }
  };
  var ANIONS = {
    Cl:  { sym: "Cl", name: "chloride", v: 1 }, OH: { sym: "OH", name: "hydroxide", v: 1, poly: true }, NO3: { sym: "NO3", name: "nitrate", v: 1, poly: true },
    O:   { sym: "O", name: "oxide", v: 2 }, SO4: { sym: "SO4", name: "sulphate", v: 2, poly: true }, CO3: { sym: "CO3", name: "carbonate", v: 2, poly: true },
    PO4: { sym: "PO4", name: "phosphate", v: 3, poly: true }
  };

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function part(ion, n) { if (n === 1) return ion.sym; return (ion.poly ? "(" + ion.sym + ")" : ion.sym) + n; }
  function build(catKey, anKey) {
    var c = CATIONS[catKey], a = ANIONS[anKey], g = gcd(c.v, a.v), nc = a.v / g, na = c.v / g;
    var f = part(c, nc) + part(a, na);
    return { c: c, a: a, nc: nc, na: na, g: g, formula: f, name: c.name + " " + a.name, M: CH.mass(f) };
  }

  function charge(v, sign) { return (v > 1 ? v : "") + sign; }

  function mount(root, opts) {
    opts = opts || {};
    var s = Object.assign({ cat: "Al", an: "O" }, opts);

    var k = K.frame(root, {
      aspect: "5 / 2.6",
      label: "Criss-cross method: the valency of each ion becomes the number of the other ion in the formula",
      panel: K.chips("cat", "Metal or positive ion", Object.keys(CATIONS).map(function (q) { return [q, CATIONS[q].name + " " + CH.pretty(CATIONS[q].sym) + CH.sup(charge(CATIONS[q].v, "+"))]; })) +
        K.chips("an", "Non-metal or negative ion", Object.keys(ANIONS).map(function (q) { return [q, ANIONS[q].name + " " + CH.pretty(ANIONS[q].sym) + CH.sup(charge(ANIONS[q].v, "-"))]; })) +
        K.hint("note"),
      readouts: [["f", "Formula", "c-path"], ["name", "Name", "wrap"], ["ratio", "Ratio of ions"],
                 ["vc", "Valency of positive ion"], ["va", "Valency of negative ion"], ["M", "Formula mass (u)", "c-vy"]],
      cols: 3
    });

    function update() {
      var b = build(s.cat, s.an);
      k.set("f", CH.pretty(b.formula)); k.set("name", b.name); k.set("ratio", b.nc + " : " + b.na);
      k.set("vc", b.c.v); k.set("va", b.a.v); k.set("M", K.fmt(b.M, 1));
      k.el('[data-r="note"]').textContent = "Write the valencies, swap them over as subscripts" + (b.g > 1 ? ", then divide by " + b.g + " to get the simplest ratio" : "") + (b.c.poly && b.nc > 1 || b.a.poly && b.na > 1 ? ". A group like " + CH.pretty((b.c.poly && b.nc > 1 ? b.c : b.a).sym) + " goes in brackets when there is more than one." : ". A subscript of 1 is not written.");
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var b = build(s.cat, s.an), y1 = H * 0.24, y2 = H * 0.66, xL = W * 0.28, xR = W * 0.58, big = Math.min(38, W / 14);
      // Step 1: symbols with valencies above
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "700 " + big + "px " + c.font; ctx.fillStyle = c.path; ctx.fillText(CH.pretty(b.c.sym), xL, y1);
      ctx.fillStyle = c.vy; ctx.fillText(CH.pretty(b.a.sym), xR, y1);
      ctx.font = "700 16px " + c.font; ctx.fillStyle = c.ink;
      ctx.fillText(b.c.v, xL + big * 0.9, y1 - big * 0.65); ctx.fillText(b.a.v, xR + big * 0.95, y1 - big * 0.65);
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.fillText("valency", xL + big * 0.9, y1 - big * 0.65 - 16); ctx.fillText("valency", xR + big * 0.95, y1 - big * 0.65 - 16);
      // Step 2: crossing arrows to the subscript positions
      K.arrow(ctx, xL + big * 0.9, y1 - big * 0.35, xR + big * 0.75, y2 + big * 0.2, c.muted, 1.5, 8);
      K.arrow(ctx, xR + big * 0.95, y1 - big * 0.35, xL + big * 0.7, y2 + big * 0.2, c.muted, 1.5, 8);
      // Step 3: result before simplifying
      ctx.font = "700 " + big + "px " + c.font; ctx.fillStyle = c.path; ctx.fillText(CH.pretty(b.c.sym), xL, y2);
      ctx.fillStyle = c.vy; ctx.fillText(CH.pretty(b.a.sym), xR, y2);
      ctx.font = "700 18px " + c.font; ctx.fillStyle = c.ink;
      ctx.fillText(b.a.v, xL + big * 0.85, y2 + big * 0.35); ctx.fillText(b.c.v, xR + big * 0.9, y2 + big * 0.35);
      // Final formula on the right
      var fx = W * 0.86;
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.fillText(b.g > 1 ? "÷ " + b.g + ", simplest ratio" : "formula", fx, y1);
      ctx.fillStyle = c.vx; ctx.font = "700 " + Math.round(big * 0.8) + "px " + c.font; ctx.fillText(CH.pretty(b.formula), fx, (y1 + y2) / 2 + 6);
    };

    var showC = k.bindChips("cat", function () { return s.cat; }, function (v) { s.cat = v; update(); });
    var showA = k.bindChips("an", function () { return s.an; }, function (v) { s.an = v; update(); });
    update();
    return { set: function (o) { Object.assign(s, o); showC(); showA(); update(); }, seek: function () {}, play: function () {}, build: build };
  }

  window.FormulaSim = { mount: mount, build: build };
})();
