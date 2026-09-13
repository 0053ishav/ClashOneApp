import {
  fetchCategory,
  fetchManifest,
} from "@/services/cdnEntities/entities";

import {
  loadEntityVersion,
  saveEntityCategory,
  saveEntityManifest,
  saveEntityVersion,
} from "@/storage/entityStorage";

export async function syncEntities() {
  const manifest =
    await fetchManifest();

  const categories = Object.entries(
    manifest.categories,
  ) as [string, number][];

  for (const [
    category,
    remoteVersion,
  ] of categories) {
    const localVersion =
      loadEntityVersion(category);

    if (
      localVersion ===
      remoteVersion
    ) {
      continue;
    }

    try {
      const entities =
        await fetchCategory(
          category,
        );

      saveEntityCategory(
        category,
        entities,
      );

      saveEntityVersion(
        category,
        remoteVersion,
      );

      console.log(
        `Synced entities ${category}`,
      );
    } catch (err) {
      console.log(
        `Failed syncing entities ${category}`,
        err,
      );
    }
  }

  saveEntityManifest(manifest);
}