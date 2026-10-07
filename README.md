# Visual Physics

High school physics explained with interactive simulations. Plain HTML, CSS and JavaScript: no build step, no frameworks, hosted free on GitHub Pages.

## Folder layout

```
index.html                         Home page with the unit list
.nojekyll                          Tells GitHub Pages to serve files as-is
assets/css/style.css               One shared stylesheet (colours, fonts, components)
assets/js/quiz.js                  Multiple-choice quiz used on every lesson
assets/js/sim-kit.js               Shared building blocks for the simulations
assets/js/sims/                    One simulation per lesson
lessons/motion/                    Std 9 Chapter 1 lessons (9 pages)
lessons/energy/                    Std 9 Chapter 2 lessons (5 pages)
lessons/electricity/               Std 9 Chapter 3 lessons (4 pages)
lessons/matter/                    Std 9 Chapter 4 lessons (4 pages, chemistry)
lessons/acids/                     Std 9 Chapter 5 lessons (2 pages, chemistry)
lessons/light/                     Std 9 Chapter 11 lessons (4 pages)
lessons/sound/                     Std 9 Chapter 12 lessons (4 pages)
lessons/space/                     Std 9 Chapter 18 lessons (3 pages)
assets/js/chem-kit.js              Atomic masses and drawing helpers for chemistry
assets/js/circuit-kit.js           Drawing helpers for circuit simulations
lessons/kinematics/projectile-motion.html
slides/                            Ready-made PowerPoint decks, one per lesson
games/                             Small games (Hit the Target, Laser Maze, Formula Race)
assets/js/games/                   Code for the games
```

## Publish on GitHub Pages

1. Create a new public repository on GitHub, for example `visual-physics`.
2. Upload everything in this folder to the repository (on the repo page: **Add file → Upload files**, drag the folder contents in, then **Commit**). Make sure `.nojekyll` is included.
3. Go to **Settings → Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After a minute or two the site is live at `https://<your-username>.github.io/visual-physics/`.

Every later commit to `main` updates the site automatically.

## Preview on your computer

Double-click `index.html`. Everything works from a local file, no server needed.

## Adding a new lesson

1. Copy `lessons/kinematics/projectile-motion.html` into the right unit folder and rename it.
2. Keep the same sections: big idea, equations, simulation, try it, worked examples, common mistakes, quick check.
3. Add a link to it from `index.html`.

### Writing equations

Equations use KaTeX. Write display equations as `$$ ... $$` and inline maths as `\( ... \)`:

```html
<p>The range is \(R = v_0^2 \sin 2\theta / g\).</p>
$$y = h + v_0\sin\theta\,t - \tfrac12 g t^2$$
```

### Using the simulation

```html
<div id="sim-projectile"></div>
<script src="../../assets/js/sims/projectile.js"></script>
<script>
  var sim = ProjectileSim.mount(document.getElementById("sim-projectile"), { v0: 20, angle: 45, h: 0 });
  // sim.set({ v0: 15, angle: 30, h: 10, planet: "Moon" }, true);  // true = launch now
</script>
```

Any button with a `data-seq` attribute on the lesson page runs a list of launches one after another. See the "Try it" section of the projectile lesson.

### Writing a quiz question

```html
<div class="quiz">
  <fieldset class="q" data-answer="b">
    <legend>Question text</legend>
    <div class="opts">
      <button data-opt="a">Wrong answer</button>
      <button data-opt="b">Right answer</button>
    </div>
    <p class="why" hidden>Explanation shown after the student answers.</p>
  </fieldset>
  <p class="score" aria-live="polite"></p>
</div>
<script src="../../assets/js/quiz.js"></script>
```

## Slides for teachers

Each lesson can link a deck stored in `slides/`. The button markup is:

```html
<p class="downloads"><a class="btn" href="../../slides/LESSON.pptx" download>Download slides (.pptx)</a></p>
```

## Changing the site name or colours

- Site name: search for `Visual <span>Physics</span>` in the HTML files.
- Colours and fonts: the `:root` block at the top of `assets/css/style.css`. Dark mode colours are right below it.
