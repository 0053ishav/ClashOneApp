import type {
  MagicItemTarget,
  ResolvedUpgradeStartModifiers,
  UpgradeStartModifier,
} from "@/types/magicItem";
import type { Village } from "@/types/entity";

type ResolveUpgradeStartModifiersInput = {
  startedAt: number;
  target: MagicItemTarget;
  village: Village;
  modifiers: UpgradeStartModifier[];
};

/**
 * Resolves modifiers that apply at the exact moment an upgrade starts.
 *
 * This does not mutate an existing upgrade. The caller uses the result
 * to calculate the upgrade's effective duration/cost at creation time.
 */
export function resolveUpgradeStartModifiers({
  startedAt,
  target,
  village,
  modifiers,
}: ResolveUpgradeStartModifiersInput): ResolvedUpgradeStartModifiers {
  let timeMultiplier = 1;
  let costMultiplier = 1;
  const appliedModifierIds: string[] = [];

  for (const modifier of modifiers) {
    const isActive =
      startedAt >= modifier.startsAt &&
      startedAt < modifier.endsAt;

    if (!isActive) {
      continue;
    }

    if (!modifier.appliesTo.includes(target)) {
      continue;
    }

    if (modifier.villages && !modifier.villages.includes(village)) {
      continue;
    }

    if (modifier.timeMultiplier !== undefined) {
      timeMultiplier *= modifier.timeMultiplier;
    }

    if (modifier.costMultiplier !== undefined) {
      costMultiplier *= modifier.costMultiplier;
    }

    appliedModifierIds.push(modifier.id);
  }

  return {
    timeMultiplier,
    costMultiplier,
    appliedModifierIds,
  };
}
