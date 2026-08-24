import { describe, expect, it } from "vitest";

import { readReduceMotionSetting } from "../lib/reduce-motion";

describe("readReduceMotionSetting", () => {
  it("returns the native setting when it resolves", async () => {
    await expect(readReduceMotionSetting(async () => true)).resolves.toBe(true);
    await expect(readReduceMotionSetting(async () => false)).resolves.toBe(false);
  });

  it("falls back to standard motion when the native read rejects", async () => {
    await expect(readReduceMotionSetting(async () => {
      throw new Error("native accessibility API unavailable");
    })).resolves.toBe(false);
  });
});
