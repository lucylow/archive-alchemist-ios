import { describe, expect, it } from "vitest";

import { isValidSafeAreaInsets, MAX_SAFE_AREA_INSET } from "../shared/safe-area";

describe("safe-area payload validation", () => {
  it("accepts finite non-negative inset values within the bound", () => {
    expect(isValidSafeAreaInsets({ top: 47, right: 0, bottom: 34, left: 0 })).toBe(true);
  });

  it("rejects negative and non-finite values", () => {
    expect(isValidSafeAreaInsets({ top: -1, right: 0, bottom: 0, left: 0 })).toBe(false);
    expect(isValidSafeAreaInsets({ top: Number.NaN, right: 0, bottom: 0, left: 0 })).toBe(false);
    expect(isValidSafeAreaInsets({ top: Number.POSITIVE_INFINITY, right: 0, bottom: 0, left: 0 })).toBe(false);
  });

  it("rejects inset values above the defensive bound", () => {
    expect(
      isValidSafeAreaInsets({ top: MAX_SAFE_AREA_INSET + 1, right: 0, bottom: 0, left: 0 }),
    ).toBe(false);
  });
});
