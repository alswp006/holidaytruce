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
