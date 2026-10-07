import { Upgrade } from "@/types/upgrade";

export function getBuilderBaseVillageStatus({
  builders,
  builderCount,
  lab,
}: {
  builders: Upgrade[];
  builderCount: number;
  lab?: Upgrade | null;
}) {
  const busyBuilders = builders.length;

  const freeBuilders = Math.max(
    builderCount - busyBuilders,
    0,
  );

  const labBusy =
    !!lab && !lab.isCompleted;

  const labIdle = !labBusy;

  return {
    freeBuilders,

    allBuildersBusy: freeBuilders <= 0,

    labIdle,

    hasAnyIdle:
      freeBuilders > 0 ||
      labIdle,
  };
}