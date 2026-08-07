# SPEC — HolidayTruce

## Common Principles

- **플랫폼**: Vite + React + TypeScript + TDS(@toss/tds-mobile), React Router(react-router-dom), localStorage 영속화.
- **인증**: 토스 세션 자동 제공. 별도 로그인 함수 호출 없음. 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 상태만 확인.
- **AI 고지 의무**: 시댁 응대 스크립트(F2)는 생성형 AI 결과물이므로 첫 이용 고지 + 결과물 라벨 필수.
- **UI 규칙**: 모든 화면은 TDS 핵심 컴포넌트만 사용(ListRow, Button, TextField, Paragraph.Text, Chip, Switch, AlertDialog, BottomSheet, Toast, Top, Tab). 하단 탭 네비는 템플릿 제공 `src/components/FloatingTabBar` 사용. 여백은 TDS Spacing(size 필수)만 사용. 페이지 골격은 ScreenScaffold로 감싼다(raw div 골격 금지).
- **색상**: HEX 하드코딩 금지 → `var(--tds-color-*)` 또는 TDS 컴포넌트만. 다크모드 지원.
- **터치 타겟**: 모든 인터랙티브 요소 ≥ 44px.
- **외부 이탈 금지**: `window.location.href` / `window.open`으로 외부 URL 이동 금지. 외부 분석 솔루션(GA, Amplitude) 사용 금지.
- **콘솔**: 프로덕션 빌드에서 `console.error` 출력 0개.
- **호환성**: Android 7+, iOS 16+.
- **수익화**: 시즌 결제(설·추석)는 `<TossPurchase>`(IAP), 보상형 광고는 `<TossRewardAd>`, 배너는 `<AdSlot>` 템플릿 컴포넌트 사용. 프로모션 지급 시 `grantPromotionReward({ promotionCode, amount })` — `amount ≤ 5000` 검증.
- **날짜 기준**: 명절 날짜는 앱 내장 상수 테이블(설/추석 양력 날짜)로 관리, 외부 API 미사용.

---

## Data Models

### Couple — 커플/사용자 설정
- `id: string` — uuid (localStorage 생성)
- `myRole: "며느리" | "사위" | "아내" | "남편"` — 사용자 역할
- `myFamilyLabel: string` — 예: "친정", "본가" (기본 "본가")
- `partnerFamilyLabel: string` — 예: "시댁", "처가" (기본 "시댁")
- `createdAt: number` — epoch ms
- 제약: `myFamilyLabel`, `partnerFamilyLabel`는 1~10자.

### Visit — 방문 일정
- `id: string` — uuid
- `family: "mine" | "partner"` — 어느 집
- `date: string` — "YYYY-MM-DD"
- `startHour: number` — 0~23
- `durationHours: number` — 1~48
- `holidayId: string` — 소속 명절 id (예: "2026-chuseok")
- `memo: string` — 0~100자
- 제약: `date`는 유효 날짜, `durationHours` 1 이상.

### BudgetItem — 예산 항목
- `id: string` — uuid
- `holidayId: string`
- `target: "본가" | "시댁" | "기타"` — 대상(라벨은 Couple 설정 반영)
- `category: "용돈" | "선물" | "교통" | "기타"`
- `label: string` — 1~20자
- `amount: number` — 0 이상 정수(원)
- 제약: `amount ≥ 0`, 정수.

### ChecklistItem — 갈등 방지 체크리스트 항목
- `id: string`
- `holidayId: string`
- `text: string` — 1~50자
- `done: boolean`

### Script — AI 응대 스크립트 기록
- `id: string`
- `situation: string` — 상황 카테고리 값
- `tone: "정중하게" | "단호하게" | "유머러스하게"`
- `question: string` — 사용자가 받은 곤란한 질문(1~100자)
- `resultText: string` — AI 생성 응답
- `createdAt: number`
- `isAi: true` — 상수(라벨 표시용)

### MoodLog — 명절 후 감정소진 기록
- `id: string`
- `holidayId: string`
- `exhaustionLevel: number` — 1~5 (1=괜찮음, 5=매우 소진)
- `stressTags: string[]` — 예: ["과한질문","가사노동","일정불균형"]
- `note: string` — 0~200자
- `createdAt: number`

### AppFlags — 앱 상태 플래그
- `aiNoticeAcknowledged: boolean` — AI 사전 고지 확인
- `activeHolidayId: string` — 현재 대상 명절
- `purchasedHolidays: string[]` — 시즌 결제 완료된 holidayId 목록

---

## localStorage Keys & Size

| Key | Shape | 예상 크기 |
|---|---|---|
| `ht_couple` | `Couple` | ~0.2KB |
| `ht_visits` | `Visit[]` | 항목당 ~0.15KB × 최대 40 ≈ 6KB |
| `ht_budget` | `BudgetItem[]` | 항목당 ~0.15KB × 최대 60 ≈ 9KB |
| `ht_checklist` | `ChecklistItem[]` | 항목당 ~0.1KB × 최대 50 ≈ 5KB |
| `ht_scripts` | `Script[]` | 항목당 ~0.5KB × 최대 100 ≈ 50KB |
| `ht_moodlogs` | `MoodLog[]` | 항목당 ~0.3KB × 최대 40 ≈ 12KB |
| `ht_flags` | `AppFlags` | ~0.2KB |

총합 < 100KB, 5MB 한도 대비 충분. 저장 실패(QuotaExceededError) 시 [W] AC로 처리.

---

## Feature List

### F1. 초기 설정 & AI 고지

- **Description**: 앱 첫 진입 시 사용자 역할과 가족 호칭(본가/시댁 라벨)을 설정하고, 대상 명절을 선택한다. AI 기능 첫 이용 전 생성형 AI 활용 고지를 1회 표시하여 법적 고지 의무를 충족한다.
- **Data**: `Couple`, `AppFlags`
- **API**: 없음 (localStorage 전용)
- **Requirements**:
- AC-1 [E][P0]: Scenario: 초기 설정 저장
  Given 앱 첫 진입으로 `ht_couple`이 없을 때
  When 설정 폼에서 `{ myRole: "며느리", myFamilyLabel: "친정", partnerFamilyLabel: "시댁" }` 제출
  Then `ht_couple`에 저장되고 성공 토스트 "설정이 저장되었어요" 표시
  And 홈(`/`)으로 이동
- AC-2 [E][P0]: Scenario: 대상 명절 선택
  Given 초기 설정 화면에서 명절 Chip 목록이 표시될 때
  When "2026 추석" Chip 탭
  Then `ht_flags.activeHolidayId = "2026-chuseok"`로 저장됨
- AC-3 [E][P0]: Scenario: AI 서비스 첫 이용 고지
  Given `ht_flags.aiNoticeAcknowledged`가 false일 때
  When 사용자가 F2(응대 스크립트) 탭에 처음 진입
  Then AlertDialog "이 서비스는 생성형 AI를 활용합니다"가 1회 표시됨
  And 확인 버튼 탭 후 `ht_flags.aiNoticeAcknowledged = true` 저장
- AC-4 [W][P1]: Scenario: 빈 호칭 거부
  Given 초기 설정 화면일 때
  When `{ myFamilyLabel: "" }`로 제출
  Then 에러 메시지 "호칭을 입력해주세요" 표시, 저장 안 됨
- AC-5 [W][P1]: Scenario: 저장 용량 초과
  Given localStorage 저장 시 QuotaExceededError 발생 시
  When 설정 제출
  Then AlertDialog "저장 공간이 부족해요. 기록을 정리해주세요" 표시, 앱 크래시 없음
- AC-6 [S][P1]: Scenario: 초기 진입 로딩/미설정 상태
  While `ht_couple` 로드 중일 때
  Then 스켈레톤(로딩 인디케이터) 표시, 로드 완료 후 미설정이면 설정 화면으로 리다이렉트
- AC-7 [U][P0]: The system shall always `grantPromotionReward` 미사용 시 프로모션 관련 UI를 노출하지 않는다.

---

### F2. AI 시댁·처가 응대 스크립트 생성

- **Description**: 곤란한 상황과 질문을 입력하면 상황·톤에 맞는 응대 멘트를 생성해 보여준다. 결과는 보상형 광고 시청 후 노출되며, AI 생성 라벨을 반드시 표시한다. 생성된 스크립트는 기록으로 저장해 다시 볼 수 있다.
- **Data**: `Script`, `AppFlags`
- **API**: `POST /api/script` (외부 AI 서버) — 아래 API Contract 참조
- **Requirements**:
- AC-1 [E][P0]: Scenario: 스크립트 생성 성공
  Given AI 고지가 확인된 상태일 때
  When `{ situation: "결혼계획질문", tone: "정중하게", question: "애는 언제 낳니?" }` 제출
  Then `POST /api/script` 호출, 200 응답의 `reply` 텍스트가 결과 카드에 표시됨
  And `ht_scripts`에 `Script` 항목 저장, 성공 토스트 "스크립트가 만들어졌어요" 표시
- AC-2 [E][P0]: Scenario: 결과 보기 전 보상형 광고
  Given 사용자가 상황·질문 입력 후 "스크립트 만들기" 버튼 탭
  When `<TossRewardAd>` 광고 시청 완료
  Then AI 응답 결과 화면(`/script/result`)이 표시됨
- AC-3 [U][P0]: Scenario: AI 결과물 라벨 표시
  Given AI 스크립트 결과가 화면에 표시될 때
  Then 결과 카드 하단에 "AI가 생성한 결과입니다" 배지가 표시됨
- AC-4 [W][P1]: Scenario: 빈 질문 거부
  Given 응대 스크립트 입력 화면일 때
  When `{ situation: "결혼계획질문", question: "" }` 제출
  Then 에러 메시지 "곤란했던 질문을 입력해주세요" 표시, API 호출 안 됨
- AC-5 [W][P1]: Scenario: API 실패 처리
  Given `POST /api/script`가 500 또는 네트워크 오류를 반환할 때
  When 스크립트 생성 시도
  Then 에러 문구 "잠시 후 다시 시도해주세요" + "다시 시도" TDS Button 표시, 앱 크래시 없음
- AC-6 [S][P1]: Scenario: 생성 로딩 상태
  While `POST /api/script` 응답 대기 중일 때
  Then 버튼이 비활성화되고 로딩 인디케이터 표시, 중복 제출 차단
- AC-7 [S][P1]: Scenario: 기록 빈 상태
  While `ht_scripts`가 빈 배열일 때
  Then 스크립트 기록 목록에 `Asset.ContentIcon` + "아직 만든 스크립트가 없어요" 안내 표시
- AC-8 [U][P0]: The system shall always API 호출을 CORS가 설정된 HTTPS 엔드포인트로만 수행한다(콘솔 CORS 에러 0개).

---

### F3. 방문 일정 균형 캘린더

- **Description**: 본가/처가 방문 일정을 등록하고, 두 집에 배분된 체류 시간을 비교해 균형 여부를 시각화한다. 한쪽으로 시간이 치우치면 경고 표시로 조율을 유도한다.
- **Data**: `Visit`, `Couple`
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 방문 일정 추가
  Given 활성 명절이 "2026-chuseok"일 때
  When `{ family: "partner", date: "2026-09-25", startHour: 10, durationHours: 6, memo: "차례" }` 제출
  Then `ht_visits`에 저장되고 목록에 항목 추가, 성공 토스트 "일정이 추가됐어요" 표시
- AC-2 [U][P0]: Scenario: 균형 지표 계산
  Given `ht_visits`에 본가 4시간, 시댁 12시간이 등록됐을 때
  Then 균형 지표가 "본가 25% / 시댁 75%"로 MiniBar에 표시되고 강조 숫자(t2) 노출
- AC-3 [E][P1]: Scenario: 불균형 경고
  Given 한쪽 체류 시간이 전체의 70%를 초과할 때
  When 캘린더 화면 진입
  Then 경고 Chip "한쪽에 시간이 몰려 있어요" 표시
- AC-4 [E][P1]: Scenario: 일정 삭제
  Given 방문 일정 항목이 있을 때
  When 항목의 삭제 액션 탭 후 AlertDialog에서 "삭제" 확인
  Then `ht_visits`에서 제거되고 균형 지표 재계산
- AC-5 [W][P1]: Scenario: 잘못된 기간 거부
  Given 일정 입력 화면일 때
  When `{ durationHours: 0 }` 제출
  Then 에러 메시지 "체류 시간은 1시간 이상이어야 해요" 표시, 저장 안 됨
- AC-6 [S][P1]: Scenario: 빈 일정 상태
  While `ht_visits`가 빈 배열일 때
  Then `Asset.ContentIcon` + "아직 등록된 방문 일정이 없어요" 안내와 "일정 추가" TDS Button 표시
- AC-7 [S][P1]: Scenario: 목록 스크롤
  While 방문 일정이 20개를 초과할 때
  Then 목록은 세로 스크롤되며 렌더 지연 없음(가상 스크롤 또는 페이지네이션 적용)

---

### F4. 예산 계산기 & 갈등 방지 체크리스트

- **Description**: 명절별 용돈·선물·교통비를 본가/시댁별로 입력해 총액과 양쪽 균형을 계산한다. 함께 제공되는 갈등 방지 체크리스트로 방문 전 준비 사항을 점검한다.
- **Data**: `BudgetItem`, `ChecklistItem`, `Couple`
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 예산 항목 추가
  Given 활성 명절이 있을 때
  When `{ target: "시댁", category: "용돈", label: "부모님 용돈", amount: 300000 }` 제출
  Then `ht_budget`에 저장되고 총액이 300,000원으로 갱신, 성공 토스트 표시
- AC-2 [U][P0]: Scenario: 총액 및 균형 표시
  Given 본가 20만원, 시댁 30만원 항목이 있을 때
  Then SummaryHero에 총액 "500,000원"이 CountUp으로 표시되고 본가/시댁 비율이 MiniBar로 시각화됨
- AC-3 [E][P0]: Scenario: 체크리스트 완료 토글
  Given 체크리스트 항목이 있을 때
  When 항목의 TDS Switch를 on
  Then `ht_checklist` 해당 항목 `done: true` 저장, 완료 개수 "3/5" 갱신
- AC-4 [W][P1]: Scenario: 음수 금액 거부
  Given 예산 입력 화면일 때
  When `{ amount: -1000 }` 제출
  Then 에러 메시지 "금액은 0원 이상이어야 해요" 표시, 저장 안 됨
- AC-5 [W][P1]: Scenario: 숫자 아닌 입력 처리
  Given 금액 TextField에서
  When "1만원" 같은 비숫자를 입력
  Then 숫자만 필터링되어 표시되고, 빈 값이면 "금액을 입력해주세요" 표시
- AC-6 [S][P1]: Scenario: 예산 빈 상태
  While `ht_budget`가 빈 배열일 때
  Then 총액 "0원" 및 `Asset.ContentIcon` + "예산 항목을 추가해보세요" 안내 표시
- AC-7 [E][P1]: Scenario: 항목 저장 로딩
  While 예산 항목 저장 처리 중일 때
  Then 제출 버튼 비활성화, 완료 후 재활성화(중복 저장 방지)

---

### F5. 명절 후 감정소진 기록 & 리포트

- **Description**: 명절 종료 후 감정소진도(1~5)와 스트레스 요인을 기록한다. 축적된 기록을 바탕으로 소진 추이와 주요 스트레스 요인을 다음 명절 대비 리포트로 요약해 보여준다.
- **Data**: `MoodLog`
- **API**: 없음
- **Requirements**:
- AC-1 [E][P0]: Scenario: 감정소진 기록 저장
  Given 활성 명절이 있을 때
  When `{ exhaustionLevel: 4, stressTags: ["과한질문","일정불균형"], note: "질문이 많았음" }` 제출
  Then `ht_moodlogs`에 저장, 성공 토스트 "기록됐어요" 표시, 리포트(`/report`)로 이동
- AC-2 [U][P0]: Scenario: 소진 추이 시각화
  Given `ht_moodlogs`에 2개 이상 기록이 있을 때
  Then 리포트 화면에 소진도 추이 Sparkline과 평균 소진도 강조 숫자(t2)가 표시됨
- AC-3 [U][P1]: Scenario: 주요 스트레스 요인 요약
  Given 여러 기록의 `stressTags`가 있을 때
  Then 상위 3개 요인이 빈도순 Chip으로 표시됨(예: "과한질문 3회")
- AC-4 [W][P1]: Scenario: 범위 밖 소진도 거부
  Given 기록 입력 화면일 때
  When `exhaustionLevel`이 1~5 범위를 벗어나면
  Then 저장이 차단되고 "소진도를 선택해주세요" 표시
- AC-5 [S][P1]: Scenario: 리포트 빈 상태
  While `ht_moodlogs`가 빈 배열일 때
  Then 리포트에 `Asset.ContentIcon` + "명절 후 첫 기록을 남겨보세요" 안내 표시
- AC-6 [S][P1]: Scenario: 리포트 로딩
  While `ht_moodlogs` 로드 및 집계 중일 때
  Then 스켈레톤 표시 후 집계 완료 시 렌더

---

### F6. 시즌 결제 & 홈 대시보드

- **Description**: 홈 화면에서 활성 명절의 D-day, 일정 균형·예산 총액·체크리스트 진행률을 한눈에 요약한다. 프리미엄 기능(무제한 AI 스크립트, 광고 제거)은 시즌 원타임 결제로 잠금 해제한다.
- **Data**: `AppFlags`, `Visit`, `BudgetItem`, `ChecklistItem`
- **API**: 없음 (결제는 `<TossPurchase>` 컴포넌트)
- **Requirements**:
- AC-1 [U][P0]: Scenario: 홈 대시보드 요약
  Given 활성 명절과 데이터가 있을 때
  Then 홈에 D-day 히어로 숫자(CountUp), 일정 균형 MiniBar, 예산 총액, 체크리스트 진행률 Card가 표시됨
- AC-2 [E][P0]: Scenario: 시즌 결제 성공
  Given 사용자가 "이번 명절 프리미엄" 결제를 시도할 때
  When `<TossPurchase>` 결제 완료(onPurchased)
  Then `ht_flags.purchasedHolidays`에 activeHolidayId 추가, 성공 토스트 "프리미엄이 활성화됐어요" 표시
- AC-3 [S][P0]: Scenario: 프리미엄 광고 제거
  While `ht_flags.purchasedHolidays`에 활성 명절이 포함될 때
  Then F2 결과가 `<TossRewardAd>` 없이 즉시 표시되고 `<AdSlot>` 배너가 숨겨짐
- AC-4 [W][P1]: Scenario: 결제 실패 처리
  Given 결제 처리 중 실패/취소가 발생할 때
  When `<TossPurchase>` 오류 콜백 호출
  Then 토스트 "결제가 완료되지 않았어요" 표시, `purchasedHolidays` 변경 없음
- AC-5 [S][P1]: Scenario: 대시보드 데이터 없음
  While 방문/예산/체크리스트가 모두 비었을 때
  Then 각 Card에 "아직 데이터가 없어요"와 해당 기능 이동 버튼 표시
- AC-6 [W][P1]: Scenario: 외부 이탈 차단
  Given 앱 내 어떤 액션에서도
  When 외부 URL로의 `window.open`/`window.location.href` 이동이 시도되면
  Then 해당 이동을 수행하지 않는다(법률 고지·공공기관 링크 예외 없음).
- AC-7 [U][P0]: The system shall always 프로덕션 빌드에서 `console.error`를 출력하지 않는다.

---

## Screen Definitions

### S1. 초기 설정 (F1)
- **Route**: `/setup`
- **TDS**: Top(제목), TextField(호칭 입력), Chip(역할·명절 선택), Button(display="block" 저장), Toast, AlertDialog(용량 오류)
- **골격**: ScreenScaffold + 하단 SubmitFooter("저장하기")
- **States**: Loading=스켈레톤 / Empty=해당 없음(첫 화면) / Error=호칭 미입력 인라인 에러 + 용량 초과 AlertDialog
- **터치**: 모든 Chip/Button ≥ 44px
- **키보드**: 호칭 TextField 포커스 시 하단 SubmitFooter가 키보드 위로 밀려 가려지지 않음
- **Navigation**:
  - Outgoing: 저장 완료 → `navigate('/', { replace: true })`
  - Incoming: `location.state = undefined`
- **Layout AC**: 설정 화면은 `data-testid="setup-form"` 컨테이너와 display="block" 저장 버튼을 가진다.

### S2. 홈 대시보드 (F6)
- **Route**: `/`
- **TDS**: Top, ListRow, Chip, Button, Paragraph.Text + 템플릿 SummaryHero(D-day), MiniBar(균형), Card(요약), `<AdSlot>`(비프리미엄), FloatingTabBar
- **골격**: ScreenScaffold, 요약 정보는 Card로 위계화(맨 div 나열 금지)
- **States**: Loading=스켈레톤 / Empty=각 Card "데이터 없음" + 이동 버튼 / Error=localStorage 파싱 실패 시 기본값 fallback
- **터치**: 각 Card 탭 영역 ≥ 44px
- **광고 배치**: `<AdSlot>` 배너는 요약 Card 섹션과 프리미엄 CTA 사이에 배치(콘텐츠 위 오버레이 금지)
- **Navigation**:
  - Outgoing: 일정 Card → `navigate('/calendar')`; 예산 Card → `navigate('/budget')`; 스크립트 → `navigate('/script')`; 리포트 → `navigate('/report')`
  - Incoming: `location.state = undefined`
- **Layout AC**: 홈은 `data-testid="dday-hero"` SummaryHero와 `data-testid="balance-bar"` MiniBar를 포함하고 요약을 Card 3개 이상으로 표시한다.

### S3. 응대 스크립트 입력 (F2)
- **Route**: `/script`
- **TDS**: Top, Chip(상황·톤 선택), TextField(질문 입력), Button(display="block" "스크립트 만들기"), AlertDialog(AI 고지), Toast, `<TossRewardAd>`(결과 게이트)
- **골격**: ScreenScaffold + SubmitFooter
- **States**: Loading=버튼 비활성+인디케이터 / Empty=기록 목록 빈 상태 안내 / Error="다시 시도" 버튼
- **키보드**: 질문 TextField 포커스 시 화면 스크롤로 입력창 가시 유지
- **Navigation**:
  - Outgoing: 광고 시청 완료 → `navigate('/script/result', { state: { scriptId: string } })`
  - Incoming: `location.state = undefined`

### S4. 스크립트 결과 (F2)
- **Route**: `/script/result`
- **TDS**: Top, Card(결과 텍스트), Chip("AI가 생성한 결과입니다" 배지), Button("다시 만들기", "저장/공유 없음")
- **골격**: ScreenScaffold, 결과는 Card로 강조 타이포(t3)
- **States**: Loading=없음(진입 시 이미 생성됨) / Error=state 누락 시 `/script`로 리다이렉트
- **Navigation**:
  - Outgoing: "다시 만들기" → `navigate('/script')`
  - Incoming: `location.state = { scriptId: string }` (누락 시 리다이렉트)
- **Layout AC**: 결과 화면은 `data-testid="script-result-card"` Card와 `data-testid="ai-badge"` 배지를 가진다.

### S5. 방문 균형 캘린더 (F3)
- **Route**: `/calendar`
- **TDS**: Top, ListRow(일정 목록), Chip(균형 경고), Button, BottomSheet(일정 추가 폼), TextField, AlertDialog(삭제 확인) + MiniBar(균형)
- **골격**: ScreenScaffold, FloatingTabBar
- **States**: Loading=스켈레톤 / Empty="일정 없음" + 추가 버튼 / Error=입력 검증 인라인 에러
- **스크롤**: 일정 20개 초과 시 가상 스크롤/페이지네이션
- **Navigation**:
  - Outgoing: 없음(모달 방식 BottomSheet로 처리)
  - Incoming: `location.state = undefined`
- **Layout AC**: 캘린더는 `data-testid="balance-bar"` MiniBar와 본가/시댁 비율 강조 숫자(t2)를 표시한다.

### S6. 예산 & 체크리스트 (F4)
- **Route**: `/budget`
- **TDS**: Top, Tab(예산/체크리스트 전환), ListRow, TextField(금액·라벨), Switch(체크 완료), Button, BottomSheet(항목 추가) + SummaryHero(총액 CountUp), MiniBar(본가/시댁 비율)
- **골격**: ScreenScaffold, FloatingTabBar
- **States**: Loading=스켈레톤 / Empty="항목 추가" 안내 / Error=금액 검증 인라인 에러
- **키보드**: 금액 TextField는 숫자 키패드(inputMode="numeric"), 포커스 시 입력창 가시 유지
- **Navigation**:
  - Outgoing: 없음
  - Incoming: `location.state = undefined`
- **Layout AC**: 예산 탭은 `data-testid="budget-total-hero"` SummaryHero(총액 CountUp)와 `data-testid="budget-ratio-bar"` MiniBar를 가진다.

### S7. 감정 기록 & 리포트 (F5)
- **Route**: `/report` (리포트), `/report/new` (기록 입력)
- **TDS**: Top, Chip(스트레스 태그·소진도 선택), TextField(메모), Button, ListRow + Sparkline(소진 추이), 강조 타이포(평균 소진도)
- **골격**: ScreenScaffold
- **States**: Loading=스켈레톤 / Empty="첫 기록 남기기" + `Asset.ContentIcon` / Error=소진도 미선택 인라인 에러
- **Navigation**:
  - Outgoing: 기록 저장 완료 → `navigate('/report', { replace: true })`; 리포트에서 "기록 추가" → `navigate('/report/new')`
  - Incoming: `/report/new`의 `location.state = undefined`; `/report`의 `location.state = undefined`
- **Layout AC**: 리포트는 `data-testid="mood-trend-spark"` Sparkline과 평균 소진도 강조 숫자(t2)를 포함한다.

---

## API Contract

외부 AI 서버(별도 Railway 배포). 모든 통신은 HTTPS + CORS 허용.

### POST /api/script — 응대 스크립트 생성
- **Request Body**:
```ts
interface ScriptRequest {
  situation: "결혼계획질문" | "취업질문" | "외모지적" | "명절노동분담" | "기타";
  tone: "정중하게" | "단호하게" | "유머러스하게";
  question: string;      // 1~100자
  familyLabel: string;   // 예: "시댁"
}
```
- **Response (200)**:
```ts
interface ScriptResponse {
  reply: string;         // AI 생성 응대 멘트
  disclaimer: string;    // "AI가 생성한 결과입니다"
}
```
- **Error Response (400/429/500)**:
```ts
interface ApiError {
  error: string;         // 예: "invalid_request" | "rate_limited" | "server_error"
}
```
- **Error Codes**:
  - `400` `{ error: "invalid_request" }` — question 누락/길이 초과
  - `429` `{ error: "rate_limited" }` — 과다 요청
  - `500` `{ error: "server_error" }` — 서버 오류
- **클라이언트 처리**: 비200 응답 및 네트워크 오류는 F2 AC-5에 따라 "잠시 후 다시 시도해주세요" + "다시 시도" 버튼 표시.

---

## Assumptions

- 명절 날짜(설/추석 양력)는 앱 내장 상수 테이블로 관리하며 외부 캘린더 API를 호출하지 않는다.
- 커플 데이터는 사용자 단일 기기 기준. 파트너 간 실시간 동기화는 MVP 범위 밖(외부 서버 없음).
- AI 스크립트 생성만 외부 API를 사용하고 나머지 모든 데이터는 localStorage에 저장한다.
- 결제 SKU/광고 그룹·슬롯 ID/프로모션 코드는 앱인토스 콘솔에서 발급되어 env로 주입된다.
- 프리미엄 결제는 명절 단위(시즌 원타임)로, 결제한 `activeHolidayId`에만 프리미엄이 적용된다.

## Open Questions

1. AI 스크립트 무료 제공 횟수(비프리미엄 시 보상형 광고당 1회 vs 일일 제한)의 구체 수치는?
2. 프리미엄 시즌 결제 가격 및 SKU 정책(설/추석 개별 vs 통합)?
3. 어버이날·생신 등 연중 가족행사 확장은 별도 holidayId로 처리 가능한데, MVP 포함 여부?
4. 프로모션(신규 유저 리워드) 캠페인 운영 여부 및 promotionCode 발급 계획?
5. 스트레스 태그 프리셋 목록의 최종 항목 구성(사용자 커스텀 추가 허용 여부)?