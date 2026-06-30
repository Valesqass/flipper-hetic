import { describe, it, expect } from "vitest";
import { formatScore } from "../presentation/scoreFormat.js";

describe("formatScore", () => {
  it("1 — groupe les milliers par espaces", () => {
    expect(formatScore(12450)).toBe("12 450");
    expect(formatScore(1000000)).toBe("1 000 000");
  });

  it("2 — laisse les petits nombres intacts", () => {
    expect(formatScore(0)).toBe("0");
    expect(formatScore(999)).toBe("999");
  });

  it("3 — null/undefined sont traites comme 0", () => {
    expect(formatScore(null)).toBe("0");
    expect(formatScore(undefined)).toBe("0");
  });
});
