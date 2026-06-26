/**
 * Tests unitaires — server/src/domain/scoring.js
 *
 * Logique metier pure (fonctions sans I/O ni reseau) : barème de points
 * par type de collision et validation des types.
 */
import { describe, it, expect } from "vitest";
import { getPoints, isValidCollisionType } from "../domain/scoring.js";

describe("getPoints", () => {
  it.each([
    ["bumper", 100],
    ["bumper_50", 50],
    ["bumper_10", 10],
    ["tunnel", 1500],
    ["tunnel-rv", 500],
    ["triangle", 0],
    ["wall", 0],
    ["flipper", 0],
    ["drain", 0],
  ])("%s rapporte %i points", (type, points) => {
    expect(getPoints(type)).toBe(points);
  });

  it("retourne null pour un type inconnu", () => {
    expect(getPoints("inexistant")).toBeNull();
  });

  it("retourne null (et non 0) pour un type a 0 point inconnu", () => {
    // Garde-fou : '?? null' ne doit pas confondre 0 (type valide) et absence.
    expect(getPoints("wall")).toBe(0);
    expect(getPoints("autre")).toBeNull();
  });

  it("retourne null pour undefined ou null", () => {
    expect(getPoints(undefined)).toBeNull();
    expect(getPoints(null)).toBeNull();
  });

  it("est sensible a la casse", () => {
    expect(getPoints("BUMPER")).toBeNull();
  });
});

describe("isValidCollisionType", () => {
  it.each([
    "bumper",
    "bumper_50",
    "bumper_10",
    "tunnel",
    "tunnel-rv",
    "triangle",
    "wall",
    "flipper",
    "drain",
  ])("accepte le type valide %s", (type) => {
    expect(isValidCollisionType(type)).toBe(true);
  });

  it("rejette un type inconnu", () => {
    expect(isValidCollisionType("inexistant")).toBe(false);
  });

  it("rejette les valeurs non-string", () => {
    expect(isValidCollisionType(undefined)).toBe(false);
    expect(isValidCollisionType(null)).toBe(false);
    expect(isValidCollisionType(100)).toBe(false);
    expect(isValidCollisionType({})).toBe(false);
  });

  it("rejette la chaine vide", () => {
    expect(isValidCollisionType("")).toBe(false);
  });
});
