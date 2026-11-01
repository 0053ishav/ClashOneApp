import type {
  PlannedUpgradeItem,
  ProgressionCandidate,
  UpgradeCost,
  UpgradeEstimate,
  UpgradePrerequisite,
} from "@/types/planner";

export interface PreparedPlannerScheduleInput {
  candidates: readonly ProgressionCandidate[];
  items: readonly PlannedUpgradeItem[];
}

function sumEstimates(
  estimates: readonly UpgradeEstimate[],
): UpgradeEstimate {
  const costValues: UpgradeCost[] = [];
  let costUnknownReason: Extract<UpgradeEstimate["cost"], { status: "unknown" }>["reason"] | null = null;
  let durationTotal = 0;
  let durationUnknownReason: Extract<UpgradeEstimate["durationMs"], { status: "unknown" }>["reason"] | null = null;

  for (const estimate of estimates) {
    if (estimate.cost.status === "unknown") {
      costUnknownReason ??= estimate.cost.reason;
    } else {
      costValues.push(estimate.cost.value);
    }
    if (estimate.durationMs.status === "unknown") {
      durationUnknownReason ??= estimate.durationMs.reason;
    } else {
      durationTotal += estimate.durationMs.value;
      if (!Number.isSafeInteger(durationTotal)) durationUnknownReason = "invalid-game-data";
    }
  }

  const costTotal: UpgradeCost = {};
  for (const key of ["gold", "elixir", "darkElixir"] as const) {
    const total = costValues.reduce((sum, value) => sum + (value[key] ?? 0), 0);
    if (!Number.isSafeInteger(total)) {
      costUnknownReason ??= "invalid-game-data";
    } else if (total > 0) {
      costTotal[key] = total;
    }
  }

  return {
    cost: costUnknownReason === null
      ? { status: "known", value: costTotal }
      : { status: "unknown", reason: costUnknownReason },
    durationMs: durationUnknownReason === null
      ? { status: "known", value: durationTotal }
      : { status: "unknown", reason: durationUnknownReason },
  };
}

function prerequisiteKey(prerequisite: UpgradePrerequisite): string {
  return prerequisite.kind === "entity-level"
    ? `${prerequisite.kind}:${prerequisite.entityId}:${prerequisite.minimumLevel}`
    : `${prerequisite.kind}:${prerequisite.minimumLevel}`;
}

export function getPlannerCandidateMaximumLevel(
  candidates: readonly ProgressionCandidate[],
  candidateId: string,
): number | undefined {
  const selected = candidates.find((candidate) => candidate.candidateId === candidateId);
  if (!selected) return undefined;
  return candidates
    .filter((candidate) =>
      candidate.entityId === selected.entityId &&
      candidate.village === selected.village,
    )
    .reduce<number | undefined>(
      (maximum, candidate) => Math.max(maximum ?? candidate.targetLevel, candidate.targetLevel),
      undefined,
    );
}

export function preparePlannerScheduleInput(
  candidates: readonly ProgressionCandidate[],
  items: readonly PlannedUpgradeItem[],
): PreparedPlannerScheduleInput {
  const preparedCandidates: ProgressionCandidate[] = [];
  const preparedItems: PlannedUpgradeItem[] = [];

  for (const item of items) {
    const source = candidates.find((candidate) => candidate.candidateId === item.candidateId);
    if (!source) {
      preparedItems.push(item);
      continue;
    }
    const levelSteps = candidates
      .filter((candidate) =>
        candidate.entityId === source.entityId &&
        candidate.village === source.village &&
        candidate.targetLevel > source.currentLevel &&
        candidate.targetLevel <= item.targetLevel,
      )
      .sort((left, right) => left.targetLevel - right.targetLevel);
    const hasEveryStep = levelSteps.length === item.targetLevel - source.currentLevel &&
      levelSteps.every((candidate, index) =>
        candidate.targetLevel === source.currentLevel + index + 1,
      );
    const targetExists = levelSteps.some((candidate) => candidate.targetLevel === item.targetLevel);
    const scheduledCandidateId = `planner-projection:${item.id}`;
    const prerequisitesByKey = new Map<string, UpgradePrerequisite>();
    for (const step of levelSteps) {
      for (const prerequisite of step.prerequisites) {
        prerequisitesByKey.set(prerequisiteKey(prerequisite), prerequisite);
      }
    }

    const estimate = hasEveryStep && targetExists
      ? sumEstimates(levelSteps.map((step) => step.estimate))
      : {
          cost: { status: "unknown" as const, reason: "missing-game-data" as const },
          durationMs: { status: "unknown" as const, reason: "missing-game-data" as const },
        };
    const candidate: ProgressionCandidate = {
      ...source,
      candidateId: scheduledCandidateId,
      currentLevel: source.currentLevel,
      targetLevel: item.targetLevel,
      prerequisites: [...prerequisitesByKey.values()],
      estimate,
    };
    preparedCandidates.push(candidate);
    preparedItems.push({ ...item, candidateId: scheduledCandidateId });
  }

  return { candidates: preparedCandidates, items: preparedItems };
}
