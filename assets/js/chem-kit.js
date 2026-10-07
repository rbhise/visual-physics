/*
 * ChemKit: atomic masses, atom colours and formula helpers for the chemistry simulations.
 * Load after sim-kit.js.
 */
(function () {
  "use strict";

  // Atomic masses (u) as used at Std 9 level, and fixed atom colours (outlined, so they read in both themes)
  var ATOMS = {
    H:  { name: "Hydrogen", mass: 1, color: "#f2f2f2" },
    C:  { name: "Carbon", mass: 12, color: "#4a4a4a" },
    N:  { name: "Nitrogen", mass: 14, color: "#3b6fd8" },
    O:  { name: "Oxygen", mass: 16, color: "#e0412f" },
    Na: { name: "Sodium", mass: 23, color: "#9b59d0" },
    Mg: { name: "Magnesium", mass: 24, color: "#3fa34d" },
    Al: { name: "Aluminium", mass: 27, color: "#b9b9c8" },
    P:  { name: "Phosphorus", mass: 31, color: "#f08a24" },
    S:  { name: "Sulphur", mass: 32, color: "#e8c62e" },
    Cl: { name: "Chlorine", mass: 35.5, color: "#5cc95c" },
    K:  { name: "Potassium", mass: 39, color: "#7a3fb0" },
    Ca: { name: "Calcium", mass: 40, color: "#8a8f6a" },
    Fe: { name: "Iron", mass: 56, color: "#c06a2b" },
    Cu: { name: "Copper", mass: 63.5, color: "#c27a4a" }
  };
  var AVOGADRO = 6.022e23;

  var SUB = "₀₁₂₃₄₅₆₇₈₉", SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  function sub(n) { return String(n).replace(/\d/g, function (d) { return SUB[d]; }); }
  function sup(n) { return String(n).replace(/\d/g, function (d) { return SUP[d]; }).replace(/-/g, "⁻").replace(/\+/g, "⁺"); }

  // Turn "H2SO4" style text into "H₂SO₄"
  function pretty(f) { return f.replace(/([A-Za-z\)])(\d+)/g, function (m, a, n) { return a + sub(n); }); }

  // Count atoms in a formula like "Ca(OH)2" or "(NH4)2SO4" → { Ca: 1, O: 2, H: 2 }
  function count(f) {
    var stack = [{}], re = /([A-Z][a-z]?|\(|\))(\d*)/g, m;
    while ((m = re.exec(f))) {
      var n = m[2] ? +m[2] : 1;
      if (m[1] === "(") stack.push({});
      else if (m[1] === ")") { var top = stack.pop(), cur = stack[stack.length - 1]; for (var k in top) cur[k] = (cur[k] || 0) + top[k] * n; }
      else { var c = stack[stack.length - 1]; c[m[1]] = (c[m[1]] || 0) + n; }
    }
    return stack[0];
  }

  function mass(f) { var c = count(f), M = 0; for (var k in c) M += ATOMS[k].mass * c[k]; return M; }

  // Scientific notation with superscript exponent, e.g. 6.02 × 10²³
  function sci(x, d) {
    if (x === 0) return "0";
    var e = Math.floor(Math.log10(Math.abs(x))), m = x / Math.pow(10, e);
    if (+m.toFixed(d == null ? 2 : d) >= 10) { m /= 10; e += 1; }
    if (e >= -2 && e <= 4) return (+x.toPrecision(4)).toString();
    return m.toFixed(d == null ? 2 : d) + " × 10" + sup(e);
  }

  function atom(ctx, x, y, r, el, c) {
    ctx.save();
    ctx.fillStyle = ATOMS[el].color; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
    var dark = ["C", "N", "Na", "K", "Fe", "Cu", "O", "Mg", "Ca"].indexOf(el) >= 0;
    if (r >= 8) { ctx.fillStyle = dark ? "#ffffff" : "#1a1a1a"; ctx.font = "700 " + Math.round(r * 0.85) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(el, x, y + 0.5); }
    ctx.restore();
  }

  window.ChemKit = { ATOMS: ATOMS, AVOGADRO: AVOGADRO, sub: sub, sup: sup, pretty: pretty, count: count, mass: mass, sci: sci, atom: atom };
})();
