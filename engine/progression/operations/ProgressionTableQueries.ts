import { ProgressionQueries } from "@/services/progression/progressionQueries";
import { getEntity } from "@/utils/getEntity";
import type { ProgressionApplicationResult } from "../models";

export interface ProgressionTableRow {
    result: ProgressionApplicationResult;

    dataId: number;
    type: string;

    name: string;
    slug?: string;
    icon?: string;

    currentLevel: number;
    nextLevel?: number;
    maxLevel: number;

    remainingLevels: number;
    isMaxLevel: boolean;

    nextCost?: number;
    resource: ProgressionApplicationResult["resource"];

    nextUpgradeTime?: number;
    remainingCost: number;
    remainingUpgradeTime: number;

    requiredHallLevel?: number;
    currentHallLevel?: number;

    progressPercent: number;
}
function isCraftedResult(
    result: ProgressionApplicationResult,
): boolean {
    return "moduleId" in result;
}

export class ProgressionTableQueries {
    static getRows(
        results: ProgressionApplicationResult[],
    ): ProgressionTableRow[] {
        return results.map((result) => {
            if (isCraftedResult(result)) {
                return {
                    result,

                    dataId: result.dataId,
                    type: "crafted",

                    name: getEntity(result.dataId).name.en,

                    currentLevel: result.currentLevel,
                    nextLevel: result.nextLevel,
                    maxLevel: result.maxLevel,

                    remainingLevels: result.remainingLevels,
                    isMaxLevel: result.isMaxLevel,

                    nextCost: result.nextCost,
                    resource: result.resource,

                    nextUpgradeTime: result.nextUpgradeTime,
                    remainingCost: result.remainingCost,
                    remainingUpgradeTime:
                        result.remainingUpgradeTime,

                    requiredHallLevel:
                        result.requiredHallLevel,

                    currentHallLevel:
                        result.currentHallLevel,

                    progressPercent:
                        result.progressPercent,
                };
            }

            const entity =
                ProgressionQueries.getEntity(
                    result.dataId,
                );

            return {
                result,

                dataId: result.dataId,
                type: entity?.type ?? "unknown",

                name:
                    entity?.name.en ??
                    entity?.slug ??
                    "Unknown",

                slug: entity?.slug,
                icon: entity?.icon,

                currentLevel: result.currentLevel,
                nextLevel: result.nextLevel,
                maxLevel: result.maxLevel,

                remainingLevels: result.remainingLevels,
                isMaxLevel: result.isMaxLevel,

                nextCost: result.nextCost,
                resource: result.resource,

                nextUpgradeTime:
                    result.nextUpgradeTime,

                remainingCost:
                    result.remainingCost,

                remainingUpgradeTime:
                    result.remainingUpgradeTime,

                requiredHallLevel:
                    result.requiredHallLevel,

                currentHallLevel:
                    result.currentHallLevel,

                progressPercent:
                    result.progressPercent,
            };
        });
    }

    static getRowsByType(
        results: ProgressionApplicationResult[],
        type: string,
    ): ProgressionTableRow[] {
        return this.getRows(results).filter(
            (row) => row.type === type,
        );
    }

    static sortByLevel(
        rows: ProgressionTableRow[],
    ): ProgressionTableRow[] {
        return [...rows].sort(
            (a, b) =>
                a.currentLevel - b.currentLevel,
        );
    }

    static sortByRemainingLevels(
        rows: ProgressionTableRow[],
    ): ProgressionTableRow[] {
        return [...rows].sort(
            (a, b) =>
                b.remainingLevels -
                a.remainingLevels,
        );
    }

    static sortByUpgradeTime(
        rows: ProgressionTableRow[],
    ): ProgressionTableRow[] {
        return [...rows].sort(
            (a, b) =>
                b.remainingUpgradeTime -
                a.remainingUpgradeTime,
        );
    }

    static sortByCost(
        rows: ProgressionTableRow[],
    ): ProgressionTableRow[] {
        return [...rows].sort(
            (a, b) =>
                b.remainingCost -
                a.remainingCost,
        );
    }

    static sortByName(
        rows: ProgressionTableRow[],
    ): ProgressionTableRow[] {
        return [...rows].sort(
            (a, b) =>
                a.name.localeCompare(b.name),
        );
    }

}

