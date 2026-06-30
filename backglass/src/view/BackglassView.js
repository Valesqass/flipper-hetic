/**
 * Backglass — Mise à jour de la vue à partir de l'état serveur (POO).
 */
import { ScreenStateMachine } from "../presentation/ScreenStateMachine.js";
import { formatScore } from "../presentation/scoreFormat.js";

const VIDEO_BY_EVENT = {
  'tunnel':    '/assets/video/tight-tight-tight.mov',
  'tunnel-rv': '/assets/video/own-private-domicile-video.mp4.mov',
};

const COUNT_UP_DURATION = 600;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Renvoie l'intensité du « punch » (scale + inclinaison) selon l'ampleur du gain.
 * Petit gain → petit pop ; gros jackpot (tunnel) → gros impact.
 */
function punchIntensity(delta) {
  if (delta >= 2000) return { scale: 1.7, tilt: 9 };
  if (delta >= 500)  return { scale: 1.5, tilt: 6 };
  if (delta >= 50)   return { scale: 1.32, tilt: 4 };
  return { scale: 1.18, tilt: 2 };
}

/**
 * (Re)déclenche l'animation CSS `score-punch` sur un élément, avec une intensité
 * proportionnelle au gain et une inclinaison alternée gauche/droite.
 */
function triggerPunch(el, delta, flip) {
  const { scale, tilt } = punchIntensity(delta);
  el.classList.remove('punch');
  void el.offsetWidth; // force reflow pour pouvoir relancer l'animation
  el.style.setProperty('--punch-scale', String(scale));
  el.style.setProperty('--punch-tilt', `${flip ? -tilt : tilt}deg`);
  el.classList.add('punch');
}

/**
 * Anime le texte d'un élément de `from` vers `to` (entiers).
 * Ne défile que vers le haut ; toute baisse est appliquée instantanément.
 * Avec `{ punch: true }`, joue en plus un effet d'impact à chaque hausse.
 * Retourne une fonction `set(value)` qui annule l'animation en cours.
 */
function createCountUp(el, { punch = false } = {}) {
  let current = el ? Number(el.textContent) || 0 : 0;
  let rafId = 0;
  let flip = false;

  if (el && typeof el.addEventListener === 'function') {
    el.addEventListener('animationend', (e) => {
      if (e.animationName === 'score-punch') el.classList.remove('punch');
    });
  }

  return function set(value) {
    if (!el) return;
    const target = Math.round(value);
    const canAnimate = typeof requestAnimationFrame === 'function';
    if (canAnimate) cancelAnimationFrame(rafId);

    if (target <= current || !canAnimate || prefersReducedMotion()) {
      current = target;
      el.textContent = String(target);
      return;
    }

    if (punch) {
      flip = !flip;
      triggerPunch(el, target - current, flip);
    }

    const from = current;
    const delta = target - from;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / COUNT_UP_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      current = Math.round(from + delta * eased);
      el.textContent = String(current);
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        current = target;
        el.textContent = String(target);
      }
    };

    rafId = requestAnimationFrame(tick);
  };
}

export class BackglassView {
  #refs;
  #totalBalls;
  #prevBallsLeft = null;
  #ballLossTimer = 0;
  #setScore;
  #setHighscore;
  #screens;

  constructor(refs) {
    this.#refs = refs;
    const { ballIcons } = refs;
    this.#totalBalls = Array.isArray(ballIcons) ? ballIcons.length : 3;
    this.#setScore = createCountUp(refs.scoreValue, { punch: true });
    this.#setHighscore = createCountUp(refs.highscoreValue, { punch: true });

    // La policy accueil/jeu/game over vit dans une machine dediee ; la vue ne
    // fournit que les effets DOM (toggles de classes + remplissage du dossier).
    this.#screens = new ScreenStateMachine({
      onAttract: () => this.#showAttract(),
      onBackglass: () => this.#showBackglass(),
      onGameOver: (score, highScore) => this.#showGameOver(score, highScore),
    });
  }

  // Animation plein écran : le sachet grossit, se déchire, les cristaux jaillissent.
  #playBallLoss(lostIndex) {
    const { ballLossOverlay: el, ballIcons } = this.#refs;
    if (!el || typeof requestAnimationFrame !== "function" || prefersReducedMotion()) return;
    clearTimeout(this.#ballLossTimer);
    el.classList.remove("active", "closing");

    // Le gros sachet part de la place du sachet perdu dans la rangée (effet FLIP).
    const stage = el.querySelector(".ball-loss__stage");
    const icon = Array.isArray(ballIcons) ? ballIcons[lostIndex] : null;
    if (stage && icon && typeof icon.getBoundingClientRect === "function") {
      const ir = icon.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      if (sr.width > 0) {
        const fromX = Math.round(ir.left + ir.width / 2 - (sr.left + sr.width / 2));
        const fromY = Math.round(ir.top + ir.height / 2 - (sr.top + sr.height / 2));
        stage.style.setProperty("--from-x", `${fromX}px`);
        stage.style.setProperty("--from-y", `${fromY}px`);
        stage.style.setProperty("--from-scale", (ir.width / sr.width).toFixed(3));
      }
    }

    void el.offsetWidth; // reflow pour relancer les animations CSS
    el.setAttribute("aria-hidden", "false");
    el.classList.add("active");
    // Fermeture en 2 temps : on fait disparaître l'overlay AVANT de retirer .active,
    // sinon les fragments reviennent visibles (le sachet réapparaît) pendant le fondu.
    this.#ballLossTimer = setTimeout(() => {
      el.classList.add("closing");
      this.#ballLossTimer = setTimeout(() => {
        el.classList.remove("active", "closing");
        el.setAttribute("aria-hidden", "true");
      }, 320);
    }, 3400);
  }

  // Sachets de meth : un par balle. On "vide" (classe lost) ceux des balles perdues.
  #renderBalls(ballsLeft) {
    const { ballIcons, ballsCount } = this.#refs;
    if (Array.isArray(ballIcons)) {
      ballIcons.forEach((icon, index) => {
        icon.classList.toggle("lost", index >= ballsLeft);
      });
    }
    if (ballsCount) {
      ballsCount.textContent = `${Math.max(0, ballsLeft)}/${this.#totalBalls}`;
    }
    if (this.#prevBallsLeft !== null && ballsLeft < this.#prevBallsLeft) {
      // Le sachet qui vient d'être perdu est celui d'index `ballsLeft` (0-based).
      this.#playBallLoss(ballsLeft);
    }
    this.#prevBallsLeft = ballsLeft;
  }

  #showAttract() {
    this.#refs.root?.classList.remove("show-game-over");
    this.#refs.root?.classList.remove("entered");
  }

  #showBackglass() {
    this.#refs.root?.classList.remove("show-game-over");
    this.#refs.root?.classList.add("entered");
  }

  // Effet "entree dans le game over" : remplit le dossier "scène de crime"
  // (une seule fois) puis masque l'accueil et révèle l'écran game over.
  #showGameOver(score, highScore) {
    const refs = this.#refs;
    if (refs.gameOverScore) refs.gameOverScore.textContent = formatScore(score);
    if (refs.gameOverRecord) refs.gameOverRecord.textContent = formatScore(highScore);
    if (refs.gameOverCase) {
      refs.gameOverCase.textContent = `CASE #${String(Math.floor(Math.random() * 900) + 100)}`;
    }
    const beatRecord = (score ?? 0) > 0 && (score ?? 0) >= (highScore ?? 0);
    refs.gameOverNewRecord?.classList.toggle("visible", beatRecord);

    refs.root?.classList.add("entered"); // accueil masqué
    refs.root?.classList.add("show-game-over");
  }

  // Quitte l'écran d'accueil (appelé sur "Press Enter").
  dismissAttract() {
    this.#refs.root?.classList.add("entered");
  }

  renderState(nextState) {
    this.#setScore(nextState.score ?? 0);
    this.#setHighscore(nextState.highScore ?? 0);
    this.#renderBalls(nextState.ballsLeft ?? 0);
    this.#screens.sync(nextState.status, nextState.score, nextState.highScore);
  }

  showHighScorePopup() {
    const popup = this.#refs.highscorePopup;
    if (!popup) return;
    popup.setAttribute("aria-hidden", "false");
    popup.classList.add("visible");
    const ANIMATION_DURATION = 3500;
    setTimeout(() => {
      popup.classList.remove("visible");
      popup.setAttribute("aria-hidden", "true");
    }, ANIMATION_DURATION);
  }

  showVideoPopup(eventType) {
    const popup = this.#refs.videoPopup;
    const video = this.#refs.specialEventVideo;
    if (!popup || !video) return;
    if (!video.paused && !video.ended) return;
    const src = VIDEO_BY_EVENT[eventType];
    if (!src) return;

    const hide = () => {
      popup.classList.remove("visible");
      popup.setAttribute("aria-hidden", "true");
      video.src = "";
      video.onerror = null;
      video.onended = null;
    };

    video.src = src;
    video.load();
    popup.setAttribute("aria-hidden", "false");
    popup.classList.add("visible");
    video.onended = hide;
    video.onerror = hide;
    video.addEventListener('canplay', function onCanPlay() {
      video.removeEventListener('canplay', onCanPlay);
      video.play().catch(hide);
    });
  }
}
