import { Upgrade } from "@/types/upgrade";

export function getBuilderBaseBuilderStatus(params: {
  builderCount: number;
  activeUpgrades: Upgrade[];
}) {
  const busyBuilders = params.activeUpgrades.length;

  const freeBuilders = Math.max(
    params.builderCount - busyBuilders,
    0,
  );

  return {
    maxBuilders: params.builderCount,

    busyBuilders,
    freeBuilders,

    allFree: busyBuilders === 0,
    allBusy: freeBuilders === 0,
  };
}