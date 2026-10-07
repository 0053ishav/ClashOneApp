import { PlayerProfile } from "@/types/player";
import { Upgrade } from "@/types/upgrade";
import { isWorkForHireActive } from "@/utils/goblin/globalEvents";

export function canUseGoblinBuilder(
  profile: PlayerProfile,
  activeUpgrades: Upgrade[]
): boolean {
  if (!isWorkForHireActive()) return false;

  // Must have TH above level 7
  if (profile.townHallLevel < 7) return false;

  // Must have all 5 builder huts
  if (profile.normalBuilderCount < 5) return false;

  // All normal builders must be busy
  const normalBusy = activeUpgrades.filter(
    (u) => u.builderSlot !== "G"
  ).length;

  const goblinBusy = activeUpgrades.some(
    (u) => u.builderSlot === "G"
  );
  if (goblinBusy) return false;

  if (normalBusy < profile.normalBuilderCount) return false;

  return true;
}

type LabState = {
  normal?: Upgrade | null;
  goblin?: Upgrade | null;
};

export function canUseGoblinLab(labState: LabState): boolean {
  // ❌ event not active → cannot START new goblin
  if (!isWorkForHireActive()) return false;

  // ❌ goblin already running → cannot start another
  if (labState.goblin) return false;

  // ❌ normal lab must be occupied
  if (!labState.normal) return false;

  return true;
}