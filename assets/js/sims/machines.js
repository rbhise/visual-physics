/*
 * Simple machines: levers of class I, II and III, and an inclined plane (no friction).
 * Lever:   effort × effort arm = load × load arm, MA = load ÷ effort.
 * Incline: effort × L = load × h, MA = L ÷ h.
 * Needs sim-kit.js.  MachineSim.mount(el, { mode: "c1", load: 300, aL: 1, aE: 2 }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit;

  var EXAMPLES = {
    c1: "Class I: the fulcrum is between the effort and the load. Examples: seesaw, crowbar, scissors.",
    c2: "Class II: the load is between the fulcrum and the effort. Examples: nutcracker, wheelbarrow, bottle opener.",
    c3: "Class III: the effort is between the fulcrum and the load. Examples: tongs, tweezers, your forearm.",
    ramp: "Inclined plane: pushing the load up a long ramp needs less force than lifting it straight up, but over a longer distance."
  };

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "msim";
    var s = Object.assign({ mode: "c1", load: 300, aL: 1, aE: 2, L: 5, h: 1 }, opts);

    var k = K.frame(root, {
      aspect: "5 / 3",
      label: "A lever or a ramp with the load, the effort and the distances marked",
      panel: K.chips("mode", "Machine", [["c1", "Lever class I"], ["c2", "Lever class II"], ["c3", "Lever class III"], ["ramp", "Inclined plane"]]) +
        K.slider(id, "load", "Load", 100, 600, 50, "N") +
        K.slider(id, "aL", "Load arm", 0.5, 3, 0.25, "m") +
        K.slider(id, "aE", "Effort arm", 0.5, 3, 0.25, "m") +
        K.slider(id, "L", "Ramp length L", 1, 10, 0.5, "m") +
        K.slider(id, "h", "Ramp height h", 0.5, 3, 0.25, "m") +
        K.hint("note"),
      readouts: [["eff", "Effort needed (N)", "c-vy"], ["ma", "Mechanical advantage"], ["dl", "Load is raised (m)"],
                 ["de", "Effort moves (m)"], ["win", "Work by effort (J)", "c-path"], ["wout", "Work on load (J)", "c-path"]],
      cols: 3
    });

    var ctl = {};
    root.querySelectorAll(".ctl").forEach(function (e) { ctl[e.querySelector("input").dataset.k] = e; });

    // Keep the arms consistent with the chosen class
    function normalise() {
      if (s.mode === "c2" && s.aE <= s.aL) { s.aE = Math.min(3, s.aL + 1); if (s.aE <= s.aL) s.aL = s.aE - 0.5; }
      if (s.mode === "c3" && s.aE >= s.aL) { s.aE = Math.max(0.5, s.aL - 0.5); if (s.aE >= s.aL) s.aL = s.aE + 0.5; }
    }

    function calc() {
      if (s.mode === "ramp") return { eff: s.load * s.h / s.L, ma: s.L / s.h, dl: s.h, de: s.L };
      var eff = s.load * s.aL / s.aE, dl = 0.1;
      return { eff: eff, ma: s.aE / s.aL, dl: dl, de: dl * s.aE / s.aL };
    }

    function update() {
      var r = calc(), ramp = s.mode === "ramp";
      ["aL", "aE"].forEach(function (q) { ctl[q].hidden = ramp; });
      ["L", "h"].forEach(function (q) { ctl[q].hidden = !ramp; });
      k.set("eff", K.fmt(r.eff)); k.set("ma", K.fmt(r.ma, 2));
      k.set("dl", K.fmt(r.dl, 2)); k.set("de", K.fmt(r.de, 2));
      k.set("win", K.fmt(r.eff * r.de, 1)); k.set("wout", K.fmt(s.load * r.dl, 1));
      k.el('[data-r="note"]').textContent = EXAMPLES[s.mode] + (r.ma > 1.001 ? " Here the machine multiplies your force." : r.ma < 0.999 ? " Here you need more force than the load, but the load moves farther and faster." : "");
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var r = calc();
      if (s.mode === "ramp") {
        var base = H * 0.82, x0 = W * 0.08, maxL = W * 0.8, ppm = Math.min(maxL / 10, (H * 0.65) / 3);
        var run = Math.sqrt(Math.max(0, s.L * s.L - s.h * s.h)) * ppm, rise = s.h * ppm;
        ctx.fillStyle = c.bg; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x0, base); ctx.lineTo(x0 + run, base); ctx.lineTo(x0 + run, base - rise); ctx.closePath(); ctx.fill(); ctx.stroke();
        var ang = Math.atan2(rise, run), mx = x0 + run * 0.55, my = base - rise * 0.55, side = 28;
        ctx.save(); ctx.translate(mx, my); ctx.rotate(-ang);
        ctx.fillStyle = c.tint; ctx.strokeStyle = c.path; ctx.lineWidth = 2; ctx.fillRect(-side / 2, -side, side, side); ctx.strokeRect(-side / 2, -side, side, side);
        ctx.restore();
        var ex = mx + Math.cos(ang) * 10, ey = my - Math.sin(ang) * 10 - side / 2;
        var len = 20 + r.eff * 0.15;
        K.arrow(ctx, ex, ey, ex + Math.cos(ang) * len, ey - Math.sin(ang) * len, c.vy, 3.5);
        ctx.fillStyle = c.vy; ctx.font = "600 12px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
        ctx.fillText("effort " + K.fmt(r.eff, 0) + " N", ex + Math.cos(ang) * len + 6, ey - Math.sin(ang) * len);
        ctx.fillStyle = c.muted; ctx.font = "12px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText("L = " + s.L + " m (along the slope)", x0 + run / 2 - 30, base - rise / 2 + 14);
        ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("h = " + s.h + " m", x0 + run + 8, base - rise / 2);
        ctx.fillStyle = c.ink; ctx.textBaseline = "top"; ctx.fillText("Lifting straight up would need " + s.load + " N", x0, 10);
        return;
      }
      // Lever
      var beamY = H * 0.5, mid = W / 2, ppm2 = Math.min(W * 0.8 / 6.5, 120), fx;
      var span = s.mode === "c1" ? (s.aL + s.aE) : Math.max(s.aL, s.aE);
      fx = s.mode === "c1" ? mid - (s.aE - s.aL) * ppm2 / 2 : mid - span * ppm2 / 2;
      var loadX = s.mode === "c1" ? fx - s.aL * ppm2 : fx + s.aL * ppm2;
      var effX = s.mode === "c1" ? fx + s.aE * ppm2 : fx + s.aE * ppm2;
      var left = Math.min(fx, loadX, effX) - 20, right = Math.max(fx, loadX, effX) + 20;
      // Beam and fulcrum
      ctx.fillStyle = c.ink; ctx.fillRect(left, beamY - 4, right - left, 8);
      ctx.fillStyle = c.muted; ctx.beginPath(); ctx.moveTo(fx, beamY + 4); ctx.lineTo(fx - 16, beamY + 34); ctx.lineTo(fx + 16, beamY + 34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.ink; ctx.font = "11px " + c.font; ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText("fulcrum", fx - 20, beamY + 24);
      // Load box on the beam
      var side = 20 + s.load / 20;
      ctx.fillStyle = c.tint; ctx.strokeStyle = c.path; ctx.lineWidth = 2;
      ctx.fillRect(loadX - side / 2, beamY - 4 - side, side, side); ctx.strokeRect(loadX - side / 2, beamY - 4 - side, side, side);
      ctx.fillStyle = c.path; ctx.font = "600 12px " + c.font; ctx.textBaseline = "bottom"; ctx.fillText("load " + s.load + " N", loadX, beamY - side - 10);
      // Effort arrow: pushes down in class I, pulls up in classes II and III
      var len = 18 + r.eff * 0.12, down = s.mode === "c1";
      len = Math.min(len, beamY - 40);
      if (down) K.arrow(ctx, effX, beamY - 6 - len, effX, beamY - 6, c.vy, 3.5);
      else K.arrow(ctx, effX, beamY - 6, effX, beamY - 6 - len, c.vy, 3.5);
      ctx.fillStyle = c.vy; ctx.font = "600 12px " + c.font; ctx.textBaseline = "bottom"; ctx.textAlign = down ? "center" : "left";
      ctx.fillText("effort " + K.fmt(r.eff, 0) + " N", down ? effX : effX + 6, down ? beamY - 10 - len : beamY - 6 - len);
      // Arm measurements under the beam
      function dim(x1, x2, y, label, col) {
        ctx.strokeStyle = col; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.moveTo(x1, y - 4); ctx.lineTo(x1, y + 4); ctx.moveTo(x2, y - 4); ctx.lineTo(x2, y + 4); ctx.stroke();
        ctx.fillStyle = col; ctx.font = "11px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(label, (x1 + x2) / 2, y + 5);
      }
      dim(fx, loadX, beamY + Math.min(62, H * 0.2), "load arm " + s.aL + " m", c.path);
      dim(fx, effX, beamY + Math.min(90, H * 0.31), "effort arm " + s.aE + " m", c.vy);
    };

    var shows = {};
    ["load", "aL", "aE", "L", "h"].forEach(function (key) { shows[key] = k.bindSlider(key, function () { return s[key]; }, function (v) { s[key] = v; normalise(); refresh(); }); });
    var showM = k.bindChips("mode", function () { return s.mode; }, function (v) { s.mode = v; normalise(); refresh(); });
    function refresh() { Object.keys(shows).forEach(function (q) { shows[q](); }); update(); }

    normalise(); refresh();
    return {
      set: function (o) { Object.assign(s, o); normalise(); showM(); refresh(); },
      seek: function () {}, play: function () {}
    };
  }

  window.MachineSim = { mount: mount };
})();
