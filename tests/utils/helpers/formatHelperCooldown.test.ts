import { formatHelperCooldown } from "@/utils/helpers/formatHelperCooldown";

describe("formatHelperCooldown", () => {
  it("returns Ready when the cooldown is zero or negative", () => {
    expect(formatHelperCooldown(0)).toBe("Ready");
    expect(formatHelperCooldown(-1)).toBe("Ready");
  });

  it("converts seconds to milliseconds before formatting", () => {
    expect(formatHelperCooldown(3600)).toBe("1h 0m");
  });

  it("formats a full-day cooldown correctly", () => {
    expect(formatHelperCooldown(86400)).toBe("1d 0h");
  });

  it("rounds a partial minute up", () => {
    expect(formatHelperCooldown(90)).toBe("2m");
  });

  it("handles non-finite values safely", () => {
    expect(formatHelperCooldown(Number.NaN)).toBe("Ready");
    expect(formatHelperCooldown(Number.POSITIVE_INFINITY)).toBe("Ready");
  });
});
