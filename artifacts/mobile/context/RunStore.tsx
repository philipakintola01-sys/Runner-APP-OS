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
  runCount: number;
}

const RunStoreContext = createContext<RunStoreContextType | null>(null);

const RUNS_KEY = "runos_runs_v3";
const GOALS_KEY = "runos_goals_v2";

function estimateSteps(distanceMeters: number): number {
  return Math.round(distanceMeters / 1.4);
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
          const migrated = parsed.map(r => ({
            ...r,
            steps: r.steps ?? estimateSteps(r.distance),
          }));
          setRuns(migrated);
        } else {
          setRuns([]);
        }
        if (gJson) {
          setGoals(JSON.parse(gJson));
        } else {
          setGoals([]);
        }
      } catch (e) {
        console.error("Failed to load run data", e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

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
    <RunStoreContext.Provider value={{
      runs, goals, isLoaded, addRun, addGoal, deleteGoal, syncRuns, isSyncing, syncError, runCount: runs.length,
    }}>
      {children}
    </RunStoreContext.Provider>
  );
}

export function useRunStore() {
  const ctx = useContext(RunStoreContext);
  if (!ctx) throw new Error("useRunStore must be used within RunStoreProvider");
  return ctx;
}
