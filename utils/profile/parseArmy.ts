import type { PlayerEntityLevel, PlayerFull, PlayerVillage } from "@/types/playerFull";
import { getEntity, getEntityId } from "@/utils/getEntity";
import { useEntityStore } from "@/stores/entityStore";
import { ProgressionQueries } from "@/services/progression/progressionQueries";

export interface ParsedArmyEntity extends PlayerEntityLevel {
  dataId: number;
  isSuperTroop?: boolean;
}

function attachId(
  entity: PlayerEntityLevel,
  playerTroops: PlayerEntityLevel[] = [],
): ParsedArmyEntity {
  const entityStore = useEntityStore.getState();
  const id = getEntityId(entity.name, entity.village);
  const isSuperTroop = entityStore.isSuperTroop(entity.name, entity.village);
  const parent = id == null ? undefined : entityStore.getEntity(id);
  const progression = id == null ? undefined : ProgressionQueries.getProgression(id);
  const regularTroop = isSuperTroop
    ? playerTroops.find((candidate) =>
        candidate.village === entity.village &&
        candidate.name.trim().toLowerCase() === parent?.name.en.trim().toLowerCase()
      )
    : undefined;
  const level = isSuperTroop ? (regularTroop?.level ?? entity.level) : entity.level;
  const maxLevel = isSuperTroop
    ? (progression?.superTroop?.maxLevel ?? parent?.superTroop?.maxLevel ?? entity.maxLevel)
    : entity.maxLevel;

  if (__DEV__ && id === null) {
    console.warn("Missing entity mapping:", entity.name, entity.village);
  }

  return { ...entity, level, maxLevel, dataId: id ?? -1, ...(isSuperTroop ? { isSuperTroop: true } : {}) };
}

function isResolved<T extends ParsedArmyEntity>(entity: T): entity is T & { dataId: number } {
  return entity.dataId !== -1;
}

export interface ParsedArmy {
  home: {
    troops: ParsedArmyEntity[];
    superTroops: ParsedArmyEntity[];
    pets: ParsedArmyEntity[];
    siegeMachines: ParsedArmyEntity[];
    heroes: ParsedArmyEntity[];
  };
  builderBase: { troops: ParsedArmyEntity[]; heroes: ParsedArmyEntity[] };
}

export function parseArmy(data: PlayerFull): ParsedArmy {
  const playerTroops = data.troops ?? [];
  const mappedTroops = playerTroops.map((troop) => attachId(troop, playerTroops));
  const mappedHeroes = (data.heroes ?? []).map((hero) => attachId(hero));
  const validTroops = mappedTroops.filter(isResolved);
  const validHeroes = mappedHeroes.filter(isResolved);

  const troops = validTroops.filter((troop) => {
    const entity = getEntity(troop.dataId);
    return entity.type === "troop" && !troop.isSuperTroop;
  });
  const superTroops = validTroops.filter((troop) =>
    getEntity(troop.dataId).type === "troop" && troop.isSuperTroop === true
  );
  const pets = validTroops.filter((troop) => getEntity(troop.dataId).type === "pet");
  const siegeMachines = validTroops.filter((troop) => getEntity(troop.dataId).type === "siege");
  const heroes = validHeroes.filter((hero) => getEntity(hero.dataId).type === "hero");
  const inVillage = <T extends { village: PlayerVillage }>(entities: T[], village: PlayerVillage) =>
    entities.filter((entity) => entity.village === village);

  return {
    home: {
      troops: inVillage(troops, "home"),
      superTroops: inVillage(superTroops, "home"),
      pets: inVillage(pets, "home"),
      siegeMachines: inVillage(siegeMachines, "home"),
      heroes: inVillage(heroes, "home"),
    },
    builderBase: {
      troops: inVillage(troops, "builderBase"),
      heroes: inVillage(heroes, "builderBase"),
    },
  };
}
