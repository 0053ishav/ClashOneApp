import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useHomeColors } from "@/theme/useHomeColors";
import type { PlannerCatalogResult } from "@/services/plannerCatalogService";

export interface PlannerCatalogStateProps {
  isLoading: boolean;
  error: string | null;
  result: PlannerCatalogResult | null;
  entityCount: number;
  untrackedEntityCount: number;
  query: string;
}

export function PlannerCatalogState({
  isLoading,
  error,
  result,
  entityCount,
  untrackedEntityCount,
  query,
}: PlannerCatalogStateProps) {
  const colors = useHomeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (isLoading) {
    return (
      <View accessibilityRole="progressbar" style={styles.inlineState}>
        <ActivityIndicator color={colors.gold} />
        <Text style={styles.body}>Loading catalog…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>Catalog unavailable</Text>
        <Text accessibilityRole="alert" style={styles.body}>{error}</Text>
      </View>
    );
  }

  if (!result || result.items.length > 0) return null;

  if (result.state === "error") {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>Game data unavailable</Text>
        <Text style={styles.body}>The progression manifest or category cache is missing. Sync game data and try again.</Text>
      </View>
    );
  }

  const normalizedQuery = query.trim();
  const emptyTitle = entityCount === 0
    ? "Game entity metadata not loaded"
    : untrackedEntityCount === 0 && normalizedQuery !== ""
      ? "No matching entity metadata"
      : "No eligible upgrades yet";
  const emptyDescription = entityCount === 0
    ? "The Planner has no entity catalog to search or show level editors for. Open the Home screen and sync game data, then return here. This is different from having no eligible upgrades."
    : untrackedEntityCount === 0 && normalizedQuery !== ""
      ? `No Home Village entity name matches “${normalizedQuery}”. Try another name or clear search.`
      : "The catalog has no candidate matching the known account levels and available progression data. Missing levels are not assumed to be 0. Check the entity's current level and sync game data if its next level is missing.";

  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{emptyTitle}</Text>
      <Text style={styles.body}>{emptyDescription}</Text>
      <Text style={styles.muted}>
        Planner diagnostics · progression candidates {result.diagnosticsSummary.datasetCandidates}
        {" · "}Home Village {result.diagnosticsSummary.homeVillageCandidates}
        {" · "}known level {result.diagnosticsSummary.knownLevelCandidates}
        {" · "}next level {result.diagnosticsSummary.nextLevelCandidates}
        {" · "}category match {result.diagnosticsSummary.categoryCandidates}
        {" · "}metadata match {result.diagnosticsSummary.metadataCandidates}
        {" · "}below max {result.diagnosticsSummary.belowMaxLevelCandidates}
        {" · "}search match {result.diagnosticsSummary.queryCandidates}
        {" · "}shown {result.diagnosticsSummary.returnedItems}
      </Text>
      {result.state === "partial" && (
        <Text style={styles.muted}>Some progression categories are unavailable: {result.unavailableCategories.join(", ") || "data is incomplete"}.</Text>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useHomeColors>) {
  return StyleSheet.create({
    inlineState: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 18 },
    stateCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 4 },
    stateTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "800" },
    body: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 5 },
    muted: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  });
}
