import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { UpgradeDetailSheet } from "@/components/planner/UpgradeDetailSheet";
import { useHomeColors } from "@/theme/useHomeColors";
import type {
  ObservedActiveUpgrade,
  PlannedUpgradeItem,
  ProgressionCandidate,
  UpgradeProjection,
} from "@/types/planner";
import { getPlannerViewModel } from "@/utils/planner/plannerViewModel";

type TimelineScale = "days" | "weeks" | "months";

interface PlannerTimelineProps {
  items: readonly PlannedUpgradeItem[];
  projections: readonly UpgradeProjection[];
  candidates: readonly ProgressionCandidate[];
  entityNamesById: Readonly<Record<string, string>>;
  liveUpgrades: readonly ObservedActiveUpgrade[];
  builderCount: number;
  nowMs: number;
  queueBusy?: boolean;
  onEditPlannedItem?: (item: PlannedUpgradeItem) => void;
  onRemovePlannedItem?: (itemId: PlannedUpgradeItem["id"]) => void;
}

interface TimelineLane {
  key: string;
  label: string;
  assignment: PlannedUpgradeItem["lane"] | ObservedActiveUpgrade["lane"];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SCALE_CONFIG: Record<TimelineScale, { days: number; pixelsPerDay: number; tickDays: number; label: string }> = {
  days: { days: 30, pixelsPerDay: 18, tickDays: 1, label: "Days" },
  weeks: { days: 90, pixelsPerDay: 8, tickDays: 7, label: "Weeks" },
  months: { days: 365, pixelsPerDay: 3, tickDays: 30, label: "Months" },
};

function laneKey(lane: PlannedUpgradeItem["lane"] | ObservedActiveUpgrade["lane"]): string {
  return lane.lane === "normal-builders" ? `normal-builders:${lane.builderIndex}` : lane.lane;
}

function formatDate(timestampMs: number, includeYear = false): string {
  return new Date(timestampMs).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "2-digit" } : {}),
  });
}

export function getBlockPosition(
  startMs: number,
  endMs: number,
  nowMs: number,
  windowDays: number,
  pixelsPerDay: number,
): { left: number; width: number } | null {
  const windowEnd = nowMs + windowDays * DAY_MS;
  if (endMs < nowMs || startMs > windowEnd) return null;
  const startOffset = Math.max(0, startMs - nowMs);
  const endOffset = Math.min(windowEnd, Math.max(endMs, startMs + 60 * 60 * 1000)) - nowMs;
  return {
    left: (startOffset / DAY_MS) * pixelsPerDay,
    width: Math.max(8, ((endOffset - startOffset) / DAY_MS) * pixelsPerDay),
  };
}

export function PlannerTimeline({
  items,
  projections,
  candidates,
  entityNamesById,
  liveUpgrades,
  builderCount,
  nowMs,
  queueBusy = false,
  onEditPlannedItem,
  onRemovePlannedItem,
}: PlannerTimelineProps) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [scale, setScale] = useState<TimelineScale>("weeks");
  const [selectedItemId, setSelectedItemId] = useState<PlannedUpgradeItem["id"] | null>(null);
  const config = SCALE_CONFIG[scale];
  const timelineWidth = config.days * config.pixelsPerDay;
  const candidateById = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.candidateId, candidate])),
    [candidates],
  );
  const projectionByItemId = useMemo(
    () => new Map(projections.map((projection) => [projection.plannedItemId, projection])),
    [projections],
  );

  const lanes = useMemo<TimelineLane[]>(() => {
    const result: TimelineLane[] = [];
    const requiredBuilderCount = Math.max(
      builderCount,
      ...items.map((item) => item.lane.lane === "normal-builders" ? item.lane.builderIndex : 0),
      ...liveUpgrades.map((upgrade) => upgrade.lane.lane === "normal-builders" ? upgrade.lane.builderIndex : 0),
    );
    for (let index = 1; index <= Math.max(0, Math.min(requiredBuilderCount, 6)); index += 1) {
      result.push({
        key: `normal-builders:${index}`,
        label: `Builder ${index}`,
        assignment: { lane: "normal-builders", builderIndex: index },
      });
    }
    result.push({ key: "laboratory", label: "Laboratory", assignment: { lane: "laboratory" } });
    result.push({ key: "pets", label: "Pets", assignment: { lane: "pets" } });
    const hasGoblinBuilder = items.some((item) => item.lane.lane === "goblin-builder") ||
      liveUpgrades.some((upgrade) => upgrade.lane.lane === "goblin-builder");
    const hasGoblinLab = items.some((item) => item.lane.lane === "goblin-laboratory") ||
      liveUpgrades.some((upgrade) => upgrade.lane.lane === "goblin-laboratory");
    if (hasGoblinBuilder) {
      result.push({ key: "goblin-builder", label: "Goblin", assignment: { lane: "goblin-builder" } });
    }
    if (hasGoblinLab) {
      result.push({ key: "goblin-laboratory", label: "Goblin Lab", assignment: { lane: "goblin-laboratory" } });
    }
    return result;
  }, [builderCount, items, liveUpgrades]);

  const viewModel = getPlannerViewModel(projections, items.length);
  const {
    scheduledProjections: scheduled,
    unknownCount,
    blockedCount,
    projectedFinishMs: projectedFinish,
    hasIncompleteWork,
    knownCostProjections,
    unknownScheduledCostCount,
    resourceTotals,
  } = viewModel;
  const laneCounts = lanes.map((lane) => ({
    ...lane,
    count: items.filter((item) => laneKey(item.lane) === lane.key).length,
  })).filter((lane) => lane.count > 0);

  const formatResource = (amount: number) =>
    new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(amount);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Plan timeline</Text>
          <Text style={styles.subtitle}>Projected work only · live timers stay locked</Text>
        </View>
        <View style={styles.countPill}>
          <Text style={styles.countText}>{items.length} actions</Text>
        </View>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Projected finish</Text>
          <Text style={styles.summaryValue}>
            {items.length === 0 ? "No plan yet" : hasIncompleteWork ? "Estimate incomplete" : projectedFinish === null ? "Not scheduled" : formatDate(projectedFinish, true)}
          </Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryLabel}>Schedule status</Text>
          <Text style={styles.summaryValue}>
            {scheduled.length} scheduled · {blockedCount} blocked · {unknownCount} unknown
          </Text>
        </View>
      </View>

      <View style={styles.scaleRow} accessibilityRole="tablist" accessibilityLabel="Timeline scale">
        {(Object.keys(SCALE_CONFIG) as TimelineScale[]).map((option) => {
          const selected = option === scale;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={`Timeline scale: ${SCALE_CONFIG[option].label}`}
              accessibilityState={{ selected }}
              onPress={() => setScale(option)}
              style={[styles.scaleButton, selected && styles.scaleButtonSelected]}
            >
              <Text style={[styles.scaleButtonText, selected && styles.scaleButtonTextSelected]}>
                {SCALE_CONFIG[option].label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {items.length === 0 && liveUpgrades.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Your timeline starts here</Text>
          <Text style={styles.subtitle}>Add an upgrade from the catalog to see its projected start and finish.</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.timelineScroll}>
          <View>
            <View style={styles.axisRow}>
              <View style={styles.laneLabel}>
                <Text style={styles.axisLabel}>Lane</Text>
              </View>
              <View style={[styles.axis, { width: timelineWidth }]}>
                {projectedFinish !== null &&
                  projectedFinish >= nowMs &&
                  projectedFinish <= nowMs + config.days * DAY_MS && (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.finishMarker,
                        { left: ((projectedFinish - nowMs) / DAY_MS) * config.pixelsPerDay },
                      ]}
                    >
                      <Text style={styles.finishMarkerLabel}>Finish estimate</Text>
                    </View>
                  )}
                {Array.from({ length: Math.floor(config.days / config.tickDays) + 1 }, (_, index) => {
                  const day = index * config.tickDays;
                  return (
                    <View key={day} style={[styles.tick, { left: day * config.pixelsPerDay }]}>
                      <Text style={styles.axisLabel}>
                        {day === 0 ? "Today" : formatDate(nowMs + day * DAY_MS)}
                      </Text>
                      <View style={styles.tickLine} />
                    </View>
                  );
                })}
              </View>
            </View>

            {lanes.map((lane) => (
              <View key={lane.key} style={styles.laneRow}>
                <View style={styles.laneLabel}>
                  <Text numberOfLines={2} style={styles.laneText}>{lane.label}</Text>
                </View>
                <View style={[styles.track, { width: timelineWidth }]}>
                  {Array.from({ length: Math.floor(config.days / config.tickDays) + 1 }, (_, index) => (
                    <View
                      key={index}
                      style={[styles.gridLine, { left: index * config.tickDays * config.pixelsPerDay }]}
                    />
                  ))}
                  {liveUpgrades.filter((upgrade) => laneKey(upgrade.lane) === lane.key).map((upgrade) => {
                    const position = getBlockPosition(upgrade.startsAtMs, upgrade.completesAtMs, nowMs, config.days, config.pixelsPerDay);
                    if (!position) return null;
                    return (
                      <View
                        key={upgrade.observedUpgradeId}
                        style={[styles.block, styles.liveBlock, { left: position.left, width: position.width }]}
                        accessibilityLabel={`Live upgrade locked on ${lane.label}`}
                      >
                        <Text numberOfLines={1} style={styles.liveBlockText}>🔒 Live</Text>
                      </View>
                    );
                  })}
                  {items.filter((item) => laneKey(item.lane) === lane.key).map((item) => {
                    const projection = projectionByItemId.get(item.id);
                    const candidate = candidateById.get(item.candidateId);
                    const name = candidate ? entityNamesById[candidate.entityId] ?? item.candidateId : item.candidateId;
                    if (projection?.status === "scheduled") {
                      const position = getBlockPosition(projection.startsAtMs, projection.completesAtMs, nowMs, config.days, config.pixelsPerDay);
                      if (!position) return null;
                      const selected = selectedItemId === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => setSelectedItemId(item.id)}
                          hitSlop={7}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`${name}, level ${candidate?.currentLevel ?? "unknown"} to ${item.targetLevel}, scheduled from ${formatDate(projection.startsAtMs)} to ${formatDate(projection.completesAtMs)}`}
                          style={[
                            styles.block,
                            styles.plannedBlock,
                            selected && styles.selectedPlannedBlock,
                            { left: position.left, width: position.width },
                          ]}
                        >
                          <Text numberOfLines={1} style={styles.plannedBlockText}>{name}</Text>
                        </Pressable>
                      );
                    }
                    const unknown = projection?.status === "unknown";
                    const selected = selectedItemId === item.id;
                    return (
                        <Pressable
                          key={item.id}
                          onPress={() => setSelectedItemId(item.id)}
                          hitSlop={7}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          style={[
                            styles.block,
                            unknown ? styles.unknownBlock : styles.blockedBlock,
                            selected && styles.selectedUnscheduledBlock,
                            { left: 3, width: Math.max(64, Math.min(150, timelineWidth * 0.28)) },
                          ]}
                          accessibilityLabel={`${name}, level ${candidate?.currentLevel ?? "unknown"} to ${item.targetLevel}, ${unknown ? "estimate unknown" : "blocked or not scheduled"}`}
                        >
                          <Text numberOfLines={1} style={unknown ? styles.unknownBlockText : styles.blockedBlockText}>
                            {unknown ? "Unknown" : "Blocked"} · {name}
                          </Text>
                        </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.plannedSwatch]} /><Text style={styles.legendText}>Planned</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.liveSwatch]} /><Text style={styles.legendText}>Live · locked</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.blockedSwatch]} /><Text style={styles.legendText}>Blocked</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendSwatch, styles.unknownSwatch]} /><Text style={styles.legendText}>Unknown</Text></View>
      </View>
      {items.length > 0 && (
        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>Plan details</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailCell}>
              <Text style={styles.summaryLabel}>Queued actions</Text>
              <Text style={styles.detailValue}>{items.length}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={styles.summaryLabel}>Live timers locked</Text>
              <Text style={styles.detailValue}>{liveUpgrades.length}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={styles.summaryLabel}>Active lanes</Text>
              <Text style={styles.detailValue}>{laneCounts.length}</Text>
            </View>
          </View>
          {laneCounts.length > 0 && (
            <View style={styles.laneSummaryList}>
              {laneCounts.map((lane) => (
                <View key={lane.key} style={styles.laneSummaryRow}>
                  <Text style={styles.laneSummaryLabel}>{lane.label}</Text>
                  <Text style={styles.laneSummaryCount}>{lane.count} {lane.count === 1 ? "upgrade" : "upgrades"}</Text>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.assumptionText}>
            Scheduling follows queue order within each lane. Different lanes may progress in parallel. Live timers reserve their lanes and are never changed by this plan.
          </Text>
        </View>
      )}

      {items.length > 0 && (
        <View style={styles.detailsSection}>
          <Text style={styles.detailsTitle}>Known resource totals</Text>
          <Text style={styles.assumptionText}>Scheduler-provided costs for scheduled upgrades only.</Text>
          {knownCostProjections.length === 0 ? (
            <Text style={styles.detailValue}>No known costs available yet</Text>
          ) : (
            <View style={styles.resourceRow}>
              {resourceTotals.gold > 0 && (
                <View style={styles.resourceCell}>
                  <Text style={styles.resourceLabel}>Gold</Text>
                  <Text style={styles.detailValue}>{formatResource(resourceTotals.gold)}</Text>
                </View>
              )}
              {resourceTotals.elixir > 0 && (
                <View style={styles.resourceCell}>
                  <Text style={styles.resourceLabel}>Elixir</Text>
                  <Text style={styles.detailValue}>{formatResource(resourceTotals.elixir)}</Text>
                </View>
              )}
              {resourceTotals.darkElixir > 0 && (
                <View style={styles.resourceCell}>
                  <Text style={styles.resourceLabel}>Dark elixir</Text>
                  <Text style={styles.detailValue}>{formatResource(resourceTotals.darkElixir)}</Text>
                </View>
              )}
            </View>
          )}
          {unknownScheduledCostCount > 0 && (
            <Text style={styles.incompleteNote}>
              Costs are unknown for {unknownScheduledCostCount} scheduled {unknownScheduledCostCount === 1 ? "upgrade" : "upgrades"} and are excluded from these totals.
            </Text>
          )}
        </View>
      )}


      {(() => {
        const selectedItem = items.find((item) => item.id === selectedItemId);
        if (!selectedItem) return null;
        const selectedCandidate = candidateById.get(selectedItem.candidateId);
        const selectedProjection = projectionByItemId.get(selectedItem.id);
        const selectedName = selectedCandidate
          ? entityNamesById[selectedCandidate.entityId] ?? selectedItem.candidateId
          : selectedItem.candidateId;
        return (
          <UpgradeDetailSheet
            visible
            item={selectedItem}
            candidate={selectedCandidate}
            projection={selectedProjection}
            name={selectedName}
            queueBusy={queueBusy}
            onClose={() => setSelectedItemId(null)}
            onEdit={onEditPlannedItem ? () => { setSelectedItemId(null); onEditPlannedItem(selectedItem); } : undefined}
            onRemove={onRemovePlannedItem ? () => { setSelectedItemId(null); onRemovePlannedItem(selectedItem.id); } : undefined}
          />
        );
      })()}

      {hasIncompleteWork && items.length > 0 && (
        <Text style={styles.incompleteNote}>
          Finish estimates include scheduled work only. Blocked or unknown upgrades do not receive invented dates.
        </Text>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
    header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
    headerCopy: { flex: 1, gap: 3 },
    title: { color: colors.textPrimary, fontSize: 17, fontWeight: "800" },
    subtitle: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
    countPill: { backgroundColor: colors.surfaceRaised, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5 },
    countText: { color: colors.textSecondary, fontSize: 11, fontWeight: "700" },
    summary: { flexDirection: "row", gap: 10 },
    summaryCell: { flex: 1, minWidth: 0, gap: 4 },
    summaryLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
    summaryValue: { color: colors.textPrimary, fontSize: 12, fontWeight: "700" },
    scaleRow: { flexDirection: "row", gap: 6 },
    scaleButton: { minHeight: 44, minWidth: 64, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, overflow: "hidden" },
    scaleButtonSelected: { backgroundColor: colors.gold, borderColor: colors.gold },
    scaleButtonText: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },
    scaleButtonTextSelected: { color: colors.textDark },
    finishMarker: { position: "absolute", zIndex: 2, top: 0, bottom: 0, width: 2, backgroundColor: colors.green },
    finishMarkerLabel: { position: "absolute", top: 0, left: 4, width: 100, color: colors.green, fontSize: 10, fontWeight: "800" },
    emptyState: { backgroundColor: colors.background, borderRadius: 10, padding: 16, gap: 5 },
    emptyTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
    timelineScroll: { paddingBottom: 4 },
    axisRow: { flexDirection: "row", height: 36 },
    laneLabel: { width: 84, justifyContent: "center", paddingRight: 8, borderRightWidth: 1, borderRightColor: colors.border },
    axis: { position: "relative", height: 36 },
    axisLabel: { color: colors.textMuted, fontSize: 9 },
    tick: { position: "absolute", top: 0, width: 56, height: 36 },
    tickLine: { width: 1, height: 15, marginTop: 3, backgroundColor: colors.border },
    laneRow: { flexDirection: "row", minHeight: 46, borderTopWidth: 1, borderTopColor: colors.border },
    laneText: { color: colors.textSecondary, fontSize: 10, fontWeight: "700" },
    track: { position: "relative", height: 46, justifyContent: "center" },
    gridLine: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: colors.border, opacity: 0.5 },
    block: { position: "absolute", top: 7, height: 30, borderRadius: 6, paddingHorizontal: 6, justifyContent: "center", overflow: "hidden" },
    plannedBlock: { backgroundColor: colors.gold },
    selectedPlannedBlock: { borderWidth: 2, borderColor: colors.textPrimary },
    selectedUnscheduledBlock: { borderWidth: 2, borderColor: colors.textPrimary },
    plannedBlockText: { color: colors.textDark, fontSize: 10, fontWeight: "700" },
    liveBlock: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.borderStrong },
    liveBlockText: { color: colors.textSecondary, fontSize: 10, fontWeight: "700" },
    blockedBlock: { backgroundColor: colors.background, borderWidth: 1, borderStyle: "dashed", borderColor: colors.orangeLight },
    blockedBlockText: { color: colors.orangeLight, fontSize: 10, fontWeight: "700" },
    unknownBlock: { backgroundColor: colors.background, borderWidth: 1, borderStyle: "dashed", borderColor: colors.textMuted },
    unknownBlockText: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
    legend: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    legendSwatch: { width: 9, height: 9, borderRadius: 2 },
    plannedSwatch: { backgroundColor: colors.gold },
    liveSwatch: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.borderStrong },
    blockedSwatch: { backgroundColor: colors.orangeLight },
    unknownSwatch: { backgroundColor: colors.textMuted },
    legendText: { color: colors.textMuted, fontSize: 10 },
    detailsSection: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 9 },
    detailsTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: "800" },
    detailsGrid: { flexDirection: "row", gap: 10 },
    detailCell: { flex: 1, gap: 4 },
    detailValue: { color: colors.textPrimary, fontSize: 13, fontWeight: "700" },
    laneSummaryList: { gap: 6 },
    laneSummaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
    laneSummaryLabel: { color: colors.textSecondary, fontSize: 11 },
    laneSummaryCount: { color: colors.textPrimary, fontSize: 11, fontWeight: "700" },
    assumptionText: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
    resourceRow: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
    resourceCell: { minWidth: 74, gap: 4 },
    resourceLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700" },
    incompleteNote: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  });
}
