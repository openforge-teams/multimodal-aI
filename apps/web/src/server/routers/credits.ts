import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../lib/trpc';
import { prisma } from '@dreamforge/db';
import { getBalance, getUsage as getCreditsUsage } from '@dreamforge/billing';

export const creditsRouter = createTRPCRouter({
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const balance = await getBalance(ctx.user.id);
    return { balance };
  }),

  getUsage: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return getCreditsUsage(
        ctx.user.id,
        input.startDate ? new Date(input.startDate) : undefined,
        input.endDate ? new Date(input.endDate) : undefined,
      );
    }),
});

export const workflowRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        isTemplate: z.boolean().optional(),
        limit: z.number().default(50),
      }),
    )
    .query(async ({ input, ctx }) => {
      const workflows = await prisma.workflow.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.isTemplate !== undefined ? { isTemplate: input.isTemplate } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: input.limit,
      });

      return workflows;
    }),

  get: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ input }) => {
      return prisma.workflow.findUnique({
        where: { id: input.workflowId },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        definition: z.record(z.any()).default({ nodes: [], edges: [] }),
        isTemplate: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.workflow.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          definition: input.definition as any,
          isTemplate: input.isTemplate,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        definition: z.record(z.any()).optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.workflow.findUnique({
        where: { id: input.workflowId },
        select: { userId: true },
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new Error('Not authorized');
      }

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.definition !== undefined) updateData.definition = input.definition;
      if (input.isPublic !== undefined) updateData.isPublic = input.isPublic;

      return prisma.workflow.update({
        where: { id: input.workflowId },
        data: updateData,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.workflow.findUnique({
        where: { id: input.workflowId },
        select: { userId: true },
      });

      if (!existing || existing.userId !== ctx.user.id) {
        throw new Error('Not authorized');
      }

      await prisma.workflow.delete({
        where: { id: input.workflowId },
      });

      return { success: true };
    }),

  getTemplates: protectedProcedure.query(async () => {
    return prisma.workflow.findMany({
      where: { isTemplate: true },
      orderBy: { createdAt: 'desc' },
    });
  }),
});
