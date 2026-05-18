/**
 * Rapier — initialisation WASM.
 *
 * Rapier est livre en WASM. Il faut attendre `RAPIER.init()` avant toute
 * utilisation. main.js doit etre rendu async :
 *
 *     import { initRapier } from "./adapters/physics/rapier/init.js";
 *     await initRapier();
 *     // ... reste de la composition root
 *
 * On utilise `@dimforge/rapier3d-compat` (version pre-bundlee, plus simple
 * que `@dimforge/rapier3d` qui necessite un loader WASM specifique).
 */

let RAPIER = null;
let initialized = false;

export async function initRapier() {
  if (initialized) return RAPIER;
  const mod = await import("@dimforge/rapier3d-compat");
  RAPIER = mod.default ?? mod;
  await RAPIER.init();
  initialized = true;
  return RAPIER;
}

export function getRapier() {
  if (!initialized || !RAPIER) {
    throw new Error("Rapier non initialise — appeler `await initRapier()` avant.");
  }
  return RAPIER;
}
