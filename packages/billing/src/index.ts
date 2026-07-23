import { prisma } from '@dreamforge/db';
import type { TaskModality, ModelPricing } from '@dreamforge/types';

function safeParse<T = any>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export { getBalance, addCredits, deductCredits, calculateCost, canAfford, getUsage, getPricing, setPricing };

async function getBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
  return user?.credits || 0;
}

async function addCredits(userId: string, amount: number, type: string = 'topup', description?: string): Promise<number> {
  const user = await prisma.user.update({ where: { id: userId }, data: { credits: { increment: amount } } });
  await prisma.creditTransaction.create({ data: { userId, amount, type, description } });
  return user.credits;
}

async function deductCredits(userId: string, amount: number, taskId?: string, description?: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
  if (!user || user.credits < amount) throw new Error('Insufficient credits');
  const updated = await prisma.user.update({ where: { id: userId }, data: { credits: { decrement: amount } } });
  await prisma.creditTransaction.create({ data: { userId, amount: -amount, type: 'usage', taskId, description } });
  return updated.credits;
}

async function calculateCost(provider: string, model: string, modality: TaskModality, params: any = {}): Promise<number> {
  const pricing = await getPricing(provider, model, modality);
  if (!pricing) {
    const defaults: Record<string, number> = { llm: 1, image: 10, video: 50 };
    return defaults[modality] || 1;
  }
  let cost = pricing.unit_cost;
  if (pricing.pricing_type === 'tiered' && pricing.tiers) {
    for (const tier of pricing.tiers) {
      let match = true;
      if (tier.condition?.resolution && tier.condition.resolution !== params.resolution) match = false;
      if (tier.condition?.duration && params.duration && params.duration < tier.condition.duration) match = false;
      if (tier.condition?.quality && tier.condition.quality !== params.quality) match = false;
      if (match) { cost = pricing.unit_cost * tier.multiplier; break; }
    }
  }
  if (params.num_images && params.num_images > 1) cost *= params.num_images;
  return Math.ceil(cost);
}

async function canAfford(userId: string, cost: number): Promise<boolean> {
  const balance = await getBalance(userId);
  return balance >= cost;
}

async function getUsage(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
  const where: any = { userId };
  if (startDate) where.createdAt = { ...where.createdAt, gte: startDate };
  if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };
  const transactions = await prisma.creditTransaction.findMany({ where, orderBy: { createdAt: 'desc' } });
  const totalUsed = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalAdded = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const balance = await getBalance(userId);
  return {
    total_used: totalUsed, total_added: totalAdded, balance,
    transactions: transactions.map((t) => ({ id: t.id, amount: t.amount, type: t.type, description: t.description, created_at: t.createdAt })),
  };
}

async function getPricing(provider: string, model: string, modality: TaskModality): Promise<ModelPricing | null> {
  const pricing = await prisma.modelPricing.findUnique({ where: { provider_model: { provider, model } } });
  if (!pricing) return null;
  return {
    provider: pricing.provider, model: pricing.model,
    modality: pricing.modality as ModelPricing['modality'],
    pricing_type: pricing.pricingType as ModelPricing['pricing_type'],
    unit_cost: pricing.unitCost,
    tiers: pricing.tiers ? safeParse(pricing.tiers, undefined) : undefined,
  };
}

async function setPricing(pricing: ModelPricing): Promise<void> {
  await prisma.modelPricing.upsert({
    where: { provider_model: { provider: pricing.provider, model: pricing.model } },
    update: {
      modality: pricing.modality as any, pricingType: pricing.pricing_type as any,
      unitCost: pricing.unit_cost, tiers: pricing.tiers ? JSON.stringify(pricing.tiers) : null,
    },
    create: {
      provider: pricing.provider, model: pricing.model, modality: pricing.modality as any,
      pricingType: pricing.pricing_type as any, unitCost: pricing.unit_cost,
      tiers: pricing.tiers ? JSON.stringify(pricing.tiers) : null,
    },
  });
}
