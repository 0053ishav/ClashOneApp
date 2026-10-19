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
import { normalizeVillage, type Village } from "@/types/entity";

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
          if (!entity.name?.en) {
            console.warn("[EntityStore] Invalid entity name", entity);
            continue;
          }

          const village = normalizeVillage(String(entity.village));
          if (!village) {
            console.warn("[EntityStore] Unsupported entity village", {
              id: entity.id,
              village: entity.village,
            });
            continue;
          }

          // Store only canonical domain values; normalize external metadata here.
          const normalizedEntity: EntityData = {
            ...entity,
            village,
          };

          mapped[normalizedEntity.id] = normalizedEntity;
          byName[
            `${normalizedEntity.name.en.trim().toLowerCase()}|${normalizedEntity.village}`
          ] = normalizedEntity.id;
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