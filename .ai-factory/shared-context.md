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

export type User = { id: string; name: string; email?: string };

export type FamilyMember = { id: string; name: string; relationship?: string };

export type Schedule = { id: string; date: string; memberId: string; notes?: string };

export type Mood = { id: string; date: string; level: number; notes?: string };

export type Budget = { id: string; month: string; category: string; amount: number; spent?: number };

export type getUserFn = () => User | null;

export type saveUserFn = (user: User) => void;

export type getFamilyMembersFn = () => FamilyMember[];

export type saveFamilyMembersFn = (members: FamilyMember[]) => void;

export type getSchedulesFn = (date?: string) => Schedule[];

export type saveSchedulesFn = (schedules: Schedule[]) => void;

export type getMoodsFn = () => Mood[];

export type saveMoodsFn = (moods: Mood[]) => void;

export type getBudgetsFn = () => Budget[];

export type saveBudgetsFn = (budgets: Budget[]) => void;

export type getHolidaysFn = (year: number) => { date: string; name: string }[];

export type useAppDataFn = () => { user: User | null; familyMembers: FamilyMember[]; schedules: Schedule[]; moods: Mood[]; budgets: Budget[] };

export type getTossSessionFn = () => string | null;

export type setTossSessionFn = (token: string) => void;

export type createScriptFn = (params: any) => Promise<{ scriptId: string; content: string }>;

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
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- contract.ts: export type User =; export type FamilyMember =; export type Schedule =; export type Mood =; export type Budget =; export type getUserFn = () => User | null; export type saveUserFn = (user: User) => void; export type getFamilyMembersFn = () => FamilyMember[]
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export interface Couple; export interface Visit; export interface BudgetItem; export interface ChecklistItem; export interface Script; export interface MoodLog; export interface AppFlags; export interface Holiday
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
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 + RouteState 계약 정의 (files: src/lib/types.ts)
- 0002: localStorage CRUD 헬퍼 + 명절 상수 테이블 (files: src/lib/storage.ts, src/lib/holidays.ts)