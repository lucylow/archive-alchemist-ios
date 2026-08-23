import { z } from "zod";

export type MindsFailureCode = "TIMEOUT" | "NETWORK" | "STRUCTURED_OUTPUT" | "UPSTREAM";

export const mindsAnalyticsSummaryInput = z.object({
  windowDays: z.union([z.literal(1), z.literal(7), z.literal(30)]).default(7),
});

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
