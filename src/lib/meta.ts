import type { AppMeta } from './types';
import { STORAGE_KEYS, HOLIDAYS } from './constants';
import { get, set } from './storage';

export function getDefaultHolidayId(now: Date = new Date()): string {
  const today = now.toISOString().slice(0, 10);
  const upcoming = HOLIDAYS.find((h) => h.date >= today);
  return (upcoming ?? HOLIDAYS[HOLIDAYS.length - 1]).id;
}

export function getMeta(): AppMeta {
  const stored = get<Partial<AppMeta>>(STORAGE_KEYS.meta, {});
  return {
    aiNoticeAck: stored.aiNoticeAck ?? false,
    currentHolidayId: stored.currentHolidayId ?? getDefaultHolidayId(),
    isPaid: stored.isPaid ?? false,
  };
}

export function setMeta(meta: AppMeta): AppMeta {
  set(STORAGE_KEYS.meta, meta);
  return meta;
}
