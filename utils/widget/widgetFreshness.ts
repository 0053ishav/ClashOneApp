import { WidgetCacheData } from "@/types/widgetTypes";

const STALE_MS = {
  builder: 1000 * 60 * 5,
  lab: 1000 * 60 * 15,
  pet: 1000 * 60 * 10,
  multi: 1000 * 60 * 5,
  upcoming: 1000 * 60 * 5,
};

export function isWidgetCacheStale(
  cache: WidgetCacheData | null,
  type: keyof typeof STALE_MS,
) {
  if (!cache) {
    return true;
  }

  if (!cache.cachedAt) {
    return true;
  }

  return (
    Date.now() - cache.cachedAt >
    STALE_MS[type]
  );
}