import { useEntityStore } from "@/stores/entityStore";
import { useProgressionStore } from "@/stores/progressionStore";

export class ProgressionQueries {
  static getEntity(id: number) {
    return useEntityStore
      .getState()
      .getEntity(id);
  }

  static getProgression(id: number) {
    return useProgressionStore
      .getState()
      .getProgression(id);
  }
}