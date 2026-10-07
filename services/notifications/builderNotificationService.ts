import {
    UpgradeEvent
} from "@/engine/notifications/notificationEngine";

export function getBuilderEvents(account: any): UpgradeEvent[] {
  if (!account?.builders) return [];

  return account.builders
    .filter((b: any) => b.state === "BUSY" && b.finishTimestamp)
    .map((b: any) => ({
      id: `builder-${account.tag}-${b.builderId}`,

      playerTag: account.tag,
      accountName: account.name,
      accountColor: account.color ?? "#ffffff",

      type: "BUILDER",
      entityId: String(b.builderId),

      finishTimestamp: Number(b.finishTimestamp),
    }));
}