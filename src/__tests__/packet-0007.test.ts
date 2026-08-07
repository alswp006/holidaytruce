import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { IAP } from "@apps-in-toss/web-framework";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { AppFlags, Visit, BudgetItem, ChecklistItem } from "@/lib/types";

/**
 * Packet 0007: 홈 대시보드 `/`
 *
 * AC-1[P0]: dday-hero SummaryHero + balance-bar MiniBar + 요약 Card >=3 표시
 * AC-2[P0]: 각 Card 탭 시 /calendar, /budget, /script, /report 이동
 * AC-3[P0]: TossPurchase onPurchased 시 ht_flags.purchasedHolidays에 activeHolidayId 추가
 *           + 토스트 "프리미엄이 활성화됐어요", 프리미엄이면 AdSlot 배너 숨김
 * AC-4[P1]: 결제 실패/취소 시 토스트 "결제가 완료되지 않았어요", purchasedHolidays 불변
 * AC-5[P1]: 데이터 전부 빈 경우 각 Card "아직 데이터가 없어요", 파싱 실패해도 console.error 0
 *
 * Field contract expected from the implementation (HomePage.tsx):
 * - data-testid="dday-hero"      : SummaryHero, 활성 명절까지 D-day 숫자 텍스트 포함
 * - data-testid="balance-bar"    : MiniBar, aria-valuenow = calcBalance(visits).minePct
 * - data-testid="summary-card"   : 요약 Card (일정균형/예산/체크리스트) — 최소 3개
 * - data-testid="nav-calendar"   : 클릭 시 navigate("/calendar")
 * - data-testid="nav-budget"     : 클릭 시 navigate("/budget")
 * - data-testid="nav-script"     : 클릭 시 navigate("/script")
 * - data-testid="nav-report"     : 클릭 시 navigate("/report")
 * - <TossPurchase> 버튼 접근성 이름: "이번 명절 프리미엄"
 *   processProductGrant는 항상 true를 반환(백엔드 없음)하고 onPurchased에서 ht_flags 갱신
 * - AdSlot: 비프리미엄일 때만 DOM에 [data-ad-group-id] 노드가 존재
 */

mockAll();

const HOLIDAY_ID = "2026-chuseok"; // date: 2026-09-25

function seedFlags(overrides: Partial<AppFlags> = {}) {
  const flags: AppFlags = {
    aiNoticeAcknowledged: true,
    activeHolidayId: HOLIDAY_ID,
    purchasedHolidays: [],
    ...overrides,
  };
  localStorage.setItem("ht_flags", JSON.stringify(flags));
  return flags;
}

function seedVisits(visits: Visit[]) {
  localStorage.setItem("ht_visits", JSON.stringify(visits));
}

function seedBudget(items: BudgetItem[]) {
  localStorage.setItem("ht_budget", JSON.stringify(items));
}

function seedChecklist(items: ChecklistItem[]) {
  localStorage.setItem("ht_checklist", JSON.stringify(items));
}

function seedDashboardData() {
  seedFlags();
  seedVisits([
    { id: "v1", family: "mine", date: "2026-09-24", startHour: 9, durationHours: 10, holidayId: HOLIDAY_ID, memo: "본가" },
    { id: "v2", family: "partner", date: "2026-09-25", startHour: 9, durationHours: 10, holidayId: HOLIDAY_ID, memo: "시댁" },
  ]);
  seedBudget([
    { id: "b1", holidayId: HOLIDAY_ID, target: "본가", category: "용돈", label: "부모님", amount: 300000 },
    { id: "b2", holidayId: HOLIDAY_ID, target: "시댁", category: "선물", label: "선물", amount: 200000 },
  ]);
  seedChecklist([
    { id: "c1", holidayId: HOLIDAY_ID, text: "선물 준비", done: true },
    { id: "c2", holidayId: HOLIDAY_ID, text: "기차표 예매", done: true },
    { id: "c3", holidayId: HOLIDAY_ID, text: "용돈 봉투", done: true },
    { id: "c4", holidayId: HOLIDAY_ID, text: "일정 공유", done: false },
  ]);
}

// NOTE: HomePage.tsx does not exist yet (TDD red phase). Use require() instead of a
// static `import` so `tsc --noEmit` doesn't fail module resolution before the Coder
// creates the file — dynamic require() bypasses TS's static import-resolution check.
function renderHomePage() {
  const HomePage = require("@/pages/HomePage").default;
  return renderWithRouter(React.createElement(HomePage));
}

describe("홈 대시보드 `/`", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 7, 8, 12, 0, 0)); // 2026-08-08, D-day(추석) = 48
  });

  it("AC-1[P0]: 활성 명절 데이터가 있을 때 dday-hero + balance-bar + 요약 Card 3개 이상 표시", () => {
    seedDashboardData();

    renderHomePage();

    const hero = screen.getByTestId("dday-hero");
    expect(hero).toBeInTheDocument();
    expect(hero.textContent).toContain("48");

    const balanceBar = screen.getByTestId("balance-bar");
    expect(balanceBar).toHaveAttribute("aria-valuenow", "50");

    expect(screen.getAllByTestId("summary-card").length).toBeGreaterThanOrEqual(3);
  });

  it("AC-1[P0]: 예산 총액과 체크리스트 진행률이 집계된 값 그대로 표시된다", () => {
    seedDashboardData();

    renderHomePage();

    // calcBudget total = 500,000 (300,000 + 200,000)
    expect(screen.getByText(/500,000/)).toBeInTheDocument();
    // calcChecklistProgress = 3/4 = 75%
    expect(screen.getByText(/75%/)).toBeInTheDocument();
  });

  it("AC-2[P0]: 일정/예산 Card 탭 시 각각 /calendar, /budget으로 이동한다", () => {
    seedDashboardData();

    renderHomePage();

    fireEvent.click(screen.getByTestId("nav-calendar"));
    expect(mockNavigate).toHaveBeenCalledWith("/calendar");

    fireEvent.click(screen.getByTestId("nav-budget"));
    expect(mockNavigate).toHaveBeenCalledWith("/budget");

    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  it("AC-2[P0]: 스크립트/리포트 Card 탭 시 각각 /script, /report로 이동한다", () => {
    seedDashboardData();

    renderHomePage();

    fireEvent.click(screen.getByTestId("nav-script"));
    expect(mockNavigate).toHaveBeenCalledWith("/script");

    fireEvent.click(screen.getByTestId("nav-report"));
    expect(mockNavigate).toHaveBeenCalledWith("/report");

    expect(mockNavigate).toHaveBeenCalledTimes(2);
  });

  it("AC-3[P0]: TossPurchase 결제 성공 시 ht_flags.purchasedHolidays에 activeHolidayId 추가 + 토스트 표시", async () => {
    seedDashboardData();

    renderHomePage();

    fireEvent.click(screen.getByRole("button", { name: "이번 명절 프리미엄" }));

    await waitFor(() => expect(screen.getByText("프리미엄이 활성화됐어요")).toBeInTheDocument());

    const savedFlags = JSON.parse(localStorage.getItem("ht_flags") ?? "{}") as AppFlags;
    expect(savedFlags.purchasedHolidays).toContain(HOLIDAY_ID);
    expect(savedFlags.activeHolidayId).toBe(HOLIDAY_ID);
  });

  it("AC-3[P0]: 프리미엄(purchasedHolidays 포함)이면 AdSlot 배너를 숨긴다", () => {
    seedFlags({ purchasedHolidays: [] });
    seedVisits([]);
    seedBudget([]);
    seedChecklist([]);
    const { unmount } = renderHomePage();
    expect(document.querySelector("[data-ad-group-id]")).not.toBeNull();
    unmount();

    seedFlags({ purchasedHolidays: [HOLIDAY_ID] });
    renderHomePage();
    expect(document.querySelector("[data-ad-group-id]")).toBeNull();
  });

  it("AC-4[P1]: 결제 실패/취소 시 토스트 '결제가 완료되지 않았어요' 표시, purchasedHolidays 불변", async () => {
    seedDashboardData();
    (IAP.createOneTimePurchaseOrder as any).mockImplementationOnce((opts: any) => {
      opts.onError?.(new Error("USER_CANCELED"));
      return () => {};
    });

    renderHomePage();

    fireEvent.click(screen.getByRole("button", { name: "이번 명절 프리미엄" }));

    await waitFor(() => expect(screen.getByText("결제가 완료되지 않았어요")).toBeInTheDocument());

    const savedFlags = JSON.parse(localStorage.getItem("ht_flags") ?? "{}") as AppFlags;
    expect(savedFlags.purchasedHolidays).toEqual([]);
  });

  it("AC-5[P1]: 데이터 전부 빈 경우 '아직 데이터가 없어요' 표시, 파싱 실패해도 console.error 0회", () => {
    seedFlags({ purchasedHolidays: [] });
    // 손상된 JSON — storage.getItem은 이를 안전하게 null/[]로 fallback해야 한다.
    localStorage.setItem("ht_visits", "{not-valid-json");
    seedBudget([]);
    seedChecklist([]);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderHomePage();

    expect(screen.getAllByText("아직 데이터가 없어요").length).toBeGreaterThan(0);
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
