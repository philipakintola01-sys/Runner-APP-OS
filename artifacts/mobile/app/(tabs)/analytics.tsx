import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRunStore } from "@/context/RunStore";
import { useColors } from "@/hooks/useColors";
import {
  calculateStreak,
  generateInsights,
  getAveragePace,
  getBestPace,
  getConsistencyScore,
  getLongestRun,
  getWeeklyDistanceHistory,
  calculateAnnualDistance,
} from "@/utils/analytics";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatDistanceKm,
} from "@/utils/runUtils";

function WeeklyChart({ data, colors }: { data: number[]; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  const CHART_H = 100;
  const BAR_W = 30;
  const GAP = 6;
  const max = Math.max(...data, 1);
  const LABELS = ["8w", "7w", "6w", "5w", "4w", "3w", "2w", "Now"];
  const totalW = data.length * (BAR_W + GAP) - GAP;

  return (
    <Svg width={totalW} height={CHART_H + 24}>
      {data.map((val, i) => {
        const barH = Math.max((val / max) * CHART_H, val > 0 ? 6 : 0);
        const x = i * (BAR_W + GAP);
        const y = CHART_H - barH;
        const isLast = i === data.length - 1;
        return (
          <G key={i}>
            <Rect
              x={x}
              y={y}
              width={BAR_W}
              height={barH || 3}
              rx={5}
              fill={isLast ? colors.primary : colors.border}
            />
            {isLast && val > 0 && (
              <SvgText
                x={x + BAR_W / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize={10}
                fill={colors.primary}
                fontWeight="700"
              >
                {val.toFixed(1)}
              </SvgText>
            )}
            <SvgText
              x={x + BAR_W / 2}
              y={CHART_H + 18}
              textAnchor="middle"
              fontSize={9}
              fill={colors.mutedForeground}
            >
              {LABELS[i]}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { runs } = useRunStore();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const stats = useMemo(() => {
    const weeklyHistory = getWeeklyDistanceHistory(runs, 8);
    const streak = calculateStreak(runs);
    const bestPace = getBestPace(runs);
    const avgPace = getAveragePace(runs);
    const longest = getLongestRun(runs);
    const consistency = getConsistencyScore(runs);
    const annualKm = calculateAnnualDistance(runs) / 1000;
    const insights = generateInsights(runs);
    const totalRuns = runs.length;
    const totalDist = runs.reduce((s, r) => s + r.distance, 0);
    const totalTime = runs.reduce((s, r) => s + r.duration, 0);
    return { weeklyHistory, streak, bestPace, avgPace, longest, consistency, annualKm, insights, totalRuns, totalDist, totalTime };
  }, [runs]);

  const styles = makeStyles(colors);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 + bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Analytics</Text>
      </View>

      {/* Weekly Chart */}
      <View style={[styles.card, { backgroundColor: colors.card, marginHorizontal: 16 }]}>
        <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Weekly Distance (km)</Text>
        <View style={styles.chartWrap}>
          <WeeklyChart data={stats.weeklyHistory} colors={colors} />
        </View>
        <View style={styles.chartFooter}>
          <Text style={[styles.chartFooterText, { color: colors.mutedForeground }]}>
            This week: {stats.weeklyHistory[7]?.toFixed(1) ?? "0.0"} km
          </Text>
        </View>
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsGrid}>
        <MetricCard icon="zap" label="Streak" value={`${stats.streak}`} unit="days" accent={colors.primary} colors={colors} />
        <MetricCard icon="target" label="Best Pace" value={formatPace(stats.bestPace)} unit="/km" accent={colors.accent} colors={colors} />
        <MetricCard icon="activity" label="Avg Pace" value={formatPace(stats.avgPace)} unit="/km" accent={colors.foreground} colors={colors} />
        <MetricCard icon="award" label="Consistency" value={`${stats.consistency}`} unit="%" accent={colors.success} colors={colors} />
      </View>

      {/* Lifetime Stats */}
      <View style={[styles.card, { backgroundColor: colors.card, marginHorizontal: 16 }]}>
        <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Lifetime Stats</Text>
        <View style={styles.lifetimeRow}>
          <View style={styles.lifetimeStat}>
            <Text style={[styles.lifetimeVal, { color: colors.foreground }]}>{stats.totalRuns}</Text>
            <Text style={[styles.lifetimeLabel, { color: colors.mutedForeground }]}>Total Runs</Text>
          </View>
          <View style={[styles.vDivider, { backgroundColor: colors.border }]} />
          <View style={styles.lifetimeStat}>
            <Text style={[styles.lifetimeVal, { color: colors.foreground }]}>
              {(stats.totalDist / 1000).toFixed(0)}
            </Text>
            <Text style={[styles.lifetimeLabel, { color: colors.mutedForeground }]}>km Total</Text>
          </View>
          <View style={[styles.vDivider, { backgroundColor: colors.border }]} />
          <View style={styles.lifetimeStat}>
            <Text style={[styles.lifetimeVal, { color: colors.foreground }]}>
              {formatDuration(stats.totalTime)}
            </Text>
            <Text style={[styles.lifetimeLabel, { color: colors.mutedForeground }]}>Total Time</Text>
          </View>
        </View>
      </View>

      {/* Longest Run */}
      {stats.longest && (
        <View style={[styles.card, { backgroundColor: colors.card, marginHorizontal: 16 }]}>
          <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>Longest Run</Text>
          <View style={styles.longestRow}>
            <View style={[styles.longestIcon, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="award" size={28} color={colors.primary} />
            </View>
            <View style={styles.longestInfo}>
              <Text style={[styles.longestDist, { color: colors.foreground }]}>
                {formatDistance(stats.longest.distance)}
              </Text>
              <Text style={[styles.longestMeta, { color: colors.mutedForeground }]}>
                {formatDuration(stats.longest.duration)} · {formatPace(stats.longest.avgPace)}/km
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Insights */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Performance Insights</Text>
        {stats.insights.map((insight, i) => (
          <View key={i} style={[styles.insightCard, { backgroundColor: colors.card }]}>
            <View style={[styles.insightNum, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.insightNumText, { color: colors.primary }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.insightText, { color: colors.foreground }]}>{insight}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function MetricCard({
  icon,
  label,
  value,
  unit,
  accent,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  unit: string;
  accent: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={[metricStyles.card, { backgroundColor: colors.card }]}>
      <Feather name={icon as any} size={18} color={accent} />
      <Text style={[metricStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={metricStyles.valRow}>
        <Text style={[metricStyles.value, { color: colors.foreground }]}>{value}</Text>
        <Text style={[metricStyles.unit, { color: colors.mutedForeground }]}>{unit}</Text>
      </View>
    </View>
  );
}

const metricStyles = StyleSheet.create({
  card: { width: "46%", borderRadius: 14, padding: 16, gap: 4 },
  label: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase" as const },
  valRow: { flexDirection: "row" as const, alignItems: "baseline", gap: 2, marginTop: 2 },
  value: { fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.3 },
  unit: { fontSize: 12, fontWeight: "500" as const },
});

function makeStyles(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
    card: { borderRadius: colors.radius, padding: 18, marginBottom: 12 },
    cardTitle: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.6, textTransform: "uppercase" as const, marginBottom: 14 },
    chartWrap: { alignItems: "center" },
    chartFooter: { marginTop: 8 },
    chartFooterText: { fontSize: 12, fontWeight: "500" as const },
    metricsGrid: { flexDirection: "row", flexWrap: "wrap" as const, gap: 12, marginHorizontal: 16, marginBottom: 12, justifyContent: "space-between" },
    lifetimeRow: { flexDirection: "row", alignItems: "center" },
    lifetimeStat: { flex: 1, alignItems: "center" },
    lifetimeVal: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.3 },
    lifetimeLabel: { fontSize: 11, marginTop: 2, fontWeight: "500" as const },
    vDivider: { width: 1, height: 40, marginHorizontal: 8 },
    longestRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    longestIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
    longestInfo: { flex: 1 },
    longestDist: { fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.3 },
    longestMeta: { fontSize: 13, marginTop: 2 },
    section: { paddingHorizontal: 16 },
    sectionTitle: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.3, marginBottom: 12 },
    insightCard: { flexDirection: "row", alignItems: "flex-start", borderRadius: colors.radius, padding: 14, marginBottom: 8, gap: 12 },
    insightNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    insightNumText: { fontSize: 13, fontWeight: "700" as const },
    insightText: { flex: 1, fontSize: 14, lineHeight: 21 },
  });
}
