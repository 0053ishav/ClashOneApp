import {
  EntityProgressionService,
  ProgressionService,
} from "@/engine/progression";

import type {
  OverallProgressionResult,
  ProgressionApplicationResult,
  ProgressionInput,
  ProgressionOverviewResult,
  ProgressionUpgradeStartContext,
} from "@/engine/progression/models";

import type { Upgrade } from "@/types/upgrade";
import type { GoldPassBoostSelection } from "@/types/goldPass";

import { useAccountStore } from "@/stores/accountStore";
import { useHammerJamStore } from "@/stores/hammerJamStore";
import { CraftedDefenseProgressionApplicationService } from "./craftedDefenseProgressionApplicationService";
import { PlayerLevelResolver } from "./playerLevelResolver";
import { ProgressionQueries } from "./progressionQueries";

import { ProgressionAggregation } from "@/engine/progression/operations/progressionAggregation";

export interface ResolveUpgradeOptions {
  /**
   * Pass event context only when the caller knows the timestamp at which the
   * represented upgrade starts. Existing imported/active upgrades deliberately
   * omit this to avoid retroactively applying the current event configuration.
   */
  upgradeStartContext?: ProgressionUpgradeStartContext;
  /** Apply a manually configured Gold Pass discount to calculated durations. */
  goldPassBoost?: GoldPassBoostSelection;
}

export class ProgressionApplicationService {
  static resolveUpgrade(
    upgrade: Upgrade,
    options: ResolveUpgradeOptions = {},
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
      resourceProductionContext: {
        at: now,
        hammerJam,
      },
      ...(options.upgradeStartContext
        ? { upgradeStartContext: options.upgradeStartContext }
        : {}),
      ...(options.goldPassBoost
        ? { goldPassBoost: options.goldPassBoost }
        : {}),
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
