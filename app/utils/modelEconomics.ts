import type { ModelInfo } from '~/lib/modules/llm/types';

/**
 * Judgment call, not a standard: comfortably above the median score across
 * scored models (~26 out of 100 at last check), meant to capture genuinely
 * capable models rather than "the best we happened to have data for."
 * Revisit if OpenRouter's score distribution shifts meaningfully.
 */
const MIN_QUALITY_SCORE = 45;

export function blendedPricePerMillion(model: ModelInfo): number | undefined {
  if (!model.pricing) {
    return undefined;
  }

  return (model.pricing.promptPerMillion + model.pricing.completionPerMillion) / 2;
}

/**
 * Cheapest model that clears a quality bar, using OpenRouter's `intelligence_index`
 * (from Artificial Analysis, an independent benchmarker) as the neutral score —
 * not cheapest overall, which is usually a free or low-quality model. Recomputed
 * from whatever's in modelList, so it moves with live pricing/scores rather than
 * naming one model forever. Free-tier (":free") variants are excluded even if
 * they'd otherwise win on price — they're usually rate-limited/lower-priority.
 */
export function getRecommendedModel(modelList: ModelInfo[]): ModelInfo | undefined {
  const candidates = modelList.filter(
    (m) =>
      m.provider === 'OpenRouter' &&
      m.pricing &&
      !m.name.toLowerCase().includes(':free') &&
      (m.qualityScore ?? 0) >= MIN_QUALITY_SCORE,
  );

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
