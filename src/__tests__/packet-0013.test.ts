import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { FloatingTabBar } from "@/components/FloatingTabBar";

mockTds();
mockAppsInToss();

// 하단 탭 5개 — spec: 홈(/) / 일정(/schedule) / 예산(/budget) / 스크립트(/script) / 기록(/stress)
const TAB_ITEMS = [
  { label: "홈", path: "/" },
  { label: "일정", path: "/schedule" },
  { label: "예산", path: "/budget" },
  { label: "스크립트", path: "/script" },
  { label: "기록", path: "/stress" },
];

// HolidayContext는 Provider 레벨에서 quota AlertDialog를 렌더한다(task.md 4.1).
// 실제 구현(패킷 0003)의 내부 로직은 이 패킷의 책임이 아니므로, App.tsx가 Provider를
// 라우트 트리 전체를 감싸는 형태로 실제로 사용하는지만 검증할 수 있게 제어 가능한 더블로 대체한다.
const holidayMock = vi.hoisted(() => ({ quotaExceeded: false }));

function makeHolidayContextMock() {
  return {
    HolidayProvider: ({ children }: any) =>
      React.createElement(
        "div",
        { "data-testid": "holiday-provider" },
        children,
        holidayMock.quotaExceeded
          ? React.createElement(
              "div",
              { role: "alertdialog", "aria-label": "저장 공간 부족" },
              "저장 공간이 부족합니다. 이전 명절 기록을 삭제해주세요",
            )
          : null,
      ),
    useHoliday: () => ({
      currentHolidayId: "2026-chuseok",
      setCurrentHoliday: vi.fn(),
      isPaid: false,
      aiNoticeAck: false,
      setAiNoticeAck: vi.fn(),
    }),
  };
}

vi.mock("@/lib/HolidayContext", makeHolidayContextMock);
vi.mock("@/contexts/HolidayContext", makeHolidayContextMock);

function makePageMock(testId: string, label: string, withTabBar = true) {
  return {
    default: () =>
      React.createElement(
        "div",
        { "data-testid": testId },
        label,
        withTabBar ? React.createElement(FloatingTabBar, { items: TAB_ITEMS }) : null,
      ),
  };
}

vi.mock("@/pages/Home", () => makePageMock("page-home", "Home"));
vi.mock("@/pages/Script", () => makePageMock("page-script", "Script"));
vi.mock("@/pages/Schedule", () => makePageMock("page-schedule", "Schedule"));
vi.mock("@/pages/Budget", () => makePageMock("page-budget", "Budget"));
vi.mock("@/pages/Stress", () => makePageMock("page-stress", "Stress"));
vi.mock("@/pages/Paywall", () => makePageMock("page-paywall", "Paywall"));

import App from "@/App";

describe("라우팅 배선 + FloatingTabBar + Provider", () => {
  beforeEach(() => {
    holidayMock.quotaExceeded = false;
  });

  it("AC-1[P0]: 6개 라우트(/,/script,/schedule,/budget,/stress,/paywall)가 각각 대응 페이지를 렌더한다", () => {
    const routes: Array<[string, string]> = [
      ["/", "page-home"],
      ["/script", "page-script"],
      ["/schedule", "page-schedule"],
      ["/budget", "page-budget"],
      ["/stress", "page-stress"],
      ["/paywall", "page-paywall"],
    ];

    for (const [path, testId] of routes) {
      const { unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [path],
      });
      expect(screen.getByTestId(testId)).toBeInTheDocument();
      expect(screen.getAllByRole("tab")).toHaveLength(5);
      unmount();
    }
  });

  it("AC-1[P0]: FloatingTabBar 탭을 누르면 해당 라우트로 이동해 페이지가 전환된다", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
    expect(screen.getByTestId("page-home")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "홈" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "예산" }));

    expect(screen.getByTestId("page-budget")).toBeInTheDocument();
    expect(screen.queryByTestId("page-home")).not.toBeInTheDocument();
  });

  it("AC-2: HolidayContext Provider가 라우트 트리 전체를 감싼다", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/schedule"] });

    const provider = screen.getByTestId("holiday-provider");
    expect(provider).toBeInTheDocument();
    expect(provider).toContainElement(screen.getByTestId("page-schedule"));
  });

  it("AC-3: quota 초과 상태에서 AlertDialog가 표시되고 나머지 화면은 크래시 없이 유지된다", () => {
    holidayMock.quotaExceeded = true;

    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    expect(screen.getByRole("alertdialog", { name: "저장 공간 부족" })).toBeInTheDocument();
    expect(screen.getByText(/저장 공간이 부족합니다/)).toBeInTheDocument();
    expect(screen.getByTestId("page-home")).toBeInTheDocument();
  });

  it("AC-4: location.state 없이 /budget에 직접 진입해도 크래시 없이 기본 렌더된다", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/budget"] });

    expect(screen.getByTestId("page-budget")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "예산" })).toHaveAttribute("aria-selected", "true");
  });

  it("AC-4: location.state 없이 /paywall에 직접 진입해도 크래시 없이 기본 렌더된다", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/paywall"] });

    expect(screen.getByTestId("page-paywall")).toBeInTheDocument();
    expect(screen.getByText("Paywall")).toBeInTheDocument();
  });
});
