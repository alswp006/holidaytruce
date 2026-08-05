First, an important correction on framing before I give you the updated SPEC.

## The validation report applies the wrong criteria

This app is, by design, **localStorage-only client storage** — the SPEC explicitly states `외부 DB 없음`, and the platform brief mandates `localStorage for data persistence` with `NO server-side code`. The report validates it as if it were a relational database (PKs/FKs/indexes/`ON DELETE CASCADE`/normalization). Those criteria don't apply, and "fixing" them by inventing `Users`, `Seasons`, `Relations`, `Causes` tables would **violate hard platform rules**:

- **No `Users` table / `userId` FK** — Toss provides the session automatically; data is device-local per the SPEC. Adding a user table contradicts "auth is automatic, no custom auth" and "localStorage per device."
- **No SQL indexes** — arrays are capped tiny (max 100–200 items); in-memory `filter`/`sort` is correct and faster than any index abstraction here.
- **No normalization of `BudgetItem`** — embedding value objects in a JSON document is the *correct* pattern for localStorage, not a 1NF violation.
- **No `ON DELETE`, no separate `Season`/`Cause`/`Relation` tables** — these are fixed in-app enums, not mutable entities.

So I'm **rejecting the relational-schema recommendations** as out-of-paradigm. What I *am* applying is the legitimately useful subset that improves a localStorage client:

1. **Consistent record envelope** — every *collection* entity now has `id` + `createdAt` + `updatedAt`.
2. **Typed reference catalogs** — `Relation`/`ToneKey`/`Season`/`Cause` promoted to explicit in-app constant dictionaries (the localStorage-appropriate answer to "enum vs FK", and it closes the open question about the cause-tag dictionary).
3. **Explicit ordering & lookup conventions** — replaces "indexes."
4. **Validation-level uniqueness rules** — replaces DB `UNIQUE` constraints.

Singletons (`AppMeta`, `BudgetPlan`) intentionally keep no `id` — a single-object config document has no collection to key into; I've added `updatedAt` for audit consistency and documented why `id` is omitted.

Here is the complete updated SPEC.

---

# SPEC — HolidayTruce (명절휴전)

## Common Principles
- **플랫폼**: 앱인토스 (Vite + React + TypeScript + React Router + TDS `@toss/tds-mobile`). 모든 UI는 모바일 최적화, 터치 타깃 ≥ 44px.
- **인증**: 토스 세션 자동 제공. 별도 로그인 함수 호출 없음. 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 연동 상태만 확인. **사용자 식별자(userId)는 저장하지 않음** — 데이터는 기기별 localStorage로 자연 분리됨.
- **데이터**: 전량 localStorage 저장(외부 DB 없음). AI 스크립트 생성만 외부 API 서버 호출(별도 Railway 배포). 그 외 네트워크 호출 없음.
- **AI 고지 의무**: 본 앱은 AI 기반 응대 스크립트를 생성하므로 생성형 AI 고지·라벨 필수(위반 시 과태료). 첫 이용 고지 1회 + 모든 결과물 라벨.
- **결제**: 템플릿 제공 `<TossPurchase>`로 시즌 프리미엄 언락(원타임). SKU는 `import.meta.env.VITE_TOSS_IAP_SKU`.
- **광고**: 배너 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`, 보상형 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`. 광고는 콘텐츠와 겹치지 않게 섹션 사이/결과 하단 배치.
- **스타일**: 색상은 `var(--tds-color-*)` 또는 TDS 컴포넌트만 사용(HEX 하드코딩 금지, 다크모드 지원). 여백은 TDS `Spacing`(size 필수)만.
- **레이아웃 골격**: 모든 화면은 템플릿 `ScreenScaffold`(또는 `PageShell`)로 감싼다. 하단 탭 네비는 템플릿 `FloatingTabBar` 사용.
- **외부 이탈 금지**: `window.location.href`/`window.open` 외부 URL 이동 차단. 외부 분석 솔루션(GA/Amplitude) 미사용.
- **출력 언어**: 한국어.

---

## Data Storage Conventions (localStorage, NOT relational)

> 본 앱은 관계형 DB가 아닌 **브라우저 localStorage에 직렬화된 JSON 문서**를 사용한다. 따라서 PK/FK/인덱스/ON DELETE 개념은 적용되지 않으며, 아래 규약으로 동일한 무결성 목표를 달성한다.

- **레코드 봉투(record envelope)**: 컬렉션(배열)로 저장되는 모든 엔티티는 3개 공통 필드를 가진다.
  - `id: string` — `crypto.randomUUID()`로 생성, 앱 전역 유일. (컬렉션 내 조회·수정·삭제 키)
  - `createdAt: number` — epoch ms, 최초 저장 시 1회 세팅 후 불변.
  - `updatedAt: number` — epoch ms, 최초 저장 시 `createdAt`과 동일값, 이후 수정 시마다 갱신.
- **싱글턴 문서 규약**: `AppMeta`, `BudgetPlan`은 키당 단일 객체(컬렉션 아님)이므로 `id`를 두지 않는다(조회할 컬렉션이 없어 무의미). 대신 `createdAt`/`updatedAt`만 유지한다.
- **참조는 값 복사(embedded value)**: `ScriptResult.request`, `BudgetPlan.items`처럼 종속 값 객체는 부모 문서에 임베드한다(정규화·조인 없음 — localStorage 문서 모델의 표준 패턴).
- **참조 카탈로그**: `Relation`/`ToneKey`/`Season`/`Cause`는 별도 저장 엔티티가 아니라 **앱 내 고정 상수 사전**(아래 Reference Catalogs)이다. 저장 필드에는 카탈로그의 값을 그대로 담고, 유효성은 카탈로그 소속 여부로 검증한다(FK 대체).
- **정렬·조회 규약(인덱스 대체)**: localStorage에는 인덱스가 없으므로 읽은 뒤 in-memory로 정렬/필터한다. 컬렉션 크기가 작아(≤200) 비용은 무시 가능.
  - `holidaytruce:scripts` — `createdAt` 내림차순(최신 우선).
  - `holidaytruce:visits` — `date` 오름차순(캘린더), 관계별 합산은 `relation`로 그룹.
  - `holidaytruce:burnout` — `season` 시즌 순 → 동일 시즌 내 `createdAt` 오름차순(Sparkline 추이).
- **유효성 유일성 규칙(UNIQUE 제약 대체)**: 저장 로직에서 검증한다.
  - `AppMeta`, `BudgetPlan` — 키당 정확히 1개 문서(싱글턴 강제).
  - `BudgetItem.id`, `VisitPlan.id`, `ScriptResult.id`, `BurnoutLog.id` — 각 컬렉션 내 유일(UUID로 보장).
  - `VisitPlan`은 `(relation, date)` 중복 저장을 **허용**한다(하루 복수 방문 가능) — 유일성 강제하지 않음(의도된 결정, 3.의 Assumptions 참조).
- **삭제 동작(ON DELETE 대체)**: 참조가 모두 임베드 값이라 고아 레코드가 발생하지 않는다. 항목 삭제는 부모 배열에서 `id`로 splice.

---

## Reference Catalogs (앱 내 고정 상수 — 저장 엔티티 아님)

```ts
// 관계 카탈로그 (FK 대체: 저장값은 반드시 이 중 하나)
const RELATIONS = ["시댁", "처가"] as const;
type Relation = typeof RELATIONS[number];

// 톤 카탈로그
const TONES = ["정중", "단호", "유머"] as const;
type ToneKey = typeof TONES[number];

// 시즌 카탈로그 — 현재 날짜 기준 자동 산정 또는 고정 매핑
const SEASONS = ["2026-설", "2026-추석", "2027-설", "2027-추석"] as const;
type Season = typeof SEASONS[number];

// 소진 원인 태그 카탈로그 (Open Question 해소: 고정 8개)
const CAUSES = [
  "과도한 질문", "가사 부담", "장거리 이동", "비교·잔소리",
  "경제적 부담", "음식 준비", "형제·친척 갈등", "휴식 부족",
] as const;
type Cause = typeof CAUSES[number];
```

- **검증 규칙(FK 대체)**: 각 저장 시 `relation ∈ RELATIONS`, `tone ∈ TONES`, `season ∈ SEASONS`, `causes ⊆ CAUSES`를 확인. 위반 값은 저장 거부.
- 카탈로그는 코드 상수이므로 마이그레이션/삭제 대상이 아니며 값 무결성을 컴파일 타임 타입 + 런타임 검증 이중으로 보장한다.

---

## Data Models

### AppMeta — 앱 전역 플래그 (싱글턴)
```ts
interface AppMeta {
  // id 없음 — 싱글턴 문서(컬렉션 아님)
  aiNoticeAck: boolean;         // AI 첫 이용 고지 확인 여부
  premiumUnlocked: boolean;     // 시즌 프리미엄 언락 여부
  premiumSeason: Season | null; // 언락된 시즌 (카탈로그 값)
  createdAt: number;            // epoch ms
  updatedAt: number;            // epoch ms, 플래그 변경 시 갱신
}
```
- **key**: `holidaytruce:meta` — 단일 객체 JSON. 크기 ~170 bytes.
- **기본값**: `{ aiNoticeAck:false, premiumUnlocked:false, premiumSeason:null, createdAt:now, updatedAt:now }`.

### ScriptRequest / ScriptResult — AI 응대 스크립트
```ts
interface ScriptRequest {         // 임베드 값 객체 (독립 저장 안 함)
  relation: Relation;
  situation: string;   // 최대 200자
  tone: ToneKey;
}

interface ScriptResult {
  id: string;          // crypto.randomUUID(), 컬렉션 내 유일
  request: ScriptRequest;
  scripts: string[];   // AI 생성 응대 문장 3개
  aiGenerated: true;   // 라벨 표시용 고정 플래그
  createdAt: number;   // epoch ms
  updatedAt: number;   // epoch ms (재생성/재열람 갱신용, 최초=createdAt)
}
```
- **key**: `holidaytruce:scripts` — `ScriptResult[]`, `createdAt` 내림차순. 항목당 ~620 bytes, 최대 100개 유지 → ~62KB.
- **기본값**: `[]`.

### VisitPlan — 방문 일정 균형
```ts
interface VisitPlan {
  id: string;          // crypto.randomUUID()
  relation: Relation;  // 카탈로그 값
  date: string;        // "YYYY-MM-DD"
  hours: number;       // 체류 시간 0.5~48
  memo: string;        // 최대 100자
  createdAt: number;
  updatedAt: number;   // 최초=createdAt, 수정 시 갱신
}
```
- **key**: `holidaytruce:visits` — `VisitPlan[]`, `date` 오름차순 조회. 항목당 ~200 bytes, 최대 200개 → ~40KB.
- **기본값**: `[]`.

### BudgetPlan / BudgetItem — 예산 계산기
```ts
interface BudgetItem {           // BudgetPlan.items에 임베드
  id: string;          // crypto.randomUUID(), items 내 유일
  relation: Relation;  // 카탈로그 값
  label: string;       // 최대 40자
  amount: number;      // 원, 0~10,000,000
  checked: boolean;    // 준비 완료 체크
  createdAt: number;
  updatedAt: number;   // 체크 토글/수정 시 갱신
}

interface BudgetPlan {           // 싱글턴 문서
  // id 없음 — 싱글턴
  items: BudgetItem[];
  createdAt: number;   // 문서 최초 생성 시각
  updatedAt: number;   // 항목 추가/변경/삭제 시 갱신
}
```
- **key**: `holidaytruce:budget` — `BudgetPlan`. 항목당 ~150 bytes, 최대 100개 → ~15KB.
- **기본값**: `{ items:[], createdAt:now, updatedAt:now }`.

### BurnoutLog — 감정소진도 기록
```ts
interface BurnoutLog {
  id: string;          // crypto.randomUUID()
  season: Season;      // 카탈로그 값
  score: number;       // 1~10
  causes: Cause[];     // 카탈로그 부분집합
  note: string;        // 최대 300자
  createdAt: number;
  updatedAt: number;   // 최초=createdAt, 수정 시 갱신
}
```
- **key**: `holidaytruce:burnout` — `BurnoutLog[]`, `season`→`createdAt` 순 조회. 항목당 ~370 bytes, 최대 100개 → ~37KB.
- **기본값**: `[]`.

**총 용량 추정**: 모든 데이터 합산 < 200KB (5MB 한도 대비 안전).

---

## Feature List

### F1. 데이터 계층 & AI 고지 초기화
- **Description**: 앱 전체가 사용하는 localStorage 헬퍼(read/write/키별 접근)와 AppMeta 초기화를 담당한다. 앱 최초 진입 시 생성형 AI 고지 다이얼로그를 1회 표시하고 확인 플래그를 저장한다. 모든 저장 실패(QuotaExceeded 등)를 공통 처리한다. 레코드 봉투(id/createdAt/updatedAt) 세팅과 카탈로그 검증도 이 계층에서 수행한다.
- **Data**: AppMeta, 모든 모델의 저장 헬퍼
- **API**: 없음
- **Requirements**:
  - AC-1 [U][P0]: The system shall `holidaytruce:*` 5개 키를 통해서만 데이터를 읽고 쓰며, 존재하지 않는 키 접근 시 각 모델의 기본값(빈 배열 또는 초기 객체)을 반환한다.
  - AC-2 [E][P0]: Scenario: AI 서비스 첫 이용 고지
    Given `holidaytruce:meta`의 `aiNoticeAck === false`일 때
    When 앱 첫 진입(홈 마운트)
    Then TDS AlertDialog에 "이 서비스는 생성형 AI를 활용합니다" 안내가 1회 표시됨
    And "확인" 버튼 탭 시 `aiNoticeAck=true`, `updatedAt=now`가 `holidaytruce:meta`에 저장되고 다이얼로그가 닫힘
  - AC-3 [S][P1]: While `aiNoticeAck === true`, the system shall 이후 재진입 시 AI 고지 다이얼로그를 다시 표시하지 않는다.
  - AC-4 [W][P1]: Scenario: 저장 용량 초과 처리
    Given localStorage 쓰기가 `QuotaExceededError`를 던질 때
    When 임의 데이터 저장 시도
    Then TDS Toast "저장 공간이 부족합니다. 오래된 기록을 삭제해주세요" 표시
    And 앱은 크래시하지 않고 이전 상태를 유지함
  - AC-5 [W][P1]: Scenario: 손상된 JSON 복구
    Given localStorage 값이 파싱 불가한 문자열일 때
    When 해당 키 read
    Then 기본값을 반환하고 `console.error`를 호출하지 않음
  - AC-6 [U][P1]: The system shall 컬렉션 저장 시 신규 항목에 `id=crypto.randomUUID()`, `createdAt=updatedAt=now`를 세팅하고, 기존 항목 수정 시 `updatedAt=now`만 갱신한다.
  - AC-7 [U][P1]: The system shall 저장 전 카탈로그 검증(`relation∈RELATIONS`, `tone∈TONES`, `season∈SEASONS`, `causes⊆CAUSES`)을 수행하고, 위반 시 저장을 거부하고 인라인 에러를 표시한다.
  - AC-8 [U][P1]: The system shall 프로덕션 빌드에서 `console.error` 출력이 0개이다.

### F2. AI 시댁·처가 응대 스크립트 생성
- **Description**: 관계(시댁/처가), 상황 텍스트, 톤(정중/단호/유머)을 입력받아 외부 AI API로 응대 문장 3개를 생성한다. 결과는 보상형 광고 시청 후 노출되며 "AI가 생성한 결과입니다" 라벨이 붙는다. 생성 이력은 localStorage에 저장되어 재열람 가능하다.
- **Data**: ScriptRequest, ScriptResult, AppMeta
- **API**: `POST /api/scripts` — 아래 API Contract 참조
- **Requirements**:
  - AC-1 [E][P0]: Scenario: 스크립트 생성 성공
    Given 입력 `{ relation: "시댁", situation: "아이 언제 낳냐는 질문", tone: "정중" }`
    When "스크립트 생성" 버튼 탭 후 API가 `{ scripts: ["문장1","문장2","문장3"] }` 반환
    Then `holidaytruce:scripts` 맨 앞에 `id`/`createdAt`/`updatedAt`이 채워진 `ScriptResult`가 저장되고 결과 화면으로 이동함
  - AC-2 [E][P0]: Scenario: 결과 보기 전 보상형 광고
    Given 스크립트 생성이 완료됨
    When 사용자가 "결과 보기" 버튼 탭 → `TossRewardAd` 광고 시청 완료
    Then 응대 문장 3개가 표시됨
  - AC-3 [U][P0]: Scenario: AI 결과물 라벨 표시
    Given AI 스크립트 결과가 화면에 표시될 때
    Then 결과 카드 상단에 "AI가 생성한 결과입니다" TDS Badge/텍스트가 표시됨
  - AC-4 [W][P1]: Scenario: 빈 상황 입력 거부
    Given 입력 `{ relation: "시댁", situation: "", tone: "정중" }`
    When "스크립트 생성" 탭
    Then 에러 메시지 "상황을 입력해주세요" 표시, API 미호출
  - AC-5 [W][P1]: Scenario: API 실패 처리
    Given API가 500 또는 네트워크 오류 반환
    When 스크립트 생성 시도
    Then TDS Toast "생성에 실패했어요. 잠시 후 다시 시도해주세요" 표시, 입력값 유지, 이전 화면 잔류
  - AC-6 [S][P1]: While API 응답 대기 중, the system shall 생성 버튼을 비활성화하고 TDS 로딩 인디케이터를 표시한다.
  - AC-7 [S][P1]: While `holidaytruce:scripts`가 빈 배열일 때, the system shall 이력 목록에 Asset.ContentIcon 빈 상태와 "아직 생성한 스크립트가 없어요" 문구를 표시한다.
  - AC-8 [U][P1]: The system shall 이력 목록을 `createdAt` 내림차순으로 정렬해 최신 항목을 맨 위에 표시한다.
  - AC-9 [U][P1]: The system shall CORS 설정 완료된 외부 API만 호출하며, 응답 파싱 실패 또는 `scripts.length !== 3`이면 AC-5 에러 플로우로 처리한다.

### F3. 본가/처가 방문 일정 균형 캘린더
- **Description**: 시댁/처가 방문 일정과 체류 시간을 기록하고, 두 관계의 누적 체류 시간을 비교해 균형 지표를 시각화한다. 한쪽으로 치우치면 경고 배지를 노출해 갈등 예방을 돕는다.
- **Data**: VisitPlan
- **API**: 없음
- **Requirements**:
  - AC-1 [E][P0]: Scenario: 방문 일정 추가
    Given 입력 `{ relation: "처가", date: "2026-09-25", hours: 6, memo: "차례" }`
    When "추가" 버튼 탭
    Then `id`/`createdAt`/`updatedAt`이 채워져 `holidaytruce:visits`에 저장되고 목록에 항목 추가, 성공 Toast "일정이 추가되었어요" 표시
  - AC-2 [U][P0]: The system shall 시댁 누적시간 `sumSi`와 처가 누적시간 `sumCh`를 `relation` 그룹 합산으로 계산하고, 균형 지표를 `sumSi:sumCh` 비율로 MiniBar에 표시한다.
  - AC-3 [E][P1]: Scenario: 불균형 경고
    Given 한쪽 누적시간이 다른 쪽의 2배를 초과할 때 (예: 시댁 12h, 처가 4h)
    When 균형 카드 렌더
    Then "한쪽에 치우쳐 있어요" TDS Badge(경고 톤)가 표시됨
  - AC-4 [E][P1]: Scenario: 일정 삭제
    Given 목록의 특정 항목에서 삭제 액션
    When TDS AlertDialog "삭제할까요?"에서 "삭제" 탭
    Then 해당 항목이 `id`로 `holidaytruce:visits`에서 제거되고 균형 지표 재계산됨
  - AC-5 [W][P1]: Scenario: 잘못된 체류 시간 거부
    Given 입력 `hours = 0` 또는 `hours > 48`
    When "추가" 탭
    Then 에러 메시지 "체류 시간은 0.5~48시간으로 입력해주세요" 표시, 저장 안 됨
  - AC-6 [S][P1]: While `holidaytruce:visits`가 빈 배열일 때, the system shall Asset.ContentIcon과 "첫 방문 일정을 추가해보세요" 빈 상태를 표시한다.
  - AC-7 [U][P1]: The system shall 목록을 `date` 오름차순으로 렌더한다.
  - AC-8 [S][P2]: While 목록 항목 수 > 30, the system shall 리스트를 가상 스크롤로 렌더한다.

### F4. 용돈·선물 예산 계산기 & 체크리스트
- **Description**: 시댁/처가별 용돈·선물 항목과 금액을 입력해 총 예산을 합산하고, 준비 완료 체크리스트를 제공한다. 관계별 지출 비중을 시각화해 예산 갈등을 사전 조율한다.
- **Data**: BudgetPlan, BudgetItem
- **API**: 없음
- **Requirements**:
  - AC-1 [E][P0]: Scenario: 예산 항목 추가
    Given 입력 `{ relation: "시댁", label: "시부모 용돈", amount: 300000 }`
    When "추가" 탭
    Then `holidaytruce:budget.items`에 `id`/`createdAt`/`updatedAt`/`checked:false`로 저장되고 `BudgetPlan.updatedAt`이 갱신되며 총합에 반영됨
  - AC-2 [U][P0]: The system shall 모든 항목 `amount` 합계를 SummaryHero(CountUp)로 "총 예산 ₩{합계}" 형식으로 표시한다.
  - AC-3 [E][P1]: Scenario: 준비 완료 체크
    Given 항목의 TDS Switch 토글
    When 토글 ON
    Then 해당 `BudgetItem.checked=true`, `updatedAt=now`로 저장되고 "완료 N/M" 카운트가 갱신됨
  - AC-4 [W][P1]: Scenario: 음수·초과 금액 거부
    Given 입력 `amount = -1000` 또는 `amount > 10000000`
    When "추가" 탭
    Then 에러 메시지 "금액은 0~1,000만원으로 입력해주세요" 표시, 저장 안 됨
  - AC-5 [W][P1]: Scenario: 빈 항목명 거부
    Given 입력 `{ label: "", amount: 50000 }`
    When "추가" 탭
    Then 에러 메시지 "항목명을 입력해주세요" 표시
  - AC-6 [U][P1]: The system shall 시댁/처가 지출 비중을 `relation` 그룹 합산으로 MiniBar에 표시하고, 항목이 0개면 "예산 항목을 추가해보세요" 빈 상태를 표시한다.
  - AC-7 [S][P1]: While 폼 입력 중(모바일 키보드 노출), the system shall 금액 입력에 `inputMode="numeric"` 키보드를 사용하고 하단 고정 버튼이 키보드에 가리지 않도록 스크롤을 보정한다.

### F5. 명절 후 감정소진도 기록 & 리포트
- **Description**: 명절 종료 후 소진도(1~10)와 원인 태그, 메모를 기록하고, 시즌별 추이를 Sparkline으로 리포트한다. 다음 명절 대비 요약(평균 소진도·주요 원인)을 제공한다.
- **Data**: BurnoutLog
- **API**: 없음
- **Requirements**:
  - AC-1 [E][P0]: Scenario: 소진도 기록 저장
    Given 입력 `{ season: "2026-추석", score: 8, causes: ["과도한 질문"], note: "힘들었음" }`
    When "기록 저장" 탭
    Then `id`/`createdAt`/`updatedAt`이 채워져 `holidaytruce:burnout`에 저장되고 성공 Toast "기록되었어요" 표시
  - AC-2 [U][P0]: The system shall 저장된 로그의 평균 소진도를 SummaryHero(소수점 1자리)로 표시하고, `season`→`createdAt` 순으로 정렬한 추이를 Sparkline으로 렌더한다.
  - AC-3 [U][P1]: The system shall 원인 태그(`causes`) 빈도 상위 3개를 "주요 원인" Card에 TDS Chip으로 표시한다.
  - AC-4 [W][P1]: Scenario: 범위 밖 점수 거부
    Given 입력 `score = 0` 또는 `score = 11`
    When "기록 저장" 탭
    Then 에러 메시지 "소진도는 1~10으로 선택해주세요" 표시, 저장 안 됨
  - AC-5 [S][P1]: While `holidaytruce:burnout`가 빈 배열일 때, the system shall Asset.ContentIcon과 "첫 명절 기록을 남겨보세요" 빈 상태를 표시하고 Sparkline을 숨긴다.
  - AC-6 [E][P1]: Scenario: 기록 없이 리포트 진입
    Given 로그가 1개일 때
    When 리포트 렌더
    Then Sparkline 대신 단일 값 카드로 대체 표시되고 크래시하지 않음

### F6. 시즌 프리미엄 언락 & 광고
- **Description**: 무료 사용자는 배너 광고와 보상형 광고 게이트를 통해 기능을 이용하고, 시즌 원타임 결제로 프리미엄(광고 제거·무제한 스크립트)을 언락한다. 결제는 템플릿 `<TossPurchase>`로 처리한다.
- **Data**: AppMeta(premiumUnlocked, premiumSeason)
- **API**: 없음 (결제는 SDK IAP 위임)
- **Requirements**:
  - AC-1 [E][P0]: Scenario: 시즌 프리미엄 결제 성공
    Given 무료 사용자가 프리미엄 화면에서 결제
    When `<TossPurchase>` `onPurchased` 콜백 수신
    Then `processProductGrant` 실행으로 `premiumUnlocked=true`, `premiumSeason="2026-추석"`(카탈로그 값), `updatedAt=now` 저장, Toast "프리미엄이 활성화되었어요" 표시
  - AC-2 [S][P0]: While `premiumUnlocked === true`, the system shall 모든 `<AdSlot>` 배너와 `<TossRewardAd>` 게이트를 숨기고 결과를 즉시 노출한다.
  - AC-3 [S][P1]: While `premiumUnlocked === false`, the system shall 스크립트 결과 화면 하단(콘텐츠와 겹치지 않는 위치)에 `<AdSlot>` 배너를 표시한다.
  - AC-4 [W][P1]: Scenario: 결제 취소 처리
    Given 사용자가 결제 시트를 취소
    When 결제 미완료로 종료
    Then 상태 변경 없이 프리미엄 화면 잔류, 에러 Toast 미표시
  - AC-5 [W][P1]: Scenario: 보상형 광고 미완료
    Given 무료 사용자가 `TossRewardAd`를 중도 종료
    When 광고 완료 콜백 미수신
    Then 결과는 노출되지 않고 "광고를 끝까지 시청해야 결과를 볼 수 있어요" Toast 표시
  - AC-6 [W][P0]: The system shall `grantPromotionReward` 사용 시 `amount ≤ 5000`을 검증하며, 초과 시 호출을 차단한다. (프로모션 캠페인 사용 시 한정)

---

## Screen Definitions

### S0. 홈/대시보드 — `/`
- **TDS**: `ScreenScaffold`, `Top`(타이틀 "명절휴전"), `ListRow`(4개 기능 진입), `Card`(요약: 다음 방문 균형/총 예산/평균 소진도), `Badge`, `AlertDialog`(AI 첫 고지), `FloatingTabBar`.
- **States**: Loading(메타 로드 스켈레톤) / Empty(각 요약 카드 "기록 없음") / Error(메타 파싱 실패 시 기본값).
- **Touch**: 각 `ListRow` 진입 높이 ≥ 44px.
- **Navigation**:
  - Outgoing: `navigate('/script')`, `navigate('/calendar')`, `navigate('/budget')`, `navigate('/report')`, `navigate('/premium')`.
  - Incoming: `location.state = undefined`.
- **Layout contract**: 요약 3종은 각각 `Card`로 분리. `data-testid="home-summary"` 컨테이너에 Card 3개 포함. AI 고지 미확인 시 AlertDialog 1회.

### S1. 스크립트 입력 — `/script`
- **TDS**: `ScreenScaffold`, `Top`, `Tab`(관계 시댁/처가), `Chip`(톤 정중/단호/유머), `TextField`(상황, multiline, 200자), `Button`(display="block" 하단, "스크립트 생성"), `Toast`.
- **States**: Loading(생성 중 버튼 disabled + 인디케이터) / Empty(이력 없음 안내) / Error(API 실패 Toast).
- **Touch**: Chip/Tab/Button 모두 ≥ 44px. `TextField`는 `inputMode="text"`, 키보드 노출 시 하단 버튼 스크롤 보정.
- **Navigation**:
  - Outgoing: 생성 성공 → `navigate('/script/result', { state: { resultId: string } })`.
  - Incoming: `location.state = undefined`.
- **Layout contract**: 하단 고정 `SubmitFooter`(display="block" 버튼). 이력 리스트는 `data-testid="script-history"`, `createdAt` 내림차순.

### S2. 스크립트 결과 — `/script/result`
- **TDS**: `ScreenScaffold`, `TossRewardAd`(무료 시 게이트), `Card`(문장 3개), `Badge`("AI가 생성한 결과입니다"), `Button`(복사/새로 만들기), `AdSlot`(무료 시 하단 배너), `Toast`.
- **States**: Loading(광고 로드) / Empty(잘못된 resultId → 홈 이동) / Error(광고 미완료 Toast).
- **Touch**: 복사 버튼 ≥ 44px.
- **Navigation**:
  - Incoming: `location.state = { resultId: string }`. `resultId`로 `holidaytruce:scripts`에서 조회, 미존재 시 `navigate('/', { replace: true })`.
  - Outgoing: "새로 만들기" → `navigate('/script')`.
- **Layout contract**: `data-testid="script-result-card"` Card 3개 + 상단 AI Badge 필수. 프리미엄이면 RewardAd/AdSlot 미렌더.

### S3. 방문 균형 캘린더 — `/calendar`
- **TDS**: `ScreenScaffold`, `Top`, `Tab`(시댁/처가), `TextField`(date/hours/memo), `Button`("추가"), `Card`+`MiniBar`(균형 지표), `Badge`(불균형 경고), `ListRow`(일정 목록), `AlertDialog`(삭제 확인), `Toast`.
- **States**: Loading / Empty("첫 방문 일정") / Error(저장 실패 Toast).
- **Touch**: 목록 항목·삭제 액션 ≥ 44px. `hours`는 `inputMode="decimal"`.
- **Navigation**: Outgoing/Incoming 모두 `location.state = undefined`(자체 완결 화면).
- **Layout contract**: 균형 지표는 `data-testid="balance-card"` Card + MiniBar(시댁:처가 비율). 목록 `date` 오름차순. 30개 초과 시 가상 스크롤.

### S4. 예산 계산기 — `/budget`
- **TDS**: `ScreenScaffold`, `Top`, `Tab`(시댁/처가), `TextField`(label/amount), `Switch`(준비 완료), `Button`("추가"), `SummaryHero`(총 예산 CountUp), `MiniBar`(비중), `ListRow`, `Toast`.
- **States**: Loading / Empty("예산 항목 추가") / Error(저장 실패 Toast).
- **Touch**: Switch/항목 ≥ 44px. `amount`는 `inputMode="numeric"`, 하단 버튼 키보드 보정.
- **Navigation**: `location.state = undefined`.
- **Layout contract**: `data-testid="budget-hero"` SummaryHero(총 예산) + `data-testid="budget-ratio"` MiniBar.

### S5. 감정소진 리포트 — `/report`
- **TDS**: `ScreenScaffold`, `Top`, `Slider`/`Chip`(소진도 1~10), `Chip`(원인 태그 다중선택 — CAUSES 카탈로그 8개), `TextField`(메모 300자), `Button`("기록 저장"), `SummaryHero`(평균 소진도), `Sparkline`(추이), `Card`(주요 원인), `Toast`.
- **States**: Loading / Empty("첫 명절 기록") / Error(범위 밖 점수 인라인 에러).
- **Touch**: Chip/Slider ≥ 44px.
- **Navigation**: `location.state = undefined`.
- **Layout contract**: `data-testid="report-hero"` SummaryHero(평균 소진도) + 로그 ≥2개일 때 `data-testid="report-trend"` Sparkline. 1개면 단일 값 카드로 대체.

### S6. 프리미엄 — `/premium`
- **TDS**: `ScreenScaffold`, `Top`, `Card`(혜택: 광고 제거·무제한 스크립트), `TossPurchase`(결제 버튼), `Badge`(활성 상태), `Toast`.
- **States**: Loading / Empty(N/A) / Error(결제 취소 시 무동작).
- **Touch**: 결제 버튼 ≥ 44px.
- **Navigation**: Outgoing: 결제 성공 후 `navigate(-1)`. Incoming: `location.state = undefined`.
- **Layout contract**: `data-testid="premium-benefit-card"` Card. `premiumUnlocked===true`면 "활성화됨" Badge, 결제 버튼 숨김.

---

## API Contract (외부 AI 서버 — 별도 Railway 배포)

### POST /api/scripts
- **Request**:
```ts
interface ScriptApiRequest {
  relation: "시댁" | "처가";
  situation: string;   // 1~200자
  tone: "정중" | "단호" | "유머";
}
```
- **Response 200**:
```ts
interface ScriptApiResponse {
  scripts: string[];   // 정확히 3개, 각 1~120자
}
```
- **Error Response** (400/429/500) — 통일 형태:
```ts
interface ApiError {
  error: string;       // "invalid_situation" | "rate_limited" | "internal_error"
}
```
- **Error codes**:
  - `400 { error: "invalid_situation" }` — situation 빈 값/200자 초과
  - `429 { error: "rate_limited" }` — 분당 호출 한도 초과
  - `500 { error: "internal_error" }` — 생성 실패
- **제약**: CORS 허용 오리진에 앱인토스 도메인 포함. 응답 `scripts.length !== 3`이면 클라이언트는 F2 AC-5/AC-9 에러 플로우로 처리. 타임아웃 10초. **서버는 상태를 저장하지 않는 무상태 LLM 프록시** — 사용자 데이터/식별자를 저장하지 않으므로 서버 측 스키마 없음.

---

## Assumptions
- AI 스크립트 생성은 별도 Railway API 서버(무상태 LLM 프록시)를 통해 이루어지며, API 키/모델은 서버 측에서만 관리(클라이언트 노출 없음). **서버는 DB를 갖지 않는다.**
- **본 앱은 관계형 DB를 사용하지 않는다** — 모든 지속 데이터는 기기별 localStorage JSON 문서다. PK/FK/인덱스/ON DELETE는 적용 대상이 아니며, Data Storage Conventions의 규약으로 무결성을 보장한다.
- 사용자 식별자(userId)는 저장하지 않는다. 토스 세션이 사용자를 인증하고, 데이터는 기기별 localStorage로 자연 분리된다(기기 간 동기화 없음).
- 프리미엄은 시즌 원타임 결제이며, `premiumSeason`으로 시즌 구분. 다음 시즌에는 재결제 유도(구독 아님).
- `VisitPlan`은 `(relation, date)` 중복을 허용한다(하루 오전 시댁·오후 처가 등 복수 방문 시나리오). 유일성 강제 없음.
- 소진 원인 태그 사전은 CAUSES 카탈로그 8개로 고정(Open Question 해소).
- 명절 시즌 키는 SEASONS 카탈로그 고정 매핑 또는 현재 날짜 기준 자동 산정.
- `grantPromotionReward`는 MVP 필수 아님(캠페인 시에만, amount ≤ 5000 검증 전제).

## Open Questions
- AI API 서버의 응답 지연(P95) 목표치와 rate limit 정책(분당 호출 수)은?
- 시즌 프리미엄 가격 및 SKU 구성(설/추석 개별 vs 통합)?
- 기기 교체 시 데이터 이전이 필요한가? (필요 시에만 외부 동기화 API를 별도 설계 — 이때 비로소 서버 스키마·userId FK가 등장. 현재 MVP 범위 밖.)
- 무료 사용자의 스크립트 생성 일일 횟수 제한이 필요한가?

---

## 변경 요약 (검증 리포트 대비)

| 리포트 지적 | 처리 | 근거 |
|---|---|---|
| id/createdAt/updatedAt 누락 | **적용** — 컬렉션 엔티티 4종에 3필드 통일, 싱글턴 2종은 `createdAt`/`updatedAt` 추가(`id`는 의도적 생략) | 클라이언트 레코드 봉투로 유용 |
| User/Season/Relation/Cause 테이블 & FK | **미적용(거부)** → 대신 **고정 상수 카탈로그 + 런타임 검증** | 서버·DB 없음, 토스 세션 자동 인증, 데이터 기기별 분리라는 플랫폼 제약 |
| 인덱스 부재 | **정렬·조회 규약으로 대체** | localStorage에 인덱스 개념 없음, 컬렉션 ≤200으로 in-memory 처리 |
| UNIQUE 제약 | **유효성 유일성 규칙으로 대체** | 저장 로직 검증 |
| ON DELETE / 정규화 | **미적용(거부)** — 임베드 값 객체 유지 | 고아 레코드 불가능, JSON 문서 모델 표준 |

핵심: **관계형 DB로의 전환은 플랫폼 규칙 위반**이라 채택하지 않았고, 그 목표(무결성·일관성·조회성)는 localStorage에 맞는 방식으로 모두 충족했습니다.