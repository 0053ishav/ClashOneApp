import { getBlockPosition } from "@/components/planner/PlannerTimeline";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("PlannerTimeline positioning", () => {
  const nowMs = Date.UTC(2026, 9, 31);

  it("clips a live or planned block that started before today to the visible window", () => {
    expect(getBlockPosition(
      nowMs - 2 * DAY_MS,
      nowMs + 3 * DAY_MS,
      nowMs,
      30,
      10,
    )).toEqual({ left: 0, width: 30 });
  });

  it("does not render a block that finishes before the timeline begins", () => {
    expect(getBlockPosition(
      nowMs - 5 * DAY_MS,
      nowMs - DAY_MS,
      nowMs,
      30,
      10,
    )).toBeNull();
  });

  it("does not render a block outside the selected horizon", () => {
    expect(getBlockPosition(
      nowMs + 31 * DAY_MS,
      nowMs + 34 * DAY_MS,
      nowMs,
      30,
      10,
    )).toBeNull();
  });

  it("keeps an instant or very short task visible without inventing a longer duration", () => {
    expect(getBlockPosition(
      nowMs,
      nowMs,
      nowMs,
      30,
      10,
    )).toEqual({ left: 0, width: 8 });
  });
});
