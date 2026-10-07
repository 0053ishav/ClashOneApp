
export type WidgetCacheData = {
  title: string;
  subtitle: string;
  icon?: string;
  isCrafted?: boolean;
  progress: number;
  currentLevel?: number;
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