import { Village } from "@/types/entity";
import { getEntity, getEntityId } from "@/utils/getEntity";

interface ArmyEntity {
  name: string;
  level: number;
  maxLevel: number;
  village: Village;
}

function attachId(entity: ArmyEntity) {
  const id = getEntityId(entity.name, entity.village);

  if (__DEV__ && id === null) {
    console.warn(
      "Missing entity mapping:",
      entity.name,
      entity.village,
    );
  }

  return {
    ...entity,
    dataId: id ?? -1,
  };
}

export function parseArmy(data: any) {

  const mappedTroops =
    data.troops?.map(attachId) ?? [];
  const mappedHeroes =
    data.heroes?.map(attachId) ?? []

  const validHeroes =
    mappedHeroes.filter(
      (t: any) => t.dataId !== -1,
    );
  const validTroops =
    mappedTroops.filter(
      (t: any) => t.dataId !== -1,
    );

  const troops =
    validTroops
      .filter((t: any) => {
        const entity = getEntity(t.dataId);

        return (
          entity.type === "troop" &&
          entity.subType !== "SUPER_TROOP"
        );
      })
      // .sort((a: any, b: any) =>
      //   a.name.localeCompare(b.name),
      // ) ?? [];

  // const superTroops =
  //   data.troops
  //     ?.map(attachId)
  //     .filter((t: any) => {
  //       const entity = getEntity(t.dataId);

  //       return (
  //         entity.type === "troop" &&
  //         entity.subType === "SUPER_TROOP"
  //       );
  //     }) ?? [];

  const pets =
    validTroops
      .filter((t: any) => {
        const entity = getEntity(t.dataId);

        return entity.type === "pet";
      }) ?? [];

  const siegeMachines =
    validTroops
      .filter((t: any) => {
        const entity = getEntity(t.dataId);

        return entity.type === "siege";
      }) ?? [];

  const heroes =
    validHeroes
      .filter((h: any) => {
        const entity = getEntity(h.dataId);

        return entity.type === "hero";
      }) ?? [];

  return {
    home: {
      troops: troops.filter(
        (t: any) => t.village === "home",
      ),

      pets,

      siegeMachines,

      heroes: heroes.filter(
        (h: any) => h.village === "home",
      ),
    },

    builderBase: {
      troops: troops.filter(
        (t: any) => t.village === "builderBase",
      ),

      heroes: heroes.filter(
        (h: any) => h.village === "builderBase",
      ),
    },
  };
}