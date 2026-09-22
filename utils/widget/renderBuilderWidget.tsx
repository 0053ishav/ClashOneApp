import { getAccounts } from "@/services/accountService";
import { getActiveAccount } from "@/storage/activeAccount";
import { getWidgetPrefs } from "@/storage/widgetPrefs";
import { resolveWidgetEntityIcon } from "@/utils/icons/resolveWidgetEntityIcon";
import { getWidgetCache, setWidgetCache } from "@/utils/widget/widgetCache";
import { isWidgetCacheStale } from "@/utils/widget/widgetFreshness";
import { BuilderStatusWidget } from "@/widget/BuilderStatusWidget";
import { getBuilderWidgetData } from "@/widget/getBuilderWidgetData";
import { DEFAULT_BUILDER_WIDGET } from "./defaultWidgetData";

export async function renderBuilderWidget() {
  try {
    // const { activeTag, widgetPrefs, accounts } = useAccountStore.getState();

    const accounts = await getAccounts();

    const activeTag = getActiveAccount();

    const widgetPrefs = getWidgetPrefs();

    const selectedTag = widgetPrefs.selectedAccountTag;

    const fallbackTag = accounts[0]?.tag;

    if (!accounts || accounts.length === 0) {
      const cache = getWidgetCache(activeTag ?? "", "builder");

      if (cache) {
        return (
          <BuilderStatusWidget
            title={cache.title}
            subtitle={cache.subtitle}
            progress={cache.progress}
            showProgress={cache.showProgress}
            builderCountText={cache.builderCountText}
          />
        );
      }

      return <BuilderStatusWidget {...DEFAULT_BUILDER_WIDGET} />;
    }

    const tag = accounts.some((a) => a.tag === selectedTag)
      ? selectedTag
      : accounts.some((a) => a.tag === activeTag)
        ? activeTag
        : fallbackTag;

    if (!tag) {
      return <BuilderStatusWidget {...DEFAULT_BUILDER_WIDGET} />;
    }

    const accountExists = accounts.some((a) => a.tag === tag);

    if (!accountExists) {
      return <BuilderStatusWidget {...DEFAULT_BUILDER_WIDGET} />;
    }

    // -----------------------------------
    // CACHE FIRST
    // -----------------------------------

    const cache = getWidgetCache(tag, "builder");

    let data = cache;

    // -----------------------------------
    // REFRESH IF STALE
    // -----------------------------------

    if (!cache || isWidgetCacheStale(cache, "builder")) {
      const fresh = await getBuilderWidgetData(tag);

      const cachedData = {
        ...fresh,
        cachedAt: Date.now(),
      };

      setWidgetCache(tag, "builder", cachedData);

      data = cachedData;
    }

    if (!data) {
      throw new Error("No widget data");
    }

    const icon = data.dataId
      ? ((await resolveWidgetEntityIcon(data.dataId, {
          village: "home",
          level: data.currentLevel,
          isCrafted: data.isCrafted,
        })) ?? undefined)
      : undefined;

    return (
      <BuilderStatusWidget
        title={data.title ?? "Builders"}
        subtitle={data.subtitle ?? "All builders free"}
        icon={icon}
        progress={data.progress ?? 0}
        showProgress={data.showProgress ?? false}
        levelText={data.levelText}
        builderCountText={data.builderCountText}
        nextUpgradeText={data.nextUpgradeText}
        color={data.color}
        accountInitials={data.accountInitials}
        updatedAt={data.updatedAt}
      />
    );
  } catch (error) {
    console.log("renderBuilderWidget error:", error);

    return (
      <BuilderStatusWidget
        title="Builders"
        subtitle="Open app to sync"
        progress={0}
        showProgress={false}
        builderCountText="Tap to refresh"
      />
    );
  }
}
