import {
  UpgradeEvent
} from "@/engine/notifications/notificationEngine";

export function getLabEvents(account: any): UpgradeEvent[] {
  const lab = account?.lab;

  if (!lab || lab.state !== "RESEARCHING" || !lab.finishTimestamp) {
    return [];
  }

  return [
    {
      id: `lab-${account.tag}`,
      village: "home",

      playerTag: account.tag,
      accountName: account.name,
      accountColor: account.color ?? "#ffffff",

      type: "LAB",
      entityId: "lab",

      finishTimestamp: Number(lab.finishTimestamp),
    },
  ];
}