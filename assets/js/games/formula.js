/*
 * Game: Formula Race. Two ions appear; pick the correct chemical formula from four choices.
 * 60 seconds, +10 for each correct answer and a bonus for streaks. A review at the end shows
 * the ones you missed. "Practice" mode has no timer.
 * Criss-cross rule: each ion's valency becomes the other's subscript; simplify; bracket radicals.
 * FormulaGame.mount(el)
 */
(function () {
  "use strict";
  var SUB = "₀₁₂₃₄₅₆₇₈₉";
  var CATIONS = [
    { s: "Na", n: "Sodium", v: 1 }, { s: "K", n: "Potassium", v: 1 }, { s: "NH₄", n: "Ammonium", v: 1, poly: true },
    { s: "Mg", n: "Magnesium", v: 2 }, { s: "Ca", n: "Calcium", v: 2 }, { s: "Cu", n: "Copper(II)", v: 2 },
    { s: "Fe", n: "Iron(II)", v: 2 }, { s: "Fe", n: "Iron(III)", v: 3 }, { s: "Al", n: "Aluminium", v: 3 }
  ];
  var ANIONS = [
    { s: "Cl", n: "chloride", v: 1 }, { s: "OH", n: "hydroxide", v: 1, poly: true }, { s: "NO₃", n: "nitrate", v: 1, poly: true },
    { s: "O", n: "oxide", v: 2 }, { s: "SO₄", n: "sulphate", v: 2, poly: true }, { s: "CO₃", n: "carbonate", v: 2, poly: true },
    { s: "PO₄", n: "phosphate", v: 3, poly: true }
  ];
  var CHARGE = ["", "", "²", "³"];
  // combinations left out: unstable or not met at this level
  var SKIP = { "Ammonium hydroxide": 1, "Ammonium oxide": 1, "Iron(III) carbonate": 1, "Aluminium carbonate": 1 };

  function sub(n) { return n === 1 ? "" : String(n).split("").map(function (d) { return SUB[d]; }).join(""); }
  function part(ion, n, brackets) { return n > 1 && ion.poly && brackets ? "(" + ion.s + ")" + sub(n) : ion.s + sub(n); }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function formula(c, a, o) {   // o: { simplify, brackets, swap }
    o = o || {};
    var nc = a.v, na = c.v, g = o.simplify === false ? 1 : gcd(nc, na);
    nc /= g; na /= g;
    if (o.swap) { var t = nc; nc = na; na = t; }
    return part(c, nc, o.brackets !== false) + part(a, na, o.brackets !== false);
  }
  function ionLabel(i, sign) { return "<span>" + i.s + "<sup>" + CHARGE[i.v] + sign + "</sup></span>"; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function store(key, val) { try { if (val === undefined) return +(localStorage.getItem(key) || 0); localStorage.setItem(key, val); } catch (e) { return 0; } }

  function question() {
    var c, a, guard = 0;
    do { c = CATIONS[Math.floor(Math.random() * CATIONS.length)]; a = ANIONS[Math.floor(Math.random() * ANIONS.length)]; guard++; }
    while (SKIP[c.n + " " + a.n] && guard < 20);
    var right = formula(c, a), opts = {};
    opts[right] = 1;
    var cands = [formula(c, a, { swap: true }), formula(c, a, { simplify: false }), formula(c, a, { brackets: false }),
                 c.s + a.s, part(c, a.v, true) + a.s, c.s + part(a, c.v, true), formula(c, a, { simplify: false, swap: true }),
                 part(c, c.v + 1, true) + part(a, a.v, true), a.s + c.s,
                 c.s + part(a, 2, true), part(c, 2, true) + part(a, 3, true), part(c, 3, true) + part(a, 2, true), c.s + part(a, c.v + 1, true)];
    shuffle(cands).forEach(function (f) { if (Object.keys(opts).length < 4 && !opts[f]) opts[f] = 1; });
    return { c: c, a: a, right: right, opts: shuffle(Object.keys(opts)), name: c.n + " " + a.n };
  }

  function mount(root) {
    var best = store("vp-formula-best");
    root.classList.add("fr");
    root.innerHTML =
      '<div class="fr-top"><div class="fr-stat"><span>Score</span><b data-f="score">0</b></div><div class="fr-stat"><span>Streak</span><b data-f="streak">0</b></div>' +
      '<div class="fr-stat"><span>Time</span><b data-f="time">60</b></div><div class="fr-stat"><span>Best</span><b data-f="best">' + best + '</b></div></div>' +
      '<div class="fr-bar"><i data-f="bar"></i></div>' +
      '<div class="fr-card" data-f="card">' +
        '<div class="fr-start"><p>Pick the correct formula for each compound. You have 60 seconds.</p>' +
        '<div class="btns"><button type="button" class="btn primary" data-a="start">Start the race</button><button type="button" class="btn" data-a="practice">Practice (no timer)</button></div></div>' +
      '</div>' +
      '<p class="fr-feedback" data-f="fb" aria-live="polite"></p>';
    var F = {}; root.querySelectorAll("[data-f]").forEach(function (e) { F[e.dataset.f] = e; });
    var st = null, timer = null;

    function show() {
      F.score.textContent = st.score; F.streak.textContent = st.streak; F.time.textContent = st.practice ? "∞" : Math.ceil(st.left);
      F.bar.style.width = st.practice ? "100%" : (st.left / 60 * 100) + "%";
    }
    function ask() {
      var q = st.q = question();
      F.card.innerHTML =
        '<p class="fr-name">' + q.name + '</p>' +
        '<div class="fr-ions"><span class="ion pos">' + ionLabel(q.c, "+") + '<small>valency ' + q.c.v + '</small></span><span class="fr-plus">+</span>' +
        '<span class="ion neg">' + ionLabel(q.a, "−") + '<small>valency ' + q.a.v + '</small></span></div>' +
        '<div class="fr-opts">' + q.opts.map(function (f, i) { return '<button type="button" class="fr-opt" data-o="' + i + '"><kbd>' + (i + 1) + '</kbd> ' + f + '</button>'; }).join("") + '</div>' +
        (st.practice ? '<div class="btns" style="margin-top:.75rem"><button type="button" class="btn" data-a="stop">Finish practice</button></div>' : "");
      st.locked = false;
      var first = F.card.querySelector(".fr-opt"); if (first && st.n > 0) first.focus({ preventScroll: true });
    }
    function answer(i) {
      if (!st || st.locked || st.over) return;
      st.locked = true;
      var q = st.q, pick = q.opts[i], ok = pick === q.right;
      st.n++;
      F.card.querySelectorAll(".fr-opt").forEach(function (b, j) { b.disabled = true; if (q.opts[j] === q.right) b.classList.add("right"); else if (j === i) b.classList.add("wrong"); });
      if (ok) { st.right++; st.streak++; var pts = 10 + Math.min(10, 2 * (st.streak - 1)); st.score += pts; F.fb.textContent = "Correct! +" + pts + (st.streak > 1 ? " (streak " + st.streak + ")" : ""); F.fb.className = "fr-feedback good"; }
      else { st.streak = 0; st.missed.push(q); F.fb.textContent = q.name + " is " + q.right + ": " + q.c.s + " has valency " + q.c.v + ", " + q.a.s + " has valency " + q.a.v + "."; F.fb.className = "fr-feedback bad"; }
      show();
      setTimeout(function () { if (!st.over) ask(); }, ok ? 450 : 1600);
    }
    function start(practice) {
      st = { score: 0, streak: 0, left: 60, n: 0, right: 0, missed: [], practice: practice, over: false };
      F.fb.textContent = ""; show(); ask();
      clearInterval(timer);
      if (!practice) { var last = performance.now(); timer = setInterval(function () { var now = performance.now(); st.left -= (now - last) / 1000; last = now; if (st.left <= 0) { st.left = 0; end(); } show(); }, 100); }
    }
    function end() {
      clearInterval(timer); st.over = true;
      if (!st.practice && st.score > best) { best = st.score; store("vp-formula-best", best); F.best.textContent = best; }
      var seen = {}, review = st.missed.filter(function (q) { if (seen[q.name]) return false; seen[q.name] = 1; return true; });
      F.card.innerHTML = '<div class="fr-end"><p class="fr-big">' + st.score + ' points</p><p>' + st.right + ' correct out of ' + st.n + (st.n ? ' (' + Math.round(st.right / st.n * 100) + '%)' : '') + '.' + (!st.practice && st.score >= best && st.score > 0 ? ' New best!' : '') + '</p>' +
        (review.length ? '<p><strong>To revise:</strong></p><ul class="fr-review">' + review.map(function (q) { return '<li>' + q.name + ': <b>' + q.right + '</b></li>'; }).join("") + '</ul>' : st.n ? '<p>No mistakes. Excellent!</p>' : '') +
        '<div class="btns"><button type="button" class="btn primary" data-a="start">Race again</button><button type="button" class="btn" data-a="practice">Practice</button></div></div>';
      F.fb.textContent = ""; show();
    }

    root.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.a === "start") start(false); else if (b.dataset.a === "practice") start(true); else if (b.dataset.a === "stop") end();
      else if (b.dataset.o != null) answer(+b.dataset.o);
    });
    root.addEventListener("keydown", function (e) { if (st && !st.over && e.key >= "1" && e.key <= "4") answer(+e.key - 1); });
    return { start: start, end: end, state: function () { return st; }, answer: answer, formula: formula, CATIONS: CATIONS, ANIONS: ANIONS };
  }

  window.FormulaGame = { mount: mount, formula: formula, question: question, CATIONS: CATIONS, ANIONS: ANIONS };
})();
