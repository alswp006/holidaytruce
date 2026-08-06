import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";

/**
 * 감정소진 리포트 페이지 /stress — packet 0011
 *
 * 구현 파일: src/pages/Stress.tsx
 *
 * 화면 계약(테스트가 강제하는 부분만):
 * - ScreenScaffold(top=Top) 골격. 하단 1차 CTA는 SubmitFooter — 접근성 이름에 "기록 저장"
 *   포함(예: label="기록 저장"), 클릭 시 유효하면 addStressLog 호출.
 *
 * [리포트 영역 — 로그 1건 이상]
 * - data-testid="stress-report-card" Card 안에:
 *   - 평균 소진도: data-testid="stress-avg-countup" (SummaryHero value에 CountUp),
 *     textContent가 소수1자리 숫자 문자열을 포함 (예: "7.0").
 *   - score 추이: data-testid="stress-sparkline" (Sparkline, createdAt 오름차순 score 배열).
 *   - 트리거 빈도: data-testid="stress-trigger-bar" (MiniBar, 최다 빈도 트리거의 상대 빈도).
 *   - 상위 3개 트리거 Chip: data-testid="stress-top-trigger-chip" 여러 개(getAllByTestId),
 *     빈도 내림차순 — 정확히 3개, 가장 빈도 높은 트리거가 배열의 첫 번째.
 *
 * [빈 상태 — 로그 0건]
 * - data-testid="stress-report-card"는 렌더되지 않는다(리포트 미표시).
 * - data-testid="stress-empty-state" EmptyState: 아이콘 role="img"(name에 "소진"|"감정" 포함) +
 *   정확한 문구 "명절 후 감정을 기록해보세요".
 *
 * [기록 폼]
 * - score 입력: 숫자 TextField data-testid="stress-score-input"(inputMode="numeric", placeholder
 *   필수 — 예: "1~10 사이 점수"). Budget 페이지의 amount TextField와 동일하게 자유 입력이라
 *   범위 밖 값(11 등)도 입력 가능해야 하며, 빈 문자열이면 "미선택"으로 취급한다.
 * - trigger 다중 선택: ChipItem, data-testid={`stress-trigger-option-${trigger}`} — 옵션 목록:
 *   "잔소리" | "비교" | "경제적 부담" | "장거리 이동" | "차례 준비" | "술자리" (토글 다중 선택).
 * - memo: TextField data-testid="stress-memo-input" (placeholder 필수).
 * - 제출(SubmitFooter, 접근성 이름에 "기록 저장" 포함):
 *   - 유효 제출 시(score 1~10 정수) addStressLog({ score, triggers, memo, holidayId }) 호출 +
 *     성공 토스트(role="status") textContent에 "기록되었어요" 포함. score는 Number(...)로 변환된 정수.
 *   - score 입력칸이 빈 채로 제출 시 정확한 문구 "소진도 점수를 선택해주세요" 노출,
 *     addStressLog 미호출.
 *   - score 11(1~10 범위 밖) 제출 시 정확한 문구 "소진도는 1~10 사이로 선택해주세요" 노출,
 *     addStressLog 미호출.
 */

mockTds();
mockAppsInToss();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── HolidayContext 더블 ──
vi.mock("@/lib/HolidayContext", () => ({
  useHoliday: () => ({
    currentHolidayId: "2026-chuseok",
    setCurrentHoliday: vi.fn(),
    isPaid: true,
    setIsPaid: vi.fn(),
    aiNoticeAck: true,
    setAiNoticeAck: vi.fn(),
    reportQuotaExceeded: vi.fn(),
  }),
  HolidayProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── storage 더블 ──
type StressLogFixture = {
  id: string;
  holidayId: string;
  score: number;
  triggers: string[];
  memo: string;
  createdAt: number;
};

const storageState = vi.hoisted(() => ({
  stressLogs: [] as any[],
}));

const listStressLogsMock = vi.hoisted(() =>
  vi.fn((holidayId: string) => storageState.stressLogs.filter((s: any) => s.holidayId === holidayId)),
);
const addStressLogMock = vi.hoisted(() =>
  vi.fn((input: any) => ({ ...input, id: "new-stress-1", createdAt: 0 })),
);

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    listStressLogs: listStressLogsMock,
    addStressLog: addStressLogMock,
  };
});

import Stress from "@/pages/Stress";

function seedStressLogs(items: Partial<StressLogFixture>[]) {
  storageState.stressLogs = items.map((item, i) => ({
    id: `s${i + 1}`,
    holidayId: "2026-chuseok",
    score: 5,
    triggers: [],
    memo: "",
    createdAt: i,
    ...item,
  }));
}

function enterScore(value: string) {
  fireEvent.change(screen.getByTestId("stress-score-input"), { target: { value } });
}

function selectTriggers(triggers: string[]) {
  for (const t of triggers) {
    fireEvent.click(screen.getByTestId(`stress-trigger-option-${t}`));
  }
}

function fillMemo(memo: string) {
  fireEvent.change(screen.getByTestId("stress-memo-input"), { target: { value: memo } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: /기록 저장/ }));
}

describe("감정소진 리포트 페이지 /stress", () => {
  beforeEach(() => {
    storageState.stressLogs = [];
    listStressLogsMock.mockClear();
    addStressLogMock.mockClear();
    mockNavigate.mockClear();
  });

  it("AC-1[P0]: 유효 제출 시 addStressLog가 정확한 값으로 호출되고 성공 토스트가 뜬다", () => {
    renderWithRouter(React.createElement(Stress));

    enterScore("8");
    selectTriggers(["잔소리", "비교"]);
    fillMemo("차례 준비 과로");
    submit();

    expect(addStressLogMock).toHaveBeenCalledTimes(1);
    expect(addStressLogMock).toHaveBeenCalledWith({
      score: 8,
      triggers: ["잔소리", "비교"],
      memo: "차례 준비 과로",
      holidayId: "2026-chuseok",
    });

    const statuses = screen.getAllByRole("status");
    expect(statuses.map((el) => el.textContent).join(" ")).toMatch(/기록되었어요/);
  });

  it("AC-1[P0]: 제출 후 새 기록이 반영되어 리포트가 갱신된다", () => {
    seedStressLogs([{ id: "s1", score: 6, triggers: ["잔소리"], createdAt: 0 }]);
    renderWithRouter(React.createElement(Stress));

    expect(screen.getByTestId("stress-avg-countup").textContent).toMatch(/6\.0/);

    enterScore("10");
    selectTriggers(["비교"]);
    fillMemo("장거리 이동 피곤");
    submit();

    expect(addStressLogMock).toHaveBeenCalledTimes(1);
    expect(addStressLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ score: 10, triggers: ["비교"] }),
    );
  });

  it("AC-2[P0]: 평균 소진도가 소수1자리로 표시되고 Sparkline·MiniBar가 렌더된다", () => {
    seedStressLogs([
      { id: "s1", score: 8, triggers: ["잔소리", "비교"], createdAt: 0 },
      { id: "s2", score: 7, triggers: ["잔소리", "비교"], createdAt: 1 },
      { id: "s3", score: 9, triggers: ["잔소리", "비교"], createdAt: 2 },
      { id: "s4", score: 6, triggers: ["잔소리", "경제적 부담"], createdAt: 3 },
      { id: "s5", score: 5, triggers: ["경제적 부담", "장거리 이동"], createdAt: 4 },
      { id: "s6", score: 7, triggers: ["술자리"], createdAt: 5 },
    ]);
    renderWithRouter(React.createElement(Stress));

    const reportCard = screen.getByTestId("stress-report-card");
    expect(reportCard).toBeInTheDocument();
    expect(screen.getByTestId("stress-avg-countup").textContent).toMatch(/7\.0/);
    expect(screen.getByTestId("stress-sparkline")).toBeInTheDocument();
    expect(screen.getByTestId("stress-trigger-bar")).toBeInTheDocument();
  });

  it("AC-2[P0]: 트리거 상위 3개가 빈도 내림차순 Chip으로 표시된다", () => {
    seedStressLogs([
      { id: "s1", score: 8, triggers: ["잔소리", "비교"], createdAt: 0 },
      { id: "s2", score: 8, triggers: ["잔소리", "비교"], createdAt: 1 },
      { id: "s3", score: 8, triggers: ["잔소리", "비교"], createdAt: 2 },
      { id: "s4", score: 8, triggers: ["잔소리", "경제적 부담"], createdAt: 3 },
      { id: "s5", score: 8, triggers: ["경제적 부담", "장거리 이동"], createdAt: 4 },
      { id: "s6", score: 8, triggers: ["술자리"], createdAt: 5 },
    ]);
    renderWithRouter(React.createElement(Stress));

    const topChips = screen.getAllByTestId("stress-top-trigger-chip");
    expect(topChips).toHaveLength(3);
    expect(topChips[0].textContent).toMatch(/잔소리/);

    const joined = topChips.map((el) => el.textContent).join(" ");
    expect(joined).toMatch(/비교/);
    expect(joined).toMatch(/경제적 부담/);
    expect(joined).not.toMatch(/장거리 이동/);
  });

  it("AC-3[P0]: score 입력칸이 빈 채로 제출하면 정확한 에러 문구가 뜨고 addStressLog가 호출되지 않는다", () => {
    renderWithRouter(React.createElement(Stress));

    selectTriggers(["잔소리"]);
    fillMemo("이번엔 좀 힘들었다");
    submit();

    expect(screen.getByText("소진도 점수를 선택해주세요")).toBeInTheDocument();
    expect(addStressLogMock).not.toHaveBeenCalled();
  });

  it("AC-3[P0]: score 11을 입력해 제출하면 범위 에러 문구가 뜨고 addStressLog가 호출되지 않는다", () => {
    renderWithRouter(React.createElement(Stress));

    enterScore("11");
    selectTriggers(["잔소리"]);
    fillMemo("이번엔 좀 힘들었다");
    submit();

    expect(screen.getByText("소진도는 1~10 사이로 선택해주세요")).toBeInTheDocument();
    expect(addStressLogMock).not.toHaveBeenCalled();
  });

  it("AC-4[P1]: 기록이 0건이면 빈 상태 안내를 보여주고 리포트는 렌더되지 않는다", () => {
    renderWithRouter(React.createElement(Stress));

    expect(screen.queryByTestId("stress-report-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("stress-empty-state")).toBeInTheDocument();
    expect(screen.getByText("명절 후 감정을 기록해보세요")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /소진|감정/ })).toBeInTheDocument();
  });
});
