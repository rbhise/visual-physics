/*
 * What is a set? Number tokens 1–20 sit in a tray. A rule describes set A.
 * Drag (or tap) tokens into the oval for A. The readouts write A in listing (roster) form,
 * count n(A), say whether each token ∈ A or ∉ A, and name the type of set once it is complete.
 * Needs sim-kit.js.  SetsIntroSim.mount(el, { rule: "even", inside: [2, 4] }) → { set, play, seek, state }
 */
(function () {
  "use strict";
  var K = window.SimKit;
  var RULES = {
    even:   { chip: "Even, less than 13", builder: "{x | x is an even natural number, x < 13}", test: function (x) { return x % 2 === 0 && x < 13; } },
    prime:  { chip: "Primes below 20", builder: "{x | x is a prime number less than 20}", test: function (x) { if (x < 2) return false; for (var i = 2; i * i <= x; i++) if (x % i === 0) return false; return true; } },
    factor: { chip: "Factors of 18", builder: "{x | x is a factor of 18}", test: function (x) { return 18 % x === 0; } },
    single: { chip: "x² = 49", builder: "{x | x ∈ N, x² = 49}", test: function (x) { return x * x === 49; } },
    empty:  { chip: "Even primes above 2", builder: "{x | x is an even prime number greater than 2}", test: function () { return false; } },
    five:   { chip: "Multiples of 5", builder: "{x | x is a natural number and a multiple of 5}", test: function (x) { return x % 5 === 0; }, infinite: true }
  };
  var N = 20;

  function mount(root, opts) {
    opts = opts || {};
    var s = { rule: "even", inside: [], last: null };
    var pos = {};          // token → [x, y] while dragging
    var drag = null, downAt = null, moved = false, G = null;

    var k = K.frame(root, {
      aspect: "16 / 11",
      label: "Number tokens from 1 to 20 that can be dragged into an oval for set A",
      panel: K.chips("rule", "Rule for set A", Object.keys(RULES).map(function (r) { return [r, RULES[r].chip]; })) +
        '<div class="problem-text" data-r="builder"></div>' +
        K.buttons([["fill", "Show me"], ["clear", "Empty the set"]]) + K.hint("note"),
      readouts: [["roster", "Listing form of A", "wrap c-path"], ["n", "n(A)"], ["type", "Type of set", "wrap"],
                 ["last", "Last token", "c-vy"], ["found", "Found"], ["wrong", "Wrong tokens", "wrap"]],
      cols: 3
    });

    var mq = window.matchMedia("(max-width: 760px)");
    function asp() { root.querySelector(".sim-stage").style.aspectRatio = mq.matches ? "1 / 1" : "16 / 11"; }
    if (mq.addEventListener) mq.addEventListener("change", asp); asp();

    function R() { return RULES[s.rule]; }
    function members() { var a = []; for (var x = 1; x <= N; x++) if (R().test(x)) a.push(x); return a; }
    function has(x) { return s.inside.indexOf(x) >= 0; }
    function sorted() { return s.inside.slice().sort(function (a, b) { return a - b; }); }
    function wrong() { return sorted().filter(function (x) { return !R().test(x); }); }
    function found() { return sorted().filter(function (x) { return R().test(x); }); }
    function complete() { return wrong().length === 0 && found().length === members().length; }
    function roster(list, inf) { return "{" + list.join(", ") + (inf ? ", …" : "") + "}"; }

    function update() {
      var mem = members(), fd = found(), wr = wrong(), done = complete(), rule = R();
      k.el('[data-r="builder"]').textContent = "A = " + rule.builder;
      k.set("roster", s.inside.length ? roster(sorted(), done && rule.infinite) : (done ? "{ } or ∅" : "{ }"));
      k.set("n", done ? (rule.infinite ? "infinite" : String(mem.length)) : String(s.inside.length) + (s.inside.length ? " so far" : ""));
      k.set("type", done ? (rule.infinite ? "Infinite set" : mem.length === 0 ? "Empty set (∅)" : mem.length === 1 ? "Singleton set" : "Finite set") : "sort first");
      k.set("last", s.last == null ? "–" : s.last + (rule.test(s.last) ? " ∈ A" : " ∉ A"));
      k.set("found", fd.length + " of " + mem.length);
      k.set("wrong", wr.length ? wr.join(", ") + (wr.length === 1 ? " does" : " do") + " not belong" : "none");
      var note;
      if (wr.length) note = wr[0] + " ∉ A: it does not fit the rule. Drag it back to the tray.";
      else if (!done) note = "Drag every number that fits the rule into the oval. Tap a token to move it in or out.";
      else if (rule.infinite) note = "A = " + roster(mem, true) + ". The dots mean the list never ends: A is an infinite set. The tray only goes up to 20.";
      else if (!mem.length) note = "No number fits this rule, so A has no elements. A = { } = ∅, the empty set.";
      else if (mem.length === 1) note = "A = {" + mem[0] + "} has exactly one element: a singleton set. (−7 also squares to 49, but it is not a natural number.)";
      else note = "A = " + roster(mem) + ", a finite set with n(A) = " + mem.length + ". Written in any other order, such as " + roster(mem.slice().reverse()) + ", it is the same set: the two sets are equal.";
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    function geom(W, H) {
      var r = Math.max(11, Math.min(18, (W - 24) / 20 - 3)), slot = (W - 24) / 10;
      var trayH = 2 * (2 * r + 10) + 14, ty = H - trayH;
      var ov = { x: W / 2, y: 18 + (ty - 26) / 2, rx: W / 2 - 18, ry: (ty - 30) / 2 };
      var home = {};
      for (var x = 1; x <= N; x++) home[x] = [12 + slot * ((x - 1) % 10 + 0.5), ty + 12 + (2 * r + 10) * (Math.floor((x - 1) / 10) + 0.5)];
      // inside slots: rows inside the oval
      var ins = sorted(), n = ins.length, iw = ov.rx * 1.5, cols = Math.max(1, Math.floor(iw / (2 * r + 8))), rows = Math.ceil(n / cols), at = {};
      var rowH = Math.min(2 * r + 8, (ov.ry * 1.6) / Math.max(1, rows));
      ins.forEach(function (x, i) {
        var row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols), col = i - row * cols;
        at[x] = [ov.x + (col - (inRow - 1) / 2) * (2 * r + 8), ov.y + (row - (rows - 1) / 2) * rowH + (R().infinite && complete() ? -8 : 0)];
      });
      return { r: r, ty: ty, ov: ov, home: home, at: at };
    }
    function where(x) { return pos[x] || (has(x) ? G.at[x] : G.home[x]); }
    function inOval(p) { var o = G.ov, dx = (p[0] - o.x) / o.rx, dy = (p[1] - o.y) / o.ry; return dx * dx + dy * dy <= 1; }

    k.draw = function (ctx, W, H, c) {
      G = geom(W, H);
      var o = G.ov, done = complete();
      // tray
      ctx.fillStyle = c.bg; ctx.strokeStyle = c.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(6, G.ty, W - 12, H - G.ty - 6, 10) : ctx.rect(6, G.ty, W - 12, H - G.ty - 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.muted; ctx.font = "11px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("Tray: natural numbers 1 to 20", 12, G.ty + 3);
      // oval for A
      ctx.fillStyle = c.tint; ctx.globalAlpha = done ? 0.9 : 0.55;
      ctx.beginPath(); ctx.ellipse(o.x, o.y, o.rx, o.ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = done ? c.good : c.path; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = c.path; ctx.font = "700 18px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("A", o.x - o.rx * 0.72, o.y - o.ry * 0.82);
      if (!s.inside.length) {
        ctx.fillStyle = c.muted; ctx.font = "13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(done ? "A = { } = ∅" : "drag numbers here", o.x, o.y);
      }
      if (done && R().infinite && s.inside.length) {
        ctx.fillStyle = c.path; ctx.font = "700 13px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("… 25, 30, 35 and so on, without end", o.x, o.y + o.ry * 0.62);
      }
      // empty home slots
      for (var x = 1; x <= N; x++) if (has(x) || pos[x]) {
        var h = G.home[x]; ctx.strokeStyle = c.line; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(h[0], h[1], G.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      // tokens (dragged one last)
      var order = []; for (x = 1; x <= N; x++) if (x !== drag) order.push(x); if (drag) order.push(drag);
      order.forEach(function (x) {
        var p = where(x), inA = has(x) && !pos[x], ok = R().test(x);
        var fill = c.surface, ring = c.line, txt = c.ink;
        if (inA) { fill = ok ? c.path : c.bad; ring = fill; txt = c.surface; }
        ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(p[0], p[1], G.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ring; ctx.lineWidth = x === drag ? 3 : 1.5; ctx.stroke();
        ctx.fillStyle = txt; ctx.font = "700 " + Math.round(G.r * 0.9) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(x), p[0], p[1] + 1);
      });
    };

    // dragging and tapping
    function pt(e) { var r = k.canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function hit(p) { for (var x = N; x >= 1; x--) { var q = where(x); if (Math.hypot(q[0] - p[0], q[1] - p[1]) <= G.r + 3) return x; } return null; }
    function put(x, on) {
      var i = s.inside.indexOf(x);
      if (on && i < 0) s.inside.push(x);
      if (!on && i >= 0) s.inside.splice(i, 1);
      s.last = x;
    }
    k.canvas.addEventListener("pointerdown", function (e) {
      if (!G) return; var p = pt(e), x = hit(p); if (!x) return;
      fill.stop(); drag = x; downAt = p; moved = false; k.canvas.setPointerCapture(e.pointerId);
    });
    k.canvas.addEventListener("pointermove", function (e) {
      if (!drag) return; var p = pt(e);
      if (!moved && Math.hypot(p[0] - downAt[0], p[1] - downAt[1]) < 5) return;
      moved = true; pos[drag] = p; k.redraw();
    });
    function end() {
      if (!drag) return; var x = drag;
      if (!moved) put(x, !has(x)); else put(x, inOval(pos[x]));
      delete pos[x]; drag = null; update();
    }
    k.canvas.addEventListener("pointerup", end);
    k.canvas.addEventListener("pointercancel", end);

    // "Fill it for me": take out wrong tokens, then add the right ones one by one
    var acc = 0, reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function stepFill() {
      var w = wrong(); if (w.length) { put(w[0], false); return true; }
      var m = members().filter(function (x) { return !has(x); }); if (m.length) { put(m[0], true); return true; }
      return false;
    }
    var fill = K.clock(function (dt) {
      acc += dt; if (acc < 0.3) return true; acc = 0;
      var more = stepFill(); update(); return more;
    });
    function play() { fill.stop(); if (reduce) { while (stepFill()); update(); } else { acc = 0.3; fill.start(); } }

    var showR = k.bindChips("rule", function () { return s.rule; }, function (v) { fill.stop(); s.rule = v; s.inside = []; s.last = null; update(); });
    k.onAct({ fill: play, clear: function () { fill.stop(); s.inside = []; s.last = null; update(); } });

    function set(o) {
      fill.stop();
      if (o.rule && o.rule !== s.rule) { s.rule = o.rule; if (!o.inside) s.inside = []; s.last = null; }
      if (o.inside) { s.inside = o.inside.slice(); s.last = o.last != null ? o.last : null; }
      if (o.done) { s.inside = members(); }
      showR(); update();
    }
    set(Object.assign({ rule: "even", inside: [] }, opts));
    return {
      set: set, play: function () {}, fill: play,
      seek: function () { fill.stop(); while (stepFill()); update(); },
      state: function () { return { rule: s.rule, inside: sorted(), complete: complete(), members: members() }; }
    };
  }
  window.SetsIntroSim = { mount: mount };
})();
