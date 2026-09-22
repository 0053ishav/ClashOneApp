import { Village } from "@/types/entity";
import { resolveEntityIcon } from "./resolveEntityIcon";

export function resolveUpgradeIcon(
  dataId: number,
  level: number | undefined,
  options?: {
    village?: Village;
    isCrafted?: boolean;
  },
) {
  return resolveEntityIcon(
    dataId,
    {
      village: options?.village,
      level,
      isCrafted: options?.isCrafted,
    },
  );
}