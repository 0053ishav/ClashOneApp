  import { cacheEntityIcon } from "./cacheEntityIcon";
import { resolveEntityIcon } from "./resolveEntityIcon";

  export async function resolveWidgetEntityIcon(
    entityId: number,
    options?: {
      village?: "home" | "builderBase";
      level?: number;
      isCrafted?: boolean;
    },
  ) {
    const remoteIcon =
      resolveEntityIcon(
        entityId,
        options,
      );

    if (!remoteIcon) {
      return undefined;
    }

    return cacheEntityIcon(
      remoteIcon,
    );
  }