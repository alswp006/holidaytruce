import type { Holiday } from "@/lib/types";

// 양력 날짜 — 외부 API 미호출, 하드코딩 상수
export const HOLIDAYS: Holiday[] = [
  { id: "2026-lunar-new-year", name: "2026 설날", date: "2026-02-17" },
  { id: "2026-chuseok", name: "2026 추석", date: "2026-09-25" },
];

export function getHolidayById(id: string): Holiday | null {
  return HOLIDAYS.find((holiday) => holiday.id === id) ?? null;
}

// D-day: 오늘 기준 명절까지 남은 일수(지났으면 음수, 당일이면 0)
export function getDday(holidayId: string, today: Date = new Date()): number | null {
  const holiday = getHolidayById(holidayId);
  if (!holiday || !holiday.date) return null;

  const target = new Date(`${holiday.date}T00:00:00`);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = target.getTime() - base.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
