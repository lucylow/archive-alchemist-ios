import { describe, expect, it } from "vitest";

import { canAutoPost, estimateTimeSaved, formatTimeSaved, getFreshReviewState, getPlatformPerformance, getSelectedOutputs, platformCountLabel } from "../lib/workflow";

describe("Archive Alchemist workflow rules", () => {
  it("maps selected platforms to platform-specific outputs", () => {
    expect(getSelectedOutputs(["Spotify", "Substack"])).toEqual([
      "Spotify Audiogram (0:45)",
      "Blog Post (1,200 words)",
    ]);
  });

  it("returns a clean review state for a fresh dig", () => {
    expect(getFreshReviewState()).toEqual({ reviewMode: false, approvedOutputs: [] });
  });

  it("rejects an Auto-Post attempt with no deliverables", () => {
    expect(canAutoPost(false, [], [])).toBe(false);
    expect(canAutoPost(true, [], [])).toBe(false);
  });

  it("requires every output to be approved in review mode", () => {
    const selected = ["YouTube Short (0:45)", "Instagram Reel (0:30)"];
    expect(canAutoPost(true, [selected[0]], selected)).toBe(false);
    expect(canAutoPost(true, selected, selected)).toBe(true);
    expect(canAutoPost(false, [], selected)).toBe(true);
  });

  it("returns platform-specific performance labels", () => {
    expect(getPlatformPerformance("Spotify")).toBe("18K listens");
    expect(getPlatformPerformance("Twitter")).toBe("22K impressions");
    expect(getPlatformPerformance("TikTok")).toBe("41K views");
  });

  it("estimates time from the selected platform outputs", () => {
    expect(estimateTimeSaved(["YouTube", "Instagram", "TikTok"])).toBe(133);
    expect(estimateTimeSaved([])).toBe(0);
  });

  it("formats time estimates safely and readably", () => {
    expect(formatTimeSaved(0)).toBe("0 minutes");
    expect(formatTimeSaved(60)).toBe("1 hour");
    expect(formatTimeSaved(133)).toBe("2 hours 13 minutes");
    expect(formatTimeSaved(Number.NaN)).toBe("0 minutes");
  });

  it("uses readable singular and plural platform labels", () => {
    expect(platformCountLabel(1)).toBe("1 platform");
    expect(platformCountLabel(3)).toBe("3 platforms");
  });
});
