import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import { getSession } from './auth';

/**
 * tRPC 初始化 (v10)
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export type Context = {
  user?: { id: string; email: string; name: string | null };
};

export async function createTRPCContext(): Promise<Context> {
  const session = await getSession();
  return {
    user: session?.user,
  };
}

/**
 * 中间件
 */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user?.id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

/**
 * 路由和过程
 */
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const mergeRouters = t.mergeRouters;
