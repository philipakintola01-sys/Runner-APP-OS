import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
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
  calculateStreak,
  calculateWeeklyDistance,
} from "@/utils/analytics";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatDistanceKm,
  formatPace,
  formatRelativeDate,
} from "@/utils/runUtils";

export default function RunScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { runs } = useRunStore();
  const [loading, setLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const lastRun = useMemo(
    () => [...runs].sort((a, b) => b.startTime - a.startTime)[0] ?? null,
    [runs]
  );
  const streak = useMemo(() => calculateStreak(runs), [runs]);
  const weeklyKm = useMemo(() => calculateWeeklyDistance(runs) / 1000, [runs]);

  async function handleStartRun() {
    setLoading(true);
    try {
      if (Platform.OS !== "web") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Location Required",
            "RunOS needs location access to track your run distance and route.",
            [{ text: "OK" }]
          );
          setLoading(false);
          return;
        }
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      router.push("/active-run");
    } finally {
      setLoading(false);
    }
  }

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.inner, { paddingTop: topPad + 20, paddingBottom: bottomPad + 100 }]}>
        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]}>Ready to Run?</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {Platform.OS !== "web" ? "GPS tracking enabled" : "Distance tracking available"}
        </Text>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={[styles.quickStat, { backgroundColor: colors.card }]}>
            <Feather name="zap" size={18} color={colors.primary} />
            <Text style={[styles.quickStatVal, { color: colors.foreground }]}>{streak}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.mutedForeground }]}>streak</Text>
          </View>
          <View style={[styles.quickStat, { backgroundColor: colors.card }]}>
            <Feather name="trending-up" size={18} color={colors.accent} />
            <Text style={[styles.quickStatVal, { color: colors.foreground }]}>{weeklyKm.toFixed(1)}</Text>
            <Text style={[styles.quickStatLabel, { color: colors.mutedForeground }]}>km this week</Text>
          </View>
        </View>

        {/* Last Run */}
        {lastRun && (
          <View style={[styles.lastRunCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.lastRunTitle, { color: colors.mutedForeground }]}>
              Last Run · {formatRelativeDate(lastRun.startTime)}
            </Text>
            <View style={styles.lastRunRow}>
              <View style={styles.lastRunStat}>
                <Text style={[styles.lastRunVal, { color: colors.foreground }]}>
                  {formatDistance(lastRun.distance)}
                </Text>
                <Text style={[styles.lastRunLabel, { color: colors.mutedForeground }]}>distance</Text>
              </View>
              <View style={[styles.lastRunDivider, { backgroundColor: colors.border }]} />
              <View style={styles.lastRunStat}>
                <Text style={[styles.lastRunVal, { color: colors.foreground }]}>
                  {formatDuration(lastRun.duration)}
                </Text>
                <Text style={[styles.lastRunLabel, { color: colors.mutedForeground }]}>time</Text>
              </View>
              <View style={[styles.lastRunDivider, { backgroundColor: colors.border }]} />
              <View style={styles.lastRunStat}>
                <Text style={[styles.lastRunVal, { color: colors.accent }]}>
                  {formatPace(lastRun.avgPace)}
                </Text>
                <Text style={[styles.lastRunLabel, { color: colors.mutedForeground }]}>/km pace</Text>
              </View>
            </View>
          </View>
        )}

        {/* Start Button */}
        <Pressable
          style={({ pressed }) => [
            styles.startButton,
            { opacity: pressed || loading ? 0.85 : 1 },
          ]}
          onPress={handleStartRun}
          disabled={loading}
        >
          <View style={styles.startButtonInner}>
            <View style={styles.startIcon}>
              <Feather name="play" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.startButtonText}>
              {loading ? "Starting..." : "Start Run"}
            </Text>
          </View>
        </Pressable>

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Tap to begin. You can pause at any time.
        </Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    inner: { flex: 1, paddingHorizontal: 24, alignItems: "center" },
    title: { fontSize: 32, fontWeight: "800" as const, letterSpacing: -0.5, textAlign: "center" as const },
    sub: { fontSize: 14, marginTop: 6, marginBottom: 28, textAlign: "center" as const },
    quickStats: { flexDirection: "row", gap: 12, marginBottom: 20, width: "100%" },
    quickStat: { flex: 1, borderRadius: colors.radius, padding: 16, alignItems: "center", gap: 4 },
    quickStatVal: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.3 },
    quickStatLabel: { fontSize: 11, fontWeight: "600" as const },
    lastRunCard: { width: "100%", borderRadius: colors.radius, padding: 18, marginBottom: 28 },
    lastRunTitle: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 14 },
    lastRunRow: { flexDirection: "row", alignItems: "center" },
    lastRunStat: { flex: 1, alignItems: "center" },
    lastRunVal: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.2 },
    lastRunLabel: { fontSize: 11, marginTop: 2, fontWeight: "500" as const },
    lastRunDivider: { width: 1, height: 36, marginHorizontal: 4 },
    startButton: {
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 24,
      elevation: 12,
      marginBottom: 20,
    },
    startButtonInner: { alignItems: "center", gap: 8 },
    startIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
    startButtonText: { fontSize: 22, fontWeight: "800" as const, color: "#FFFFFF", letterSpacing: -0.3 },
    hint: { fontSize: 13, textAlign: "center" as const },
  });
}
