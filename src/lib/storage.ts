import type {
  VisitSchedule,
  BudgetItem,
  ChecklistItem,
  ScriptRecord,
  StressLog,
  AppMeta,
} from './types';
import { STORAGE_KEYS, HOLIDAYS } from './constants';
import { reportQuotaExceeded } from './HolidayContext';

// ---- low-level get/set (손상 JSON, quota 방어) ----

export function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}

function isQuotaExceededError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false;
  return err.name === 'QuotaExceededError' || err.code === 22 || err.message.includes('QuotaExceeded');
}

export function set<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    if (isQuotaExceededError(err)) {
      reportQuotaExceeded();
      return;
    }
    throw err;
  }
}

// 기존 호출부(HolidayContext) 호환용 얇은 별칭
export function getItem<T>(key: string): T | null {
  return get<T | null>(key, null);
}

export function setItem<T>(key: string, value: T): void {
  set(key, value);
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

export function newId(): string {
  return crypto.randomUUID();
}

function listAll<T>(key: string): T[] {
  const data = get<unknown>(key, []);
  return Array.isArray(data) ? (data as T[]) : [];
}

function removeById(key: string, id: string): void {
  const items = listAll<{ id: string }>(key);
  set(
    key,
    items.filter((item) => item.id !== id),
  );
}

// ---- VisitSchedule ----

export function listSchedules(holidayId: string): VisitSchedule[] {
  return listAll<VisitSchedule>(STORAGE_KEYS.schedules).filter((s) => s.holidayId === holidayId);
}

export function addSchedule(input: Omit<VisitSchedule, 'id' | 'createdAt'>): VisitSchedule {
  const schedule: VisitSchedule = { ...input, id: newId(), createdAt: Date.now() };
  set(STORAGE_KEYS.schedules, [...listAll<VisitSchedule>(STORAGE_KEYS.schedules), schedule]);
  return schedule;
}

export function removeSchedule(id: string): void {
  removeById(STORAGE_KEYS.schedules, id);
}

// ---- BudgetItem ----

export function listBudgets(holidayId: string): BudgetItem[] {
  return listAll<BudgetItem>(STORAGE_KEYS.budgets).filter((b) => b.holidayId === holidayId);
}

export function addBudget(input: Omit<BudgetItem, 'id' | 'createdAt'>): BudgetItem {
  const budget: BudgetItem = { ...input, id: newId(), createdAt: Date.now() };
  set(STORAGE_KEYS.budgets, [...listAll<BudgetItem>(STORAGE_KEYS.budgets), budget]);
  return budget;
}

export function removeBudget(id: string): void {
  removeById(STORAGE_KEYS.budgets, id);
}

export function updateBudget(id: string, patch: Partial<Omit<BudgetItem, 'id' | 'holidayId' | 'createdAt'>>): void {
  const items = listAll<BudgetItem>(STORAGE_KEYS.budgets);
  set(
    STORAGE_KEYS.budgets,
    items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  );
}

// ---- ChecklistItem ----

export function listChecklist(holidayId: string): ChecklistItem[] {
  return listAll<ChecklistItem>(STORAGE_KEYS.checklist).filter((c) => c.holidayId === holidayId);
}

export function addChecklistItem(input: Omit<ChecklistItem, 'id'>): ChecklistItem {
  const item: ChecklistItem = { ...input, id: newId() };
  set(STORAGE_KEYS.checklist, [...listAll<ChecklistItem>(STORAGE_KEYS.checklist), item]);
  return item;
}

export function removeChecklistItem(id: string): void {
  removeById(STORAGE_KEYS.checklist, id);
}

export function updateChecklistItem(id: string, patch: Partial<Omit<ChecklistItem, 'id'>>): void {
  const items = listAll<ChecklistItem>(STORAGE_KEYS.checklist);
  set(
    STORAGE_KEYS.checklist,
    items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  );
}

// ---- ScriptRecord ----

export function listScripts(): ScriptRecord[] {
  return listAll<ScriptRecord>(STORAGE_KEYS.scripts);
}

export function addScript(input: Omit<ScriptRecord, 'id' | 'createdAt'>): ScriptRecord {
  const script: ScriptRecord = { ...input, id: newId(), createdAt: Date.now() };
  set(STORAGE_KEYS.scripts, [...listAll<ScriptRecord>(STORAGE_KEYS.scripts), script]);
  return script;
}

export function removeScript(id: string): void {
  removeById(STORAGE_KEYS.scripts, id);
}

// ---- StressLog ----

export function listStressLogs(holidayId: string): StressLog[] {
  return listAll<StressLog>(STORAGE_KEYS.stressLogs).filter((s) => s.holidayId === holidayId);
}

export function addStressLog(input: Omit<StressLog, 'id' | 'createdAt'>): StressLog {
  const log: StressLog = { ...input, id: newId(), createdAt: Date.now() };
  set(STORAGE_KEYS.stressLogs, [...listAll<StressLog>(STORAGE_KEYS.stressLogs), log]);
  return log;
}

export function removeStressLog(id: string): void {
  removeById(STORAGE_KEYS.stressLogs, id);
}

// ---- AppMeta ----

function defaultMeta(): AppMeta {
  return {
    aiNoticeAck: false,
    currentHolidayId: HOLIDAYS[0]?.id ?? '',
    isPaid: false,
  };
}

export function getMeta(): AppMeta {
  return get<AppMeta>(STORAGE_KEYS.meta, defaultMeta());
}

export function setMeta(meta: AppMeta): void {
  set(STORAGE_KEYS.meta, meta);
}
