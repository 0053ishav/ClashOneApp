export type ReconstructedImportedUpgradeTiming = {
  totalDurationMs: number;
  endTime: number;
  startTime: number;
  durationMinutes: number;
};

export type ReconstructImportedUpgradeTimingInput = {
  /** Total full-upgrade duration already adjusted by the chosen modifiers, in seconds. */
  totalDurationSeconds: number;
  exportTimestampMs: number;
  /** Remaining time read from the game export; this is authoritative. */
  remainingMsAtExport: number;
};

/**
 * Reconstruct the original start time without applying any discount to the
 * exported remaining timer. Gold Pass affects only the estimated full duration.
 */
export function reconstructImportedUpgradeTiming({
  totalDurationSeconds,
  exportTimestampMs,
  remainingMsAtExport,
}: ReconstructImportedUpgradeTimingInput): ReconstructedImportedUpgradeTiming {
  if (!Number.isFinite(totalDurationSeconds) || totalDurationSeconds < 0) {
    throw new Error("INVALID_IMPORTED_UPGRADE_DURATION");
  }
  if (!Number.isFinite(exportTimestampMs) || exportTimestampMs < 0) {
    throw new Error("INVALID_EXPORT_TIMESTAMP");
  }
  if (!Number.isFinite(remainingMsAtExport) || remainingMsAtExport < 0) {
    throw new Error("INVALID_REMAINING_TIME");
  }

  const totalDurationMs = totalDurationSeconds * 1000;
  const endTime = exportTimestampMs + remainingMsAtExport;

  return {
    totalDurationMs,
    endTime,
    startTime: endTime - totalDurationMs,
    durationMinutes: Math.ceil(totalDurationMs / 60_000),
  };
}
