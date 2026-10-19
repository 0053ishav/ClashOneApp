/**
 * Formats an upgrade's effective finish timestamp using the device locale
 * and timezone, matching the timestamp used by the upgrade countdown.
 */
export function formatUpgradeFinishDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}
