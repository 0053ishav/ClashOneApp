import { useAccountStore } from "@/stores/accountStore";
import {
  setUpcomingWidgetCache,
  setWidgetCache,
} from "@/utils/widget/widgetCache";
import { getBuilderWidgetData } from "@/widget/getBuilderWidgetData";
import { getLabWidgetData } from "@/widget/getLabWidgetData";
import { getPetWidgetData } from "@/widget/getPetWidgetData";
import { getUpcomingUpgradesWidgetData } from "@/widget/getUpcomingUpgradesWidgetData";
import { resolveWidgetEntityIcon } from "../icons/resolveWidgetEntityIcon";

export async function prefillAllWidgetCache() {
  const { accounts } = useAccountStore.getState();

  for (const acc of accounts) {
    try {
      const data = await getBuilderWidgetData(acc.tag);

      setWidgetCache(acc.tag, "builder", {
        ...data,
        cachedAt: Date.now(),
      });
    } catch {
      console.log("Builder Prefill cache failed: ", acc.tag);
    }

    try {
      const labData = await getLabWidgetData(acc.tag);

      setWidgetCache(acc.tag, "lab", {
        ...labData,
        cachedAt: Date.now(),
      });
    } catch {
      console.log("Lab Prefill cache failed: ", acc.tag);
    }

    try {
      const petData = await getPetWidgetData(acc.tag);

      setWidgetCache(acc.tag, "pet", {
        ...petData,
        cachedAt: Date.now(),
      });
    } catch {
      console.log("Pet Prefill cache failed: ", acc.tag);
    }
  }

  try {
    const rows = await getUpcomingUpgradesWidgetData();

    const rowsWithIcons = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        icon: row.dataId
          ? ((await resolveWidgetEntityIcon(row.dataId, {
              isCrafted: row.isCrafted,
            })) ?? undefined)
          : undefined,
      })),
    );
    setUpcomingWidgetCache({
      rows: rowsWithIcons,
      cachedAt: Date.now(),
    });
  } catch {
    console.log("Upcoming cache prefill failed");
  }
}
