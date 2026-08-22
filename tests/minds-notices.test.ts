import { describe, expect, it } from "vitest";

import { getMindsErrorNotice } from "../lib/minds-notices";

describe("getMindsErrorNotice", () => {
  it("returns actionable guidance for timeout failures", () => {
    expect(getMindsErrorNotice(new Error("Minds analysis timed out"))).toContain("Try again");
  });

  it("uses a safe fallback for unknown failures", () => {
    expect(getMindsErrorNotice({ message: "internal details" })).toBe(
      "Minds could not analyze this item right now. Your local workflow is still available.",
    );
  });
});
