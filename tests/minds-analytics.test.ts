import { describe, expect, it } from "vitest";

import {
  classifyMindsFailure,
  calculateMindsAnalyticsRates,
  clampMindsDurationMs,
  getMindsAnalyticsRetentionCutoff,
  mindsAnalyticsSummaryInput,
  shouldRunMindsAnalyticsCleanup,
} from "../server/minds-analytics";

describe("Minds analytics helpers", () => {
  it("classifies failures without retaining their raw messages", () => {
    expect(classifyMindsFailure(new Error("Minds analysis timed out"))).toBe("TIMEOUT");
    expect(classifyMindsFailure("network request failed")).toBe("NETWORK");
    expect(classifyMindsFailure({ message: "invalid structured response" })).toBe("STRUCTURED_OUTPUT");
    expect(classifyMindsFailure({ code: "503" })).toBe("UPSTREAM");
  });

  it("clamps durations to safe non-negative integer database values", () => {
    expect(clampMindsDurationMs(-10)).toBe(0);
    expect(clampMindsDurationMs(12.8)).toBe(13);
    expect(clampMindsDurationMs(Number.MAX_SAFE_INTEGER)).toBe(2_147_483_647);
  });

  it("calculates stable zero-safe success and retry rates", () => {
    expect(calculateMindsAnalyticsRates(0, 0, 0)).toEqual({ successRate: 0, retryRate: 0 });
    expect(calculateMindsAnalyticsRates(10, 8, 2)).toEqual({ successRate: 0.8, retryRate: 0.2 });
    expect(calculateMindsAnalyticsRates(2, 4, -1)).toEqual({ successRate: 1, retryRate: 0 });
  });

  it("uses a deterministic 90-day retention cutoff", () => {
    const now = new Date("2026-08-23T12:00:00.000Z");
    expect(getMindsAnalyticsRetentionCutoff(now).toISOString()).toBe("2026-05-25T12:00:00.000Z");
  });

  it("runs cleanup only after the configured interval", () => {
    expect(shouldRunMindsAnalyticsCleanup(3_600_000, 0)).toBe(true);
    expect(shouldRunMindsAnalyticsCleanup(3_599_999, 0)).toBe(false);
  });

  it("accepts bounded analytics windows and defaults to seven days", () => {
    expect(mindsAnalyticsSummaryInput.parse({})).toEqual({ windowDays: 7 });
    expect(mindsAnalyticsSummaryInput.parse({ windowDays: 1 })).toEqual({ windowDays: 1 });
    expect(mindsAnalyticsSummaryInput.parse({ windowDays: 30 })).toEqual({ windowDays: 30 });
    expect(() => mindsAnalyticsSummaryInput.parse({ windowDays: 2 })).toThrow();
  });
});
