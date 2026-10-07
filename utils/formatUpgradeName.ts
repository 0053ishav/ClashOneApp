import { getCraftedResolver } from "@/engine/crafted/craftedResolver";
import { Upgrade } from "@/types/upgrade";
import { formatBuildingName } from "@/utils/formatBuildingName";

export function formatUpgradeName(upgrade: Upgrade) {
  if (!upgrade.isCrafted) {
    return formatBuildingName(upgrade.entity);
  }

  const { getCraftedName, getModuleName } =
    getCraftedResolver();

  const name =
    getCraftedName(upgrade.dataId) ?? "Crafted";

  const module =
    getModuleName(
      upgrade.dataId,
      upgrade.moduleId,
    );

  return module
    ? `${name} (${module})`
    : name;
}