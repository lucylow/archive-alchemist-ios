import type { MindsAnalyticsSummary } from "@/server/db";

export type AdminAnalyticsCard = {
  label: string;
  value: string;
  accessibilityLabel: string;
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

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

