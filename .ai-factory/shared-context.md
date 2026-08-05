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

/** AI 생성 스크립트 엔티티 (구현: 패킷 0001) */
export type Script = { id: string; name: string; content: string; createdAt: string; isPremium?: boolean };

/** 방문 기록 엔티티 (구현: 패킷 0001) */
export type Visit = { id: string; date: string; durationMin: number; scriptId: string };

/** 월별 예산 엔티티 (구현: 패킷 0001) */
export type Budget = { id: string; month: string; allocatedKrw: number; usedKrw: number };

/** 감정소진 점수 엔티티 (구현: 패킷 0001) */
export type Burnout = { id: string; date: string; score: number; category?: string };

/** 앱 전역 상태 (구현: 패킷 0001) */
export type AppMeta = { isPremium: boolean; premiumExpireAt?: string; totalVisits: number };

/** 라우팅 상태 (구현: 패킷 0001) */
export type RouteState = { path: string; params?: Record<string, string | number> };

/** 프리미엄 & 메타 전역 훅 (구현: 패킷 0003) */
export type useMetaStoreFn = () => { meta: AppMeta; setPremium: (flag: boolean) => void; updateMeta: (p: Partial<AppMeta>) => void };

/** 도메인 엔티티 CRUD 훅 (구현: 패킷 0004) */
export type useDomainStoreFn = () => { scripts: Script[]; visits: Visit[]; budgets: Budget[]; burnouts: Burnout[]; addScript: (s: Omit<Script, 'id' | 'createdAt'>) => string; updateScript: (id: string, p: Partial<Script>) => void; deleteScript: (id: string) => void };

/** AI 스크립트 API 클라이언트 훅 (구현: 패킷 0005) */
export type useScriptApiFn = () => { generate: (prompt: string) => Promise<{ content: string; tokens: number }>; analyze: (visits: Visit[]) => Promise<string> };

/** KRW 금액 포맷팅 (구현: 패킷 0014) */
export type formatAmountKrwFn = (krw: number) => string;

/** ISO 날짜 포맷팅 (구현: 패킷 0014) */
export type formatDateFn = (date: string, fmt?: 'short' | 'long') => string;

/** 감정소진 추세 계산 (구현: 패킷 0014) */
export type calculateBurnoutTrendFn = (burnouts: Burnout[]) => { avg: number; direction: 'up' | 'down' | 'stable' };

/** AI 결과 라벨 컴포넌트 props (구현: 패킷 0014) */
export type AiResultLabelProps = { label: string; confidence?: 0 | 1 | 2 | 3; onCopy?: () => void };

/** 공 상태 컴포넌트 props (구현: 패킷 0014) */
export type EmptyStateProps = { icon: string; title: string; subtitle?: string; action?: { label: string; onClick: () => void } };

/** 햅틱 피드백 트리거 (구현: 패킷 0014) */
export type triggerHapticFn = (type: 'light' | 'medium' | 'heavy') => void;

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Reference Catalogs (as const) — Single Source of Truth for all domains
export const RELATIONS = ["시댁", "처가"] as const;
export type Relation = typeof RELATIONS[number];

export const TONES = ["정중", "단호", "유머"] as const;
export type ToneKey = typeof TONES[number];

export const SEASONS = ["2026-설", "2026-추석", "2027-설", "2027-추석"] as const;
export type Season = typeof SEASONS[number];

export const CAUSES = [
  "과도한 질문",
  "가사 부담",
  "장거리 이동",
  "비교·잔소리",
  "경제적 부담",
  "음식 준비",
  "형제·친척 갈등",
  "휴식 부족",
] as const;
export type Cause = typeof CAUSES[number];

// Data Models

// AppMeta — Global app flags (singleton, no id)
export interface AppMeta {
  aiNoticeAck: boolean;
  premiumUnlocked: boolean;
  premiumSeason: Season | null;
  createdAt: number;
  updatedAt: number;
}

// ScriptRequest — AI script generation request (value object, embedded in ScriptResult)
export interface ScriptRequest {
  relation: Relation;
  situation: string; // max 200 chars
  tone: ToneKey;
}

// ScriptResult — AI-generated script response (collection entity)
export interface ScriptResult {
  id: string; // crypto.randomUUID()
  request: ScriptRequest;
  scripts: string[]; // array of 3 generated sentences
  aiGenerated: true; // label flag for UI
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

// VisitPlan — Holiday visit schedule (collection entity)
export interface VisitPlan {
  id: string; // crypto.randomUUID()
  relation: Relation;
  date: string; // "YYYY-MM-DD"
  hours: number; // 0.5~48 hours
  memo: string; // max 100 chars
  createdAt: number;
  updatedAt: number;
}

// BudgetItem — Budget item (embedded in BudgetPlan)
export interface BudgetItem {
  id: string; // crypto.randomUUID()
  relation: Relation;
  label: string; // max 40 chars
  amount: number; // ₩, 0~10,000,000
  checked: boolean; // preparation complete flag
  createdAt: number;
  updatedAt: number;
}

// BudgetPlan — Holiday budget plan (singleton, no id)
export interface BudgetPlan {
  items: BudgetItem[];
  createdAt: number;
  updatedAt: number;
}

// BurnoutLog — Emotional burnout record (collection entity)
export interface BurnoutLog {
  id: string; // crypto.randomUUID()
  season: Season;
  score: number; // 1~10
  causes: Cause[]; // subset of CAUSES catalog
  note: string; // max 300 chars
  createdAt: number;
  updatedAt: number;
}

// API Contracts

// ScriptApiRequest — External AI API request shape
export interface ScriptApiRequest {
  relation: Relation;
  situation: string; // 1~200 chars
  tone: ToneKey;
}

// ScriptApiResponse — External AI API response shape
export interface ScriptApiResponse {
  scripts: string[]; // exactly 3 sentences
}

// ApiError — Standard error response shape
export interface ApiError {
  error: string; // error code (e.g., "invalid_situation", "rate_limited", "internal_error")
}

// RouteState — Type-safe screen-to-screen navigation state
export type RouteState = {
  "/": undefined;
  "/script": undefined;
  "/script/result": { 
// ...truncated
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
- contract.ts: export type Script =; export type Visit =; export type Budget =; export type Burnout =; export type AppMeta =; export type RouteState =; export type useMetaStoreFn = () =>; export type useDomainStoreFn = () =>
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export const RELATIONS = ["시댁", "처가"] as const; export type Relation = typeof RELATIONS[number]; export const TONES = ["정중", "단호", "유머"] as const; export type ToneKey = typeof TONES[number]; export const SEASONS = ["2026-설", "2026-추석", "2027-설", "2027-추석"] as const; export type Season = typeof SEASONS[number]; export const CAUSES = [ "과도한 질문", "가사 부담", "장거리 이동", "비교·잔소리", "경제적 부담", "음식 준비", "형제·친척 갈등", "휴식 부족", ] as const; export type Cause = typeof CAUSES[number]
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
- 0001: 엔티티 타입·참조 카탈로그·RouteState 정의 (files: src/lib/types.ts)