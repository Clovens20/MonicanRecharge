import { describe, expect, it } from "vitest";
import { pointsFromUsd, rebateUsdFromPoints } from "@/lib/loyalty/points";

describe("pointsFromUsd", () => {
  it("10 points per dollar", () => {
    expect(pointsFromUsd(1)).toBe(10);
    expect(pointsFromUsd(5.5)).toBe(55);
  });
});

describe("rebateUsdFromPoints", () => {
  it("100 points = $0.50", () => {
    expect(rebateUsdFromPoints(100, 0)).toBe(0.5);
    expect(rebateUsdFromPoints(250, 0)).toBe(1);
    expect(rebateUsdFromPoints(99, 0)).toBe(0);
  });
});
