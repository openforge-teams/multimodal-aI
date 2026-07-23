import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { getAsset, getAssets, deleteAsset, getVersionHistory, updateAsset } from '@dreamforge/assets';
import { prisma } from '@dreamforge/db';

export const assetRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ assetId: z.string() }))
    .query(async ({ input }) => {
      return getAsset(input.assetId);
    }),

  list: protectedProcedure
    .input(
      z.object({
        type: z.enum(['image', 'video']).optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().default(0),
        tags: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return getAssets({
        userId: ctx.user.id,
        type: input.type,
        limit: input.limit,
        offset: input.offset,
        tags: input.tags,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ assetId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // 验证所有权
      const asset = await prisma.asset.findUnique({
        where: { id: input.assetId },
        select: { userId: true },
      });

      if (!asset || asset.userId !== ctx.user.id) {
        throw new Error('Not authorized');
      }

      await deleteAsset(input.assetId);
      return { success: true };
    }),

  versionHistory: protectedProcedure
    .input(z.object({ assetId: z.string() }))
    .query(async ({ input }) => {
      return getVersionHistory(input.assetId);
    }),

  update: protectedProcedure
    .input(
      z.object({
        assetId: z.string(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().optional(),
        prompt: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const asset = await prisma.asset.findUnique({
        where: { id: input.assetId },
        select: { userId: true },
      });

      if (!asset || asset.userId !== ctx.user.id) {
        throw new Error('Not authorized');
      }

      return updateAsset(input.assetId, {
        tags: input.tags,
        isPublic: input.isPublic,
        prompt: input.prompt,
      });
    }),
});
