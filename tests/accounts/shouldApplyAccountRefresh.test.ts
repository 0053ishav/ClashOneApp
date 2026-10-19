import { shouldApplyAccountRefresh } from "@/utils/shouldApplyAccountRefresh";

describe("shouldApplyAccountRefresh", () => {
  it("accepts a result only when its request is newest and its account is still active", () => {
    expect(
      shouldApplyAccountRefresh({
        requestId: 3,
        latestRequestId: 3,
        requestedTag: "#B",
        activeTag: "#B",
      }),
    ).toBe(true);
  });

  it("rejects a slow response from the previously active account", () => {
    expect(
      shouldApplyAccountRefresh({
        requestId: 1,
        latestRequestId: 2,
        requestedTag: "#A",
        activeTag: "#B",
      }),
    ).toBe(false);
  });

  it("rejects a superseded refresh for the same account", () => {
    expect(
      shouldApplyAccountRefresh({
        requestId: 1,
        latestRequestId: 2,
        requestedTag: "#A",
        activeTag: "#A",
      }),
    ).toBe(false);
  });

  it("rejects a result when there is no active account", () => {
    expect(
      shouldApplyAccountRefresh({
        requestId: 1,
        latestRequestId: 1,
        requestedTag: "#A",
        activeTag: null,
      }),
    ).toBe(false);
  });
});
