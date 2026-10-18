import { ResourceType } from "./resource";

/**
 * Progression manifest
 */
export interface ProgressionManifest {
  version: number;
  categories: Readonly<
    Record<string, number>
  >;
}

/**
 * Global backend manifest
 */
export interface Manifest {
  version: number;

  metadataVersion: number;
  progressionVersion: number;
  eventsVersion: number;

  metadata: Record<string, number>;

  progression: Record<string, number>;

  events: Record<string, number> & {
    hammerJam?: number;
  };
}

/**
 * One progression level
 */
export interface ProgressionLevel {
  hallLevel: number;
  cost: number;
  upgradeTime?: number;
  xp?: number;

  laboratoryLevel?: number;
  labLevel?: number;

  petHouseLevel?: number;

  stats?: Record<
    string,
    number
  >;
  extras?: Record<
    string,
    unknown
  >;
}

/**
 * One progression entity
 */
export interface ProgressionData {
  id: number;

  resource: ResourceType;

  maxLevel: number;
  /** Highest available Supercharge level, independent of normal maxLevel. */
  scMaxLevel?: number;
  /** Supercharge progression keyed by target charge level (e.g. "1", "2"). */
  supercharge?: Record<number, ProgressionLevel>;
  maxHallLevel: number;
  levels: Record<
    number,
    ProgressionLevel
  >;

  combat?: Record<
    string,
    unknown
  >;

  ability?: Record<
    string,
    unknown
  >;

  extras?: Record<
    string,
    unknown
  >;
}