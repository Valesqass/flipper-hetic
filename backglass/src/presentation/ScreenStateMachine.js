/**
 * Backglass — Machine d'etats des ecrans : accueil (attract) / jeu / game over.
 *
 * Le serveur repasse en "idle" ~6 s apres la defaite, mais on MAINTIENT
 * l'ecran Game Over pendant `holdMs` (2 min par defaut) avant de laisser
 * revenir l'accueil — sinon l'ecran clignoterait vers l'accueil trop tot.
 *
 * Pure logique de transition : AUCUNE dependance au DOM. Les effets visuels
 * sont injectes via les callbacks `onAttract` / `onBackglass` / `onGameOver`,
 * ce qui rend la machine testable isolement (timers simules).
 */
const GAME_OVER_HOLD_MS = 2 * 60 * 1000;

export class ScreenStateMachine {
  #onAttract;
  #onBackglass;
  #onGameOver;
  #holdMs;

  #gameOverActive = false;
  #gameOverTimer = 0;

  /**
   * @param {object} opts
   * @param {() => void} [opts.onAttract]   Afficher l'ecran d'accueil.
   * @param {() => void} [opts.onBackglass] Afficher l'ecran de jeu.
   * @param {(score: number, highScore: number) => void} [opts.onGameOver]
   *        Afficher l'ecran game over (appele UNE fois a l'entree).
   * @param {number} [opts.holdMs] Duree de maintien du game over.
   */
  constructor({ onAttract, onBackglass, onGameOver, holdMs = GAME_OVER_HOLD_MS } = {}) {
    this.#onAttract = onAttract ?? (() => {});
    this.#onBackglass = onBackglass ?? (() => {});
    this.#onGameOver = onGameOver ?? (() => {});
    this.#holdMs = holdMs;
  }

  /** Vrai tant que l'ecran game over est maintenu (fenetre `holdMs`). */
  get gameOverActive() {
    return this.#gameOverActive;
  }

  /**
   * Applique le `status` serveur et declenche l'effet d'ecran correspondant.
   */
  sync(status, score, highScore) {
    if (status === "playing") {
      clearTimeout(this.#gameOverTimer);
      this.#gameOverActive = false;
      this.#onBackglass();
      return;
    }

    if (status === "game_over") {
      // Entree dans le game over : on remplit l'ecran une seule fois et on
      // arme le minuteur de maintien. Les "game_over" suivants sont ignores.
      if (!this.#gameOverActive) {
        this.#gameOverActive = true;
        this.#onGameOver(score, highScore);
        clearTimeout(this.#gameOverTimer);
        this.#gameOverTimer = setTimeout(() => {
          this.#gameOverActive = false;
          this.#onAttract();
        }, this.#holdMs);
      }
      return;
    }

    // status "idle" : si on tient encore le game over (fenetre `holdMs`), on l'ignore.
    if (this.#gameOverActive) return;
    this.#onAttract();
  }
}
