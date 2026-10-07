/*
 * Multiple-choice quiz. Markup:
 * <div class="quiz">
 *   <fieldset class="q" data-answer="b">
 *     <legend>Question</legend>
 *     <div class="opts"><button data-opt="a">…</button><button data-opt="b">…</button></div>
 *     <p class="why" hidden>Explanation shown after answering.</p>
 *   </fieldset>
 *   <p class="score" aria-live="polite"></p>
 * </div>
 */
(function () {
  "use strict";
  document.querySelectorAll(".quiz").forEach(function (quiz) {
    var qs = quiz.querySelectorAll(".q"), score = quiz.querySelector(".score");
    var done = 0, right = 0;
    function update() {
      if (score) score.textContent = done ? right + " of " + done + " correct" + (done === qs.length ? " · all answered" : "") : "";
    }
    qs.forEach(function (q) {
      q.querySelectorAll("button[data-opt]").forEach(function (b) {
        b.type = "button";
        b.addEventListener("click", function () {
          var ok = b.dataset.opt === q.dataset.answer;
          q.querySelectorAll("button[data-opt]").forEach(function (o) {
            o.disabled = true;
            if (o.dataset.opt === q.dataset.answer) o.classList.add("right");
          });
          if (!ok) b.classList.add("wrong");
          var why = q.querySelector(".why");
          if (why) { why.hidden = false; why.insertAdjacentHTML("afterbegin", "<strong>" + (ok ? "Correct. " : "Not quite. ") + "</strong>"); }
          done++; if (ok) right++;
          update();
        });
      });
    });
    update();
  });
})();
