import * as Sentry from "@sentry/react-native";

import { fetchManifest } from "@/services/cdnEntities";
import {
  loadProgressionGlobalManifestVersion,
  loadProgressionVersion,
  saveProgressionCategory,
  saveProgressionGlobalManifestVersion,
  saveProgressionManifest,
  saveProgressionVersion,
} from "@/storage/progressionStorage";

import { fetchProgressionCategory } from "./progression";

export async function syncProgression(): Promise<void> {
  const manifest = await fetchManifest();
  const localGlobalVersion = loadProgressionGlobalManifestVersion();

  if (localGlobalVersion === manifest.version) {
    return;
  }

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
          remote_manifest_version: manifest.version,
        },
      });
    }
  }

  // Do not advance either checkpoint after a partial sync. The next launch
  // must retry failed categories instead of treating the manifest as current.
  if (!allCategoriesSynced) {
    return;
  }

  saveProgressionManifest({
    version: manifest.progressionVersion,
    categories: manifest.progression,
  });
  saveProgressionGlobalManifestVersion(manifest.version);
}
