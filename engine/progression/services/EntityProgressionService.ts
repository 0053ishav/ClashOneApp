
import type {
  EntityData,
} from "@/types/entities";

import type {
  ProgressionData,
} from "@/types/progression";
import { ResolvedEntity } from "../models";

export class EntityProgressionService {
  static create(
    entity: EntityData,
    progression: ProgressionData,
  ): ResolvedEntity {
    return {
      id: entity.id,
      slug: entity.slug,

      village: entity.village,

      subType: entity.subType,

      category: entity.type,

      maxLevel:
        progression.maxLevel,
    };
  }
}