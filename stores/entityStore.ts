/**
 * Central cache for entity metadata.
 */
import { create } from "zustand";
import type { EntityData, EntityManifest, ExternalEntityData } from "@/types/entities";
import { normalizeVillage, type Village } from "@/types/entity";

interface EntityStore {
  manifest: EntityManifest | null;
  entitiesById: Record<number, EntityData>;
  entitiesByName: Record<string, number>;
  setManifest: (manifest: EntityManifest) => void;
  setEntities: (entities: ExternalEntityData[]) => void;
  getEntity: (id: number) => EntityData | undefined;
  getEntityId: (name: string, village?: Village) => number | null;
  isSuperTroop: (name: string, village?: Village) => boolean;
}

const entityNameKey = (name: string, village: Village) =>
  `${name.trim().toLowerCase()}|${village}`;

export const useEntityStore = create<EntityStore>((set, get) => ({
  manifest: null,
  entitiesById: {},
  entitiesByName: {},
  setManifest: (manifest) => set({ manifest }),
  setEntities: (entities) =>
    set((state) => {
      const mapped: Record<number, EntityData> = {};
      const byName: Record<string, number> = {};
      const superTroopNames = new Set<string>();

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
        const normalizedEntity: EntityData = { ...entity, village };
        mapped[normalizedEntity.id] = normalizedEntity;
        byName[entityNameKey(normalizedEntity.name.en, village)] = normalizedEntity.id;
        if (normalizedEntity.superTroop?.name?.en) {
          const key = entityNameKey(normalizedEntity.superTroop.name.en, village);
          byName[key] = normalizedEntity.id;
          superTroopNames.add(key);
        }
      }

      return {
        entitiesById: { ...state.entitiesById, ...mapped },
        entitiesByName: { ...state.entitiesByName, ...byName },
        superTroopNamesByKey: {
          ...(state as EntityStore & { superTroopNamesByKey?: Record<string, true> }).superTroopNamesByKey,
          ...Object.fromEntries([...superTroopNames].map((key) => [key, true])),
        },
      } as Partial<EntityStore>;
    }),
  getEntity: (id) => get().entitiesById[id],
  getEntityId: (name, village = "home") =>
    get().entitiesByName[entityNameKey(name, village)] ?? null,
  isSuperTroop: (name, village = "home") => {
    const id = get().getEntityId(name, village);
    const entity = id == null ? undefined : get().entitiesById[id];
    return entity?.superTroop?.name.en.trim().toLowerCase() === name.trim().toLowerCase();
  },
}));
