/* Home page subject switch */
  // Subject switch: shows one subject at a time; the address (#science or #maths) keeps the choice
(function () {
  var tabs = document.querySelectorAll(".subject-switch [role=tab]");
  function show(name, focus) {
    tabs.forEach(function (t) {
      var on = t.dataset.subject === name;
      t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
      document.getElementById(t.dataset.subject).hidden = !on;
      if (on && focus) t.focus();
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { show(t.dataset.subject); history.replaceState(null, "", "#" + t.dataset.subject); });
    t.addEventListener("keydown", function (e) { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { var n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; show(n.dataset.subject, true); history.replaceState(null, "", "#" + n.dataset.subject); } });
  });
  function fromHash() {
    var h = location.hash.slice(1);
    if (h === "science" || h === "maths") { show(h); document.getElementById("chapters").scrollIntoView(); } else show("science");
  }
  window.addEventListener("hashchange", fromHash); fromHash();
})();
