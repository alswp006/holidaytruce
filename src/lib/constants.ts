// Storage keys for localStorage
export const STORAGE_KEYS = {
  schedules: "ht.schedules",
  budgets: "ht.budgets",
  checklist: "ht.checklist",
  scripts: "ht.scripts",
  stressLogs: "ht.stressLogs",
  meta: "ht.meta",
} as const;

// Holidays metadata
interface Holiday {
  id: string;
  label: string;
  date: string;
}

export const HOLIDAYS: Holiday[] = [
  {
    id: "2026-seollal",
    label: "설날",
    date: "2026-02-10",
  },
  {
    id: "2026-chuseok",
    label: "추석",
    date: "2026-09-25",
  },
];
