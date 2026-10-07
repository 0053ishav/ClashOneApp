import {
  fetchCategory,

  fetchManifest
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

export async function syncEntities() {
  const manifest =
    await fetchManifest();

  // console.log(
  //   "[EntitySync] REMOTE MANIFEST",
  //   manifest,
  // );

  // ─────────────────────────────
  // 1. GLOBAL MANIFEST VERSION
  // ─────────────────────────────

  const localGlobalVersion =
    loadEntityGlobalManifestVersion();

  // console.log(
  //   "[EntitySync] GLOBAL VERSION CHECK",
  //   {
  //     localVersion:
  //       localGlobalVersion ?? null,
  //     remoteVersion:
  //       manifest.version,
  //   },
  // );

  if (
    localGlobalVersion ===
    manifest.version
  ) {
    // console.log(
    //   "[EntitySync] Global manifest up to date",
    // );

    return;
  }

  // ─────────────────────────────
  // 2. METADATA VERSION
  // ─────────────────────────────

  const localManifest =
    loadEntityManifest();

  console.log(
    "[EntitySync] METADATA VERSION CHECK",
    {
      localVersion:
        localManifest?.version ?? null,
      remoteVersion:
        manifest.metadataVersion,
    },
  );

  // Metadata itself has not changed.
  if (
    localManifest?.version ===
    manifest.metadataVersion
  ) {
    console.log(
      "[EntitySync] Metadata version unchanged",
    );

    saveEntityGlobalManifestVersion(
      manifest.version,
    );

    return;
  }

  // ─────────────────────────────
  // 3. CATEGORY VERSIONS
  // ─────────────────────────────

  // console.log(
  //   "[EntitySync] Metadata version changed",
  //   {
  //     localVersion:
  //       localManifest?.version ?? null,
  //     remoteVersion:
  //       manifest.metadataVersion,
  //   },
  // );

  const categories =
    Object.entries(
      manifest.metadata,
    ) as [string, number][];

  let allCategoriesSynced = true;

  for (const [
    category,
    remoteVersion,
  ] of categories) {
    const localVersion =
      loadEntityVersion(category);

    // console.log(
    //   "[EntitySync] CATEGORY VERSION CHECK",
    //   {
    //     category,
    //     localVersion,
    //     remoteVersion,
    //   },
    // );

    if (
      localVersion === remoteVersion
    ) {
      continue;
    }

    try {
      const entities =
        await fetchCategory(category);

      saveEntityCategory(
        category,
        entities,
      );

      saveEntityVersion(
        category,
        remoteVersion,
      );

      // console.log(
      //   `[EntitySync] Synced entities ${category}`,
      // );
    } catch {
      allCategoriesSynced = false;

      // console.log(
      //   `[EntitySync] Failed syncing entities ${category}`,
      //   err,
      // );
    }
  }

  // Only update local metadata manifest
  // when all category syncs succeeded.
  if (allCategoriesSynced) {
    saveEntityManifest({
      version:
        manifest.metadataVersion,
      categories:
        manifest.metadata,
    });

    // console.log(
    //   "[EntitySync] Metadata sync complete",
    //   {
    //     version:
    //       manifest.metadataVersion,
    //   },
    // );
  }

  // Global manifest version is independent
  // of metadata category synchronization.
  saveEntityGlobalManifestVersion(
    manifest.version,
  );
}