import { ENV } from "@/config/env";
import { ProgressionQueries } from "@/services/progression/progressionQueries";
import { useCraftedDefenseProgressionStore } from "@/stores/crafted";
import { useEntityStore } from "@/stores/entityStore";
import type { EntityType, Village } from "@/types/entity";
import { calculateCraftedDefenseTotalLevel } from "./calculateCraftedDefenseTotalLevel";
import { resolveCraftedDefenseIconLevel } from "./resolveCraftedDefenseIconLevel";
import { resolveProgressionIconLevelOrFirst } from "./resolveProgressionIconLevel";

export const FALLBACK_ICON =
  "https://cdn.clashwidget.online/entities/fallbacks/fallback.png";

interface ResolveEntityIconOptions {
  village?: Village;
  type?: EntityType;
  subType?: string;
  /** Resolve a stale/mismatched stored ID through the canonical village name mapping. */
  entityName?: string;
  level?: number;
  isSuperTroop?: boolean;
  /** Use the level-independent troop icon asset instead of a level-specific image. */
  useTroopIcon?: boolean;
  isCrafted?: boolean;
  moduleId?: number;
  craftedModuleLevels?: Record<number, number>;
  craftedModuleLevelOverride?: number;
}

const HOME_ICON_CATEGORIES: Partial<Record<EntityType, string>> = {
  building: "buildings",
  trap: "traps",
  hero: "heroes",
  troop: "troops",
  spell: "spells",
  pet: "pets",
  siege: "sieges",
  helper: "helpers",
  guardian: "guardians",
};

const BUILDER_ICON_CATEGORIES: Partial<Record<EntityType, string>> = {
  building: "buildings",
  trap: "traps",
  hero: "heroes",
  troop: "troops",
};

function normalizeIconLevel(level?: number): number {
  return typeof level === "number" && Number.isFinite(level) && level > 0
    ? level
    : 1;
}

function resolveLevelBasedIconLevel(entityId: number, level: number): number {
  const progression = ProgressionQueries.getProgression(entityId);
  return (
    resolveProgressionIconLevelOrFirst(level, progression?.images) ??
    level
  );
}

/**
 * Hall art is determined entirely by the player's hall level. It must not
 * depend on entity metadata being hydrated in the local entity store.
 */
export function resolveHallIcon(
  village: "home" | "builderBase",
  level?: number,
): string {
  const safeLevel = normalizeIconLevel(level);
  return village === "home"
    ? `${ENV.CDN_BASE}/v2/home/townhalls/${safeLevel}.png`
    : `${ENV.CDN_BASE}/v2/builder/builderhalls/${safeLevel}.png`;
}

export function resolveEntityIcon(
  entityId: number,
  options?: ResolveEntityIconOptions,
): string {
  /*
   * Crafted defenses use their own icon namespace. Their JSON image
   * ranges map progression levels to the normal PNG level to display.
   */
  if (
    options?.isCrafted &&
    (options.level != null || options.craftedModuleLevels != null)
  ) {
    const progression =
      useCraftedDefenseProgressionStore
        .getState()
        .getProgression(entityId);
    const moduleLevels = options.craftedModuleLevels;
    const totalLevel =
      moduleLevels && Object.keys(moduleLevels).length > 0
        ? calculateCraftedDefenseTotalLevel(
            moduleLevels,
            options.moduleId,
            options.craftedModuleLevelOverride,
          )
        : options.level;

    if (
      totalLevel == null ||
      !Number.isFinite(totalLevel) ||
      totalLevel <= 0
    ) {
      return FALLBACK_ICON;
    }

    const iconLevel = resolveCraftedDefenseIconLevel(
      totalLevel,
      progression?.images,
    );

    if (iconLevel == null) {
      return FALLBACK_ICON;
    }

    return `${ENV.CDN_BASE}/v2/crafted/${entityId}/${iconLevel}.png`;
  }

  const entityStore = useEntityStore.getState();
  const directEntity = entityStore.entitiesById[entityId];
  const village = options?.village ?? directEntity?.village;
  const requestedName = options?.entityName?.trim().toLowerCase();
  const directName = directEntity?.name.en.trim().toLowerCase();
  const mappedId =
    requestedName && village && requestedName !== directName
      ? entityStore.getEntityId(options.entityName!, village)
      : null;
  const entity =
    mappedId != null
      ? entityStore.entitiesById[mappedId]
      : directEntity;
  const resolvedEntityId = entity?.id ?? entityId;
  const type = options?.type ?? entity?.type;
  const subType = options?.subType ?? entity?.subType;

  // Explicit type + village is sufficient to resolve category-based assets.
  // This also lets stable profile entities resolve while metadata is loading.
  if (!entity && (!village || !type)) {
    return FALLBACK_ICON;
  }

  // Super Troops are nested variants, not independent numeric entities.
  if (options?.isSuperTroop) {
    return entity?.superTroop?.icon ?? entity?.icon ?? FALLBACK_ICON;
  }

  // Troop cards can use a stable icon asset independent of the troop's level.
  if (options?.useTroopIcon && type === "troop" && village) {
    const villagePath = village === "builderBase" ? "builder" : "home";
    return `${ENV.CDN_BASE}/v2/${villagePath}/troops/${resolvedEntityId}/icon.png`;
  }

  // Town Hall and Builder Hall have dedicated level-based asset namespaces.
  if (
    (village === "home" &&
      (type === "townhall" || subType === "TOWNHALL")) ||
    (village === "builderBase" &&
      (type === "builderhall" || subType === "BUILDERHALL"))
  ) {
    return resolveHallIcon(village, options?.level);
  }

  if (village === "home" && type === "hero") {
    return `${ENV.CDN_BASE}/v2/home/heroes/${resolvedEntityId}/icon.png`;
  }

  if (village === "builderBase" && type === "hero") {
    return `${ENV.CDN_BASE}/v2/builder/heroes/${resolvedEntityId}/icon.png`;
  }

  /*
   * Pets, guardians, spells, and helpers use category assets. Their image
   * does not depend on the current upgrade level, so missing level data must
   * not route them through the legacy metadata.icon fallback.
   */
  if (
    village === "home" &&
    (type === "pet" ||
      type === "guardian" ||
      type === "spell" ||
      type === "helper")
  ) {
    const category = HOME_ICON_CATEGORIES[type];
    return category
      ? `${ENV.CDN_BASE}/v2/home/${category}/${resolvedEntityId}/1.png`
      : entity?.icon ?? FALLBACK_ICON;
  }

  /*
   * A missing level means "show the first valid level image", not "use a
   * possibly absent legacy metadata.icon". This covers lab upgrades whose
   * imported/current level is not present on the stored upgrade record.
   */
  const safeLevel = normalizeIconLevel(options?.level);

  if (village === "home") {
    const category = type ? HOME_ICON_CATEGORIES[type] : undefined;

    if (category) {
      const iconLevel = resolveLevelBasedIconLevel(resolvedEntityId, safeLevel);
      return `${ENV.CDN_BASE}/v2/home/${category}/${resolvedEntityId}/${iconLevel}.png`;
    }
  }

  if (village === "builderBase") {
    const category = type ? BUILDER_ICON_CATEGORIES[type] : undefined;

    if (category) {
      const iconLevel = resolveLevelBasedIconLevel(resolvedEntityId, safeLevel);
      return `${ENV.CDN_BASE}/v2/builder/${category}/${resolvedEntityId}/${iconLevel}.png`;
    }
  }

  return entity?.icon ?? FALLBACK_ICON;
}

export function resolveBuilderBaseLeagueIcon(leagueId?: number) {
  if (!leagueId || !ENV.CDN_BASE) {
    return undefined;
  }

  return `${ENV.CDN_BASE}/v2/builder/leagues/${leagueId}.png`;
}
