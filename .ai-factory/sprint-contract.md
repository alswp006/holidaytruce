# Sprint Contract: 라우팅 배선 + FloatingTabBar + Provider

## 목표
App.tsx에서 React Router 라우트 6개 (/), /script, /schedule, /budget, /stress, /paywall) 연결 및 HolidayContext Provider + SDK 전역 Provider 배선. FloatingTabBar 5탭(홈/일정/예산/스크립트/기록) 배치. quota AlertDialog를 Provider 레벨에서 렌더.

## 구현 항목

| 파일 | 변경 사항 |
|------|---------|
| **src/App.tsx** | 라우트 6개 추가: `/script`, `/schedule`, `/budget`, `/stress`, `/paywall`. HolidayContext/SDK Providers 래핑. 각 페이지에 state/redirect 검증 로직 내장. |
| **src/contexts/HolidayContext.ts** | `HolidayContextType` (quota, scripts, schedule 등) 정의 및 Provider 생성. |
| **src/pages/{Script,Schedule,Budget,Stress,Paywall}.tsx** | 각 페이지 신규 작성. state 없이 진입 시 `/` 복귀 또는 기본값 렌더. ScreenScaffold + FloatingTabBar 래핑. |
| **src/components/FloatingTabBar.tsx** | 기존 파일 확인. 5탭 설정 활성화 (labels: 홈/일정/예산/스크립트/기록, paths: /, /schedule, /budget, /script, 기록 경로). |
| **src/lib/types.ts** | `HolidayContextType` import 또는 `export interface HolidayContextType { quota, scripts... }`. |

## TypeScript 타입 (types.ts에서 정의)
```typescript
export interface HolidayContextType {
  quota: number;
  scripts: Script[];
  schedule: ScheduleItem[];
  // ...
}
export interface Script { id: string; title: string; ... }
export interface ScheduleItem { id: string; date: string; ... }
```

## 검증 방법
1. `pnpm typecheck` — 라우트 타입 오류 없음
2. 브라우저에서 각 라우트(/, /script, /schedule, /budget, /stress, /paywall) 진입 — 페이지 렌더, 하단 탭 활성표시 정확함
3. state 없이 /budget 진입 → `/` 복귀 또는 기본 화면 렌더 (로직별 선택)
4. quota AlertDialog 노출 확인

## 절대 금지
- ❌ main.tsx 수정 (Provider 추가는 App.tsx에서만)
- ❌ BrowserRouter 변경
- ❌ FloatingTabBar에 state prop 없이 작동 불확실한 custom nav
