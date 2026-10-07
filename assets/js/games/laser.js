/*
 * Game: Laser Maze. Tap (or select with the arrow keys and press Space) a mirror to turn it between
 * / and \. Guide the laser to the target. Every mirror sits at 45° to the beam, so i = r = 45° and
 * the beam turns through 90°.
 * Grid symbols: . empty   # block   T target   > < ^ v laser (pointing that way)   / \ mirror
 * Needs sim-kit.js.  LaserGame.mount(el)
 */
(function () {
  "use strict";
  var K = window.SimKit;
  // Levels: [rows, the mirrors' starting state]. Each row is 9 cells; 6 rows.
  var LEVELS = [
    [">.../....", ".........", ".........", "....T....", ".........", "........."],
    [".........", ">../.....", "......#..", ".../...T.", ".........", "........."],
    ["...T.....", ".#.......", ">..\\..\\..", ".........", "...\\..\\..", "........."],
    ["v........", "..T../.#.", ".........", "....#....", "/....\\...", "........."],
    ["....v....", "\\..#.....", ".......#.", "\\...\\..\\.", ".#.......", "T...\\..\\."],
    ["T#.......", "/../..#..", ".#.......", "..\\.\\.#\\.", ".........", ".../....<"],
    ["#...v....", ".........", ".T#././#.", ".........", "./....\\..", "........."],
    [".........", "...\\./#T.", "..#......", ".../...\\.", ".\\.../../", "........^"]
  ];
  var DIRS = { ">": [1, 0], "<": [-1, 0], "^": [0, -1], "v": [0, 1] };

  function parse(rows) {
    var g = rows.map(function (r) { return r.split(""); }), src = null, mirrors = [];
    g.forEach(function (row, y) { row.forEach(function (ch, x) { if (DIRS[ch]) src = { x: x, y: y, d: DIRS[ch] }; if (ch === "/" || ch === "\\") mirrors.push([x, y]); }); });
    return { g: g, src: src, mirrors: mirrors, W: g[0].length, H: g.length };
  }
  // follow the beam; returns { pts: [[x,y],...] cell centres, hit: bool, bounces: [[x,y,dirIn,dirOut]] }
  function trace(L) {
    var x = L.src.x, y = L.src.y, d = L.src.d.slice(), pts = [[x, y]], bounces = [], seen = {};
    for (var step = 0; step < 300; step++) {
      x += d[0]; y += d[1];
      if (x < 0 || y < 0 || x >= L.W || y >= L.H) { pts.push([x, y]); return { pts: pts, hit: false, bounces: bounces, end: "out" }; }
      var ch = L.g[y][x]; pts.push([x, y]);
      if (ch === "#") return { pts: pts, hit: false, bounces: bounces, end: "block" };
      if (ch === "T") return { pts: pts, hit: true, bounces: bounces, end: "target" };
      if (ch === "/" || ch === "\\") {
        var nd = ch === "/" ? [-d[1], -d[0]] : [d[1], d[0]];
        bounces.push([x, y, d.slice(), nd]); d = nd;
        var key = x + "," + y + "," + d; if (seen[key]) return { pts: pts, hit: false, bounces: bounces, end: "loop" }; seen[key] = 1;
      }
    }
    return { pts: pts, hit: false, bounces: bounces, end: "loop" };
  }

  function store(key, val) { try { if (val === undefined) return JSON.parse(localStorage.getItem(key) || "{}"); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return {}; } }

  function mount(root, opts) {
    opts = opts || {};
    var s = { level: opts.level || 0, moves: 0, sel: 0, angles: true, won: false, best: store("vp-laser-best") };
    var L;

    var k = K.frame(root, {
      aspect: window.matchMedia("(max-width: 600px)").matches ? "9 / 7" : "9 / 6.4",
      label: "A grid with a laser, mirrors, blocks and a target. Select a mirror and press Space to turn it.",
      panel: '<div class="seg-label">Level</div><div class="preset-list" data-group="lvl">' +
        LEVELS.map(function (l, i) { return '<button type="button" class="chip" data-v="' + i + '" aria-pressed="false">' + (i + 1) + '</button>'; }).join("") + '</div>' +
        '<div>' + K.check(root.id || "lz", "angles", "Show the angles at each mirror", true) + '</div>' +
        K.buttons([["next", "Next level"], ["reset", "Reset level"]]) + K.hint("note"),
      readouts: [["level", "Level", "c-path"], ["moves", "Moves"], ["bounces", "Reflections"],
                 ["status", "Beam", "c-vy"], ["best", "Your best for this level"], ["done", "Levels solved"]],
      cols: 3
    });
    var canvas = k.canvas; canvas.tabIndex = 0;

    function load(i) {
      s.level = i; s.moves = 0; s.won = false; s.sel = 0;
      L = parse(LEVELS[i]);
      update();
    }
    function update() {
      var t = trace(L), wasWon = s.won;
      s.won = t.hit;
      if (s.won && !wasWon) {
        var b = s.best[s.level]; if (!b || s.moves < b) { s.best[s.level] = s.moves; store("vp-laser-best", s.best); }
      }
      k.set("level", (s.level + 1) + " of " + LEVELS.length); k.set("moves", s.moves); k.set("bounces", t.bounces.length);
      k.set("status", t.hit ? "On target!" : t.end === "block" ? "Blocked" : t.end === "loop" ? "Going round in circles" : "Missed");
      k.set("best", s.best[s.level] != null ? s.best[s.level] + " moves" : "–");
      k.set("done", Object.keys(s.best).length + " of " + LEVELS.length);
      k.el('[data-r="note"]').textContent = s.won
        ? "Solved in " + s.moves + " moves! At every mirror the angle of incidence (45°) equals the angle of reflection (45°)."
        : "Tap a mirror to turn it. Keyboard: click the grid, use the arrow keys to pick a mirror and Space to turn it.";
      k.btn("next").disabled = !s.won || s.level >= LEVELS.length - 1;
      root.querySelectorAll('[data-group="lvl"] button').forEach(function (b) { b.setAttribute("aria-pressed", +b.dataset.v === s.level); });
      k.redraw();
    }

    function geom(W, H) { var cell = Math.min((W - 16) / L.W, (H - 16) / L.H); return { cell: cell, ox: (W - cell * L.W) / 2, oy: (H - cell * L.H) / 2 }; }

    k.draw = function (ctx, W, H, c) {
      if (!L) return;
      var g = geom(W, H), cs = g.cell, C = function (x, y) { return [g.ox + (x + 0.5) * cs, g.oy + (y + 0.5) * cs]; };
      // grid
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      for (var x = 0; x <= L.W; x++) { ctx.beginPath(); ctx.moveTo(g.ox + x * cs, g.oy); ctx.lineTo(g.ox + x * cs, g.oy + L.H * cs); ctx.stroke(); }
      for (var y = 0; y <= L.H; y++) { ctx.beginPath(); ctx.moveTo(g.ox, g.oy + y * cs); ctx.lineTo(g.ox + L.W * cs, g.oy + y * cs); ctx.stroke(); }
      // cells
      var t = trace(L);
      L.g.forEach(function (row, yy) { row.forEach(function (ch, xx) {
        var p = C(xx, yy), r = cs * 0.38;
        if (ch === "#") { ctx.fillStyle = c.ink; ctx.fillRect(p[0] - cs / 2 + 2, p[1] - cs / 2 + 2, cs - 4, cs - 4); }
        else if (ch === "T") {
          ctx.fillStyle = t.hit ? c.good : c.surface; ctx.strokeStyle = c.good; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(p[0], p[1], r * 0.45, 0, Math.PI * 2); ctx.stroke();
        } else if (DIRS[ch]) {
          var d = DIRS[ch], px = [-d[1], d[0]];   // laser body with a pointed nose
          ctx.fillStyle = c.bad; ctx.beginPath();
          ctx.moveTo(p[0] - d[0] * r + px[0] * r * 0.6, p[1] - d[1] * r + px[1] * r * 0.6);
          ctx.lineTo(p[0] + d[0] * r * 0.3 + px[0] * r * 0.6, p[1] + d[1] * r * 0.3 + px[1] * r * 0.6);
          ctx.lineTo(p[0] + d[0] * r, p[1] + d[1] * r);
          ctx.lineTo(p[0] + d[0] * r * 0.3 - px[0] * r * 0.6, p[1] + d[1] * r * 0.3 - px[1] * r * 0.6);
          ctx.lineTo(p[0] - d[0] * r - px[0] * r * 0.6, p[1] - d[1] * r - px[1] * r * 0.6);
          ctx.closePath(); ctx.fill();
        } else if (ch === "/" || ch === "\\") {
          var sgn = ch === "/" ? -1 : 1, m = r * 0.95;
          ctx.strokeStyle = c.ink; ctx.lineWidth = 5; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(p[0] - m, p[1] - sgn * m); ctx.lineTo(p[0] + m, p[1] + sgn * m); ctx.stroke(); ctx.lineCap = "butt";
        }
      }); });
      // selection ring for keyboard users
      if (document.activeElement === canvas && L.mirrors.length) {
        var sp = C(L.mirrors[s.sel][0], L.mirrors[s.sel][1]);
        ctx.strokeStyle = c.path; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.strokeRect(sp[0] - cs / 2 + 3, sp[1] - cs / 2 + 3, cs - 6, cs - 6); ctx.setLineDash([]);
      }
      // beam
      ctx.strokeStyle = c.bad; ctx.lineWidth = 3; ctx.shadowColor = c.bad; ctx.shadowBlur = 8; ctx.beginPath();
      t.pts.forEach(function (q, i) {
        var p = C(q[0], q[1]);
        if (i === t.pts.length - 1 && t.end !== "loop") { var prev = C(t.pts[i - 1][0], t.pts[i - 1][1]); p = t.end === "out" ? p : [(p[0] + prev[0]) / 2, (p[1] + prev[1]) / 2]; if (t.end === "target") p = C(q[0], q[1]); }
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      });
      ctx.stroke(); ctx.shadowBlur = 0;
      // angles at each reflection: normal and 45° marks
      if (s.angles) t.bounces.forEach(function (b) {
        var p = C(b[0], b[1]), din = b[2], dout = b[3];
        var n = [dout[0] - din[0], dout[1] - din[1]], nl = Math.hypot(n[0], n[1]); n = [n[0] / nl, n[1] / nl];   // normal on the reflecting side
        ctx.save(); ctx.setLineDash([3, 3]); ctx.strokeStyle = c.path; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + n[0] * cs * 0.48, p[1] + n[1] * cs * 0.48); ctx.stroke(); ctx.restore();
        if (cs > 40) { ctx.fillStyle = c.path; ctx.font = "600 " + Math.round(cs * 0.17) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("45°", p[0] + n[0] * cs * 0.3 - din[0] * cs * 0.18, p[1] + n[1] * cs * 0.3 - din[1] * cs * 0.18);
          ctx.fillText("45°", p[0] + n[0] * cs * 0.3 + dout[0] * cs * 0.18, p[1] + n[1] * cs * 0.3 + dout[1] * cs * 0.18); }
      });
      if (s.won) {
        ctx.fillStyle = c.surface; ctx.globalAlpha = 0.85; ctx.fillRect(W / 2 - 120, 8, 240, 34); ctx.globalAlpha = 1;
        ctx.fillStyle = c.good; ctx.font = "700 18px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(s.level === LEVELS.length - 1 ? "All levels solved!" : "Target hit! Level " + (s.level + 1) + " solved", W / 2, 25);
      }
    };

    function turn(x, y) {
      var ch = L.g[y][x]; if (ch !== "/" && ch !== "\\") return;
      L.g[y][x] = ch === "/" ? "\\" : "/"; s.moves++; update();
    }
    canvas.addEventListener("click", function (e) {
      var r = canvas.getBoundingClientRect(), g = geom(k.W, k.H);
      var x = Math.floor((e.clientX - r.left - g.ox) / g.cell), y = Math.floor((e.clientY - r.top - g.oy) / g.cell);
      if (x >= 0 && y >= 0 && x < L.W && y < L.H) { L.mirrors.forEach(function (m, i) { if (m[0] === x && m[1] === y) s.sel = i; }); turn(x, y); }
    });
    canvas.addEventListener("keydown", function (e) {
      if (!L.mirrors.length) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { s.sel = (s.sel + 1) % L.mirrors.length; e.preventDefault(); k.redraw(); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { s.sel = (s.sel - 1 + L.mirrors.length) % L.mirrors.length; e.preventDefault(); k.redraw(); }
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); turn(L.mirrors[s.sel][0], L.mirrors[s.sel][1]); }
    });
    canvas.addEventListener("focus", function () { k.redraw(); }); canvas.addEventListener("blur", function () { k.redraw(); });
    root.querySelector('[data-group="lvl"]').addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) load(+b.dataset.v); });
    k.bindCheck("angles", function (on) { s.angles = on; k.redraw(); });
    k.onAct({ next: function () { if (s.level < LEVELS.length - 1) load(s.level + 1); }, reset: function () { load(s.level); } });

    load(s.level);
    return { state: function () { return { s: s, L: L, t: trace(L) }; }, turn: turn, load: load };
  }

  window.LaserGame = { mount: mount, LEVELS: LEVELS, parse: parse, trace: trace };
})();
