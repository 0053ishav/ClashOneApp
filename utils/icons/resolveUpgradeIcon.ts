import { Village } from "@/types/entity";
import { resolveEntityIcon } from "./resolveEntityIcon";

export function resolveUpgradeIcon(
  dataId: number,
  level: number | undefined,
  options?: {
    village?: Village;
    isCrafted?: boolean;
    moduleId?: number;
    craftedModuleLevels?: Record<number, number>;
    craftedModuleLevelOverride?: number;
  },
) {
  return resolveEntityIcon(
    dataId,
    {
      village: options?.village,
      level,
      isCrafted: options?.isCrafted,
      moduleId: options?.moduleId,
      craftedModuleLevels: options?.craftedModuleLevels,
      craftedModuleLevelOverride: options?.craftedModuleLevelOverride,
    },
  );
}