import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { TRPCError } from "@trpc/server";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { mindsDiscoveryInput, runMindsDiscovery } from "./minds-agent";
import { getMindsAnalyticsComparison, getPersistedMindsQuotaStatus, recordMindsEvent, reservePersistedMindsSlot } from "./db";
import { classifyMindsFailure, clampMindsDurationMs, mindsAnalyticsSummaryInput } from "./minds-analytics";
import { MINDS_DAILY_LIMIT, getMindsQuotaSubject, getMindsQuotaStatus, reserveMindsSlot } from "./minds-quota";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  minds: router({
    analyticsSummary: adminProcedure
      .input(mindsAnalyticsSummaryInput.optional())
      .query(async ({ input }) => {
        const summary = await getMindsAnalyticsComparison(input?.windowDays ?? 7);
        if (!summary) {
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Minds analytics are temporarily unavailable." });
        }
        return summary;
      }),

    quota: publicProcedure.query(async ({ ctx }) => {
      const now = new Date();
      if (ctx.user) {
        try {
          const persisted = await getPersistedMindsQuotaStatus(ctx.user.id, now, MINDS_DAILY_LIMIT);
          if (persisted) return persisted;
        } catch (error) {
          console.warn("[Minds] Persistent quota status unavailable; using in-memory fallback", {
            errorType: error instanceof Error ? error.name : "unknown",
          });
        }
      }
      return getMindsQuotaStatus(getMindsQuotaSubject(ctx.user?.id), now, MINDS_DAILY_LIMIT);
    }),

    discover: publicProcedure.input(mindsDiscoveryInput).mutation(async ({ ctx, input }) => {
      const startedAt = Date.now();
      const userId = ctx.user?.id;
      const retryCount = input.retryAttempt ?? 0;
      let quota = null;
      if (ctx.user) {
        try {
          quota = await reservePersistedMindsSlot(ctx.user.id, new Date(), MINDS_DAILY_LIMIT);
        } catch (error) {
          console.warn("[Minds] Persistent quota unavailable; using in-memory fallback", {
            errorType: error instanceof Error ? error.name : "unknown",
          });
        }
      }
      quota ??= reserveMindsSlot(getMindsQuotaSubject(userId));

      if (!quota.allowed) {
        void recordMindsEvent({
          userId,
          outcome: "quota_blocked",
          durationMs: clampMindsDurationMs(Date.now() - startedAt),
          retryCount,
          platformCount: input.platforms.length,
          errorCode: "TOO_MANY_REQUESTS",
        });
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Daily Minds limit reached (${quota.limit} analyses). Try again tomorrow.`,
        });
      }

      try {
        const result = await runMindsDiscovery(input);
        void recordMindsEvent({
          userId,
          outcome: "success",
          durationMs: clampMindsDurationMs(Date.now() - startedAt),
          retryCount,
          platformCount: input.platforms.length,
          errorCode: null,
        });
        return result;
      } catch (error) {
        void recordMindsEvent({
          userId,
          outcome: "failure",
          durationMs: clampMindsDurationMs(Date.now() - startedAt),
          retryCount,
          platformCount: input.platforms.length,
          errorCode: classifyMindsFailure(error),
        });
        throw error;
      }
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
