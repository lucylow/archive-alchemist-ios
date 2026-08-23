import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsCards } from "../lib/admin-analytics";
import type { MindsAnalyticsSummary } from "../server/db";

const summary: MindsAnalyticsSummary = {
  windowDays: 7,
  since: new Date("2026-08-16T00:00:00.000Z"),
  totalRequests: 10,
  successCount: 8,
  failureCount: 2,
  quotaBlockedCount: 1,
  averageDurationMs: 420,
  retriedRequestCount: 2,
  successRate: 0.8,
  retryRate: 0.2,
};

describe("administrator analytics view model", () => {
  it("formats aggregate metrics for readable accessible cards", () => {
    expect(buildAdminAnalyticsCards(summary)).toEqual([
      { label: "Requests", value: "10", accessibilityLabel: "10 total Minds requests" },
      { label: "Success rate", value: "80%", accessibilityLabel: "80% Minds success rate" },
      { label: "Retry rate", value: "20%", accessibilityLabel: "20% Minds retry rate" },
      { label: "Average latency", value: "420 ms", accessibilityLabel: "420 milliseconds average Minds latency" },
    ]);
  });
});

