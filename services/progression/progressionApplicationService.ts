import {
  EntityProgressionService,
  ProgressionService,
} from "@/engine/progression";

import type {
  OverallProgressionResult,
  ProgressionApplicationResult,
  ProgressionInput,
  ProgressionOverviewResult
} from "@/engine/progression/models";

import type { Upgrade } from "@/types/upgrade";

import { useAccountStore } from "@/stores/accountStore";
import { useHammerJamStore } from "@/stores/hammerJamStore";
import { CraftedDefenseProgressionApplicationService } from "./craftedDefenseProgressionApplicationService";
import { PlayerLevelResolver } from "./playerLevelResolver";
import { ProgressionQueries } from "./progressionQueries";

import { ProgressionAggregation } from "@/engine/progression/operations/progressionAggregation";

function getProspectiveUpgradeStartAt(
  upgrade: Pick<Upgrade, "isCompleted" | "endTime">,
  now: number,
): number {
  if (!Number.isFinite(now)) {
    throw new Error("INVALID_UPGRADE_START_TIMESTAMP");
  }

  if (upgrade.isCompleted) return now;

  if (!Number.isFinite(upgrade.endTime)) {
    throw new Error("INVALID_UPGRADE_START_TIMESTAMP");
  }

  // A following upgrade cannot begin before the tracked upgrade completes.
  // Clamp stale end times to now, without rewriting the stored upgrade timer.
  return Math.max(now, upgrade.endTime);
}

export class ProgressionApplicationService {
  static resolveUpgrade(
    upgrade: Upgrade,
  ): ProgressionApplicationResult | null {

    /**
    * Crafted progression has its own
    * metadata, progression and engine.
    */
    if (upgrade.isCrafted) {
      return CraftedDefenseProgressionApplicationService.resolve(
        upgrade,
      );
    }

    /**
     * Normal progression.
     */
    if (upgrade.dataId == null) {
      return null;
    }

    const entity =
      ProgressionQueries.getEntity(
        upgrade.dataId,
      );

    if (!entity) {
      return null;
    }

    const progression =
      ProgressionQueries.getProgression(
        upgrade.dataId,
      );

    if (!progression) {
      return null;
    }

    const currentLevel =
      PlayerLevelResolver.resolveUpgrade(
        upgrade,
      );

    const profile =
      useAccountStore
        .getState()
        .getProfile(upgrade.accountTag);

    const currentHallLevel =
      upgrade.village === "builderBase"
        ? profile?.builderHallLevel
        : profile?.townHallLevel;

    if (currentHallLevel == null) {
      return null;
    }

    const progressionEntity =
      EntityProgressionService.create(
        entity,
        progression,
      );

    const now = Date.now();
    const hammerJam = useHammerJamStore.getState().manifest;
    const input: ProgressionInput = {
      entity: progressionEntity,
      progression,
      currentLevel,
      currentHallLevel,
      upgradeStartContext: {
        startsAt: getProspectiveUpgradeStartAt(upgrade, now),
        hammerJam,
      },
    };

    return ProgressionService.resolve(
      input,
    );
  }

  static resolveAll(
    upgrades: Upgrade[],
  ): ProgressionApplicationResult[] {
    return upgrades
      .map((upgrade) =>
        this.resolveUpgrade(upgrade),
      )
      .filter(
        (
          result,
        ): result is ProgressionApplicationResult =>
          result !== null,
      );
  }

  static resolveOverallProgression(
    upgrades: Upgrade[],
  ): OverallProgressionResult {
    return this.resolveAccountProgression(upgrades).overall;
  }

  static resolveAccountProgression(
    upgrades: Upgrade[],
  ): ProgressionOverviewResult {
    const entities = this.resolveAll(upgrades);

    const overall =
      ProgressionAggregation.aggregate(
        entities,
      );

    return {
      entities,
      overall,
    };
  }
}
