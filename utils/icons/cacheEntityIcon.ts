import * as FileSystem from "expo-file-system/legacy";

const ICON_CACHE_DIR =
  `${FileSystem.cacheDirectory}entity-icons/`;

async function ensureDir() {
  const dir =
    await FileSystem.getInfoAsync(
      ICON_CACHE_DIR,
    );

  if (!dir.exists) {
    await FileSystem.makeDirectoryAsync(
      ICON_CACHE_DIR,
      {
        intermediates: true,
      },
    );
  }
}

/**
 * Create a stable cache key from the complete URL.
 *
 * We cannot use the basename because our CDN paths
 * intentionally contain many files named `{level}.png`.
 *
 * Example:
 *
 * /v2/home/buildings/123/1.png
 * /v2/home/buildings/456/1.png
 *
 * must produce different cache files.
 */
function getCacheKey(url: string): string {
  let hash = 0;

  for (let i = 0; i < url.length; i++) {
    hash =
      (hash << 5) -
      hash +
      url.charCodeAt(i);

    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function getFileExtension(url: string): string {
  const path =
    url.split("?")[0];

  const extension =
    path.split(".").pop();

  return extension
    ? `.${extension}`
    : ".png";
}

function getFileName(url: string): string {
  return `icon-${getCacheKey(url)}${getFileExtension(url)}`;
}

export async function cacheEntityIcon(
  url: string,
) {
  if (!url) {
    return null;
  }

  await ensureDir();

  const fileName =
    getFileName(url);

  const localPath =
    `${ICON_CACHE_DIR}${fileName}`;

  const file =
    await FileSystem.getInfoAsync(
      localPath,
    );

  // Already cached
  if (file.exists) {
    return localPath;
  }

  try {
    await FileSystem.downloadAsync(
      url,
      localPath,
    );

    return localPath;
  } catch (err) {
    console.log(
      "Failed caching icon",
      err,
    );

    return url;
  }
}