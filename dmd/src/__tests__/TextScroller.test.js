import { describe, it, expect } from "vitest";
import { TextScroller } from "../presentation/TextScroller.js";
import { measureTextWidth } from "../presentation/textMetrics.js";

// Fenetre etroite pour des nombres simples : cols=20, margin=2 -> visible=16.
// "AB"   -> 2*5+1  = 11  (<= 16 : tient, statique)
// "ABCD" -> 4*5+3  = 23  (>  16 : deborde, defile en boucle)
const COLS = 20;
const MARGIN = 2;

// Horloge controlable : on avance `clock.t` a la main.
function makeScroller() {
  const clock = { t: 0 };
  const scroller = new TextScroller({ cols: COLS, margin: MARGIN, now: () => clock.t });
  return { scroller, clock };
}

describe("TextScroller", () => {
  it("1 — reset d'un texte court : statique centre, ne pilote pas l'affichage", () => {
    const { scroller } = makeScroller();
    scroller.reset("AB");
    const width = measureTextWidth("AB"); // 11
    const targetX = Math.floor((COLS - width) / 2); // 4
    expect(scroller.isDriving).toBe(false);
    expect(scroller.text).toBe("AB");
    expect(scroller.offsetX).toBe(targetX);
  });

  it("2 — reset d'un texte large : passe en boucle (pilote l'affichage)", () => {
    const { scroller } = makeScroller();
    scroller.reset("ABCD");
    expect(scroller.isDriving).toBe(true);
    expect(scroller.isTransitioning).toBe(false);
    // Demarre hors fenetre (a droite), a `cols`.
    expect(scroller.offsetX).toBe(COLS);
  });

  it("3 — update fait avancer le defilement apres le pas de temps", () => {
    const { scroller, clock } = makeScroller();
    scroller.reset("ABCD"); // boucle, offset = 20
    clock.t = 0;
    scroller.update(30); // > SCROLL_STEP_MS (28)
    expect(scroller.offsetX).toBe(COLS - 1);
  });

  it("4 — update throttle : aucun mouvement avant le pas de temps", () => {
    const { scroller } = makeScroller();
    scroller.reset("ABCD");
    scroller.update(10); // < 28 ms
    expect(scroller.offsetX).toBe(COLS);
  });

  it("5 — update sans defilement actif (texte court) ne fait rien", () => {
    const { scroller } = makeScroller();
    scroller.reset("AB"); // statique
    const before = scroller.offsetX;
    scroller.update(1000);
    expect(scroller.offsetX).toBe(before);
  });

  it("6 — une transition vers un texte court finit par se figer, centree", () => {
    const { scroller } = makeScroller();
    scroller.reset("AB");
    scroller.scheduleTransition("CD", "AB");
    expect(scroller.isTransitioning).toBe(true);
    expect(scroller.isDriving).toBe(true);

    // Pilote l'animation jusqu'a stabilisation (chaque pas = 1 px / 28 ms).
    let now = 0;
    for (let i = 0; i < 200 && scroller.isDriving; i += 1) {
      now += 30;
      scroller.update(now);
    }

    expect(scroller.isTransitioning).toBe(false);
    expect(scroller.isDriving).toBe(false);
    expect(scroller.text).toBe("CD");
    // Fin de transition : centrage NON arrondi (comportement historique).
    expect(scroller.offsetX).toBe((COLS - measureTextWidth("CD")) / 2);
  });

  it("7 — interrupt coupe le defilement en cours", () => {
    const { scroller } = makeScroller();
    scroller.reset("ABCD"); // boucle
    expect(scroller.isDriving).toBe(true);
    scroller.interrupt();
    expect(scroller.isDriving).toBe(false);
  });

  it("8 — setStatic met a jour le texte centre quand rien ne defile", () => {
    const { scroller } = makeScroller();
    scroller.reset("AB");
    scroller.setStatic("CD");
    expect(scroller.text).toBe("CD");
    expect(scroller.offsetX).toBe(Math.floor((COLS - measureTextWidth("CD")) / 2));
  });

  it("9 — setStatic est ignore pendant une transition (ne la casse pas)", () => {
    const { scroller } = makeScroller();
    scroller.reset("AB");
    scroller.scheduleTransition("CD", "AB");
    const composite = scroller.text;
    scroller.setStatic("ZZ");
    expect(scroller.isTransitioning).toBe(true);
    expect(scroller.text).toBe(composite); // inchange
  });

  it("10 — scheduleTransition vers le meme texte est un no-op", () => {
    const { scroller } = makeScroller();
    scroller.reset("AB");
    scroller.scheduleTransition("AB", "AB");
    expect(scroller.isTransitioning).toBe(false);
    expect(scroller.text).toBe("AB");
  });
});
