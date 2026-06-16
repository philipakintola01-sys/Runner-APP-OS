import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRunStore } from "@/context/RunStore";
import { useColors } from "@/hooks/useColors";
import {
  calculateMonthlyDistance,
  calculateStreak,
  calculateWeeklyDistance,
  generateInsights,
} from "@/utils/analytics";
import {
  formatDate,
  formatDistance,
  formatDistanceKm,
  formatDuration,
  formatPace,
  formatRelativeDate,
} from "@/utils/runUtils";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { runs, isLoaded } = useRunStore();

  const stats = useMemo(() => {
    const streak = calculateStreak(runs);
    const weeklyDist = calculateWeeklyDistance(runs);
    const monthlyDist = calculateMonthlyDistance(runs);
    const insights = generateInsights(runs);
    const recentRuns = [...runs].sort((a, b) => b.startTime - a.startTime).slice(0, 3);
    return { streak, weeklyDist, monthlyDist, insights, recentRuns };
  }, [runs]);

  const styles = makeStyles(colors);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!isLoaded) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: topPad }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container]}
      contentContainerStyle={{ paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={styles.greeting}>RunOS</Text>
          <Text style={styles.date}>{formatDate(Date.now())}</Text>
        </View>
        <Pressable style={styles.startBtn} onPress={() => router.push("/(tabs)/run")}>
          <Feather name="play" size={16} color={colors.primaryForeground} />
          <Text style={styles.startBtnText}>Run</Text>
        </Pressable>
      </View>

      {/* Streak Card */}
      <LinearGradient
        colors={["#FF4B2B", "#FF7043"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.streakCard}
      >
        <View style={styles.streakContent}>
          <View>
            <Text style={styles.streakLabel}>Current Streak</Text>
            <View style={styles.streakRow}>
              <Text style={styles.streakNum}>{stats.streak}</Text>
              <Text style={styles.streakUnit}>days</Text>
            </View>
          </View>
          <View style={styles.streakIconBox}>
            <Feather name="zap" size={36} color="rgba(255,255,255,0.8)" />
          </View>
        </View>
        <Text style={styles.streakSub}>
          {stats.streak === 0
            ? "Start a run today to begin your streak!"
            : stats.streak === 1
            ? "Great start — run again tomorrow!"
            : `${stats.streak} consecutive days of running`}
        </Text>
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>This Week</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {formatDistanceKm(stats.weeklyDist)}
          </Text>
          <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>km</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>This Month</Text>
          <Text style={[styles.statValue, { color: colors.foreground }]}>
            {formatDistanceKm(stats.monthlyDist)}
          </Text>
          <Text style={[styles.statUnit, { color: colors.mutedForeground }]}>km</Text>
        </View>
      </View>

      {/* Insights */}
      {stats.insights.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Insights</Text>
          {stats.insights.map((insight, i) => (
            <View key={i} style={[styles.insightCard, { backgroundColor: colors.card }]}>
              <View style={[styles.insightDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.insightText, { color: colors.foreground }]}>{insight}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Runs */}
      <View style={styles.section}>
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Runs</Text>
          <Pressable onPress={() => router.push("/(tabs)/history")}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        </View>
        {stats.recentRuns.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Feather name="activity" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No runs yet. Tap Run to get started!
            </Text>
          </View>
        ) : (
          stats.recentRuns.map((run) => (
            <View key={run.id} style={[styles.runCard, { backgroundColor: colors.card }]}>
              <View style={styles.runCardLeft}>
                <Text style={[styles.runDate, { color: colors.mutedForeground }]}>
                  {formatRelativeDate(run.startTime)}
                </Text>
                <Text style={[styles.runDist, { color: colors.foreground }]}>
                  {formatDistance(run.distance)}
                </Text>
              </View>
              <View style={styles.runCardRight}>
                <Text style={[styles.runMeta, { color: colors.mutedForeground }]}>
                  {formatDuration(run.duration)}
                </Text>
                <Text style={[styles.runPace, { color: colors.accent }]}>
                  {formatPace(run.avgPace)}<Text style={styles.paceUnit}> /km</Text>
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 20, paddingBottom: 16 },
    greeting: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, letterSpacing: -0.5 },
    date: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
    startBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, gap: 6 },
    startBtnText: { color: colors.primaryForeground, fontWeight: "700" as const, fontSize: 14 },
    streakCard: { marginHorizontal: 16, borderRadius: colors.radius, padding: 20, marginBottom: 12 },
    streakContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    streakLabel: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: "600" as const, letterSpacing: 0.8, textTransform: "uppercase" as const },
    streakRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 4 },
    streakNum: { fontSize: 52, fontWeight: "800" as const, color: "#FFFFFF", lineHeight: 60 },
    streakUnit: { fontSize: 18, color: "rgba(255,255,255,0.85)", fontWeight: "600" as const },
    streakIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
    streakSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 10 },
    statsRow: { flexDirection: "row", marginHorizontal: 16, gap: 12, marginBottom: 12 },
    statCard: { flex: 1, borderRadius: colors.radius, padding: 16 },
    statLabel: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.6, textTransform: "uppercase" as const },
    statValue: { fontSize: 32, fontWeight: "800" as const, marginTop: 4, letterSpacing: -0.5 },
    statUnit: { fontSize: 12, marginTop: 2 },
    section: { marginHorizontal: 16, marginBottom: 4 },
    sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    sectionTitle: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.3, marginBottom: 10 },
    seeAll: { fontSize: 13, fontWeight: "600" as const },
    insightCard: { flexDirection: "row", alignItems: "flex-start", borderRadius: colors.radius, padding: 14, marginBottom: 8, gap: 10 },
    insightDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
    insightText: { flex: 1, fontSize: 14, lineHeight: 20 },
    runCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: colors.radius, padding: 16, marginBottom: 8 },
    runCardLeft: { gap: 4 },
    runDate: { fontSize: 12, fontWeight: "500" as const },
    runDist: { fontSize: 22, fontWeight: "800" as const, letterSpacing: -0.3 },
    runCardRight: { alignItems: "flex-end", gap: 4 },
    runMeta: { fontSize: 13 },
    runPace: { fontSize: 16, fontWeight: "700" as const },
    paceUnit: { fontSize: 12, fontWeight: "400" as const },
    emptyCard: { borderRadius: colors.radius, padding: 32, alignItems: "center", gap: 12 },
    emptyText: { fontSize: 14, textAlign: "center" as const, lineHeight: 20 },
  });
}
