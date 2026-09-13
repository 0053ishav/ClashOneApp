import {
    EntityProgressionService,
    ProgressionService,
} from "@/engine/progression";

import type {
    ProgressionInput,
    ProgressionResult
} from "@/engine/progression/models";

import type { Upgrade } from "@/types/upgrade";

import { PlayerLevelResolver } from "./playerLevelResolver";
import { ProgressionQueries } from "./progressionQueries";

export class ProgressionApplicationService {
    static resolveUpgrade(
        upgrade: Upgrade,
    ): ProgressionResult | null {
        if (
            upgrade.dataId == null
        ) {
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

        const progressionEntity =
            EntityProgressionService.create(
                entity,
                progression,
            );

        const input: ProgressionInput =
        {
            entity:
                progressionEntity,
            progression,
            currentLevel,
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