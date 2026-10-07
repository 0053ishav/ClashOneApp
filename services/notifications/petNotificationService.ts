import {
    UpgradeEvent
} from "@/engine/notifications/notificationEngine";


export function getPetEvents(account: any): UpgradeEvent[] {
  if (!account?.pets) return [];

  return account.pets
    .filter((p: any) => p.isUpgrading && p.finishTimestamp)
    .map((p: any) => ({
      id: `pet-${account.tag}-${p.name}`,

      playerTag: account.tag,
      accountName: account.name,
      accountColor: account.color ?? "#ffffff",

      type: "PET",
      entityId: p.name,

      finishTimestamp: Number(p.finishTimestamp),
    }));
}