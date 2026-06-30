/**
 * DMD — Machine d'etats du defilement de texte.
 *
 * Trois modes :
 *  - statique  : texte centre, immobile (tient dans la fenetre de `cols` points)
 *  - boucle    : texte plus large que la fenetre -> defile en continu
 *  - transition: glisse du texte courant vers le texte suivant, puis se fige
 *                (ou repart en boucle si le texte final deborde).
 *
 * Pure logique (aucun canvas) : le renderer lit `isDriving / text / textWidth /
 * offsetX` pour dessiner, et appelle `update(now)` a chaque frame. L'horloge est
 * injectable (`now`) pour rendre la machine testable sans navigateur.
 */
import { measureTextWidth } from "./textMetrics.js";

const SCROLL_STEP_MS = 28;
const SCROLL_PAUSE_MS = 1800;
const TRANSITION_SPACES = 3;

export class TextScroller {
  #cols;
  #margin;
  #visibleWidth;
  #clock;

  #offsetX;
  #pauseUntil = 0;
  #lastUpdate = 0;
  #active = false;
  #textWidth = 0;
  #targetX;
  #loop = false;
  #text = "";
  #finalText = "";
  #isTransition = false;

  /**
   * @param {object} opts
   * @param {number} opts.cols     Largeur de la fenetre d'affichage, en points.
   * @param {number} [opts.margin] Marge laterale, en points (defaut 2).
   * @param {() => number} [opts.now] Horloge en ms (defaut `performance.now`).
   */
  constructor({ cols, margin = 2, now = () => performance.now() } = {}) {
    this.#cols = cols;
    this.#margin = margin;
    this.#visibleWidth = cols - margin * 2;
    this.#clock = now;
    this.#offsetX = margin;
    this.#targetX = margin;
    this.#lastUpdate = now();
  }

  /** Le scroller pilote-t-il l'affichage (defilement ou transition en cours) ? */
  get isDriving() {
    return this.#isTransition || this.#active;
  }

  /** Une transition (glissement vers un nouveau texte) est-elle en cours ? */
  get isTransitioning() {
    return this.#isTransition;
  }

  get text() {
    return this.#text;
  }

  get textWidth() {
    return this.#textWidth;
  }

  get offsetX() {
    return this.#offsetX;
  }

  /**
   * (Re)initialise le scroller sur `text`. Centre et fige le texte s'il tient
   * dans la fenetre, sinon le fait defiler en boucle.
   * @param {object} [options]
   * @param {number} [options.pauseMs]   Pause initiale avant defilement.
   * @param {number} [options.offsetX]   Position de depart (defaut hors ecran).
   * @param {boolean} [options.isTransition] Mode transition (usage interne).
   * @param {number} [options.targetX]   Cible de la transition.
   * @param {string} [options.finalText] Texte final apres transition.
   */
  reset(text, options = {}) {
    const normalized = (text || "").toUpperCase().slice(0, 32);
    const width = measureTextWidth(normalized);
    this.#text = normalized;
    this.#textWidth = width;
    this.#lastUpdate = this.#clock();
    this.#pauseUntil = options.pauseMs != null ? this.#clock() + options.pauseMs : 0;
    this.#offsetX = options.offsetX ?? this.#cols;
    this.#finalText = options.finalText ?? normalized;
    this.#isTransition = !!options.isTransition;

    if (options.isTransition) {
      this.#targetX = options.targetX ?? Math.floor((this.#cols - width) / 2);
      this.#loop = false;
      this.#active = true;
    } else {
      this.#loop = width > this.#visibleWidth;
      this.#targetX = Math.floor((this.#cols - width) / 2);
      // Actif (donc anime) seulement si le texte deborde ; sinon statique centre.
      this.#active = this.#loop;
      if (!this.#loop) {
        this.#offsetX = this.#targetX;
      }
    }
  }

  /**
   * Programme une transition glissee de `currentText` vers `nextText`
   * (les deux textes defilent cote a cote, separes par quelques espaces).
   */
  scheduleTransition(nextText, currentText) {
    if (!nextText || currentText === nextText) {
      return;
    }

    const spacer = " ".repeat(TRANSITION_SPACES);
    const compositeText = `${currentText}${spacer}${nextText}`;
    const currentWidth = measureTextWidth(currentText);
    const nextWidth = measureTextWidth(nextText);
    const spacerWidth = measureTextWidth(spacer);
    const currentX = (this.#cols - currentWidth) / 2;
    const offsetX = this.#active ? this.#offsetX : currentX;
    const targetX = (this.#cols - nextWidth) / 2 - (currentWidth + spacerWidth);

    this.reset(compositeText, {
      offsetX,
      isTransition: true,
      targetX,
      finalText: nextText,
    });
  }

  /**
   * Fixe immediatement un texte statique centre (sans defilement), SAUF si une
   * transition est en cours (qu'on ne veut pas casser). Utilise pour rafraichir
   * le score affiche pendant la partie.
   */
  setStatic(text) {
    if (this.#isTransition) {
      return;
    }
    const width = measureTextWidth(text);
    this.#text = text;
    this.#textWidth = width;
    this.#loop = false;
    this.#targetX = Math.floor((this.#cols - width) / 2);
    this.#active = false;
    this.#offsetX = this.#targetX;
  }

  /** Coupe tout defilement/transition en cours (pour afficher un flash centre). */
  interrupt() {
    this.#active = false;
    this.#isTransition = false;
  }

  /** Avance l'animation a l'instant `now` (ms). Sans effet si rien ne defile. */
  update(now) {
    if (!this.#active) {
      return;
    }
    if (now < this.#pauseUntil) {
      return;
    }
    if (now - this.#lastUpdate < SCROLL_STEP_MS) {
      return;
    }

    this.#lastUpdate = now;
    this.#offsetX -= 1;

    if (this.#isTransition) {
      if (this.#offsetX <= this.#targetX) {
        this.#offsetX = this.#targetX;
        this.#isTransition = false;
        const finalText = this.#finalText;
        const width = measureTextWidth(finalText);
        this.#text = finalText;
        this.#textWidth = width;
        this.#loop = width > this.#visibleWidth;
        this.#targetX = (this.#cols - width) / 2;
        if (this.#loop) {
          this.#active = true;
        } else {
          this.#active = false;
          this.#offsetX = this.#targetX;
        }
      }
      return;
    }

    if (this.#loop) {
      if (this.#offsetX <= -this.#textWidth - this.#margin) {
        this.#offsetX = this.#cols;
        this.#pauseUntil = now + SCROLL_PAUSE_MS;
      }
    } else {
      if (this.#offsetX <= this.#targetX) {
        this.#offsetX = this.#targetX;
        this.#active = false;
      }
    }
  }
}
