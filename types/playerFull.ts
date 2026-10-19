export type PlayerVillage = "home" | "builderBase";

export interface PlayerEntityLevel {
  id?: number;
  name: string;
  level: number;
  maxLevel: number;
  village: PlayerVillage;
}

export interface PlayerAchievement {
  id?: number;
  name: string;
  stars?: number;
  value?: number;
  target?: number;
  info?: string;
  completionInfo?: string;
  village?: PlayerVillage;
}

export interface PlayerLabel {
  id: number;
  name: string;
  iconUrls: {
    small: string;
    medium: string;
    large: string;
  };
}

export interface PlayerLeague {
  id?: number;
  name: string;
  iconUrls?: {
    small: string;
    medium: string;
    large: string;
  };
}

export interface PlayerClan {
  tag: string;
  name: string;
  clanLevel: number;
  badgeUrls: {
    small: string;
    medium: string;
    large: string;
  };
}

export type PlayerFull = {
  tag: string;
  name: string;
  expLevel: number;
  townHallLevel: number;
  trophies: number;
  bestTrophies: number;

  attackWins: number;
  defenseWins: number;
  warStars: number;

  donations: number;
  donationsReceived: number;

  role?: string;
  warPreference?: string;

  league?: PlayerLeague;
  leagueTier?: PlayerLeague;
  clan?: PlayerClan;
  labels?: PlayerLabel[];

  troops?: PlayerEntityLevel[];
  heroes?: PlayerEntityLevel[];
  spells?: PlayerEntityLevel[];
  achievements?: PlayerAchievement[];

  helpers?: {
    id: number;
    level: number;
    cooldown?: number;
  }[];

  guardians?: {
    id: number;
    level: number;
  }[];

  builderHallLevel?: number;
  builderBaseTrophies?: number;
  bestBuilderBaseTrophies?: number;

  builderBaseLeague?: {
    id?: number;
    name?: string;
  };
};
