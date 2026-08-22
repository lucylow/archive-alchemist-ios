import { describe, expect, it } from "vitest";

import { getMindsErrorNotice, getMindsRequestStartNotice } from "../lib/minds-notices";

describe("Minds request notices", () => {
  it("announces a fresh analysis and cleared prior recommendation", () => {
    expect(getMindsRequestStartNotice()).toContain("previous recommendation has been cleared");
  });

  it("returns actionable guidance for timeout failures", () => {
    expect(getMindsErrorNotice(new Error("Minds analysis timed out"))).toContain("Try again");
  });

  it("uses a safe fallback for unknown failures", () => {
    expect(getMindsErrorNotice({ message: "internal details" })).toBe(
      "Minds could not analyze this item right now. Your local workflow is still available.",
    );
  });
});
