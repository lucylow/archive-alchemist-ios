import { describe, expect, it } from "vitest";

import { canAutoPost, getSelectedOutputs, platformCountLabel } from "../lib/workflow";

describe("Archive Alchemist workflow rules", () => {
  it("maps selected platforms to platform-specific outputs", () => {
    expect(getSelectedOutputs(["Spotify", "Substack"])).toEqual([
      "Spotify Audiogram (0:45)",
      "Blog Post (1,200 words)",
    ]);
  });

  it("requires every output to be approved in review mode", () => {
    const selected = ["YouTube Short (0:45)", "Instagram Reel (0:30)"];
    expect(canAutoPost(true, [selected[0]], selected)).toBe(false);
    expect(canAutoPost(true, selected, selected)).toBe(true);
    expect(canAutoPost(false, [], selected)).toBe(true);
  });

  it("uses readable singular and plural platform labels", () => {
    expect(platformCountLabel(1)).toBe("1 platform");
    expect(platformCountLabel(3)).toBe("3 platforms");
  });
});
