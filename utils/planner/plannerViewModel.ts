import type { UpgradeCost, UpgradeProjection } from "@/types/planner";

type ScheduledProjection = Extract<UpgradeProjection, { status: "scheduled" }>;

export interface PlannerViewModel {
  scheduledProjections: readonly ScheduledProjection[];
  scheduledCount: number;
  blockedCount: number;
  unknownCount: number;
  projectedFinishMs: number | null;
  hasIncompleteWork: boolean;
  knownCostProjections: readonly ScheduledProjection[];
  unknownScheduledCostCount: number;
  resourceTotals: Required<UpgradeCost>;
}

/**
 * Derives presentation summaries from scheduler output. This module deliberately
 * does not calculate schedules or infer missing costs and durations.
 */
export function getPlannerViewModel(
  projections: readonly UpgradeProjection[],
  plannedItemCount: number,
): PlannerViewModel {
  const scheduledProjections = projections.filter(
    (projection): projection is ScheduledProjection => projection.status === "scheduled",
  );
  const blockedCount = projections.filter((projection) => projection.status === "blocked").length;
  const unknownCount = projections.filter((projection) => projection.status === "unknown").length;
  const projectedFinishMs = scheduledProjections.reduce<number | null>(
    (latest, projection) => Math.max(latest ?? projection.completesAtMs, projection.completesAtMs),
    null,
  );
  const knownCostProjections = scheduledProjections.filter(
    (projection) => projection.estimate.cost.status === "known",
  );
  const resourceTotals = knownCostProjections.reduce<Required<UpgradeCost>>(
    (totals, projection) => {
      const estimate = projection.estimate.cost;
      if (estimate.status !== "known") return totals;
      totals.gold += estimate.value.gold ?? 0;
      totals.elixir += estimate.value.elixir ?? 0;
      totals.darkElixir += estimate.value.darkElixir ?? 0;
      return totals;
    },
    { gold: 0, elixir: 0, darkElixir: 0 },
  );

  return {
    scheduledProjections,
    scheduledCount: scheduledProjections.length,
    blockedCount,
    unknownCount,
    projectedFinishMs,
    hasIncompleteWork: blockedCount > 0 || unknownCount > 0 || projections.length < plannedItemCount,
    knownCostProjections,
    unknownScheduledCostCount: scheduledProjections.length - knownCostProjections.length,
    resourceTotals,
  };
}
