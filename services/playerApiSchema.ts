import type {
  PlayerAchievement,
  PlayerEntityLevel,
  PlayerFull,
  PlayerLabel,
  PlayerLeague,
} from "@/types/playerFull";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isOptionalNonNegativeInteger(value: unknown): boolean {
  return value === undefined || isNonNegativeInteger(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isIconUrls(value: unknown, required: readonly string[]): boolean {
  if (!isRecord(value)) return false;

  return required.every((key) => isNonEmptyString(value[key])) &&
    Object.entries(value).every(
      ([key, url]) =>
        !["small", "medium", "large", "tiny"].includes(key) ||
        url === undefined ||
        typeof url === "string",
    );
}

function isPlayerLeague(value: unknown): value is PlayerLeague {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isOptionalNonNegativeInteger(value.id) &&
    isIconUrls(value.iconUrls, [])
  );
}

function isPlayerLabel(value: unknown): value is PlayerLabel {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.id) &&
    isNonEmptyString(value.name) &&
    isIconUrls(value.iconUrls, ["small", "medium", "large"])
  );
}

function isPlayerEntityLevel(value: unknown): value is PlayerEntityLevel {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonNegativeInteger(value.level) &&
    isNonNegativeInteger(value.maxLevel) &&
    (value.village === "home" || value.village === "builderBase") &&
    isOptionalNonNegativeInteger(value.id)
  );
}

function isPlayerAchievement(value: unknown): value is PlayerAchievement {
  return (
    isRecord(value) &&
    isNonEmptyString(value.name) &&
    isNonNegativeInteger(value.stars) &&
    isNonNegativeInteger(value.value) &&
    isNonNegativeInteger(value.target) &&
    isOptionalNonNegativeInteger(value.id) &&
    isOptionalString(value.info) &&
    isOptionalString(value.completionInfo) &&
    (value.village === undefined ||
      value.village === "home" ||
      value.village === "builderBase")
  );
}

function isPlayerClan(value: unknown): boolean {
  return (
    isRecord(value) &&
    isNonEmptyString(value.tag) &&
    isNonEmptyString(value.name) &&
    isNonNegativeInteger(value.clanLevel) &&
    isIconUrls(value.badgeUrls, ["small", "medium", "large"])
  );
}

function isHelpers(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        isNonNegativeInteger(item.id) &&
        isNonNegativeInteger(item.level) &&
        isOptionalNonNegativeInteger(item.cooldown),
    )
  );
}

function isGuardians(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        isNonNegativeInteger(item.id) &&
        isNonNegativeInteger(item.level),
    )
  );
}

function isOptionalArray<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
): boolean {
  return value === undefined || (Array.isArray(value) && value.every(guard));
}

function invalidResponse(): Error {
  return new Error("INVALID_API_RESPONSE");
}

/**
 * Validates the backend envelope and player payload at the network boundary.
 * The API response is untrusted runtime data even when TypeScript expects PlayerFull.
 */
export function parsePlayerResponse(value: unknown): PlayerFull {
  if (!isRecord(value) || !isRecord(value.data)) {
    throw invalidResponse();
  }

  const player = value.data;
  const requiredStringFields = ["tag", "name"] as const;
  const requiredNumberFields = [
    "expLevel",
    "townHallLevel",
    "trophies",
    "bestTrophies",
    "attackWins",
    "defenseWins",
    "warStars",
    "donations",
    "donationsReceived",
  ] as const;

  if (
    !requiredStringFields.every((key) => isNonEmptyString(player[key])) ||
    !requiredNumberFields.every((key) => isNonNegativeInteger(player[key]))
  ) {
    throw invalidResponse();
  }

  if (
    !isOptionalString(player.role) ||
    !isOptionalString(player.warPreference) ||
    !isOptionalNonNegativeInteger(player.builderHallLevel) ||
    !isOptionalNonNegativeInteger(player.builderBaseTrophies) ||
    !isOptionalNonNegativeInteger(player.bestBuilderBaseTrophies) ||
    (player.league !== undefined && !isPlayerLeague(player.league)) ||
    (player.leagueTier !== undefined && !isPlayerLeague(player.leagueTier)) ||
    (player.clan !== undefined && !isPlayerClan(player.clan)) ||
    !isOptionalArray(player.labels, isPlayerLabel) ||
    !isOptionalArray(player.troops, isPlayerEntityLevel) ||
    !isOptionalArray(player.heroes, isPlayerEntityLevel) ||
    !isOptionalArray(player.spells, isPlayerEntityLevel) ||
    !isOptionalArray(player.achievements, isPlayerAchievement) ||
    (player.helpers !== undefined && !isHelpers(player.helpers)) ||
    (player.guardians !== undefined && !isGuardians(player.guardians)) ||
    (player.builderBaseLeague !== undefined &&
      (!isRecord(player.builderBaseLeague) ||
        !isOptionalNonNegativeInteger(player.builderBaseLeague.id) ||
        !isOptionalString(player.builderBaseLeague.name)))
  ) {
    throw invalidResponse();
  }

  return player as unknown as PlayerFull;
}
