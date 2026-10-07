/**
 * Purpose:
    central cache for entity metadata
*/

/**
 * Store:

manifest
buildings
troops
heroes
pets
etc

Use:
zustand
 */

import { create } from "zustand";

import type {
  EntityData,
  EntityManifest,
} from "@/types/entities";
import { Village } from "@/types/entity";
import { log } from "@/utils/logger";

interface EntityStore {
  manifest: EntityManifest | null;

  entitiesById: Record<number, EntityData>;
  entitiesByName: Record<string, number>;

  setManifest: (
    manifest: EntityManifest,
  ) => void;

  setEntities: (
    entities: EntityData[],
  ) => void;

  getEntity: (
    id: number,
  ) => EntityData | undefined;

  getEntityId: (
    name: string,
    village?: Village,
  ) => number | null;
}

export const useEntityStore =
  create<EntityStore>((set, get) => ({
    manifest: null,

    entitiesById: {},
    entitiesByName: {},

    setManifest: (manifest) =>
      set({
        manifest,
      }),

    setEntities: (entities) =>
      set((state) => {
        const mapped: Record<
          number,
          EntityData
        > = {};

        const byName: Record<
          string,
          number
        > = {};

        for (const entity of entities) {
          log("entity unknown: ", entity.name)
           if (!entity.name) {
    console.log(
      "[EntityStore] ❌ Invalid entity",
      entity,
    );

    continue;
  }

  
          mapped[entity.id] =
            entity;

          byName[
            `${entity.name.en
              .trim()
              .toLowerCase()}|${entity.village}`
          ] = entity.id;
        }

        return {
          entitiesById: {
            ...state.entitiesById,
            ...mapped,
          },

          entitiesByName: {
            ...state.entitiesByName,
            ...byName,
          },
        };
      }),
    getEntity: (id) => {
      return get().entitiesById[id];
    },

    getEntityId: (
      name,
      village = "home",
    ) => {
      const key = `${name.trim().toLowerCase()}|${village}`;

      return (
        get().entitiesByName[key] ??
        null
      );
    },
  }));