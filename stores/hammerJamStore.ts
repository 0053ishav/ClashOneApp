import { create } from "zustand";
import {
  DEFAULT_HAMMER_JAM_MANIFEST,
  type HammerJamManifest,
} from "@/engine/magicItems/hammerJam";
import { fetchHammerJamManifest } from "@/services/fetchHammerJamManifest";

type HammerJamState = {
  manifest: HammerJamManifest;
  isLoaded: boolean;
  sync: () => Promise<void>;
};

export const useHammerJamStore = create<HammerJamState>((set) => ({
  manifest: DEFAULT_HAMMER_JAM_MANIFEST,
  isLoaded: false,
  sync: async () => {
    const manifest = await fetchHammerJamManifest();
    set({ manifest, isLoaded: true });
  },
}));
