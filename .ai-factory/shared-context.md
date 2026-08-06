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

/** 앱 라우팅 상태, 모든 페이지 + App이 사용 (구현: 패킷 0001) */
export type RouteState = 'home' | 'script' | 'schedule' | 'budget' | 'stress' | 'paywall';

/** 명절 정보, Schedule(0009) 등에서 사용 (구현: 패킷 0003) */
export type Holiday = { date: string; name: string; isLunar?: boolean };

/** API 요청 파라미터, 0006→0005 호출 (구현: 패킷 0001) */
export type ScriptContext = { relationship: string; holidayName: string; tone?: 'formal' | 'casual' | 'warm' };

/** LLM 생성 결과, Script페이지(0008)에서 표시 (구현: 패킷 0005) */
export type Script = { greeting: string; mainBody: string; farewell: string; tips?: string[] };

/** 프로모션 리워드, HomeBanner + 다른 페이지에서 확인 (구현: 패킷 0014) */
export type Promotion = { id: string; type: 'discount' | 'freeTrial' | 'bonus'; description: string; claimed: boolean };

/** 사용자 메타데이터, 페이지들이 meta 상태에서 읽음 (구현: 패킷 0001) */
export type User = { id: string; name: string; relationship: string; preferences?: Record<string, unknown> };

/** Script 페이지(0008)에서 호출, API 클라이언트 (구현: 패킷 0006) */
export type generateScriptFn = (context: ScriptContext) => Promise<Script>;

/** 명절 정보 훅, Schedule(0009) 등에서 사용 (구현: 패킷 0003) */
export type useHolidayFn = () => { holidays: Holiday[]; current?: Holiday };

/** 리워드 훅, HomeBanner(0014) + Home(0007)에서 사용 (구현: 패킷 0014) */
export type usePromotionRewardFn = () => { rewards: Promotion[]; claim: (id: string) => void };

/** 라우트 상수, App(0013) + 페이지 네비게이션에서 사용 (구현: 패킷 0001) */
export type ROUTES = Record<'HOME' | 'SCRIPT' | 'SCHEDULE' | 'BUDGET' | 'STRESS' | 'PAYWALL', string>;

/** 기본 사용자 객체, meta 상태 초기화 (구현: 패킷 0001) */
export type DEFAULT_USER = User;

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Entity types
export interface VisitSchedule {
  id: string;
  side: "본가" | "처가";
  date: string;
  startTime?: string;
  endTime?: string;
  memo: string;
  holidayId: string;
  createdAt: number;
}

export interface BudgetItem {
  id: string;
  side: "본가" | "처가";
  category: "용돈" | "선물" | "차례비용" | "교통" | "기타";
  label: string;
  amount: number;
  paid: boolean;
  holidayId: string;
  createdAt: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  holidayId: string;
}

export interface ScriptRecord {
  id: string;
  situation: string;
  tone: "정중하게" | "단호하게" | "유머러스하게";
  result: string;
  createdAt: number;
}

export interface StressLog {
  id: string;
  holidayId: string;
  score: number;
  triggers: string[];
  memo: string;
  createdAt: number;
}

export interface AppMeta {
  aiNoticeAck: boolean;
  currentHolidayId: string;
  isPaid: boolean;
}

// API types
export interface ScriptRequest {
  situation: string;
  tone: "정중하게" | "단호하게" | "유머러스하게";
}

export interface ScriptResponse {
  result: string;
  model: string;
}

// 클라이언트 API 에러 응답 (단순)
export interface ApiError {
  error: string;
}

// 서버 에러 응답 (더 상세)
export interface ServerApiError {
  code: string;
  message: string;
}

// Route state union
export type RouteState = {
  scriptData?: ScriptRecord;
  scheduleData?: VisitSchedule;
  budgetData?: BudgetItem;
  stressData?: StressLog;
  isPaid?: boolean;
  fromPage?: string;
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
    HolidayContext.tsx
    contract.ts
    nav.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Budget.tsx
    Home.tsx
    Paywall.tsx
    Schedule.tsx
    Script.tsx
    Stress.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
    jest-dom.d.ts
  vite-env.d.ts

### Exports (src/lib/)
- contract.ts: export type RouteState = 'home' | 'script' | 'schedule' | 'budget' | 'stress' | 'paywall'; export type Holiday =; export type ScriptContext =; export type Script =; export type Promotion =; export type User =; export type generateScriptFn = (context: ScriptContext) => Promise<Script>; export type useHolidayFn = () =>
- nav.ts: export const TABS: TabItem[] = [
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
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
- 0002: localStorage CRUD 헬퍼 + 방어 로직 (files: src/lib/storage.ts)
- 0003: 명절 컨텍스트 + meta 상태 관리 (files: src/lib/HolidayContext.tsx, src/lib/meta.ts)
- 0004: 백엔드 스캐폴딩 + CORS + 헬스체크 (files: server/package.json, server/src/index.ts, server/.env.example)
- 0006: 스크립트 생성 API 클라이언트 (files: src/lib/api.ts)
- 0010: 예산 계산기 & 갈등 방지 체크리스트 페이지 /budget (files: src/pages/Budget.tsx)