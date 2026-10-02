import { ENV } from "@/config/env";
import { useEntityStore } from "@/stores/entityStore";
import type { EntityType, Village } from "@/types/entity";

export const FALLBACK_ICON =
  "https://cdn.clashwidget.online/entities/fallbacks/fallback.png";

interface ResolveEntityIconOptions {
  village?: Village;
  type?: EntityType;
  subType?: string;
  level?: number;
  isCrafted?: boolean;
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

export function resolveEntityIcon(
  entityId: number,
  options?: ResolveEntityIconOptions,
) {
  /*
   * Crafted defenses have their own
   * icon namespace.
   */
  if (
    options?.isCrafted &&
    options.level != null
  ) {
    return `${ENV.CDN_BASE}/v2/crafted/${entityId}/${options.level}.png`;
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

  const level =
    options?.level;

  /*
   * No level means use the
   * metadata icon.
   */
  if (level == null) {
    return (
      entity.icon ??
      FALLBACK_ICON
    );
  }

  /*
   * Town Hall
   *
   * Metadata:
   * type    = building
   * subType = TOWNHALL
   *
   * CDN:
   * /v2/home/townhalls/{level}.png
   */
  if (
    village === "home" &&
    subType === "TOWNHALL"
  ) {
    return `${ENV.CDN_BASE}/v2/home/townhalls/${level}.png`;
  }

  /*
   * Builder Hall
   *
   * Metadata:
   * type    = building
   * subType = BUILDERHALL
   * village = builder
   *
   * App uses "builderBase" for the village.
   *
   * CDN:
   * /v2/builder/builderhall/{level}.png
   */
  if (
    village === "builderBase" &&
    subType === "BUILDERHALL"
  ) {
    return `${ENV.CDN_BASE}/v2/builder/builderhalls/${level}.png`;
  }

    /**
   * Home Heroes
   *
   * Heroes have a single icon per entity.
   * They do not have level-specific images.
   *
   * CDN:
   * /v2/home/heroes/{entityId}/icon.png
   */
  if (
    village === "home" &&
    type === "hero"
  ) {
    return `${ENV.CDN_BASE}/v2/home/heroes/${entityId}/icon.png`;
  }

    /**
   * Builder Heroes
   * CDN:
   * /v2/builder/heroes/{entityId}/icon.png
   */
  if (
    village === "builderBase" &&
    type === "hero"
  ) {
    return `${ENV.CDN_BASE}/v2/builder/heroes/${entityId}/icon.png`;
  }
  /*
   * Normal Home entities.
   */
  if (village === "home") {
    const category =
      HOME_ICON_CATEGORIES[type];

    if (category) {
      return `${ENV.CDN_BASE}/v2/home/${category}/${entityId}/${level}.png`;
    }
  }

  /*
   * Normal Builder Base entities.
   */
  if (
    village === "builderBase"
  ) {
    const category =
      BUILDER_ICON_CATEGORIES[type];

    if (category) {
      return `${ENV.CDN_BASE}/v2/builder/${category}/${entityId}/${level}.png`;
    }
  }

  /*
   * Unknown category:
   * fall back to metadata icon.
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