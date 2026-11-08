import * as Sentry from "@sentry/react-native";

import { fetchManifest } from "@/services/cdnEntities";
import {
  loadProgressionGlobalManifestVersion,
  loadProgressionManifest,
  loadProgressionVersion,
  saveProgressionCategory,
  saveProgressionGlobalManifestVersion,
  saveProgressionManifest,
  saveProgressionVersion,
} from "@/storage/progressionStorage";

import { fetchProgressionCategory } from "./progression";

export async function syncProgression(): Promise<void> {
  const manifest = await fetchManifest();
  const localManifest = loadProgressionManifest();
  const localGlobalVersion = loadProgressionGlobalManifestVersion();

  // Category versions are authoritative. Always inspect them, even when the
  // global version matches, so installs affected by the old retry bug recover.
  const categories = Object.entries(manifest.progression) as [string, number][];
  let allCategoriesSynced = true;

  for (const [category, remoteVersion] of categories) {
    const localVersion = loadProgressionVersion(category);

    if (localVersion === remoteVersion) {
      continue;
    }

    try {
      const progression = await fetchProgressionCategory(category);

      saveProgressionCategory(category, progression);
      saveProgressionVersion(category, remoteVersion);
    } catch (error: unknown) {
      allCategoriesSynced = false;

      Sentry.captureException(error, {
        tags: {
          sync_dataset: "progression",
          sync_category: category,
        },
        extra: {
          local_category_version: localVersion ?? null,
          remote_category_version: remoteVersion,
          local_global_version: localGlobalVersion ?? null,
          remote_manifest_version: manifest.version,
        },
      });
    }
  }

  // Never advance either checkpoint after a partial sync. The next launch
  // will inspect category versions again and retry any failed download.
  if (!allCategoriesSynced) {
    return;
  }

  const manifestMatches =
    localManifest?.version === manifest.progressionVersion &&
    Object.keys(localManifest.categories).length === categories.length &&
    categories.every(
      ([category, version]) => localManifest.categories[category] === version,
    );

  if (!manifestMatches) {
    saveProgressionManifest({
      version: manifest.progressionVersion,
      categories: manifest.progression,
    });
  }

  if (localGlobalVersion !== manifest.version) {
    saveProgressionGlobalManifestVersion(manifest.version);
  }
}
