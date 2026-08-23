import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const mindsUsage = mysqlTable(
  "minds_usage",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    usageDate: varchar("usageDate", { length: 10 }).notNull(),
    requestCount: int("requestCount").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    userDateUnique: uniqueIndex("minds_usage_user_date_unique").on(table.userId, table.usageDate),
  }),
);

export type MindsUsage = typeof mindsUsage.$inferSelect;
export type InsertMindsUsage = typeof mindsUsage.$inferInsert;

export const mindsEvents = mysqlTable("minds_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  outcome: mysqlEnum("outcome", ["success", "failure", "quota_blocked"]).notNull(),
  durationMs: int("durationMs").notNull(),
  retryCount: int("retryCount").notNull().default(0),
  platformCount: int("platformCount").notNull(),
  errorCode: varchar("errorCode", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MindsEvent = typeof mindsEvents.$inferSelect;
export type InsertMindsEvent = typeof mindsEvents.$inferInsert;
