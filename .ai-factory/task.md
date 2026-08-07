The cross-validation's core "gaps" (missing API/UI/monetization Epics) were artifacts of truncated excerpts — the full TASK already covers those. After reconciling against the **complete** SPEC + TASK, only two genuine gaps remain unaddressed by any task:

1. **Toss 인증/통합 상태 확인** (`getIsTossLoginIntegratedService()`) — SPEC Common Principle, no task touches it.
2. **`grantPromotionReward()`** — SPEC Common Principle, but F1-AC7 explicitly mandates *프로모션 UI 미노출* in this MVP → needs an explicit "intentionally excluded" record so it's not read as an oversight.

Below is the complete updated TASK with a new **Task 1.4** (session/integration util), guard wiring added to **Task 4.1**, a **Common Principles Coverage** section, and the promotion-exclusion decision documented.

---

# TASK — HolidayTruce

> 스택: Vite + React + TS + TDS(@toss/tds-mobile) + react-router-dom + localStorage. 템플릿 제공(AdSlot / TossRewardAd / TossPurchase / FloatingTabBar / ScreenScaffold / SummaryHero / MiniBar / Sparkline)은 재작성하지 않음.

---

## Epic 1. Data Layer (types → storage → state → session)

**Risk Assessment**
- **Complexity**: Medium
- **Risk factors**: (1) 페이지 간 `location.state` 계약 불일치로 결과/리포트 화면 크래시(실사고 SplitMate 재현 위험). (2) `ht_scripts`가 최대 50KB로 가장 크며 QuotaExceededError 가능. (3) 라벨(본가/시댁)이 Couple 설정에 종속돼 하드코딩 시 불일치. (4) 토스 통합 상태 조회(`getIsTossLoginIntegratedService`)가 비토스 환경/미지원 SDK에서 throw 시 앱 부팅 크래시.
- **Mitigation**: Task 1.1에서 `RouteState`를 먼저 확정해 모든 페이지가 동일 타입을 import. Task 1.2 storage 헬퍼가 QuotaExceededError를 try/catch로 감싸 `{ ok:false, reason:'quota' }` 반환(F1-AC5). Task 1.3 state 훅이 Couple 라벨을 단일 소스로 노출. Task 1.4 세션 헬퍼가 모든 조회를 try/catch로 감싸 실패 시 `integrated:false`로 정규화(부팅 크래시 0).

### Task 1.1 엔티티 타입 + RouteState 정의
- **Description**: SPEC의 Data Models 전 엔티티(`Couple`, `Visit`, `BudgetItem`, `ChecklistItem`, `Script`, `MoodLog`, `AppFlags`)와 API 계약(`ScriptRequest`, `ScriptResponse`, `ApiError`)을 순수 타입으로 선언한다. 명절 상수 테이블용 `Holiday` 타입과, 모든 라우트의 `location.state` 계약인 `RouteState` 타입을 정의한다. 런타임 코드 없음(타입/상수만).
- **DoD**:
  - 모든 엔티티 인터페이스가 SPEC 필드/유니온과 1:1 일치, `tsc --noEmit` 통과.
  - `RouteState` 정의:
    ```ts
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
  - `situation`/`tone`/`stressTags` 프리셋 유니온 및 상수 배열 export.
- **Covers**: [F2-AC결과계약(S4)], [F1-AC7(프로모션 UI 미노출은 flags 타입 기반)]
- **Files**: `src/lib/types.ts`
- **Depends on**: none

### Task 1.2 localStorage CRUD 헬퍼
- **Description**: `ht_couple / ht_visits / ht_budget / ht_checklist / ht_scripts / ht_moodlogs / ht_flags` 7개 키에 대한 read/write 헬퍼와 배열 엔티티의 add/update/remove를 구현. 모든 write는 QuotaExceededError를 잡아 `{ ok: boolean; reason?: 'quota' }` 반환. 파싱 실패 시 기본값 fallback. uuid 생성 유틸 포함.
- **DoD**:
  - `getCouple/saveCouple`, `getVisits/addVisit/removeVisit`, `getBudget/addBudgetItem`, `getChecklist/toggleChecklist`, `getScripts/addScript`, `getMoodLogs/addMoodLog`, `getFlags/saveFlags` 구현.
  - JSON.parse 실패 시 throw 없이 기본값 반환(F6-AC5 fallback).
  - write 실패 시 `console.error` 미사용, 구조화 결과 반환(F1-AC5, F6-AC7).
  - 명절 상수 테이블(`HOLIDAYS: Holiday[]`, 설/추석 양력) 정의, 외부 API 미호출.
- **Covers**: [F1-AC5], [F6-AC5], [F6-AC7]
- **Files**: `src/lib/storage.ts`, `src/lib/holidays.ts`
- **Depends on**: Task 1.1

### Task 1.3 앱 상태 훅(선택/집계 로직)
- **Description**: storage 헬퍼를 감싸 로딩 상태·라벨 해석·파생 집계를 제공하는 경량 훅/컨텍스트. Couple 라벨(본가/시댁)을 단일 소스로 노출하고, 균형 지표/예산 총액·비율/체크리스트 진행률/소진 추이 등 순수 계산 함수를 제공. AI 고지 확인 및 프리미엄 여부 헬퍼 포함.
- **DoD**:
  - `useAppData()`가 `{ loading, couple, flags, visits, budget, checklist, scripts, moodLogs }` 반환, 초기 로드 중 `loading=true`.
  - 순수 함수 export: `calcBalance(visits)` → `{ minePct, partnerPct }`, `calcBudget(items)` → `{ total, minePct, partnerPct }`, `calcChecklistProgress`, `calcMoodReport(logs)` → `{ avg, trend[], topTags[] }`.
  - `isPremium(flags, activeHolidayId)`, `acknowledgeAiNotice()`, `setActiveHoliday()` 제공.
  - 불균형 70% 초과 판정 헬퍼 `isImbalanced` 포함(F3-AC3).
- **Covers**: [F3-AC2], [F3-AC3], [F4-AC2], [F5-AC2], [F5-AC3], [F6-AC3(광고제거 판정)]
- **Files**: `src/lib/useAppData.ts`
- **Depends on**: Task 1.2

### Task 1.4 토스 세션/통합 상태 헬퍼 (신규 — 인증 갭 해소)
- **Description**: SPEC Common Principle("인증: 토스 세션 자동 제공. 별도 로그인 함수 호출 없음. 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 상태만 확인.")를 코드로 배선. 로그인/세션 획득 함수는 **호출하지 않고**, 통합 여부만 조회하는 안전 래퍼를 제공. 비토스 환경/미지원 SDK/throw를 모두 흡수해 부팅을 막지 않는다. 이 앱은 localStorage 전용이라 통합 상태는 **UI 게이팅에 사용하지 않으며**, 진단/라벨 목적의 비차단 신호로만 노출한다.
- **DoD**:
  - `getTossIntegration(): Promise<{ integrated: boolean }>` 구현 — 내부에서 `getIsTossLoginIntegratedService()`를 `@apps-in-toss/web-framework`에서 import 후 try/catch, 실패/미지원/throw 시 `{ integrated:false }` 반환(throw 없음, `console.error` 미사용).
  - `useTossIntegration()` 훅: `{ checked, integrated }` 반환, 조회 전 `checked=false`. 결과와 무관하게 앱 렌더를 차단하지 않음(어떤 경로도 로딩 무한대기/크래시 금지).
  - 별도 로그인/세션 획득 함수 호출 코드 0건(정적 확인) — 세션은 토스가 자동 제공.
  - 통합 상태가 `false`여도 모든 기능이 정상 동작(localStorage 전용 설계 보증).
- **Covers**: [Common: 인증(토스 세션 자동 제공, 통합 상태만 확인)]
- **Files**: `src/lib/tossSession.ts`
- **Depends on**: none

---

## Epic 2. API Route (외부 AI 클라이언트)

**Risk Assessment**
- **Complexity**: Low
- **Risk factors**: CORS 미설정 HTTPS 엔드포인트로 호출 시 콘솔 CORS 에러(F2-AC8). 비200/네트워크 오류 미처리 시 크래시.
- **Mitigation**: env(`VITE_SCRIPT_API_URL`) HTTPS 강제, 모든 오류를 typed 결과로 정규화해 UI가 크래시 없이 재시도 렌더.

### Task 2.1 스크립트 생성 API 클라이언트
- **Description**: `POST /api/script` 호출 클라이언트. `ScriptRequest` 전송, 200이면 `{ ok:true, data:ScriptResponse }`, 비200/네트워크 오류면 `{ ok:false }` 반환. HTTPS env URL만 사용, fetch를 try/catch로 감싸 `console.error` 미출력.
- **DoD**:
  - `requestScript(req: ScriptRequest): Promise<{ ok:true; data:ScriptResponse } | { ok:false }>`.
  - 400/429/500 및 네트워크 오류 모두 `ok:false`로 정규화(throw 없음).
  - URL은 `import.meta.env.VITE_SCRIPT_API_URL`(https) 사용, CORS 기본 모드.
- **Covers**: [F2-AC5], [F2-AC8]
- **Files**: `src/lib/scriptApi.ts`
- **Depends on**: Task 1.1

---

## Epic 3. UI Pages (ONE page per task)

**Risk Assessment**
- **Complexity**: High
- **Risk factors**: (1) `/script/result`가 `location.state` 없이 새로고침/직접진입 시 `.state.scriptId` 접근으로 크래시(실사고 재현). (2) 빈 상태/로딩 상태 누락으로 검수 반려. (3) TDS 여백을 Tailwind로 덮어써 UI 붕괴.
- **Mitigation**: 모든 state 수신 페이지는 `const s = (useLocation().state as RouteState[...]) ?? null; if(!s) return <Navigate to=... replace/>` 필수. 각 페이지 DoD에 Loading/Empty/Error 3상태 명시. 여백은 TDS Spacing만.

### Task 3.1 초기 설정 페이지 `/setup`
- **Description**: 역할/가족 호칭/대상 명절을 설정·저장. ScreenScaffold + Top + Chip(역할·명절) + TextField(호칭) + SubmitFooter Button(display="block"). 저장 성공 시 토스트 후 `navigate('/', { replace:true })`.
- **DoD**:
  - `{ myRole, myFamilyLabel, partnerFamilyLabel }` 제출 → `ht_couple` 저장, 토스트 "설정이 저장되었어요", `/`로 replace 이동(F1-AC1).
  - 명절 Chip 탭 시 `ht_flags.activeHolidayId` 저장(F1-AC2).
  - 빈 호칭 제출 시 인라인 에러 "호칭을 입력해주세요", 저장 차단(F1-AC4).
  - QuotaExceededError 시 AlertDialog "저장 공간이 부족해요. 기록을 정리해주세요", 크래시 없음(F1-AC5).
  - 로드 중 스켈레톤, 컨테이너 `data-testid="setup-form"` + display="block" 버튼, Chip/Button ≥44px, 키보드 시 SubmitFooter 비가림.
  - 프로모션 관련 UI 미노출(F1-AC7).
- **Covers**: [F1-AC1], [F1-AC2], [F1-AC4], [F1-AC5], [F1-AC6], [F1-AC7]
- **Files**: `src/pages/SetupPage.tsx`
- **Depends on**: Task 1.3

### Task 3.2 홈 대시보드 `/`
- **Description**: 활성 명절 D-day 히어로(SummaryHero, CountUp), 일정 균형 MiniBar, 예산 총액, 체크리스트 진행률을 Card 3개+로 요약. 비프리미엄 시 `<AdSlot>` 배너를 요약 Card와 프리미엄 CTA 사이 배치. `<TossPurchase>`로 시즌 결제. FloatingTabBar.
- **DoD**:
  - `data-testid="dday-hero"` SummaryHero + `data-testid="balance-bar"` MiniBar + 요약 Card ≥3(F6-AC1).
  - 각 Card 탭 → `/calendar`, `/budget`, `/script`, `/report` 이동, 탭 영역 ≥44px.
  - `<TossPurchase>` onPurchased → `ht_flags.purchasedHolidays`에 activeHolidayId 추가 + 토스트 "프리미엄이 활성화됐어요"(F6-AC2).
  - 프리미엄이면 `<AdSlot>` 배너 숨김(F6-AC3).
  - 결제 실패/취소 콜백 → 토스트 "결제가 완료되지 않았어요", purchasedHolidays 불변(F6-AC4).
  - 데이터 전부 빈 경우 각 Card "아직 데이터가 없어요" + 이동 버튼(F6-AC5).
  - localStorage 파싱 실패 시 기본값 fallback, `console.error` 0(F6-AC7).
- **Covers**: [F6-AC1], [F6-AC2], [F6-AC3(배너 은닉)], [F6-AC4], [F6-AC5], [F6-AC7]
- **Files**: `src/pages/HomePage.tsx`
- **Depends on**: Task 1.3

### Task 3.3 응대 스크립트 입력 페이지 `/script`
- **Description**: 상황·톤 Chip + 질문 TextField + "스크립트 만들기"(display="block"). AI 첫 이용 고지 AlertDialog(1회), `<TossRewardAd>` 게이트(프리미엄이면 광고 생략) 통과 후 `requestScript` 호출·저장 후 결과로 이동. 하단에 스크립트 기록 목록(빈 상태 포함).
- **DoD**:
  - `aiNoticeAcknowledged=false`로 진입 시 AlertDialog "이 서비스는 생성형 AI를 활용합니다" 1회, 확인 시 `ht_flags.aiNoticeAcknowledged=true`(F1-AC3).
  - 정상 제출 → `requestScript` 200 → `ht_scripts` 저장 + 토스트 "스크립트가 만들어졌어요" → `navigate('/script/result', { state:{ scriptId } })`(F2-AC1).
  - 결과 노출 전 `<TossRewardAd>` 시청 완료 후 결과 이동(프리미엄이면 즉시)(F2-AC2, F6-AC3).
  - 빈 질문 제출 시 "곤란했던 질문을 입력해주세요", API 호출 안 함(F2-AC4).
  - API 실패 시 "잠시 후 다시 시도해주세요" + "다시 시도" Button, 크래시 없음(F2-AC5).
  - 응답 대기 중 버튼 비활성+인디케이터, 중복 제출 차단(F2-AC6).
  - `ht_scripts` 빈 배열이면 `Asset.ContentIcon` + "아직 만든 스크립트가 없어요"(F2-AC7).
- **Covers**: [F1-AC3], [F2-AC1], [F2-AC2], [F2-AC4], [F2-AC5], [F2-AC6], [F2-AC7], [F6-AC3(광고 게이트 생략)]
- **Files**: `src/pages/ScriptPage.tsx`
- **Depends on**: Task 1.3, Task 2.1

### Task 3.4 스크립트 결과 페이지 `/script/result`
- **Description**: 전달된 `scriptId`로 `ht_scripts`에서 결과를 찾아 Card(t3)로 표시, "AI가 생성한 결과입니다" 배지, "다시 만들기" 버튼. **state/scriptId 누락 방어 필수.**
- **DoD**:
  - `const s = (useLocation().state as RouteState["/script/result"]) ?? null; if(!s) return <Navigate to="/script" replace/>` — 새로고침/직접진입 시 크래시 없이 `/script`로 리다이렉트(S4 Error, 실사고 방어).
  - scriptId로 못 찾으면 동일하게 `/script`로 리다이렉트, 빈 상태 크래시 없음.
  - `data-testid="script-result-card"` Card + `data-testid="ai-badge"` 배지 표시(F2-AC3).
  - "다시 만들기" → `navigate('/script')`.
- **Covers**: [F2-AC3]
- **Files**: `src/pages/ScriptResultPage.tsx`
- **Depends on**: Task 1.3

### Task 3.5 방문 균형 캘린더 `/calendar`
- **Description**: 방문 일정 목록(ListRow) + 균형 MiniBar + 불균형 경고 Chip + BottomSheet 추가 폼 + 삭제 AlertDialog. 20개 초과 시 페이지네이션/가상 스크롤. FloatingTabBar.
- **DoD**:
  - `{ family, date, startHour, durationHours, memo }` 제출 → `ht_visits` 저장 + 목록 추가 + 토스트 "일정이 추가됐어요"(F3-AC1).
  - `data-testid="balance-bar"` MiniBar + 본가/시댁 비율 강조 숫자(t2)로 표시(F3-AC2).
  - 한쪽 70% 초과 시 경고 Chip "한쪽에 시간이 몰려 있어요"(F3-AC3).
  - 삭제 액션 → AlertDialog "삭제" 확인 → `ht_visits` 제거 + 균형 재계산(F3-AC4).
  - `durationHours:0` 제출 시 "체류 시간은 1시간 이상이어야 해요", 저장 차단(F3-AC5).
  - 빈 배열이면 `Asset.ContentIcon` + "아직 등록된 방문 일정이 없어요" + "일정 추가" Button(F3-AC6).
  - 20개 초과 시 세로 스크롤/페이지네이션 렌더 지연 없음(F3-AC7).
- **Covers**: [F3-AC1], [F3-AC2], [F3-AC3], [F3-AC4], [F3-AC5], [F3-AC6], [F3-AC7]
- **Files**: `src/pages/CalendarPage.tsx`
- **Depends on**: Task 1.3

### Task 3.6 예산 & 체크리스트 `/budget`
- **Description**: Tab(예산/체크리스트) 전환. 예산 탭: SummaryHero(총액 CountUp) + MiniBar(본가/시댁 비율) + ListRow + BottomSheet 추가 폼(금액 inputMode="numeric"). 체크리스트 탭: ListRow + Switch. FloatingTabBar.
- **DoD**:
  - `{ target, category, label, amount }` 제출 → `ht_budget` 저장 + 총액 갱신 + 성공 토스트(F4-AC1).
  - `data-testid="budget-total-hero"` SummaryHero(CountUp) + `data-testid="budget-ratio-bar"` MiniBar 비율 시각화(F4-AC2).
  - 체크리스트 Switch on → `ht_checklist` `done:true` 저장 + 완료 개수 "3/5" 갱신(F4-AC3).
  - `amount:-1000` 제출 시 "금액은 0원 이상이어야 해요", 저장 차단(F4-AC4).
  - 비숫자 입력 시 숫자만 필터링, 빈 값이면 "금액을 입력해주세요"(F4-AC5).
  - `ht_budget` 빈 배열이면 총액 "0원" + `Asset.ContentIcon` + "예산 항목을 추가해보세요"(F4-AC6).
  - 저장 처리 중 제출 버튼 비활성, 완료 후 재활성(중복 방지)(F4-AC7).
- **Covers**: [F4-AC1], [F4-AC2], [F4-AC3], [F4-AC4], [F4-AC5], [F4-AC6], [F4-AC7]
- **Files**: `src/pages/BudgetPage.tsx`
- **Depends on**: Task 1.3

### Task 3.7 감정 기록 입력 `/report/new`
- **Description**: 소진도(1~5) Chip + 스트레스 태그 Chip(다중) + 메모 TextField + 저장 Button. 저장 후 `navigate('/report', { replace:true })`. state 없이 직접 진입해도 정상 렌더(incoming undefined).
- **DoD**:
  - `{ exhaustionLevel, stressTags, note }` 제출 → `ht_moodlogs` 저장 + 토스트 "기록됐어요" → `/report` replace 이동(F5-AC1).
  - `exhaustionLevel`이 1~5 밖(미선택 포함)이면 저장 차단 + "소진도를 선택해주세요"(F5-AC4).
  - state 없이 직접 진입해도 크래시 없이 빈 폼 렌더.
- **Covers**: [F5-AC1], [F5-AC4]
- **Files**: `src/pages/ReportNewPage.tsx`
- **Depends on**: Task 1.3

### Task 3.8 리포트 `/report`
- **Description**: 소진 추이 Sparkline + 평균 소진도 강조 숫자(t2) + 상위 스트레스 요인 Chip. "기록 추가" → `/report/new`. 빈/로딩 상태 처리. state 없이 직접 진입 안전.
- **DoD**:
  - 기록 2개 이상이면 `data-testid="mood-trend-spark"` Sparkline + 평균 소진도 강조 숫자(t2)(F5-AC2).
  - `stressTags` 상위 3개를 빈도순 Chip("과한질문 3회")으로 표시(F5-AC3).
  - 빈 배열이면 `Asset.ContentIcon` + "명절 후 첫 기록을 남겨보세요"(F5-AC5).
  - 로드·집계 중 스켈레톤 후 렌더(F5-AC6).
  - "기록 추가" → `navigate('/report/new')`.
- **Covers**: [F5-AC2], [F5-AC3], [F5-AC5], [F5-AC6]
- **Files**: `src/pages/ReportPage.tsx`
- **Depends on**: Task 1.3

---

## Epic 4. Integration + Polish

**Risk Assessment**
- **Complexity**: Medium
- **Risk factors**: (1) 미설정(`ht_couple` 없음) 상태에서 홈 진입 시 무한 리다이렉트/빈 대시보드. (2) 외부 URL 이탈(`window.open`/`window.location.href`)이 코드에 잔존. (3) 프로덕션 빌드 `console.error` 잔존. (4) 토스 통합 상태 조회가 부팅 가드를 블로킹해 무한 스켈레톤.
- **Mitigation**: 라우터 가드에서 로딩→미설정 판정 후 `/setup`으로 replace. 정적 검사로 window.open/location.href 사용 0 확인. 빌드 후 console.error 0 검증. 통합 상태 조회는 **비차단**으로만 배선(가드는 `ht_couple` 존재만으로 판정).

### Task 4.1 라우팅 배선 + 설정 가드 + 세션 배선 + 탭바
- **Description**: react-router-dom 라우트 등록(`/setup`, `/`, `/script`, `/script/result`, `/calendar`, `/budget`, `/report`, `/report/new`). 앱 진입 시 로딩 스켈레톤, 로드 후 `ht_couple` 없으면 `/setup`으로 replace. FloatingTabBar 전역 배치. Task 1.4의 `useTossIntegration()`을 앱 최상단에서 **비차단**으로 1회 호출(세션 자동 제공 전제 확인용) — 결과와 무관하게 라우팅/가드 동작 불변.
- **DoD**:
  - 초기 진입 로딩 중 스켈레톤, 미설정이면 `/setup` 리다이렉트(F1-AC6).
  - 8개 라우트 정상 연결, state 없는 결과/리포트 직접 진입도 크래시 없음(3.4/3.8 방어와 연동).
  - FloatingTabBar가 홈/캘린더/예산/리포트 간 이동 제공(TabBar 미사용, 템플릿 컴포넌트).
  - `useTossIntegration()` 호출이 부팅을 블로킹하지 않음 — 조회 실패/미통합이어도 설정 가드·전 라우트 정상 렌더(Common: 인증). 로그인/세션 획득 함수 호출 0건.
- **Covers**: [F1-AC6], [Common: 인증(비차단 세션 배선)]
- **Files**: `src/App.tsx`, `src/router.tsx`
- **Depends on**: Task 3.1–3.8, Task 1.4

### Task 4.2 외부 이탈 차단 + 콘솔 정리 + 프로모션 미노출 최종 점검
- **Description**: 전체 코드에서 `window.open`/`window.location.href` 외부 이동 부재 확인·제거, 외부 분석 SDK 미사용 확인. 모든 catch 경로가 `console.error`를 쓰지 않도록 정리하고 프로덕션 빌드 검증. AI 라벨/고지 노출 최종 확인. **프로모션(`grantPromotionReward`) UI/호출 미노출 회귀 확인**(MVP 범위 결정, F1-AC7).
- **DoD**:
  - 코드베이스 내 외부 URL 이동 코드 0건, 시도 시 미수행(F6-AC6).
  - 프로덕션 빌드(`vite build`) 후 런타임 `console.error` 출력 0(F6-AC7).
  - AI 결과 라벨(F2-AC3)·고지(F1-AC3) 노출 회귀 확인, API HTTPS/CORS 정상(F2-AC8).
  - `grantPromotionReward` 호출/프로모션 CTA UI가 코드에 노출되지 않음(F1-AC7) — 본 MVP는 프로모션 캠페인 미포함(아래 "설계 결정" 참조).
- **Covers**: [F6-AC6], [F6-AC7], [F1-AC7]
- **Files**: `src/lib/storage.ts`, `src/lib/scriptApi.ts`, `src/lib/tossSession.ts`, `src/pages/*` (정리 대상 파일)
- **Depends on**: Task 4.1

---

## 설계 결정 (Scope Decisions)

- **프로모션 리워드(`grantPromotionReward`) — MVP 제외**: SPEC Common Principle에 API가 명시돼 있으나, F1-AC7이 *프로모션 관련 UI 미노출*을 명령하므로 본 MVP는 획득 캠페인을 포함하지 않는다. `promotionCode`는 앱인토스 콘솔 발급이 선행돼야 하며, 캠페인 활성화 시 별도 Epic(홈 CTA + `amount ≤ 5000` 검증 지급 플로우)로 추가한다. 현재 릴리스에서는 호출/노출 0을 **검증 대상**(Task 4.2)으로 둔다.
- **인증 — 세션 자동, 로그인 함수 미호출**: 토스가 세션을 자동 제공하므로 로그인/세션 획득 호출은 없다. 통합 여부는 Task 1.4의 안전 래퍼로 **상태만** 조회하고 UI 게이팅에 사용하지 않는다(localStorage 전용 설계).

---

## AC Coverage

- **Total ACs in SPEC**: 42
  - F1: 7, F2: 8, F3: 7, F4: 7, F5: 6, F6: 7

- **Covered by tasks**: 42
  - **F1**: AC1(3.1), AC2(3.1), AC3(3.3), AC4(3.1), AC5(1.2·3.1), AC6(3.1·4.1), AC7(1.1·3.1·4.2)
  - **F2**: AC1(3.3), AC2(3.3), AC3(3.4·4.2), AC4(3.3), AC5(2.1·3.3), AC6(3.3), AC7(3.3), AC8(2.1·4.2)
  - **F3**: AC1(3.5), AC2(1.3·3.5), AC3(1.3·3.5), AC4(3.5), AC5(3.5), AC6(3.5), AC7(3.5)
  - **F4**: AC1(3.6), AC2(1.3·3.6), AC3(3.6), AC4(3.6), AC5(3.6), AC6(3.6), AC7(3.6)
  - **F5**: AC1(3.7), AC2(1.3·3.8), AC3(1.3·3.8), AC4(3.7), AC5(3.8), AC6(3.8)
  - **F6**: AC1(3.2), AC2(3.2), AC3(1.3·3.2·3.3), AC4(3.2), AC5(1.2·3.2), AC6(4.2), AC7(1.2·3.2·4.2)

- **Uncovered**: 0 ✅

## Common Principles Coverage (신규 — 크로스밸리데이션 갭 대응)

| Common Principle | Task |
|---|---|
| 인증: 토스 세션 자동 제공, 통합 상태만 확인 | **1.4**(래퍼) · **4.1**(비차단 배선) |
| AI 고지 의무(첫 이용 고지 + 결과 라벨) | 3.3(고지) · 3.4(라벨) · 4.2(회귀) |
| 수익화: TossPurchase / TossRewardAd / AdSlot | 3.2 · 3.3 |
| 프로모션(`grantPromotionReward`, amount≤5000) | **설계 결정: MVP 제외** · 4.2(미노출 검증) |
| 외부 이탈 금지 / 외부 분석 SDK 금지 | 4.2 |
| 프로덕션 `console.error` 0 | 1.2 · 3.2 · 4.2 |
| 명절 날짜 내장 상수(외부 API 미사용) | 1.2(`holidays.ts`) |
| TDS 컴포넌트/ScreenScaffold/FloatingTabBar/Spacing | 3.1–3.8 · 4.1 |

---

### 변경 요약 (무엇을 고쳤나)
1. **인증 갭 해소** → 신규 **Task 1.4**(`getIsTossLoginIntegratedService` 안전 래퍼, 비차단) + **Task 4.1**에 세션 배선 DoD 추가.
2. **프로모션 갭 명시화** → "설계 결정"에 MVP 제외 근거 기록 + **Task 4.2**에 미노출 검증 DoD/Covers(F1-AC7) 추가.
3. **Common Principles Coverage 표 신설** → AC 외 SPEC 원칙(인증·AI 고지·수익화·외부이탈·콘솔·명절상수)의 태스크 매핑을 명시해 추적성 확보.
4. 나머지 "갭"(API·UI·모니터화 Epic 누락)은 **발췌 절단으로 인한 오탐**으로 확인 — 전체 TASK가 이미 Epic 2/3(수익화 포함)로 커버하므로 변경 없음.