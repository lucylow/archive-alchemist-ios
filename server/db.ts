import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, InsertMindsEvent, mindsEvents, mindsUsage, users } from "../drizzle/schema";
import type { MindsQuotaResult } from "./minds-quota";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function recordMindsEvent(event: Omit<InsertMindsEvent, "createdAt">): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(mindsEvents).values(event);
  } catch (error) {
    console.warn("[Minds] Analytics event could not be recorded", error);
  }
}

export async function reservePersistedMindsSlot(
  userId: number,
  now: Date,
  limit: number,
): Promise<MindsQuotaResult | null> {
  const db = await getDb();
  if (!db) return null;

  const dateKey = now.toISOString().slice(0, 10);

  return db.transaction(async (tx) => {
    await tx
      .insert(mindsUsage)
      .values({ userId, usageDate: dateKey, requestCount: 0 })
      .onDuplicateKeyUpdate({ set: { updatedAt: now } });

    const rows = await tx
      .select()
      .from(mindsUsage)
      .where(and(eq(mindsUsage.userId, userId), eq(mindsUsage.usageDate, dateKey)))
      .limit(1);
    const current = rows[0];
    const used = current?.requestCount ?? 0;

    if (!current || used >= limit) {
      return {
        allowed: false,
        limit,
        used,
        remaining: 0,
        dateKey,
      };
    }

    await tx
      .update(mindsUsage)
      .set({ requestCount: used + 1, updatedAt: now })
      .where(eq(mindsUsage.id, current.id));

    return {
      allowed: true,
      limit,
      used: used + 1,
      remaining: Math.max(limit - used - 1, 0),
      dateKey,
    };
  });
}
