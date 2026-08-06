# SPEC — HolidayTruce (명절휴전)

## Common Principles

- **플랫폼**: 앱인토스 (Vite + React + TypeScript + TDS `@toss/tds-mobile` + React Router)
- **인증**: 토스 세션 자동 제공 — 별도 로그인 함수 호출 없음. 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 연동 상태만 확인
- **데이터**: 전량 localStorage 저장 (총 5MB 미만 유지). 외부 서버 없음. 단, AI 스크립트 생성만 외부 API 서버(Railway 별도 배포) 호출
- **UI**: 모든 화면 TDS 컴포넌트로 조립. 하단 탭 네비게이션은 템플릿 제공 `src/components/FloatingTabBar` 사용. 페이지 골격은 `ScreenScaffold`(PageShell)로 감싼다 (raw div 금지)
- **색상**: HEX 하드코딩 금지 — `var(--tds-color-*)` 또는 TDS 컴포넌트만. 다크모드 필수
- **터치 타겟**: 모든 상호작용 요소 ≥ 44px
- **AI 고지**: AI 스크립트 생성 기능은 생성형 AI 사전 고지 + 결과물 라벨 의무 준수 (과태료 3,000만원 리스크)
- **외부 이탈 금지**: `window.location.href` / `window.open` 외부 URL 이동 차단. 외부 분석 솔루션(GA, Amplitude) 미사용
- **수익화**: 시즌 원타임 결제(`<TossPurchase>`), 결과 게이팅에 `<TossRewardAd>`, 배너 `<AdSlot>`
- **출력 언어**: 한국어

---

## Data Models

### VisitSchedule — 방문 일정
| 필드 | 타입 | 제약 |
|---|---|---|
| id | `string` | UUID (crypto.randomUUID), PK |
| side | `'본가' \| '처가'` | 필수 |
| date | `string` | ISO 날짜 `YYYY-MM-DD`, 필수 |
| startTime | `string` | `HH:mm`, 선택 |
| endTime | `string` | `HH:mm`, 선택 |
| memo | `string` | 최대 200자 |
| holidayId | `string` | 소속 명절 (예: `'2026-chuseok'`) |
| createdAt | `number` | epoch ms |

### BudgetItem — 예산 항목
| 필드 | 타입 | 제약 |
|---|---|---|
| id | `string` | UUID, PK |
| side | `'본가' \| '처가'` | 필수 |
| category | `'용돈' \| '선물' \| '차례비용' \| '교통' \| '기타'` | 필수 |
| label | `string` | 최대 30자, 필수 |
| amount | `number` | 정수, 0 초과, 최대 99,999,999 |
| paid | `boolean` | 기본 false |
| holidayId | `string` | 필수 |
| createdAt | `number` | epoch ms |

### ChecklistItem — 갈등 방지 체크리스트
| 필드 | 타입 | 제약 |
|---|---|---|
| id | `string` | UUID, PK |
| text | `string` | 최대 100자 |
| checked | `boolean` | 기본 false |
| holidayId | `string` | 필수 |

### ScriptRecord — AI 응대 스크립트
| 필드 | 타입 | 제약 |
|---|---|---|
| id | `string` | UUID, PK |
| situation | `string` | 사용자 입력 상황, 최대 300자 |
| tone | `'정중하게' \| '단호하게' \| '유머러스하게'` | 필수 |
| result | `string` | AI 생성 스크립트 |
| createdAt | `number` | epoch ms |

### StressLog — 감정소진도 기록
| 필드 | 타입 | 제약 |
|---|---|---|
| id | `string` | UUID, PK |
| holidayId | `string` | 필수 |
| score | `number` | 1~10 정수 |
| triggers | `string[]` | 선택 태그 배열 (예: `['잔소리','비교']`) |
| memo | `string` | 최대 300자 |
| createdAt | `number` | epoch ms |

### AppMeta — 앱 상태 플래그
| 필드 | 타입 | 제약 |
|---|---|---|
| aiNoticeAck | `boolean` | AI 고지 확인 여부 |
| currentHolidayId | `string` | 현재 선택 명절 |
| isPaid | `boolean` | 시즌 결제 여부 |

**localStorage 키 맵**
| 키 | 값 shape | 크기 추정 |
|---|---|---|
| `ht.schedules` | `VisitSchedule[]` | ~200B×20 = 4KB |
| `ht.budgets` | `BudgetItem[]` | ~180B×40 = 7KB |
| `ht.checklist` | `ChecklistItem[]` | ~120B×30 = 4KB |
| `ht.scripts` | `ScriptRecord[]` | ~500B×20 = 10KB |
| `ht.stressLogs` | `StressLog[]` | ~250B×20 = 5KB |
| `ht.meta` | `AppMeta` | ~100B |
| **합계** | | **< 40KB** (5MB 대비 안전) |

---

## Feature List

### F1. 데이터 레이어 & 명절 컨텍스트 (storage 기반)

- **Description**: 모든 기능이 공유하는 localStorage CRUD 헬퍼와 "현재 명절(holidayId)" 컨텍스트를 제공한다. 명절 선택(설/추석) 상태를 전역 관리하고, 각 엔티티는 선택된 holidayId로 필터링된다. 파싱 실패·용량 초과에 대한 방어 로직을 포함한다.
- **Data**: 전체 모델, `ht.meta`
- **API**: 없음 (내부 localStorage)
- **Requirements**:
- AC-1 [U][P0]: The system shall `ht.meta.currentHolidayId`를 기준으로 모든 리스트를 필터링해 반환한다
- AC-2 [E][P0]: Scenario: 명절 전환
  Given `currentHolidayId="2026-seollal"`인 상태에서
  When 사용자가 명절 셀렉터에서 `"2026-chuseok"` 선택
  Then `ht.meta.currentHolidayId`가 `"2026-chuseok"`로 저장되고 모든 화면 데이터가 추석 항목으로 갱신됨
- AC-3 [U][P0]: The system shall 각 저장 시 `crypto.randomUUID()`로 id를 생성한다 (Android 7+/iOS 16+ 지원 API만 사용)
- AC-4 [W][P1]: Scenario: 손상된 JSON 방어
  Given `ht.budgets`에 파싱 불가한 문자열이 저장된 상태
  When 앱이 해당 키를 읽음
  Then 예외를 삼키고 빈 배열 `[]`을 반환하며 console.error를 출력하지 않음
- AC-5 [W][P1]: Scenario: 용량 초과 처리
  Given localStorage 쓰기가 `QuotaExceededError`를 던질 때
  When 저장 시도
  Then AlertDialog "저장 공간이 부족합니다. 이전 명절 기록을 삭제해주세요" 표시하고 앱이 크래시되지 않음
- AC-6 [S][P1]: While `currentHolidayId`에 해당하는 데이터가 하나도 없을 때, the system shall 빈 배열을 반환한다 (null/undefined 아님)
- AC-7 [U][P2]: The system shall 명절 셀렉터 기본값을 오늘 날짜(2026-08-07) 기준 가장 가까운 다가오는 명절로 설정한다

---

### F2. AI 시댁·처가 응대 스크립트 생성

- **Description**: 사용자가 곤란한 상황(예: "취업 언제 하냐는 질문")과 원하는 톤을 입력하면 외부 AI API로 응대 대화 스크립트를 생성한다. 결과는 보상형 광고 시청 후 노출되며, AI 생성물 고지·라벨 의무를 준수한다. 생성 기록은 localStorage에 저장된다.
- **Data**: `ScriptRecord[]` (`ht.scripts`), `ht.meta.aiNoticeAck`
- **API**: `POST {VITE_API_BASE}/api/script` — 아래 API Contract 참조
- **Requirements**:
- AC-1 [E][P0]: Scenario: 스크립트 생성 성공
  Given AI 고지를 확인한 로그인 유저가 있을 때
  When `{ situation: "명절마다 취업 언제 하냐 물어봐요", tone: "정중하게" }` 제출 후 TossRewardAd 시청 완료
  Then API 응답 `result` 텍스트가 결과 화면에 표시되고 `ht.scripts`에 저장되며 성공 토스트 "스크립트가 생성되었어요" 표시
- AC-2 [E][P0]: Scenario: 결과 보기 전 보상형 광고
  Given 사용자가 상황 입력 후 "스크립트 만들기" 탭
  When `<TossRewardAd slotId={VITE_TOSS_AD_SLOT_ID}>` 광고 시청 완료
  Then 스크립트 결과가 표시됨 (시청 중단 시 결과 미표시)
- AC-3 [E][P0]: Scenario: AI 서비스 첫 이용 고지
  Given 사용자가 AI 기능을 처음 사용할 때 (`ht.meta.aiNoticeAck === false`)
  When 스크립트 화면 진입
  Then "이 서비스는 생성형 AI를 활용합니다" AlertDialog가 1회 표시되고, 확인 버튼 탭 후 `ht.meta.aiNoticeAck = true` 저장
- AC-4 [U][P0]: Scenario: AI 결과물 라벨 표시
  Given AI 스크립트 결과가 화면에 표시될 때
  Then 결과 Card 하단에 "AI가 생성한 결과입니다" TDS Badge가 표시됨
- AC-5 [W][P1]: Scenario: 빈 상황 입력 거부
  Given 스크립트 화면에서
  When `{ situation: "", tone: "정중하게" }` 제출
  Then 에러 메시지 "상황을 입력해주세요" 표시하고 API 미호출
- AC-6 [W][P1]: Scenario: API 실패 처리
  Given 서버가 500 또는 네트워크 오류 반환
  When 스크립트 생성 요청
  Then Toast "생성에 실패했어요. 잠시 후 다시 시도해주세요" 표시하고 입력값 유지, 앱 크래시 없음
- AC-7 [S][P1]: While API 응답 대기 중일 때, the system shall "스크립트 만들기" 버튼을 로딩 상태(비활성 + 스피너)로 표시하고 중복 제출을 차단한다
- AC-8 [U][P1]: The system shall 외부 API 호출 시 CORS 에러 0개 (서버 CORS 허용 완료), 프로덕션 빌드 console.error 0개

---

### F3. 본가/처가 방문 일정 균형 캘린더

- **Description**: 명절 방문 일정을 본가/처가로 구분해 등록하고, 양가 방문 시간 배분을 시각적으로 비교한다. 한쪽에 편중된 경우 균형 경고를 노출해 갈등을 예방한다. 일정 추가·수정·삭제를 지원한다.
- **Data**: `VisitSchedule[]` (`ht.schedules`)
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 일정 추가 성공
  Given 로그인 유저가 있을 때
  When 일정 폼에서 `{ side: "본가", date: "2026-09-25", startTime: "10:00", endTime: "14:00", memo: "차례" }` 제출
  Then `ht.schedules`에 저장되고 목록에 추가되며 성공 토스트 표시
- AC-2 [E][P0]: Scenario: 일정 삭제
  Given 등록된 일정이 있을 때
  When 항목 스와이프/삭제 버튼 탭 후 AlertDialog "삭제할까요?"에서 확인
  Then 해당 id 항목이 `ht.schedules`에서 제거됨
- AC-3 [U][P0]: The system shall 본가/처가 각각의 총 방문시간(분)을 합산해 SummaryHero CountUp 값과 MiniBar 비율로 표시한다
- AC-4 [S][P1]: Scenario: 균형 경고
  While 본가와 처가의 총 방문시간 차이가 120분 초과일 때
  Then "양가 방문 시간이 불균형해요 (본가 X시간 / 처가 Y시간)" 경고 Card를 노출한다
- AC-5 [W][P1]: Scenario: 잘못된 시간 범위 거부
  When `{ startTime: "14:00", endTime: "10:00" }` 제출
  Then 에러 "종료 시간이 시작 시간보다 빨라요" 표시하고 저장 안 함
- AC-6 [W][P1]: Scenario: 필수값 누락 거부
  When `{ side: "본가", date: "" }` 제출
  Then 에러 "방문 날짜를 선택해주세요" 표시
- AC-7 [S][P1]: While 등록된 일정이 0건일 때, the system shall Asset.ContentIcon과 "아직 등록된 방문 일정이 없어요" 빈 상태를 표시한다
- AC-8 [U][P2]: The system shall 일정 목록을 date 오름차순으로 정렬해 표시한다

---

### F4. 용돈·선물 예산 계산기 & 갈등 방지 체크리스트

- **Description**: 본가/처가별 용돈·선물·차례비용 등 예산 항목을 등록하고 합계를 실시간 집계한다. 양가 지출 균형을 비교하고, 명절 준비 갈등 방지 체크리스트를 관리한다. 지급 완료 토글을 지원한다.
- **Data**: `BudgetItem[]` (`ht.budgets`), `ChecklistItem[]` (`ht.checklist`)
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 예산 항목 추가
  Given 로그인 유저가 있을 때
  When `{ side: "처가", category: "용돈", label: "장인어른 용돈", amount: 300000, paid: false }` 제출
  Then `ht.budgets`에 저장되고 총합계에 반영되며 성공 토스트 표시
- AC-2 [U][P0]: The system shall 전체 합계·본가 합계·처가 합계를 원화 포맷(`toLocaleString('ko-KR')`)으로 SummaryHero에 표시한다
- AC-3 [E][P0]: Scenario: 지급 완료 토글
  Given `paid: false` 항목이 있을 때
  When TDS Switch를 켬
  Then `paid: true`로 저장되고 "지급 완료 X원 / 예정 Y원" 집계가 갱신됨
- AC-4 [W][P1]: Scenario: 0원 이하 거부
  When `{ label: "선물", amount: 0 }` 제출
  Then 에러 "금액을 1원 이상 입력해주세요" 표시하고 저장 안 함
- AC-5 [W][P1]: Scenario: 금액 상한 초과 거부
  When `amount: 100000000` 제출
  Then 에러 "금액이 너무 커요 (최대 99,999,999원)" 표시
- AC-6 [E][P1]: Scenario: 체크리스트 항목 완료
  Given 체크리스트 항목 "선물 미리 구매"가 있을 때
  When 체크박스 탭
  Then `checked: true`로 저장되고 완료 개수 "N/M" 배지 갱신
- AC-7 [S][P1]: While 예산 항목이 0건일 때, the system shall "예산 항목을 추가해 명절 지출을 관리하세요" 빈 상태를 표시한다
- AC-8 [S][P2]: While 본가/처가 예산 차이가 있을 때, the system shall MiniBar로 양가 비중을 시각화한다

---

### F5. 감정소진도 기록 & 다음 명절 대비 리포트

- **Description**: 명절 후 감정소진 점수(1~10)와 트리거 태그를 기록하고, 누적 기록을 Sparkline 추이로 시각화한다. 명절별 평균 소진도와 주요 트리거를 요약한 리포트를 제공해 다음 명절 대비를 돕는다.
- **Data**: `StressLog[]` (`ht.stressLogs`)
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 소진도 기록 성공
  Given 로그인 유저가 있을 때
  When `{ score: 8, triggers: ["잔소리","비교"], memo: "차례 준비 과로" }` 제출
  Then `ht.stressLogs`에 저장되고 성공 토스트 "기록되었어요" 표시
- AC-2 [U][P0]: The system shall 명절별 평균 소진도(소수점 1자리)를 SummaryHero CountUp 값으로 표시한다
- AC-3 [U][P0]: The system shall 최근 기록들의 score 추이를 Sparkline으로, 트리거 빈도를 MiniBar로 리포트 Card에 시각화한다
- AC-4 [W][P1]: Scenario: 점수 범위 밖 거부
  When `{ score: 11 }` 제출
  Then 에러 "소진도는 1~10 사이로 선택해주세요" 표시
- AC-5 [W][P1]: Scenario: 점수 미선택 거부
  When score 미선택 상태로 제출
  Then 에러 "소진도 점수를 선택해주세요" 표시
- AC-6 [S][P1]: While 소진도 기록이 0건일 때, the system shall Asset.ContentIcon과 "명절 후 감정을 기록해보세요" 빈 상태를 표시하고 리포트 대신 안내 문구를 노출한다
- AC-7 [S][P1]: While 리포트 데이터 집계 중일 때, the system shall 스켈레톤/로딩 인디케이터를 표시한다
- AC-8 [U][P2]: The system shall 트리거 태그를 빈도순 상위 3개까지 TDS Chip으로 강조 표시한다

---

### F6. 시즌 결제 & 홈 대시보드

- **Description**: 설/추석 시즌 원타임 결제(`<TossPurchase>`)로 프리미엄 기능(무제한 AI 스크립트, 전체 리포트)을 잠금 해제한다. 홈 대시보드는 D-day, 예산 합계, 방문 균형, 소진도를 한눈에 요약한다. 무료 사용자는 AI 스크립트 일 1회 제한.
- **Data**: `ht.meta.isPaid`, 전체 모델(요약)
- **API**: 없음 (`TossPurchase` 내부 `IAP.createOneTimePurchaseOrder`)
- **Requirements**:
- AC-1 [E][P0]: Scenario: 시즌 결제 성공
  Given 무료 유저가 있을 때
  When `<TossPurchase sku={VITE_TOSS_IAP_SKU} onPurchased={...} />`로 결제 완료
  Then `processProductGrant` 실행되어 `ht.meta.isPaid = true` 저장되고 프리미엄 기능 잠금 해제, 토스트 "결제가 완료되었어요" 표시
- AC-2 [S][P0]: Scenario: 무료 사용자 AI 제한
  While `isPaid === false`이고 오늘 이미 AI 스크립트 1회 생성했을 때
  Then "무료 이용은 하루 1회예요. 시즌권으로 무제한 이용하세요" BottomSheet 표시하고 결제 유도
- AC-3 [U][P0]: The system shall 홈 대시보드에 다가오는 명절 D-day, 예산 총합, 양가 방문 균형, 최근 소진도를 Card로 요약 표시한다
- AC-4 [W][P1]: Scenario: 결제 취소/실패
  Given 사용자가 결제 창을 닫거나 실패할 때
  Then `isPaid` 유지(false)하고 토스트 "결제가 취소되었어요" 표시, 크래시 없음
- AC-5 [S][P1]: While 대시보드 데이터 로딩 중일 때, the system shall 각 요약 Card 위치에 스켈레톤을 표시한다
- AC-6 [S][P1]: While 등록 데이터가 전혀 없을 때, the system shall "명절 준비를 시작해보세요" 온보딩 빈 상태와 각 기능 진입 버튼을 표시한다
- AC-7 [U][P0]: Scenario: 프로모션 한도 검증
  Given 신규 유저 유입 프로모션 지급 시
  When `grantPromotionReward({ promotionCode, amount })` 호출
  Then `amount ≤ 5000`을 검증하고 초과 시 호출을 차단한다
- AC-8 [U][P1]: The system shall 홈 하단에 `<AdSlot adGroupId={VITE_TOSS_AD_GROUP_ID} />` 배너를 콘텐츠와 겹치지 않게 요약 Card 아래에 배치한다

---

## Screen Definitions

### S1. 홈 대시보드 — `/`
- **TDS 컴포넌트**: `ScreenScaffold`, `Top`(타이틀 "명절휴전"), `Card`, `SummaryHero`(D-day CountUp), `MiniBar`(양가 균형), `Chip`(명절 셀렉터), `Button`(각 기능 진입), `AdSlot`, `FloatingTabBar`
- **상태**: Loading = 요약 Card 스켈레톤 / Empty = "명절 준비를 시작해보세요" 온보딩 / Error = "데이터를 불러오지 못했어요" Card
- **터치**: 명절 셀렉터 Chip ≥ 44px, 기능 진입 버튼 `display="block"` 전폭 ≥ 48px
- **레이아웃 계약**: `ScreenScaffold` 감싸기, 요약은 `Card` 4개(D-day/예산/방문균형/소진도), 배너는 최하단
- **레이아웃 AC**: AC [U]: 홈 화면은 `data-testid="dashboard-cards"` 컨테이너에 `Card` 4개와 D-day `SummaryHero`(CountUp)를 가진다
- **Navigation 계약**:
  - Outgoing: `navigate('/script')`, `navigate('/schedule')`, `navigate('/budget')`, `navigate('/stress')`, `navigate('/paywall')`
  - Incoming: `location.state = undefined`

### S2. AI 응대 스크립트 — `/script`
- **TDS 컴포넌트**: `ScreenScaffold`, `Top`, `TextField`(상황 입력, multiline), `Chip`(톤 선택 3종), `Button`(제출), `AlertDialog`(AI 고지), `Card`+`Badge`("AI가 생성한 결과입니다"), `TossRewardAd`(결과 게이트), `Toast`
- **모바일 키보드**: TextField 포커스 시 입력창이 키보드에 가리지 않도록 스크롤 확보, 제출 버튼은 SubmitFooter 하단 고정
- **상태**: Loading = 제출 버튼 스피너+비활성 / Empty = 생성 이력 없을 때 "첫 스크립트를 만들어보세요" / Error = Toast "생성에 실패했어요"
- **터치**: 톤 선택 Chip ≥ 44px, 제출 버튼 ≥ 48px
- **레이아웃 계약**: 결과는 `Card`로 묶고 "AI가 생성한 결과입니다" `Badge` 하단 고정
- **레이아웃 AC**: AC [U]: 결과 표시 시 `data-testid="script-result-card"` Card와 AI 라벨 Badge가 존재한다
- **Navigation 계약**:
  - Outgoing: `navigate('/paywall')` (무료 한도 초과 시)
  - Incoming: `location.state = undefined`

### S3. 방문 일정 캘린더 — `/schedule`
- **TDS 컴포넌트**: `ScreenScaffold`, `Top`, `ListRow`(일정 항목), `SummaryHero`(총 방문시간 CountUp), `MiniBar`(본가/처가 비율), `BottomSheet`(추가/수정 폼), `TextField`, `Chip`(본가/처가), `Switch`, `Button`, `AlertDialog`(삭제 확인), `Toast`
- **리스트 스크롤**: 일정 20건 이하 예상 → 일반 스크롤 (가상 스크롤 불필요), date 오름차순
- **모바일 키보드**: 시간/메모 입력은 BottomSheet 내 처리, 완료 버튼 하단 고정
- **상태**: Loading = 리스트 스켈레톤 / Empty = Asset.ContentIcon "아직 등록된 방문 일정이 없어요" / Error = Toast
- **터치**: 추가 FAB/버튼 ≥ 48px, ListRow 삭제 액션 ≥ 44px
- **레이아웃 AC**: AC [U]: 화면은 `data-testid="balance-summary"` SummaryHero와 MiniBar를 가지며 본가/처가 총 방문시간을 표시한다
- **Navigation 계약**:
  - Outgoing: 없음 (BottomSheet 내부 처리)
  - Incoming: `location.state = undefined`

### S4. 예산 & 체크리스트 — `/budget`
- **TDS 컴포넌트**: `ScreenScaffold`, `Top`, `Tab`(예산/체크리스트 전환), `ListRow`, `SummaryHero`(총합계 CountUp), `MiniBar`(양가 비중), `Switch`(지급완료), `BottomSheet`+`TextField`+`Chip`(입력), `Button`, `Badge`(체크 진행 N/M), `Toast`
- **리스트 스크롤**: 예산 40건 이하 → 일반 스크롤
- **모바일 키보드**: 금액 TextField `inputMode="numeric"`, 숫자 키패드 노출
- **상태**: Loading = 합계 스켈레톤 / Empty = "예산 항목을 추가해 명절 지출을 관리하세요" / Error = Toast
- **터치**: Switch ≥ 44px, Tab ≥ 44px, 추가 버튼 ≥ 48px
- **레이아웃 AC**: AC [U]: 예산 탭은 `data-testid="budget-summary"` SummaryHero(전체/본가/처가 원화)와 MiniBar를 가진다
- **Navigation 계약**:
  - Outgoing: 없음
  - Incoming: `location.state = { tab?: '예산' | '체크리스트' }`

### S5. 감정소진 리포트 — `/stress`
- **TDS 컴포넌트**: `ScreenScaffold`, `Top`, `Card`(리포트), `SummaryHero`(평균 소진도 CountUp), `Sparkline`(추이), `MiniBar`(트리거 빈도), `Chip`(트리거 태그, 점수 1~10 선택), `TextField`(메모), `Button`, `Asset.ContentIcon`(빈 상태), `Toast`
- **모바일 키보드**: 메모 TextField 포커스 시 스크롤 확보
- **상태**: Loading = 리포트 스켈레톤 / Empty = Asset.ContentIcon "명절 후 감정을 기록해보세요" / Error = Toast
- **터치**: 점수 선택 Chip ≥ 44px, 제출 ≥ 48px
- **레이아웃 계약**: 리포트는 `Card`로 묶고 평균값 강조 타이포(t2~t3)
- **레이아웃 AC**: AC [U]: 리포트 표시 시 `data-testid="stress-report-card"` Card에 평균 SummaryHero, Sparkline, MiniBar가 존재한다
- **Navigation 계약**:
  - Outgoing: 없음
  - Incoming: `location.state = undefined`

### S6. 시즌권 결제 — `/paywall`
- **TDS 컴포넌트**: `ScreenScaffold`, `Top`, `Card`(혜택 목록), `ListRow`(혜택 항목), `TossPurchase`(결제 버튼), `Button`, `Toast`
- **상태**: Loading = 결제 버튼 비활성 / Empty = N/A / Error = Toast "결제가 취소되었어요"
- **터치**: 결제 버튼 `display="block"` ≥ 48px
- **레이아웃 계약**: 혜택은 `Card` + `ListRow` 나열, 결제 버튼은 SubmitFooter 하단 고정
- **레이아웃 AC**: AC [U]: 화면은 `data-testid="paywall-benefits"` Card와 `TossPurchase` 버튼을 가진다
- **Navigation 계약**:
  - Outgoing: `navigate(-1)` (결제 완료/취소 후 이전 화면 복귀)
  - Incoming: `location.state = { from?: string }`

---

## Data Storage

localStorage 헬퍼(`src/lib/storage.ts`)가 각 키에 대해 `get<T>(key): T`, `set<T>(key, value)`를 제공. 파싱 실패 시 기본값 반환, `QuotaExceededError` catch 후 AlertDialog 트리거.

```typescript
type Side = '본가' | '처가';

interface VisitSchedule {
  id: string; side: Side; date: string;
  startTime?: string; endTime?: string;
  memo: string; holidayId: string; createdAt: number;
}
interface BudgetItem {
  id: string; side: Side;
  category: '용돈' | '선물' | '차례비용' | '교통' | '기타';
  label: string; amount: number; paid: boolean;
  holidayId: string; createdAt: number;
}
interface ChecklistItem {
  id: string; text: string; checked: boolean; holidayId: string;
}
interface ScriptRecord {
  id: string; situation: string;
  tone: '정중하게' | '단호하게' | '유머러스하게';
  result: string; createdAt: number;
}
interface StressLog {
  id: string; holidayId: string; score: number;
  triggers: string[]; memo: string; createdAt: number;
}
interface AppMeta {
  aiNoticeAck: boolean; currentHolidayId: string; isPaid: boolean;
}
```

**키 / shape / 크기**: 위 Data Models의 localStorage 키 맵 참조 (총 < 40KB, 5MB 한도 대비 안전).

---

## API Contract

외부 AI 서버(Railway 별도 배포)만 해당. CORS 허용 완료 전제. 그 외 모든 데이터는 localStorage.

### POST `{VITE_API_BASE}/api/script`
**Request Body**
```typescript
interface ScriptRequest {
  situation: string;   // 1~300자, 필수
  tone: '정중하게' | '단호하게' | '유머러스하게';
}
```
**Response 200**
```typescript
interface ScriptResponse {
  result: string;      // AI 생성 응대 스크립트
  model: string;       // 사용 모델 식별자
}
```
**Error Response (통일 shape)**
```typescript
interface ApiError { error: string; }
```
| 코드 | 조건 | error 값 |
|---|---|---|
| 400 | situation 비었거나 300자 초과 | `"상황 입력이 올바르지 않습니다"` |
| 429 | 무료 한도 초과 (서버측 rate limit) | `"요청이 많습니다. 잠시 후 다시 시도해주세요"` |
| 500 | 서버/AI 오류 | `"스크립트 생성에 실패했습니다"` |

클라이언트는 모든 4xx/5xx에서 Toast "생성에 실패했어요. 잠시 후 다시 시도해주세요" 표시하고 입력값 유지.

---

## Assumptions

- 명절 목록(설/추석)과 각 명절 날짜는 앱 내부 상수(`HOLIDAYS`)로 하드코딩. 2026 설날/추석 날짜 포함
- AI 스크립트 생성 외에는 전부 오프라인 동작 (localStorage)
- 단일 사용자 기기 로컬 데이터 — 부부 간 데이터 공유/동기화는 MVP 제외 (외부 서버 필요하므로 향후 확장)
- 시즌권 SKU/광고 ID/프로모션 코드는 앱인토스 콘솔에서 발급, env 주입
- AI 라벨·고지 의무는 F2 스크립트 기능에만 적용 (F3~F5는 규칙 기반 계산이므로 AI 고지 불필요)
- 무료 AI 일 1회 제한은 클라이언트 `ht.scripts`의 오늘자 createdAt 카운트 + 서버 429 이중 방어

## Open Questions

1. AI 서버 모델/비용 구조 — 시즌 트래픽 폭증(연 2회) 대비 rate limit 정책은? (제안: 서버 429 + 클라 캐싱)
2. 시즌권 결제 상품 구성 — 단일 시즌권 1종인가, 설/추석 각각 별도 상품인가? (SKU 개수 확정 필요)
3. 부부 데이터 공유 니즈 — 향후 외부 API 서버로 계정 페어링 확장 시 우선순위?
4. 프로모션 캠페인 여부 — `grantPromotionReward` 사용한다면 promotionCode 발급 및 지급액(≤5,000원) 확정 필요
5. 어버이날·생신 등 확장 명절 — MVP에 holidayId 구조만 열어두고 UI는 설/추석만 노출하는 것으로 충분한가?