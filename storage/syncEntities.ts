import * as Sentry from "@sentry/react-native";

import {
  fetchCategory,
  fetchManifest,
} from "@/services/cdnEntities";
import {
  loadEntityGlobalManifestVersion,
  loadEntityVersion,
  saveEntityCategory,
  saveEntityGlobalManifestVersion,
  saveEntityManifest,
  saveEntityVersion,
} from "@/storage/entityStorage";

export async function syncEntities(): Promise<void> {
  const manifest = await fetchManifest();
  const localGlobalVersion = loadEntityGlobalManifestVersion();

  if (localGlobalVersion === manifest.version) {
    return;
  }

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
          remote_manifest_version: manifest.version,
        },
      });
    }
  }

  // Advance either checkpoint only after every required category succeeded.
  // Keeping the global version behind makes the next launch retry failed work.
  if (!allCategoriesSynced) {
    return;
  }

  saveEntityManifest({
    version: manifest.metadataVersion,
    categories: manifest.metadata,
  });
  saveEntityGlobalManifestVersion(manifest.version);
}
