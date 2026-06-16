import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Goal, useRunStore } from "@/context/RunStore";
import { useColors } from "@/hooks/useColors";
import {
  calculateAnnualDistance,
  calculateMonthlyDistance,
  calculateWeeklyDistance,
  getLongestRun,
} from "@/utils/analytics";
import { formatDistanceKm } from "@/utils/runUtils";

type GoalType = Goal["type"];

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  weekly_distance: "Weekly Distance",
  monthly_distance: "Monthly Distance",
  annual_distance: "Annual Distance",
  single_run: "Single Run Distance",
};

const GOAL_TYPE_UNITS: Record<GoalType, string> = {
  weekly_distance: "km/week",
  monthly_distance: "km/month",
  annual_distance: "km/year",
  single_run: "km in one run",
};

const GOAL_TYPES: GoalType[] = [
  "weekly_distance",
  "monthly_distance",
  "annual_distance",
  "single_run",
];

export default function GoalsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { runs, goals, addGoal, deleteGoal } = useRunStore();
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState<GoalType>("weekly_distance");
  const [targetInput, setTargetInput] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const longestRun = useMemo(() => getLongestRun(runs), [runs]);

  function getProgress(goal: Goal): { current: number; pct: number } {
    let current = 0;
    switch (goal.type) {
      case "weekly_distance":
        current = calculateWeeklyDistance(runs) / 1000;
        break;
      case "monthly_distance":
        current = calculateMonthlyDistance(runs) / 1000;
        break;
      case "annual_distance":
        current = calculateAnnualDistance(runs) / 1000;
        break;
      case "single_run":
        current = longestRun ? longestRun.distance / 1000 : 0;
        break;
    }
    const pct = Math.min((current / goal.target) * 100, 100);
    return { current, pct };
  }

  async function handleAdd() {
    const target = parseFloat(targetInput);
    if (!targetInput || isNaN(target) || target <= 0) {
      Alert.alert("Invalid target", "Please enter a valid distance in km.");
      return;
    }
    await addGoal({ type: selectedType, target, label: `${target}km ${GOAL_TYPE_UNITS[selectedType]}` });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowModal(false);
    setTargetInput("");
  }

  function handleDelete(id: string) {
    Alert.alert("Delete Goal", "Are you sure you want to remove this goal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteGoal(id),
      },
    ]);
  }

  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Goals</Text>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowModal(true)}
        >
          <Feather name="plus" size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <FlatList
        data={goals}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 + bottomPad }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!goals.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="target" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No goals yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Set a distance goal to track your progress.
            </Text>
            <Pressable style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => setShowModal(true)}>
              <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>Add First Goal</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item: goal }) => {
          const { current, pct } = getProgress(goal);
          const isComplete = pct >= 100;
          return (
            <View style={[styles.goalCard, { backgroundColor: colors.card }]}>
              <View style={styles.goalTop}>
                <View style={styles.goalInfo}>
                  <View style={styles.goalTypeRow}>
                    <View style={[styles.goalTypeBadge, { backgroundColor: isComplete ? colors.success + "20" : colors.primary + "15" }]}>
                      <Text style={[styles.goalTypeBadgeText, { color: isComplete ? colors.success : colors.primary }]}>
                        {GOAL_TYPE_LABELS[goal.type]}
                      </Text>
                    </View>
                    {isComplete && (
                      <View style={[styles.completeBadge, { backgroundColor: colors.success + "20" }]}>
                        <Feather name="check" size={12} color={colors.success} />
                        <Text style={[styles.completeBadgeText, { color: colors.success }]}>Done!</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.goalLabel, { color: colors.foreground }]}>
                    {goal.target}km {GOAL_TYPE_UNITS[goal.type]}
                  </Text>
                </View>
                <Pressable onPress={() => handleDelete(goal.id)} hitSlop={12}>
                  <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                </Pressable>
              </View>

              {/* Progress bar */}
              <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${pct}%` as any,
                      backgroundColor: isComplete ? colors.success : colors.primary,
                    },
                  ]}
                />
              </View>

              <View style={styles.goalBottom}>
                <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
                  <Text style={[styles.progressCurrent, { color: colors.foreground }]}>
                    {current.toFixed(1)}km
                  </Text>{" "}
                  of {goal.target}km
                </Text>
                <Text style={[styles.pctText, { color: isComplete ? colors.success : colors.primary }]}>
                  {pct.toFixed(0)}%
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Add Goal Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHandle} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Goal</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Goal Type</Text>
            <View style={styles.typeGrid}>
              {GOAL_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: selectedType === t ? colors.primary : colors.background,
                      borderColor: selectedType === t ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedType(t)}
                >
                  <Text style={[styles.typeBtnText, { color: selectedType === t ? colors.primaryForeground : colors.mutedForeground }]}>
                    {GOAL_TYPE_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Target ({GOAL_TYPE_UNITS[selectedType]})
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              placeholder={`e.g. ${selectedType === "annual_distance" ? "800" : selectedType === "monthly_distance" ? "100" : "25"}`}
              placeholderTextColor={colors.mutedForeground}
              value={targetInput}
              onChangeText={setTargetInput}
              keyboardType="numeric"
              returnKeyType="done"
            />

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.cancelBtn, { backgroundColor: colors.background }]}
                onPress={() => { setShowModal(false); setTargetInput(""); }}
              >
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd}>
                <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Add Goal</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: "800" as const, letterSpacing: -0.5 },
    addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    goalCard: { borderRadius: colors.radius, padding: 18, marginBottom: 12 },
    goalTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
    goalInfo: { flex: 1, gap: 6 },
    goalTypeRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    goalTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    goalTypeBadgeText: { fontSize: 11, fontWeight: "700" as const },
    completeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    completeBadgeText: { fontSize: 11, fontWeight: "700" as const },
    goalLabel: { fontSize: 20, fontWeight: "800" as const, letterSpacing: -0.3 },
    progressBg: { height: 8, borderRadius: 4, overflow: "hidden" as const, marginBottom: 10 },
    progressFill: { height: 8, borderRadius: 4 },
    goalBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    progressText: { fontSize: 13 },
    progressCurrent: { fontWeight: "700" as const },
    pctText: { fontSize: 14, fontWeight: "800" as const },
    empty: { alignItems: "center", paddingTop: 80, gap: 12, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 18, fontWeight: "700" as const, marginTop: 8 },
    emptyText: { fontSize: 14, textAlign: "center" as const, lineHeight: 20 },
    emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 8 },
    emptyBtnText: { fontSize: 14, fontWeight: "700" as const },
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
    modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#888", alignSelf: "center", marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: "800" as const, marginBottom: 20 },
    fieldLabel: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase" as const, marginBottom: 8 },
    typeGrid: { flexDirection: "row", flexWrap: "wrap" as const, gap: 8, marginBottom: 20 },
    typeBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
    typeBtnText: { fontSize: 13, fontWeight: "600" as const },
    input: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 24 },
    modalActions: { flexDirection: "row", gap: 12 },
    cancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    cancelBtnText: { fontSize: 15, fontWeight: "600" as const },
    saveBtn: { flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    saveBtnText: { fontSize: 15, fontWeight: "700" as const },
  });
}
