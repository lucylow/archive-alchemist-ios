import { describe, expect, it } from "vitest";

import { buildAdminAnalyticsCards, buildAdminAnalyticsTrends } from "../lib/admin-analytics";
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
  it("formats aggregate metric deltas against the previous matching window", () => {
    expect(buildAdminAnalyticsTrends(summary, { ...summary, totalRequests: 7, successRate: 0.7, retryRate: 0.1, averageDurationMs: 500 })).toEqual([
      { label: "Requests", value: "+3", accessibilityLabel: "+3 requests versus the previous window" },
      { label: "Success", value: "+10 pp", accessibilityLabel: "+10 percentage points success rate versus the previous window" },
      { label: "Retries", value: "+10 pp", accessibilityLabel: "+10 percentage points retry rate versus the previous window" },
      { label: "Latency", value: "-80 ms", accessibilityLabel: "-80 milliseconds average latency versus the previous window" },
    ]);
  });

  it("formats aggregate metrics for readable accessible cards", () => {
    expect(buildAdminAnalyticsCards(summary)).toEqual([
      { label: "Requests", value: "10", accessibilityLabel: "10 total Minds requests" },
      { label: "Success rate", value: "80%", accessibilityLabel: "80% Minds success rate" },
      { label: "Retry rate", value: "20%", accessibilityLabel: "20% Minds retry rate" },
      { label: "Average latency", value: "420 ms", accessibilityLabel: "420 milliseconds average Minds latency" },
    ]);
  });
});

