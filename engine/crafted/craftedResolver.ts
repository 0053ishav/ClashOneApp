import { useCraftedDefenseStore } from "@/stores/crafted";


/** React / Home */
export function useCraftedResolver() {
  const defenses = useCraftedDefenseStore((s) => s.defenses);

  function getCraftedName(dataId?: number) {
    if (dataId == null) return null;
    return defenses[dataId]?.name ?? null;
  }

  function getModuleName(dataId?: number, moduleId?: number) {
    if (dataId == null || moduleId == null) return null;
    return defenses[dataId]?.modules?.[moduleId]?.name ?? null;
  }

  // function getCraftedIcon(dataId?: number) {
  //   if (!dataId || !isActive()) return null;
  //   return defenses[dataId]?.icon ?? null;
  // }

  return { getCraftedName, getModuleName };
}

/** Services / Widgets */
export function getCraftedResolver() {
  const { defenses } = useCraftedDefenseStore.getState();

  function getCraftedName(dataId?: number) {
    if (dataId == null) return null;
    return defenses[dataId]?.name ?? null;
  }

  function getModuleName(dataId?: number, moduleId?: number) {
    if (dataId == null || moduleId == null) return null;
    return defenses[dataId]?.modules?.[moduleId]?.name ?? null;
  }

  // function getCraftedIcon(dataId?: number) {
  //   if (!dataId || !isActive()) return null;
  //   return defenses[dataId]?.icon ?? null;
  // }

  return { getCraftedName, getModuleName };
}