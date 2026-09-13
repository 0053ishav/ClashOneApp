import { storage } from "@/storage/mmkv";

import type {
    EntityData,
    EntityManifest,
} from "@/types/entities";

import { STORAGE_KEYS } from "@/storage/keys";

export function saveEntityManifest(
  manifest: EntityManifest,
) {
  storage.set(
    STORAGE_KEYS.ENTITY_MANIFEST,
    JSON.stringify(manifest),
  );
}

export function loadEntityManifest():
  | EntityManifest
  | null {
  const raw = storage.getString(
    STORAGE_KEYS.ENTITY_MANIFEST,
  );

  if (!raw) return null;

  return JSON.parse(raw);
}

export function saveEntityCategory(
  category: string,
  entities: EntityData[],
) {
  storage.set(
    `entities_${category}`,
    JSON.stringify(entities),
  );
}

export function loadEntityCategory(
  category: string,
): EntityData[] | null {
  const raw = storage.getString(
    `entities_${category}`,
  );

  if (!raw) return null;

  return JSON.parse(raw);
}

export function saveEntityVersion(
  category: string,
  version: number,
) {
  storage.set(
    `entities_version_${category}`,
    version,
  );
}

export function loadEntityVersion(
  category: string,
): number | undefined {
  return storage.getNumber(
    `entities_version_${category}`,
  );
}