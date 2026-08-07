/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

export type RouteState = { path: string; query?: Record<string, unknown> };

export type User = { id: string; name: string; email?: string; tossLinked?: boolean };

export type MoodEntry = { id: string; date: string; mood: number; note?: string; createdAt?: string };

export type VisitRecord = { id: string; date: string; person: string; minutes: number };

export type Budget = { id: string; category: string; amountKrw: number; period: 'daily' | 'monthly'; date: string };

export type Script = { id: string; title: string; content: string; createdAt: string; usage?: number };

export type getStorageFn = <T = unknown>(key: string) => T | null;

export type setStorageFn = <T = unknown>(key: string, value: T) => void;

/** Map of 'YYYY-MM-DD' to holiday name (구현: 패킷 0002) */
export type HOLIDAYS = Record<string, string>;

export type useAppDataFn = () => { user: User | null; moods: MoodEntry[]; visits: VisitRecord[]; budgets: Budget[]; scripts: Script[]; isLoading: boolean };

export type calculateMoodStatsFn = (entries: MoodEntry[]) => { average: number; trend: number; count: number };

export type calculateVisitBalanceFn = (records: VisitRecord[], range: [string, string]) => { totalDays: number; totalMinutes: number; daysWithVisits: number };

export type initTossSessionFn = () => Promise<{ success: boolean; message?: string }>;

export type getTossSessionTokenFn = () => string | null;

export type generateScriptFn = (prompt: string, context?: { person?: string; relationship?: string }) => Promise<Script>;

export type navigateToFn = (path: string, opts?: { replace?: boolean; query?: Record<string, unknown> }) => void;
