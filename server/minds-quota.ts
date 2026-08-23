export const MINDS_DAILY_LIMIT = 5;

type UsageRecord = {
  dateKey: string;
  count: number;
};

const usageBySubject = new Map<string, UsageRecord>();

function getDateKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export type MindsQuotaResult = {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  dateKey: string;
};

/**
 * Atomically reserves one Minds analysis slot for a subject in the current UTC day.
 * The subject should be a stable authenticated user identifier when available.
 */
export function getMindsQuotaStatus(
  subject: string,
  now: Date = new Date(),
  limit: number = MINDS_DAILY_LIMIT,
): MindsQuotaResult {
  const dateKey = getDateKey(now);
  const current = usageBySubject.get(subject);
  const used = current?.dateKey === dateKey ? current.count : 0;
  return {
    allowed: used < limit,
    limit,
    used,
    remaining: Math.max(limit - used, 0),
    dateKey,
  };
}

export function reserveMindsSlot(
  subject: string,
  now: Date = new Date(),
  limit: number = MINDS_DAILY_LIMIT,
): MindsQuotaResult {
  const dateKey = getDateKey(now);
  const current = usageBySubject.get(subject);
  const used = current?.dateKey === dateKey ? current.count : 0;

  if (used >= limit) {
    return {
      allowed: false,
      limit,
      used,
      remaining: 0,
      dateKey,
    };
  }

  const nextUsed = used + 1;
  usageBySubject.set(subject, { dateKey, count: nextUsed });

  return {
    allowed: true,
    limit,
    used: nextUsed,
    remaining: Math.max(limit - nextUsed, 0),
    dateKey,
  };
}

/** Test-only reset; production callers should never need to clear quota state. */
export function resetMindsQuotaForTests(): void {
  usageBySubject.clear();
}

export function getMindsQuotaSubject(userId: number | null | undefined): string {
  return userId === null || userId === undefined ? "anonymous" : `user:${userId}`;
}
