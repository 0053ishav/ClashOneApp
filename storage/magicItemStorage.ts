/**
 * @deprecated Import from "@/services/magicItemService" instead.
 * This compatibility facade keeps existing storage-layer imports working
 * while all SQLite access remains centralized in the application service.
 */
import type { ActiveMagicEffect, MagicItemInventory } from "@/types/magicItem";
import {
  addActiveMagicEffect as addEffect,
  addMagicItem as addItem,
  consumeMagicItemQuantity,
  getActiveMagicEffects as getEffects,
  getMagicItemInventory as getInventory,
  getMagicItemQuantity as getQuantity,
  pruneExpiredMagicEffects as pruneEffects,
  removeActiveMagicEffect as removeEffect,
  replaceMagicItemInventory as replaceInventory,
  setMagicItemQuantity as setQuantity,
} from "@/services/magicItemService";

export const getMagicItemInventory = getInventory;
export const getMagicItemQuantity = getQuantity;
export const addActiveMagicEffect = addEffect;
export const removeActiveMagicEffect = removeEffect;
export const replaceMagicItemInventory = replaceInventory;

export async function setMagicItemQuantity(
  accountTag: string,
  itemId: string,
  quantity: number,
): Promise<void> {
  await setQuantity({ accountTag, itemId, quantity: Math.max(0, Math.floor(quantity)) });
}

export function addMagicItem(
  accountTag: string,
  itemId: string,
  quantity = 1,
): Promise<number> {
  return addItem(accountTag, itemId, Math.max(1, Math.floor(quantity)));
}

export async function consumeMagicItem(
  accountTag: string,
  itemId: string,
  quantity = 1,
): Promise<boolean> {
  return consumeMagicItemQuantity(accountTag, itemId, Math.max(1, Math.floor(quantity)));
}

export async function getActiveMagicEffects(
  accountTag: string,
  now = Date.now(),
): Promise<ActiveMagicEffect[]> {
  const effects = await getEffects(accountTag);
  return effects.filter((effect) => effect.expiresAt == null || effect.expiresAt > now);
}

export function pruneExpiredMagicEffects(
  accountTag?: string,
  now = Date.now(),
): Promise<void> {
  return pruneEffects(accountTag, now);
}
