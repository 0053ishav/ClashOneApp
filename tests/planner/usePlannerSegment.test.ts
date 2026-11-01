import { act, renderHook } from "@testing-library/react-native";
import { usePlannerSegment } from "@/hooks/planner/usePlannerSegment";

describe("usePlannerSegment", () => {
  it("remembers the selected segment independently for each account", () => {
    const { result, rerender } = renderHook(
      ({ accountTag }: { accountTag: string | null }) => usePlannerSegment(accountTag),
      { initialProps: { accountTag: "#PLANNER-SEGMENT-A" } },
    );

    act(() => result.current.setSegment("add"));
    expect(result.current.segment).toBe("add");

    rerender({ accountTag: "#PLANNER-SEGMENT-B" });
    expect(result.current.segment).toBe("plan");
    act(() => result.current.setSegment("details"));

    rerender({ accountTag: "#PLANNER-SEGMENT-A" });
    expect(result.current.segment).toBe("add");

    rerender({ accountTag: "#PLANNER-SEGMENT-B" });
    expect(result.current.segment).toBe("details");
  });

  it("defaults to Plan when there is no active account", () => {
    const { result } = renderHook(() => usePlannerSegment(null));
    expect(result.current.segment).toBe("plan");
  });
});
