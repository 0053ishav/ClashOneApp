import {
  EntityProgressionService,
  ProgressionService,
} from "@/engine/progression";

import type {
  OverallProgressionResult,
  ProgressionApplicationResult,
  ProgressionInput,
  ProgressionOverviewResult,
} from "@/engine/progression/models";

import type { HammerJamBoostSelection } from "@/types/hammerJam";
import type { Upgrade } from "@/types/upgrade";
import { getGoldPassBoostSettings } from "@/services/goldPassBoostService";
import { getReEngagementBoostSettings } from "@/services/reEngagementBoostService";
import { resolveGoldPassBoostForUpgradeType } from "@/engine/progression/resolveGoldPassBoostForUpgradeType";
import { resolveReEngagementBoostForUpgradeType } from "@/engine/progression/resolveReEngagementBoostForUpgradeType";

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
}

export class ProgressionApplicationService {
  static async resolveUpgrade(
    upgrade: Upgrade,
    options: ResolveUpgradeOptions = {},
  ): Promise<ProgressionApplicationResult | null> {
    const now = Date.now();
    const hammerJamBoost: HammerJamBoostSelection = options.hammerJamBoost ?? {
      startsAt: now,
      manifest: useHammerJamStore.getState().manifest,
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
        hammerJamBoost,
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

    const [goldPassSettings, reEngagementSettings] = await Promise.all([
      getGoldPassBoostSettings(upgrade.accountTag),
      getReEngagementBoostSettings(upgrade.accountTag),
    ]);
    const boostContext = {
      upgradeType: upgrade.upgradeType,
      entityType: entity.type,
      village: upgrade.village,
    };
    const goldPassBoost = resolveGoldPassBoostForUpgradeType(
      boostContext,
      goldPassSettings,
    );
    const reEngagementBoost = resolveReEngagementBoostForUpgradeType(
      boostContext,
      reEngagementSettings,
      now,
    );

    const progressionEntity = EntityProgressionService.create(entity, progression);
    const input: ProgressionInput = {
      entity: progressionEntity,
      progression,
      currentLevel,
      currentHallLevel,
      resourceProductionContext: {
        at: now,
        hammerJam: hammerJamBoost.manifest,
      },
      hammerJamBoost,
      ...(goldPassBoost ? { goldPassBoost } : {}),
      ...(reEngagementBoost ? { reEngagementBoost } : {}),
    };

    return ProgressionService.resolve(input);
  }

  static async resolveAll(
    upgrades: Upgrade[],
  ): Promise<ProgressionApplicationResult[]> {
    const results = await Promise.all(
      upgrades.map((upgrade) => this.resolveUpgrade(upgrade)),
    );
    return results.filter(
      (result): result is ProgressionApplicationResult => result !== null,
    );
  }

  static async resolveOverallProgression(
    upgrades: Upgrade[],
  ): Promise<OverallProgressionResult> {
    return (await this.resolveAccountProgression(upgrades)).overall;
  }

  static async resolveAccountProgression(
    upgrades: Upgrade[],
  ): Promise<ProgressionOverviewResult> {
    const entities = await this.resolveAll(upgrades);
    const overall = ProgressionAggregation.aggregate(entities);

    return {
      entities,
      overall,
    };
  }
}
