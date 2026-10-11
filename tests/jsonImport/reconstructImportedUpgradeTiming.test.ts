import { reconstructImportedUpgradeTiming } from "@/services/jsonImport/reconstructImportedUpgradeTiming";

describe("reconstructImportedUpgradeTiming", () => {
  const exportTimestampMs = 1_800_000_000_000;
  const remainingMsAtExport = 45 * 60 * 1000;

  it("uses discounted full duration to reconstruct start time but preserves exported remaining time", () => {
    // A 120h base upgrade with a 20% Gold Pass discount takes 96h in total.
    const discountedDurationSeconds = 96 * 60 * 60;
    const result = reconstructImportedUpgradeTiming({
      totalDurationSeconds: discountedDurationSeconds,
      exportTimestampMs,
      remainingMsAtExport,
    });

    expect(result.totalDurationMs).toBe(96 * 60 * 60 * 1000);
    expect(result.endTime).toBe(exportTimestampMs + remainingMsAtExport);
    expect(result.startTime).toBe(result.endTime - result.totalDurationMs);
    expect(result.durationMinutes).toBe(96 * 60);
    expect(result.endTime - exportTimestampMs).toBe(remainingMsAtExport);
  });

  it("rejects negative full durations before reconstructing a timer", () => {
    expect(() => reconstructImportedUpgradeTiming({
      totalDurationSeconds: -1,
      exportTimestampMs,
      remainingMsAtExport,
    })).toThrow("INVALID_IMPORTED_UPGRADE_DURATION");
  });
});
