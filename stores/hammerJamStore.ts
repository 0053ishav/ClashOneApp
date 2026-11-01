import { create } from "zustand";
import {
  DEFAULT_HAMMER_JAM_MANIFEST,
  isHammerJamActive,
  type HammerJamManifest,
} from "@/engine/magicItems/hammerJam";
import { fetchHammerJamManifestResult } from "@/services/fetchHammerJamManifest";

export type HammerJamAvailability =
  | "loading"
  | "active"
  | "disabled"
  | "unavailable";

type HammerJamState = {
  manifest: HammerJamManifest;
  availability: HammerJamAvailability;
  sync: () => Promise<void>;
  refreshAvailability: (now?: number) => void;
};

let latestSyncRequestId = 0;

export const useHammerJamStore = create<HammerJamState>((set, get) => ({
  manifest: DEFAULT_HAMMER_JAM_MANIFEST,
  availability: "loading",
  sync: async () => {
    const requestId = ++latestSyncRequestId;
    // Fail closed during refresh; stale active config must not keep discounts on.
    set({ availability: "loading", manifest: DEFAULT_HAMMER_JAM_MANIFEST });
    const result = await fetchHammerJamManifestResult();
    if (requestId !== latestSyncRequestId) return;
    set({ manifest: result.manifest, availability: result.status });
  },
  refreshAvailability: (now = Date.now()) => {
    const { manifest, availability } = get();
    if (availability === "loading" || availability === "unavailable") return;
    set({
      availability: isHammerJamActive(manifest, now) ? "active" : "disabled",
    });
  },
}));
