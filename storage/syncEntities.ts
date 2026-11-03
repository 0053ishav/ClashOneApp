import * as Sentry from "@sentry/react-native";

import {
  fetchCategory,
  fetchManifest,
} from "@/services/cdnEntities";
import {
  loadEntityGlobalManifestVersion,
  loadEntityManifest,
  loadEntityVersion,
  saveEntityCategory,
  saveEntityGlobalManifestVersion,
  saveEntityManifest,
  saveEntityVersion,
} from "@/storage/entityStorage";

export async function syncEntities(): Promise<void> {
  const manifest = await fetchManifest();
  const localManifest = loadEntityManifest();
  const localGlobalVersion = loadEntityGlobalManifestVersion();

  // Category versions are authoritative. Always inspect them, even when the
  // global version matches, so installs affected by the old retry bug recover.
  const categories = Object.entries(manifest.metadata) as [string, number][];
  let allCategoriesSynced = true;

  for (const [category, remoteVersion] of categories) {
    const localVersion = loadEntityVersion(category);

    if (localVersion === remoteVersion) {
      continue;
    }

    try {
      const entities = await fetchCategory(category);

      saveEntityCategory(category, entities);
      saveEntityVersion(category, remoteVersion);
    } catch (error: unknown) {
      allCategoriesSynced = false;

      Sentry.captureException(error, {
        tags: {
          sync_dataset: "entity_metadata",
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
    localManifest?.version === manifest.metadataVersion &&
    Object.keys(localManifest.categories).length === categories.length &&
    categories.every(
      ([category, version]) => localManifest.categories[category] === version,
    );

  if (!manifestMatches) {
    saveEntityManifest({
      version: manifest.metadataVersion,
      categories: manifest.metadata,
    });
  }

  if (localGlobalVersion !== manifest.version) {
    saveEntityGlobalManifestVersion(manifest.version);
  }
}
