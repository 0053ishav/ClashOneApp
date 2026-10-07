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

  league?: {
    name: string;
    iconUrls: {
      small: string;
      medium: string;
      large: string;
    };
  };

  leagueTier?: {
    name: string;
    iconUrls: {
      small: string;
      medium: string;
      large: string;
    };
  };

  clan?: {
    tag: string;
    name: string;
    clanLevel: number;
    badgeUrls: {
      small: string;
      medium: string;
      large: string;
    };
  };

  labels?: {
    id: number;
    name: string;
    iconUrls: {
      small: string;
      medium: string;
      large: string;
    };
  }[];

  troops?: any[];
  heroes?: any[];
  spells?: any[];
  achievements?: any[];

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