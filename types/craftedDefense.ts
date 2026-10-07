import { ResourceType } from "./resource";

export interface CraftedDefenseModule {
  id: number;
  name: string;
  stat: string;
  resource: ResourceType;
}

export interface CraftedDefenseData {
  id: number;
  name: string;
  modules: Record<number, CraftedDefenseModule>;
}