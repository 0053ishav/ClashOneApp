import { useCallback, useState } from "react";
import type { PlannerSegment } from "@/components/planner/PlannerHeader";

const segmentByAccountTag = new Map<string, PlannerSegment>();

export function usePlannerSegment(activeTag: string | null) {
  const [selection, setSelection] = useState(() => ({
    accountTag: activeTag,
    segment: activeTag ? segmentByAccountTag.get(activeTag) ?? "plan" : "plan",
  }));
  const segment = selection.accountTag === activeTag
    ? selection.segment
    : activeTag
      ? segmentByAccountTag.get(activeTag) ?? "plan"
      : "plan";

  const setSegment = useCallback((nextSegment: PlannerSegment) => {
    if (activeTag) segmentByAccountTag.set(activeTag, nextSegment);
    setSelection({ accountTag: activeTag, segment: nextSegment });
  }, [activeTag]);

  return { segment, setSegment };
}
