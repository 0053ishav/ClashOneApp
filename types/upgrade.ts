import { EntityType, SubType, Village } from "./entity";

export type UpgradeType = "BUILDER" | "LAB";

export type Upgrade = {
  id: string;

  accountTag: string;

  village: Village;
  dataId?: number;
  entity: string;

  moduleId?: number;
  isCrafted?: boolean;
  /** Snapshot of every crafted-defense module level from the latest game export. */
  craftedModuleLevels?: Record<number, number>;

  hasHelper?: boolean;
  recurrentHelper?: boolean;
  helperAppliedSeconds?: number;

  type: "BUILDING" | "HERO" | "PET" | "GUARDIAN" | "LAB";
  subType?: SubType;
  upgradeType: "BUILDER" | "LAB" | "PET";

  builderType?: "NORMAL" | "GOBLIN";
  builderSlot?: number | "G";
  labSlot?: "NORMAL" | "GOBLIN";

  startTime: number;
  durationMinutes: number;
  endTime: number;

  /** Derived milliseconds saved by applicable timed Magic Item effects. */
  magicItemTimeSavedMs?: number;

  isCompleted: boolean;

  currentLevel?: number;
  nextLevel?: number;

  /** Distinguishes normal level progression from a Supercharge timer. */
  upgradeKind?: "NORMAL" | "SUPERCHARGE";
  currentSuperchargeLevel?: number;
  nextSuperchargeLevel?: number;

  source?: "JSON" | "MANUAL";
};

export type EntityRecord = {
  id: string;
  accountTag?: string;
  dataId: number;
  type: "helper" | "guardian" | "pet";
  level: number;
  cooldown?: number;
};

export type BuilderWidgetData = {
  title: string;
  subtitle: string;
  progress: number;
  showProgress: boolean;
  levelText?: string;
  builderCountText?: string;
  nextUpgradeText?: string;
  dataId?: number;
  type?: EntityType;
  isCrafted?: boolean;
  moduleId?: number;
  craftedModuleLevels?: Record<number, number>;
  color?: string;
  accountInitials?: string;
};

/** Imported Home Village building levels and completed Supercharge state. */
export type BuildingProgressRecord = {
  id: string;
  dataId: number;
  village: "home";
  normalLevel: number;
  count: number;
  superchargeLevel: number;
};
