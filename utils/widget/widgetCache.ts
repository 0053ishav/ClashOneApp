import { STORAGE_KEYS } from "@/storage/keys";
import { storage } from "@/storage/mmkv";
import { WidgetCacheData } from "@/types/widgetTypes";

const getKey = (tag: string, type: string) => `${STORAGE_KEYS.WIDGET_CACHE}_${tag}_${type}`;
const UPCOMING_WIDGET_KEY =
  `${STORAGE_KEYS.WIDGET_CACHE}_upcoming`;

function cleanUndefined(obj: any) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}

export function setWidgetCache(
  tag: string,
  type: "builder" | "lab" | "pet",
  data: WidgetCacheData) {
  try {
    const cleaned = cleanUndefined(data);
    storage.set(getKey(tag, type), JSON.stringify(cleaned));
  } catch (e) {
    console.log("Cache save failed:", e);
  }
}

export function getWidgetCache(
  tag: string,
  type: "builder" | "lab" | "pet",
): WidgetCacheData | null {
  try {
    const raw = storage.getString(getKey(tag, type));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.log("Cache read failed:", e);
    return null;
  }
}

export function getAllWidgetCaches(
  tags: string[], 
  type: "builder" | "lab" | "pet",
) {
  return tags
    .map((tag) => ({
      tag,
      data: getWidgetCache(tag, type),
    }))
    .filter((x) => x.data !== null);
}

export function setUpcomingWidgetCache(data: any) {
  try {
    const cleaned = cleanUndefined(data);

    storage.set(
      UPCOMING_WIDGET_KEY,
      JSON.stringify(cleaned),
    );
  } catch (e) {
    console.log(
      "Upcoming cache save failed:",
      e,
    );
  }
}

export function getUpcomingWidgetCache() {
  try {
    const raw = storage.getString(
      UPCOMING_WIDGET_KEY,
    );

    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.log(
      "Upcoming cache read failed:",
      e,
    );

    return null;
  }
}