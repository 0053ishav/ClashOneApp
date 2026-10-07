import { getAccounts } from "@/services/accountService";
import { getAccountState } from "@/services/accountStateService";
import { getActiveAccount } from "@/storage/activeAccount";
import { getLastJsonSync } from "@/storage/jsonSyncStorage";
import { getWidgetPrefs } from "@/storage/widgetPrefs";
import { calculateProgress } from "@/utils/calculateProgress";
import { formatBuildingName } from "@/utils/formatBuildingName";
import { formatCountdown } from "@/utils/formatCountdown";

export async function getLabWidgetData(inputTag?: string) {
    const accounts = await getAccounts();
  
    const activeTag = getActiveAccount();
  
    const widgetPrefs = getWidgetPrefs();

  const tag = inputTag ?? widgetPrefs.selectedAccountTag ?? activeTag;

  if (!tag) {
    return {
      title: "Lab",
      subtitle: "No account selected",
      progress: 0,
      showProgress: false,
    };
  }

  const account = accounts.find((a) => a.tag === tag);
    const updatedAt = tag ? getLastJsonSync(tag) : undefined;
  

  if (!account) {
    return {
      title: "Lab",
      subtitle: "Open app to sync",
      progress: 0,
      showProgress: false,
    };
  }

  // ✅ SINGLE SOURCE OF TRUTH
  const state = await getAccountState(tag);

  const normal = state.lab.home.normal;
  const goblin = state.lab.home.goblin;

  // 🟢 IDLE
  if (!normal && !goblin) {
    return {
      title: "Lab",
      subtitle: "Idle",
      progress: 0,
      showProgress: false,
      color: account.color,
      accountInitials: account.name.slice(0, 2).toUpperCase(),
      updatedAt,
    };
  }

  // 🎯 PRIORITY: normal > goblin
  const current = normal ?? goblin!;
  const isGoblinOnly = !normal && !!goblin;

  const remainingMs = Math.max(current.endTime - Date.now(), 0);
  const totalMs = current.endTime - current.startTime;

  const progress =
    totalMs > 0
      ? calculateProgress(current.startTime, current.endTime)
      : 0;

  return {
    title: formatBuildingName(current.entity),
    subtitle: `${isGoblinOnly ? "Goblin Lab" : "Lab"} -  ${formatCountdown(remainingMs)}`,
    progress,
    showProgress: true,

    levelText:
      current.currentLevel !== undefined &&
      current.nextLevel !== undefined
        ? `Lv ${current.currentLevel} → ${current.nextLevel}`
        : undefined,

    // 👇 show goblin as secondary if both active
    nextUpgradeText:
      normal && goblin
        ? ` Goblin • ${formatCountdown(goblin.endTime - Date.now())}`
        : "No parallel research",

    dataId: current.dataId,

    color: account.color,
    accountInitials: account.name.slice(0, 2).toUpperCase(),
    updatedAt,
  };
}