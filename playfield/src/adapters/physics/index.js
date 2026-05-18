/**
 * Barrel — selection du moteur physique.
 *
 * Backend actif : Rapier (@dimforge/rapier3d-compat).
 *
 * Pour repasser sur un autre backend (ex: Cannon-es), procedure detaillee
 * dans `rapier/MIGRATION.md` (section Rollback).
 *
 * Cf. ports/PhysicsPort.js pour le contrat d'API attendu de chaque backend.
 */

export * from "./rapier/index.js";

export const PHYSICS_ENGINE = "rapier";
