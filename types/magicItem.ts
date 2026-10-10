import type { EntityType, Village } from "./entity";

/**
 * Magic Items domain model.
 *
 * Magic Items are split into:
 * - ongoing effects (potions / boosts)
 * - instant actions (Books / Hammers)
 * - upgrade-start modifiers (e.g. Hammer Jam)
 *
 * Upgrade-start modifiers are intentionally separate from active effects:
 * once a modifier is applied when an upgrade starts, its result belongs
 * to that upgrade and does not change when the event later expires.
 */

export type MagicItemType = "potion" | "book" | "hammer" | "snack";

export type MagicItemEffectType =
  | "ONGOING_SPEED"
  | "CLOCK_TOWER_BOOST"
  | "INSTANT_COMPLETE"
  | "INSTANT_UPGRADE";

export type MagicItemTarget =
  | EntityType
  | "builders"
  | "research"
  | "heroes-and-pets"
  | "any";

export type MagicItemEffect = {
  type: MagicItemEffectType;

  /**
   * Speed multiplier for ongoing effects.
   * Examples:
   * Builder Potion = 10
   * Research Potion = 24
   * Pet Potion = 24
   */
  multiplier?: number;

  /** Effect duration in minutes for timed effects. */
  durationMinutes?: number;

  /** Work/entity categories affected by the effect. */
  appliesTo?: MagicItemTarget[];
};

export type MagicItem = {
  id: string;
  name: string;
  description: string;
  itemType: MagicItemType;
  effect: MagicItemEffect;

  /** Villages where the item can be used. */
  villages: Village[];

  maxCapacity?: number;
  sellingPrice?: number;
  image?: string;
};

/** Account-scoped inventory entry. */
export type MagicItemInventory = {
  itemId: string;
  quantity: number;
};

/**
 * A consumed Magic Item whose effect is currently active.
 */
export type ActiveMagicEffect = {
  id: string;
  itemId: string;
  startedAt: number;
  expiresAt?: number;
  village?: Village;
};

/**
 * Modifier evaluated when an upgrade starts.
 *
 * Hammer Jam belongs here, not in ActiveMagicEffect.
 */
export type UpgradeStartModifier = {
  id: string;
  startsAt: number;
  endsAt: number;

  timeMultiplier?: number;
  costMultiplier?: number;

  appliesTo: MagicItemTarget[];
  villages?: Village[];
};

export type ResolvedUpgradeStartModifiers = {
  timeMultiplier: number;
  costMultiplier: number;
  appliedModifierIds: string[];
};
