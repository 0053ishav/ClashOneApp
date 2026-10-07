import { Village } from "@/types/entity";
import { Upgrade } from "@/types/upgrade";

export function getBuilderStatus(params: {
  village: Village;
  normalBuilderCount: number;
  goblinBuilderUnlocked: boolean;
  activeUpgrades: Upgrade[];
}) {
  const villageUpgrades =
    params.activeUpgrades.filter(
      (u) =>
        u.upgradeType === "BUILDER" &&
        u.village === params.village
    );

  const normalBusy =
    villageUpgrades.filter(
      (u) => u.builderSlot !== "G"
    ).length;

  const goblinBusy =
    villageUpgrades.some(
      (u) => u.builderSlot === "G"
    );

  const maxNormal =
    params.normalBuilderCount;

  const maxTotal =
    params.village === "home"
      ? maxNormal +
        (params.goblinBuilderUnlocked ? 1 : 0)
      : maxNormal;

  const busyBuilders =
    normalBusy +
    (goblinBusy ? 1 : 0);

  const freeNormal =
    Math.max(
      maxNormal - normalBusy,
      0
    );

  const freeGoblin =
    params.village === "home" &&
    params.goblinBuilderUnlocked &&
    !goblinBusy
      ? 1
      : 0;

  return {
    maxBuilders: maxTotal,
    busyBuilders,

    freeBuilders:
      freeNormal + freeGoblin,

    freeNormal,
    freeGoblin,

    goblinBusy,

    allFree:
      busyBuilders === 0,
  };
}