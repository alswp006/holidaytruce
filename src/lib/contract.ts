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
