import type { MindsAnalyticsSummary } from "@/server/db";

export type AdminAnalyticsCard = {
  label: string;
  value: string;
  accessibilityLabel: string;
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

export type AdminAnalyticsTrend = {
  label: string;
  value: string;
  accessibilityLabel: string;
};

const formatDelta = (value: number, suffix = "") => `${value > 0 ? "+" : ""}${value}${suffix}`;

export function buildAdminAnalyticsTrends(
  current: MindsAnalyticsSummary,
  previous: MindsAnalyticsSummary,
): AdminAnalyticsTrend[] {
  const successPointDelta = Math.round((current.successRate - previous.successRate) * 100);
  const retryPointDelta = Math.round((current.retryRate - previous.retryRate) * 100);
  const latencyDelta = current.averageDurationMs - previous.averageDurationMs;
  const requestDelta = current.totalRequests - previous.totalRequests;

  return [
    { label: "Requests", value: formatDelta(requestDelta), accessibilityLabel: `${formatDelta(requestDelta)} requests versus the previous window` },
    { label: "Success", value: formatDelta(successPointDelta, " pp"), accessibilityLabel: `${formatDelta(successPointDelta, " percentage points")} success rate versus the previous window` },
    { label: "Retries", value: formatDelta(retryPointDelta, " pp"), accessibilityLabel: `${formatDelta(retryPointDelta, " percentage points")} retry rate versus the previous window` },
    { label: "Latency", value: formatDelta(latencyDelta, " ms"), accessibilityLabel: `${formatDelta(latencyDelta, " milliseconds")} average latency versus the previous window` },
  ];
}

export function buildAdminAnalyticsCards(summary: MindsAnalyticsSummary): AdminAnalyticsCard[] {
  return [
    {
      label: "Requests",
      value: String(summary.totalRequests),
      accessibilityLabel: `${summary.totalRequests} total Minds requests`,
    },
    {
      label: "Success rate",
      value: formatPercent(summary.successRate),
      accessibilityLabel: `${formatPercent(summary.successRate)} Minds success rate`,
    },
    {
      label: "Retry rate",
      value: formatPercent(summary.retryRate),
      accessibilityLabel: `${formatPercent(summary.retryRate)} Minds retry rate`,
    },
    {
      label: "Average latency",
      value: `${summary.averageDurationMs} ms`,
      accessibilityLabel: `${summary.averageDurationMs} milliseconds average Minds latency`,
    },
  ];
}

