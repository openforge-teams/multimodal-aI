import { z } from 'zod';
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../../lib/trpc';
import { createTask, getTask, getTasks, cancelTask, updateTaskStatus } from '@dreamforge/tasks';
import { enqueueTask } from '@dreamforge/queue';
import { canAfford, calculateCost, getBalance, getUsage } from '@dreamforge/billing';
import { prisma } from '@dreamforge/db';

export const taskRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        provider: z.string(),
        model: z.string(),
        modality: z.enum(['llm', 'image', 'video']),
        requestType: z.string(),
        request: z.record(z.any()),
        parentTaskId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // 检查余额
      const estimatedCost = await calculateCost(input.provider, input.model, input.modality, {
        resolution: input.request.aspect_ratio as string,
        duration: input.request.duration as number,
        quality: input.request.quality as string,
        num_images: input.request.num_images as number,
      });

      const affordable = await canAfford(userId, estimatedCost);
      if (!affordable) {
        throw new Error('Insufficient credits. Please top up your account.');
      }

      // 创建任务
      const task = await createTask({
        userId,
        provider: input.provider,
        model: input.model,
        modality: input.modality,
        input: input.request,
        parentTaskId: input.parentTaskId,
      });

      // 更新状态为 queued
      await updateTaskStatus(task.task_id, 'queued');

      // 入队
      await enqueueTask({
        taskId: task.task_id,
        userId,
        provider: input.provider,
        model: input.model,
        modality: input.modality,
        request: input.request,
        requestType: input.requestType,
      });

      return task;
    }),

  get: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ input }) => {
      return getTask(input.taskId);
    }),

  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        modality: z.enum(['llm', 'image', 'video']).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ input, ctx }) => {
      return getTasks({
        userId: ctx.user.id,
        status: input.status as any,
        modality: input.modality,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  cancel: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input }) => {
      return cancelTask(input.taskId);
    }),
});
