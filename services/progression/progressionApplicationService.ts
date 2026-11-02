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

import type { HammerJamManifest, HammerJamBoostSelection } from "@/types/hammerJam";
import type { Upgrade } from "@/types/upgrade";
import type { GoldPassBoostSelection } from "@/types/goldPass";
import type { ReEngagementBoostSelection } from "@/types/reEngagementBoost";

import { useAccountStore } from "@/stores/accountStore";
import { useHammerJamStore } from "@/stores/hammerJamStore";
import { CraftedDefenseProgressionApplicationService } from "./craftedDefenseProgressionApplicationService";
import { applyBoostsToCraftedProgressionResult } from "./applyBoostsToCraftedProgressionResult";
import { PlayerLevelResolver } from "./playerLevelResolver";
import { ProgressionQueries } from "./progressionQueries";

import { ProgressionAggregation } from "@/engine/progression/operations/progressionAggregation";

export interface ResolveUpgradeOptions {
  /** First-class Hammer Jam boost for this upgrade projection. */
  hammerJamBoost?: HammerJamBoostSelection;
  /** @deprecated Prefer hammerJamBoost; retained for existing callers. */
  hammerJam?: HammerJamManifest;
  /**
   * Explicitly override the timestamp used to evaluate upgrade-start effects.
   * If omitted, the application service evaluates them at the current time.
   */
  upgradeStartContext?: ProgressionUpgradeStartContext;
  /** Apply manually configured Gold Pass discounts to calculated costs and durations. */
  goldPassBoost?: GoldPassBoostSelection;
  /** Apply an active account-scoped return-to-game boost to calculated costs and durations. */
  reEngagementBoost?: ReEngagementBoostSelection;
}

export class ProgressionApplicationService {
  static resolveUpgrade(
    upgrade: Upgrade,
    options: ResolveUpgradeOptions = {},
  ): ProgressionApplicationResult | null {
    const now = Date.now();
    const hammerJam =
      options.hammerJamBoost?.manifest ??
      options.hammerJam ??
      options.upgradeStartContext?.hammerJam ??
      useHammerJamStore.getState().manifest;
    const hammerJamBoost: HammerJamBoostSelection = options.hammerJamBoost ?? {
      startsAt: options.upgradeStartContext?.startsAt ?? now,
      manifest: hammerJam,
    };
    const upgradeStartContext: ProgressionUpgradeStartContext = {
      startsAt: hammerJamBoost.startsAt,
      hammerJam,
    };

    /*
     * Crafted progression has its own metadata, progression and engine.
     * Apply the same event and account-scoped boost options at its boundary.
     */
    if (upgrade.isCrafted) {
      const result = CraftedDefenseProgressionApplicationService.resolve(upgrade);
      if (!result) return null;

      return applyBoostsToCraftedProgressionResult(result, {
        village: upgrade.village,
        upgradeStartContext,
        ...(options.goldPassBoost
          ? { goldPassBoost: options.goldPassBoost }
          : {}),
        ...(options.reEngagementBoost
          ? { reEngagementBoost: options.reEngagementBoost }
          : {}),
      });
    }

    if (upgrade.dataId == null) {
      return null;
    }

    const entity = ProgressionQueries.getEntity(upgrade.dataId);
    if (!entity) {
      return null;
    }

    const progression = ProgressionQueries.getProgression(upgrade.dataId);
    if (!progression) {
      return null;
    }

    const currentLevel = PlayerLevelResolver.resolveUpgrade(upgrade);
    const profile = useAccountStore.getState().getProfile(upgrade.accountTag);
    const currentHallLevel =
      upgrade.village === "builderBase"
        ? profile?.builderHallLevel
        : profile?.townHallLevel;

    if (currentHallLevel == null) {
      return null;
    }

    const progressionEntity = EntityProgressionService.create(entity, progression);
    const input: ProgressionInput = {
      entity: progressionEntity,
      progression,
      currentLevel,
      currentHallLevel,
      resourceProductionContext: {
        at: now,
        hammerJam,
      },
      upgradeStartContext,
      hammerJamBoost,
      ...(options.goldPassBoost
        ? { goldPassBoost: options.goldPassBoost }
        : {}),
      ...(options.reEngagementBoost
        ? { reEngagementBoost: options.reEngagementBoost }
        : {}),
    };

    return ProgressionService.resolve(input);
  }

  static resolveAll(
    upgrades: Upgrade[],
  ): ProgressionApplicationResult[] {
    return upgrades
      .map((upgrade) => this.resolveUpgrade(upgrade))
      .filter(
        (result): result is ProgressionApplicationResult => result !== null,
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
    const overall = ProgressionAggregation.aggregate(entities);

    return {
      entities,
      overall,
    };
  }
}
