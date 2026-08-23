import { describe, expect, it } from "vitest";

import type { User } from "../drizzle/schema";
import type { TrpcContext } from "../server/_core/context";
import { appRouter } from "../server/routers";

const baseContext = {
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

const adminUser: User = {
  id: 1,
  openId: "admin-user",
  name: "Admin User",
  email: "admin@example.com",
  loginMethod: "oauth",
  role: "admin",
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  lastSignedIn: new Date("2026-08-23T00:00:00.000Z"),
};

const regularUser: User = {
  id: 42,
  openId: "regular-user",
  name: "Regular User",
  email: "regular@example.com",
  loginMethod: "oauth",
  role: "user",
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
  lastSignedIn: new Date("2026-08-23T00:00:00.000Z"),
};

function caller(user: User | null) {
  return appRouter.createCaller({ ...baseContext, user });
}

describe("Minds analytics authorization", () => {
  it("rejects anonymous summary access", async () => {
    await expect(caller(null).minds.analyticsSummary({ windowDays: 7 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("rejects authenticated non-admin summary access", async () => {
    await expect(caller(regularUser).minds.analyticsSummary({ windowDays: 7 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows administrators to receive aggregate metrics without raw events", async () => {
    const summary = await caller(adminUser).minds.analyticsSummary({ windowDays: 7 });
    expect(summary.windowDays).toBe(7);
    expect(summary.totalRequests).toEqual(expect.any(Number));
    expect(summary.successRate).toEqual(expect.any(Number));
    expect(summary.retryRate).toEqual(expect.any(Number));
    expect(summary).not.toHaveProperty("errorMessage");
  });
});

