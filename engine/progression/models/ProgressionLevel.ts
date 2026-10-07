export interface ProgressionLevel {
  level: number;
  requiredHallLevel: number;
  cost: number;
  upgradeTime?: number;
  resource?: string;
  xp?: number;
  laboratoryLevel?: number;
  petHouseLevel?: number;
  stats?: Record<string, number>;
  extras?: Record<string, unknown>;
}