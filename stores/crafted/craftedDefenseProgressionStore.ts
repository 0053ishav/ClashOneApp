import { create } from "zustand";

import type {
    CraftedDefenseProgressionData,
} from "@/types/craftedDefenseProgression";

type CraftedDefenseProgressionMap =
  Record<number, CraftedDefenseProgressionData>;

interface CraftedDefenseProgressionStore {
  progressions: CraftedDefenseProgressionMap;

  setProgressions: (
    progressions: CraftedDefenseProgressionData[],
  ) => void;

  getProgression: (
    id: number,
  ) => CraftedDefenseProgressionData | undefined;

  clear: () => void;
}

export const useCraftedDefenseProgressionStore =
  create<CraftedDefenseProgressionStore>((set, get) => ({
    progressions: {},

    setProgressions: (progressions) => {
      const mapped: CraftedDefenseProgressionMap = {};

      for (const progression of progressions) {
        mapped[progression.id] = progression;
      }

      set({
        progressions: mapped,
      });
    },

    getProgression: (id) => {
      return get().progressions[id];
    },

    clear: () => {
      set({
        progressions: {},
      });
    },
  }));