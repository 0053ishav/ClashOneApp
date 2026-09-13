import { useEntityStore } from "@/stores/entityStore";

import {
  loadEntityCategory,
  loadEntityManifest,
} from "@/storage/entityStorage";

import type {
  EntityData,
} from "@/types/entities";

import { log } from "@/utils/logger";

export function hydrateEntities() {
  const manifest =
    loadEntityManifest();

  log(
    "Entity Manifest:",
    manifest,
  );

  if (!manifest) {
    return;
  }

  const store =
    useEntityStore.getState();

  const merged: EntityData[] = [];

  for (const category of Object.keys(
    manifest.categories,
  )) {
    const entities =
      loadEntityCategory(
        category,
      );

    if (!entities) continue;

    merged.push(...entities);
  }

  store.setEntities(merged);

  store.setManifest(manifest);
}