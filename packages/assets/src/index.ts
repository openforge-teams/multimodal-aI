import { prisma, type Asset as DbAsset, type AssetType } from '@dreamforge/db';
import type { Asset } from '@dreamforge/types';
import { getPublicUrl, getPresignedUrl } from '@dreamforge/storage';

export {
  createAsset,
  getAsset,
  getAssets,
  deleteAsset,
  getVersionHistory,
  dbToAsset,
  updateAsset,
};

function dbToAsset(db: DbAsset): Asset {
  return {
    id: db.id,
    type: db.type as Asset['type'],
    url: db.url,
    thumbnail: db.thumbnail || undefined,
    parent_id: db.parentId || undefined,
    task_id: db.taskId,
    provider: db.provider,
    model: db.model,
    prompt: db.prompt,
    params: (db.params as Record<string, unknown>) || {},
    seed: db.seed || undefined,
    credits_cost: db.creditsCost,
    created_at: db.createdAt.toISOString(),
    tags: db.tags,
    root_asset_id: db.rootAssetId || undefined,
    version: db.version,
  };
}

interface CreateAssetParams {
  userId: string;
  type: AssetType;
  url: string;
  thumbnail?: string;
  taskId: string;
  provider: string;
  model: string;
  prompt: string;
  params: Record<string, unknown>;
  seed?: number;
  creditsCost?: number;
  parentId?: string;
  tags?: string[];
}

async function createAsset(params: CreateAssetParams): Promise<Asset> {
  // 确定 root_asset_id 和 version
  let rootAssetId: string | undefined = params.parentId;
  let version = 1;

  if (params.parentId) {
    const parent = await prisma.asset.findUnique({
      where: { id: params.parentId },
      select: { rootAssetId: true, version: true },
    });

    if (parent) {
      rootAssetId = parent.rootAssetId || params.parentId;
      version = parent.version + 1;
    }
  }

  const asset = await prisma.asset.create({
    data: {
      userId: params.userId,
      type: params.type,
      url: params.url,
      thumbnail: params.thumbnail,
      taskId: params.taskId,
      provider: params.provider,
      model: params.model,
      prompt: params.prompt,
      params: params.params as any,
      seed: params.seed,
      creditsCost: params.creditsCost || 0,
      parentId: params.parentId,
      rootAssetId,
      version,
      tags: params.tags || [],
    },
  });

  return dbToAsset(asset);
}

async function getAsset(assetId: string): Promise<Asset | null> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  return asset ? dbToAsset(asset) : null;
}

interface ListAssetsParams {
  userId: string;
  type?: AssetType;
  limit?: number;
  offset?: number;
  tags?: string[];
}

async function getAssets(params: ListAssetsParams): Promise<Asset[]> {
  const assets = await prisma.asset.findMany({
    where: {
      userId: params.userId,
      ...(params.type ? { type: params.type } : {}),
      ...(params.tags && params.tags.length > 0
        ? { tags: { hasSome: params.tags } }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: params.limit || 50,
    skip: params.offset || 0,
  });

  return assets.map(dbToAsset);
}

async function deleteAsset(assetId: string): Promise<void> {
  await prisma.asset.delete({
    where: { id: assetId },
  });
}

async function getVersionHistory(assetId: string): Promise<Asset[]> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { rootAssetId: true, id: true },
  });

  if (!asset) return [];

  const rootId = asset.rootAssetId || asset.id;

  const versions = await prisma.asset.findMany({
    where: {
      OR: [{ rootAssetId: rootId }, { id: rootId }],
    },
    orderBy: { version: 'asc' },
  });

  return versions.map(dbToAsset);
}

async function updateAsset(
  assetId: string,
  updates: Partial<{
    tags: string[];
    isPublic: boolean;
    prompt: string;
  }>,
): Promise<Asset | null> {
  const asset = await prisma.asset.update({
    where: { id: assetId },
    data: updates,
  });

  return dbToAsset(asset);
}

async function getAssetUrl(assetId: string, usePresigned: boolean = false): Promise<string | null> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { url: true },
  });

  if (!asset) return null;

  // 如果 URL 已经是完整的 HTTP URL，直接返回
  if (asset.url.startsWith('http://') || asset.url.startsWith('https://')) {
    return asset.url;
  }

  // 否则从 S3 获取
  if (usePresigned) {
    return getPresignedUrl(asset.url);
  }
  return getPublicUrl(asset.url);
}

export { getAssetUrl };
