import { z } from "zod";
import type { InsertMindsEvent } from "../drizzle/schema";

export type MindsFailureCode = "TIMEOUT" | "NETWORK" | "STRUCTURED_OUTPUT" | "UPSTREAM";

export const mindsAnalyticsSummaryInput = z.object({
  windowDays: z.union([z.literal(1), z.literal(7), z.literal(30)]).default(7),
});

export function sanitizeMindsEvent(event: Omit<InsertMindsEvent, "createdAt">): Omit<InsertMindsEvent, "createdAt"> {
  return {
    ...event,
    durationMs: clampMindsDurationMs(normalizeMindsAnalyticsMetric(event.durationMs)),
    retryCount: Math.min(Math.round(normalizeMindsAnalyticsMetric(event.retryCount)), 1),
    platformCount: Math.round(normalizeMindsAnalyticsMetric(event.platformCount)),
  };
}

export function normalizeMindsAnalyticsMetric(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export type MindsAnalyticsRates = {
  successRate: number;
  retryRate: number;
};

export function calculateMindsAnalyticsRates(
  totalRequests: number,
  successCount: number,
  retriedRequestCount: number,
): MindsAnalyticsRates {
  if (totalRequests <= 0) return { successRate: 0, retryRate: 0 };
  return {
    successRate: Math.max(0, Math.min(successCount / totalRequests, 1)),
    retryRate: Math.max(0, Math.min(retriedRequestCount / totalRequests, 1)),
  };
}

export const MINDS_ANALYTICS_RETENTION_DAYS = 90;
export const MINDS_ANALYTICS_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export function getMindsAnalyticsRetentionCutoff(
  now: Date = new Date(),
  retentionDays: number = MINDS_ANALYTICS_RETENTION_DAYS,
): Date {
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

export function shouldRunMindsAnalyticsCleanup(
  nowMs: number,
  lastRunMs: number,
  intervalMs: number = MINDS_ANALYTICS_CLEANUP_INTERVAL_MS,
): boolean {
  return nowMs - lastRunMs >= intervalMs;
}

export function classifyMindsFailure(error: unknown): MindsFailureCode {
  const message = (() => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    if (error && typeof error === "object") {
      const record = error as Record<string, unknown>;
      return [record.message, record.code]
        .filter((value): value is string => typeof value === "string")
        .join(" ");
    }
    return String(error);
  })().toLowerCase();

  if (["timed out", "timeout", "408"].some((signal) => message.includes(signal))) return "TIMEOUT";
  if (["network", "fetch"].some((signal) => message.includes(signal))) return "NETWORK";
  if (["structured", "json", "schema"].some((signal) => message.includes(signal))) return "STRUCTURED_OUTPUT";
  return "UPSTREAM";
}

export function clampMindsDurationMs(durationMs: number): number {
  return Math.max(0, Math.min(Math.round(durationMs), 2_147_483_647));
}
