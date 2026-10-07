import { getAccounts } from "@/services/accountService";
import { MultiWidgetItem } from "@/types/widgetTypes";
import { resolveWidgetEntityIcon } from "@/utils/icons/resolveWidgetEntityIcon";
import { getAllWidgetCaches } from "@/utils/widget/widgetCache";

export async function getMultiWidgetDataFree(): Promise<MultiWidgetItem[]> {
  // const { accounts } = useAccountStore.getState();
  const accounts = await getAccounts();

  const tags = accounts.map((a) => a.tag);

  const cachedList = getAllWidgetCaches(tags, "builder") as MultiWidgetItem[];

  const valid = cachedList.filter((x) => x.data);

  const sorted = [...valid].sort((a, b) => {
    const aTime = a.data.remainingMs ?? 1;
    const bTime = b.data.remainingMs ?? 1;

    return aTime - bTime;
  });

  // ✅ take top 3
  const visible = sorted.slice(0, 3);

  return await Promise.all(
    visible.map(async (item) => {
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
