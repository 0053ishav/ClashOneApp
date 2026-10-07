import { storage } from "@/storage/mmkv";
import { STORAGE_KEYS } from "./keys";


export function getNotificationsEnabled(): boolean {
  const value = storage.getBoolean(STORAGE_KEYS.NOTIFICATION_KEY);
  return value ?? true;
}

export function setNotificationsEnabled(enabled: boolean) {
  storage.set(STORAGE_KEYS.NOTIFICATION_KEY, enabled);
}


export const GROUP_WINDOW_MS = 2 * 60 * 1000; // 2 min grouping

export const MAX_GROUP_BODY_LINES = 5;

export const ENABLE_GROUPING = false;

// future-ready (don’t use yet, but keep)
export const PRE_ALERT_MINUTES = 10;
export const IDLE_ALERT_HOURS = 2;  