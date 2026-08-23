import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./_core/trpc";
import { mindsDiscoveryInput, runMindsDiscovery } from "./minds-agent";
import { getMindsQuotaSubject, reserveMindsSlot } from "./minds-quota";

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
    discover: publicProcedure.input(mindsDiscoveryInput).mutation(({ ctx, input }) => {
      const quota = reserveMindsSlot(getMindsQuotaSubject(ctx.user?.id));
      if (!quota.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Daily Minds limit reached (${quota.limit} analyses). Try again tomorrow.`,
        });
      }
      return runMindsDiscovery(input);
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
