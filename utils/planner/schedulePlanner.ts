import {
  isKnownEstimate,
  type ObservedActiveUpgrade,
  type PlannedUpgradeItem,
  type PlannerBlockReason,
  type PlannerLaneAssignment,
  type PlannerLaneId,
  type ProgressionCandidate,
  type UpgradePrerequisite,
  type UpgradeProjection,
} from "@/types/planner";

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

function prerequisiteSatisfied(
  prerequisite: UpgradePrerequisite,
  state: PlannerPrerequisiteState,
): boolean {
  switch (prerequisite.kind) {
    case "town-hall-level":
      return state.townHallLevel >= prerequisite.minimumLevel;
    case "laboratory-level":
      return state.laboratoryLevel >= prerequisite.minimumLevel;
    case "pet-house-level":
      return state.petHouseLevel >= prerequisite.minimumLevel;
    case "entity-level":
      return (state.entityLevels[prerequisite.entityId] ?? 0) >= prerequisite.minimumLevel;
  }
}

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
  const itemByCandidate = new Map<string, PlannedUpgradeItem>();
  for (const item of items) itemByCandidate.set(item.candidateId, item);

  const edges = new Map<string, string[]>();
  for (const item of items) {
    const candidate = candidateById.get(item.candidateId);
    const dependencies: string[] = [];
    if (candidate) {
      for (const prerequisite of candidate.prerequisites) {
        if (prerequisite.kind !== "entity-level" || prerequisiteSatisfied(prerequisite, state)) continue;
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

function prerequisiteReasons(
  candidate: ProgressionCandidate,
  state: PlannerPrerequisiteState,
): PlannerBlockReason[] {
  return candidate.prerequisites
    .filter((prerequisite) => !prerequisiteSatisfied(prerequisite, state))
    .map((prerequisite) => ({ code: "prerequisite-unmet", prerequisite }));
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
  const completionByCandidate = new Map<string, number>();
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

      const unmet = prerequisiteReasons(candidate, input.prerequisiteState);
      if (unmet.length > 0) {
        const dependencies = itemById.size > 0
          ? orderedItems.filter((possibleDependency) => {
              if (possibleDependency.id === item.id) return false;
              const dependencyCandidate = candidateById.get(possibleDependency.candidateId);
              return candidate.prerequisites.some((prerequisite) =>
                prerequisite.kind === "entity-level" &&
                dependencyCandidate?.entityId === prerequisite.entityId &&
                possibleDependency.targetLevel >= prerequisite.minimumLevel
              );
            })
          : [];
        const waiting = dependencies.some((dependency) => pendingItems.has(String(dependency.id)));
        const dependencyCompletion = dependencies.reduce<number | undefined>((latest, dependency) => {
          const completion = completionByCandidate.get(dependency.candidateId);
          return completion === undefined ? latest : Math.max(latest ?? completion, completion);
        }, undefined);
        if (waiting) continue;
        if (dependencyCompletion === undefined) {
          projections.push({ status: "blocked", plannedItemId: item.id, reasons: unmet });
          pendingItems.delete(itemId);
          madeProgress = true;
          continue;
        }
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
      if (!isKnownEstimate(candidate.estimate.cost)) {
        projections.push({
          status: "unknown",
          plannedItemId: item.id,
          reasons: [{
            code: "estimate-unknown",
            estimate: "cost",
            reason: candidate.estimate.cost.reason,
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

      const dependencyReadyAt = candidate.prerequisites.reduce<number>((latest, prerequisite) => {
        if (prerequisite.kind !== "entity-level" || prerequisiteSatisfied(prerequisite, input.prerequisiteState)) {
          return latest;
        }
        const dependency = orderedItems.find((possible) => {
          const dependencyCandidate = candidateById.get(possible.candidateId);
          return dependencyCandidate?.entityId === prerequisite.entityId &&
            possible.targetLevel >= prerequisite.minimumLevel;
        });
        const completion = dependency ? completionByCandidate.get(dependency.candidateId) : undefined;
        return completion === undefined ? latest : Math.max(latest, completion);
      }, input.nowMs);
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
      completionByCandidate.set(candidate.candidateId, completesAtMs);
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
