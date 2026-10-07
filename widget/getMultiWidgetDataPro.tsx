import { getAccounts } from "@/services/accountService";
import { MultiWidgetItem } from "@/types/widgetTypes";
import { resolveWidgetEntityIcon } from "@/utils/icons/resolveWidgetEntityIcon";
import { getAllWidgetCaches } from "@/utils/widget/widgetCache";

export async function getMultiWidgetDataPro(): Promise<MultiWidgetItem[]> {
  // const { accounts } = useAccountStore.getState();
  const accounts = await getAccounts();

  const tags = accounts.map((a) => a.tag);

  const cachedList = getAllWidgetCaches(tags, "builder") as MultiWidgetItem[];

  const valid = cachedList.filter((x) => x.data);

  const sorted = [...valid].sort((a, b) => {
    const aFree = a.data.subtitle === "All builders free";
    const bFree = b.data.subtitle === "All builders free";

    if (aFree && !bFree) return -1;
    if (!aFree && bFree) return 1;

    return (a.data.remainingMs ?? Infinity) - (b.data.remainingMs ?? Infinity);
  });
  const primary = sorted[0];
  if (!primary) {
    return [];
  }
  const rest = sorted.slice(1);
  const totalRest = rest.length;
  if (totalRest === 0) {
    return await Promise.all(
      [primary].map(async (item) => {
        const icon = item.data.dataId
          ? ((await resolveWidgetEntityIcon(item.data.dataId, {
              isCrafted: item.data.isCrafted,
            })) ?? undefined)
          : undefined;

        return {
          ...item,
          data: {
            ...item.data,
            icon,
          },
        };
      }),
    );
  }
  const interval = 5000;
  const slot = Math.floor(Date.now() / interval);

  const index = slot % totalRest;

  if (totalRest === 1) {
    return await Promise.all(
      [primary].map(async (item) => {
        const icon = item.data.dataId
          ? ((await resolveWidgetEntityIcon(item.data.dataId, {
              isCrafted: item.data.isCrafted,
            })) ?? undefined)
          : undefined;

        return {
          ...item,
          data: {
            ...item.data,
            icon,
          },
        };
      }),
    );
  }

  const second = rest[index];
  const third = rest[(index + 1) % totalRest];

  const finalItems = [primary, second, third];

  return await Promise.all(
    finalItems.map(async (item) => {
      const icon = item.data.dataId
        ? ((await resolveWidgetEntityIcon(item.data.dataId, {
            isCrafted: item.data.isCrafted,
          })) ?? undefined)
        : undefined;

      return {
        ...item,
        data: {
          ...item.data,
          icon,
        },
      };
    }),
  );
}
