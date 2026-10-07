import {
  loadEntityCategory,
  loadEntityManifest,
} from "@/storage/entityStorage";


import {
  normalizeCraftedDefenses,
} from "./normalizeCraftedDefenses";


import { CRAFTED_CATEGORY } from "@/services/progression/hydrateProgression";
import { useCraftedDefenseStore } from "@/stores/crafted";


export function hydrateCraftedDefenses() {
  const manifest =
    loadEntityManifest();

  if (!manifest) {
    return;
  }

  if (
    manifest.categories[
      CRAFTED_CATEGORY
    ] == null
  ) {
  
    return;
  }

  const raw =
    loadEntityCategory(
      CRAFTED_CATEGORY,
    );

  if (!raw) {
    return;
  }

  const craftedRaw =
    raw as unknown as Parameters<
      typeof normalizeCraftedDefenses
    >[0];

  const normalized =
    normalizeCraftedDefenses(
      craftedRaw,
    );

  useCraftedDefenseStore
    .getState()
    .setDefenses(normalized);
}