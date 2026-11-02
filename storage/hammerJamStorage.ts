import { STORAGE_KEYS } from "@/storage/keys";
import { storage } from "@/storage/mmkv";

const BANNER_KEY = STORAGE_KEYS.HAMMER_JAM_BANNER_DISMISSED_EVENT;

/**
 * Persist dismissal for the current Hammer Jam event, identified by its end
 * timestamp. A later event with a different end timestamp can show normally.
 */
export function setHammerJamBannerDismissedUntil(endsAt: string): void {
  try {
    storage.set(BANNER_KEY, endsAt);
  } catch (error) {
    console.warn("Failed to store Hammer Jam banner dismissal", error);
  }
}

/** Return whether this event's banner should be shown. */
export function shouldShowHammerJamBanner(endsAt: string | null): boolean {
  if (!endsAt || !Number.isFinite(Date.parse(endsAt))) return true;

  try {
    const dismissedEventEndsAt = storage.getString(BANNER_KEY);
    const eventEndsAt = Date.parse(endsAt);

    if (dismissedEventEndsAt !== endsAt) return true;

    // Expired events should not keep the banner dismissed for a future event.
    return Date.now() >= eventEndsAt;
  } catch (error) {
    console.warn("Failed to read Hammer Jam banner dismissal", error);
    return true;
  }
}

/** Clear persisted dismissal, for tests or event reset. */
export function resetHammerJamBannerDismissal(): void {
  try {
    storage.remove(BANNER_KEY);
  } catch (error) {
    console.warn("Failed to reset Hammer Jam banner dismissal", error);
  }
}
