import type { Village } from "@/types/entity";

export type HammerJamTarget =
  | "building"
  | "troop"
  | "spell"
  | "hero"
  | "pet";

/** Event configuration used by the app's Hammer Jam manifest. */
export type HammerJamManifest = {
  title: string;
  enabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
  timeMultiplier: number;
  costMultiplier: number;
  resourceMultiplier: number;
  appliesTo: readonly HammerJamTarget[];
  villages: readonly Village[];
};

/**
 * First-class progression boost, evaluated at the upgrade's planned start time.
 * Multipliers are factors, not percentages: 0.5 means a 50% reduction.
 */
export type HammerJamBoostSelection = {
  startsAt: number;
  manifest: HammerJamManifest;
};
