import { getAccounts } from "@/services/accountService";
import { syncPremium } from "@/services/revenueCat/syncPremium";
import { getMultiWidgetDataFree } from "@/widget/getMultiWidgetDataFree";
import { getMultiWidgetDataPro } from "@/widget/getMultiWidgetDataPro";
import { MultiAccountWidget } from "@/widget/MultiAccountWidget";
import { getWidgetCache, setWidgetCache } from "./widgetCache";

export async function renderMultiWidget() {
  try {
    const accounts = await getAccounts();

    const isPremium = await syncPremium(); // ensures we have the latest premium status before rendering the widget

    if (!accounts || accounts.length === 0) {
      return (
        <MultiAccountWidget
          accounts={[]}
          totalAccounts={0}
          error={false}
          isPremium={isPremium}
        />
      );
    }

    await Promise.all(
      accounts.map(async (acc) => {
        const cache = getWidgetCache(acc.tag, "builder");

        if (!cache) {
          const { getBuilderWidgetData } =
            await import("@/widget/getBuilderWidgetData");

          const data = await getBuilderWidgetData(acc.tag);

          setWidgetCache(acc.tag, "builder", {
            ...data,
            cachedAt: Date.now(),
          });
        }
        const fresh = getWidgetCache(acc.tag, "builder");

        // console.log("CACHE VERIFY", fresh);
      }),
    );
    const data = isPremium
      ? await getMultiWidgetDataPro()
      : await getMultiWidgetDataFree();

    if (!data || data.length === 0) {
      return (
        <MultiAccountWidget
          accounts={[]}
          totalAccounts={accounts.length}
          isPremium={isPremium}
        />
      );
    }

    return (
      <MultiAccountWidget
        accounts={data}
        totalAccounts={accounts.length}
        isPremium={isPremium}
      />
    );
  } catch (e) {
    console.log("renderMultiWidget error:", e);

    return (
      <MultiAccountWidget
        accounts={[]}
        totalAccounts={0}
        error={true}
        isPremium={false}
      />
    );
  }
}
