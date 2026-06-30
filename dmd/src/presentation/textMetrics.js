/**
 * DMD — Metrique de texte (logique de presentation pure).
 *
 * Largeur (en points) d'un texte rendu avec la police 5x7 : 5 points par glyphe
 * + 1 point d'espacement entre glyphes. Contrepartie « calcul » de
 * `view/font.js#drawBitmapText`. Sans dependance au DOM/canvas, donc testable
 * et utilisable par la logique de presentation (`TextScroller`).
 */
export function measureTextWidth(text) {
  if (!text) return 0;
  return text.length * 5 + Math.max(0, text.length - 1);
}
