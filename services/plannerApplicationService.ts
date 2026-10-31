import { getPlannerPlan } from "@/services/plannerPersistenceService";
import {
  schedulePlanner,
  type PlannerLaneAvailability,
  type PlannerPrerequisiteState,
} from "@/utils/planner/schedulePlanner";
import type {
  ObservedActiveUpgrade,
  PlannerPlanId,
  ProgressionCandidate,
  UpgradeProjection,
} from "@/types/planner";

export interface RecalculatePlannerProjectionInput {
  accountTag: string;
  planId: PlannerPlanId;
  nowMs: number;
  candidates: readonly ProgressionCandidate[];
  observedActiveUpgrades: readonly ObservedActiveUpgrade[];
  prerequisiteState: PlannerPrerequisiteState;
  laneAvailability: PlannerLaneAvailability;
}

export interface PlannerPlanProjection {
  accountTag: string;
  planId: PlannerPlanId;
  calculatedAtMs: number;
  projections: readonly UpgradeProjection[];
}

/**
 * Rebuilds disposable schedule output from account-owned user intent and the
 * caller's current progression context. Projection output is never persisted:
 * game timers remain observed state, while plan items remain user intent.
 */
export async function recalculatePlannerProjection(
  input: RecalculatePlannerProjectionInput,
): Promise<PlannerPlanProjection | null> {
  if (!input.accountTag.trim()) throw new Error("INVALID_ACCOUNT_TAG");
  if (!input.planId.trim()) throw new Error("INVALID_PLANNER_PLAN_ID");
  if (!Number.isSafeInteger(input.nowMs) || input.nowMs < 0) {
    throw new Error("INVALID_PLANNER_TIMESTAMP");
  }

  const plan = await getPlannerPlan(input.accountTag, input.planId);
  if (!plan) return null;

  const projections = schedulePlanner({
    nowMs: input.nowMs,
    candidates: input.candidates,
    items: plan.items,
    observedActiveUpgrades: input.observedActiveUpgrades.filter(
      (upgrade) => upgrade.accountTag === input.accountTag && upgrade.village === plan.village,
    ),
    prerequisiteState: input.prerequisiteState,
    laneAvailability: input.laneAvailability,
  });

  return {
    accountTag: plan.accountTag,
    planId: plan.id,
    calculatedAtMs: input.nowMs,
    projections,
  };
}
