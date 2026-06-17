import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";

export interface Coordinate {
  latitude: number;
  longitude: number;
  altitude?: number | null;
}

export interface Run {
  id: string;
  startTime: number;
  endTime: number;
  distance: number;
  duration: number;
  avgPace: number;
  calories: number;
  coordinates: Coordinate[];
  elevationGain: number;
  steps?: number;
  notes?: string;
}

export interface Goal {
  id: string;
  type: "weekly_distance" | "monthly_distance" | "annual_distance" | "single_run";
  target: number;
  label: string;
  createdAt: number;
}

interface RunStoreContextType {
  runs: Run[];
  goals: Goal[];
  isLoaded: boolean;
  addRun: (run: Run) => Promise<void>;
  addGoal: (goal: Omit<Goal, "id" | "createdAt">) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  syncRuns: () => Promise<void>;
  isSyncing: boolean;
  syncError: string | null;
}

const RunStoreContext = createContext<RunStoreContextType | null>(null);

const RUNS_KEY = "runos_runs_v2";
const GOALS_KEY = "runos_goals_v1";

function makeSeedRuns(): Run[] {
  const now = Date.now();
  const D = 24 * 3600 * 1000;
  return [
    { id: "s1", startTime: now - D, endTime: now - D + 28.5 * 60000, distance: 5230, duration: 1710, avgPace: 327, calories: 366, coordinates: [], elevationGain: 32, steps: 6230 },
    { id: "s2", startTime: now - 2 * D, endTime: now - 2 * D + 47.3 * 60000, distance: 8100, duration: 2838, avgPace: 350, calories: 567, coordinates: [], elevationGain: 68, steps: 9650 },
    { id: "s3", startTime: now - 4 * D, endTime: now - 4 * D + 22.75 * 60000, distance: 3500, duration: 1365, avgPace: 390, calories: 245, coordinates: [], elevationGain: 12, steps: 4170 },
    { id: "s4", startTime: now - 6 * D, endTime: now - 6 * D + 35 * 60000, distance: 6000, duration: 2100, avgPace: 350, calories: 420, coordinates: [], elevationGain: 45, steps: 7150 },
    { id: "s5", startTime: now - 9 * D, endTime: now - 9 * D + 58.5 * 60000, distance: 10000, duration: 3510, avgPace: 351, calories: 700, coordinates: [], elevationGain: 95, steps: 11900 },
    { id: "s6", startTime: now - 11 * D, endTime: now - 11 * D + 25.2 * 60000, distance: 4200, duration: 1512, avgPace: 360, calories: 294, coordinates: [], elevationGain: 28, steps: 5000 },
    { id: "s7", startTime: now - 13 * D, endTime: now - 13 * D + 44 * 60000, distance: 7500, duration: 2640, avgPace: 352, calories: 525, coordinates: [], elevationGain: 55, steps: 8930 },
  ];
}

function makeSeedGoals(): Goal[] {
  const now = Date.now();
  return [
    { id: "g1", type: "weekly_distance", target: 25, label: "25km per week", createdAt: now - 30 * 24 * 3600 * 1000 },
    { id: "g2", type: "monthly_distance", target: 100, label: "100km this month", createdAt: now - 30 * 24 * 3600 * 1000 },
    { id: "g3", type: "annual_distance", target: 800, label: "800km this year", createdAt: now - 30 * 24 * 3600 * 1000 },
  ];
}

export function RunStoreProvider({ children }: { children: React.ReactNode }) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [rJson, gJson] = await Promise.all([
          AsyncStorage.getItem(RUNS_KEY),
          AsyncStorage.getItem(GOALS_KEY),
        ]);
        if (rJson) {
          const parsed = JSON.parse(rJson) as Run[];
          // Migrate old runs without steps
          const migrated = parsed.map(r => ({
            ...r,
            steps: r.steps ?? estimateSteps(r.distance),
          }));
          setRuns(migrated);
          AsyncStorage.setItem(RUNS_KEY, JSON.stringify(migrated));
        } else {
          const seed = makeSeedRuns();
          setRuns(seed);
          AsyncStorage.setItem(RUNS_KEY, JSON.stringify(seed));
          // Seed to Supabase too
          syncSeedToSupabase(seed);
        }
        if (gJson) {
          setGoals(JSON.parse(gJson));
        } else {
          const seed = makeSeedGoals();
          setGoals(seed);
          AsyncStorage.setItem(GOALS_KEY, JSON.stringify(seed));
        }
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const syncSeedToSupabase = async (seedRuns: Run[]) => {
    try {
      for (const run of seedRuns) {
        await supabase.from("runs").upsert({
          id: run.id,
          start_time: run.startTime,
          end_time: run.endTime,
          distance: run.distance,
          duration: run.duration,
          avg_pace: run.avgPace,
          calories: run.calories,
          elevation_gain: run.elevationGain,
          steps: run.steps,
          coordinates: run.coordinates,
        }, { onConflict: "id" });
      }
    } catch {
      // Supabase may not be configured yet
    }
  };

  const addRun = useCallback(async (run: Run) => {
    setRuns((prev) => {
      const next = [run, ...prev];
      AsyncStorage.setItem(RUNS_KEY, JSON.stringify(next));
      // Sync to Supabase in background
      supabase.from("runs").upsert({
        id: run.id,
        start_time: run.startTime,
        end_time: run.endTime,
        distance: run.distance,
        duration: run.duration,
        avg_pace: run.avgPace,
        calories: run.calories,
        elevation_gain: run.elevationGain,
        steps: run.steps,
        coordinates: run.coordinates,
      }, { onConflict: "id" }).then(() => {}).catch(() => {});
      return next;
    });
  }, []);

  const syncRuns = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      // Push all local runs to Supabase
      const local = JSON.parse((await AsyncStorage.getItem(RUNS_KEY)) ?? "[]") as Run[];
      for (const run of local) {
        await supabase.from("runs").upsert({
          id: run.id,
          start_time: run.startTime,
          end_time: run.endTime,
          distance: run.distance,
          duration: run.duration,
          avg_pace: run.avgPace,
          calories: run.calories,
          elevation_gain: run.elevationGain,
          steps: run.steps,
          coordinates: run.coordinates,
        }, { onConflict: "id" });
      }
      // Pull from Supabase
      const { data, error } = await supabase.from("runs").select("*").order("start_time", { ascending: false });
      if (error) throw error;
      if (data) {
        const mapped: Run[] = data.map((r: any) => ({
          id: r.id,
          startTime: r.start_time,
          endTime: r.end_time,
          distance: r.distance,
          duration: r.duration,
          avgPace: r.avg_pace,
          calories: r.calories,
          elevationGain: r.elevation_gain,
          steps: r.steps ?? estimateSteps(r.distance),
          coordinates: r.coordinates ?? [],
          notes: r.notes,
        }));
        setRuns(mapped);
        AsyncStorage.setItem(RUNS_KEY, JSON.stringify(mapped));
      }
    } catch (e: any) {
      setSyncError(e?.message ?? "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const addGoal = useCallback(async (goal: Omit<Goal, "id" | "createdAt">) => {
    const newGoal: Goal = {
      ...goal,
      id: `g_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
    };
    setGoals((prev) => {
      const next = [...prev, newGoal];
      AsyncStorage.setItem(GOALS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    setGoals((prev) => {
      const next = prev.filter((g) => g.id !== id);
      AsyncStorage.setItem(GOALS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <RunStoreContext.Provider value={{ runs, goals, isLoaded, addRun, addGoal, deleteGoal, syncRuns, isSyncing, syncError }}>
      {children}
    </RunStoreContext.Provider>
  );
}

function estimateSteps(distanceMeters: number): number {
  // Average running stride: ~1.4m per step
  return Math.round(distanceMeters / 1.4);
}

export function useRunStore() {
  const ctx = useContext(RunStoreContext);
  if (!ctx) throw new Error("useRunStore must be used within RunStoreProvider");
  return ctx;
}
