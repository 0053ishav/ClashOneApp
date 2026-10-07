// import { normalizeEntityType, resolveUpgradeType } from "@/services/jsonImport/jsonImportService";
// import { useCraftedStore } from "@/stores/crafted";
// import { EntityType, SubType } from "@/types/entity";
// import { Upgrade } from "@/types/upgrade";
// import * as Crypto from "expo-crypto";
// import { getEntity } from "./getEntity";

// export async function createUpgrade(params: {
//   dataId?: number;
//   moduleId?: number;
//   entity: string;
//   type?: EntityType;
//   subType?: SubType;
//   days: number;
//   hours: number;
//   minutes: number;
//   builderType?: "NORMAL" | "GOBLIN";
//   currentLevel?: number;
//   nextLevel?: number;
//   accountTag: string;
// }): Promise<Omit<Upgrade, "builderSlot">> {
//   const durationMinutes =
//     params.days * 24 * 60 +
//     params.hours * 60 +
//     params.minutes;

//   const startTime = Date.now();
//   const endTime = startTime + durationMinutes * 60 * 1000;

//   const id = Crypto.randomUUID();
//   const crafted = useCraftedStore.getState();

//   const entityData = params.dataId ? getEntity(params.dataId) : null;

//   const rawType = params.type ?? entityData?.type;

//   const normalizedType = normalizeEntityType(rawType);
//   const upgradeType = resolveUpgradeType(rawType);

//   let name = entityData?.name ?? params.entity ?? "Custom";


//   const isCrafted = params.dataId
//     ? !!crafted.defenses[params.dataId]
//     : false;

//   if (isCrafted && params.dataId) {
//     const defense = crafted.defenses[params.dataId];

//     if (params.moduleId && defense?.modules?.[params.moduleId]) {
//       const module = defense.modules[params.moduleId];

//       name = `${defense.name} → ${module.name}`;
//     } else {

//       name = defense?.name ?? name;
//     }
//   }

//   return {
//     id,
//     accountTag: params.accountTag,

//     dataId: params.dataId,
//     moduleId: params.moduleId,
//     entity: name,

//     type: normalizedType,
//     subType: params.subType,
//     upgradeType,

//     startTime,
//     durationMinutes,
//     endTime,

//     builderType:
//       upgradeType === "BUILDER"
//         ? params.builderType ?? "NORMAL"
//         : undefined,

//     labSlot:
//       upgradeType === "LAB"
//         ? params.builderType === "GOBLIN"
//           ? "GOBLIN"
//           : "NORMAL"
//         : undefined,

//     isCompleted: false,

//     currentLevel: params.currentLevel,
//     nextLevel: params.nextLevel,

//     isCrafted,
//     source: "MANUAL",
//   };
// }