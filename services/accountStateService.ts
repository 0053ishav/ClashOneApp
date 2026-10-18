import { Upgrade } from "@/types/upgrade";
import { isWorkForHireActive } from "@/utils/goblin";
import { getEntities } from "./entityService";
import { getUpgrades } from "./upgradeService";

export async function getAccountState(tag: string) {
  const upgrades = await getUpgrades(tag);
  const entities = await getEntities(tag);
  const now = Date.now();

  const activeUpgrades = upgrades.filter(
    (u) => !u.isCompleted && u.endTime > now
  );

  const homeBuilders: Upgrade[] = [];
  const builderBaseBuilders: Upgrade[] = [];

  const homeLabs: Upgrade[] = [];
  const builderBaseLabs: Upgrade[] = [];

  const guardians: Upgrade[] = [];

  let petUpgrade: Upgrade | null = null;

  for (const upgrade of activeUpgrades) {
    switch (upgrade.upgradeType) {
      case "BUILDER":
        if (upgrade.village === "home") {
          homeBuilders.push(upgrade);
        } else if (upgrade.village === "builderBase") {
          builderBaseBuilders.push(upgrade);
        }
        break;

      case "LAB":
        if (upgrade.village === "home") {
          homeLabs.push(upgrade);
        } else if (upgrade.village === "builderBase") {
          builderBaseLabs.push(upgrade);
        }
        break;

      case "PET":
        if (!petUpgrade) {
          petUpgrade = upgrade;
        }
        break;
    }

    if (upgrade.type === "GUARDIAN") {
      guardians.push(upgrade);
    }
  }

  const goblinEventActive = isWorkForHireActive();

  const homeLabNormal =
    homeLabs.find((u) => u.labSlot === "NORMAL") ?? null;

  const homeLabGoblinRaw =
    homeLabs.find((u) => u.labSlot === "GOBLIN") ?? null;

  const homeLabGoblin = goblinEventActive
    ? homeLabGoblinRaw
    : null;

  const builderBaseLab =
    builderBaseLabs.find(
      (u) => u.labSlot === "NORMAL"
    ) ?? null;

  if (!goblinEventActive && homeLabGoblinRaw) {
    console.warn(
      "⚠️ Stale goblin lab upgrade detected (event inactive)"
    );
  }
  return {
    upgrades,
    activeUpgrades,

    builders: {
      home: homeBuilders,
      builderBase: builderBaseBuilders,
    },

    lab: {
      home: {
        normal: homeLabNormal,
        goblin: homeLabGoblin,
        goblinAvailable: goblinEventActive,
      },

      builderBase: {
        normal: builderBaseLab,
        goblin: null,
        goblinAvailable: false,
      },
    },

    pet: petUpgrade,

    guardians,

    entities,
    helpers: entities.filter((e) => e.type === "helper"),
    petsState: entities.filter((e) => e.type === "pet"),
    guardiansState: entities.filter((e) => e.type === "guardian"),
  };
}