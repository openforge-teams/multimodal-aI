// 重写 assets 包以支持 SQLite
import { prisma } from '@dreamforge/db';
import type { Asset } from '@dreamforge/types';

function safeParse<T = any>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export { createAsset, getAsset, getAssets, deleteAsset, getVersionHistory, dbToAsset, updateAsset };

function dbToAsset(db: any): Asset {
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
    params: safeParse(db.params, {}),
    seed: db.seed || undefined,
    credits_cost: db.creditsCost,
    created_at: db.createdAt.toISOString(),
    tags: safeParse<string[]>(db.tags, []),
    root_asset_id: db.rootAssetId || undefined,
    version: db.version,
  };
}

interface CreateAssetParams {
  userId: string; type: string; url: string; thumbnail?: string; taskId: string;
  provider: string; model: string; prompt: string; params: Record<string, unknown>;
  seed?: number; creditsCost?: number; parentId?: string; tags?: string[];
}

async function createAsset(params: CreateAssetParams): Promise<Asset> {
  let rootAssetId: string | undefined = params.parentId;
  let version = 1;
  if (params.parentId) {
    const parent = await prisma.asset.findUnique({
      where: { id: params.parentId },
      select: { rootAssetId: true, version: true },
    });
    if (parent) { rootAssetId = parent.rootAssetId || params.parentId; version = parent.version + 1; }
  }
  const asset = await prisma.asset.create({
    data: {
      userId: params.userId, type: params.type, url: params.url, thumbnail: params.thumbnail,
      taskId: params.taskId, provider: params.provider, model: params.model,
      prompt: params.prompt, params: JSON.stringify(params.params), seed: params.seed,
      creditsCost: params.creditsCost || 0, parentId: params.parentId, rootAssetId, version,
      tags: JSON.stringify(params.tags || []),
    },
  });
  return dbToAsset(asset);
}

async function getAsset(assetId: string): Promise<Asset | null> {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  return asset ? dbToAsset(asset) : null;
}

interface ListAssetsParams { userId: string; type?: string; limit?: number; offset?: number; tags?: string[]; }

async function getAssets(params: ListAssetsParams): Promise<Asset[]> {
  const assets = await prisma.asset.findMany({
    where: { userId: params.userId, ...(params.type ? { type: params.type } : {}) },
    orderBy: { createdAt: 'desc' },
    take: params.limit || 50,
    skip: params.offset || 0,
  });
  return assets.map(dbToAsset);
}

async function deleteAsset(assetId: string): Promise<void> {
  await prisma.asset.delete({ where: { id: assetId } });
}

async function getVersionHistory(assetId: string): Promise<Asset[]> {
  const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { rootAssetId: true, id: true } });
  if (!asset) return [];
  const rootId = asset.rootAssetId || asset.id;
  const versions = await prisma.asset.findMany({
    where: { OR: [{ rootAssetId: rootId }, { id: rootId }] },
    orderBy: { version: 'asc' },
  });
  return versions.map(dbToAsset);
}

async function updateAsset(assetId: string, updates: any): Promise<Asset | null> {
  const data: any = {};
  if (updates.tags) data.tags = JSON.stringify(updates.tags);
  if (updates.isPublic !== undefined) data.isPublic = updates.isPublic;
  if (updates.prompt !== undefined) data.prompt = updates.prompt;
  const asset = await prisma.asset.update({ where: { id: assetId }, data });
  return dbToAsset(asset);
}
