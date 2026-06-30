/**
 * Backglass — Formatage de score (logique de presentation pure).
 *
 * Groupe les chiffres par 3 pour la lisibilite (ex. 12450 -> "12 450").
 * Sans dependance au DOM, donc testable isolement.
 */
export function formatScore(n) {
  return String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
