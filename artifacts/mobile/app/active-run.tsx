import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { Pedometer } from "expo-sensors";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Coordinate, useRunStore } from "@/context/RunStore";
import { useColors } from "@/hooks/useColors";
import {
  calculatePace,
  estimateCalories,
  formatDuration,
  formatDistanceKm,
  formatPace,
  haversineDistance,
} from "@/utils/runUtils";

export default function ActiveRunScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addRun } = useRunStore();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [isPaused, setIsPaused] = useState(false);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [displayDistance, setDisplayDistance] = useState(0);
  const [gpsActive, setGpsActive] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [stepsAvailable, setStepsAvailable] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const elapsedOnPauseRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const webWatchIdRef = useRef<number | null>(null);
  const coordsRef = useRef<Coordinate[]>([]);
  const distanceRef = useRef<number>(0);
  const isPausedRef = useRef(false);
  const stepsAtStartRef = useRef<number>(0);
  const pedometerSubRef = useRef<any>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = elapsedOnPauseRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDisplaySeconds(elapsed);
    }, 1000);
  }, [clearTimer]);

  const addCoord = useCallback((coord: Coordinate) => {
    if (isPausedRef.current) return;
    const prev = coordsRef.current[coordsRef.current.length - 1];
    if (prev) {
      const d = haversineDistance(prev.latitude, prev.longitude, coord.latitude, coord.longitude);
      if (d < 200) {
        distanceRef.current += d;
        setDisplayDistance(distanceRef.current);
      }
    }
    coordsRef.current = [...coordsRef.current, coord];
  }, []);

  const startTracking = useCallback(async () => {
    if (Platform.OS !== "web") {
      try {
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 3 },
          (loc) => {
            setGpsActive(true);
            addCoord({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, altitude: loc.coords.altitude });
          }
        );
        locationSubRef.current = sub;
      } catch {
        // GPS unavailable
      }
    } else if (typeof navigator !== "undefined" && navigator.geolocation) {
      webWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsActive(true);
          addCoord({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 2000 }
      );
    }
  }, [addCoord]);

  const stopTracking = useCallback(() => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    if (webWatchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(webWatchIdRef.current);
      webWatchIdRef.current = null;
    }
  }, []);

  // Pedometer
  const startPedometer = useCallback(async () => {
    if (Platform.OS === "web") return;
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      if (!isAvailable) {
        setStepsAvailable(false);
        return;
      }
      setStepsAvailable(true);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      const result = await Pedometer.getStepCountAsync(start, end);
      stepsAtStartRef.current = result?.steps ?? 0;

      pedometerSubRef.current = Pedometer.watchStepCount((result) => {
        setStepCount(Math.max(0, result.steps - stepsAtStartRef.current));
      });
    } catch {
      setStepsAvailable(false);
    }
  }, []);

  const stopPedometer = useCallback(() => {
    if (pedometerSubRef.current) {
      pedometerSubRef.current.remove();
      pedometerSubRef.current = null;
    }
  }, []);

  // Start on mount
  useEffect(() => {
    startTimer();
    startTracking();
    startPedometer();
    return () => {
      clearTimer();
      stopTracking();
      stopPedometer();
    };
  }, []);

  function handlePause() {
    isPausedRef.current = true;
    setIsPaused(true);
    elapsedOnPauseRef.current = displaySeconds;
    clearTimer();
    stopTracking();
    stopPedometer();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function handleResume() {
    isPausedRef.current = false;
    setIsPaused(false);
    startTimer();
    startTracking();
    startPedometer();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function handleStop() {
    Alert.alert("End Run?", "Save your run and see your summary.", [
      { text: "Keep Running", style: "cancel" },
      {
        text: "End Run",
        style: "destructive",
        onPress: async () => {
          clearTimer();
          stopTracking();
          stopPedometer();
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          const duration = displaySeconds;
          const distance = distanceRef.current;
          const steps = stepCount > 0 ? stepCount : Math.round(distance / 1.4);

          if (duration < 5) {
            router.back();
            return;
          }

          const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          const run = {
            id: runId,
            startTime: Date.now() - duration * 1000,
            endTime: Date.now(),
            distance,
            duration,
            avgPace: calculatePace(distance, duration),
            calories: estimateCalories(distance),
            coordinates: coordsRef.current,
            elevationGain: 0,
            steps,
          };

          await addRun(run);
          router.replace({ pathname: "/run-complete", params: { runId } });
        },
      },
    ]);
  }

  function handleDiscard() {
    Alert.alert("Discard Run?", "This run won't be saved.", [
      { text: "Keep Running", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          clearTimer();
          stopTracking();
          stopPedometer();
          router.back();
        },
      },
    ]);
  }

  const pace = calculatePace(displayDistance, displaySeconds);
  const calories = estimateCalories(displayDistance);
  const styles = makeStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: "#0A0A0F", paddingTop: topPad, paddingBottom: bottomPad }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={handleDiscard} style={styles.topBtn} hitSlop={12}>
          <Feather name="x" size={20} color="rgba(255,255,255,0.6)" />
          <Text style={styles.topBtnText}>Discard</Text>
        </Pressable>
        <View style={styles.gpsIndicator}>
          <View style={[styles.gpsDot, { backgroundColor: gpsActive || Platform.OS === "web" ? "#22C55E" : "#F59E0B" }]} />
          <Text style={styles.gpsText}>{gpsActive ? "GPS Active" : Platform.OS === "web" ? "Web Mode" : "Acquiring GPS..."}</Text>
        </View>
      </View>

      {/* Timer */}
      <View style={styles.timerSection}>
        {isPaused && <Text style={styles.pausedLabel}>PAUSED</Text>}
        <Text style={styles.timer}>{formatDuration(displaySeconds)}</Text>
        <Text style={styles.timerLabel}>ELAPSED TIME</Text>
      </View>

      {/* Primary Metric */}
      <View style={styles.primaryMetric}>
        <Text style={styles.primaryVal}>{(displayDistance / 1000).toFixed(2)}</Text>
        <Text style={styles.primaryUnit}>KM</Text>
      </View>

      {/* Secondary Metrics */}
      <View style={styles.secondaryRow}>
        <View style={[styles.secondaryStat, { borderColor: "rgba(255,255,255,0.08)" }]}>
          <Text style={styles.secondaryVal}>{formatPace(pace)}</Text>
          <Text style={styles.secondaryLabel}>PACE /KM</Text>
        </View>
        <View style={[styles.secondaryStat, { borderColor: "rgba(255,255,255,0.08)" }]}>
          <Text style={styles.secondaryVal}>{calories}</Text>
          <Text style={styles.secondaryLabel}>KCAL</Text>
        </View>
      </View>

      {/* Steps */}
      {stepsAvailable && (
        <View style={styles.stepRow}>
          <View style={styles.stepBox}>
            <Feather name="hash" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.stepVal}>{stepCount.toLocaleString()}</Text>
            <Text style={styles.stepLabel}>STEPS</Text>
          </View>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        {isPaused ? (
          <>
            <Pressable
              style={[styles.controlBtn, styles.resumeBtn]}
              onPress={handleResume}
            >
              <Feather name="play" size={28} color="#FFFFFF" />
              <Text style={styles.controlBtnText}>Resume</Text>
            </Pressable>
            <Pressable
              style={[styles.controlBtn, styles.stopBtn]}
              onPress={handleStop}
            >
              <View style={styles.stopIcon} />
              <Text style={styles.controlBtnText}>End Run</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[styles.controlBtn, styles.pauseBtn]}
            onPress={handlePause}
          >
            <View style={styles.pauseIconWrap}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
            <Text style={styles.controlBtnText}>Pause</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof import("@/hooks/useColors").useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 },
    topBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
    topBtnText: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "600" as const },
    gpsIndicator: { flexDirection: "row", alignItems: "center", gap: 6 },
    gpsDot: { width: 8, height: 8, borderRadius: 4 },
    gpsText: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
    timerSection: { alignItems: "center", marginTop: 32, marginBottom: 8 },
    pausedLabel: { fontSize: 12, color: "#F59E0B", letterSpacing: 2, fontWeight: "700" as const, marginBottom: 8 },
    timer: { fontSize: 64, fontWeight: "800" as const, color: "#FFFFFF", letterSpacing: -1 },
    timerLabel: { fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, marginTop: 4 },
    primaryMetric: { alignItems: "center", marginVertical: 24 },
    primaryVal: { fontSize: 80, fontWeight: "900" as const, color: "#FF4B2B", letterSpacing: -2, lineHeight: 88 },
    primaryUnit: { fontSize: 16, color: "rgba(255,255,255,0.5)", letterSpacing: 2, fontWeight: "600" as const },
    secondaryRow: { flexDirection: "row", marginHorizontal: 24, gap: 12, marginBottom: 16 },
    secondaryStat: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 18, alignItems: "center" },
    secondaryVal: { fontSize: 28, fontWeight: "800" as const, color: "#FFFFFF", letterSpacing: -0.5 },
    secondaryLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, marginTop: 4 },
    stepRow: { alignItems: "center", marginBottom: 24 },
    stepBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
    stepVal: { fontSize: 18, fontWeight: "700" as const, color: "#FFFFFF" },
    stepLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1, fontWeight: "600" as const },
    controls: { flexDirection: "row", justifyContent: "center", gap: 16, paddingHorizontal: 24 },
    controlBtn: { flex: 1, borderRadius: 20, paddingVertical: 20, alignItems: "center", gap: 8 },
    controlBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" as const },
    pauseBtn: { backgroundColor: "rgba(255,255,255,0.12)" },
    resumeBtn: { backgroundColor: "#22C55E" },
    stopBtn: { backgroundColor: "#EF4444" },
    pauseIconWrap: { flexDirection: "row", gap: 4 },
    pauseBar: { width: 4, height: 24, borderRadius: 2, backgroundColor: "#FFFFFF" },
    stopIcon: { width: 22, height: 22, borderRadius: 4, backgroundColor: "#FFFFFF" },
  });
