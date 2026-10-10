/*
 * Word problems with two unknowns. Pick a problem, then move x and y until BOTH conditions are
 * true. Each condition is a straight line on the graph; the answer is where they cross.
 * Needs sim-kit.js and math-kit.js.  WordSim.mount(el, { p: "notes" }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, f = M.frac;
  // each condition: [a, b, k, words]  meaning a·x + b·y = k
  var PROBLEMS = {
    notes: { name: "Bank notes", text: "Meena has 45 notes, some of ₹5 and the rest of ₹10. Together they are worth ₹350. How many of each does she have?",
      x: "number of ₹5 notes", y: "number of ₹10 notes", max: [45, 45], c: [[1, 1, 45, "Number of notes: x + y = 45"], [5, 10, 350, "Value: 5x + 10y = 350"]] },
    ages: { name: "Ages", text: "A mother and her daughter are 50 years old altogether. Five years ago the mother was 7 times as old as the daughter. How old is each now?",
      x: "mother's age now", y: "daughter's age now", max: [50, 50], c: [[1, 1, 50, "Together: x + y = 50"], [1, -7, -30, "Five years ago: x − 5 = 7(y − 5), so x − 7y = −30"]] },
    digits: { name: "Digits", text: "A two-digit number has digits that add up to 9. Reversing the digits makes the number 27 bigger. Find the number.",
      x: "tens digit", y: "units digit", max: [9, 9], c: [[1, 1, 9, "Digits add to 9: x + y = 9"], [-9, 9, 27, "Reversed is 27 more: (10y + x) − (10x + y) = 27, so −9x + 9y = 27"]] },
    fraction: { name: "Fraction", text: "If 1 is added to both the numerator and the denominator of a fraction, it becomes 4/5. If 5 is subtracted from both, it becomes 1/2. Find the fraction.",
      x: "numerator", y: "denominator", max: [15, 15], c: [[5, -4, -1, "(x + 1)/(y + 1) = 4/5, so 5x − 4y = −1"], [2, -1, 5, "(x − 5)/(y − 5) = 1/2, so 2x − y = 5"]] },
    rectangle: { name: "Rectangle", text: "The perimeter of a rectangle is 40 cm. Its length is 4 cm more than its breadth. Find the length and breadth.",
      x: "length (cm)", y: "breadth (cm)", max: [20, 20], c: [[2, 2, 40, "Perimeter: 2x + 2y = 40"], [1, -1, 4, "Length is 4 more: x − y = 4"]] },
    zoo: { name: "Lions and peacocks", text: "In a zoo there are lions and peacocks. They have 45 heads and 130 legs altogether. How many lions and how many peacocks are there?",
      x: "number of lions", y: "number of peacocks", max: [45, 45], c: [[1, 1, 45, "Heads: x + y = 45"], [4, 2, 130, "Legs: 4x + 2y = 130"]] }
  };
  var ORDER = ["notes", "ages", "digits", "fraction", "rectangle", "zoo"];

  function answer(p) { var a = p.c[0], b = p.c[1], D = a[0] * b[1] - b[0] * a[1]; return [(a[2] * b[1] - b[2] * a[1]) / D, (a[0] * b[2] - b[0] * a[2]) / D]; }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "ws";
    var s = Object.assign({ p: "notes", x: 10, y: 10, eqs: false }, opts);

    var k = K.frame(root, {
      aspect: "4 / 3",
      label: "A graph of the two conditions of a word problem, with your guess (x, y) as a point",
      panel: K.chips("p", "Problem", ORDER.map(function (q) { return [q, PROBLEMS[q].name]; })) +
        '<p class="problem-text" data-r="text"></p>' +
        K.slider(id, "x", "x", 0, 50, 1, "") + K.slider(id, "y", "y", 0, 50, 1, "") +
        '<div class="checks">' + K.check(id, "eqs", "Show the lines on the graph", s.eqs) + '</div>' + K.hint("note"),
      readouts: [["xm", "x stands for", "wrap"], ["ym", "y stands for", "wrap"], ["ans", "Answer", "c-vy"],
                 ["c1", "Condition 1", "wrap"], ["c2", "Condition 2", "wrap"], ["both", "Both true?", "c-path"]],
      cols: 3
    });
    var labels = root.querySelectorAll(".ctl label");

    function prob() { return PROBLEMS[s.p]; }
    function ok(c) { return Math.abs(c[0] * s.x + c[1] * s.y - c[2]) < 1e-9; }
    function update() {
      var p = prob(), done = ok(p.c[0]) && ok(p.c[1]);
      k.el('[data-r="text"]').textContent = p.text;
      labels[0].firstChild.nodeValue = "x = " + p.x + " "; labels[1].firstChild.nodeValue = "y = " + p.y + " ";
      root.querySelector('input[data-k="x"]').max = p.max[0]; root.querySelector('input[data-k="y"]').max = p.max[1];
      k.set("xm", p.x); k.set("ym", p.y);
      p.c.forEach(function (c, i) {
        var v = c[0] * s.x + c[1] * s.y;
        k.set("c" + (i + 1), (ok(c) ? "✓ " : "✗ ") + c[3].split(":")[0] + ": " + f(v) + (ok(c) ? "" : " (need " + f(c[2]) + ")"));
      });
      k.set("both", done ? "Yes, solved!" : "Not yet");
      var a = answer(p);
      k.set("ans", done ? (s.p === "digits" ? "The number is " + (10 * a[0] + a[1]) : s.p === "fraction" ? "The fraction is " + a[0] + "/" + a[1] : "x = " + f(a[0]) + ", y = " + f(a[1])) : "?");
      k.el('[data-r="note"]').innerHTML = "Equations: " + p.c.map(function (c) { return c[3].split(": ")[1]; }).join("; ") +
        (done ? ". Both conditions hold, so this is the answer. Solving the two equations by elimination gives the same result." : ". Change x and y until both conditions turn green.");
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var p = prob(), R = Math.max(p.max[0], p.max[1] / 0.75) * 1.12;   // equal scales on a 4:3 grid
      var v = { xmin: -0.06 * R, xmax: 0.94 * R, ymin: -0.06 * R * 0.75, ymax: 0.94 * R * 0.75, step: M.niceStep(R, 10) };
      var P = M.plane(ctx, c, { x: 8, y: 8, w: W - 16, h: H - 16 }, v);
      if (s.eqs) { M.line(ctx, P, p.c[0][0], p.c[0][1], p.c[0][2], c.path, 3); M.line(ctx, P, p.c[1][0], p.c[1][1], p.c[1][2], c.vx, 3); }
      var both = ok(p.c[0]) && ok(p.c[1]), px = P.X(s.x), py = P.Y(s.y);
      M.dot(ctx, px, py, 9, both ? c.good : c.vy, c.surface);
      ctx.fillStyle = both ? c.good : c.vy; ctx.font = "700 13px " + c.font; ctx.textAlign = px > W - 120 ? "right" : "left"; ctx.textBaseline = "bottom";
      ctx.fillText("(" + f(s.x) + ", " + f(s.y) + ")" + (both ? " ✓" : ""), px + (px > W - 120 ? -12 : 12), py - 8);
      if (s.eqs) { ctx.font = "600 12px " + c.font; ctx.textAlign = "right"; ctx.textBaseline = "top"; ctx.fillStyle = c.path; ctx.fillText("condition 1", W - 14, 12); ctx.fillStyle = c.vx; ctx.fillText("condition 2", W - 14, 28); }
    };

    var showX = k.bindSlider("x", function () { return s.x; }, function (v) { s.x = v; update(); }, function (v) { return f(v); });
    var showY = k.bindSlider("y", function () { return s.y; }, function (v) { s.y = v; update(); }, function (v) { return f(v); });
    var showP = k.bindChips("p", function () { return s.p; }, function (v) { s.p = v; s.x = 0; s.y = 0; update(); showX(); showY(); });
    var eqBox = k.bindCheck("eqs", function (on) { s.eqs = on; update(); });
    update(); showX(); showY();
    return {
      set: function (o) { Object.assign(s, o); showP(); update(); showX(); showY(); eqBox.checked = s.eqs; },
      play: function () {}, seek: function () {}, answer: function () { return answer(prob()); }
    };
  }
  window.WordSim = { mount: mount, PROBLEMS: PROBLEMS, answer: answer };
})();
