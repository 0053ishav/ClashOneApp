import { ENV } from "@/config/env";
import type { MagicItem } from "@/types/magicItem";

const MAGIC_ITEM_CDN_PATH = `${ENV.CDN_BASE}/v2/home/magic-item`;

/**
 * Normalized Magic Item metadata for the app.
 *
 * Source: Clash One supplied Magic Item JSON data.
 * The registry converts the source effect names (for example
 * "time-reduction") into the app's internal domain types.
 */
export const MAGIC_ITEMS: readonly MagicItem[] = [
  {
    id: "builder-potion",
    name: "Builder Potion",
    description:
      "Brewed by the Builder in case of emergency all-nighters, this invigorating potion allows your builders to work 10x faster for 1h. Works in Home Village!",
    itemType: "potion",
    effect: {
      type: "ONGOING_SPEED",
      multiplier: 10,
      durationMinutes: 60,
      appliesTo: ["builders"],
    },
    villages: ["home"],
    maxCapacity: 5,
    sellingPrice: 10,
    image: `${MAGIC_ITEM_CDN_PATH}/potions/builder-potion.png`,
  },
  {
    id: "research-potion",
    name: "Research Potion",
    description:
      "This healthy-looking beverage helps the mysterious Wizards inside the Laboratory research 24x faster for 1h. Works in Home Village!",
    itemType: "potion",
    effect: {
      type: "ONGOING_SPEED",
      multiplier: 24,
      durationMinutes: 60,
      appliesTo: ["research"],
    },
    villages: ["home"],
    maxCapacity: 5,
    sellingPrice: 10,
    image: `${MAGIC_ITEM_CDN_PATH}/potions/research-potion.png`,
  },
  {
    id: "pet-potion",
    name: "Pet Potion",
    description:
      "Containing everything a Pet needs for a healthy, glossy coat. This helps Pets upgrade 24x faster for 1h.",
    itemType: "potion",
    effect: {
      type: "ONGOING_SPEED",
      multiplier: 24,
      durationMinutes: 60,
      appliesTo: ["pet"],
    },
    villages: ["home"],
    maxCapacity: 5,
    sellingPrice: 10,
    image: `${MAGIC_ITEM_CDN_PATH}/potions/pet-potion.png`,
  },
  {
    id: "clock-tower-potion",
    name: "Clock Tower Potion",
    description:
      "This thick elixir made from ground-up magic cogs activates your Clock Tower boost for 30m. Works in Builder Base.",
    itemType: "potion",
    effect: {
      type: "CLOCK_TOWER_BOOST",
      durationMinutes: 30,
    },
    villages: ["builderBase"],
    maxCapacity: 5,
    sellingPrice: 10,
    image: `${MAGIC_ITEM_CDN_PATH}/potions/clock-tower-potion.png`,
  },
  {
    id: "study-soup",
    name: "Study Soup",
    description:
      "This bubbling broth makes your Laboratory research 4x as fast for 1h. Works in the Home Village!",
    itemType: "snack",
    effect: {
      type: "ONGOING_SPEED",
      multiplier: 4,
      durationMinutes: 60,
      appliesTo: ["research"],
    },
    villages: ["home"],
    image: `${MAGIC_ITEM_CDN_PATH}/snacks/study-soup.png`,
  },
  {
    id: "builder-bite",
    name: "Builder Bite",
    description:
      "A hearty bite that makes your Builders work 2x as fast for 1h. Works in the Home Village! Sadly the Builder's Apprentice is a vegetarian and won't be boosted!",
    itemType: "snack",
    effect: {
      type: "ONGOING_SPEED",
      multiplier: 2,
      durationMinutes: 60,
      appliesTo: ["builders"],
    },
    villages: ["home"],
    image: `${MAGIC_ITEM_CDN_PATH}/snacks/builder-bite.png`,
  },
  {
    id: "book-of-building",
    name: "Book of Building",
    description:
      "Instantly completes a Building upgrade.",
    itemType: "book",
    effect: {
      type: "INSTANT_COMPLETE",
      appliesTo: ["building"],
    },
    villages: ["home", "builderBase"],
    maxCapacity: 1,
    sellingPrice: 50,
    image: `${MAGIC_ITEM_CDN_PATH}/books/book-of-building.png`,
  },
  {
    id: "book-of-fighting",
    name: "Book of Fighting",
    description:
      "Instantly completes a Troop upgrade.",
    itemType: "book",
    effect: {
      type: "INSTANT_COMPLETE",
      appliesTo: ["troop"],
    },
    villages: ["home", "builderBase"],
    maxCapacity: 1,
    sellingPrice: 50,
    image: `${MAGIC_ITEM_CDN_PATH}/books/book-of-fighting.png`,
  },
  {
    id: "book-of-spells",
    name: "Book of Spells",
    description:
      "Instantly completes a Spell upgrade.",
    itemType: "book",
    effect: {
      type: "INSTANT_COMPLETE",
      appliesTo: ["spell"],
    },
    villages: ["home"],
    maxCapacity: 1,
    sellingPrice: 50,
    image: `${MAGIC_ITEM_CDN_PATH}/books/book-of-spells.png`,
  },
  {
    id: "book-of-heroes",
    name: "Book of Heroes",
    description:
      "Instantly completes a Hero or Pet upgrade.",
    itemType: "book",
    effect: {
      type: "INSTANT_COMPLETE",
      appliesTo: ["heroes-and-pets"],
    },
    villages: ["home", "builderBase"],
    maxCapacity: 1,
    sellingPrice: 500,
    image: `${MAGIC_ITEM_CDN_PATH}/books/book-of-heroes.png`,
  },
  {
    id: "book-of-everything",
    name: "Book of Everything",
    description:
      "Instantly completes an eligible upgrade.",
    itemType: "book",
    effect: {
      type: "INSTANT_COMPLETE",
      appliesTo: ["any"],
    },
    villages: ["home", "builderBase"],
    maxCapacity: 1,
    sellingPrice: 100,
    image: `${MAGIC_ITEM_CDN_PATH}/books/book-of-everything.png`,
  },
  {
    id: "hammer-of-building",
    name: "Hammer of Building",
    description:
      "A swing of this magic hammer will instantly upgrade any building to the next level. Works in both villages!",
    itemType: "hammer",
    effect: {
      type: "INSTANT_UPGRADE",
      appliesTo: ["building"],
    },
    villages: ["home", "builderBase"],
    maxCapacity: 1,
    sellingPrice: 100,
    image: `${MAGIC_ITEM_CDN_PATH}/hammers/hammer-of-building.png`,
  },
  {
    id: "hammer-of-fighting",
    name: "Hammer of Fighting",
    description:
      "Instantly upgrades a Troop to the next level.",
    itemType: "hammer",
    effect: {
      type: "INSTANT_UPGRADE",
      appliesTo: ["troop"],
    },
    villages: ["home", "builderBase"],
    maxCapacity: 1,
    sellingPrice: 100,
    image: `${MAGIC_ITEM_CDN_PATH}/hammers/hammer-of-fighting.png`,
  },
  {
    id: "hammer-of-heroes",
    name: "Hammer of Heroes",
    description:
      "Instantly upgrades a Hero or Pet to the next level.",
    itemType: "hammer",
    effect: {
      type: "INSTANT_UPGRADE",
      appliesTo: ["heroes-and-pets"],
    },
    villages: ["home", "builderBase"],
    maxCapacity: 1,
    sellingPrice: 100,
    image: `${MAGIC_ITEM_CDN_PATH}/hammers/hammer-of-heroes.png`,
  },
  {
    id: "hammer-of-spells",
    name: "Hammer of Spells",
    description:
      "Instantly upgrades a Spell to the next level.",
    itemType: "hammer",
    effect: {
      type: "INSTANT_UPGRADE",
      appliesTo: ["spell"],
    },
    villages: ["home"],
    maxCapacity: 1,
    sellingPrice: 100,
    image: `${MAGIC_ITEM_CDN_PATH}/hammers/hammer-of-spells.png`,
  },
] as const;

export const MAGIC_ITEM_BY_ID: ReadonlyMap<string, MagicItem> = new Map(
  MAGIC_ITEMS.map((item) => [item.id, item]),
);

export function getMagicItem(itemId: string): MagicItem | undefined {
  return MAGIC_ITEM_BY_ID.get(itemId);
}
