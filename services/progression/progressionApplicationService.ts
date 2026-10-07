import {
  EntityProgressionService,
  ProgressionService,
} from "@/engine/progression";

import type {
  ProgressionInput,
  ProgressionResult
} from "@/engine/progression/models";

import type {
  CraftedProgressionResult,
} from "@/engine/crafted/model";
import type { Upgrade } from "@/types/upgrade";

import { useAccountStore } from "@/stores/accountStore";
import { CraftedDefenseProgressionApplicationService } from "./craftedDefenseProgressionApplicationService";
import { PlayerLevelResolver } from "./playerLevelResolver";
import { ProgressionQueries } from "./progressionQueries";

export type ProgressionApplicationResult =
  | ProgressionResult
  | CraftedProgressionResult;

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

    const input: ProgressionInput = {
      entity: progressionEntity,
      progression,
      currentLevel,
      currentHallLevel,
    };

    return ProgressionService.resolve(
      input,
    );
  }
}

/**
 * 
 * Later, without changing the engine, you can add:
 * resolvePlayerTroop(...)
 * resolvePlayerHero(...)
 * resolvePlayerBuilding(...)
 * resolvePlannedUpgrade(...)
 * resolveSimulation(...)
 */