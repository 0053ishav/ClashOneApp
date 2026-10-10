import { getMagicItem } from "@/config/magicItems";
import { applyHammerJamToUpgradeStart } from "@/engine/magicItems/applyHammerJamToUpgradeStart";
import { resolveUpgradeCompletionTime } from "@/engine/magicItems/resolveUpgradeCompletionTime";
import { resolveInstantMagicItem } from "@/engine/magicItems/resolveInstantMagicItem";
import type { HammerJamManifest } from "@/engine/magicItems/hammerJam";
import type { EntityType, Village } from "@/types/entity";
import type { ActiveMagicEffect, MagicItemTarget } from "@/types/magicItem";
import { resolveGoldPassBoostModifier } from "@/engine/progression/resolveGoldPassBoost";
import type { GoldPassBoostSelection } from "@/types/goldPass";
import { isGoldPassBoostApplicable } from "@/engine/progression/isGoldPassBoostApplicable";

export type UpgradeSimulationInput = {
  /** Base values come from the selected entity's next progression level. */
  baseCost: number;
  baseDurationMinutes: number;
  target: MagicItemTarget;
  /** Timer category, separate from entity type (e.g. building -> builders). */
  workTarget: "builders" | "research" | "pet";
  village: Village;
  startsAt: number;
  hammerJam: HammerJamManifest;
  /** Optional manually selected Gold Pass time discount for this simulated upgrade. */
  goldPassBoost?: GoldPassBoostSelection;
  selectedItemIds?: readonly string[];
  /** Needed when previewing a Book on work that is already in progress. */
  hasActiveUpgrade?: boolean;
  freeBuilderAvailable?: boolean;
};

export type UpgradeSimulationResult = {
  baseCost: number;
  effectiveCost: number;
  baseDurationMinutes: number;
  effectiveDurationMinutes: number;
  durationSavedMinutes: number;
  costSaved: number;
  estimatedCompletionAt: number;
  completionMode: "timed" | "instant-complete" | "instant-upgrade";
  appliedModifierIds: string[];
  appliedItemIds: string[];
  rejectedItems: Array<{
    itemId: string;
    reason: string;
  }>;
};

const MINUTE_MS = 60_000;

function toGoldPassEntityType(target: MagicItemTarget): EntityType | null {
  switch (target) {
    case "builders":
    case "research":
    case "heroes-and-pets":
    case "any":
      return null;
    default:
      return target;
  }
}

function validateBaseValues(cost: number, durationMinutes: number): void {
  if (!Number.isFinite(cost) || cost < 0) {
    throw new Error("INVALID_BASE_UPGRADE_COST");
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes < 0) {
    throw new Error("INVALID_BASE_UPGRADE_DURATION");
  }
}

function isTimedItemCompatible(
  itemId: string,
  village: Village,
  workTarget: UpgradeSimulationInput["workTarget"],
): boolean {
  const item = getMagicItem(itemId);
  if (!item || !item.villages.includes(village)) return false;

  if (item.effect.type === "CLOCK_TOWER_BOOST") {
    return village === "builderBase" &&
      (workTarget === "builders" || workTarget === "research");
  }

  return item.effect.type === "ONGOING_SPEED" &&
    item.effect.appliesTo?.includes(workTarget) === true;
}

/**
 * Simulates a planned upgrade without changing account state, inventory, or
 * persisted timers. Hammer Jam is resolved at the simulated start timestamp;
 * timed effects then accelerate the resulting duration using the same timer
 * engine as live upgrades.
 */
export function simulateUpgrade(
  input: UpgradeSimulationInput,
): UpgradeSimulationResult {
  const {
    baseCost,
    baseDurationMinutes,
    target,
    workTarget,
    village,
    startsAt,
    hammerJam,
    goldPassBoost,
    selectedItemIds = [],
    hasActiveUpgrade = false,
    freeBuilderAvailable = false,
  } = input;

  validateBaseValues(baseCost, baseDurationMinutes);
  if (!Number.isFinite(startsAt)) {
    throw new Error("INVALID_UPGRADE_START_TIMESTAMP");
  }

  const noGoldPassModifier = {
    costMultiplier: 1,
    timeMultiplier: 1,
    appliedModifierIds: [] as string[],
  };
  const requestedGoldPassModifier = goldPassBoost
    ? resolveGoldPassBoostModifier(goldPassBoost)
    : noGoldPassModifier;
  const goldPassEntityType = toGoldPassEntityType(target);
  const goldPassWorkTargetMatches =
    goldPassBoost?.target === "builder"
      ? workTarget === "builders"
      : goldPassBoost?.target === "research"
        ? workTarget === "research"
        : false;
  const goldPassModifier =
    goldPassBoost &&
    goldPassEntityType &&
    goldPassWorkTargetMatches &&
    isGoldPassBoostApplicable({
      village,
      entityType: goldPassEntityType,
      target: goldPassBoost.target,
    })
      ? requestedGoldPassModifier
      : noGoldPassModifier;

  // Sort and deduplicate selections so the same selection always resolves
  // to the same applied/rejected item order, independent of UI interaction order.
  const uniqueItemIds = [...new Set(selectedItemIds)].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  const rejectedItems: UpgradeSimulationResult["rejectedItems"] = [];
  const appliedItemIds: string[] = [];
  const timedItemIds: string[] = [];
  const instantCandidates: Array<{
    kind: "instant-complete" | "instant-upgrade";
    itemId: string;
  }> = [];

  for (const itemId of uniqueItemIds) {
    const item = getMagicItem(itemId);
    if (!item) {
      rejectedItems.push({ itemId, reason: "unknown-item" });
      continue;
    }

    if (
      item.effect.type === "ONGOING_SPEED" ||
      item.effect.type === "CLOCK_TOWER_BOOST"
    ) {
      if (!isTimedItemCompatible(itemId, village, workTarget)) {
        rejectedItems.push({
          itemId,
          reason: "incompatible-village-or-work-target",
        });
        continue;
      }
      timedItemIds.push(itemId);
      appliedItemIds.push(itemId);
      continue;
    }

    const instant = resolveInstantMagicItem({
      itemId,
      village,
      target,
      hasActiveUpgrade,
      hasNextLevel: true,
      freeBuilderAvailable,
    });

    if (!instant.allowed) {
      rejectedItems.push({ itemId, reason: instant.reason });
      continue;
    }

    instantCandidates.push({
      kind:
        instant.action.kind === "complete-current-upgrade"
          ? "instant-complete"
          : "instant-upgrade",
      itemId,
    });
  }

  if (instantCandidates.length > 0 && timedItemIds.length > 0) {
    // Keep the timed simulation, but reject every instant action in the
    // incompatible combination rather than letting iteration order choose.
    rejectedItems.push(
      ...instantCandidates.map(({ itemId }) => ({
        itemId,
        reason: "cannot-combine-instant-and-timed-items",
      })),
    );
  } else if (instantCandidates.length > 1) {
    // Instant actions are mutually exclusive. Do not silently pick a winner.
    rejectedItems.push(
      ...instantCandidates.map(({ itemId }) => ({
        itemId,
        reason: "cannot-combine-instant-items",
      })),
    );
  } else if (instantCandidates.length === 1) {
    const instantResult = instantCandidates[0];
    if (instantResult) {
      appliedItemIds.push(instantResult.itemId);
      const isHammer = instantResult.kind === "instant-upgrade";
      return {
        baseCost,
        effectiveCost: isHammer ? 0 : baseCost,
        baseDurationMinutes,
        effectiveDurationMinutes: 0,
        durationSavedMinutes: baseDurationMinutes,
        costSaved: isHammer ? baseCost : 0,
        estimatedCompletionAt: startsAt,
        completionMode: instantResult.kind,
        appliedModifierIds: [],
        appliedItemIds,
        rejectedItems,
      };
    }
  }

  const startValues = applyHammerJamToUpgradeStart({
    baseDurationMinutes,
    baseCost,
    target,
    village,
    startsAt,
    manifest: hammerJam,
  });
  const effectiveStartDurationMinutes =
    goldPassModifier.appliedModifierIds.length > 0
      ? Math.round(
          baseDurationMinutes *
            startValues.timeMultiplier *
            goldPassModifier.timeMultiplier,
        )
      : startValues.durationMinutes;

  const activeEffects: ActiveMagicEffect[] = timedItemIds.flatMap((itemId) => {
    const item = getMagicItem(itemId);
    if (!item) return [];
    const durationMinutes = item.effect.durationMinutes ?? 0;
    return [{
      id: `simulation:${itemId}`,
      itemId,
      startedAt: startsAt,
      expiresAt: startsAt + durationMinutes * MINUTE_MS,
      village,
    }];
  });

  const estimatedCompletionAt = resolveUpgradeCompletionTime({
    baseDurationMs: effectiveStartDurationMinutes * MINUTE_MS,
    startedAt: startsAt,
    effects: activeEffects,
    target: workTarget,
    village,
  });

  const effectiveDurationMinutes = Math.max(
    0,
    (estimatedCompletionAt - startsAt) / MINUTE_MS,
  );

  const goldPassAdjustedCost = Math.round(
    (startValues.cost ?? baseCost) * goldPassModifier.costMultiplier,
  );

  return {
    baseCost,
    effectiveCost: goldPassAdjustedCost,
    baseDurationMinutes,
    effectiveDurationMinutes,
    durationSavedMinutes: Math.max(0, baseDurationMinutes - effectiveDurationMinutes),
    costSaved: Math.max(0, baseCost - goldPassAdjustedCost),
    estimatedCompletionAt,
    completionMode: "timed",
    appliedModifierIds: [
      ...startValues.appliedModifierIds,
      ...goldPassModifier.appliedModifierIds,
    ],
    appliedItemIds,
    rejectedItems,
  };
}
