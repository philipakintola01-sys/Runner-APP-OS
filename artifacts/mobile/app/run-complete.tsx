import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ShareCardGenerator, ShareCardTemplate, TemplateSelector } from "@/components/ShareCardGenerator";
import { useRunStore } from "@/context/RunStore";
import { useColors } from "@/hooks/useColors";
import {
  calculateStreak,
  generateInsights,
  getLongestRun,
} from "@/utils/analytics";
import {
  formatDate,
  formatDistance,
  formatDuration,
  formatPace,
} from "@/utils/runUtils";

export default function RunCompleteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { runId } = useLocalSearchParams<{ runId: string }>();
  const { runs } = useRunStore();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [selectedTemplate, setSelectedTemplate] = useState<ShareCardTemplate>("athletic");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const run = useMemo(() => runs.find((r) => r.id === runId), [runs, runId]);

  const extras = useMemo(() => {
    if (!run) return { streak: 0, isPR: false, insights: [] };
    const streak = calculateStreak(runs);
    const longest = getLongestRun(runs.filter((r) => r.id !== run.id));
    const isPR = !longest || run.distance > longest.distance;
    const insights = generateInsights(runs);
    return { streak, isPR, insights };
  }, [runs, run]);

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  async function handleShare() {
    if (!run) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const stepText = run.steps ? `\n👟 ${run.steps.toLocaleString()} steps` : "";
    const msg = `🏃 Just completed a ${(run.distance / 1000).toFixed(2)}km run!\n⏱ ${formatDuration(run.duration)} | ${formatPace(run.avgPace)}/km pace | ${run.calories} kcal${stepText}\n🔥 ${extras.streak}-day streak\n\n#RunOS #Running`;
    Share.share({ message: msg });
  }

  function handleDone() {
    router.replace("/");
  }

  const styles = makeStyles(colors);

  if (!run) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Run not found.</Text>
        <Pressable onPress={handleDone}><Text style={[{ color: colors.primary }]}>Back to Home</Text></Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 + bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Run Complete</Text>
        {extras.isPR && (
          <View style={[styles.prBadge, { backgroundColor: colors.warning + "20" }]}>
            <Feather name="award" size={14} color={colors.warning} />
            <Text style={[styles.prBadgeText, { color: colors.warning }]}>New Personal Record!</Text>
          </View>
        )}
      </View>

      {/* Share Card */}
      <ShareCardGenerator
        data={{
          distance: run.distance,
          duration: run.duration,
          avgPace: run.avgPace,
          calories: run.calories,
          steps: run.steps,
          startTime: run.startTime,
          streak: extras.streak,
          isPR: extras.isPR,
        }}
        imageUri={photoUri}
        selectedTemplate={selectedTemplate}
      />

      {/* Template Selector */}
      <TemplateSelector selected={selectedTemplate} onSelect={setSelectedTemplate} />

      {/* Photo Actions */}
      <View style={styles.photoActions}>
        <Pressable style={[styles.photoBtn, { backgroundColor: colors.card }]} onPress={takePhoto}>
          <Feather name="camera" size={18} color={colors.foreground} />
          <Text style={[styles.photoBtnText, { color: colors.foreground }]}>Take Photo</Text>
        </Pressable>
        <Pressable style={[styles.photoBtn, { backgroundColor: colors.card }]} onPress={pickPhoto}>
          <Feather name="image" size={18} color={colors.foreground} />
          <Text style={[styles.photoBtnText, { color: colors.foreground }]}>Add Photo</Text>
        </Pressable>
        {photoUri && (
          <Pressable style={[styles.photoBtn, { backgroundColor: colors.destructive + "15" }]} onPress={() => setPhotoUri(null)}>
            <Feather name="x" size={18} color={colors.destructive} />
            <Text style={[styles.photoBtnText, { color: colors.destructive }]}>Remove</Text>
          </Pressable>
        )}
      </View>

      {/* Insights */}
      {extras.insights.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Run Insights</Text>
          {extras.insights.slice(0, 2).map((insight, i) => (
            <View key={i} style={[styles.insightCard, { backgroundColor: colors.card }]}>
              <View style={[styles.insightDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.insightText, { color: colors.foreground }]}>{insight}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Detailed Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Details</Text>
        <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
          {[
            { label: "Distance", value: formatDistance(run.distance), icon: "map-pin" },
            { label: "Duration", value: formatDuration(run.duration), icon: "clock" },
            { label: "Avg Pace", value: `${formatPace(run.avgPace)} /km`, icon: "activity" },
            { label: "Calories", value: `${run.calories} kcal`, icon: "zap" },
            { label: "Elevation", value: `+${run.elevationGain}m`, icon: "trending-up" },
            ...(run.steps ? [{ label: "Steps", value: run.steps.toLocaleString(), icon: "hash" }] : []),
          ].map((item, i, arr) => (
            <View key={i}>
              <View style={styles.detailRow}>
                <View style={styles.detailLeft}>
                  <Feather name={item.icon as any} size={16} color={colors.mutedForeground} />
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                </View>
                <Text style={[styles.detailValue, { color: colors.foreground }]}>{item.value}</Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.detailDivider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          style={[styles.shareBtn, { backgroundColor: colors.card }]}
          onPress={handleShare}
        >
          <Feather name="share-2" size={18} color={colors.foreground} />
          <Text style={[styles.shareBtnText, { color: colors.foreground }]}>Share</Text>
        </Pressable>
        <Pressable
          style={[styles.doneBtn, { backgroundColor: colors.primary }]}
          onPress={handleDone}
        >
          <Text style={[styles.doneBtnText, { color: colors.primaryForeground }]}>Back to Home</Text>
          <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ReturnType<typeof import("@/hooks/useColors").useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    errorText: { textAlign: "center" as const, marginTop: 60, marginBottom: 16, fontSize: 16 },
    header: { paddingHorizontal: 20, paddingBottom: 16, gap: 8 },
    headerTitle: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
    prBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: "flex-start" as const },
    prBadgeText: { fontSize: 13, fontWeight: "700" as const },
    section: { paddingHorizontal: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: "700" as const, marginBottom: 12 },
    insightCard: { flexDirection: "row", alignItems: "flex-start", borderRadius: colors.radius, padding: 14, marginBottom: 8, gap: 10 },
    insightDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
    insightText: { flex: 1, fontSize: 14, lineHeight: 20 },
    detailsCard: { borderRadius: colors.radius, overflow: "hidden" as const },
    detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
    detailLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    detailLabel: { fontSize: 14 },
    detailValue: { fontSize: 15, fontWeight: "700" as const },
    detailDivider: { height: 1, marginHorizontal: 16 },
    photoActions: { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 16 },
    photoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 12 },
    photoBtnText: { fontSize: 13, fontWeight: "600" as const },
    actions: { flexDirection: "row", paddingHorizontal: 16, gap: 12 },
    shareBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16 },
    shareBtnText: { fontSize: 15, fontWeight: "700" as const },
    doneBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16 },
    doneBtnText: { fontSize: 15, fontWeight: "700" as const },
  });
