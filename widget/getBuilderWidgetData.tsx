import { getAccounts } from "@/services/accountService";
import { getAccountState } from "@/services/accountStateService";
import { getActiveAccount } from "@/storage/activeAccount";
import { getLastJsonSync } from "@/storage/jsonSyncStorage";
import { getWidgetPrefs } from "@/storage/widgetPrefs";
import { calculateProgress } from "@/utils/calculateProgress";
import { formatCountdown } from "@/utils/formatCountdown";
import { formatUpgradeName } from "@/utils/formatUpgradeName";
import { isWorkForHireActive } from "@/utils/goblin";
import { getBuilderStatus } from "@/utils/status/home/builderStatus";
import { DEFAULT_BUILDER_WIDGET } from "@/utils/widget/defaultWidgetData";

export async function getBuilderWidgetData(inputTag?: string) {
  const accounts = await getAccounts();

  const activeTag = getActiveAccount();

  const widgetPrefs = getWidgetPrefs();

  const tag = inputTag ?? widgetPrefs.selectedAccountTag ?? activeTag;

  if (!tag) {
    return {
      title: "Builders",
      subtitle: "No account selected",
      progress: 0,
      showProgress: false,
      builderCountText: "Tap to setup",
    };
  }

  const updatedAt = tag ? getLastJsonSync(tag) : undefined;

  const account = accounts.find((a) => a.tag === tag);

  if (!account) {
    return {
      title: "Builders",
      subtitle: "Open app to sync",
      progress: 0,
      showProgress: false,
      builderCountText: "No account",
    };
  }

  const state = await getAccountState(tag);

  if (!state) {
    return {
      ...DEFAULT_BUILDER_WIDGET,
      subtitle: "Village not synced",
    };
  }

  const activeUpgrades = state.builders.home ?? [];
  // const activeUpgrades = (await getAccountState(tag)).builders;

  const builderCount = account.builderCount;
  const goblinBuilder = isWorkForHireActive();

  const status = getBuilderStatus({
    village: "home",
    normalBuilderCount: builderCount,
    goblinBuilderUnlocked: goblinBuilder,
    activeUpgrades,
  });

  // Free state
  if (!activeUpgrades?.length || status.allFree) {
    return {
      title: "Builders",
      subtitle: "All builders free",
      progress: 0,
      showProgress: false,
      builderCountText: `${status.freeBuilders} / ${status.maxBuilders} free`,
      color: account.color,
      accountInitials: account.name?.slice(0, 2)?.toUpperCase() ?? "??",
      updatedAt,
    };
  }

  const sorted = [...activeUpgrades].sort((a, b) => a.endTime - b.endTime);

  const currentUpgrade = sorted[0];
  const nextUpgrade = sorted[1];

  const title = formatUpgradeName(currentUpgrade);

  const nextTitle = nextUpgrade ? formatUpgradeName(nextUpgrade) : null;

  const remainingMs = Math.max(currentUpgrade.endTime - Date.now(), 0);
  const totalMs = currentUpgrade.endTime - currentUpgrade.startTime;

  const progress =
    totalMs > 0
      ? calculateProgress(currentUpgrade.startTime, currentUpgrade.endTime)
      : 0;

  const builderLabel =
    currentUpgrade.builderSlot === "G"
      ? "Goblin"
      : typeof currentUpgrade.builderSlot === "number"
        ? `B${currentUpgrade.builderSlot + 1}`
        : "?";

  return {
    title: title,
    subtitle: `${builderLabel} - ${formatCountdown(remainingMs)}`,
    isCrafted: currentUpgrade.isCrafted,
    progress,
    showProgress: !status.allFree,
    currentLevel: currentUpgrade.currentLevel,
    levelText:
      currentUpgrade.currentLevel !== undefined &&
      currentUpgrade.nextLevel !== undefined
        ? `Lv ${currentUpgrade.currentLevel} → ${currentUpgrade.nextLevel}`
        : undefined,
    builderCountText: `${status.freeBuilders} / ${status.maxBuilders} free`,
    nextUpgradeText: nextUpgrade
      ? `${nextTitle} • ${formatCountdown(nextUpgrade.endTime - Date.now())}`
      : "No next upgrade",
    dataId: currentUpgrade.dataId,
    color: account.color,
    accountInitials: account.name.slice(0, 2).toUpperCase(),
    remainingMs: remainingMs,
    updatedAt,
  };
}
