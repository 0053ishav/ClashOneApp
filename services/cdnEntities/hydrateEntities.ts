import { useEntityStore } from "@/stores/entityStore";

import {
  loadEntityCategory,
  loadEntityManifest,
} from "@/storage/entityStorage";

import type {
  EntityData,
} from "@/types/entities";

import { CRAFTED_CATEGORY } from "@/services/progression/hydrateProgression";

export function hydrateEntities() {
  const manifest =
    loadEntityManifest();

  if (!manifest) {
    return;
  }

  const store =
    useEntityStore.getState();

  const merged: EntityData[] = [];

  for (const category of Object.keys(
    manifest.categories,
  )) {
    if (category === CRAFTED_CATEGORY) {
      continue;
    }

    const entities = loadEntityCategory(category);

    if (!entities || !Array.isArray(entities)) continue;

    merged.push(...entities);
  }

  store.setEntities(merged);

  store.setManifest(manifest);
}