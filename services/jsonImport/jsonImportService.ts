import { addAccount, getAccountByTag, updateAccount } from "@/services/accountService";
import { fetchPlayerFromApi } from "@/services/clashApi";
import { ensureCraftedLoaded } from "@/services/craftedService";
import { ProgressionApplicationService } from "@/services/progression";
import { getGoldPassBoostSettings } from "@/services/goldPassBoostService";
import type { GoldPassBoostSelection, GoldPassBoostSettings } from "@/types/goldPass";
import { setLastJsonSync } from "@/storage/jsonSyncStorage";
import { syncProfileFromApi } from "@/storage/playerProfile";
import { useAccountStore } from "@/stores/accountStore";
import { EntityType, Village } from "@/types/entity";
import { Upgrade } from "@/types/upgrade";
import { getSessionSource, track } from "@/utils/analytics/analytics";
import { getEntity } from "@/utils/getEntity";
import { projectHelperTimer } from "@/utils/helpers/projectHelperTimer";
import { resyncNotifications } from "@/utils/notificationSync";
import * as Sentry from "@sentry/react-native";
import { randomUUID } from "expo-crypto";
import { clearActiveMagicEffects, replaceImportedBoostSnapshot } from "@/services/magicItemService";


type RawExport = {
  tag: string;
  timestamp: number;
  boosts?: { builder_boost?: number; lab_boost?: number; clocktower_boost?: number };

  buildings?: {
    data: number;
    lvl: number;
    cnt?: number;
    timer?: number;
    extra?: boolean;
    helper_timer?: number;
    helper_recurrent?: boolean;

    types?: {
      data: number;
      modules?: {
        data: number;
        lvl: number;
        timer?: number;
        helper_timer?: number;
        helper_recurrent?: boolean;
      }[];
    }[];
  }[];

  traps?: {
    data: number;
    lvl: number;
    timer?: number;
    extra?: boolean,
    helper_timer?: number;
    helper_recurrent?: boolean;
  }[];

  heroes?: {
    data: number;
    lvl: number;
    timer?: number;
    extra?: boolean,
    helper_timer?: number;
    helper_recurrent?: boolean;
  }[];

  pets?: { data: number; lvl: number; timer?: number }[];

  guardians?: {
    data: number;
    lvl: number;
    timer?: number,
    helper_timer?: number;
    helper_recurrent?: boolean;
  }[];

  helpers?: { data: number; lvl: number; helper_cooldown?: number }[];

  units?: {
    data: number;
    lvl: number;
    timer?: number;
    extra?: boolean,
    helper_timer?: number;
    helper_recurrent?: boolean;
  }[];

  spells?: {
    data: number;
    lvl: number;
    timer?: number;
    extra?: boolean,
    helper_timer?: number;
    helper_recurrent?: boolean;
  }[];

  siege_machines?: {
    data: number;
    lvl: number;
    timer?: number;
    extra?: boolean,
    helper_timer?: number;
    helper_recurrent?: boolean;
  }[];

  buildings2?: {
    data: number;
    lvl: number;
    cnt?: number;
    timer?: number;
  }[];

  traps2?: {
    data: number;
    lvl: number;
    timer?: number;
  }[];

  heroes2?: {
    data: number;
    lvl: number;
    timer?: number;
  }[];

  units2?: {
    data: number;
    lvl: number;
    timer?: number;
  }[];
};

type ActiveTask = {
  data: number;
  lvl: number;
  timer: number;
  extra?: boolean;
  village: Village;

  helper_timer?: number;
  helper_recurrent?: boolean;

  hasHelper?: boolean;
  recurrentHelper?: boolean;
  helperAppliedSeconds?: number;

  isCrafted?: boolean;
  moduleId?: number;
};

function getBuilderCounts(
  parsed: RawExport
) {
  const builderHutCount =
    parsed.buildings
      ?.filter(
        (b) => b.data === 1000015
      )
      .reduce(
        (sum, b) => sum + (b.cnt ?? 0),
        0
      ) ?? 0;

  const hasBobControl =
    parsed.buildings2?.some(
      (b) =>
        b.data === 1000065 &&
        b.lvl >= 5
    ) ?? false;

  const hasOtto =
    parsed.buildings2?.some(
      (b) =>
        b.data === 1000078 &&
        b.lvl >= 1
    ) ?? false;

  const hasBoto =
    parsed.buildings2?.some(
      (b) =>
        b.data === 1000047 &&
        b.lvl >= 1
    ) ?? false;

  console.log(
    "Builders:",
    {
      homeBuilders:
        builderHutCount +
        (hasBobControl ? 1 : 0),

      builderBaseBuilders:
        1 +
        (hasOtto ? 1 : 0) +
        (hasBoto ? 1 : 0),

      hasBobControl,
      hasOtto,
      hasBoto,
    }
  );

  return {
    // Builder Huts + B.O.B Control
    homeBuilders:
      builderHutCount +
      (hasBobControl ? 1 : 0),

    // Master Builder + O.T.T.O + B.O.T.O
    builderBaseBuilders:
      1 +
      (hasOtto ? 1 : 0) +
      (hasBoto ? 1 : 0),
  };
}


type ImportResult =
  | { status: "NO_ACTIVE_BUILDERS"; tag: string }
  | {
    status: "SUCCESS";
    activeCount: number;
    skippedExpired: number;
    tag: string;
  };

const HOME_VILLAGE: Village = "home";
const BUILDER_BASE_VILLAGE: Village = "builderBase";

function validateJson(data: any) {
  if (!data || typeof data !== "object") {
    throw new Error("INVALID_STRUCTURE");
  }

  if (typeof data.tag !== "string") {
    throw new Error("INVALID_STRUCTURE");
  }

  if (typeof data.timestamp !== "number" || !Number.isFinite(data.timestamp) || data.timestamp < 0) {
    throw new Error("INVALID_STRUCTURE");
  }
  if (data.boosts != null) {
    if (typeof data.boosts !== "object" || Array.isArray(data.boosts)) throw new Error("INVALID_BOOSTS");
    for (const key of ["builder_boost", "lab_boost", "clocktower_boost"] as const) {
      const value = data.boosts[key];
      if (value != null && (!Number.isSafeInteger(value) || value < 0)) throw new Error("INVALID_BOOSTS");
    }
  }

  if (
    !Array.isArray(data.buildings) &&
    !Array.isArray(data.traps) &&
    !Array.isArray(data.heroes)
  ) {
    throw new Error("INVALID_STRUCTURE");
  }
}

export function resolveUpgradeType(entityType?: EntityType): Upgrade["upgradeType"] {
  if (entityType === "pet") return "PET";
  if (entityType === "lab") return "LAB";
  return "BUILDER";
}

export function normalizeEntityType(entityType?: EntityType): Upgrade["type"] {
  switch (entityType) {
    case "building":
      return "BUILDING";
    case "hero":
      return "HERO";
    case "pet":
      return "PET";
    case "guardian":
      return "GUARDIAN";
    case "lab":
      return "LAB";
    case "troop":
      return "LAB";
    case "siege":
      return "LAB";
    case "spell":
      return "LAB";
    default:
      return "BUILDING"; // fallback (safe)
  }
}

function getGoldPassBoostForUpgradeType(
  upgradeType: Upgrade["upgradeType"],
  settings: GoldPassBoostSettings,
): GoldPassBoostSelection {
  return upgradeType === "BUILDER"
    ? { target: "builder", percent: settings.builderBoostPercent }
    : { target: "research", percent: settings.researchBoostPercent };
}

export async function importVillageJson(
  rawText: string
): Promise<ImportResult> {
  let parsed: RawExport;
  let apiData: Awaited<ReturnType<typeof fetchPlayerFromApi>> | null = null;

  const switchAccountStore = useAccountStore.getState().switchAccount;
  const importJsonData = useAccountStore.getState().importJsonData;

  try {
    parsed = JSON.parse(rawText);
    track("json_pipeline", {
      step: "parse",
      status: "success",
      source: getSessionSource(),
    });
  } catch (e) {
    track("json_pipeline", {
      step: "parse",
      status: "failed",
      error: e,
    });
    throw new Error("INVALID_JSON");
  }

  validateJson(parsed);

  await ensureCraftedLoaded();
  // Gold Pass perks are not in the export; use the player-maintained setting.
  const goldPassSettings = await getGoldPassBoostSettings(parsed.tag);

  console.log("📥 Import JSON tag:", parsed.tag);

  const setLastSync = useAccountStore.getState().setLastSync;

  const exportTimestampMs = parsed.timestamp * 1000;
  const now = Date.now();

  const {
    homeBuilders: totalHomeBuilders,
    builderBaseBuilders: totalBuilderBaseBuilders,
  } = getBuilderCounts(parsed);

  // =========================================================
  // 🔥 STEP 1: BUILD ACTIVE TASK LIST (NORMAL + CRAFTED)
  // =========================================================

  const entities: {
    id: string;
    dataId: number;
    type: "helper" | "guardian" | "pet";
    level: number;
    cooldown?: number;
  }[] = [];

  const helperMap = new Map<
    number,
    {
      level: number;
      cooldown: number;
    }
  >();

  for (const h of parsed.helpers ?? []) {
    entities.push({
      id: randomUUID(),
      dataId: h.data,
      type: "helper",
      level: h.lvl,
      cooldown: h.helper_cooldown,
    });
    helperMap.set(h.data, {
      level: h.lvl,
      cooldown: h.helper_cooldown ?? 0,
    });
  }

  for (const p of parsed.pets ?? []) {
    entities.push({
      id: randomUUID(),
      dataId: p.data,
      type: "pet",
      level: p.lvl,
    });
  }

  for (const g of parsed.guardians ?? []) {
    entities.push({
      id: randomUUID(),
      dataId: g.data,
      type: "guardian",
      level: g.lvl,
    });
  }

  const activeBuilderTasks: ActiveTask[] = [];

  // ✅ Normal timers
  activeBuilderTasks.push(
    ...(parsed.buildings
      ?.filter((b) => typeof b.timer === "number")
      .map((b) => ({
        village: HOME_VILLAGE,
        data: b.data,
        lvl: b.lvl,
        timer: b.timer!,
        extra: b.extra,


        helper_timer: b.helper_timer,
        helper_recurrent: b.helper_recurrent,
        hasHelper:
          (typeof b.helper_timer === "number" &&
            b.helper_timer > 0) ||
          b.helper_recurrent === true
      })) ?? []),

    ...(parsed.traps
      ?.filter((t) => typeof t.timer === "number")
      .map((t) => ({
        village: HOME_VILLAGE,
        data: t.data,
        lvl: t.lvl,
        timer: t.timer!,
        extra: t.extra,

        helper_timer: t.helper_timer,
        helper_recurrent: t.helper_recurrent,
        hasHelper:
          (typeof t.helper_timer === "number" &&
            t.helper_timer > 0) ||
          t.helper_recurrent === true
      })) ?? []),

    ...(parsed.heroes
      ?.filter((h) => typeof h.timer === "number")
      .map((h) => ({
        village: HOME_VILLAGE,
        data: h.data,
        lvl: h.lvl,
        timer: h.timer!,
        extra: h.extra,

        helper_timer: h.helper_timer,
        helper_recurrent: h.helper_recurrent,
        hasHelper:
          (typeof h.helper_timer === "number" &&
            h.helper_timer > 0) ||
          h.helper_recurrent === true
      })) ?? []),

    ...(parsed.pets
      ?.filter((p) => typeof p.timer === "number")
      .map((p) => ({
        village: HOME_VILLAGE,
        data: p.data,
        lvl: p.lvl,
        timer: p.timer!,
      })) ?? []),

    ...(parsed.guardians
      ?.filter((g) => typeof g.timer === "number")
      .map((g) => ({
        village: HOME_VILLAGE,
        data: g.data,
        lvl: g.lvl,
        timer: g.timer!,

        helper_timer: g.helper_timer,
        helper_recurrent: g.helper_recurrent,
        hasHelper:
          (typeof g.helper_timer === "number" &&
            g.helper_timer > 0) ||
          g.helper_recurrent === true
      })) ?? []),

    ...(parsed.buildings2
      ?.filter((b) => typeof b.timer === "number")
      .map((b) => ({
        village: BUILDER_BASE_VILLAGE,
        data: b.data,
        lvl: b.lvl,
        timer: b.timer!,
      })) ?? []),

    ...(parsed.traps2
      ?.filter((b) => typeof b.timer === "number")
      .map((b) => ({
        village: BUILDER_BASE_VILLAGE,
        data: b.data,
        lvl: b.lvl,
        timer: b.timer!,
      })) ?? []),

    ...(parsed.heroes2
      ?.filter((b) => typeof b.timer === "number")
      .map((b) => ({
        village: BUILDER_BASE_VILLAGE,
        data: b.data,
        lvl: b.lvl,
        timer: b.timer!,
      })) ?? []),
  );


  // ✅ 🔥 Crafted defenses (modules)
  for (const building of parsed.buildings ?? []) {
    if (!building.types) continue;

    for (const type of building.types) {
      for (const module of type.modules ?? []) {
        if (typeof module.timer === "number") {
          activeBuilderTasks.push({
            data: type.data, // defense ID
            lvl: module.lvl ?? 1,
            timer: module.timer,
            village: HOME_VILLAGE,
            isCrafted: true,
            moduleId: module.data,

            helper_timer: module.helper_timer,
            helper_recurrent: module.helper_recurrent,
            hasHelper:
              (typeof module.helper_timer === "number" &&
                module.helper_timer > 0) ||
              module.helper_recurrent === true
          });
        }
      }
    }
  }

  type LabSource = {
    data: number;
    lvl: number;
    timer?: number;

    village: Village;

    extra?: boolean;
    helper_timer?: number;
    helper_recurrent?: boolean;
  };

  const labSources: LabSource[] = [
    ...(parsed.units ?? []).map((u) => ({
      ...u,
      village: HOME_VILLAGE,
    })),

    ...(parsed.spells ?? []).map((u) => ({
      ...u,
      village: HOME_VILLAGE,
    })),

    ...(parsed.siege_machines ?? []).map((u) => ({
      ...u,
      village: HOME_VILLAGE,
    })),

    ...(parsed.units2 ?? []).map((u) => ({
      ...u,
      village: BUILDER_BASE_VILLAGE,
    })),
  ];

  const activeLabs = labSources.filter(
    (u) => typeof u.timer === "number"
  );

  const activeLabTasks: ActiveTask[] = [];

  for (const lab of activeLabs) {
    activeLabTasks.push({
      data: lab.data,
      lvl: lab.lvl,
      timer: lab.timer!,
      extra: lab.extra,
      village: lab.village,

      helper_timer: lab.helper_timer,
      helper_recurrent: lab.helper_recurrent,
      hasHelper:
        lab.helper_timer != null ||
        lab.helper_recurrent === true
    })
  }

  // =========================================================
  // 🔥 STEP 2: VALIDATE ACTIVE UPGRADES
  // =========================================================

  const validUpgrades: {
    village: Village;
    data: number;
    remainingNow: number;
    remainingMsAtExport: number;
    lvl: number;
    isGoblin: boolean;
    hasHelper?: boolean;
    recurrentHelper?: boolean;
    helperAppliedSeconds?: number;
    isCrafted?: boolean;
    moduleId?: number;
  }[] = [];

  let skippedExpired = 0;

  for (const item of activeBuilderTasks) {

    let projectedTimer = item.timer;
    let helperAppliedSeconds = 0;

    const apprentice = helperMap.get(93000000);

    const hasHelperTimer =
      typeof item.helper_timer === "number";

    const hasPositiveHelperTimer =
      hasHelperTimer && item.helper_timer! > 0;

    const hasRecurrentHelper =
      item.helper_recurrent === true;

    if (
      apprentice &&
      hasPositiveHelperTimer
    ) {
      projectedTimer = projectHelperTimer({
        timer: item.timer,
        helperTimer: item.helper_timer,
        helperCooldown: apprentice.cooldown,
        helperLevel: apprentice.level,
        helperRecurrent: hasRecurrentHelper,

      })
    }
    helperAppliedSeconds =
      Math.max(
        0,
        item.timer - projectedTimer
      );

    const remainingMsAtExport = projectedTimer * 1000;
    const realEndTime = exportTimestampMs + remainingMsAtExport;
    const remainingNow = Math.max(0, realEndTime - now);

    if (remainingNow <= 0) {
      skippedExpired++;
      continue;
    }

    validUpgrades.push({
      village: item.village,
      data: item.data,
      remainingNow,
      remainingMsAtExport,
      lvl: item.lvl,
      isGoblin: item.extra === true,

      hasHelper:
        (typeof item.helper_timer === "number" &&
          item.helper_timer > 0)
        || item.helper_recurrent === true,
      recurrentHelper: item.helper_recurrent === true,
      helperAppliedSeconds,
      isCrafted: item.isCrafted,
      moduleId: item.moduleId,
    });
  }

  type ValidLabTask = {
    data: number;
    lvl: number;
    village: Village;

    extra?: boolean;

    remainingNow: number;
    remainingMsAtExport: number;

    hasHelper?: boolean;
    recurrentHelper?: boolean;
    helperAppliedSeconds?: number;
  };

  const validLabTasks: ValidLabTask[] = [];

  for (const lab of activeLabTasks) {
    // const remainingMsAtExport = lab.timer * 1000;

    let projectedTimer = lab.timer;
    let helperAppliedSeconds = 0;
    const assistant = helperMap.get(93000001);

    if (
      assistant &&
      lab.helper_timer != null &&
      lab.helper_timer > 0
    ) {
      projectedTimer = projectHelperTimer({
        timer: lab.timer,

        helperTimer: lab.helper_timer,
        helperCooldown: assistant.cooldown,

        helperLevel: assistant.level,

        helperRecurrent:
          lab.helper_recurrent === true,
      });
    }
    helperAppliedSeconds =
      Math.max(
        0,
        lab.timer - projectedTimer
      );
    const remainingMsAtExport =
      projectedTimer * 1000;
    const realEndTime = exportTimestampMs + remainingMsAtExport;
    const remainingNow = Math.max(0, realEndTime - now);

    if (remainingNow <= 0) continue;

    validLabTasks.push({
      data: lab.data,
      lvl: lab.lvl,
      village: lab.village,
      extra: lab.extra,

      remainingNow,
      remainingMsAtExport,

      recurrentHelper:
        lab.helper_recurrent === true,

      helperAppliedSeconds,

      hasHelper: lab.hasHelper,
    });
  }

  // =========================================================
  // 🔥 API SYNC (UNCHANGED)
  // =========================================================

  try {
    apiData = await fetchPlayerFromApi(parsed.tag);

    track("json_pipeline", {
      step: "fetch",
      status: "sucesss",
      source: getSessionSource(),
    });
  } catch (e) {
    track("json_pipeline", {
      step: "fetch",
      status: "failed",
      error: e,
    });
  }

  const existing = await getAccountByTag(parsed.tag);
  if (!existing) {
    await addAccount(
      parsed.tag,
      apiData?.name ?? "Chief",
      "#fbbf24",
      apiData?.townHallLevel ?? 1,
      totalHomeBuilders,
      totalBuilderBaseBuilders,
    );
  } else {
    await updateAccount(
      parsed.tag,
      apiData?.name ?? existing.name,
      existing.color,
      apiData?.townHallLevel ?? existing.townhall,
      totalHomeBuilders,
      totalBuilderBaseBuilders,
    );
  }

  await switchAccountStore(parsed.tag);
  if (apiData) {
    const synced = syncProfileFromApi(parsed.tag, apiData);
    useAccountStore.getState().setProfile(parsed.tag, synced);
  }

  await new Promise((resolve) => setTimeout(resolve, 50));

  if (
    validUpgrades.length === 0 &&
    validLabTasks.length === 0
  ) {
    await importJsonData(parsed.tag, [], entities);
    await clearActiveMagicEffects(parsed.tag);
    await replaceImportedBoostSnapshot({
      accountTag: parsed.tag,
      builderBoostSeconds: parsed.boosts?.builder_boost ?? 0,
      labBoostSeconds: parsed.boosts?.lab_boost ?? 0,
      clocktowerBoostSeconds: parsed.boosts?.clocktower_boost ?? 0,
      exportedAt: exportTimestampMs,
    });

    setLastSync(parsed.tag, now);
    setLastJsonSync(parsed.tag, now);
    return { status: "NO_ACTIVE_BUILDERS", tag: parsed.tag };
  }

  // =========================================================
  // 🔥 BUILD FINAL UPGRADES
  // =========================================================

  validUpgrades.sort((a, b) => a.remainingNow - b.remainingNow);

  const newUpgrades: Upgrade[] = [];
  let homeBuilderUsed = 0;
  let builderBaseBuilderUsed = 0;

  for (const item of validUpgrades) {
    let entity = getEntity(item.data);

    // 🔥 Crafted defenses don't exist as normal entities.
    if (item.isCrafted) {
      entity = {
        id: 1000097,
        slug: "crafted-defense",
        village: HOME_VILLAGE,
        type: "building" as EntityType,
        name: {
          en: "Crafted Defense",
        },
      };
    }

    if (!entity) {
      console.warn(
        "[JSON Import] Unknown entity:",
        item.data,
      );
      continue;
    }

    const upgradeType = resolveUpgradeType(entity.type);
    const goldPassBoost = getGoldPassBoostForUpgradeType(
      upgradeType,
      goldPassSettings,
    );
    const progressionResult =
      ProgressionApplicationService.resolveUpgrade({
        id: randomUUID(),
        accountTag: parsed.tag,
        village: item.village,
        dataId: item.data,
        entity: entity.name.en,

        type: normalizeEntityType(entity.type),
        upgradeType,

        currentLevel: item.lvl,

        moduleId: item.moduleId,
        isCrafted: item.isCrafted,

        startTime: 0,
        durationMinutes: 0,
        endTime: 0,

        isCompleted: false,
        source: "JSON",
      }, { goldPassBoost });

    if (!progressionResult) {
      console.warn(
        "[JSON Import] Progression unavailable:",
        {
          dataId: item.data,
          level: item.lvl,
          isCrafted: item.isCrafted,
          moduleId: item.moduleId,
        },
      );

      continue;
    }

    const nextUpgradeTime =
      progressionResult.nextUpgradeTime;

    if (nextUpgradeTime == null) {
      console.warn(
        "[JSON Import] Missing progression upgrade time:",
        {
          dataId: item.data,
          level: item.lvl,
          isCrafted: item.isCrafted,
          moduleId: item.moduleId,
        },
      );

      continue;
    }

    const totalDurationMs =
      nextUpgradeTime * 1000;

    const endTime =
      exportTimestampMs +
      item.remainingMsAtExport;

    const startTime =
      endTime -
      totalDurationMs;

    const durationMinutes =
      Math.ceil(totalDurationMs / 60000);

    console.log(
      "[JSON Import] Progression timing:",
      {
        dataId: item.data,
        isCrafted: item.isCrafted,
        moduleId: item.moduleId,
        currentLevel:
          progressionResult.currentLevel,
        nextLevel:
          progressionResult.nextLevel,
        totalDurationSeconds:
          progressionResult.nextUpgradeTime,
        remainingAtExportSeconds:
          item.remainingMsAtExport / 1000,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        reconstructedDurationSeconds:
          (endTime - startTime) / 1000,
      },
    );

    const upgradeType =
      resolveUpgradeType(entity.type);

    const normalizedType =
      normalizeEntityType(entity.type);


    let builderSlot: number | "G" | undefined;

    if (upgradeType === "BUILDER") {
      if (
        item.village === HOME_VILLAGE &&
        item.isGoblin
      ) {
        builderSlot = "G";
      } else if (
        item.village === HOME_VILLAGE
      ) {
        if (homeBuilderUsed >= totalHomeBuilders) {
          continue;
        }

        builderSlot = homeBuilderUsed;
        homeBuilderUsed++;
      } else {
        if (
          builderBaseBuilderUsed >=
          totalBuilderBaseBuilders
        ) {
          continue;
        }

        builderSlot =
          builderBaseBuilderUsed;

        builderBaseBuilderUsed++;
      }
    }

    newUpgrades.push({
      id: randomUUID(),
      accountTag: parsed.tag,
      village: item.village,
      dataId: item.data,
      entity: entity.name.en,

      type: normalizedType,
      upgradeType,

      hasHelper: item.hasHelper,
      recurrentHelper: item.recurrentHelper,

      helperAppliedSeconds:
        item.helperAppliedSeconds,

      startTime,
      durationMinutes,
      endTime,

      builderType:
        upgradeType === "BUILDER"
          ? builderSlot === "G"
            ? "GOBLIN"
            : "NORMAL"
          : undefined,

      builderSlot:
        upgradeType === "BUILDER"
          ? builderSlot
          : undefined,

      currentLevel: progressionResult.currentLevel,
      nextLevel: progressionResult.nextLevel,

      isCompleted: false,
      source: "JSON",

      moduleId: item.moduleId,
      isCrafted: item.isCrafted,
    });
  }

  for (const lab of validLabTasks) {
    const entity = getEntity(lab.data);

    if (!entity) {
      console.warn(
        "[JSON Import] Unknown lab entity:",
        lab.data,
      );
      continue;
    }

    const goldPassBoost = getGoldPassBoostForUpgradeType("LAB", goldPassSettings);
    const progressionResult =
      ProgressionApplicationService.resolveUpgrade({
        id: randomUUID(),
        accountTag: parsed.tag,

        village: lab.village,

        dataId: lab.data,

        entity: entity.name.en,

        type: normalizeEntityType(entity.type),
        upgradeType: "LAB",

        currentLevel: lab.lvl,

        startTime: 0,
        durationMinutes: 0,
        endTime: 0,

        isCompleted: false,
        source: "JSON",
      }, { goldPassBoost });

    if (!progressionResult) {
      console.warn(
        "[JSON Import] Progression unavailable for lab:",
        {
          dataId: lab.data,
          level: lab.lvl,
          village: lab.village,
        },
      );

      continue;
    }

    const nextUpgradeTime =
      progressionResult.nextUpgradeTime;

    if (nextUpgradeTime == null) {
      console.warn(
        "[JSON Import] Missing progression upgrade time for lab:",
        {
          dataId: lab.data,
          level: lab.lvl,
          village: lab.village,
        },
      );

      continue;
    }

    const totalDurationMs =
      nextUpgradeTime * 1000;

    const endTime =
      exportTimestampMs +
      lab.remainingMsAtExport;

    const startTime =
      endTime -
      totalDurationMs;

    const durationMinutes =
      Math.ceil(totalDurationMs / 60000);

    console.log(
      "[JSON Import] Lab progression timing:",
      {
        dataId: lab.data,
        currentLevel:
          progressionResult.currentLevel,
        nextLevel:
          progressionResult.nextLevel,
        totalDurationSeconds:
          progressionResult.nextUpgradeTime,
        remainingAtExportSeconds:
          lab.remainingMsAtExport / 1000,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        reconstructedDurationSeconds:
          (endTime - startTime) / 1000,
      },
    );
    newUpgrades.push({
      id: randomUUID(),

      accountTag: parsed.tag,

      village: lab.village,

      dataId: lab.data,

      entity: entity.name.en,

      type: normalizeEntityType(
        entity.type,
      ),

      upgradeType: "LAB",

      hasHelper: lab.hasHelper,

      recurrentHelper:
        lab.recurrentHelper,

      helperAppliedSeconds:
        lab.helperAppliedSeconds,

      startTime,
      durationMinutes,
      endTime,

      builderSlot: undefined,
      builderType: undefined,

      labSlot:
        lab.village === HOME_VILLAGE
          ? lab.extra === true
            ? "GOBLIN"
            : "NORMAL"
          : "NORMAL",

      currentLevel:
        progressionResult.currentLevel,

      nextLevel:
        progressionResult.nextLevel,

      isCompleted: false,

      source: "JSON",
    });
  }

  console.log("Writing upgrades:", newUpgrades.length);

  try {
    await importJsonData(parsed.tag, newUpgrades, entities);
    // Imported timers are authoritative; app-side simulated potion effects must not re-project them.
    await clearActiveMagicEffects(parsed.tag);
    await replaceImportedBoostSnapshot({
      accountTag: parsed.tag,
      builderBoostSeconds: parsed.boosts?.builder_boost ?? 0,
      labBoostSeconds: parsed.boosts?.lab_boost ?? 0,
      clocktowerBoostSeconds: parsed.boosts?.clocktower_boost ?? 0,
      exportedAt: exportTimestampMs,
    });
    track("json_pipeline", {
      step: "import",
      status: "sucesss",
      source: getSessionSource(),
    });

  } catch (e) {
    Sentry.captureException(e);

    track("json_pipeline", {
      step: "import",
      status: "failed",
      error: e,
    });
  }
  setLastJsonSync(parsed.tag, now);
  await resyncNotifications();

  const builderCountOnly = newUpgrades.filter(
    (u) => u.upgradeType === "BUILDER"
  ).length;

  return {
    status: "SUCCESS",
    activeCount: builderCountOnly,
    skippedExpired,
    tag: parsed.tag,
  };
}
