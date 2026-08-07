# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
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

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// ============================================================================
// Entity Types (from SPEC Data Models)
// ============================================================================

export interface Couple {
  id: string;
  myRole: "며느리" | "사위" | "아내" | "남편";
  myFamilyLabel: string;
  partnerFamilyLabel: string;
  createdAt: number;
}

export interface Visit {
  id: string;
  family: "mine" | "partner";
  date: string;
  startHour: number;
  durationHours: number;
  holidayId: string;
  memo: string;
}

export interface BudgetItem {
  id: string;
  holidayId: string;
  target: "본가" | "시댁" | "기타";
  category: "용돈" | "선물" | "교통" | "기타";
  label: string;
  amount: number;
}

export interface ChecklistItem {
  id: string;
  holidayId: string;
  text: string;
  done: boolean;
}

export interface Script {
  id: string;
  situation: string;
  tone: "정중하게" | "단호하게" | "유머러스하게";
  question: string;
  resultText: string;
  createdAt: number;
  isAi: true;
}

export interface MoodLog {
  id: string;
  holidayId: string;
  exhaustionLevel: number;
  stressTags: string[];
  note: string;
  createdAt: number;
}

export interface AppFlags {
  aiNoticeAcknowledged: boolean;
  activeHolidayId: string;
  purchasedHolidays: string[];
}

export interface Holiday {
  id: string;
  name: string;
  /** "YYYY-MM-DD" 양력 날짜 — D-day 계산 등에 사용 */
  date?: string;
}

// ============================================================================
// API Contract Types
// ============================================================================

export interface ScriptRequest {
  situation: Situation;
  tone: Tone;
  question: string;
}

export interface ScriptResponse {
  reply: string;
  disclaimer: string;
}

export interface ApiError {
  error: string;
}

// ============================================================================
// Constants & Union Types
// ============================================================================

export const SITUATIONS = [
  "결혼계획질문",
  "취업질문",
  "외모지적",
  "명절노동분담",
  "기타",
] as const;

export type Situation = typeof SITUATIONS[number];

export const TONES = ["정중하게", "단호하게", "유머러스하게"] as const;

export type Tone = typeof TONES[number];

export const STRESS_TAGS = [
  "과한질문",
  "가사노동",
  "일정불균형",
] as const;

export type StressTag = typeof STRESS_TAGS[number];

// ============================================================================
// Route State Type (location.state contracts for all routes)
// ============================================================================

export type RouteState = {
  "/": undefined;
  "/setup": undefined;
  "/script": undefined;
  "/script/result": { scriptId: string };
  "/calendar": undefined;
  "/budget": undefined;
  "/report": undefined;
  "/report/new": undefined;
};

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    contract.ts
    holidays.ts
    scriptApi.ts
    storage.ts
    types.ts
    useAppData.ts
    utils.ts
  main.tsx
  pages/
    BudgetPage.tsx
    CalendarPage.tsx
    Home.tsx
    HomePage.tsx
    MoodNewPage.tsx
    ReportPage.tsx
    ScriptPage.tsx
    ScriptResultPage.tsx
    SetupPage.tsx
    __TdsGallery.tsx
    __chiptest.tsx
    __noJsxTest.tsx
    __tmpMinimal.ts
    __tmpMinimal.tsx
  styles/
    globals.css
    home-purchase.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- contract.ts: export type User =; export type FamilyMember =; export type Schedule =; export type Mood =; export type Budget =; export type getUserFn = () => User | null; export type saveUserFn = (user: User) => void; export type getFamilyMembersFn = () => FamilyMember[]
- holidays.ts: export const HOLIDAYS: Holiday[] = [; export function getHolidayById(id: string): Holiday | null; export function getDday(holidayId: string, today: Date = new Date()): number | null
- scriptApi.ts: export async function requestScript( req: ScriptRequest ): Promise<
- storage.ts: export type WriteResult =; export function uuid(): string; export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): WriteResult; export function removeItem(key: string): void; export function getCouple(): Couple | null; export function saveCouple(couple: Couple): WriteResult; export function getVisits(): Visit[]
- types.ts: export interface Couple; export interface Visit; export interface BudgetItem; export interface ChecklistItem; export interface Script; export interface MoodLog; export interface AppFlags; export interface Holiday
- useAppData.ts: export function useAppData(); export function calcBalance(visits: Visit[]):; export function calcBudget( items: BudgetItem[], ):; export function calcChecklistProgress( items: ChecklistItem[], ):; export function calcMoodReport( logs: MoodLog[], ):; export function isPremium(flags: AppFlags | null, activeHolidayId: string): boolean; export function acknowledgeAiNotice(): void; export function setActiveHoliday(id: string): void
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/holidays.ts → imports: lib/types
  lib/scriptApi.ts → imports: lib/types
  lib/storage.ts → imports: lib/types
  pages/BudgetPage.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/CountUp, components/Card, components/MiniBar, components/StateView, lib/storage, lib/useAppData, lib/utils, lib/types
  pages/CalendarPage.tsx → imports: components/ScreenScaffold, components/BottomCTA, components/Card, components/MiniBar, components/StateView, lib/storage, lib/useAppData, lib/types
  pages/HomePage.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/Card, components/Amount, components/MiniBar, components/AdSlot, components/TossPurchase, lib/storage, lib/useAppData, lib/holidays, lib/types
  pages/MoodNewPage.tsx → imports: components/ScreenScaffold, components/BottomCTA, lib/storage, lib/types, lib/types
  pages/ReportPage.tsx → imports: components/ScreenScaffold, components/BottomCTA, components/SummaryHero, components/Amount, components/Sparkline, components/StateView, lib/storage, lib/useAppData
  pages/ScriptPage.tsx → imports: components/ScreenScaffold, components/BottomCTA, components/Card, components/StateView, components/TossRewardAd, lib/storage, lib/scriptApi, lib/useAppData, lib/types, lib/types
  pages/ScriptResultPage.tsx → imports: components/ScreenScaffold, components/Card, lib/storage, lib/types
  pages/SetupPage.tsx → imports: components/ScreenScaffold, components/BottomCTA, components/StateView, lib/storage, lib/holidays, lib/types
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 + RouteState 계약 정의 (files: src/lib/types.ts)
- 0002: localStorage CRUD 헬퍼 + 명절 상수 테이블 (files: src/lib/storage.ts, src/lib/holidays.ts)
- 0003: 앱 상태 훅 + 파생 집계 함수 (files: src/lib/useAppData.ts)
- 0005: 스크립트 생성 API 클라이언트 (files: src/lib/scriptApi.ts)