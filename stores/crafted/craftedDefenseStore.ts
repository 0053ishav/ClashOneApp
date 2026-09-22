import { create } from "zustand";

import type { CraftedDefenseData } from "@/types/craftedDefense";

type CraftedDefenseMap =
    Record<number, CraftedDefenseData>;

interface CraftedDefenseStore {
    defenses: CraftedDefenseMap;

    setDefenses: (
        defenses: CraftedDefenseData[],
    ) => void;

    getCraftedDefense: (
        id: number,
    ) => CraftedDefenseData | undefined;

    clear: () => void;
}

export const useCraftedDefenseStore =
    create<CraftedDefenseStore>((set, get) => ({
        defenses: {},

        setDefenses: (
            defenses,
        ) => {

            const mapped: CraftedDefenseMap = {};

            for (const defense of defenses) {
                mapped[defense.id] = defense;
            }
            
            set({
                defenses: mapped,
            });
        },

        getCraftedDefense: (id) => {
            return get().defenses[id];
        },

        clear: () => {
            set({
                defenses: {},
            });
        },
    }));