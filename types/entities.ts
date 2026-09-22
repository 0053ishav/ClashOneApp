import { EntityType, SubType, Village } from "./entity";

export interface EntityLevel {
  level: number;

  icon: string;

  name?: {
    en: string;
  };
}

export interface EntityData {
  id: number;

  slug: string;

  type: EntityType;

  village: Village;

  subType?: SubType;

  resource?: string;

  icon?: string;

  tags?: string[];

  name: {
    en: string;
  };

  levels?: Record<string, EntityLevel>;
}

export interface EntityManifest {
  version: number;
  categories: Record<string, number>;
}