import { useEffect, useState } from "react";
import type { AppFlags, BudgetItem, ChecklistItem, MoodLog, Visit } from "./types.ts";
import {
  getBudget,
  getChecklist,
  getCouple,
  getFlags,
  getMoodLogs,
  getScripts,
  getVisits,
  saveFlags,
} from "./storage.ts";

export function useAppData() {
  const [loading, setLoading] = useState(true);
  const [couple, setCouple] = useState(getCouple());
  const [flags, setFlags] = useState(getFlags());
  const [visits, setVisits] = useState(getVisits());
  const [budget, setBudget] = useState(getBudget());
  const [checklist, setChecklist] = useState(getChecklist());
  const [scripts, setScripts] = useState(getScripts());
  const [moodLogs, setMoodLogs] = useState(getMoodLogs());

  useEffect(() => {
    setCouple(getCouple());
    setFlags(getFlags());
    setVisits(getVisits());
    setBudget(getBudget());
    setChecklist(getChecklist());
    setScripts(getScripts());
    setMoodLogs(getMoodLogs());
    setLoading(false);
  }, []);

  return { loading, couple, flags, visits, budget, checklist, scripts, moodLogs };
}

// ── Pure aggregation functions ──────────────────────────────────────────

export function calcBalance(visits: Visit[]): { minePct: number; partnerPct: number } {
  const mineHours = visits
    .filter((v) => v.family === "mine")
    .reduce((sum, v) => sum + v.durationHours, 0);
  const partnerHours = visits
    .filter((v) => v.family === "partner")
    .reduce((sum, v) => sum + v.durationHours, 0);
  const totalHours = mineHours + partnerHours;

  if (totalHours === 0) {
    return { minePct: 0, partnerPct: 0 };
  }

  return {
    minePct: Math.round((mineHours / totalHours) * 100),
    partnerPct: Math.round((partnerHours / totalHours) * 100),
  };
}

export function calcBudget(
  items: BudgetItem[],
): { total: number; minePct: number; partnerPct: number } {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const mineAmount = items
    .filter((item) => item.target === "본가")
    .reduce((sum, item) => sum + item.amount, 0);
  const partnerAmount = items
    .filter((item) => item.target === "시댁")
    .reduce((sum, item) => sum + item.amount, 0);

  if (total === 0) {
    return { total: 0, minePct: 0, partnerPct: 0 };
  }

  return {
    total,
    minePct: Math.round((mineAmount / total) * 100),
    partnerPct: Math.round((partnerAmount / total) * 100),
  };
}

export function calcChecklistProgress(
  items: ChecklistItem[],
): { completed: number; total: number; percentage: number } {
  const total = items.length;
  const completed = items.filter((item) => item.done).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, total, percentage };
}

export function calcMoodReport(
  logs: MoodLog[],
): { avg: number; trend: number[]; topTags: { tag: string; count: number }[] } {
  if (logs.length === 0) {
    return { avg: 0, trend: [], topTags: [] };
  }

  const sorted = [...logs].sort((a, b) => a.createdAt - b.createdAt);
  const trend = sorted.map((log) => log.exhaustionLevel);
  const avg = Math.round((trend.reduce((sum, v) => sum + v, 0) / trend.length) * 10) / 10;

  const tagCounts = new Map<string, number>();
  for (const log of logs) {
    for (const tag of log.stressTags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return { avg, trend, topTags };
}

// ── Helper functions ────────────────────────────────────────────────────

export function isPremium(flags: AppFlags | null, activeHolidayId: string): boolean {
  if (!flags) return false;
  return flags.purchasedHolidays.includes(activeHolidayId);
}

export function acknowledgeAiNotice(): void {
  const flags = getFlags();
  saveFlags({
    aiNoticeAcknowledged: true,
    activeHolidayId: flags?.activeHolidayId ?? "",
    purchasedHolidays: flags?.purchasedHolidays ?? [],
  });
}

export function setActiveHoliday(id: string): void {
  const flags = getFlags();
  saveFlags({
    aiNoticeAcknowledged: flags?.aiNoticeAcknowledged ?? false,
    activeHolidayId: id,
    purchasedHolidays: flags?.purchasedHolidays ?? [],
  });
}

export function isImbalanced(percentage: number): boolean {
  return percentage > 70;
}
