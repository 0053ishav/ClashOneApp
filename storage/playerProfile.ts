import { STORAGE_KEYS } from "@/storage/keys";
import { storage } from "@/storage/mmkv";
import { PlayerProfile } from "@/types/player";
import { randomUUID } from "expo-crypto";

type ClashApiPlayer = {
  tag?: string;
  name?: string;
  expLevel?: number;
  townHallLevel?: number;
  trophies?: number;
  bestTrophies?: number;
  warStars?: number;

  donations?: number;
  donationsReceived?: number;

  attackWins?: number;
  defenseWins?: number;

  clanCapitalContributions?: number;

  role?: string;

  league?: {
    name?: string;
    iconUrls?: {
      small?: string;
    };
  };

  leagueTier?: {
    name?: string;
    iconUrls?: {
      small?: string;
    };
  };

  clan?: {
    name?: string;
    tag?: string;
    clanLevel?: number;
    badgeUrls?: {
      small?: string;
    };
  };

  labels?: {
    name?: string;
    iconUrls?: {
      small?: string;
    };

  }[];

  builderHallLevel?: number;
  builderBaseTrophies?: number;
  bestBuilderBaseTrophies?: number;

  builderBaseLeague?: {
    id?: number;
    name?: string;
  };

};

function createDefaultProfile(): PlayerProfile {
  return {
    id: randomUUID(),

    playerName: "Chief",
    playerTag: undefined,

    expLevel: undefined,
    townHallLevel: 1,

    normalBuilderCount: 1,
    builderBaseBuilderCount: 1,

    leagueName: undefined,
    leagueIconUrl: undefined,
    leagueTierName: undefined,
    leagueTierIconUrl: undefined,

    trophies: undefined,
    bestTrophies: undefined,

    warStars: undefined,

    donations: undefined,
    donationsReceived: undefined,

    attackWins: undefined,
    defenseWins: undefined,

    clanCapitalGold: undefined,

    role: undefined,

    clanName: undefined,
    clanTag: undefined,
    clanLevel: undefined,
    clanBadgeUrl: undefined,

    labels: undefined,

    builderHallLevel: undefined,

    builderBaseTrophies: undefined,
    bestBuilderBaseTrophies: undefined,

    builderBaseLeague: undefined,
    lastSyncedAt: undefined,
    playerApiConnected: false,
  };
}

function getProfileKey(
  tag: string,
) {
  return `${STORAGE_KEYS.PLAYER_PROFILE}_${tag}`;
}

export function getPlayerProfile(
  tag: string,
): PlayerProfile {
  const raw =
    storage.getString(
      getProfileKey(tag),
    );

  if (!raw) {
    const profile =
      createDefaultProfile();

    storage.set(
      getProfileKey(tag),
      JSON.stringify(
        profile,
      ),
    );

    return profile;
  }

  try {
    const parsed =
      JSON.parse(raw);

    return {
      ...createDefaultProfile(),
      ...parsed,
    };
  } catch {
    const profile =
      createDefaultProfile();

    storage.set(
      getProfileKey(tag),
      JSON.stringify(
        profile,
      ),
    );

    return profile;
  }
}

export function savePlayerProfile(
  tag: string,
  profile:
    | PlayerProfile
    | null
    | undefined,
) {
  const safeProfile =
    profile
      ? {
        ...createDefaultProfile(),
        ...profile,
      }
      : createDefaultProfile();

  storage.set(
    getProfileKey(tag),
    JSON.stringify(
      safeProfile,
    ),
  );
}

export function syncProfileFromApi(
  tag: string,
  api: ClashApiPlayer,
) {
  if (__DEV__) {
    console.log(
      "🔄 Syncing profile:",
      tag,
    );
  }

  const profile =
    getPlayerProfile(tag);
 
  const merged = {
    ...profile,

    playerTag:
      api.tag ??
      profile.playerTag,

    playerName:
      api.name ??
      profile.playerName,

    expLevel:
      api.expLevel ??
      profile.expLevel,

    townHallLevel:
      api.townHallLevel ??
      profile.townHallLevel,

    leagueName:
      api.league?.name ??
      profile.leagueName,

    leagueIconUrl:
      api.league?.iconUrls
        ?.small ??
      profile.leagueIconUrl,

    leagueTierName:
      api.leagueTier
        ?.name ??
      profile.leagueTierName,

    leagueTierIconUrl:
      api.leagueTier
        ?.iconUrls
        ?.small ??
      profile.leagueTierIconUrl,

    trophies:
      api.trophies ??
      profile.trophies,

    bestTrophies:
      api.bestTrophies ??
      profile.bestTrophies,

    warStars:
      api.warStars ??
      profile.warStars,

    donations:
      api.donations ??
      profile.donations,

    donationsReceived:
      api.donationsReceived ??
      profile.donationsReceived,

    attackWins:
      api.attackWins ??
      profile.attackWins,

    defenseWins:
      api.defenseWins ??
      profile.defenseWins,

    clanCapitalGold:
      api.clanCapitalContributions ??
      profile.clanCapitalGold,

    role: api.role
      ? api.role !==
        "admin"
        ? api.role
        : "member"
      : profile.role,

    clanName:
      api.clan?.name ??
      profile.clanName,

    clanTag:
      api.clan?.tag ??
      profile.clanTag,

    clanLevel:
      api.clan?.clanLevel ??
      profile.clanLevel,

    clanBadgeUrl:
      api.clan?.badgeUrls
        ?.small ??
      profile.clanBadgeUrl,

    labels: api.labels
      ? api.labels
        .map((l) => ({
          name:
            l.name ?? "",
          iconUrl:
            l.iconUrls
              ?.small ??
            "",
        }))
        .filter(
          (l) =>
            l.name &&
            l.iconUrl,
        )
      : profile.labels,

    builderHallLevel:
      api.builderHallLevel ??
      profile.builderHallLevel,

    builderBaseTrophies:
      api.builderBaseTrophies ??
      profile.builderBaseTrophies,

    bestBuilderBaseTrophies:
      api.bestBuilderBaseTrophies ??
      profile.bestBuilderBaseTrophies,

    builderBaseLeague:
      api.builderBaseLeague
        ? {
          id: api.builderBaseLeague.id,
          name: api.builderBaseLeague.name,
        }
        : profile.builderBaseLeague,

    lastSyncedAt:
      Date.now(),

    playerApiConnected:
      true,
  }

  savePlayerProfile(tag, merged);


  if (__DEV__) {
    console.log(
      "✅ Profile synced:",
      tag,
    );
  }

  return merged
}

export function updateLocalBuilderCount(
  tag: string,
  count: number,
) {
  const profile =
    getPlayerProfile(tag);

  const safeCount =
    Math.max(
      1,
      Math.min(count, 6),
    );

  savePlayerProfile(tag, {
    ...profile,
    normalBuilderCount:
      safeCount,
  });
}

export function updateLocalBuilderBaseBuilderCount(
  tag: string,
  count: number,
) {
  const profile =
    getPlayerProfile(tag);

  const safeCount =
    Math.max(
      1,
      Math.min(count, 2),
    );

  savePlayerProfile(tag, {
    ...profile,
    builderBaseBuilderCount:
      safeCount,
  });
}