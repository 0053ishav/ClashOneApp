import { getUpcomingUpgradesWidgetData } from "@/widget/getUpcomingUpgradesWidgetData";
import { UpcomingUpgradesWidget } from "@/widget/UpcomingUpgradesWidget";
import { resolveWidgetEntityIcon } from "../icons/resolveWidgetEntityIcon";
import { setUpcomingWidgetCache } from "./widgetCache";

export async function renderUpcomingUpgradesWidget() {
  try {
    const rows = await getUpcomingUpgradesWidgetData();

    const rowsWithIcons = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        icon: row.dataId
          ? ((await resolveWidgetEntityIcon(row.dataId, {
              village: "home",
              level: row.currentLevel,
              isCrafted: row.isCrafted,
            })) ?? undefined)
          : undefined,
      })),
    );
    setUpcomingWidgetCache({
      rows: rowsWithIcons,
      cachedAt: Date.now(),
    });

    return <UpcomingUpgradesWidget rows={rowsWithIcons} />;
  } catch (e) {
    console.log("renderUpcomingUpgradesWidget error", e);

    return <UpcomingUpgradesWidget rows={[]} />;
  }
}
