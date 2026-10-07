import { WidgetCacheData } from "@/types/widgetTypes";
import { getWidgetCache, setWidgetCache } from "./widgetCache";
import { isWidgetCacheStale } from "./widgetFreshness";

export async function ensureWidgetCache<
  T extends Omit<WidgetCacheData, "cachedAt">
>(
  tag: string,
  type: "builder" | "lab" | "pet",
  fetcher: () => Promise<T>,
): Promise<WidgetCacheData> {
  const existing = getWidgetCache(tag, type);

  if (
    existing &&
    !isWidgetCacheStale(existing, type)
  ) {
    return existing;
  }

  const fresh = await fetcher();

  const finalData: WidgetCacheData = {
    ...fresh,
    cachedAt: Date.now(),
  };

  setWidgetCache(tag, type, finalData);

  return finalData;
}