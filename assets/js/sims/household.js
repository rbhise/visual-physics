/*
 * Household wiring: appliances connected in parallel between live and neutral at 230 V,
 * protected by a fuse or MCB, with an earth wire for safety.
 * Current drawn by each appliance: I = P ÷ V. Too much total current blows the fuse.
 * Needs sim-kit.js.  HouseSim.mount(el, { on: ["fan", "tv"], fuse: 15 }) → { set }
 */
(function () {
  "use strict";
  var K = window.SimKit, VOLT = 230;

  var APPS = [
    { id: "lights", label: "Lights", P: 40 }, { id: "fan", label: "Fan", P: 75 }, { id: "tv", label: "TV", P: 100 },
    { id: "fridge", label: "Fridge", P: 200 }, { id: "iron", label: "Iron", P: 1000 }, { id: "ac", label: "AC", P: 1500 }, { id: "geyser", label: "Geyser", P: 2000 }
  ];

  function mount(root, opts) {
    opts = opts || {};
    var id = root.id || "hsim";
    var s = Object.assign({ on: ["lights", "fan"], fuse: 15, blown: false, fault: false, earth: true }, opts);

    var k = K.frame(root, {
      aspect: "5 / 3.2",
      label: "A house circuit with live, neutral and earth wires and appliances in parallel",
      panel: '<div><div class="seg-label">Switch appliances on</div><div class="preset-list" data-apps>' +
          APPS.map(function (a) { return '<button type="button" class="chip" data-app="' + a.id + '" aria-pressed="false">' + a.label + ' ' + a.P + ' W</button>'; }).join("") + '</div></div>' +
        K.chips("fuse", "Fuse or MCB rating", [["5", "5 A"], ["15", "15 A"], ["32", "32 A"]]) +
        '<div class="checks">' + K.check(id, "fault", "Fault: live wire touches the iron's metal body", false) + K.check(id, "earth", "Earth wire connected", true) + '</div>' +
        K.hint("note") +
        K.buttons([["reset", "Replace fuse"]]),
      readouts: [["P", "Power demanded (W)", "c-path"], ["I", "Current demanded (A)", "c-vy"], ["F", "Fuse rating (A)"],
                 ["state", "Supply", "wrap"], ["each", "Largest single current (A)"], ["safe", "Safety", "wrap"]],
      cols: 3
    });

    function isOn(a) { return s.on.indexOf(a) >= 0; }
    function calc() {
      var P = 0, maxI = 0;
      APPS.forEach(function (a) { if (isOn(a.id)) { P += a.P; maxI = Math.max(maxI, a.P / VOLT); } });
      var I = P / VOLT, faultI = s.fault && s.earth && isOn("iron") ? 60 : 0;   // a short to earth draws a very large current
      return { P: P, I: I + faultI, maxI: maxI, shortToEarth: faultI > 0 };
    }

    function update() {
      var r = calc();
      if (!s.blown && r.I > s.fuse) s.blown = true;
      var live = !s.blown;
      k.set("P", r.P);
      k.set("I", K.fmt(r.I, 2));
      k.set("F", s.fuse);
      k.set("state", live ? "On, 230 V" : "Fuse blown: off");
      k.set("each", K.fmt(r.maxI, 2));
      var danger = s.fault && !s.earth && isOn("iron") && live;
      k.set("safe", danger ? "DANGER: body of iron is live" : s.fault && s.blown ? "Safe: fault cut off" : "Safe");
      root.querySelectorAll("[data-app]").forEach(function (b) { b.setAttribute("aria-pressed", isOn(b.dataset.app)); });
      var note = s.blown && r.shortToEarth ? "The live wire touched the earthed metal body. A huge current flowed to earth and the fuse blew, cutting off the supply. The earth wire did its job."
        : s.blown ? "The total current went above the fuse rating, so the fuse melted (or the MCB tripped) and cut off the supply. Switch something off and replace the fuse."
        : danger ? "Without an earth wire, the metal body of the iron is now at 230 V. Anyone touching it would get a dangerous shock. This is why metal appliances need an earth wire."
        : "All appliances are connected in parallel, so each gets the full 230 V and can be switched on or off by itself. Each draws I = P ÷ V; the currents add up.";
      k.el('[data-r="note"]').textContent = note;
      k.redraw();
    }

    k.draw = function (ctx, W, H, c) {
      var live = !s.blown, x0 = W * 0.2, x1 = W - 14, yL = H * 0.16, yN = H * 0.26, yE = H * 0.36;
      // Supply and fuse box
      ctx.fillStyle = c.bg; ctx.strokeStyle = c.line; ctx.lineWidth = 1.5; ctx.fillRect(10, yL - 26, x0 - 22, yE - yL + 52); ctx.strokeRect(10, yL - 26, x0 - 22, yE - yL + 52);
      ctx.fillStyle = c.ink; ctx.font = "600 " + (W < 520 ? 9 : 11) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText(W < 520 ? "Fuse" : "Meter and", (10 + x0 - 12) / 2, yL - 22); ctx.fillText(W < 520 ? "box" : "fuse box", (10 + x0 - 12) / 2, yL - 9);
      // Fuse on the live wire
      var fx = x0 - 6;
      [[yL, c.vy, "Live"], [yN, c.ink, "Neutral"], [yE, c.vx, "Earth"]].forEach(function (w) {
        ctx.strokeStyle = w[1]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx, w[0]); ctx.lineTo(x1, w[0]); ctx.stroke();
        ctx.fillStyle = w[1]; ctx.font = "600 11px " + c.font; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(w[2], x1, w[0] - 3);
      });
      ctx.fillStyle = live ? c.surface : c.bad; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5;
      ctx.fillRect(fx - 14, yL - 6, 28, 12); ctx.strokeRect(fx - 14, yL - 6, 28, 12);
      ctx.fillStyle = live ? c.ink : c.surface; ctx.font = "600 9px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(live ? s.fuse + " A" : "blown", fx, yL);
      // Earth plate symbol under the box
      ctx.strokeStyle = c.vx; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(fx - 26, yE); ctx.lineTo(fx - 26, yE + 30);
      [16, 10, 4].forEach(function (w, i) { ctx.moveTo(fx - 26 - w / 2 * 1.4, yE + 30 + i * 5); ctx.lineTo(fx - 26 + w / 2 * 1.4, yE + 30 + i * 5); });
      ctx.stroke();
      // Appliances in parallel
      var n = APPS.length, slot = (x1 - x0 - 10) / n, top = yE + 26, boxH = H - top - 34;
      APPS.forEach(function (a, i) {
        var cx = x0 + 10 + slot * (i + 0.5), on = isOn(a.id) && live, bw = Math.min(slot - 8, 70);
        ctx.strokeStyle = c.vy; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 6, yL); ctx.lineTo(cx - 6, top); ctx.stroke();
        ctx.strokeStyle = c.ink; ctx.beginPath(); ctx.moveTo(cx + 6, yN); ctx.lineTo(cx + 6, top); ctx.stroke();
        if (a.id === "iron" && s.earth) { ctx.strokeStyle = c.vx; ctx.beginPath(); ctx.moveTo(cx + bw / 2 - 4, yE); ctx.lineTo(cx + bw / 2 - 4, top + 8); ctx.stroke(); }
        ctx.fillStyle = on ? c.tint : c.surface; ctx.strokeStyle = on ? c.path : c.line; ctx.lineWidth = 2;
        ctx.fillRect(cx - bw / 2, top, bw, boxH); ctx.strokeRect(cx - bw / 2, top, bw, boxH);
        if (a.id === "iron" && s.fault) { ctx.strokeStyle = c.bad; ctx.lineWidth = 2; ctx.setLineDash([3, 2]); ctx.strokeRect(cx - bw / 2 - 3, top - 3, bw + 6, boxH + 6); ctx.setLineDash([]); }
        var small = slot < 56;
        ctx.fillStyle = on ? c.path : c.muted; ctx.font = "600 " + (small ? 9 : 11) + "px " + c.font; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(a.label, cx, top + boxH * 0.3);
        ctx.font = (small ? 8 : 10) + "px " + c.font; ctx.fillText(a.P + (small ? "" : " W"), cx, top + boxH * 0.52);
        if (on) { ctx.fillStyle = c.vy; ctx.fillText(K.fmt(a.P / VOLT, 2) + (small ? "" : " A"), cx, top + boxH * 0.74); }
      });
      ctx.fillStyle = c.muted; ctx.font = "10px " + c.font; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText(W < 520 ? "Appliances in parallel (W, A)" : "Each appliance is joined between live and neutral: in parallel", x0, H - 16);
    };

    root.querySelector("[data-apps]").addEventListener("click", function (e) {
      var b = e.target.closest("[data-app]"); if (!b) return;
      var a = b.dataset.app;
      s.on = isOn(a) ? s.on.filter(function (q) { return q !== a; }) : s.on.concat([a]);
      update();
    });
    var showF = k.bindChips("fuse", function () { return String(s.fuse); }, function (v) { s.fuse = +v; update(); });
    var cf = k.bindCheck("fault", function (on) { s.fault = on; if (on && s.on.indexOf("iron") < 0) s.on = s.on.concat(["iron"]); update(); });
    var ce = k.bindCheck("earth", function (on) { s.earth = on; update(); });
    k.onAct({ reset: function () { s.blown = false; if (calc().I > s.fuse) { s.on = []; } s.fault = false; cf.checked = false; update(); } });
    update();

    return {
      set: function (o) { s.blown = false; Object.assign(s, o); showF(); cf.checked = !!s.fault; ce.checked = !!s.earth; update(); },
      seek: function () {}, play: function () {}, calc: calc
    };
  }

  window.HouseSim = { mount: mount, APPS: APPS };
})();
