import {
  fetchProgressionCategory,
} from "./progression";

import {
  fetchManifest,
} from "@/services/cdnEntities";

import {
  loadProgressionGlobalManifestVersion,
  loadProgressionManifest,
  loadProgressionVersion,
  saveProgressionCategory,
  saveProgressionGlobalManifestVersion,
  saveProgressionManifest,
  saveProgressionVersion,
} from "@/storage/progressionStorage";

export async function syncProgression() {
  const manifest =
    await fetchManifest();

  // console.log(
  //   "[ProgressionSync] REMOTE MANIFEST",
  //   manifest,
  // );

  // ─────────────────────────────
  // 1. GLOBAL MANIFEST VERSION
  // ─────────────────────────────

  const localGlobalVersion =
    loadProgressionGlobalManifestVersion();

  // console.log(
  //   "[ProgressionSync] GLOBAL VERSION CHECK",
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
    //   "[ProgressionSync] Global manifest up to date",
    // );

    return;
  }

  // ─────────────────────────────
  // 2. PROGRESSION VERSION
  // ─────────────────────────────

  const localManifest =
    loadProgressionManifest();

  // console.log(
  //   "[ProgressionSync] PROGRESSION VERSION CHECK",
  //   {
  //     localVersion:
  //       localManifest?.version ?? null,
  //     remoteVersion:
  //       manifest.progressionVersion,
  //   },
  // );

  if (
    localManifest?.version ===
    manifest.progressionVersion
  ) {
    // console.log(
    //   "[ProgressionSync] Progression version unchanged",
    // );

    saveProgressionGlobalManifestVersion(
      manifest.version,
    );

    return;
  }

  // console.log(
  //   "[ProgressionSync] Progression version changed",
  //   {
  //     localVersion:
  //       localManifest?.version ?? null,
  //     remoteVersion:
  //       manifest.progressionVersion,
  //   },
  // );

  // ─────────────────────────────
  // 3. CATEGORY VERSIONS
  // ─────────────────────────────

  const categories =
    Object.entries(
      manifest.progression,
    ) as [string, number][];

  let allCategoriesSynced = true;

  for (const [
    category,
    remoteVersion,
  ] of categories) {
    const localVersion =
      loadProgressionVersion(
        category,
      );

    // console.log(
    //   "[ProgressionSync] CATEGORY VERSION CHECK",
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
      const progression =
        await fetchProgressionCategory(
          category,
        );

      saveProgressionCategory(
        category,
        progression,
      );

      saveProgressionVersion(
        category,
        remoteVersion,
      );

      // console.log(
      //   `[ProgressionSync] Synced progression ${category}`,
      // );
    } catch {
      allCategoriesSynced = false;

      // console.log(
      //   `[ProgressionSync] Failed syncing progression ${category}`,
      //   err,
      // );
    }
  }

  // ─────────────────────────────
  // SAVE LOCAL PROGRESSION MANIFEST
  // ─────────────────────────────

  if (allCategoriesSynced) {
    saveProgressionManifest({
      version:
        manifest.progressionVersion,
      categories:
        manifest.progression,
    });

    // console.log(
    //   "[ProgressionSync] Progression sync complete",
    //   {
    //     version:
    //       manifest.progressionVersion,
    //   },
    // );
  }

  // Global manifest version is updated
  // after this sync attempt.
  saveProgressionGlobalManifestVersion(
    manifest.version,
  );
}