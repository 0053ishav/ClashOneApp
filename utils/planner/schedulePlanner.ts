import {
  isKnownEstimate,
  type ObservedActiveUpgrade,
  type PlannedUpgradeItem,
  type PlannerBlockReason,
  type PlannerLaneAssignment,
  type PlannerLaneId,
  type PlannerPrerequisiteStatus,
  type ProgressionCandidate,
  type UpgradePrerequisite,
  type UpgradeProjection,
} from "@/types/planner";
import { checkPlannerPrerequisite } from "@/utils/planner/checkPlannerPrerequisite";

export interface PlannerPrerequisiteState {
  townHallLevel: number;
  laboratoryLevel: number;
  petHouseLevel: number;
  entityLevels: Readonly<Record<string, number>>;
}

export interface PlannerLaneAvailability {
  normalBuilderCount: number;
  goblinBuilderEligible: boolean;
  goblinLaboratoryEligible: boolean;
}

export interface SchedulePlannerInput {
  /** Explicit clock input; this module never reads Date.now(). */
  nowMs: number;
  candidates: readonly ProgressionCandidate[];
  items: readonly PlannedUpgradeItem[];
  observedActiveUpgrades: readonly ObservedActiveUpgrade[];
  prerequisiteState: PlannerPrerequisiteState;
  laneAvailability: PlannerLaneAvailability;
}

interface Reservation {
  availableAtMs: number | null;
}

const laneKey = (assignment: PlannerLaneAssignment): string =>
  assignment.lane === "normal-builders"
    ? `normal-builders:${assignment.builderIndex}`
    : assignment.lane;

const laneId = (assignment: PlannerLaneAssignment): PlannerLaneId => assignment.lane;

const stableItemCompare = (a: PlannedUpgradeItem, b: PlannedUpgradeItem): number =>
  a.order - b.order ||
  a.createdAtMs - b.createdAtMs ||
  String(a.id).localeCompare(String(b.id));

function getLaneEligibilityReason(
  assignment: PlannerLaneAssignment,
  availability: PlannerLaneAvailability,
): PlannerBlockReason | undefined {
  if (
    assignment.lane === "normal-builders" &&
    (!Number.isInteger(assignment.builderIndex) ||
      assignment.builderIndex < 1 ||
      assignment.builderIndex > availability.normalBuilderCount)
  ) {
    return { code: "lane-unavailable", lane: assignment.lane };
  }
  if (assignment.lane === "goblin-builder" && !availability.goblinBuilderEligible) {
    return {
      code: "lane-ineligible",
      lane: assignment.lane,
      detail: "Goblin Builder requires a confirmed active event and player eligibility.",
    };
  }
  if (assignment.lane === "goblin-laboratory" && !availability.goblinLaboratoryEligible) {
    return {
      code: "lane-ineligible",
      lane: assignment.lane,
      detail: "Goblin Laboratory requires a confirmed active event and player eligibility.",
    };
  }
  return undefined;
}

function detectDependencyCycles(
  items: readonly PlannedUpgradeItem[],
  candidateById: ReadonlyMap<string, ProgressionCandidate>,
  state: PlannerPrerequisiteState,
): Set<string> {
  const edges = new Map<string, string[]>();
  for (const item of items) {
    const candidate = candidateById.get(item.candidateId);
    const dependencies: string[] = [];
    if (candidate) {
      for (const prerequisite of candidate.prerequisites) {
        if (
          prerequisite.kind !== "entity-level" ||
          checkPlannerPrerequisite(prerequisite, state).status === "met"
        ) continue;
        for (const possibleDependency of items) {
          const dependencyCandidate = candidateById.get(possibleDependency.candidateId);
          if (
            dependencyCandidate?.entityId === prerequisite.entityId &&
            possibleDependency.targetLevel >= prerequisite.minimumLevel
          ) {
            dependencies.push(String(possibleDependency.id));
          }
        }
      }
    }
    edges.set(String(item.id), dependencies);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const cyclic = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      const cycleStart = stack.indexOf(id);
      for (const cycleId of stack.slice(cycleStart)) cyclic.add(cycleId);
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const dependency of edges.get(id) ?? []) visit(dependency);
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  };
  for (const item of items) visit(String(item.id));
  return cyclic;
}

function prerequisiteReason(
  prerequisite: UpgradePrerequisite,
  status: Exclude<PlannerPrerequisiteStatus, { status: "met" }>,
): PlannerBlockReason {
  switch (status.status) {
    case "unmet":
      return { code: "prerequisite-unmet", prerequisite };
    case "unknown":
      return { code: "prerequisite-unknown", prerequisite };
  }
}

/**
 * Deterministically project planned upgrades onto their assigned lanes.
 * Live timer records are only read as occupancy seeds and are never mutated.
 */
export function schedulePlanner(input: SchedulePlannerInput): readonly UpgradeProjection[] {
  const candidateById = new Map(input.candidates.map((candidate) => [candidate.candidateId, candidate]));
  const orderedItems = [...input.items].sort(stableItemCompare);
  const cycles = detectDependencyCycles(orderedItems, candidateById, input.prerequisiteState);
  const reservations = new Map<string, Reservation>();

  for (let index = 1; index <= input.laneAvailability.normalBuilderCount; index += 1) {
    reservations.set(`normal-builders:${index}`, { availableAtMs: input.nowMs });
  }
  for (const lane of ["laboratory", "pets", "goblin-builder", "goblin-laboratory"] as const) {
    reservations.set(lane, { availableAtMs: input.nowMs });
  }

  for (const observed of input.observedActiveUpgrades) {
    const key = laneKey(observed.lane);
    if (!reservations.has(key)) continue;
    const knownEnd = Number.isFinite(observed.completesAtMs) &&
      observed.completesAtMs >= observed.startsAtMs;
    const existing = reservations.get(key);
    if (!knownEnd) {
      reservations.set(key, { availableAtMs: null });
    } else if (existing?.availableAtMs !== null) {
      reservations.set(key, {
        availableAtMs: Math.max(existing?.availableAtMs ?? input.nowMs, observed.completesAtMs),
      });
    }
  }

  const projections: UpgradeProjection[] = [];
  const completionByItemId = new Map<string, number>();
  const pendingItems = new Set(orderedItems.map((item) => String(item.id)));
  const itemById = new Map(orderedItems.map((item) => [String(item.id), item]));
  const maxPasses = orderedItems.length + 1;

  for (let pass = 0; pass < maxPasses && pendingItems.size > 0; pass += 1) {
    let madeProgress = false;
    for (const item of orderedItems) {
      const itemId = String(item.id);
      if (!pendingItems.has(itemId)) continue;
      const candidate = candidateById.get(item.candidateId);
      if (!candidate) {
        projections.push({
          status: "blocked",
          plannedItemId: item.id,
          reasons: [{ code: "candidate-unavailable", candidateId: item.candidateId }],
        });
        pendingItems.delete(itemId);
        madeProgress = true;
        continue;
      }
      if (cycles.has(itemId)) {
        projections.push({
          status: "blocked",
          plannedItemId: item.id,
          reasons: [{ code: "dependency-cycle", itemIds: [...cycles].sort() }],
        });
        pendingItems.delete(itemId);
        madeProgress = true;
        continue;
      }

      const laneReason = getLaneEligibilityReason(item.lane, input.laneAvailability);
      if (laneReason) {
        projections.push({ status: "blocked", plannedItemId: item.id, reasons: [laneReason] });
        pendingItems.delete(itemId);
        madeProgress = true;
        continue;
      }

      const prerequisiteReasons: PlannerBlockReason[] = [];
      let dependencyReadyAt = input.nowMs;
      let waitingForDependency = false;
      for (const prerequisite of candidate.prerequisites) {
        const status = checkPlannerPrerequisite(prerequisite, input.prerequisiteState);
        if (status.status === "met") continue;

        const dependencies = prerequisite.kind === "entity-level"
          ? orderedItems.filter((possibleDependency) => {
              if (possibleDependency.id === item.id) return false;
              const dependencyCandidate = candidateById.get(possibleDependency.candidateId);
              return dependencyCandidate?.entityId === prerequisite.entityId &&
                possibleDependency.targetLevel >= prerequisite.minimumLevel;
            })
          : [];
        if (dependencies.some((dependency) => pendingItems.has(String(dependency.id)))) {
          waitingForDependency = true;
          break;
        }

        const completionTimes = dependencies
          .map((dependency) => completionByItemId.get(String(dependency.id)))
          .filter((completion): completion is number => completion !== undefined);
        if (completionTimes.length > 0) {
          dependencyReadyAt = Math.max(dependencyReadyAt, ...completionTimes);
          continue;
        }

        prerequisiteReasons.push(prerequisiteReason(prerequisite, status));
      }
      if (waitingForDependency) continue;
      if (prerequisiteReasons.length > 0) {
        const hasUnknownPrerequisite = prerequisiteReasons.some(
          (reason) => reason.code === "prerequisite-unknown",
        );
        projections.push({
          status: hasUnknownPrerequisite ? "unknown" : "blocked",
          plannedItemId: item.id,
          reasons: prerequisiteReasons,
        });
        pendingItems.delete(itemId);
        madeProgress = true;
        continue;
      }

      if (!isKnownEstimate(candidate.estimate.durationMs)) {
        projections.push({
          status: "unknown",
          plannedItemId: item.id,
          reasons: [{
            code: "estimate-unknown",
            estimate: "duration",
            reason: candidate.estimate.durationMs.reason,
          }],
        });
        pendingItems.delete(itemId);
        madeProgress = true;
        continue;
      }
      if (
        !Number.isFinite(candidate.estimate.durationMs.value) ||
        candidate.estimate.durationMs.value < 0 ||
        !Number.isFinite(item.targetLevel) ||
        item.targetLevel <= candidate.currentLevel ||
        item.targetLevel > candidate.targetLevel
      ) {
        projections.push({
          status: "blocked",
          plannedItemId: item.id,
          reasons: [{ code: "invalid-target-level", targetLevel: item.targetLevel }],
        });
        pendingItems.delete(itemId);
        madeProgress = true;
        continue;
      }

      const key = laneKey(item.lane);
      const reservation = reservations.get(key);
      if (!reservation || reservation.availableAtMs === null) {
        projections.push({
          status: "blocked",
          plannedItemId: item.id,
          reasons: [{ code: "lane-unavailable", lane: laneId(item.lane) }],
        });
        pendingItems.delete(itemId);
        madeProgress = true;
        continue;
      }

      const startsAtMs = Math.max(input.nowMs, reservation.availableAtMs, dependencyReadyAt);
      const durationMs = candidate.estimate.durationMs.value;
      const completesAtMs = startsAtMs + durationMs;
      projections.push({
        status: "scheduled",
        plannedItemId: item.id,
        startsAtMs,
        completesAtMs,
        estimate: candidate.estimate,
      });
      completionByItemId.set(itemId, completesAtMs);
      if (durationMs > 0) reservations.set(key, { availableAtMs: completesAtMs });
      pendingItems.delete(itemId);
      madeProgress = true;
    }
    if (!madeProgress) break;
  }

  for (const item of orderedItems) {
    if (!pendingItems.has(String(item.id))) continue;
    projections.push({
      status: "blocked",
      plannedItemId: item.id,
      reasons: [{
        code: "dependency-cycle",
        itemIds: [...pendingItems].sort(),
      }],
    });
  }
  return projections;
}
