import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../lib/trpc';
import { prisma } from '@dreamforge/db';
import { normalizeProvider, validateProvider } from '@dreamforge/providers';
import type { ProviderCapabilities } from '@dreamforge/types';

function safeParse<T = any>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function safeStringify(value: any): string {
  try { return JSON.stringify(value); } catch { return '[]'; }
}


export const providerRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const providers = await prisma.userProvider.findMany({
      where: { userId: ctx.user.id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      include: { apiKey: true },
    });

    return providers.map((p) => ({
      id: p.providerId,
      name: p.name,
      base_url: p.baseUrl,
      protocol: p.protocol,
      enabled: p.enabled,
      primary: p.isPrimary,
      llm_models: safeParse<string[]>(p.llmModels, []),
      image_models: safeParse<string[]>(p.imageModels, []),
      video_models: safeParse<string[]>(p.videoModels, []),
      capabilities: safeParse<Record<string, any>>(p.capabilities, {}),
      rate_limit_rpm: p.rateLimitRpm,
      has_api_key: !!p.apiKey,
      created_at: p.createdAt,
    }));
  }),

  create: protectedProcedure
    .input(
      z.object({
        id: z.string().min(2).max(40),
        name: z.string().max(60),
        base_url: z.string().url(),
        protocol: z.enum(['openai', 'apimart', 'native']),
        api_key: z.string().min(1),
        llm_models: z.array(z.string()).default([]),
        image_models: z.array(z.string()).default([]),
        video_models: z.array(z.string()).default([]),
        capabilities: z.record(z.any()).default({}),
        is_primary: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const normalized = normalizeProvider({
        id: input.id,
        name: input.name,
        base_url: input.base_url,
        protocol: input.protocol,
        llm_models: input.llm_models,
        image_models: input.image_models,
        video_models: input.video_models,
        capabilities: input.capabilities as ProviderCapabilities,
        primary: input.is_primary,
      });

      const validation = validateProvider(normalized);
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '));
      }

      // 如果设为主提供商，取消其他主提供商
      if (input.is_primary) {
        await prisma.userProvider.updateMany({
          where: { userId: ctx.user.id, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      const provider = await prisma.userProvider.create({
        data: {
          userId: ctx.user.id,
          providerId: input.id,
          name: input.name,
          baseUrl: input.base_url,
          protocol: input.protocol,
          isPrimary: input.is_primary,
          llmModels: safeStringify(input.llm_models),
          imageModels: safeStringify(input.image_models),
          videoModels: safeStringify(input.video_models),
          capabilities: safeStringify(input.capabilities),
          apiKey: {
            create: {
              encryptedKey: input.api_key, // 生产环境应加密
            },
          },
        },
      });

      return provider;
    }),

  update: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        name: z.string().max(60).optional(),
        base_url: z.string().url().optional(),
        protocol: z.enum(['openai', 'apimart', 'native']).optional(),
        api_key: z.string().optional(),
        llm_models: z.array(z.string()).optional(),
        image_models: z.array(z.string()).optional(),
        video_models: z.array(z.string()).optional(),
        capabilities: z.record(z.any()).optional(),
        enabled: z.boolean().optional(),
        is_primary: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.userProvider.findUnique({
        where: { userId_providerId: { userId: ctx.user.id, providerId: input.providerId } },
      });

      if (!existing) {
        throw new Error('Provider not found');
      }

      // 如果设为主提供商，取消其他主提供商
      if (input.is_primary) {
        await prisma.userProvider.updateMany({
          where: { userId: ctx.user.id, isPrimary: true, NOT: { providerId: input.providerId } },
          data: { isPrimary: false },
        });
      }

      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.base_url !== undefined) updateData.baseUrl = input.base_url;
      if (input.protocol !== undefined) updateData.protocol = input.protocol;
      if (input.llm_models !== undefined) updateData.llmModels = safeStringify(input.llm_models);
      if (input.image_models !== undefined) updateData.imageModels = safeStringify(input.image_models);
      if (input.video_models !== undefined) updateData.videoModels = safeStringify(input.video_models);
      if (input.capabilities !== undefined) updateData.capabilities = safeStringify(input.capabilities);
      if (input.enabled !== undefined) updateData.enabled = input.enabled;
      if (input.is_primary !== undefined) updateData.isPrimary = input.is_primary;

      const provider = await prisma.userProvider.update({
        where: { userId_providerId: { userId: ctx.user.id, providerId: input.providerId } },
        data: updateData,
      });

      // 更新 API Key
      if (input.api_key) {
        await prisma.providerApiKey.upsert({
          where: { userProviderId: provider.id },
          create: { userProviderId: provider.id, encryptedKey: input.api_key },
          update: { encryptedKey: input.api_key },
        });
      }

      return provider;
    }),

  delete: protectedProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const existing = await prisma.userProvider.findUnique({
        where: { userId_providerId: { userId: ctx.user.id, providerId: input.providerId } },
      });

      if (!existing) {
        throw new Error('Provider not found');
      }

      await prisma.userProvider.delete({
        where: { userId_providerId: { userId: ctx.user.id, providerId: input.providerId } },
      });

      return { success: true };
    }),

  testConnection: protectedProcedure
    .input(z.object({ providerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const provider = await prisma.userProvider.findUnique({
        where: { userId_providerId: { userId: ctx.user.id, providerId: input.providerId } },
        include: { apiKey: true },
      });

      if (!provider || !provider.apiKey) {
        throw new Error('Provider or API key not found');
      }

      try {
        const response = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/models`, {
          headers: {
            Authorization: `Bearer ${provider.apiKey.encryptedKey}`,
          },
        });

        if (!response.ok) {
          return {
            success: false,
            message: `Connection failed: ${response.status}`,
          };
        }

        return { success: true, message: 'Connection successful' };
      } catch (error: any) {
        return {
          success: false,
          message: error.message || 'Connection failed',
        };
      }
    }),
});
