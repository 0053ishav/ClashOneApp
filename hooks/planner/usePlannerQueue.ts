import { useEffect, useReducer, useRef, useState } from "react";
import type {
  ObservedActiveUpgrade,
  PlannerItemId,
  PlannerLaneAssignment,
  PlannerPlan,
  PlannerPlanId,
  PlannedUpgradeItem,
  ProgressionCandidate,
  UpgradeProjection,
} from "@/types/planner";
import type { StructureInstanceRecord } from "@/services/planner/structureInstanceService";
import {
  acknowledgePlannerSnapshot,
  createPlannerPlan,
  listPlannerPlans,
  replacePlannerQueue,
} from "@/services/plannerPersistenceService";
import {
  addPlannerQueueItem,
  getDefaultPlannerLane,
  movePlannerQueueItem,
  removePlannerQueueItem,
  updatePlannerQueueItem,
} from "@/services/planner/plannerQueueService";
import { schedulePlanner } from "@/utils/planner/schedulePlanner";
import {
  getPlannerCandidateMaximumLevel,
  preparePlannerScheduleInput,
} from "@/utils/planner/preparePlannerScheduleInput";
import type {
  PlannerLaneAvailability,
  PlannerPrerequisiteState,
} from "@/utils/planner/schedulePlanner";
import { useAccountStore } from "@/stores/accountStore";

interface QueueEditOwner {
  accountTag: string;
  planId: PlannerPlanId;
}

interface PendingQueueEdit {
  accountTag: string;
  planId: PlannerPlanId;
  itemId: PlannerItemId;
  items: PlannedUpgradeItem[];
  projections: readonly UpgradeProjection[];
  beforeProjections: readonly UpgradeProjection[];
}

type QueueEditPhase = "idle" | "editing" | "previewing" | "saving" | "failed";

interface QueueEditState {
  phase: QueueEditPhase;
  editingQueueItemId: PlannerItemId | null;
  editingQueueOwner: QueueEditOwner | null;
  queueTargetDrafts: Record<string, string>;
  queueLaneDrafts: Record<string, PlannerLaneAssignment>;
  queueOrderDrafts: Record<string, number>;
  queueEditErrors: Record<string, string>;
  pendingQueueEdit: PendingQueueEdit | null;
}

type QueueEditAction =
  | { type: "begin"; owner: QueueEditOwner; item: PlannedUpgradeItem }
  | { type: "target-draft"; itemId: PlannerItemId; value: string }
  | { type: "lane-draft"; itemId: PlannerItemId; lane: PlannerLaneAssignment }
  | { type: "order-draft"; itemId: PlannerItemId; order: number }
  | { type: "error"; itemId: PlannerItemId; message: string }
  | { type: "clear-error"; itemId: PlannerItemId }
  | { type: "preview"; pending: PendingQueueEdit }
  | { type: "cancel-preview" }
  | { type: "cancel-edit" }
  | { type: "saving" }
  | { type: "save-failed" }
  | { type: "save-succeeded"; itemId: PlannerItemId }
  | { type: "clear-stale-preview" };

const initialEditState: QueueEditState = {
  phase: "idle",
  editingQueueItemId: null,
  editingQueueOwner: null,
  queueTargetDrafts: {},
  queueLaneDrafts: {},
  queueOrderDrafts: {},
  queueEditErrors: {},
  pendingQueueEdit: null,
};

function queueEditReducer(state: QueueEditState, action: QueueEditAction): QueueEditState {
  switch (action.type) {
    case "begin": {
      const queueEditErrors = { ...state.queueEditErrors };
      delete queueEditErrors[action.item.id];
      return {
        ...state,
        phase: "editing",
        editingQueueItemId: action.item.id,
        editingQueueOwner: action.owner,
        queueTargetDrafts: {
          ...state.queueTargetDrafts,
          [action.item.id]: String(action.item.targetLevel),
        },
        queueLaneDrafts: {
          ...state.queueLaneDrafts,
          [action.item.id]: action.item.lane,
        },
        queueOrderDrafts: {
          ...state.queueOrderDrafts,
          [action.item.id]: action.item.order,
        },
        queueEditErrors,
        pendingQueueEdit: null,
      };
    }
    case "target-draft":
      return {
        ...state,
        phase: "editing",
        queueTargetDrafts: {
          ...state.queueTargetDrafts,
          [action.itemId]: action.value.replace(/[^0-9]/g, ""),
        },
      };
    case "lane-draft":
      return {
        ...state,
        phase: "editing",
        queueLaneDrafts: { ...state.queueLaneDrafts, [action.itemId]: action.lane },
      };
    case "order-draft":
      return {
        ...state,
        phase: "editing",
        queueOrderDrafts: { ...state.queueOrderDrafts, [action.itemId]: action.order },
      };
    case "error":
      return {
        ...state,
        phase: state.pendingQueueEdit ? "previewing" : "editing",
        queueEditErrors: { ...state.queueEditErrors, [action.itemId]: action.message },
      };
    case "clear-error": {
      const queueEditErrors = { ...state.queueEditErrors };
      delete queueEditErrors[action.itemId];
      return { ...state, queueEditErrors };
    }
    case "preview":
      return { ...state, phase: "previewing", pendingQueueEdit: action.pending };
    case "cancel-preview":
      return {
        ...state,
        phase: state.editingQueueItemId ? "editing" : "idle",
        pendingQueueEdit: null,
      };
    case "cancel-edit":
      return {
        ...state,
        phase: "idle",
        editingQueueItemId: null,
        editingQueueOwner: null,
        pendingQueueEdit: null,
      };
    case "saving":
      return { ...state, phase: "saving" };
    case "save-failed":
      return { ...state, phase: "failed" };
    case "save-succeeded": {
      const queueEditErrors = { ...state.queueEditErrors };
      delete queueEditErrors[action.itemId];
      return {
        ...state,
        phase: "idle",
        editingQueueItemId: null,
        editingQueueOwner: null,
        pendingQueueEdit: null,
        queueEditErrors,
      };
    }
    case "clear-stale-preview":
      return {
        ...state,
        phase: state.editingQueueItemId ? "editing" : "idle",
        pendingQueueEdit: null,
      };
  }
}

interface UsePlannerQueueInput {
  activeTag: string | null;
  plannerCandidates: readonly ProgressionCandidate[];
  observedUpgrades: readonly ObservedActiveUpgrade[] | null;
  prerequisiteState: PlannerPrerequisiteState;
  laneAvailability: PlannerLaneAvailability;
}

export function usePlannerQueue({
  activeTag,
  plannerCandidates,
  observedUpgrades,
  prerequisiteState,
  laneAvailability,
}: UsePlannerQueueInput) {
  const profilesByTag = useAccountStore((state) => state.profilesByTag);
  const lastJsonSyncMap = useAccountStore((state) => state.lastJsonSyncMap);
  const [queuePlan, setQueuePlan] = useState<PlannerPlan | null>(null);
  const [queueBusy, setQueueBusy] = useState(false);
  const [snapshotReviewBusy, setSnapshotReviewBusy] = useState(false);
  const [queueErrorState, setQueueErrorState] = useState<{
    accountTag: string | null;
    message: string;
  } | null>(null);
  const [editState, dispatchEdit] = useReducer(queueEditReducer, initialEditState);
  const nextItemId = useRef(0);
  const queueWriteInFlight = useRef(false);

  const queueError = queueErrorState?.accountTag === activeTag
    ? queueErrorState.message
    : null;
  const setQueueError = (message: string | null) => {
    setQueueErrorState(message === null ? null : { accountTag: activeTag, message });
  };
  const activeQueuePlan = queuePlan?.accountTag === activeTag ? queuePlan : null;
  const lastJsonSyncAtMs = activeTag ? lastJsonSyncMap[activeTag] : undefined;
  const hasQueueEditConflict = Boolean(
    editState.editingQueueOwner &&
    (editState.editingQueueOwner.accountTag !== activeTag ||
      editState.editingQueueOwner.planId !== queuePlan?.id),
  );
  const snapshotReviewRequired = Boolean(
    activeQueuePlan &&
    (activeQueuePlan.snapshotAtMs === null ||
      lastJsonSyncAtMs === undefined ||
      lastJsonSyncAtMs > activeQueuePlan.snapshotAtMs),
  );

  useEffect(() => {
    dispatchEdit({ type: "clear-stale-preview" });
  }, [activeTag, queuePlan?.id]);

  useEffect(() => {
    let cancelled = false;
    if (!activeTag) {
      setQueuePlan(null);
      setQueueError(null);
      return;
    }
    setQueuePlan(null);
    setQueueError(null);
    void listPlannerPlans(activeTag)
      .then(async (plans) => {
        if (cancelled) return;
        const plan = plans[0] ?? await createPlannerPlan(
          activeTag,
          `planner-${Date.now()}-${nextItemId.current++}` as PlannerPlanId,
          Date.now(),
          useAccountStore.getState().lastJsonSyncMap[activeTag] ?? null,
        );
        if (!cancelled) setQueuePlan(plan);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setQueueError(loadError instanceof Error ? loadError.message : "Could not load the upgrade queue.");
        }
      });
    return () => { cancelled = true; };
  }, [activeTag]);

  const persistQueue = async (
    items: readonly PlannedUpgradeItem[],
    editSaveItemId?: PlannerItemId,
  ): Promise<boolean> => {
    if (!activeTag || !queuePlan || queuePlan.accountTag !== activeTag ||
      queueWriteInFlight.current) return false;
    queueWriteInFlight.current = true;
    if (editSaveItemId) dispatchEdit({ type: "saving" });
    setQueueBusy(true);
    setQueueError(null);
    const now = Date.now();
    const timestampedItems = items.map((item) => ({
      ...item,
      updatedAtMs: Math.max(now, item.createdAtMs),
    }));
    try {
      await replacePlannerQueue(activeTag, queuePlan.id, timestampedItems, now);
      setQueuePlan((previous) =>
        previous && previous.accountTag === activeTag && previous.id === queuePlan.id
          ? { ...previous, items: timestampedItems, updatedAtMs: now }
          : previous,
      );
      if (editSaveItemId) dispatchEdit({ type: "save-succeeded", itemId: editSaveItemId });
      return true;
    } catch (saveError: unknown) {
      setQueueError(saveError instanceof Error ? saveError.message : "Could not save the upgrade queue.");
      if (editSaveItemId) dispatchEdit({ type: "save-failed" });
      return false;
    } finally {
      queueWriteInFlight.current = false;
      setQueueBusy(false);
    }
  };

  const beginQueueItemEdit = (item: PlannedUpgradeItem) => {
    if (!activeTag || !queuePlan || queuePlan.accountTag !== activeTag ||
      hasQueueEditConflict || queueBusy || editState.pendingQueueEdit) return;
    dispatchEdit({
      type: "begin",
      owner: { accountTag: activeTag, planId: queuePlan.id },
      item,
    });
  };

  const saveQueueItemEdit = async (
    item: PlannedUpgradeItem,
    savedProjections: readonly UpgradeProjection[],
  ) => {
    if (!activeTag || !queuePlan || queuePlan.accountTag !== activeTag || queueBusy ||
      editState.pendingQueueEdit ||
      editState.editingQueueOwner?.accountTag !== activeTag ||
      editState.editingQueueOwner.planId !== queuePlan.id) return;
    const candidate = plannerCandidates.find((entry) => entry.candidateId === item.candidateId);
    if (!candidate) {
      dispatchEdit({
        type: "error",
        itemId: item.id,
        message: "This upgrade is missing from the current catalog. Sync game data before editing it.",
      });
      return;
    }

    const targetText = editState.queueTargetDrafts[item.id] ?? String(item.targetLevel);
    const targetLevel = Number(targetText);
    const maximumLevel = getPlannerCandidateMaximumLevel(plannerCandidates, item.candidateId);
    if (!/^\d+$/.test(targetText) || !Number.isSafeInteger(targetLevel) ||
      targetLevel <= candidate.currentLevel || maximumLevel === undefined || targetLevel > maximumLevel) {
      dispatchEdit({
        type: "error",
        itemId: item.id,
        message: `Target level must be a whole number above level ${candidate.currentLevel} and no higher than ${maximumLevel ?? candidate.targetLevel}.`,
      });
      return;
    }

    const lane = editState.queueLaneDrafts[item.id] ?? item.lane;
    const defaultLane = getDefaultPlannerLane(candidate.category);
    const laneCompatible = defaultLane.lane === "normal-builders"
      ? lane.lane === "normal-builders" &&
        Number.isSafeInteger(lane.builderIndex) &&
        lane.builderIndex >= 1 &&
        lane.builderIndex <= (profilesByTag[activeTag]?.normalBuilderCount ?? 0)
      : lane.lane === defaultLane.lane;
    if (!laneCompatible) {
      dispatchEdit({
        type: "error",
        itemId: item.id,
        message: "Choose a lane compatible with this upgrade and available on this account.",
      });
      return;
    }

    let updatedItems: PlannedUpgradeItem[];
    try {
      updatedItems = updatePlannerQueueItem(queuePlan.items, item.id, {
        candidateId: item.candidateId,
        targetLevel,
        lane,
        ...(item.structureInstanceId ? { structureInstanceId: item.structureInstanceId } : {}),
      });
      const targetOrder = editState.queueOrderDrafts[item.id] ?? item.order;
      if (targetOrder !== updatedItems.find((queued) => queued.id === item.id)?.order) {
        updatedItems = movePlannerQueueItem(updatedItems, item.id, targetOrder);
      }
    } catch (mutationError: unknown) {
      dispatchEdit({
        type: "error",
        itemId: item.id,
        message: mutationError instanceof Error ? mutationError.message : "Could not update this queue item.",
      });
      return;
    }

    if (snapshotReviewRequired || observedUpgrades === null) {
      dispatchEdit({
        type: "error",
        itemId: item.id,
        message: snapshotReviewRequired
          ? "Review the latest village snapshot before previewing schedule changes."
          : "A live timer has no confirmed lane; the edited schedule cannot be previewed safely.",
      });
      return;
    }

    const scheduleInput = preparePlannerScheduleInput(plannerCandidates, updatedItems);
    const previewProjections = schedulePlanner({
      nowMs: Date.now(),
      candidates: scheduleInput.candidates,
      items: scheduleInput.items,
      observedActiveUpgrades: observedUpgrades,
      prerequisiteState,
      laneAvailability,
    });
    dispatchEdit({
      type: "preview",
      pending: {
        accountTag: activeTag,
        planId: queuePlan.id,
        itemId: item.id,
        items: updatedItems,
        projections: previewProjections,
        beforeProjections: savedProjections,
      },
    });
  };

  const addToQueue = async (
    candidateId: string,
    targetLevel: number,
    structureInstanceId?: StructureInstanceRecord["id"],
  ): Promise<boolean> => {
    if (!queuePlan || queuePlan.accountTag !== activeTag || queueBusy || editState.pendingQueueEdit) return false;
    if (queuePlan.items.some((item) =>
      item.candidateId === candidateId && item.targetLevel === targetLevel &&
      (item.structureInstanceId ?? null) === (structureInstanceId ?? null)
    )) return false;

    const candidate = plannerCandidates.find((item) => item.candidateId === candidateId);
    if (!candidate) {
      setQueueError("This upgrade is not available in the current progression catalog. Refresh the catalog and try again.");
      return false;
    }

    const lane = getDefaultPlannerLane(candidate.category);
    const now = Date.now();
    const laneItems = queuePlan.items.filter((item) =>
      item.lane.lane === lane.lane &&
      (lane.lane !== "normal-builders" ||
        (item.lane.lane === "normal-builders" && item.lane.builderIndex === lane.builderIndex)),
    );
    const item: PlannedUpgradeItem = {
      id: `planner-item-${now}-${nextItemId.current++}` as PlannerItemId,
      candidateId,
      targetLevel,
      ...(structureInstanceId ? { structureInstanceId } : {}),
      lane,
      order: laneItems.length,
      createdAtMs: now,
      updatedAtMs: now,
    };
    try {
      return await persistQueue(addPlannerQueueItem(queuePlan.items, item));
    } catch (mutationError: unknown) {
      setQueueError(mutationError instanceof Error ? mutationError.message : "Could not update the upgrade queue.");
      return false;
    }
  };

  const removeFromQueue = (itemId: PlannerItemId) => {
    if (!queuePlan || queuePlan.accountTag !== activeTag || queueBusy || editState.pendingQueueEdit) return;
    try {
      void persistQueue(removePlannerQueueItem(queuePlan.items, itemId));
    } catch (mutationError: unknown) {
      setQueueError(mutationError instanceof Error ? mutationError.message : "Could not update the upgrade queue.");
    }
  };

  const removeEditedItem = async (itemId: PlannerItemId) => {
    if (!queuePlan || queuePlan.accountTag !== activeTag || queueBusy) return;
    try {
      const saved = await persistQueue(removePlannerQueueItem(queuePlan.items, itemId));
      if (saved) dispatchEdit({ type: "cancel-edit" });
    } catch (mutationError: unknown) {
      setQueueError(mutationError instanceof Error ? mutationError.message : "Could not update the upgrade queue.");
    }
  };

  const assignNextBuilder = (itemId: PlannerItemId) => {
    if (!queuePlan || queuePlan.accountTag !== activeTag || queueBusy || editState.pendingQueueEdit) return;
    const item = queuePlan.items.find((candidate) => candidate.id === itemId);
    const builderCount = activeTag ? profilesByTag[activeTag]?.normalBuilderCount ?? 0 : 0;
    if (!item || item.lane.lane !== "normal-builders" || builderCount < 2) return;

    const nextBuilderIndex = item.lane.builderIndex >= builderCount
      ? 1
      : item.lane.builderIndex + 1;
    try {
      void persistQueue(updatePlannerQueueItem(
        queuePlan.items,
        itemId,
        {
          candidateId: item.candidateId,
          targetLevel: item.targetLevel,
          lane: { lane: "normal-builders", builderIndex: nextBuilderIndex },
          ...(item.structureInstanceId ? { structureInstanceId: item.structureInstanceId } : {}),
        },
      ));
    } catch (mutationError: unknown) {
      setQueueError(mutationError instanceof Error ? mutationError.message : "Could not reassign the builder.");
    }
  };

  const moveQueueItem = (itemId: PlannerItemId, direction: -1 | 1) => {
    if (!queuePlan || queuePlan.accountTag !== activeTag || queueBusy || editState.pendingQueueEdit) return;
    const item = queuePlan.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const laneItems = queuePlan.items
      .filter((candidate) =>
        candidate.lane.lane === item.lane.lane &&
        (candidate.lane.lane !== "normal-builders" ||
          (item.lane.lane === "normal-builders" &&
            candidate.lane.builderIndex === item.lane.builderIndex)),
      )
      .sort((a, b) => a.order - b.order);
    const currentIndex = laneItems.findIndex((candidate) => candidate.id === itemId);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= laneItems.length) return;
    try {
      void persistQueue(movePlannerQueueItem(queuePlan.items, itemId, targetIndex));
    } catch (mutationError: unknown) {
      setQueueError(mutationError instanceof Error ? mutationError.message : "Could not reorder the upgrade queue.");
    }
  };

  const confirmQueueEdit = async (setProjectionError: (message: string | null) => void) => {
    const pending = editState.pendingQueueEdit;
    if (!pending || queueBusy || pending.accountTag !== activeTag ||
      pending.planId !== queuePlan?.id) {
      dispatchEdit({ type: "cancel-preview" });
      return;
    }
    const saved = await persistQueue(pending.items, pending.itemId);
    if (saved) {
      setProjectionError(null);
    }
  };

  const reviewSnapshotAndRecalculate = async (
    setProjectionError: (message: string | null) => void,
  ) => {
    if (!activeTag || !queuePlan || queuePlan.accountTag !== activeTag || snapshotReviewBusy) return;
    if (lastJsonSyncAtMs === undefined) {
      setProjectionError("The latest village snapshot has no recorded sync time. Sync the account data before recalculating this plan.");
      return;
    }
    setSnapshotReviewBusy(true);
    try {
      await acknowledgePlannerSnapshot(activeTag, queuePlan.id, lastJsonSyncAtMs);
      setQueuePlan((previous) => previous && previous.accountTag === activeTag && previous.id === queuePlan.id
        ? { ...previous, snapshotAtMs: lastJsonSyncAtMs }
        : previous);
      setProjectionError(null);
    } catch (reviewError: unknown) {
      setProjectionError(
        reviewError instanceof Error
          ? reviewError.message
          : "Could not record the reviewed village snapshot.",
      );
    } finally {
      setSnapshotReviewBusy(false);
    }
  };

  const setTargetDraft = (itemId: PlannerItemId, value: string) => {
    dispatchEdit({ type: "target-draft", itemId, value });
  };

  const setLaneDraft = (itemId: PlannerItemId, lane: PlannerLaneAssignment) => {
    dispatchEdit({ type: "lane-draft", itemId, lane });
    const item = queuePlan?.items.find((candidate) => candidate.id === itemId);
    if (!item || queuePlan?.accountTag !== activeTag) return;
    const matchesLane = (candidate: PlannedUpgradeItem) =>
      candidate.id !== itemId &&
      candidate.lane.lane === lane.lane &&
      (lane.lane !== "normal-builders" ||
        (candidate.lane.lane === "normal-builders" &&
          candidate.lane.builderIndex === lane.builderIndex));
    const laneItems = queuePlan.items.filter(matchesLane);
    const laneChanged = item.lane.lane !== lane.lane ||
      (lane.lane === "normal-builders" &&
        item.lane.lane === "normal-builders" &&
        item.lane.builderIndex !== lane.builderIndex);
    if (laneChanged) {
      const returningToOriginalLane = item.lane.lane === lane.lane &&
        (lane.lane !== "normal-builders" ||
          (item.lane.lane === "normal-builders" &&
            item.lane.builderIndex === lane.builderIndex));
      dispatchEdit({
        type: "order-draft",
        itemId,
        order: returningToOriginalLane
          ? Math.min(item.order, laneItems.length)
          : laneItems.length,
      });
    }
  };

  const moveDraft = (itemId: PlannerItemId, direction: -1 | 1) => {
    const item = queuePlan?.items.find((candidate) => candidate.id === itemId);
    if (!item || queuePlan?.accountTag !== activeTag) return;
    const lane = editState.queueLaneDrafts[itemId] ?? item.lane;
    const laneItems = queuePlan.items.filter((candidate) =>
      candidate.id !== itemId &&
      candidate.lane.lane === lane.lane &&
      (lane.lane !== "normal-builders" ||
        (candidate.lane.lane === "normal-builders" &&
          candidate.lane.builderIndex === lane.builderIndex)),
    );
    const laneMatchesOriginal = lane.lane === item.lane.lane &&
      (lane.lane !== "normal-builders" ||
        (item.lane.lane === "normal-builders" && lane.builderIndex === item.lane.builderIndex));
    const currentOrder = laneMatchesOriginal
      ? editState.queueOrderDrafts[itemId] ?? item.order
      : laneItems.length;
    dispatchEdit({
      type: "order-draft",
      itemId,
      order: Math.max(0, Math.min(laneItems.length, currentOrder + direction)),
    });
  };

  return {
    queuePlan: activeQueuePlan,
    queueBusy,
    snapshotReviewBusy,
    queueError,
    hasQueueEditConflict,
    snapshotReviewRequired,
    lastJsonSyncAtMs,
    editPhase: editState.phase,
    editingQueueItemId: editState.editingQueueItemId,
    editingQueueOwner: editState.editingQueueOwner,
    queueTargetDrafts: editState.queueTargetDrafts,
    queueLaneDrafts: editState.queueLaneDrafts,
    queueOrderDrafts: editState.queueOrderDrafts,
    queueEditErrors: editState.queueEditErrors,
    pendingQueueEdit: editState.pendingQueueEdit,
    setQueueError,
    beginQueueItemEdit,
    saveQueueItemEdit,
    addToQueue,
    removeFromQueue,
    removeEditedItem,
    assignNextBuilder,
    moveQueueItem,
    setTargetDraft,
    setLaneDraft,
    moveDraft,
    cancelQueueEdit: () => dispatchEdit({ type: "cancel-edit" }),
    cancelQueuePreview: () => dispatchEdit({ type: "cancel-preview" }),
    confirmQueueEdit,
    reviewSnapshotAndRecalculate,
  };
}
