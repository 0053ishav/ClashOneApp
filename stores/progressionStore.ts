/**
 * Purpose:
 * Central cache for progression metadata
 */

import { create } from "zustand";

import type {
  ProgressionData,
  ProgressionManifest,
} from "@/types/progression";

interface ProgressionStore {
  manifest: ProgressionManifest | null;

  progressionById: Record<
    number,
    ProgressionData
  >;

  setManifest: (
    manifest: ProgressionManifest,
  ) => void;

  setProgression: (
    progression: ProgressionData[],
  ) => void;

  getProgression: (
    id: number,
  ) => ProgressionData | undefined;
}

export const useProgressionStore =
  create<ProgressionStore>(
    (set, get) => ({
      manifest: null,

      progressionById: {},

      setManifest: (
        manifest,
      ) =>
        set({
          manifest,
        }),

      setProgression: (
        progression,
      ) =>
        set((state) => {
          const mapped: Record<
            number,
            ProgressionData
          > = {};

          for (const entity of progression) {
            mapped[entity.id] =
              entity;
          }

          return {
            progressionById: mapped,
          };
        }),

      getProgression: (
        id,
      ) => {
        return get()
          .progressionById[id];
      },
    }),
  );