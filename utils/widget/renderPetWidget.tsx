import { getAccounts } from "@/services/accountService";
import { getActiveAccount } from "@/storage/activeAccount";
import { getWidgetPrefs } from "@/storage/widgetPrefs";
import { resolveWidgetEntityIcon } from "@/utils/icons/resolveWidgetEntityIcon";
import { setWidgetCache } from "@/utils/widget/widgetCache";
import { PetStatusWidget } from "@/widget/PetStatusWidget";
import { getPetWidgetData } from "@/widget/getPetWidgetData";

export async function renderPetWidget() {
  try {
    // const { activeTag, widgetPrefs, accounts } = useAccountStore.getState();

    const accounts = await getAccounts();

    const activeTag = getActiveAccount();

    const widgetPrefs = getWidgetPrefs();
    const selectedTag = widgetPrefs.selectedAccountTag;
    const fallbackTag = accounts[0]?.tag;

    if (!accounts || accounts.length === 0) {
      return (
        <PetStatusWidget
          title="Pet"
          subtitle="Loading..."
          progress={0}
          showProgress={false}
        />
      );
    }

    const tag = accounts.some((a) => a.tag === selectedTag)
      ? selectedTag
      : accounts.some((a) => a.tag === activeTag)
        ? activeTag
        : fallbackTag;

    if (!tag) {
      return (
        <PetStatusWidget
          title="Pet"
          subtitle="No account"
          progress={0}
          showProgress={false}
        />
      );
    }

    const account = accounts.find((a) => a.tag === tag);

    if (!account) {
      throw new Error("Invalid account");
    }

    const data = await getPetWidgetData(tag);
    const icon = data.dataId
      ? ((await resolveWidgetEntityIcon(data.dataId)) ?? undefined)
      : undefined;

    setWidgetCache(tag, "pet", {
      ...data,
      cachedAt: Date.now(),
    });

    return (
      <PetStatusWidget
        title={data.title ?? "Pet"}
        subtitle={data.subtitle ?? "Idle"}
        icon={icon}
        progress={data.progress ?? 0}
        showProgress={data.showProgress ?? false}
        levelText={data.levelText}
        suggestion={data.suggestion}
        color={data.color}
        accountInitials={data.accountInitials}
        updatedAt={data.updatedAt}
      />
    );
  } catch (error) {
    console.log("renderPetWidget error:", error);

    return (
      <PetStatusWidget
        title="Pets"
        subtitle="Open app to sync"
        progress={0}
        showProgress={false}
      />
    );
  }
}
