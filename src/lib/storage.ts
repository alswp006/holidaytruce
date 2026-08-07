import type {
  Couple,
  Visit,
  BudgetItem,
  ChecklistItem,
  Script,
  MoodLog,
  AppFlags,
} from "@/lib/types";

export type WriteResult = { ok: boolean; reason?: "quota" };

const KEYS = {
  couple: "ht_couple",
  visits: "ht_visits",
  budget: "ht_budget",
  checklist: "ht_checklist",
  scripts: "ht_scripts",
  moodlogs: "ht_moodlogs",
  flags: "ht_flags",
} as const;

export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getList<T>(key: string): T[] {
  const value = getItem<T[]>(key);
  return Array.isArray(value) ? value : [];
}

export function setItem<T>(key: string, value: T): WriteResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, reason: "quota" };
  }
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

// ── Couple (single entity) ──────────────────────────────────────────────

export function getCouple(): Couple | null {
  return getItem<Couple>(KEYS.couple);
}

export function saveCouple(couple: Couple): WriteResult {
  return setItem(KEYS.couple, couple);
}

// ── Visit (array entity) ────────────────────────────────────────────────

export function getVisits(): Visit[] {
  return getList<Visit>(KEYS.visits);
}

export function addVisit(visit: Visit): WriteResult {
  const visits = getVisits();
  visits.push(visit);
  return setItem(KEYS.visits, visits);
}

export function removeVisit(id: string): WriteResult {
  const visits = getVisits().filter((v) => v.id !== id);
  return setItem(KEYS.visits, visits);
}

// ── Budget (array entity) ───────────────────────────────────────────────

export function getBudget(): BudgetItem[] {
  return getList<BudgetItem>(KEYS.budget);
}

export function addBudgetItem(item: BudgetItem): WriteResult {
  const budget = getBudget();
  budget.push(item);
  return setItem(KEYS.budget, budget);
}

// ── Checklist (array entity) ────────────────────────────────────────────

export function getChecklist(): ChecklistItem[] {
  return getList<ChecklistItem>(KEYS.checklist);
}

export function toggleChecklist(id: string): WriteResult {
  const checklist = getChecklist().map((item) =>
    item.id === id ? { ...item, done: !item.done } : item,
  );
  return setItem(KEYS.checklist, checklist);
}

// ── Script (array entity) ───────────────────────────────────────────────

export function getScripts(): Script[] {
  return getList<Script>(KEYS.scripts);
}

export function addScript(script: Script): WriteResult {
  const scripts = getScripts();
  scripts.push(script);
  return setItem(KEYS.scripts, scripts);
}

// ── MoodLog (array entity) ──────────────────────────────────────────────

export function getMoodLogs(): MoodLog[] {
  return getList<MoodLog>(KEYS.moodlogs);
}

export function addMoodLog(mood: MoodLog): WriteResult {
  const logs = getMoodLogs();
  logs.push(mood);
  return setItem(KEYS.moodlogs, logs);
}

// ── AppFlags (single entity) ────────────────────────────────────────────

export function getFlags(): AppFlags | null {
  return getItem<AppFlags>(KEYS.flags);
}

export function saveFlags(flags: AppFlags): WriteResult {
  return setItem(KEYS.flags, flags);
}
