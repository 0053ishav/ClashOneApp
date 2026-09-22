import { STORAGE_KEYS } from "@/storage/keys";
import { storage } from "@/storage/mmkv";
import { ProgressionData, ProgressionManifest } from "@/types/progression";

export function saveProgressionGlobalManifestVersion(
  version: number,
): void {
  storage.set(
    STORAGE_KEYS.PROGRESSION_GLOBAL_MANIFEST_VERSION,
    version,
  );
}

export function loadProgressionGlobalManifestVersion():
  number | undefined {
  return storage.getNumber(
    STORAGE_KEYS.PROGRESSION_GLOBAL_MANIFEST_VERSION,
  );
}

export function saveProgressionCategory(
  category: string,
  data: ProgressionData[],
): void {
  storage.set(
    STORAGE_KEYS.PROGRESSION(category),
    JSON.stringify(data),
  );
}

export function loadProgressionCategory(
  category: string,
): ProgressionData[] | null {
  const raw =
    storage.getString(
      STORAGE_KEYS.PROGRESSION(category),
    );

  if (!raw) {
    return null;
  }

  return JSON.parse(raw);
}

export function saveProgressionVersion(
  category: string,
  version: number,
): void {
  storage.set(
    STORAGE_KEYS.PROGRESSION_VERSION(category),
    version,
  );
}

export function loadProgressionVersion(
  category: string,
): number | undefined {
  return storage.getNumber(
    STORAGE_KEYS.PROGRESSION_VERSION(category),
  );
}

export function saveProgressionManifest(
  manifest: ProgressionManifest,
): void {
  storage.set(
    STORAGE_KEYS.PROGRESSION_MANIFEST,
    JSON.stringify(manifest),
  );
}

export function loadProgressionManifest(): ProgressionManifest | null {
  const raw =
    storage.getString(STORAGE_KEYS.PROGRESSION_MANIFEST);

  if (!raw) {
    return null;
  }

  return JSON.parse(raw);
}

export function clearProgression() {
  const keys = storage.getAllKeys();

  for (const key of keys) {
    if (key.startsWith("progression")) {
      storage.remove(key);
    }
  }
}