import type { ModelInfo } from '~/lib/modules/llm/types';

/**
 * Judgment call, not a standard: comfortably above the median coding_index
 * across scored models (~35 out of 100 at last check, range roughly 3-76),
 * meant to capture models that are genuinely strong at coding rather than
 * "the best we happened to have data for." Revisit if OpenRouter's score
 * distribution shifts meaningfully.
 */
const MIN_QUALITY_SCORE = 55;

/** Default size of the curated "best for the task" list shown before search. */
export const TOP_MODELS_LIMIT = 10;

export function blendedPricePerMillion(model: ModelInfo): number | undefined {
  if (!model.pricing) {
    return undefined;
  }

  return (model.pricing.promptPerMillion + model.pricing.completionPerMillion) / 2;
}

/**
 * Highest qualityScore first; models without a score (every non-OpenRouter
 * provider, plus the ~75% of OpenRouter models Artificial Analysis hasn't
 * scored) sort last, in their original order — a reasonable stand-in for
 * "well, we don't know, so leave them where the provider put them."
 */
export function sortByQuality(models: ModelInfo[]): ModelInfo[] {
  return [...models].sort((a, b) => (b.qualityScore ?? -1) - (a.qualityScore ?? -1));
}

/** Top N models for the task by quality score, for the default (unsearched) list. */
export function getTopModels(models: ModelInfo[], limit: number = TOP_MODELS_LIMIT): ModelInfo[] {
  return sortByQuality(models).slice(0, limit);
}

/**
 * Cheapest model that clears a quality bar, using OpenRouter's `coding_index`
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
