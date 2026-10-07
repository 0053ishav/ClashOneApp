export type PlayerProfile = {
  id: string
  playerName: string;
  playerTag?: string;
  expLevel?: number;
  townHallLevel: number;
  normalBuilderCount: number;
  builderBaseBuilderCount: number;

  // Best League (legacy)
  leagueName?: string;
  leagueIconUrl?: string;
  bestTrophies?: number;

  // Current League (leagueTier)
  leagueTierName?: string;
  leagueTierIconUrl?: string;
  trophies?: number;

  warStars?: number;

  labels?: { name: string; iconUrl: string }[];

  donations?: number;
  donationsReceived?: number;
  attackWins?: number;
  defenseWins?: number;

  role?: string;

  clanName?: string;
  clanTag?: string;
  clanLevel?: number;
  clanBadgeUrl?: string;
  clanCapitalGold?: number;

  playerApiConnected: boolean;
  lastSyncedAt?: number;

  builderHallLevel?: number;
  builderBaseTrophies?: number;
  bestBuilderBaseTrophies?: number;


  builderBaseLeague?: {
    id?: number;
    name?: string;
  };

};
