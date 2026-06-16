import type { Run } from "@/context/RunStore";
import { formatDistance, formatPace } from "./runUtils";

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

function startOfMonth(ts: number): number {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfYear(ts: number): number {
  const d = new Date(ts);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function calculateStreak(runs: Run[]): number {
  if (runs.length === 0) return 0;
  const sorted = [...runs].sort((a, b) => b.startTime - a.startTime);
  const today = startOfDay(Date.now());
  const yesterday = today - 24 * 3600 * 1000;
  const latestDay = startOfDay(sorted[0].startTime);
  if (latestDay < yesterday) return 0;

  let streak = 1;
  let prevDay = latestDay;
  for (let i = 1; i < sorted.length; i++) {
    const runDay = startOfDay(sorted[i].startTime);
    if (runDay === prevDay) continue;
    if (runDay === prevDay - 24 * 3600 * 1000) {
      streak++;
      prevDay = runDay;
    } else {
      break;
    }
  }
  return streak;
}

export function calculateWeeklyDistance(runs: Run[]): number {
  const weekStart = startOfWeek(Date.now());
  return runs
    .filter((r) => r.startTime >= weekStart)
    .reduce((s, r) => s + r.distance, 0);
}

export function calculateMonthlyDistance(runs: Run[]): number {
  const monthStart = startOfMonth(Date.now());
  return runs
    .filter((r) => r.startTime >= monthStart)
    .reduce((s, r) => s + r.distance, 0);
}

export function calculateAnnualDistance(runs: Run[]): number {
  const yearStart = startOfYear(Date.now());
  return runs
    .filter((r) => r.startTime >= yearStart)
    .reduce((s, r) => s + r.distance, 0);
}

export function getBestPace(runs: Run[]): number {
  const valid = runs.filter((r) => r.avgPace > 0);
  if (!valid.length) return 0;
  return Math.min(...valid.map((r) => r.avgPace));
}

export function getAveragePace(runs: Run[]): number {
  const valid = runs.filter((r) => r.avgPace > 0 && r.distance > 100);
  if (!valid.length) return 0;
  return valid.reduce((s, r) => s + r.avgPace, 0) / valid.length;
}

export function getLongestRun(runs: Run[]): Run | null {
  if (!runs.length) return null;
  return runs.reduce((best, r) => (r.distance > best.distance ? r : best), runs[0]);
}

export function getWeeklyDistanceHistory(runs: Run[], weeks = 8): number[] {
  return Array.from({ length: weeks }, (_, i) => {
    const wStart = startOfWeek(Date.now()) - (weeks - 1 - i) * 7 * 24 * 3600 * 1000;
    const wEnd = wStart + 7 * 24 * 3600 * 1000;
    return (
      runs
        .filter((r) => r.startTime >= wStart && r.startTime < wEnd)
        .reduce((s, r) => s + r.distance, 0) / 1000
    );
  });
}

export function getConsistencyScore(runs: Run[], days = 30): number {
  const start = Date.now() - days * 24 * 3600 * 1000;
  const recent = runs.filter((r) => r.startTime >= start);
  const runDays = new Set(recent.map((r) => startOfDay(r.startTime)));
  return Math.round((runDays.size / days) * 100);
}

export function generateInsights(runs: Run[]): string[] {
  if (runs.length === 0) return ["Start your first run to unlock insights!"];
  const insights: string[] = [];
  const sorted = [...runs].sort((a, b) => b.startTime - a.startTime);
  const latest = sorted[0];
  const prev = sorted.slice(1, 6);

  if (prev.length >= 3) {
    const avgPrev = prev.reduce((s, r) => s + r.avgPace, 0) / prev.length;
    const change = ((avgPrev - latest.avgPace) / avgPrev) * 100;
    if (change > 1.5) {
      insights.push(
        `Your last run was ${change.toFixed(1)}% faster than your recent average — great improvement!`
      );
    } else if (change < -3) {
      insights.push(
        `Your last run was ${Math.abs(change).toFixed(1)}% slower than average. More recovery may help.`
      );
    }
  }

  const streak = calculateStreak(runs);
  if (streak >= 7) {
    insights.push(`${streak}-day running streak — outstanding consistency!`);
  } else if (streak >= 3) {
    insights.push(`${streak}-day streak active. Keep it going!`);
  }

  const longestRun = getLongestRun(runs);
  if (longestRun && longestRun.id === latest.id && runs.length > 1) {
    insights.push(`That was your longest run ever at ${formatDistance(latest.distance)}!`);
  }

  const thisWeek = calculateWeeklyDistance(runs);
  const lastWeekStart = startOfWeek(Date.now()) - 7 * 24 * 3600 * 1000;
  const lastWeek = runs
    .filter((r) => r.startTime >= lastWeekStart && r.startTime < startOfWeek(Date.now()))
    .reduce((s, r) => s + r.distance, 0);

  if (lastWeek > 0 && thisWeek > 0) {
    const wChange = ((thisWeek - lastWeek) / lastWeek) * 100;
    if (wChange > 10) {
      insights.push(`You're running ${wChange.toFixed(0)}% more distance than last week!`);
    }
  }

  if (sorted.length >= 2) {
    const daysBetween = (sorted[0].startTime - sorted[1].startTime) / (24 * 3600 * 1000);
    if (daysBetween > 4) {
      insights.push(
        `It had been ${Math.floor(daysBetween)} days since your previous run. Welcome back!`
      );
    }
  }

  if (!insights.length) {
    insights.push(`${runs.length} runs logged. Keep building your base!`);
  }

  return insights.slice(0, 3);
}
