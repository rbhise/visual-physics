/*
 * Co-ordinate plane, two modes:
 *   points – drag P anywhere on the grid: its co-ordinates (x, y), the signs, the quadrant or axis it lies on,
 *            and how to reach it from the origin. "Find the point" hides the co-ordinates: plot T, then check.
 *   lines  – the lines x = a (parallel to the Y-axis) and y = b (parallel to the X-axis). Drag either line;
 *            they meet at (a, b). Extra fixed lines (opts.more) make a rectangle with labelled corners.
 *            "Hit the target" asks for the two lines through a given point.
 * Needs sim-kit.js and math-kit.js.  CoordsPlaneSim.mount(el, { mode: "points", x: 3, y: 2 }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit, M = window.MathKit, f = M.frac;
  var VIEW = { xmin: -8, xmax: 8, ymin: -6, ymax: 6, step: 1 };
  var ROMAN = ["", "I", "II", "III", "IV"];

  function quadrant(x, y) {
    if (x === 0 && y === 0) return 0;
    if (x === 0 || y === 0) return -1;
    return x > 0 ? (y > 0 ? 1 : 4) : (y > 0 ? 2 : 3);
  }
  function sign(v) { return v > 0 ? "+" : v < 0 ? "−" : "0"; }
  function pt(x, y) { return "(" + f(x) + ", " + f(y) + ")"; }
  function where(x, y) {
    var q = quadrant(x, y);
    if (q === 0) return "at the origin";
    if (q === -1) return y === 0 ? "on the X-axis" : "on the Y-axis";
    return "in Quadrant " + ROMAN[q];
  }
  function route(x, y) {
    if (x === 0 && y === 0) return "stay at O";
    var p = [];
    if (x) p.push(f(Math.abs(x)) + (x > 0 ? " right" : " left"));
    if (y) p.push(f(Math.abs(y)) + (y > 0 ? " up" : " down"));
    return p.join(", ");
  }
  function units(v) { var a = Math.abs(v); return f(a) + (a === 1 ? " unit" : " units"); }

  // text with a soft background so it stays readable over grid lines
  function tag(ctx, c, text, x, y, align, base, col, bold) {
    ctx.save();
    ctx.font = (bold === false ? "" : "700 ") + "13px " + c.font;
    var w = ctx.measureText(text).width, h = 16;
    var x0 = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    var y0 = base === "bottom" ? y - h : base === "middle" ? y - h / 2 : y;
    ctx.fillStyle = c.surface; ctx.globalAlpha = 0.85; ctx.fillRect(x0 - 3, y0, w + 6, h); ctx.globalAlpha = 1;
    ctx.fillStyle = col; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, x0, y0 + h / 2 + 0.5);
    ctx.restore();
    return { x: x0 - 3, y: y0, w: w + 6, h: h };
  }
  // label a point, pushed away from (cx, cy) in plane units and kept inside the box
  function pointTag(ctx, c, P, text, x, y, col, cx, cy) {
    ctx.save(); ctx.font = "700 13px " + c.font;
    var w = ctx.measureText(text).width; ctx.restore();
    var px = P.X(x), py = P.Y(y), right = x >= (cx || 0), up = y >= (cy || 0), b = P.box;
    if (right && px + 10 + w > b.x + b.w - 2) right = false;
    if (!right && px - 10 - w < b.x + 2) right = true;
    if (up && py - 26 < b.y) up = false;
    if (!up && py + 26 > b.y + b.h) up = true;
    tag(ctx, c, text, px + (right ? 9 : -9), py + (up ? -5 : 5), right ? "left" : "right", up ? "bottom" : "top", col);
  }
  // double-headed measuring arrow between two screen points with a label
  function measure(ctx, c, x1, y1, x2, y2, label, col, lx, ly, align) {
    if (Math.hypot(x2 - x1, y2 - y1) < 6) return null;
    K.arrow(ctx, (x1 + x2) / 2, (y1 + y2) / 2, x2, y2, col, 1.5, 8);
    K.arrow(ctx, (x1 + x2) / 2, (y1 + y2) / 2, x1, y1, col, 1.5, 8);
    return tag(ctx, c, label, lx, ly, align || "center", "middle", col, false);
  }
  // size of a tag without drawing it
  function tagRect(ctx, c, text, x, y, align, base) {
    ctx.save(); ctx.font = "700 13px " + c.font; var w = ctx.measureText(text).width; ctx.restore();
    var h = 16, x0 = align === "right" ? x - w : align === "center" ? x - w / 2 : x, y0 = base === "bottom" ? y - h : base === "middle" ? y - h / 2 : y;
    return { x: x0 - 3, y: y0, w: w + 6, h: h };
  }
  function overlap(p, q) { return p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h; }
  // first candidate [x, y, align, base] whose label fits inside the canvas and misses every used rectangle
  function place(ctx, c, text, cands, used) {
    var W = ctx.canvas.width / (window.devicePixelRatio || 1), H = ctx.canvas.height / (window.devicePixelRatio || 1);
    for (var i = 0; i < cands.length; i++) {
      var r = tagRect(ctx, c, text, cands[i][0], cands[i][1], cands[i][2], cands[i][3]);
      if (r.x < 10 || r.y < 10 || r.x + r.w > W - 10 || r.y + r.h > H - 10) continue;
      if (used.some(function (u) { return u && overlap(r, u); })) continue;
      var out = cands[i].slice(); out.r = r; return out;
    }
    return null;
  }

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "cp";
    var s = Object.assign({ mode: "points", task: "explore", x: 3, y: 2, a: 3, b: -2, tx: -3, ty: 4,
      marks: [], more: [], quads: true, dist: true, samples: true, checked: false, score: 0, tries: 0 }, opts);
    var lines = s.mode === "lines";
    var P = null, drag = null;

    var panel = '<div class="eqn-show" data-r="eqn"></div>' +
      K.chips("task", "Activity", lines ? [["explore", "Explore"], ["find", "Hit the target"]] : [["explore", "Explore"], ["find", "Find the point"]]);
    if (lines) {
      panel += K.slider(id, "a", "Line parallel to the Y-axis: x =", VIEW.xmin, VIEW.xmax, 0.5, "") +
        K.slider(id, "b", "Line parallel to the X-axis: y =", VIEW.ymin, VIEW.ymax, 0.5, "") +
        '<div class="checks">' + K.check(id, "dist", "Distances from the axes", s.dist) + K.check(id, "samples", "Points on the lines", s.samples) + '</div>' +
        K.buttons([["new", "New target"]]) + K.hint("note");
    } else {
      panel += K.slider(id, "x", "Point P: x co-ordinate", VIEW.xmin, VIEW.xmax, 0.5, "") +
        K.slider(id, "y", "Point P: y co-ordinate", VIEW.ymin, VIEW.ymax, 0.5, "") +
        '<div class="checks">' + K.check(id, "quads", "Name the quadrants", s.quads) + '</div>' +
        K.buttons([["mark", "Mark P"], ["clear", "Clear marks"], ["check", "Check"], ["new", "New target"]]) + K.hint("note");
    }
    var k = K.frame(root, {
      aspect: "4 / 3",
      label: lines ? "A co-ordinate grid with a line parallel to each axis; drag the lines and see where they meet"
                   : "A co-ordinate grid with a point P you can drag; its co-ordinates, signs and quadrant are shown",
      panel: panel,
      readouts: [["r1", "–", "c-path"], ["r2", "–", "c-vx"], ["r3", "–", "c-vy"], ["r4", "–"], ["r5", "–", "wrap"], ["r6", "–", "wrap"]],
      cols: 3
    });
    var spans = root.querySelectorAll(".sim-readout span");
    function heads(list) { list.forEach(function (t, i) { spans[i].textContent = t; }); }

    function found() { return lines ? (s.a === s.tx && s.b === s.ty) : (s.x === s.tx && s.y === s.ty); }
    function hidden() { return !lines && s.task === "find" && !s.checked; }

    function corners() {   // all crossing points of the vertical and horizontal lines
      var xs = [s.a], ys = [s.b];
      s.more.forEach(function (m) { if (m[0] === "x") xs.push(m[1]); else ys.push(m[1]); });
      var out = [];
      xs.forEach(function (x) { ys.forEach(function (y) { out.push([x, y]); }); });
      return { xs: xs, ys: ys, pts: out };
    }

    function updatePoints() {
      var x = s.x, y = s.y, find = s.task === "find";
      heads(["Point P", "x co-ordinate", "y co-ordinate", "Signs (x, y)", "P lies", find ? "Target" : "Route from O"]);
      k.el('[data-r="eqn"]').textContent = find ? "Plot T" + pt(s.tx, s.ty) : "P" + pt(x, y);
      if (hidden()) {
        ["r1", "r2", "r3", "r4", "r5"].forEach(function (r) { k.set(r, "?"); });
      } else {
        k.set("r1", pt(x, y)); k.set("r2", f(x)); k.set("r3", f(y));
        k.set("r4", "(" + sign(x) + ", " + sign(y) + ")"); k.set("r5", where(x, y));
      }
      var note;
      if (find) {
        var ok = found();
        k.set("r6", "T" + pt(s.tx, s.ty) + (s.checked ? (ok ? " ✓" : " ✗") : "") + (s.tries ? " · " + s.score + "/" + s.tries : ""));
        if (!s.checked) note = "Plot T" + pt(s.tx, s.ty) + ": start at O, go " + "along the X-axis first, then up or down. The co-ordinates of P are hidden. Press Check when P is on T.";
        else if (ok) note = "Correct! P" + pt(x, y) + " is T. You went " + route(x, y) + ". Press New target for another point.";
        else if (x === s.ty && y === s.tx) note = "You plotted " + pt(x, y) + ": x and y are swapped. The first number is the x co-ordinate. Drag P and check again.";
        else if (Math.abs(x) === Math.abs(s.tx) && Math.abs(y) === Math.abs(s.ty)) note = "You plotted " + pt(x, y) + ": the distances are right, but check the signs. Negative x is left of O, negative y is below O.";
        else note = "You plotted " + pt(x, y) + ", not T" + pt(s.tx, s.ty) + ". Move " + f(Math.abs(s.tx)) + (s.tx < 0 ? " left" : " right") + " and " + f(Math.abs(s.ty)) + (s.ty < 0 ? " down" : " up") + " from O.";
      } else {
        k.set("r6", route(x, y));
        var q = quadrant(x, y);
        note = q === 0 ? "P is the origin O(0, 0), where the X-axis and Y-axis meet."
          : q === -1 ? (y === 0 ? "The y co-ordinate is 0, so P is on the X-axis. Points on an axis are not in any quadrant."
                                : "The x co-ordinate is 0, so P is on the Y-axis. Points on an axis are not in any quadrant.")
          : "x is " + (x > 0 ? "positive" : "negative") + " and y is " + (y > 0 ? "positive" : "negative") + ", so P" + pt(x, y) + " is in Quadrant " + ROMAN[q] + ". Drop perpendiculars to the axes to read the co-ordinates.";
      }
      k.el('[data-r="note"]').textContent = note;
      k.btn("mark").style.display = find ? "none" : "";
      k.btn("clear").style.display = find ? "none" : "";
      k.btn("check").style.display = find ? "" : "none";
      k.btn("new").style.display = find ? "" : "none";
    }

    function updateLines() {
      var a = s.a, b = s.b, find = s.task === "find", more = s.more.length > 0, C = corners();
      heads(["Line parallel to Y-axis", "Line parallel to X-axis", "They meet at", "Distance of x = " + f(a) + " from Y-axis", "Distance of y = " + f(b) + " from X-axis",
             find ? "Target" : more ? "Rectangle" : "(" + f(a) + ", " + f(b) + ") lies"]);
      k.el('[data-r="eqn"]').textContent = "x = " + f(a) + "   and   y = " + f(b);
      k.set("r1", "x = " + f(a) + (a === 0 ? " (Y-axis)" : ""));
      k.set("r2", "y = " + f(b) + (b === 0 ? " (X-axis)" : ""));
      k.set("r3", pt(a, b));
      k.set("r4", a === 0 ? "0: it is the Y-axis" : units(a) + (a > 0 ? ", right" : ", left"));
      k.set("r5", b === 0 ? "0: it is the X-axis" : units(b) + (b > 0 ? ", above" : ", below"));
      var note;
      if (find) {
        var ok = found();
        k.set("r6", "T" + pt(s.tx, s.ty) + (ok ? " ✓" : ""));
        note = ok ? "Both lines pass through T" + pt(s.tx, s.ty) + ": x = " + f(s.tx) + " and y = " + f(s.ty) + ". Press New target for another point."
          : "Move the lines so that both pass through T" + pt(s.tx, s.ty) + ". " +
            (a === s.tx ? "x = " + f(a) + " already passes through T. " : "") + (b === s.ty ? "y = " + f(b) + " already passes through T. " : "");
      } else if (more) {
        var w = Math.max.apply(null, C.xs) - Math.min.apply(null, C.xs), h = Math.max.apply(null, C.ys) - Math.min.apply(null, C.ys);
        k.set("r6", C.xs.length === 2 && C.ys.length === 2 ? f(w) + " by " + f(h) + " units" : "–");
        note = "Two lines parallel to the Y-axis and two parallel to the X-axis enclose a rectangle. Each corner is (x of one vertical line, y of one horizontal line).";
      } else {
        k.set("r6", where(a, b));
        note = (a === 0 && b === 0) ? "x = 0 is the Y-axis and y = 0 is the X-axis. They meet at the origin (0, 0)."
          : "Every point on the " + "vertical line has x co-ordinate " + f(a) + ", so its equation is x = " + f(a) + ". Every point on the horizontal line has y co-ordinate " + f(b) +
            ", so its equation is y = " + f(b) + ". They meet at " + pt(a, b) + ".";
      }
      k.el('[data-r="note"]').textContent = note;
      k.btn("new").style.display = find ? "" : "none";
    }

    function update() {
      root.querySelectorAll('[data-group="task"] button').forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.v === s.task); });
      if (lines) updateLines(); else updatePoints();
      k.redraw();
    }

    function drawPoints(ctx, W, H, c) {
      var q = hidden() ? -2 : quadrant(s.x, s.y);
      // shade the quadrant P is in
      if (q > 0) {
        var x0 = q === 1 || q === 4 ? 0 : VIEW.xmin, x1 = q === 1 || q === 4 ? VIEW.xmax : 0, y0 = q === 1 || q === 2 ? 0 : VIEW.ymin, y1 = q === 1 || q === 2 ? VIEW.ymax : 0;
        ctx.save(); ctx.fillStyle = c.tint; ctx.globalAlpha = 0.55; ctx.fillRect(P.X(x0), P.Y(y1), P.X(x1) - P.X(x0), P.Y(y0) - P.Y(y1)); ctx.restore();
      }
      if (s.quads) {
        [[1, 5.5, 5.2], [2, -5.5, 5.2], [3, -5.5, -5.2], [4, 5.5, -5.2]].forEach(function (Q) {
          var on = Q[0] === q, sx = Q[1] > 0 ? "+" : "−", sy = Q[2] > 0 ? "+" : "−";
          var crowded = [[s.x, s.y]].concat(s.marks).some(function (m) { return Math.abs(m[0] - Q[1]) < 4 && Math.abs(m[1] - Q[2]) < 1.6; });
          if (crowded) return;   // keep point labels readable
          ctx.save(); ctx.font = (on ? "700 " : "") + "13px " + c.font; ctx.fillStyle = on ? c.path : c.muted; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(ROMAN[Q[0]] + " (" + sx + ", " + sy + ")", P.X(Q[1]), P.Y(Q[2])); ctx.restore();
        });
      }
      // origin
      tag(ctx, c, "O", P.X(0) - 4, P.Y(0) + 4, "right", "top", c.muted);
      // marked points
      s.marks.forEach(function (m) {
        M.dot(ctx, P.X(m[0]), P.Y(m[1]), 5.5, c.ink);
        if (m[0] === s.x && m[1] === s.y && !hidden()) return;   // P's own label names it
        pointTag(ctx, c, P, (m[2] || "") + pt(m[0], m[1]), m[0], m[1], c.ink);
      });
      if (s.marks.length > 2 && s.poly) {   // join the marks in order to show the figure
        ctx.save(); ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]); ctx.beginPath();
        s.marks.forEach(function (m, i) { if (i) ctx.lineTo(P.X(m[0]), P.Y(m[1])); else ctx.moveTo(P.X(m[0]), P.Y(m[1])); });
        ctx.closePath(); ctx.stroke(); ctx.restore();
      }
      var px = P.X(s.x), py = P.Y(s.y), hide = hidden();
      if (!hide) {
        // perpendiculars to the axes and their feet
        ctx.save(); ctx.setLineDash([5, 4]); ctx.lineWidth = 2;
        ctx.strokeStyle = c.vx; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, P.Y(0)); ctx.stroke();
        ctx.strokeStyle = c.vy; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(P.X(0), py); ctx.stroke(); ctx.restore();
        if (s.x) M.dot(ctx, px, P.Y(0), 4.5, c.vx);
        if (s.y) M.dot(ctx, P.X(0), py, 4.5, c.vy);
      }
      var ok = s.task === "find" && s.checked && found();
      M.dot(ctx, px, py, 9, ok ? c.good : s.task === "find" && s.checked ? c.bad : c.path, c.surface);
      var same = s.marks.filter(function (m) { return m[0] === s.x && m[1] === s.y && m[2]; })[0];
      pointTag(ctx, c, P, hide ? "P" : (same ? same[2] + " = " : "") + "P" + pt(s.x, s.y) + (ok ? " ✓" : ""), s.x, s.y, ok ? c.good : c.path);
    }

    function drawLines(ctx, W, H, c) {
      var a = s.a, b = s.b, C = corners(), more = s.more.length > 0, find = s.task === "find", bx = P.box;
      var oRect = tag(ctx, c, "O", P.X(0) - 4, P.Y(0) + 4, "right", "top", c.muted);
      // extra fixed lines (thinner)
      s.more.forEach(function (m) {
        if (m[0] === "x") M.line(ctx, P, 1, 0, m[1], c.vx, 2, [8, 5]); else M.line(ctx, P, 0, 1, m[1], c.vy, 2, [8, 5]);
      });
      M.line(ctx, P, 1, 0, a, c.vx, 3);
      M.line(ctx, P, 0, 1, b, c.vy, 3);
      // equation labels: top of each vertical line, right end of each horizontal line
      C.xs.forEach(function (x, i) {
        var X = P.X(x), right = X + 70 < bx.x + bx.w;
        tag(ctx, c, "x = " + f(x), X + (right ? 6 : -6), bx.y + 4, right ? "left" : "right", "top", c.vx, i === 0);
      });
      C.ys.forEach(function (y, i) {
        var Y = P.Y(y), above = Y - 20 > bx.y;
        tag(ctx, c, "y = " + f(y), bx.x + bx.w - 4, Y + (above ? -4 : 4), "right", above ? "bottom" : "top", c.vy, i === 0);
      });
      var used = [oRect];   // label rectangles already drawn, so later labels can avoid them
      if (!more && !find && s.dist) {
        var ay = P.Y(VIEW.ymin + 0.5), axx = P.X(VIEW.xmin + 0.8);
        if (a) used.push(measure(ctx, c, P.X(0), ay, P.X(a), ay, units(a), c.vx, P.X(a / 2), ay - 11));
        if (b) used.push(measure(ctx, c, axx, P.Y(0), axx, P.Y(b), units(b), c.vy, axx + 6, P.Y(b / 2), "left"));
      }
      C.xs.forEach(function (x) { var X = P.X(x); used.push({ x: X - 40, y: bx.y, w: 80, h: 22 }); });
      C.ys.forEach(function (y) { var Y = P.Y(y); used.push({ x: bx.x + bx.w - 64, y: Y - 22, w: 64, h: 44 }); });
      if (more) {
        var cx = C.xs.reduce(function (p, v) { return p + v; }, 0) / C.xs.length, cy = C.ys.reduce(function (p, v) { return p + v; }, 0) / C.ys.length;
        C.pts.forEach(function (q) { M.dot(ctx, P.X(q[0]), P.Y(q[1]), 6, c.path, c.surface); pointTag(ctx, c, P, pt(q[0], q[1]), q[0], q[1], c.path, q[0] > cx ? q[0] + 1 : q[0] - 1, q[1] > cy ? q[1] + 1 : q[1] - 1); });   // labels inside the rectangle
        return;
      }
      if (find) {
        var tx = P.X(s.tx), ty = P.Y(s.ty);
        ctx.save(); ctx.strokeStyle = c.bad; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(tx, ty, 11, 0, 7); ctx.stroke(); ctx.restore();
        pointTag(ctx, c, P, "T" + pt(s.tx, s.ty), s.tx, s.ty, found() ? c.good : c.bad, s.tx - 1, s.ty - 1);
        M.dot(ctx, P.X(a), P.Y(b), 8, found() ? c.good : c.path, c.surface);
        return;
      }
      // the meeting point: label in the first free corner around it
      var mx = P.X(a), my = P.Y(b);
      used.push({ x: mx - 6, y: my - 6, w: 12, h: 12 });
      var main = place(ctx, c, pt(a, b), [[mx - 9, my + 6, "right", "top"], [mx + 9, my + 6, "left", "top"], [mx - 9, my - 6, "right", "bottom"], [mx + 9, my - 6, "left", "bottom"]], used);
      if (!main) { main = [mx + 9, my - 6, "left", "bottom"]; main.r = tagRect(ctx, c, pt(a, b), mx + 9, my - 6, "left", "bottom"); }
      if (main) { tag(ctx, c, pt(a, b), main[0], main[1], main[2], main[3], c.path); used.push(main.r); }
      if (s.samples) {   // one more point on each line, to show which co-ordinate stays fixed
        var sv = null, sh = null;
        [3, -3, 4, -4, 2, -2, 5, -5].some(function (d) {
          var y = b + d; if (y < VIEW.ymin + 0.8 || y > VIEW.ymax - 0.8) return false;
          var Y = P.Y(y), right = mx + 80 < bx.x + bx.w;
          var r = place(ctx, c, pt(a, y), [[mx + (right ? 9 : -9), Y, right ? "left" : "right", "middle"], [mx + (right ? -9 : 9), Y, right ? "right" : "left", "middle"]], used);
          if (r) { sv = [y, r]; return true; } return false;
        });
        if (sv) { M.dot(ctx, mx, P.Y(sv[0]), 5, c.vx); tag(ctx, c, pt(a, sv[0]), sv[1][0], sv[1][1], sv[1][2], sv[1][3], c.vx); used.push(sv[1].r); }
        [4, -4, 5, -5, 3, -3, 6, -6].some(function (d) {
          var x = a + d; if (x < VIEW.xmin + 1 || x > VIEW.xmax - 1) return false;
          var X = P.X(x);
          var r = place(ctx, c, pt(x, b), [[X, my - 8, "center", "bottom"], [X, my + 8, "center", "top"]], used);
          if (r) { sh = [x, r]; return true; } return false;
        });
        if (sh) { M.dot(ctx, P.X(sh[0]), my, 5, c.vy); tag(ctx, c, pt(sh[0], b), sh[1][0], sh[1][1], sh[1][2], sh[1][3], c.vy); used.push(sh[1].r); }
      }
      M.dot(ctx, mx, my, 8, c.path, c.surface);
    }

    k.draw = function (ctx, W, H, c) {
      P = M.plane(ctx, c, { x: 8, y: 8, w: W - 16, h: H - 16 }, VIEW);
      if (lines) drawLines(ctx, W, H, c); else drawPoints(ctx, W, H, c);
    };

    // dragging (snaps to halves)
    function snapX(v) { return Math.max(VIEW.xmin, Math.min(VIEW.xmax, Math.round(v * 2) / 2)); }
    function snapY(v) { return Math.max(VIEW.ymin, Math.min(VIEW.ymax, Math.round(v * 2) / 2)); }
    function at(e) { var r = k.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function move(e) {
      var p = at(e), x = snapX(P.ix(p[0])), y = snapY(P.iy(p[1]));
      if (lines) {
        if (drag === "v" || drag === "both") s.a = x;
        if (drag === "h" || drag === "both") s.b = y;
        showA(); showB();
      } else {
        s.x = x; s.y = y; s.checked = false; showX(); showY();
      }
      update();
    }
    k.canvas.addEventListener("pointerdown", function (e) {
      if (!P) return;
      if (lines) {
        var p = at(e), dx = Math.abs(p[0] - P.X(s.a)), dy = Math.abs(p[1] - P.Y(s.b));
        drag = dx < 18 && dy < 18 ? "both" : dx <= dy ? "v" : "h";
      } else drag = "pt";
      k.canvas.setPointerCapture(e.pointerId); move(e);
    });
    k.canvas.addEventListener("pointermove", function (e) { if (drag) move(e); });
    k.canvas.addEventListener("pointerup", function () { drag = null; });
    k.canvas.addEventListener("pointercancel", function () { drag = null; });
    k.canvas.style.cursor = "crosshair";

    var noop = function () {};
    var showX = noop, showY = noop, showA = noop, showB = noop, boxes = {};
    if (lines) {
      showA = k.bindSlider("a", function () { return s.a; }, function (v) { s.a = v; update(); }, f);
      showB = k.bindSlider("b", function () { return s.b; }, function (v) { s.b = v; update(); }, f);
      boxes.dist = k.bindCheck("dist", function (on) { s.dist = on; update(); });
      boxes.samples = k.bindCheck("samples", function (on) { s.samples = on; update(); });
    } else {
      showX = k.bindSlider("x", function () { return s.x; }, function (v) { s.x = v; s.checked = false; update(); }, f);
      showY = k.bindSlider("y", function () { return s.y; }, function (v) { s.y = v; s.checked = false; update(); }, f);
      boxes.quads = k.bindCheck("quads", function (on) { s.quads = on; update(); });
    }
    function newTarget() {
      var tx, ty, n = 0;
      do {
        tx = Math.floor(Math.random() * 15) - 7; ty = Math.floor(Math.random() * 11) - 5;
        if (Math.random() < 0.15) { if (Math.random() < 0.5) tx = 0; else ty = 0; }
        n++;
      } while (n < 50 && ((tx === s.tx && ty === s.ty) || (lines ? (tx === s.a && ty === s.b) : (tx === s.x && ty === s.y)) || (tx === 0 && ty === 0)));
      s.tx = tx; s.ty = ty; s.checked = false;
    }
    root.querySelector('[data-group="task"]').addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      s.task = b.dataset.v; s.checked = false;
      if (s.task === "find") { s.marks = []; s.more = []; if (found()) newTarget(); }
      update();
    });
    k.onAct({
      mark: function () {
        if (!s.marks.some(function (m) { return m[0] === s.x && m[1] === s.y; })) s.marks.push([s.x, s.y, String.fromCharCode(65 + s.marks.length % 26)]);
        update();
      },
      clear: function () { s.marks = []; s.poly = false; update(); },
      check: function () {
        if (!s.checked) { s.checked = true; s.tries++; if (found()) s.score++; }
        update();
      },
      "new": function () { newTarget(); update(); }
    });
    update();
    return {
      set: function (o) {
        if ("task" in o || "x" in o || "y" in o || "tx" in o || "ty" in o) s.checked = false;
        if (!("marks" in o) && ("task" in o)) s.marks = [];
        if (!("more" in o)) s.more = [];
        if (!("poly" in o)) s.poly = false;
        Object.assign(s, o);
        showX(); showY(); showA(); showB();
        Object.keys(boxes).forEach(function (key) { boxes[key].checked = !!s[key]; });
        update();
      },
      play: function () {}, seek: function () {}, state: function () { return s; }
    };
  }
  window.CoordsPlaneSim = { mount: mount };
})();
