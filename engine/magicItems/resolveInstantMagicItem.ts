import { getMagicItem } from "@/config/magicItems";
import type { MagicItemTarget } from "@/types/magicItem";
import type { Village } from "@/types/entity";

export type InstantMagicItemAction =
  | {
      kind: "complete-current-upgrade";
      itemId: string;
      target: MagicItemTarget;
      village: Village;
    }
  | {
      kind: "upgrade-to-next-level";
      itemId: string;
      target: MagicItemTarget;
      village: Village;
      includesUpgradeCost: true;
    };

export type InstantMagicItemRejectionReason =
  | "unknown-item"
  | "not-an-instant-item"
  | "unsupported-village"
  | "incompatible-target"
  | "no-active-upgrade"
  | "no-next-level"
  | "free-builder-required";

export type ResolveInstantMagicItemInput = {
  itemId: string;
  village: Village;
  target: MagicItemTarget;
  hasActiveUpgrade?: boolean;
  hasNextLevel?: boolean;
  freeBuilderAvailable?: boolean;
};

export type ResolveInstantMagicItemResult =
  | { allowed: true; action: InstantMagicItemAction }
  | { allowed: false; reason: InstantMagicItemRejectionReason };

function targetMatches(
  itemTargets: readonly MagicItemTarget[],
  target: MagicItemTarget,
): boolean {
  return (
    itemTargets.includes("any") ||
    itemTargets.includes(target) ||
    (itemTargets.includes("heroes-and-pets") &&
      (target === "hero" || target === "pet"))
  );
}

/**
 * Checks whether a Book or Hammer can be applied in the current game state.
 *
 * This is a pure domain decision: it does not mutate an upgrade or inventory.
 * Callers should persist the result through the account/progression layer.
 */
export function resolveInstantMagicItem({
  itemId,
  village,
  target,
  hasActiveUpgrade = false,
  hasNextLevel = false,
  freeBuilderAvailable = false,
}: ResolveInstantMagicItemInput): ResolveInstantMagicItemResult {
  const item = getMagicItem(itemId);

  if (!item) return { allowed: false, reason: "unknown-item" };

  const effectType = item.effect.type;
  if (effectType !== "INSTANT_COMPLETE" && effectType !== "INSTANT_UPGRADE") {
    return { allowed: false, reason: "not-an-instant-item" };
  }

  if (!item.villages.includes(village)) {
    return { allowed: false, reason: "unsupported-village" };
  }

  if (!targetMatches(item.effect.appliesTo ?? [], target)) {
    return { allowed: false, reason: "incompatible-target" };
  }

  if (effectType === "INSTANT_COMPLETE") {
    if (!hasActiveUpgrade) {
      return { allowed: false, reason: "no-active-upgrade" };
    }

    return {
      allowed: true,
      action: {
        kind: "complete-current-upgrade",
        itemId: item.id,
        target,
        village,
      },
    };
  }

  if (!hasNextLevel) {
    return { allowed: false, reason: "no-next-level" };
  }

  if (item.id === "hammer-of-building" && !freeBuilderAvailable) {
    return { allowed: false, reason: "free-builder-required" };
  }

  return {
    allowed: true,
    action: {
      kind: "upgrade-to-next-level",
      itemId: item.id,
      target,
      village,
      includesUpgradeCost: true,
    },
  };
}
