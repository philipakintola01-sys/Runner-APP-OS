import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRunStore } from "@/context/RunStore";
import { useColors } from "@/hooks/useColors";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
  formatRelativeDate,
} from "@/utils/runUtils";

type FilterKey = "all" | "week" | "month" | "year";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

function getFilterStart(key: FilterKey): number {
  const now = new Date();
  if (key === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (key === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
  if (key === "year") {
    return new Date(now.getFullYear(), 0, 1).getTime();
  }
  return 0;
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { runs } = useRunStore();
  const [filter, setFilter] = useState<FilterKey>("all");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = useMemo(() => {
    const cutoff = getFilterStart(filter);
    return [...runs]
      .filter((r) => r.startTime >= cutoff)
      .sort((a, b) => b.startTime - a.startTime);
  }, [runs, filter]);

  const totalDist = useMemo(() => filtered.reduce((s, r) => s + r.distance, 0), [filtered]);
  const totalTime = useMemo(() => filtered.reduce((s, r) => s + r.duration, 0), [filtered]);

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
        {filtered.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryItem, { color: colors.mutedForeground }]}>
              <Text style={[styles.summaryVal, { color: colors.foreground }]}>
                {filtered.length}
              </Text>{" "}
              runs ·{" "}
              <Text style={[styles.summaryVal, { color: colors.foreground }]}>
                {(totalDist / 1000).toFixed(1)}km
              </Text>{" "}
              ·{" "}
              <Text style={[styles.summaryVal, { color: colors.foreground }]}>
                {formatDuration(totalTime)}
              </Text>
            </Text>
          </View>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[
              styles.chip,
              {
                backgroundColor: filter === f.key ? colors.primary : colors.card,
              },
            ]}
            onPress={() => setFilter(f.key)}
          >
            <Text
              style={[
                styles.chipText,
                { color: filter === f.key ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 + bottomPad }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="calendar" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No runs found</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {filter === "all" ? "Start running to see your history here." : "No runs in this period."}
            </Text>
          </View>
        }
        renderItem={({ item: run, index }) => {
          const prevRun = filtered[index + 1];
          const paceChange =
            prevRun && prevRun.avgPace > 0
              ? ((prevRun.avgPace - run.avgPace) / prevRun.avgPace) * 100
              : null;
          return (
            <View style={[styles.runCard, { backgroundColor: colors.card }]}>
              <View style={styles.runTop}>
                <View>
                  <Text style={[styles.runDate, { color: colors.mutedForeground }]}>
                    {formatRelativeDate(run.startTime)}
                  </Text>
                  <Text style={[styles.runDist, { color: colors.foreground }]}>
                    {formatDistance(run.distance)}
                  </Text>
                </View>
                <View style={[styles.paceChip, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.paceVal, { color: colors.accent }]}>
                    {formatPace(run.avgPace)}
                  </Text>
                  <Text style={[styles.paceLabel, { color: colors.mutedForeground }]}>/km</Text>
                </View>
              </View>
              <View style={[styles.runDivider, { backgroundColor: colors.border }]} />
              <View style={styles.runMeta}>
                <View style={styles.metaItem}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                    {formatDuration(run.duration)}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Feather name="zap" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                    {run.calories} kcal
                  </Text>
                </View>
                {run.elevationGain > 0 && (
                  <View style={styles.metaItem}>
                    <Feather name="trending-up" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                      +{run.elevationGain}m
                    </Text>
                  </View>
                )}
                {paceChange !== null && (
                  <View style={styles.metaItem}>
                    <Feather
                      name={paceChange > 0 ? "arrow-up" : "arrow-down"}
                      size={12}
                      color={paceChange > 0 ? colors.success : colors.destructive}
                    />
                    <Text
                      style={[
                        styles.metaText,
                        { color: paceChange > 0 ? colors.success : colors.destructive },
                      ]}
                    >
                      {Math.abs(paceChange).toFixed(1)}% pace
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingBottom: 12 },
    title: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
    summaryRow: { marginTop: 4 },
    summaryItem: { fontSize: 13 },
    summaryVal: { fontWeight: "700" as const },
    filters: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12, flexWrap: "wrap" as const },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 24 },
    chipText: { fontSize: 13, fontWeight: "600" as const },
    runCard: { borderRadius: colors.radius, padding: 16, marginBottom: 10 },
    runTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    runDate: { fontSize: 12, fontWeight: "500" as const, marginBottom: 4 },
    runDist: { fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.3 },
    paceChip: { borderRadius: 10, padding: 10, alignItems: "center" },
    paceVal: { fontSize: 18, fontWeight: "800" as const, letterSpacing: -0.2 },
    paceLabel: { fontSize: 11, marginTop: 1 },
    runDivider: { height: 1, marginVertical: 12 },
    runMeta: { flexDirection: "row", gap: 14, flexWrap: "wrap" as const },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    metaText: { fontSize: 12, fontWeight: "500" as const },
    empty: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 18, fontWeight: "700" as const, marginTop: 8 },
    emptyText: { fontSize: 14, textAlign: "center" as const, lineHeight: 20 },
  });
}
