

import { useProgressionStore } from "@/stores/progressionStore";

import { loadProgressionCategory, loadProgressionManifest } from "@/storage/progressionStorage";
import type {
  ProgressionData
} from "@/types/progression";

export const CRAFTED_CATEGORY = "craftedDefenses";

export function hydrateProgression() {
  const manifest = loadProgressionManifest();


  if (!manifest) {
    return;
  }

  const store =
    useProgressionStore.getState();

  const merged: ProgressionData[] = [];

  for (const category of Object.keys(manifest.categories,)) {
    if (category === CRAFTED_CATEGORY) {
      continue;
    }

    const progression = loadProgressionCategory(category);

    if (!progression) continue;

    merged.push(...progression);
  }

  store.setProgression(merged);
  store.setManifest(manifest);
}