import { useCraftedDefenseProgressionStore, useCraftedDefenseStore, useCraftedStore } from "@/stores/crafted";



export class CraftedDefenseQueries {
    static getDefense(dataId: number) {
        return useCraftedDefenseStore
            .getState()
            .getCraftedDefense(dataId);
    }

    static getProgression(dataId: number) {
        return useCraftedDefenseProgressionStore
            .getState()
            .getProgression(dataId);
    }

    static isActive(dataId: number) {
        const event = useCraftedStore.getState();

        if (!event.isActive()) {
            return false;
        }

        return event.defenses.includes(dataId);
    }

    static isKnown(dataId: number) {
        return Boolean(
            useCraftedDefenseStore
                .getState()
                .getCraftedDefense(dataId) &&
            useCraftedDefenseProgressionStore
                .getState()
                .getProgression(dataId),
        );
    }
}