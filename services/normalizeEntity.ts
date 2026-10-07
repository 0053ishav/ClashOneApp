import { useCraftedDefenseStore } from "@/stores/crafted";

export function normalizeEntity(entity: any) {
  if (entity.type !== "crafted_defense") return entity;

  const meta = useCraftedDefenseStore.getState().getCraftedDefense(entity.dataId);

  if (!meta) { return entity };

  console.log("[Normalized Entity]: ", "name: ", meta.name , "+ moduleName: ", meta.modules?.[entity.moduleId]?.name);
  
  return {
    ...entity,
    name: meta.name,
    moduleName: meta.modules?.[entity.moduleId]?.name,
  };
}