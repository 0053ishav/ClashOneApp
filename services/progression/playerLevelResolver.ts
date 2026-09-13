import type { Upgrade } from "@/types/upgrade";

export class PlayerLevelResolver {
    static resolveUpgrade(
        upgrade: Upgrade,
    ): number {
        if (upgrade.currentLevel == null) {
            throw new Error(
                `Upgrade ${upgrade.id} has no current level.`,
            );
        }

        return upgrade.currentLevel;
    }
}

/**
 * Later this file can grow:
 * resolveHero()
 * resolveTroop()
 * resolvePlayer()
 * resolveSimulation()
 * without touching the engine.
 */