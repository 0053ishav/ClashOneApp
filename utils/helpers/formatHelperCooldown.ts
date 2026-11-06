import { formatCountdown } from "@/utils/formatCountdown";

/**
 * Helper cooldowns from the Clash JSON export are stored in seconds.
 * formatCountdown expects milliseconds, so keep the conversion explicit here
 * and share it across profile surfaces.
 */
export function formatHelperCooldown(cooldownSeconds: number): string {
  if (!Number.isFinite(cooldownSeconds) || cooldownSeconds <= 0) {
    return "Ready";
  }

  return formatCountdown(cooldownSeconds * 1000);
}
