import { Upgrade } from "@/types/upgrade";

export function getVillageStatus({
  townHall,
  builders,
  builderCount,
  pet,
  labNormal,
  labGoblin,
  goblinAvailable,
}: {
  townHall: number,
  builders: Upgrade[];
  builderCount: number;
  pet?: Upgrade | null;
  labNormal?: Upgrade | null;
  labGoblin?: Upgrade | null;
  goblinAvailable?: boolean;
}) {
  const normalBusyBuilders = builders.filter(
    (b) => b.builderSlot !== "G"
  ).length;

  const goblinBuilderBusy = builders.some(
    (b) => b.builderSlot === "G"
  );

  const freeBuilders = builderCount - normalBusyBuilders;

  const hasPetHouse = townHall >= 14;
  const petIdle = hasPetHouse && !pet;


  const isNormalLabBusy =
    !!labNormal && !labNormal.isCompleted;

  const isGoblinLabBusy =
    !!labGoblin && !labGoblin.isCompleted;

  const labIdle = !isNormalLabBusy;

  const goblinLabIdle =
    goblinAvailable &&
    !labIdle &&
    !isGoblinLabBusy;

  const goblinBuilderIdle =
    goblinAvailable &&
    freeBuilders <= 0 &&
    !goblinBuilderBusy;

  return {
    freeBuilders,
    allBuildersBusy: freeBuilders <= 0,

    petIdle,

    labIdle,
    goblinLabIdle,

    goblinBuilderIdle,

    hasAnyIdle:
      freeBuilders > 0 ||
      petIdle ||
      labIdle ||
      goblinLabIdle ||
      goblinBuilderIdle,
  };
}