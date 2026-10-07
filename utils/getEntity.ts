import { useEntityStore } from "@/stores/entityStore";
import { Village } from "@/types/entity";

export function getEntity(
  dataId: number,
) {
  return (
    useEntityStore.getState().getEntity(dataId) ?? {
      id: dataId,
      name: {en: "Unknown"},
      type: "unknown",
      village: "home",
      slug: "unknown",
    }
  )
}

export function getEntityId(
  name: string,
  village: Village = "home",
) {
  return useEntityStore
    .getState()
    .getEntityId(
      name,
      village,
    );
}