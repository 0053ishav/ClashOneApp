import { PlannerQueueList, type PlannerQueueListProps } from "@/components/planner/PlannerQueueList";
import {
  PlannerTimeline,
  type PlannerTimelineProps,
} from "@/components/planner/PlannerTimeline";
import { PlannerSummaryCard } from "@/components/planner/PlannerSummaryCard";

interface PlannerPlanViewProps {
  timelineProps: PlannerTimelineProps;
  queueProps: PlannerQueueListProps;
}

export function PlannerPlanView({ timelineProps, queueProps }: PlannerPlanViewProps) {
  return (
    <>
      <PlannerSummaryCard
        items={timelineProps.items}
        projections={timelineProps.projections}
        liveUpgrades={timelineProps.liveUpgrades}
      />
      <PlannerTimeline {...timelineProps} showDetails={false} />
      <PlannerQueueList {...queueProps} />
    </>
  );
}
