The skill isn't loadable here; I'll keep the model id out of hardcoded scope and reference it via env var (the correct design anyway — the LLM model/key live server-side on Railway). Here is the complete updated TASK.

---

# TASK — HolidayTruce (명절휴전)

## Epic 1. Data Layer

Risk Assessment
- Complexity: Medium
- Risk factors: (1) `crypto.randomUUID` 미지원 구형 기기 크래시 — SPEC이 Android 7+/iOS 16+ 한정. (2) 손상 JSON·`QuotaExceededError` 미처리 시 앱 전체 크래시. (3) holidayId 필터 누락 시 설/추석 데이터 혼입.
- Mitigation: 타입(1.1) → storage 방어 로직(1.2) → 컨텍스트/필터(1.3) 순서로 분리. 런타임 코드 없는 순수 타입을 먼저 확정해 페이지가 잘못된 shape에 의존하지 않게 한다.

### Task 1.1 TypeScript 타입 + RouteState + 상수
- Description: 전 엔티티 인터페이스(`VisitSchedule`, `BudgetItem`, `ChecklistItem`, `ScriptRecord`, `StressLog`, `AppMeta`, `Side`)와 `RouteState`, API 요청/응답 타입(`ScriptRequest`, `ScriptResponse`, `ApiError`), localStorage 키 상수, `HOLIDAYS` 상수(2026 설날 `'2026-seollal'`/추석 `'2026-chuseok'` + 날짜)를 순수 타입/상수로 정의. 런타임 로직 없음.
- DoD: `tsc` 통과. `RouteState`가 아래 shape 포함 — `{ "/": undefined; "/script": undefined; "/schedule": undefined; "/budget": { tab?: '예산' | '체크리스트' } | undefined; "/stress": undefined; "/paywall": { from?: string } | undefined; }`. `HOLIDAYS` 배열에 id·label·date 존재.
- Covers: [F1-AC3, Data Models 전체]
- Files: src/lib/types.ts, src/lib/constants.ts
- Depends on: none

### Task 1.2 localStorage CRUD 헬퍼 + 방어 로직
- Description: `get<T>(key, fallback): T` / `set<T>(key, value): void` 구현. 파싱 실패 시 fallback 반환(예외 삼킴, `console.error` 미출력). `set`에서 `QuotaExceededError` catch 후 전역 콜백(`onQuotaExceeded`)을 트리거해 AlertDialog 표시 가능하게 함. `crypto.randomUUID()` 래퍼 `newId()` 제공. 각 엔티티 그룹별 CRUD(`addSchedule`, `removeSchedule`, `listSchedules(holidayId)` 등)를 holidayId 필터 포함해 제공.
- DoD: 손상 JSON 키 read 시 `[]` 반환 & console 무출력. `set`이 quota 초과에도 throw하지 않고 콜백 호출. `list*`가 항상 배열(null/undefined 아님) 반환. 데이터 0건이면 `[]`.
- Covers: [F1-AC3, F1-AC4, F1-AC5, F1-AC6]
- Files: src/lib/storage.ts
- Depends on: Task 1.1

### Task 1.3 명절 컨텍스트 + 상태 관리
- Description: `HolidayContext`(React Context)로 `currentHolidayId` 전역 관리. `ht.meta` 로드/저장, 명절 전환 시 `setCurrentHoliday(id)`가 `ht.meta.currentHolidayId` 저장 + 리렌더 유발. 기본값은 오늘(2026-08-07) 기준 가장 가까운 다가오는 명절. `aiNoticeAck`·`isPaid` getter/setter 포함. quota AlertDialog 상태를 Provider에서 관리.
- DoD: 초기 진입 시 기본 holidayId = 다가오는 명절. `setCurrentHoliday('2026-chuseok')` 호출 시 meta 저장 & 소비 컴포넌트가 추석 데이터로 갱신. 모든 `list*` 호출이 `currentHolidayId`로 필터.
- Covers: [F1-AC1, F1-AC2, F1-AC7]
- Files: src/lib/HolidayContext.tsx, src/lib/meta.ts
- Depends on: Task 1.2

---

## Epic 2. AI 스크립트 백엔드 (Railway 별도 배포)

> **소유권 명시 (교차검증 질의 응답)**: Railway 백엔드는 **본 태스크 리스트의 in-scope**다. AI 스크립트 생성은 LLM API 키를 클라이언트에 노출할 수 없으므로 별도 서버가 필수이며, SPEC "외부 API 서버(Railway 별도 배포) 호출"의 서버 구현(2.2)과 클라이언트(2.3)를 함께 소유한다. 이 백엔드는 앱인토스 프론트엔드와 **별도 배포 단위**이며 저장소는 `/server` 디렉터리로 분리한다.

Risk Assessment
- Complexity: Medium
- Risk factors: (1) LLM API 키가 클라이언트에 노출되면 치명적 — 반드시 서버 보관. (2) CORS 미설정 시 앱에서 호출 실패. (3) 입력 미검증/프롬프트 인젝션. (4) LLM 장애·타임아웃 시 앱 크래시. (5) 프로덕션 `console.error` 잔존. (6) AI 고지 라벨 정책(과태료 3,000만원) — 결과에 AI 생성물 표시 책임은 클라이언트(3.2)에 있으나 서버는 메타(`model`)를 반환해 라벨링을 지원해야 함.
- Mitigation: 서버 계약(요청/응답 스키마)을 Task 1.1 타입과 일치시켜 먼저 확정. 키·모델은 서버 환경변수로만 주입. 입력 길이·타입 검증을 서버·클라이언트 이중화. 모든 실패를 통일 에러 shape(`ApiError`)로 반환.

### Task 2.1 백엔드 스캐폴딩 + CORS + 헬스체크
- Description: `/server`에 Node + Express(또는 경량 프레임워크) 프로젝트 스캐폴딩. `GET /health` 200 반환. 앱인토스 오리진 대상 CORS 허용(허용 오리진 화이트리스트를 `CORS_ORIGINS` 환경변수로 주입). `PORT` 환경변수 바인딩(Railway 표준). LLM 키(`ANTHROPIC_API_KEY`)·모델(`ANTHROPIC_MODEL`)·`CORS_ORIGINS`를 `.env.example`에 문서화(실제 키 커밋 금지).
- DoD: `GET /health` 200 & `{ ok: true }`. 허용 오리진에서 프리플라이트(OPTIONS) 통과, 비허용 오리진 차단. `PORT` 환경변수로 리슨. `.env.example`에 `ANTHROPIC_API_KEY`,`ANTHROPIC_MODEL`,`CORS_ORIGINS`,`PORT` 존재. 실제 키·시크릿 미커밋.
- Covers: [Infra — SPEC "외부 API 서버(Railway 별도 배포)"]
- Files: server/package.json, server/src/index.ts, server/.env.example
- Depends on: none

### Task 2.2 `POST /api/script` 엔드포인트 (LLM 호출)
- Description: `POST /api/script` 구현. 요청 바디 `ScriptRequest`(`{ situation: string; tone: '정중하게'|'단호하게'|'유머러스하게' }`) 검증(`situation` 1~300자, `tone` 화이트리스트). 서버 보관 키로 Anthropic Claude API 호출(모델은 `ANTHROPIC_MODEL` 환경변수, 키는 `ANTHROPIC_API_KEY` — **클라이언트 노출 금지**). 명절 응대 스크립트 생성 시스템 프롬프트 사용, 사용자 `situation`은 데이터로만 주입(프롬프트 인젝션 방지). 성공 시 `ScriptResponse`(`{ result: string; model: string }`) 반환. 검증 실패 400, 레이트리밋/LLM 429 → 429, LLM 오류·타임아웃 → 500, 모두 통일 `ApiError`(`{ code, message }`) shape. 프로덕션 `console.error` 미사용(구조화 로거 또는 무출력).
- DoD: 유효 요청 200 & `{ result, model }`(`model`은 실제 사용 모델 id 문자열). `situation` 공란/301자 → 400 + `ApiError`. `tone` 미허용값 → 400. LLM 예외/타임아웃 → 500 + `ApiError`(서버 크래시 없음). 응답에 API 키·내부 스택 미노출. LLM 키가 응답/로그에 절대 미포함. 프로덕션 빌드 `console.error` 0개.
- Covers: [F2-AC8 (서버측)]
- Files: server/src/routes/script.ts, server/src/llm.ts
- Depends on: Task 2.1

### Task 2.3 스크립트 생성 API 클라이언트 (프론트)
- Description: `POST {VITE_API_BASE}/api/script` 호출 함수 `generateScript(req: ScriptRequest): Promise<ScriptResponse>`. 400/429/500 및 네트워크 오류를 통일된 에러로 throw(호출부가 Toast 처리). `console.error` 미사용. 요청 전 `situation` 1~300자 클라이언트 검증. 타임아웃(예: 15s) 시 통일 에러로 throw. `VITE_API_BASE`는 env로 주입(재빌드 없이 교체 가능).
- DoD: 200 응답 시 `{ result, model }` 반환. 4xx/5xx·네트워크·타임아웃 오류 시 throw. 프로덕션 빌드 `console.error` 0개. CORS 전제 준수(별도 헤더 미조작). `situation` 공란 시 API 미호출 후 로컬 에러.
- Covers: [F2-AC8 (클라이언트측)]
- Files: src/lib/api.ts
- Depends on: Task 1.1, Task 2.2

---

## Epic 3. UI Pages

Risk Assessment
- Complexity: High
- Risk factors: (1) `location.state`가 없는 직접 진입/새로고침 시 `.map()` 크래시(SplitMate 실사고). (2) TDS 여백 덮어쓰기로 검수 반려. (3) 시간/금액/점수 검증 누락. (4) TossRewardAd 게이팅 미적용으로 결과 노출.
- Mitigation: 각 페이지 `location.state` 수신 시 `?? null` + 가드. `ScreenScaffold` 래핑, Spacing만 사용. 페이지를 화면 단위로 분리(1페이지=1태스크, 예산은 복잡도상 2분할)해 각 태스크가 10분 내 완주.

공통 계약(모든 페이지): `ScreenScaffold`로 감싸기(raw div 금지), 색상 `var(--tds-color-*)`, 터치 타겟 ≥44px, 다크모드, 외부 URL 이동 금지. `location.state`를 받는 화면은 `const s = (useLocation().state as RouteState[경로]) ?? null;` 후 null/기본값 처리.

### Task 3.1 홈 대시보드 페이지 `/`
- Description: `Top("명절휴전")`, 명절 셀렉터 `Chip`, 요약 `Card` 4개(D-day/예산 총합/양가 방문 균형/최근 소진도), D-day `SummaryHero`(CountUp), 균형 `MiniBar`, 각 기능 진입 `Button`(전폭). 로딩 스켈레톤, 데이터 0건 온보딩 빈 상태 + 기능 진입 버튼. `data-testid="dashboard-cards"` 컨테이너에 Card 4개.
- DoD: `/` 진입 시 Card 4개 + D-day SummaryHero 렌더. 데이터 없을 때 "명절 준비를 시작해보세요" 온보딩. 로딩 중 스켈레톤. 명절 셀렉터로 holidayId 전환 반영. 진입 버튼이 `/script`,`/schedule`,`/budget`,`/stress`,`/paywall`로 navigate.
- Covers: [F6-AC3, F6-AC5, F6-AC6, S1-레이아웃AC]
- Files: src/pages/HomePage.tsx
- Depends on: Task 1.3

### Task 3.2 AI 응대 스크립트 페이지 `/script`
- Description: `TextField`(상황 multiline, ≤300자), 톤 `Chip` 3종, 제출 `Button`(SubmitFooter 고정). 첫 진입 시 `aiNoticeAck===false`면 AI 고지 `AlertDialog` 1회 표시 후 `aiNoticeAck=true` 저장. 제출→`generateScript` 호출을 `TossRewardAd` 게이트 뒤에서 처리, 광고 완료 후 결과 `Card`+"AI가 생성한 결과입니다" `Badge` 노출 & `ht.scripts` 저장 & 성공 Toast. 빈 입력 거부, API 실패 Toast+입력 유지, 로딩 중 버튼 비활성+스피너+중복 차단. 무료 유저 일 1회 초과 시 `/paywall` navigate 또는 BottomSheet.
- DoD: 정상 흐름에서 광고 시청 후 결과 표시·저장·토스트. 광고 중단 시 결과 미표시. 첫 이용 고지 1회. 빈 입력 시 "상황을 입력해주세요"+API 미호출. 500/네트워크 시 Toast+입력 유지+크래시 없음. 로딩 중 중복 제출 차단. `data-testid="script-result-card"` + AI Badge 존재.
- Covers: [F2-AC1, F2-AC2, F2-AC3, F2-AC4, F2-AC5, F2-AC6, F2-AC7, F6-AC2, S2-레이아웃AC]
- Files: src/pages/ScriptPage.tsx
- Depends on: Task 2.3, Task 1.3

### Task 3.3 방문 일정 캘린더 페이지 `/schedule`
- Description: `ListRow` 일정 목록(date 오름차순), 총 방문시간 `SummaryHero`(CountUp)+본가/처가 `MiniBar`(`data-testid="balance-summary"`). 추가/수정 `BottomSheet`(`Chip` 본가/처가, date `TextField`, start/end 시간, memo, 완료 버튼 하단 고정). 삭제 `AlertDialog`("삭제할까요?"). 시간 역전·필수값 검증. 균형 경고 Card(차이 >120분). 빈 상태 `Asset.ContentIcon`.
- DoD: 유효 폼 제출 시 저장·목록 추가·토스트. 삭제 확인 시 id 제거. 본가/처가 총 방문시간(분) 합산 표시. 차이>120분 경고 Card. `end<start` 시 "종료 시간이 시작 시간보다 빨라요". date 공란 시 "방문 날짜를 선택해주세요". 0건 시 빈 상태. 목록 date 오름차순.
- Covers: [F3-AC1, F3-AC2, F3-AC3, F3-AC4, F3-AC5, F3-AC6, F3-AC7, F3-AC8, S3-레이아웃AC]
- Files: src/pages/SchedulePage.tsx
- Depends on: Task 1.3

### Task 3.4 예산 계산기 (예산 탭) `/budget`
- Description: `/budget` 페이지 골격 + `Tab`(예산/체크리스트 전환). 예산 탭: `ListRow` 항목 목록, 전체/본가/처가 합계 `SummaryHero`(`toLocaleString('ko-KR')`, `data-testid="budget-summary"`)+양가 `MiniBar`, 지급완료 `Switch`("지급 완료 X원/예정 Y원" 갱신), 추가 `BottomSheet`(category `Chip`, label, 금액 `inputMode="numeric"`). 금액 0 이하·상한 초과 검증. 빈 상태. `location.state = { tab? }`를 `?? null`로 안전 수신해 초기 탭 결정(state 없어도 기본 '예산' 렌더, 크래시 없음).
- DoD: 유효 항목 제출 시 저장·합계 반영·토스트. 합계 3종 원화 포맷. Switch로 paid 토글 & 지급/예정 집계 갱신. amount 0 시 "금액을 1원 이상 입력해주세요". amount 1억 시 "금액이 너무 커요(최대 99,999,999원)". 0건 시 "예산 항목을 추가해…" 빈 상태. 양가 MiniBar. state 없이 `/budget` 직접 진입/새로고침해도 크래시 없이 기본 탭 렌더.
- Covers: [F4-AC1, F4-AC2, F4-AC3, F4-AC4, F4-AC5, F4-AC7, F4-AC8, S4-레이아웃AC]
- Files: src/pages/BudgetPage.tsx
- Depends on: Task 1.3

### Task 3.5 갈등 방지 체크리스트 (체크리스트 탭) `/budget`
- Description: `/budget`의 체크리스트 `Tab` 콘텐츠. `ListRow`+체크박스로 항목 완료 토글(`checked` 저장), 완료 개수 "N/M" `Badge` 갱신, 항목 추가 입력(≤100자). 빈 상태.
- DoD: 체크박스 탭 시 `checked:true` 저장 & "N/M" 배지 갱신. 항목 추가 저장. 탭 전환이 예산 탭과 독립 동작.
- Covers: [F4-AC6]
- Files: src/pages/BudgetPage.tsx
- Depends on: Task 3.4

### Task 3.6 감정소진 리포트 페이지 `/stress`
- Description: 점수 1~10 `Chip` 선택, 트리거 태그 `Chip`, memo `TextField`, 제출 `Button`. 리포트 `Card`(`data-testid="stress-report-card"`): 평균 소진도 `SummaryHero`(소수 1자리 CountUp), score 추이 `Sparkline`, 트리거 빈도 `MiniBar` + 상위 3개 `Chip`. 점수 범위/미선택 검증. 집계 중 스켈레톤. 0건 시 `Asset.ContentIcon` 빈 상태 + 안내 문구.
- DoD: 유효 제출 시 저장·"기록되었어요" 토스트. 평균 소진도 소수1자리 표시. Sparkline+MiniBar 렌더. score 11 시 "소진도는 1~10 사이로 선택해주세요". 미선택 제출 시 "소진도 점수를 선택해주세요". 0건 시 빈 상태+안내(리포트 미표시). 집계 중 스켈레톤. 트리거 상위 3개 Chip.
- Covers: [F5-AC1, F5-AC2, F5-AC3, F5-AC4, F5-AC5, F5-AC6, F5-AC7, F5-AC8, S5-레이아웃AC]
- Files: src/pages/StressPage.tsx
- Depends on: Task 1.3

### Task 3.7 시즌권 결제 페이지 `/paywall`
- Description: 혜택 `Card`+`ListRow` 나열(`data-testid="paywall-benefits"`), `<TossPurchase sku={VITE_TOSS_IAP_SKU} processProductGrant={…} onPurchased={…} />` 버튼(하단 고정, ≥48px). 결제 성공 시 `processProductGrant`로 `ht.meta.isPaid=true` 저장 & "결제가 완료되었어요" 토스트 & 프리미엄 잠금 해제. 취소/실패 시 `isPaid` 유지 + "결제가 취소되었어요" 토스트. `location.state = { from? }`를 `?? null`로 안전 수신, 완료/취소 후 `navigate(-1)`.
- DoD: 결제 완료 시 `isPaid=true` 저장·토스트·잠금 해제. 취소/실패 시 false 유지·토스트·크래시 없음. `data-testid="paywall-benefits"` Card + TossPurchase 존재. state 없이 직접 진입해도 크래시 없이 렌더.
- Covers: [F6-AC1, F6-AC4, S6-레이아웃AC]
- Files: src/pages/PaywallPage.tsx
- Depends on: Task 1.3

---

## Epic 4. Integration + Landing

Risk Assessment
- Complexity: Medium
- Risk factors: (1) 라우팅 미연결/탭 네비 부재. (2) `grantPromotionReward` 한도(≤5,000원) 미검증 시 정책 위반. (3) 배너가 콘텐츠와 겹쳐 검수 반려. (4) quota AlertDialog 미연결.
- Mitigation: 페이지 완성 후 마지막에 라우팅·FloatingTabBar·배너·프로모션을 결선. 데이터/페이지가 안정된 뒤 통합해 회귀 최소화.

### Task 4.1 라우팅 배선 + FloatingTabBar + Provider
- Description: `react-router-dom` 6개 라우트(`/`,`/script`,`/schedule`,`/budget`,`/stress`,`/paywall`) 등록. `HolidayContext` Provider로 앱 래핑. 템플릿 `src/components/FloatingTabBar`로 주요 탭 네비 연결. quota `AlertDialog`("저장 공간이 부족합니다. 이전 명절 기록을 삭제해주세요")를 컨텍스트에 연결. 각 페이지 `location.state` 가드가 실제 라우팅에서 동작하는지 확인.
- DoD: 모든 라우트 이동 정상. 탭 네비로 홈/기능 이동. quota 발생 시 AlertDialog 표시(크래시 없음). state 없이 `/budget`·`/paywall` 직접 진입 시 홈 복귀 또는 기본 렌더. 앱 컴파일 통과.
- Covers: [F1-AC5, Navigation 계약 전체]
- Files: src/App.tsx, src/main.tsx
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 3.5, Task 3.6, Task 3.7

### Task 4.2 홈 배너 광고 + 프로모션 리워드 + 최종 UX
- Description: 홈 최하단 요약 Card 아래 `<AdSlot adGroupId={VITE_TOSS_AD_GROUP_ID} />` 배치(콘텐츠 겹침 없음). 신규 유입 프로모션 시 `grantPromotionReward({ promotionCode, amount })` 호출 래퍼에 `amount ≤ 5000` 검증 추가(초과 시 호출 차단). 다크모드·터치 타겟·Spacing 최종 점검, 프로덕션 `console.error` 0 확인.
- DoD: 홈 배너가 요약 Card 아래 비겹침 배치. `grantPromotionReward` 호출 전 `amount>5000`이면 차단. 다크모드·44px·48px 준수. 빌드 시 console.error 0.
- Covers: [F6-AC7, F6-AC8]
- Files: src/pages/HomePage.tsx, src/lib/promotion.ts
- Depends on: Task 4.1

---

## AC Coverage

- Total ACs in SPEC: 53 (기능 AC 47 = F1:7 + F2:8 + F3:8 + F4:8 + F5:8 + F6:8, 화면 레이아웃 AC 6 = S1~S6)
- Covered by tasks: 53
  - F1: AC1(1.3), AC2(1.3), AC3(1.1·1.2), AC4(1.2), AC5(1.2·4.1), AC6(1.2), AC7(1.3)
  - F2: AC1(3.2), AC2(3.2), AC3(3.2), AC4(3.2), AC5(3.2), AC6(3.2), AC7(3.2), **AC8(2.2 서버 + 2.3 클라이언트)**
  - F3: AC1~AC8 모두 (3.3)
  - F4: AC1(3.4), AC2(3.4), AC3(3.4), AC4(3.4), AC5(3.4), AC6(3.5), AC7(3.4), AC8(3.4)
  - F5: AC1~AC8 모두 (3.6)
  - F6: AC1(3.7), AC2(3.2), AC3(3.1), AC4(3.7), AC5(3.1), AC6(3.1), AC7(4.2), AC8(4.2)
  - 레이아웃 AC: S1(3.1), S2(3.2), S3(3.3), S4(3.4), S5(3.6), S6(3.7)
- Uncovered: 0 ✅
- Infra (AC 외, SPEC 필수): 외부 AI 서버 Railway 배포 — Task 2.1(스캐폴딩/CORS), Task 2.2(`POST /api/script`)로 커버.

---

## 변경 요약 (교차검증 gap 대응)

| 교차검증 Gap | 처리 |
|---|---|
| **Backend service task missing** — `POST /api/script` Railway 구현 무할당 | **신규 Epic 2.1 + 2.2 추가** (스캐폴딩/CORS/헬스체크 + LLM 엔드포인트). 기존 API 클라이언트는 2.3으로 이동, `Depends on: Task 2.2` 연결 |
| **Who owns Railway backend** 확인 요청 | Epic 2 상단에 **in-scope 명시** — `/server` 별도 배포 단위, 본 태스크 리스트 소유 |
| **No UI task layer** | Epic 3 (Task 3.1~3.7) 이미 전 기능 페이지 커버 — 유지 |
| **Ordering incomplete** | 데이터(1.x) → 백엔드+API(2.1→2.2→2.3) → UI(3.x, `/script`는 2.3 의존) → 통합(4.x)으로 전체 순서 확정 |
| **필드 포맷** (`**DoD**:` → `- DoD:`) | 전 태스크 plain `- 필드:` 포맷으로 통일 |

주요 변경점: **F2-AC8을 서버(2.2)와 클라이언트(2.3)로 분리 커버**해 "AI 서버 호출" AC가 실제 서버 구현까지 추적되도록 했습니다. LLM 키/모델은 서버 환경변수(`ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`)로만 주입 — 클라이언트 노출 금지를 DoD에 명시했습니다.