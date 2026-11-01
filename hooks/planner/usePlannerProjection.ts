import { useEffect, useState } from "react";
import { recalculatePlannerProjection } from "@/services/plannerApplicationService";
import type {
  ObservedActiveUpgrade,
  PlannerPlan,
  ProgressionCandidate,
  UpgradeProjection,
} from "@/types/planner";
import type {
  PlannerLaneAvailability,
  PlannerPrerequisiteState,
} from "@/utils/planner/schedulePlanner";

interface UsePlannerProjectionInput {
  activeTag: string | null;
  queuePlan: PlannerPlan | null;
  snapshotReviewRequired: boolean;
  observedUpgrades: readonly ObservedActiveUpgrade[] | null;
  plannerCandidates: readonly ProgressionCandidate[];
  prerequisiteState: PlannerPrerequisiteState;
  laneAvailability: PlannerLaneAvailability;
}

export function usePlannerProjection({
  activeTag,
  queuePlan,
  snapshotReviewRequired,
  observedUpgrades,
  plannerCandidates,
  prerequisiteState,
  laneAvailability,
}: UsePlannerProjectionInput) {
  const [projectionState, setProjectionState] = useState<{
    accountTag: string;
    planId: PlannerPlan["id"];
    projections: readonly UpgradeProjection[];
  } | null>(null);
  const [projectionErrorState, setProjectionErrorState] = useState<{
    accountTag: string | null;
    message: string;
  } | null>(null);
  const setProjectionError = (message: string | null) => {
    setProjectionErrorState(message === null ? null : { accountTag: activeTag, message });
  };
  const projections = activeTag && queuePlan?.accountTag === activeTag &&
    projectionState?.accountTag === activeTag &&
    projectionState.planId === queuePlan.id
    ? projectionState.projections
    : null;
  const projectionError = projectionErrorState?.accountTag === activeTag
    ? projectionErrorState.message
    : null;

  useEffect(() => {
    let cancelled = false;
    setProjectionState(null);
    setProjectionError(null);
    if (!activeTag || !queuePlan || queuePlan.accountTag !== activeTag) return;
    if (snapshotReviewRequired) {
      setProjectionError("Village data changed or its freshness cannot be verified. Review the current snapshot before recalculating this saved plan.");
      return;
    }
    if (observedUpgrades === null) {
      setProjectionError("A live timer has no confirmed lane assignment. Scheduling is paused rather than guessing which builder or lab is occupied.");
      return;
    }
    void recalculatePlannerProjection({
      accountTag: activeTag,
      planId: queuePlan.id,
      nowMs: Date.now(),
      candidates: plannerCandidates,
      observedActiveUpgrades: observedUpgrades,
      prerequisiteState,
      laneAvailability,
    }).then((projection) => {
      if (!cancelled) {
        setProjectionState({
          accountTag: activeTag,
          planId: queuePlan.id,
          projections: projection?.projections ?? [],
        });
      }
    }).catch((projectionLoadError: unknown) => {
      if (!cancelled) {
        setProjectionError(
          projectionLoadError instanceof Error
            ? projectionLoadError.message
            : "Could not calculate the upgrade schedule.",
        );
      }
    });
    return () => { cancelled = true; };
  }, [
    activeTag,
    laneAvailability,
    observedUpgrades,
    plannerCandidates,
    prerequisiteState,
    queuePlan,
    snapshotReviewRequired,
  ]);

  return { projections, projectionError, setProjectionError };
}
