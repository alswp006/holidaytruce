import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { HOLIDAYS } from "@/lib/constants";

/**
 * 홈 대시보드 페이지 / — packet 0007
 *
 * 구현 파일: src/pages/Home.tsx
 *
 * D-day 계산: currentHolidayId의 날짜("YYYY-MM-DD", UTC 자정 기준)와 오늘(new Date())의
 * UTC 캘린더 날짜 차이(일)를 SummaryHero에 표시한다. 아래 렌더 테스트는 시스템 시각을
 * 2026-08-07T00:00:00.000Z로 고정하고 추석(2026-09-25) 기준 D-day가 49로 표시되는지 검증한다.
 */

mockTds();
mockAppsInToss();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── HolidayContext 더블 — currentHolidayId/isPaid/setCurrentHoliday를 테스트별로 제어 ──
const holidayState = vi.hoisted(() => ({
  currentHolidayId: "2026-chuseok",
  isPaid: false,
  setCurrentHoliday: vi.fn(),
}));

vi.mock("@/lib/HolidayContext", () => ({
  useHoliday: () => ({
    currentHolidayId: holidayState.currentHolidayId,
    setCurrentHoliday: holidayState.setCurrentHoliday,
    isPaid: holidayState.isPaid,
    setIsPaid: vi.fn(),
    aiNoticeAck: true,
    setAiNoticeAck: vi.fn(),
    reportQuotaExceeded: vi.fn(),
  }),
  HolidayProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── storage 더블 — 대시보드 요약이 읽는 3개 리스트만 제어, 나머지는 실제 구현 유지 ──
const storageState = vi.hoisted(() => ({
  schedules: [] as Array<{ side: string; holidayId: string }>,
  budgets: [] as Array<{ amount: number; holidayId: string }>,
  stressLogs: [] as Array<{ score: number; holidayId: string }>,
}));

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    listSchedules: (holidayId: string) =>
      storageState.schedules.filter((s) => s.holidayId === holidayId),
    listBudgets: (holidayId: string) =>
      storageState.budgets.filter((b) => b.holidayId === holidayId),
    listStressLogs: (holidayId: string) =>
      storageState.stressLogs.filter((s) => s.holidayId === holidayId),
  };
});

import Home from "@/pages/Home";

const CHUSEOK = HOLIDAYS.find((h) => h.id === "2026-chuseok")!;
const SEOLLAL = HOLIDAYS.find((h) => h.id === "2026-seollal")!;

function seedData() {
  storageState.budgets = [
    { side: "본가", holidayId: "2026-chuseok", amount: 200000 } as any,
    { side: "처가", holidayId: "2026-chuseok", amount: 100000 } as any,
  ];
  storageState.schedules = [
    { side: "본가", holidayId: "2026-chuseok" } as any,
    { side: "본가", holidayId: "2026-chuseok" } as any,
    { side: "처가", holidayId: "2026-chuseok" } as any,
  ];
  storageState.stressLogs = [
    { score: 6, holidayId: "2026-chuseok" } as any,
    { score: 8, holidayId: "2026-chuseok" } as any,
  ];
}

function clearData() {
  storageState.budgets = [];
  storageState.schedules = [];
  storageState.stressLogs = [];
}

describe("홈 대시보드 페이지 /", () => {
  beforeEach(() => {
    holidayState.currentHolidayId = "2026-chuseok";
    holidayState.isPaid = false;
    holidayState.setCurrentHoliday.mockClear();
    mockNavigate.mockClear();
    clearData();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T00:00:00.000Z"));
  });

  it("AC-1[P0]: 요약 Card 3종 + D-day SummaryHero + 하단 5탭을 렌더한다", () => {
    seedData();
    renderWithRouter(React.createElement(Home));

    expect(screen.getByText("명절휴전")).toBeInTheDocument();
    expect(screen.getByTestId("home-dday-hero")).toBeInTheDocument();

    const cards = screen.getByTestId("dashboard-cards");
    expect(within(cards).getByTestId("dashboard-card-budget")).toBeInTheDocument();
    expect(within(cards).getByTestId("dashboard-card-balance")).toBeInTheDocument();
    expect(within(cards).getByTestId("dashboard-card-stress")).toBeInTheDocument();

    expect(screen.getAllByRole("tab")).toHaveLength(5);
  });

  it("AC-1[P0]: 요약 Card는 실제 데이터로 계산된 구체적인 값을 표시한다", () => {
    seedData();
    renderWithRouter(React.createElement(Home));

    // D-day: 2026-08-07 기준 추석(2026-09-25)까지 49일
    expect(screen.getByTestId("home-dday-hero")).toHaveTextContent("49");

    // 예산 총합: 본가 200,000 + 처가 100,000 = 300,000원
    expect(screen.getByTestId("dashboard-card-budget")).toHaveTextContent("300,000");

    // 방문 균형: 본가 2건 / 처가 1건
    const balanceCard = screen.getByTestId("dashboard-card-balance");
    expect(balanceCard).toHaveTextContent(/본가.*2/);
    expect(balanceCard).toHaveTextContent(/처가.*1/);

    // 최근 소진도 평균: (6 + 8) / 2 = 7
    expect(screen.getByTestId("dashboard-card-stress")).toHaveTextContent("7");
  });

  it("AC-2: 일정·예산·소진도 기록이 모두 0건이면 온보딩 빈 상태를 안내한다", () => {
    clearData();
    renderWithRouter(React.createElement(Home));

    expect(screen.getByText(/명절 준비를 시작해보세요/)).toBeInTheDocument();
  });

  it("AC-3[P0]: 명절 셀렉터 Chip이 currentHolidayId를 선택 상태로 반영한다", () => {
    seedData();
    renderWithRouter(React.createElement(Home));

    const chuseokChip = screen.getByRole("button", { name: new RegExp(CHUSEOK.label) });
    const seollalChip = screen.getByRole("button", { name: new RegExp(SEOLLAL.label) });

    expect(chuseokChip).toHaveAttribute("aria-pressed", "true");
    expect(seollalChip).toHaveAttribute("aria-pressed", "false");
  });

  it("AC-3[P0]: 다른 명절 Chip을 탭하면 setCurrentHoliday가 해당 holidayId로 호출된다", () => {
    seedData();
    renderWithRouter(React.createElement(Home));

    const seollalChip = screen.getByRole("button", { name: new RegExp(SEOLLAL.label) });
    fireEvent.click(seollalChip);

    expect(holidayState.setCurrentHoliday).toHaveBeenCalledTimes(1);
    expect(holidayState.setCurrentHoliday).toHaveBeenCalledWith("2026-seollal");
  });

  it("AC-4[P0]: 예산/방문균형/소진도 Card 탭 시 각각 /budget,/schedule,/stress로 navigate한다", () => {
    seedData();
    const { unmount } = renderWithRouter(React.createElement(Home));

    fireEvent.click(screen.getByTestId("dashboard-card-budget"));
    expect(mockNavigate).toHaveBeenCalledWith("/budget");

    fireEvent.click(screen.getByTestId("dashboard-card-balance"));
    expect(mockNavigate).toHaveBeenCalledWith("/schedule");

    fireEvent.click(screen.getByTestId("dashboard-card-stress"));
    expect(mockNavigate).toHaveBeenCalledWith("/stress");

    expect(mockNavigate).toHaveBeenCalledTimes(3);
    unmount();
  });

  it("AC-4[P0]: 미결제(isPaid=false) 상태면 시즌권 안내 Card가 보이고 탭 시 /paywall로 navigate한다", () => {
    holidayState.isPaid = false;
    seedData();
    renderWithRouter(React.createElement(Home));

    const paywallCard = screen.getByTestId("dashboard-card-paywall");
    expect(paywallCard).toBeInTheDocument();

    fireEvent.click(paywallCard);
    expect(mockNavigate).toHaveBeenCalledWith("/paywall");
  });

  it("AC-4: 결제 완료(isPaid=true) 상태면 시즌권 안내 Card를 숨긴다", () => {
    holidayState.isPaid = true;
    seedData();
    renderWithRouter(React.createElement(Home));

    expect(screen.queryByTestId("dashboard-card-paywall")).not.toBeInTheDocument();
  });
});
