import type { ModelInfo } from '~/lib/modules/llm/types';

/**
 * Hand-maintained substrings identifying well-known, generally-capable model
 * families — used only to narrow the "recommended" pick to models people would
 * actually reach for, not just whatever is cheapest overall (which is usually a
 * niche/low-quality model). Loose substring match, not exact IDs, so it survives
 * minor version bumps (e.g. "claude-3.5-sonnet" still matches "-20241022" suffixed
 * IDs) — but new model families still need to be added here manually over time.
 */
const FLAGSHIP_FAMILIES = [
  'claude-3.5-sonnet',
  'claude-3.7-sonnet',
  'claude-sonnet-4',
  'claude-opus-4',
  'claude-3-opus',
  'gpt-4o',
  'gpt-4.1',
  'gpt-4-turbo',
  'openai/o1',
  'openai/o3',
  'gemini-1.5-pro',
  'gemini-2.0-pro',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'llama-3.1-405b',
  'llama-3.3-70b',
  'deepseek-v3',
  'deepseek-r1',
  'grok-2',
  'grok-3',
  'mistral-large',
];

export function isFlagshipModel(model: ModelInfo): boolean {
  const name = model.name.toLowerCase();

  /*
   * Exclude free-tier variants — usually rate-limited/lower-priority, not a great
   * default recommendation even though they're technically the cheapest option.
   */
  if (name.includes(':free')) {
    return false;
  }

  return FLAGSHIP_FAMILIES.some((family) => name.includes(family));
}

export function blendedPricePerMillion(model: ModelInfo): number | undefined {
  if (!model.pricing) {
    return undefined;
  }

  return (model.pricing.promptPerMillion + model.pricing.completionPerMillion) / 2;
}

/**
 * Best price/performance among models we'd actually recommend — cheapest
 * blended price among the flagship-family models currently available, not
 * cheapest overall. Recomputed from whatever's in modelList, so it moves with
 * OpenRouter's live pricing rather than naming one fixed model forever.
 */
export function getRecommendedModel(modelList: ModelInfo[]): ModelInfo | undefined {
  const candidates = modelList.filter((m) => m.provider === 'OpenRouter' && m.pricing && isFlagshipModel(m));

  if (candidates.length === 0) {
    return undefined;
  }

  return candidates.reduce((cheapest, candidate) => {
    const cheapestPrice = blendedPricePerMillion(cheapest) ?? Infinity;
    const candidatePrice = blendedPricePerMillion(candidate) ?? Infinity;

    return candidatePrice < cheapestPrice ? candidate : cheapest;
  });
}

export type CostTier = 'low' | 'medium' | 'high';

/**
 * Rough at-a-glance cost tier from blended $/1M tokens. Thresholds are a
 * judgment call, not a standard — meant for scanning a list quickly, not
 * precise budgeting (use the actual $ figures for that).
 */
export function getCostTier(blendedPrice: number): CostTier {
  if (blendedPrice <= 1) {
    return 'low';
  }

  if (blendedPrice <= 10) {
    return 'medium';
  }

  return 'high';
}
