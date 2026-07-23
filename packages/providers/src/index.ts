import { prisma } from '@dreamforge/db';
import type {
  Provider,
  ProviderConfig,
  ProviderCapabilities,
  TaskModality,
} from '@dreamforge/types';
import { createLLMRuntime, type LLMRuntime } from '@dreamforge/model-runtime';
import { createImageRuntime, type ImageRuntime } from '@dreamforge/image-runtime';
import { createVideoRuntime, type VideoRuntime } from '@dreamforge/video-runtime';

function safeParse<T = any>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export {
  normalizeProvider, validateProvider, getProviders, getProviderById,
  getPrimaryProvider, getCompatibleProviders, createRuntimeForProvider,
  getLLMRuntime, getImageRuntime, getVideoRuntime,
};

function normalizeProvider(provider: Partial<Provider>): Provider {
  return {
    id: provider.id || '',
    name: provider.name || provider.id || '',
    base_url: (provider.base_url || '').replace(/\/$/, ''),
    protocol: (provider.protocol || 'openai') as Provider['protocol'],
    enabled: provider.enabled ?? true,
    primary: provider.primary ?? false,
    llm_models: provider.llm_models || [],
    image_models: provider.image_models || [],
    video_models: provider.video_models || [],
    capabilities: provider.capabilities || {},
    rate_limit_rpm: provider.rate_limit_rpm || 60,
  };
}

function validateProvider(provider: Provider): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!provider.id || provider.id.length < 2 || provider.id.length > 40) errors.push('Provider ID must be 2-40 characters');
  if (!/^[a-zA-Z0-9_-]+$/.test(provider.id)) errors.push('Provider ID can only contain letters, numbers, hyphens, and underscores');
  if (!provider.name || provider.name.length > 60) errors.push('Provider name must be ≤ 60 characters');
  if (!/^https?:\/\//.test(provider.base_url)) errors.push('Base URL must start with http:// or https://');
  if (!['openai', 'apimart', 'native'].includes(provider.protocol)) errors.push('Invalid protocol type');
  return { valid: errors.length === 0, errors };
}

function mapDbToProvider(db: any): ProviderConfig {
  return {
    id: db.providerId,
    name: db.name,
    base_url: db.baseUrl,
    protocol: db.protocol as ProviderConfig['protocol'],
    enabled: db.enabled,
    primary: db.isPrimary,
    llm_models: safeParse<string[]>(db.llmModels, []),
    image_models: safeParse<string[]>(db.imageModels, []),
    video_models: safeParse<string[]>(db.videoModels, []),
    capabilities: safeParse<ProviderCapabilities>(db.capabilities, {}),
    rate_limit_rpm: db.rateLimitRpm,
  };
}

async function getProviders(userId: string): Promise<any[]> {
  return prisma.userProvider.findMany({
    where: { userId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
}

async function getProviderById(userId: string, providerId: string): Promise<any | null> {
  return prisma.userProvider.findUnique({
    where: { userId_providerId: { userId, providerId } },
  });
}

async function getPrimaryProvider(userId: string, modality: TaskModality): Promise<any | null> {
  const providers = await prisma.userProvider.findMany({
    where: { userId, enabled: true },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
  const hasModality = (p: any, m: TaskModality) => {
    const models = m === 'llm' ? p.llmModels : m === 'image' ? p.imageModels : p.videoModels;
    const parsed = safeParse<string[]>(models, []);
    return parsed.length > 0;
  };
  const primary = providers.find((p) => p.isPrimary);
  if (primary && hasModality(primary, modality)) return primary;
  return providers.find((p) => hasModality(p, modality)) || null;
}

async function getCompatibleProviders(userId: string, modality: TaskModality, capability?: keyof ProviderCapabilities): Promise<any[]> {
  const providers = await prisma.userProvider.findMany({ where: { userId, enabled: true } });
  return providers.filter((p: any) => {
    const models = modality === 'llm' ? p.llmModels : modality === 'image' ? p.imageModels : p.videoModels;
    if (safeParse<string[]>(models, []).length === 0) return false;
    if (capability) {
      const caps = safeParse<ProviderCapabilities>(p.capabilities, {});
      return caps[capability];
    }
    return true;
  });
}

async function getProviderApiKey(userId: string, providerId: string): Promise<string | null> {
  const result = await prisma.userProvider.findUnique({
    where: { userId_providerId: { userId, providerId } },
    include: { apiKey: true },
  });
  return result?.apiKey?.encryptedKey || null;
}

async function createRuntimeForProvider(userId: string, providerId: string): Promise<{ llm?: LLMRuntime; image?: ImageRuntime; video?: VideoRuntime } | null> {
  const provider = await getProviderById(userId, providerId);
  if (!provider) return null;
  const apiKey = await getProviderApiKey(userId, providerId);
  if (!apiKey) return null;
  const config = mapDbToProvider(provider);
  const params = { provider: config, apiKey };
  const result: { llm?: LLMRuntime; image?: ImageRuntime; video?: VideoRuntime } = {};
  const llmModels = safeParse<string[]>(provider.llmModels, []);
  const imageModels = safeParse<string[]>(provider.imageModels, []);
  const videoModels = safeParse<string[]>(provider.videoModels, []);
  if (llmModels.length > 0) result.llm = createLLMRuntime(params);
  if (imageModels.length > 0) result.image = createImageRuntime(params);
  if (videoModels.length > 0) result.video = createVideoRuntime(params);
  return result;
}

async function getLLMRuntime(userId: string, providerId?: string): Promise<LLMRuntime | null> {
  const pid = providerId || (await getPrimaryProvider(userId, 'llm'))?.providerId;
  if (!pid) return null;
  const runtime = await createRuntimeForProvider(userId, pid);
  return runtime?.llm || null;
}

async function getImageRuntime(userId: string, providerId?: string): Promise<ImageRuntime | null> {
  const pid = providerId || (await getPrimaryProvider(userId, 'image'))?.providerId;
  if (!pid) return null;
  const runtime = await createRuntimeForProvider(userId, pid);
  return runtime?.image || null;
}

async function getVideoRuntime(userId: string, providerId?: string): Promise<VideoRuntime | null> {
  const pid = providerId || (await getPrimaryProvider(userId, 'video'))?.providerId;
  if (!pid) return null;
  const runtime = await createRuntimeForProvider(userId, pid);
  return runtime?.video || null;
}
