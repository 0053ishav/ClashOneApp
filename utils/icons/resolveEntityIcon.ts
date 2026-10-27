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
  level?: number;
  isSuperTroop?: boolean;
  /** Use the level-independent troop icon asset instead of a level-specific image. */
  useTroopIcon?: boolean;
  isCrafted?: boolean;
  moduleId?: number;
  craftedModuleLevels?: Record<number, number>;
  craftedModuleLevelOverride?: number;
}

const HOME_ICON_CATEGORIES: Partial<
  Record<EntityType, string>
> = {
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

const BUILDER_ICON_CATEGORIES: Partial<
  Record<EntityType, string>
> = {
  building: "buildings",
  trap: "traps",
  hero: "heroes",
  troop: "troops",
};

function resolveLevelBasedIconLevel(entityId: number, level: number): number {
  const progression = ProgressionQueries.getProgression(entityId);
  return (
    resolveProgressionIconLevelOrFirst(level, progression?.images) ??
    level
  );
}

export function resolveEntityIcon(
  entityId: number,
  options?: ResolveEntityIconOptions,
) {
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

    if (totalLevel == null || !Number.isFinite(totalLevel) || totalLevel <= 0) {
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

  const entity =
    useEntityStore
      .getState()
      .entitiesById[entityId];

  if (!entity) {
    return FALLBACK_ICON;
  }

  const village =
    options?.village ??
    entity.village;

  const type =
    options?.type ??
    entity.type;

  const subType =
    options?.subType ??
    entity.subType;

  const level = options?.level;

  // Troop cards can use a stable icon asset independent of the troop's level.
  // The CDN uses "home" and "builder" namespaces for the two villages.
  if (options?.useTroopIcon && type === "troop") {
    const villagePath = village === "builderBase" ? "builder" : "home";
    return `${ENV.CDN_BASE}/v2/${villagePath}/troops/${entityId}/icon.png`;
  }

  // Super Troops are nested variants, not independent numeric entities.
  if (options?.isSuperTroop) {
    return entity.superTroop?.icon ?? entity.icon ?? FALLBACK_ICON;
  }

  /*
   * No level means use the metadata icon. Invalid non-positive levels use
   * the first level image rather than generating a /0.png or negative URL.
   */
  if (level == null) {
    return (
      entity.icon ??
      FALLBACK_ICON
    );
  }

  const safeLevel =
    Number.isFinite(level) && level > 0
      ? level
      : 1;

  /*
   * Town Hall
   */
  if (
    village === "home" &&
    subType === "TOWNHALL"
  ) {
    return `${ENV.CDN_BASE}/v2/home/townhalls/${safeLevel}.png`;
  }

  /*
   * Builder Hall
   */
  if (
    village === "builderBase" &&
    subType === "BUILDERHALL"
  ) {
    return `${ENV.CDN_BASE}/v2/builder/builderhalls/${safeLevel}.png`;
  }

  /*
   * Heroes have a single icon per entity, independent of level.
   */
  if (
    village === "home" &&
    type === "hero"
  ) {
    return `${ENV.CDN_BASE}/v2/home/heroes/${entityId}/icon.png`;
  }

  if (
    village === "builderBase" &&
    type === "hero"
  ) {
    return `${ENV.CDN_BASE}/v2/builder/heroes/${entityId}/icon.png`;
  }

  /*
   * Home pets, guardians and spells have a single level-independent icon.
   */
  if (
    village === "home" &&
    (type === "pet" || type === "guardian" || type === "spell")
  ) {
    const category = HOME_ICON_CATEGORIES[type];

    if (category) {
      return `${ENV.CDN_BASE}/v2/home/${category}/${entityId}/1.png`;
    }
  }

  /*
   * Home entities use progression image ranges when available. If the level
   * is outside the configured ranges, use the first valid configured image.
   */
  if (village === "home") {
    const category = HOME_ICON_CATEGORIES[type];

    if (category) {
      const iconLevel = resolveLevelBasedIconLevel(entityId, safeLevel);
      return `${ENV.CDN_BASE}/v2/home/${category}/${entityId}/${iconLevel}.png`;
    }
  }

  /*
   * Builder Base entities use the same range resolution as Home entities.
   */
  if (village === "builderBase") {
    const category = BUILDER_ICON_CATEGORIES[type];

    if (category) {
      const iconLevel = resolveLevelBasedIconLevel(entityId, safeLevel);
      return `${ENV.CDN_BASE}/v2/builder/${category}/${entityId}/${iconLevel}.png`;
    }
  }

  /*
   * Unknown category: fall back to metadata icon.
   */
  return (
    entity.icon ??
    FALLBACK_ICON
  );
}

export function resolveBuilderBaseLeagueIcon(
  leagueId?: number,
) {
  if (
    !leagueId ||
    !ENV.CDN_BASE
  ) {
    return undefined;
  }

  return `${ENV.CDN_BASE}/v2/builder/leagues/${leagueId}.png`;
}