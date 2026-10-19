import { getAccounts } from "@/services/accountService";
import { getAccountState } from "@/services/accountStateService";
import { formatUpgradeName } from "@/utils/formatUpgradeName";

export type UpcomingUpgradeRow = {
  accountTag: string;
  accountName: string;
  accountColor: string;
  entity: string;
  upgradeType: "BUILDER" | "LAB" | "PET";
  endTime: number;
  remainingMs: number;
  dataId?: number;
  moduleId?: number;
  currentLevel?: number;
  upgradeKind?: "NORMAL" | "SUPERCHARGE";
  currentSuperchargeLevel?: number;
  nextSuperchargeLevel?: number;
  isCrafted?: boolean;
  craftedModuleLevels?: Record<number, number>;
  icon?: string | number;
};

export async function getUpcomingUpgradesWidgetData() {
  const accounts = await getAccounts();
  const rows: UpcomingUpgradeRow[] = [];

  for (const account of accounts) {
    const state = await getAccountState(account.tag);

    if (!state) continue;

    const upgrades = [
      ...(state.builders.home ?? []),

      ...(state.lab?.home.normal ? [state.lab.home.normal] : []),
      ...(state.lab?.home.goblin ? [state.lab.home.goblin] : []),

      ...(state.pet ? [state.pet] : []),
    ];

    for (const upgrade of upgrades) {
      const remainingMs = Math.max(
        upgrade.endTime - Date.now(),
        0
      );

      rows.push({
        accountTag: account.tag,
        accountName: account.name,
        accountColor: account.color,

        entity: formatUpgradeName(upgrade),

        upgradeType: upgrade.upgradeType,
        endTime: upgrade.endTime,
        remainingMs,

        dataId: upgrade.dataId,
        moduleId: upgrade.moduleId,
        isCrafted: upgrade.isCrafted,
        currentLevel: upgrade.currentLevel,
        upgradeKind: upgrade.upgradeKind,
        currentSuperchargeLevel: upgrade.currentSuperchargeLevel,
        nextSuperchargeLevel: upgrade.nextSuperchargeLevel,
        craftedModuleLevels: upgrade.craftedModuleLevels,
      });
    }
  }

  return rows.sort(
    (a, b) => a.endTime - b.endTime
  );
}