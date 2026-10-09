import { resolveUpgradeCompletionTime } from "@/engine/magicItems/resolveUpgradeCompletionTime";
import type { ActiveMagicEffect, MagicItemTarget } from "@/types/magicItem";
import type { Upgrade } from "@/types/upgrade";

/**
 * Projects timed Magic Item effects onto upgrade timers without mutating the
 * persisted baseline finish timestamp. Expired effects remain relevant because
 * they may have accelerated work earlier in an upgrade's lifetime.
 */
export function applyMagicItemEffectsToUpgrades(
  upgrades: Upgrade[],
  effects: ActiveMagicEffect[],
): Upgrade[] {
  if (effects.length === 0) return upgrades;

  return upgrades.map((upgrade) => {
    if (upgrade.isCompleted) return upgrade;

    const target: MagicItemTarget | null =
      upgrade.upgradeType === "BUILDER"
        ? "builders"
        : upgrade.upgradeType === "LAB"
          ? "research"
          : upgrade.upgradeType === "PET"
            ? "pet"
            : null;

    if (!target) return upgrade;

    const baseDurationMs = upgrade.endTime - upgrade.startTime;
    if (!Number.isFinite(baseDurationMs) || baseDurationMs <= 0) {
      return upgrade;
    }

    const endTime = resolveUpgradeCompletionTime({
      baseDurationMs,
      startedAt: upgrade.startTime,
      effects,
      target,
      village: upgrade.village,
    });

    return endTime === upgrade.endTime ? upgrade : { ...upgrade, endTime };
  });
}
