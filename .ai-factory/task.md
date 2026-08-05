# TASK — HolidayTruce (명절휴전)

> 규칙: 각 Task는 단일 코딩 세션(<10분), 완료 후에도 앱은 항상 컴파일 가능. Toss 로그인/TDS/광고 래퍼 셋업 태스크는 제외(템플릿 제공).

---

## Epic 1. TypeScript Types + Interfaces

### Task 1.1 엔티티 타입 · 참조 카탈로그 · RouteState 정의
- **Description**: SPEC의 모든 데이터 모델과 참조 카탈로그, 화면 간 전달 계약을 순수 타입/상수로 정의한다. 런타임 로직 없음(상수 배열 + 타입 + 검증용 타입가드 시그니처만).
  - 카탈로그 상수: `RELATIONS`, `TONES`, `SEASONS`, `CAUSES` (`as const`) 및 `Relation`/`ToneKey`/`Season`/`Cause` 타입.
  - 인터페이스: `AppMeta`, `ScriptRequest`, `ScriptResult`, `VisitPlan`, `BudgetItem`, `BudgetPlan`, `BurnoutLog`.
  - API 계약: `ScriptApiRequest`, `ScriptApiResponse`, `ApiError`.
  - **RouteState**(필수):
    ```ts
    export type RouteState = {
      "/script/result": { resultId: string } | undefined;
      "/script": undefined;
      "/calendar": undefined;
      "/budget": undefined;
      "/report": undefined;
      "/premium": undefined;
      "/": undefined;
    };
    ```
  - localStorage 키 상수: `STORAGE_KEYS = { meta, scripts, visits, budget, burnout }` (`holidaytruce:*`).
- **DoD**: `tsc --noEmit` 통과. 카탈로그가 `as const`로 리터럴 유니온 추출. 모든 인터페이스가 SPEC 필드/제약 주석 포함. `RouteState["/script/result"]`가 `{resultId}|undefined`. 런타임 코드 0줄(상수+타입만).
- **Covers**: [F1-AC6, F1-AC7] (타입/카탈로그 정의 기반)
- **Files**: `src/lib/types.ts`
- **Depends on**: none

**Risk (Epic 1)** — Complexity: Low. 위험: 카탈로그 유니온 누락 시 하위 검증 전부 약화. 완화: 데이터 계층/페이지보다 먼저 확정해 단일 진실원(single source)으로 고정.

---

## Epic 2. Data Layer (storage helpers + state)

### Task 2.1 localStorage 코어 엔진 (read/write/봉투/검증)
- **Description**: 전 엔티티가 공유하는 저수준 storage 유틸. 
  - `readKey<T>(key, fallback): T` — 미존재/파싱불가 시 `fallback` 반환(파싱 실패해도 `console.error` 호출 안 함).
  - `writeKey<T>(key, value): {ok:boolean}` — `QuotaExceededError` catch 후 `{ok:false}` 반환(throw 안 함, 이전 상태 유지).
  - 레코드 봉투 헬퍼: `withCreate(obj)` → `id=crypto.randomUUID(), createdAt=updatedAt=now`; `withUpdate(obj)` → `updatedAt=now`.
  - 카탈로그 검증: `validateRelation/Tone/Season/Causes(value): boolean`(카탈로그 소속 확인). 위반 시 저장 거부 신호 반환.
  - `now()` 래퍼 1곳(테스트 용이).
- **DoD**: 존재하지 않는 키 read 시 fallback 반환. 손상 JSON read 시 fallback 반환 & `console.error` 미호출(테스트로 확인). quota 초과 시 throw 없이 `{ok:false}`. `withCreate`가 UUID/타임스탬프 세팅, `withUpdate`가 `updatedAt`만 갱신. 검증 함수가 카탈로그 밖 값에 `false`. 프로덕션 빌드 `console.error` 0개.
- **Covers**: [F1-AC1, F1-AC4, F1-AC5, F1-AC6, F1-AC7, F1-AC8]
- **Files**: `src/lib/storage.ts`
- **Depends on**: Task 1.1

### Task 2.2 AppMeta · 프리미엄 스토어
- **Description**: 싱글턴 `AppMeta` 접근 계층 + 프리미엄/프로모션 로직.
  - `getMeta(): AppMeta` — 미존재 시 기본값 `{aiNoticeAck:false, premiumUnlocked:false, premiumSeason:null, createdAt:now, updatedAt:now}` 생성/반환.
  - `ackAiNotice()` → `aiNoticeAck=true, updatedAt=now` 저장.
  - `unlockPremium(season: Season)` → `premiumUnlocked=true, premiumSeason=season, updatedAt=now` 저장(검증: season∈SEASONS).
  - `grantPromotionRewardSafe({promotionCode, amount})` — `amount≤5000` 검증, 초과 시 호출 차단(리턴 거부), 통과 시 `grantPromotionReward` 직접 호출.
- **DoD**: 최초 `getMeta()` 기본값 생성·저장. `ackAiNotice` 후 재호출 시 `aiNoticeAck===true` 지속. `unlockPremium("2026-추석")` 후 플래그·시즌 반영, `updatedAt` 갱신. `grantPromotionRewardSafe({amount:6000})` 호출 차단(SDK 미호출). 카탈로그 밖 season 저장 거부.
- **Covers**: [F1-AC2, F1-AC3, F6-AC1, F6-AC6]
- **Files**: `src/lib/metaStore.ts`
- **Depends on**: Task 2.1

### Task 2.3 도메인 스토어 (scripts/visits/budget/burnout) CRUD + 셀렉터
- **Description**: 4개 컬렉션/문서의 CRUD + 파생 셀렉터. 저장 시 봉투/카탈로그 검증 적용, 위반 시 거부.
  - scripts: `addScript(result)`(맨 앞 삽입, 최대 100 유지), `listScripts()`(createdAt 내림차순), `getScript(id)`.
  - visits: `addVisit`, `deleteVisit(id)`, `listVisits()`(date 오름차순), `visitBalance()` → `{sumSi, sumCh, imbalanced:boolean}`(relation 그룹 합산, 한쪽>2배 시 imbalanced). hours 범위 0.5~48 검증.
  - budget: `getBudget()`(기본 `{items:[],...}`), `addItem`, `toggleItem(id)`, `budgetTotals()` → `{total, doneCount, itemCount, sumSi, sumCh}`. amount 0~10,000,000·label 비어있지 않음 검증. 변경 시 `BudgetPlan.updatedAt` 갱신.
  - burnout: `addLog`, `listLogs()`(season→createdAt 정렬), `burnoutReport()` → `{avg, trend:number[], topCauses:Cause[]}`(빈도 상위3). score 1~10 검증.
- **DoD**: 각 add가 봉투 필드 채워 저장·목록 반영. 정렬 규약 준수(scripts 내림차순, visits date 오름차순, burnout season→createdAt). `visitBalance` 2배 초과 시 `imbalanced:true`. `budgetTotals.total` = amount 합. `burnoutReport.topCauses` 최대 3개. 범위/카탈로그 위반 입력은 저장 거부 반환(순수 함수 단위 테스트 통과).
- **Covers**: [F2-AC8, F3-AC2, F3-AC7, F4-AC2, F4-AC6, F5-AC2, F5-AC3]
- **Files**: `src/lib/domainStore.ts`
- **Depends on**: Task 2.1

### Task 2.4 AI 스크립트 API 클라이언트
- **Description**: 외부 Railway API 호출 래퍼. `generateScripts(req: ScriptApiRequest): Promise<{ok:true, scripts:string[]} | {ok:false, code:string}>`.
  - `POST {VITE_SCRIPT_API_BASE}/api/scripts`, 타임아웃 10초(AbortController).
  - 응답 파싱 실패 또는 `scripts.length !== 3` → `{ok:false, code:"bad_response"}`.
  - 4xx/5xx/네트워크 오류 → `{ok:false, code}`(never throw).
- **DoD**: 200 & scripts 3개 → `{ok:true}`. scripts 길이≠3 → `{ok:false}`. 500/네트워크오류 → throw 없이 `{ok:false}`. 10초 초과 시 abort → `{ok:false}`. 외부 URL은 env 기반(하드코딩 금지).
- **Covers**: [F2-AC9]
- **Files**: `src/lib/scriptApi.ts`
- **Depends on**: Task 1.1

**Risk (Epic 2)** — Complexity: Medium. 위험: (1) QuotaExceeded/손상 JSON 미처리 시 앱 크래시, (2) 총 용량 5MB 한도 — SPEC 추정 <200KB이나 scripts 100개 캡 미적용 시 증가. 완화: 2.1이 quota/파싱 방어를 먼저 제공하고 2.3이 컬렉션 상한(100/200) 강제 → 페이지가 안전한 계층 위에 조립됨.

---

## Epic 3. Core UI Pages (one page per task)

### Task 3.1 홈/대시보드 `/` + AI 첫 고지
- **Description**: `ScreenScaffold`+`Top("명절휴전")`. 4개 기능 진입 `ListRow`(높이≥44px). 요약 3종 `Card`(다음 방문 균형/총 예산/평균 소진도) — 각 셀렉터 호출, 데이터 없으면 "기록 없음". 마운트 시 `getMeta().aiNoticeAck===false`면 TDS `AlertDialog`("이 서비스는 생성형 AI를 활용합니다") 1회 표시, "확인" 탭 → `ackAiNotice()`. `data-testid="home-summary"` 컨테이너에 Card 3개.
- **DoD**: 최초 진입 시 AI 고지 다이얼로그 1회 표시, 확인 후 재진입 시 미표시. ListRow 탭 → 각 경로 `navigate`. 요약 카드 빈 상태 문구 렌더. 메타 파싱 실패해도 기본값으로 크래시 없이 렌더.
- **Covers**: [F1-AC2, F1-AC3]
- **Files**: `src/pages/HomePage.tsx`
- **Depends on**: Task 2.2, Task 2.3

### Task 3.2 스크립트 입력 `/script`
- **Description**: `Tab`(시댁/처가), `Chip`(정중/단호/유머), `TextField`(상황 multiline 200자), 하단 고정 `Button`("스크립트 생성"). 이력 리스트 `data-testid="script-history"`(listScripts, 내림차순, 빈 배열 시 `Asset.ContentIcon`+"아직 생성한 스크립트가 없어요"). 
  - 빈 situation → 인라인 에러 "상황을 입력해주세요", API 미호출.
  - 생성 중 버튼 disabled + 로딩 인디케이터.
  - 성공: `addScript` 후 `navigate('/script/result', { state: { resultId } })`(RouteState 타입 캐스팅).
  - 실패(`generateScripts` ok:false): Toast "생성에 실패했어요. 잠시 후 다시 시도해주세요", 입력값 유지, 화면 잔류.
- **DoD**: 빈 상황 시 API 미호출·에러 표시. 성공 시 저장+resultId 전달 이동. 실패 시 Toast+입력 보존. 대기 중 버튼 비활성+인디케이터. 이력 빈/정렬 상태 정상.
- **Covers**: [F2-AC1, F2-AC4, F2-AC5, F2-AC6, F2-AC7, F2-AC8]
- **Files**: `src/pages/ScriptInputPage.tsx`
- **Depends on**: Task 2.3, Task 2.4

### Task 3.3 스크립트 결과 `/script/result`
- **Description**: `location.state`를 RouteState로 안전 수신:
  ```ts
  const state = (useLocation().state as RouteState["/script/result"]) ?? null;
  const result = state ? getScript(state.resultId) : null;
  if (!result) return <Navigate to="/" replace />;
  ```
  - 무료 사용자(`premiumUnlocked===false`): `TossRewardAd` 게이트로 결과 감싸기, 중도 종료 시 결과 미노출 + Toast "광고를 끝까지 시청해야 결과를 볼 수 있어요". 완료 후 문장 3개 `Card`(`data-testid="script-result-card"`).
  - 상단 `Badge` "AI가 생성한 결과입니다" 필수.
  - 무료 시 결과 하단 `<AdSlot>` 배너(콘텐츠와 미겹침). 프리미엄이면 RewardAd/AdSlot 미렌더 즉시 노출.
  - 복사 버튼(≥44px), "새로 만들기" → `navigate('/script')`.
- **DoD**: **state 없이/새로고침/직접 진입 시 크래시 없이 `/`로 replace 이동**. 미존재 resultId도 홈 이동. 무료: 광고 완료 후에만 결과, 중도 종료 시 Toast. 프리미엄: 광고 없이 즉시. AI Badge 항상 표시.
- **Covers**: [F2-AC2, F2-AC3, F6-AC2, F6-AC3, F6-AC5]
- **Files**: `src/pages/ScriptResultPage.tsx`
- **Depends on**: Task 2.2, Task 2.3

### Task 3.4 방문 균형 캘린더 `/calendar`
- **Description**: `Tab`(시댁/처가), `TextField`(date/hours(`inputMode="decimal"`)/memo 100자), `Button`("추가"). 균형 카드 `data-testid="balance-card"` `Card`+`MiniBar`(sumSi:sumCh 비율), 2배 초과 시 경고 `Badge` "한쪽에 치우쳐 있어요". 목록 `ListRow`(date 오름차순, 삭제 액션 `AlertDialog "삭제할까요?"` → `deleteVisit`). 빈 상태 `Asset.ContentIcon`+"첫 방문 일정을 추가해보세요". 항목>30 시 가상 스크롤.
  - hours 0 또는 >48 → 인라인 에러 "체류 시간은 0.5~48시간으로 입력해주세요".
  - 추가 성공 Toast "일정이 추가되었어요".
- **DoD**: 유효 입력 추가·저장·목록 반영+성공 Toast. 균형 MiniBar 렌더, 2배 초과 시 경고 Badge. 삭제 확인 후 제거+재계산. hours 범위 밖 저장 거부. 빈 상태/오름차순/30개 초과 가상 스크롤 확인.
- **Covers**: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC6, F3-AC7, F3-AC8]
- **Files**: `src/pages/CalendarPage.tsx`
- **Depends on**: Task 2.3

### Task 3.5 예산 계산기 `/budget`
- **Description**: `Tab`(시댁/처가), `TextField`(label 40자/amount `inputMode="numeric"`), `Button`("추가"), 항목별 `Switch`(준비 완료). `SummaryHero`(`data-testid="budget-hero"`, CountUp "총 예산 ₩{합계}"). `MiniBar`(`data-testid="budget-ratio"`, 시댁/처가 비중). `ListRow` 목록. 항목 0개 시 "예산 항목을 추가해보세요". 하단 고정 버튼 키보드 보정.
  - amount<0 또는 >10,000,000 → "금액은 0~1,000만원으로 입력해주세요".
  - 빈 label → "항목명을 입력해주세요".
  - Switch 토글 → `toggleItem`(checked+updatedAt), "완료 N/M" 갱신.
- **DoD**: 유효 항목 추가 시 총합 반영. Switch 토글 시 checked 저장+완료 카운트 갱신. 음수/초과/빈 label 저장 거부+에러. MiniBar 비중·빈 상태 표시. `inputMode="numeric"`+키보드 보정.
- **Covers**: [F4-AC1, F4-AC2, F4-AC3, F4-AC4, F4-AC5, F4-AC6, F4-AC7]
- **Files**: `src/pages/BudgetPage.tsx`
- **Depends on**: Task 2.3

### Task 3.6 감정소진 리포트 `/report`
- **Description**: 소진도 `Chip`/`Slider`(1~10), 원인 `Chip` 다중선택(CAUSES 8개), `TextField`(메모 300자), `Button`("기록 저장"). `SummaryHero`(`data-testid="report-hero"`, 평균 소진도 소수1자리). 로그≥2 시 `Sparkline`(`data-testid="report-trend"`, season→createdAt 순), 1개면 단일 값 카드로 대체(크래시 없음). "주요 원인" `Card`에 상위 3 `Chip`. 빈 배열 시 `Asset.ContentIcon`+"첫 명절 기록을 남겨보세요"+Sparkline 숨김.
  - score 0 또는 11 → 인라인 에러 "소진도는 1~10으로 선택해주세요".
  - 저장 성공 Toast "기록되었어요".
- **DoD**: 유효 기록 저장+Toast. 평균 SummaryHero·추이 Sparkline 렌더. 로그 1개 시 단일 카드 대체 크래시 없음. 상위 원인 Chip 표시. 범위 밖 점수 저장 거부. 빈 상태 Sparkline 숨김.
- **Covers**: [F5-AC1, F5-AC2, F5-AC3, F5-AC4, F5-AC5, F5-AC6]
- **Files**: `src/pages/ReportPage.tsx`
- **Depends on**: Task 2.3

### Task 3.7 프리미엄 `/premium`
- **Description**: `Card`(`data-testid="premium-benefit-card"`, 광고 제거·무제한 스크립트). `premiumUnlocked===false`면 `<TossPurchase sku={VITE_TOSS_IAP_SKU} processProductGrant={()=>unlockPremium(currentSeason)} onPurchased={...} />`; 성공 시 Toast "프리미엄이 활성화되었어요" 후 `navigate(-1)`. `premiumUnlocked===true`면 "활성화됨" `Badge` + 결제 버튼 숨김. 결제 취소 시 상태 변경 없음·에러 Toast 미표시.
- **DoD**: 결제 성공 콜백 → `unlockPremium` 실행·플래그 저장·Toast·뒤로 이동. 활성 상태에서 Badge 표시+버튼 숨김. 취소 시 무동작(에러 Toast 없음).
- **Covers**: [F6-AC1, F6-AC4]
- **Files**: `src/pages/PremiumPage.tsx`
- **Depends on**: Task 2.2

**Risk (Epic 3)** — Complexity: Medium~High. 위험: (1) `/script/result` 새로고침·직접 진입 시 `location.state` 부재로 `.map` 크래시(실사고 SplitMate 완주 0%), (2) TossRewardAd 중도 종료 시 결과 누출. 완화: 3.3에 null-가드+`<Navigate replace>` 필수 DoD 명시, 데이터 계층(Epic 2) 완료 후 페이지 조립로 셀렉터 안정성 확보.

---

## Epic 4. Integration + Polish

### Task 4.1 라우팅 배선 · FloatingTabBar · 전역 광고 게이팅
- **Description**: `react-router-dom` `BrowserRouter`에 7개 경로 등록(`/`, `/script`, `/script/result`, `/calendar`, `/budget`, `/report`, `/premium`). 템플릿 `FloatingTabBar`로 하단 탭 네비 구성(홈/캘린더/예산/리포트 등 주요 진입). 전역 프리미엄 상태에 따른 `<AdSlot>` 배너 노출/숨김 정책 일관 적용(`premiumUnlocked===true`면 전 화면 배너/RewardAd 게이트 숨김). 모든 페이지 `ScreenScaffold` 래핑 확인. 외부 URL 이탈(`window.open`/`location.href`) 없음 점검.
- **DoD**: 모든 경로 정상 이동·뒤로가기. FloatingTabBar 각 탭 활성 표시·≥44px. 프리미엄 ON 시 전 화면 배너/RewardAd 미렌더, OFF 시 결과 하단 배너 노출. 앱 컴파일·프로덕션 빌드 `console.error` 0개. 외부 이탈 코드 0건.
- **Covers**: [F6-AC2, F6-AC3, F1-AC8]
- **Files**: `src/App.tsx`, `src/routes.tsx`
- **Depends on**: Task 3.1~3.7

**Risk (Epic 4)** — Complexity: Low~Medium. 위험: 프리미엄 광고 게이팅이 화면별로 흩어져 불일치(무료인데 배너 누락/프리미엄인데 광고 잔존). 완화: 광고 표시를 마지막 통합 단계에서 단일 `premiumUnlocked` 소스로 일괄 배선.

---

## AC Coverage

- **Total ACs in SPEC**: 44
  - F1: 8, F2: 9, F3: 8, F4: 7, F5: 6, F6: 6

- **Covered by tasks**: 44
  - **F1** — AC1(2.1), AC2(2.2·3.1), AC3(2.2·3.1), AC4(2.1), AC5(2.1), AC6(1.1·2.1), AC7(1.1·2.1), AC8(2.1·4.1)
  - **F2** — AC1(3.2), AC2(3.3), AC3(3.3), AC4(3.2), AC5(3.2), AC6(3.2), AC7(3.2), AC8(2.3·3.2), AC9(2.4)
  - **F3** — AC1(3.4), AC2(2.3·3.4), AC3(3.4), AC4(3.4), AC5(3.4), AC6(3.4), AC7(2.3·3.4), AC8(3.4)
  - **F4** — AC1(3.5), AC2(2.3·3.5), AC3(3.5), AC4(3.5), AC5(3.5), AC6(2.3·3.5), AC7(3.5)
  - **F5** — AC1(3.6), AC2(2.3·3.6), AC3(2.3·3.6), AC4(3.6), AC5(3.6), AC6(3.6)
  - **F6** — AC1(2.2·3.7), AC2(3.3·4.1), AC3(3.3·4.1), AC4(3.7), AC5(3.3), AC6(2.2)

- **Uncovered**: 0 ✅

---

## RouteState 계약 준수 체크
- state 수신 화면은 `/script/result` 단 하나 — Task 3.3에 **null-가드 필수 패턴**(`?? null` → `<Navigate to="/" replace/>`) DoD 명시.
- 나머지 6개 화면은 `location.state = undefined`(자체 완결) — RouteState에 `undefined` 타입으로 고정, 직접 진입 시 크래시 불가.
- 송신 측(Task 3.2)은 `navigate('/script/result', { state: { resultId } })`로 RouteState 타입과 일치하는 데이터만 전달.