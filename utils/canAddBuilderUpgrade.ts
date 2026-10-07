import { Upgrade } from "@/types/upgrade";
import { getBuilderStatus } from "./status/home/builderStatus";

export function canAddBuilderUpgrade(params: {
  activeUpgrades: Upgrade[];
  normalBuilderCount: number;
  goblinBuilderUnlocked: boolean;
}) {
  const status = getBuilderStatus({
    village: "home",
    normalBuilderCount: params.normalBuilderCount,
    goblinBuilderUnlocked: params.goblinBuilderUnlocked,
    activeUpgrades: params.activeUpgrades,
  });

  return status.freeBuilders > 0;
}
