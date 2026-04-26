import { describe, expect, it } from "vitest";
import { pruneBucket } from "@/lib/security/rate-limit";

describe("pruneBucket", () => {
  it("drops timestamps older than 1h window", () => {
    const now = 1_000_000_000;
    const WINDOW = 60 * 60 * 1000;
    const old = now - WINDOW - 1;
    expect(pruneBucket(now, [old, now - 1000])).toEqual([now - 1000]);
  });
});
