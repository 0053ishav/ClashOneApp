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

  isCompleted: boolean;

  currentLevel?: number;
  nextLevel?: number;

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
  color?: string;
  accountInitials?: string;
};