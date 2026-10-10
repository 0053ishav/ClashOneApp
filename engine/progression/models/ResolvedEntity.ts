import type { EntityType, Village } from "@/types/entity";

export interface ResolvedEntity {
  id: number;
  slug: string;
  category: EntityType;
  village: Village;
  subType?: string;
  maxLevel: number;
}
