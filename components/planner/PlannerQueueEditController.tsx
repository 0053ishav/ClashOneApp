import { PlannerQueueEditSheet } from "@/components/planner/PlannerQueueEditSheet";
import type { usePlannerCatalog } from "@/hooks/planner/usePlannerCatalog";
import type { usePlannerProjection } from "@/hooks/planner/usePlannerProjection";
import type { usePlannerQueue } from "@/hooks/planner/usePlannerQueue";
import type { ProgressionCandidate, UpgradeProjection } from "@/types/planner";
import {
  getPlannerCandidateMaximumLevel,
} from "@/utils/planner/preparePlannerScheduleInput";

interface PlannerQueueEditControllerProps {
  queue: ReturnType<typeof usePlannerQueue>;
  candidates: readonly ProgressionCandidate[];
  entitiesById: ReturnType<typeof usePlannerCatalog>["entitiesById"];
  itemNamesByCandidateId: Readonly<Record<string, string>>;
  currentProjections: readonly UpgradeProjection[];
  builderCount: number;
  setProjectionError: ReturnType<typeof usePlannerProjection>["setProjectionError"];
}

export function PlannerQueueEditController({
  queue,
  candidates,
  entitiesById,
  itemNamesByCandidateId,
  currentProjections,
  builderCount,
  setProjectionError,
}: PlannerQueueEditControllerProps) {
  const editItem = queue.queuePlan?.items.find(
    (item) => item.id === queue.editingQueueItemId,
  ) ?? null;
  const editCandidate = editItem
    ? candidates.find((candidate) => candidate.candidateId === editItem.candidateId)
    : undefined;
  const editName = editItem
    ? itemNamesByCandidateId[editItem.candidateId] ??
      (editCandidate ? entitiesById[Number(editCandidate.entityId)]?.name.en : undefined) ??
      editItem.candidateId
    : "";
  const ownerMatchesActivePlan = Boolean(
    queue.editingQueueOwner &&
    queue.editingQueueOwner.accountTag === queue.queuePlan?.accountTag &&
    queue.editingQueueOwner.planId === queue.queuePlan?.id,
  );

  return (
    <PlannerQueueEditSheet
      visible={Boolean(editItem && ownerMatchesActivePlan)}
      item={editItem}
      candidate={editCandidate}
      name={editName}
      itemsBefore={queue.queuePlan?.items ?? []}
      itemsAfter={queue.pendingQueueEdit?.items ?? queue.queuePlan?.items ?? []}
      projectionsBefore={currentProjections}
      projectionsAfter={queue.pendingQueueEdit?.projections ?? currentProjections}
      targetDraft={editItem ? queue.queueTargetDrafts[editItem.id] ?? String(editItem.targetLevel) : ""}
      laneDraft={editItem ? queue.queueLaneDrafts[editItem.id] : undefined}
      orderDraft={editItem ? queue.queueOrderDrafts[editItem.id] : undefined}
      builderCount={builderCount}
      maximumTargetLevel={editItem
        ? getPlannerCandidateMaximumLevel(candidates, editItem.candidateId) ?? editItem.targetLevel
        : 1}
      editError={editItem ? queue.queueEditErrors[editItem.id] : undefined}
      queueError={queue.queueError}
      queueBusy={queue.queueBusy}
      previewing={queue.pendingQueueEdit !== null}
      saving={queue.editPhase === "saving"}
      onTargetChange={(value) => editItem && queue.setTargetDraft(editItem.id, value)}
      onLaneChange={(lane) => editItem && queue.setLaneDraft(editItem.id, lane)}
      onMove={(direction) => editItem && queue.moveDraft(editItem.id, direction)}
      onSave={() => editItem && void queue.saveQueueItemEdit(editItem, currentProjections)}
      onConfirmSave={() => void queue.confirmQueueEdit(setProjectionError)}
      onCancel={queue.cancelQueueEdit}
      onRemove={() => {
        if (editItem) void queue.removeEditedItem(editItem.id);
      }}
    />
  );
}
