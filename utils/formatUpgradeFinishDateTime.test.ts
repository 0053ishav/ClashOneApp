import { formatUpgradeFinishDateTime } from "@/utils/formatUpgradeFinishDateTime";

describe("formatUpgradeFinishDateTime", () => {
  it("formats the timestamp with the device locale and timezone", () => {
    const timestamp = new Date("2026-10-19T12:30:00.000Z").getTime();
    const expected = new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));

    expect(formatUpgradeFinishDateTime(timestamp)).toBe(expected);
  });
});
