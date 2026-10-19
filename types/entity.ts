export type Village = "home" | "builderBase" | "global";

/**
 * External entity metadata historically labels Builder Base as "builder".
 * Runtime player API data uses "builderBase", which is the canonical app value.
 */
export function normalizeVillage(value: string): Village | null {
  if (value === "builder") {
    return "builderBase";
  }

  if (value === "home" || value === "builderBase" || value === "global") {
    return value;
  }

  return null;
}
export type Resource = "gold" | "elixir" | "dark" ;

/**
 * Dont't use EntityType in progression, Use subType 
 */
export type EntityType =
    | "building"
    | "trap"
    | "hero"
    | "troop"
    | "spell"
    | "pet"
    | "siege"
    | "helper"
    | "guardian"
    | "townhall"
    | "builderhall"
    | "lab"
    | "crafted"
    | "custom"
    | "unknown";
export type SubType= "TOWNHALL" | "DEFENSE" | "RESOURCE" | "HERO_ALT" | "SUPER_TROOP" | "OTHER";
