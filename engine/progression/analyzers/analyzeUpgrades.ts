import { PETS, SIEGE_MACHINES, SUPER_TROOPS } from "@/entities/entityGroups";
import { getUpgradeStatus } from "../selectors/getUpgradeStatus";

export function analyzeTroopUpgrades(troops: any[]) {
  const result: { low: any[]; mid: any[]; near: any[], max: any[] } = {
    low: [],
    mid: [],
    near: [],
    max: [],
  };

  troops
    .filter(
      (t) =>
        t.village === "home" &&
        !PETS.includes(t.name) &&
        !SIEGE_MACHINES.includes(t.name) &&
        !SUPER_TROOPS.includes(t.name),
    )
    .forEach((troop) => {
      const status = getUpgradeStatus(troop.level, troop.maxLevel);

      result[status].push(troop);
    });

  return result;
}