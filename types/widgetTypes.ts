
export type WidgetCacheData = {
  title: string;
  subtitle: string;
  icon?: string;
  isCrafted?: boolean;
  moduleId?: number;
  craftedModuleLevels?: Record<number, number>;
  progress: number;
  currentLevel?: number;
  upgradeKind?: "NORMAL" | "SUPERCHARGE";
  currentSuperchargeLevel?: number;
  nextSuperchargeLevel?: number;
  showProgress: boolean;
  levelText?: string;
  builderCountText?: string;
  nextUpgradeText?: string;
  dataId?: number;
  type?: any;
  color?: string;
  accountInitials?: string;
  updatedAt?: number;
  cachedAt: number;
  remainingMs?: number;
};

export type MultiWidgetItem = {
  tag: string;
  data: WidgetCacheData;
}