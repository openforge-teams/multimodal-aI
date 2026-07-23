import { prisma, type UserProvider, type ProviderProtocol } from '@dreamforge/db';
import type {
  Provider,
  ProviderConfig,
  ProviderCapabilities,
  TaskModality,
} from '@dreamforge/types';
import { createLLMRuntime, type LLMRuntime } from '@dreamforge/model-runtime';
import { createImageRuntime, type ImageRuntime } from '@dreamforge/image-runtime';
import { createVideoRuntime, type VideoRuntime } from '@dreamforge/video-runtime';

export {
  normalizeProvider,
  validateProvider,
  getProviders,
  getProviderById,
  getPrimaryProvider,
  getCompatibleProviders,
  createRuntimeForProvider,
  getLLMRuntime,
  getImageRuntime,
  getVideoRuntime,
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

  if (!provider.id || provider.id.length < 2 || provider.id.length > 40) {
    errors.push('Provider ID must be 2-40 characters');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(provider.id)) {
    errors.push('Provider ID can only contain letters, numbers, hyphens, and underscores');
  }
  if (!provider.name || provider.name.length > 60) {
    errors.push('Provider name must be ≤ 60 characters');
  }
  if (!/^https?:\/\//.test(provider.base_url)) {
    errors.push('Base URL must start with http:// or https://');
  }
  if (!['openai', 'apimart', 'native'].includes(provider.protocol)) {
    errors.push('Invalid protocol type');
  }

  return { valid: errors.length === 0, errors };
}

async function getProviders(userId: string): Promise<UserProvider[]> {
  return prisma.userProvider.findMany({
    where: { userId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
}

async function getProviderById(userId: string, providerId: string): Promise<UserProvider | null> {
  return prisma.userProvider.findUnique({
    where: { userId_providerId: { userId, providerId } },
  });
}

async function getPrimaryProvider(
  userId: string,
  modality: TaskModality,
): Promise<UserProvider | null> {
  const providers = await prisma.userProvider.findMany({
    where: {
      userId,
      enabled: true,
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });

  // 先找主提供商
  const primary = providers.find((p) => p.isPrimary);
  if (primary && hasModality(primary, modality)) {
    return primary;
  }

  // 找第一个支持该模态的
  return providers.find((p) => hasModality(p, modality)) || null;
}

async function getCompatibleProviders(
  userId: string,
  modality: TaskModality,
  capability?: keyof ProviderCapabilities,
): Promise<UserProvider[]> {
  const providers = await prisma.userProvider.findMany({
    where: {
      userId,
      enabled: true,
    },
  });

  return providers.filter((p) => {
    if (!hasModality(p, modality)) return false;
    if (capability) {
      const caps = p.capabilities as ProviderCapabilities;
      return caps[capability];
    }
    return true;
  });
}

function hasModality(provider: UserProvider, modality: TaskModality): boolean {
  switch (modality) {
    case 'llm':
      return provider.llmModels.length > 0;
    case 'image':
      return provider.imageModels.length > 0;
    case 'video':
      return provider.videoModels.length > 0;
    default:
      return false;
  }
}

function mapDbToProvider(db: UserProvider): ProviderConfig {
  return {
    id: db.providerId,
    name: db.name,
    base_url: db.baseUrl,
    protocol: db.protocol as ProviderConfig['protocol'],
    enabled: db.enabled,
    primary: db.isPrimary,
    llm_models: db.llmModels,
    image_models: db.imageModels,
    video_models: db.videoModels,
    capabilities: db.capabilities as ProviderCapabilities,
    rate_limit_rpm: db.rateLimitRpm,
  };
}

async function getProviderApiKey(userId: string, providerId: string): Promise<string | null> {
  const result = await prisma.userProvider.findUnique({
    where: { userId_providerId: { userId, providerId } },
    include: { apiKey: true },
  });

  if (!result?.apiKey) return null;

  // 实际生产环境需要解密，这里简化处理
  return result.apiKey.encryptedKey;
}

async function createRuntimeForProvider(
  userId: string,
  providerId: string,
): Promise<{ llm?: LLMRuntime; image?: ImageRuntime; video?: VideoRuntime } | null> {
  const provider = await getProviderById(userId, providerId);
  if (!provider) return null;

  const apiKey = await getProviderApiKey(userId, providerId);
  if (!apiKey) return null;

  const config = mapDbToProvider(provider);
  const params = { provider: config, apiKey };
  const result: { llm?: LLMRuntime; image?: ImageRuntime; video?: VideoRuntime } = {};

  if (provider.llmModels.length > 0) {
    result.llm = createLLMRuntime(params);
  }
  if (provider.imageModels.length > 0) {
    result.image = createImageRuntime(params);
  }
  if (provider.videoModels.length > 0) {
    result.video = createVideoRuntime(params);
  }

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
