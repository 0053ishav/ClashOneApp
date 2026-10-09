import { getMagicItem } from "@/config/magicItems";
import { applyHammerJamToUpgradeStart } from "@/engine/magicItems/applyHammerJamToUpgradeStart";
import { resolveUpgradeCompletionTime } from "@/engine/magicItems/resolveUpgradeCompletionTime";
import { resolveInstantMagicItem } from "@/engine/magicItems/resolveInstantMagicItem";
import type { HammerJamManifest } from "@/engine/magicItems/hammerJam";
import type { Village } from "@/types/entity";
import type { ActiveMagicEffect, MagicItemTarget } from "@/types/magicItem";

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
    selectedItemIds = [],
    hasActiveUpgrade = false,
    freeBuilderAvailable = false,
  } = input;

  validateBaseValues(baseCost, baseDurationMinutes);
  if (!Number.isFinite(startsAt)) {
    throw new Error("INVALID_UPGRADE_START_TIMESTAMP");
  }

  const uniqueItemIds = [...new Set(selectedItemIds)];
  const rejectedItems: UpgradeSimulationResult["rejectedItems"] = [];
  const appliedItemIds: string[] = [];
  const timedItemIds: string[] = [];
  let instantResult:
    | { kind: "instant-complete" | "instant-upgrade"; itemId: string }
    | undefined;

  for (const itemId of uniqueItemIds) {
    const item = getMagicItem(itemId);
    if (!item) {
      rejectedItems.push({ itemId, reason: "unknown-item" });
      continue;
    }

    if (item.effect.type === "ONGOING_SPEED" || item.effect.type === "CLOCK_TOWER_BOOST") {
      if (!isTimedItemCompatible(itemId, village, workTarget)) {
        rejectedItems.push({ itemId, reason: "incompatible-village-or-work-target" });
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

    const kind =
      instant.action.kind === "complete-current-upgrade"
        ? "instant-complete"
        : "instant-upgrade";
    if (instantResult || timedItemIds.length > 0) {
      rejectedItems.push({ itemId, reason: "cannot-combine-instant-and-timed-items" });
      continue;
    }

    instantResult = { kind, itemId };
    appliedItemIds.push(itemId);
  }

  if (instantResult && timedItemIds.length > 0) {
    rejectedItems.push({
      itemId: instantResult.itemId,
      reason: "cannot-combine-instant-and-timed-items",
    });
    const index = appliedItemIds.indexOf(instantResult.itemId);
    if (index >= 0) appliedItemIds.splice(index, 1);
    instantResult = undefined;
  }

  if (instantResult) {
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

  const startValues = applyHammerJamToUpgradeStart({
    baseDurationMinutes,
    baseCost,
    target,
    village,
    startsAt,
    manifest: hammerJam,
  });

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
    baseDurationMs: startValues.durationMinutes * MINUTE_MS,
    startedAt: startsAt,
    effects: activeEffects,
    target: workTarget,
    village,
  });

  const effectiveDurationMinutes = Math.max(
    0,
    (estimatedCompletionAt - startsAt) / MINUTE_MS,
  );

  return {
    baseCost,
    effectiveCost: startValues.cost ?? baseCost,
    baseDurationMinutes,
    effectiveDurationMinutes,
    durationSavedMinutes: Math.max(0, baseDurationMinutes - effectiveDurationMinutes),
    costSaved: Math.max(0, baseCost - (startValues.cost ?? baseCost)),
    estimatedCompletionAt,
    completionMode: "timed",
    appliedModifierIds: startValues.appliedModifierIds,
    appliedItemIds,
    rejectedItems,
  };
}
