import { beforeEach, describe, expect, it } from "vitest";

import {
  getMindsQuotaSubject,
  MINDS_DAILY_LIMIT,
  reserveMindsSlot,
  resetMindsQuotaForTests,
} from "../server/minds-quota";

describe("Minds daily quota", () => {
  beforeEach(() => {
    resetMindsQuotaForTests();
  });

  it("allows five analyses and blocks the sixth for one subject", () => {
    const now = new Date("2026-08-23T12:00:00.000Z");
    const subject = getMindsQuotaSubject(42);

    for (let index = 0; index < MINDS_DAILY_LIMIT; index += 1) {
      expect(reserveMindsSlot(subject, now).allowed).toBe(true);
    }

    const blocked = reserveMindsSlot(subject, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.used).toBe(MINDS_DAILY_LIMIT);
    expect(blocked.remaining).toBe(0);
  });

  it("keeps authenticated users independent and maps anonymous usage to a shared subject", () => {
    const now = new Date("2026-08-23T12:00:00.000Z");
    const authenticated = getMindsQuotaSubject(7);
    const otherAuthenticated = getMindsQuotaSubject(8);
    const anonymous = getMindsQuotaSubject(undefined);

    expect(reserveMindsSlot(authenticated, now).used).toBe(1);
    expect(reserveMindsSlot(otherAuthenticated, now).used).toBe(1);
    expect(reserveMindsSlot(anonymous, now).used).toBe(1);
    expect(getMindsQuotaSubject(null)).toBe("anonymous");
  });

  it("resets a subject's usage at the next UTC day", () => {
    const subject = getMindsQuotaSubject(42);
    const beforeMidnight = new Date("2026-08-23T23:59:59.000Z");
    const afterMidnight = new Date("2026-08-24T00:00:00.000Z");

    for (let index = 0; index < MINDS_DAILY_LIMIT; index += 1) {
      reserveMindsSlot(subject, beforeMidnight);
    }

    expect(reserveMindsSlot(subject, beforeMidnight).allowed).toBe(false);
    expect(reserveMindsSlot(subject, afterMidnight)).toMatchObject({
      allowed: true,
      used: 1,
      remaining: MINDS_DAILY_LIMIT - 1,
      dateKey: "2026-08-24",
    });
  });
});
