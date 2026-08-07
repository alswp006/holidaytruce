import { describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { screen, fireEvent, within, waitFor } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { AppFlags, BudgetItem, ChecklistItem } from "@/lib/types";

/**
 * Packet 0011: 예산 & 체크리스트 `/budget`
 *
 * AC-1[P0]: { target, category, label, amount } 제출 시 ht_budget 저장 + 총액 갱신 + 성공 토스트
 * AC-2[P0]: calcBudget 총액을 budget-total-hero(SummaryHero)에 CountUp 표시, 본가/시댁 비율을
 *           budget-ratio-bar(MiniBar)로 시각화
 * AC-3[P0]: 체크리스트 항목 Switch on 시 ht_checklist 해당 항목 done:true 저장, 완료 개수 갱신
 * AC-4[P1]: 음수 금액(amount<0) 또는 비정수 제출 시 에러 메시지 표시, ht_budget 저장 안 됨
 *
 * Field contract expected from the implementation (BudgetPage.tsx):
 * - Tab: "예산" / "체크리스트" (TDS Tab — role="tab", 기본 선택은 "예산")
 * - 예산 탭:
 *   - data-testid="budget-total-hero" : SummaryHero(총액 CountUp), textContent에 "300,000" 등 포함
 *   - data-testid="budget-ratio-bar"  : MiniBar, aria-valuenow = calcBudget(items).minePct(본가 비율, 0~100)
 *   - "항목 추가" 버튼(role=button) 탭 시 BottomSheet(role=dialog) 오픈
 *   - BottomSheet 내부:
 *     - 대상 Chip: "본가" / "시댁" / "기타" (role=button, aria-pressed)
 *     - 분류 Chip: "용돈" / "선물" / "교통" / "기타" (role=button, aria-pressed)
 *     - 항목명 TextField: placeholder="예: 부모님 용돈"
 *     - 금액 TextField: placeholder="예: 300000" (inputMode="numeric")
 *     - 제출 버튼(role=button, name="저장하기")
 *   - 제출 성공 시: ht_budget에 { holidayId, target, category, label, amount } push,
 *     Toast(role=status) 텍스트 "예산을 저장했어요" 표시, budget-total-hero 총액 갱신
 *   - 제출 실패(amount<0 또는 비정수) 시: hasError TextField help 텍스트
 *     "금액은 0원 이상이어야 해요"(role=alert) 표시, ht_budget 저장 안 됨(개수 불변)
 * - 체크리스트 탭:
 *   - 각 항목은 data-testid="checklist-row" 컨테이너(텍스트 + Switch role=switch) 로 렌더
 *   - Switch 클릭 시 ht_checklist 해당 항목 done 토글 저장
 *   - 완료 개수 텍스트("n/총n" 포함) 표시, 토글 후 즉시 갱신
 * - storage: ht_budget = "@/lib/storage" getBudget/addBudgetItem, ht_checklist = getChecklist/toggleChecklist
 * - activeHolidayId: ht_flags.activeHolidayId를 새 BudgetItem.holidayId로 사용
 */

mockAll();

const HOLIDAY_ID = "2026-chuseok";

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

function seedBudget(items: BudgetItem[]) {
  localStorage.setItem("ht_budget", JSON.stringify(items));
}

function seedChecklist(items: ChecklistItem[]) {
  localStorage.setItem("ht_checklist", JSON.stringify(items));
}

function getStoredBudget(): BudgetItem[] {
  return JSON.parse(localStorage.getItem("ht_budget") ?? "[]");
}

function getStoredChecklist(): ChecklistItem[] {
  return JSON.parse(localStorage.getItem("ht_checklist") ?? "[]");
}

// NOTE: BudgetPage.tsx does not exist yet (TDD red phase). Use require() instead of a
// static `import` so `tsc --noEmit` doesn't fail module resolution before the Coder
// creates the file — dynamic require() bypasses TS's static import-resolution check.
function renderBudgetPage() {
  const BudgetPage = require("@/pages/BudgetPage").default;
  return renderWithRouter(React.createElement(BudgetPage));
}

function openAddSheet() {
  fireEvent.click(screen.getByRole("button", { name: "항목 추가" }));
  return screen.getByRole("dialog");
}

function fillAndSubmitBudgetForm(
  dialog: HTMLElement,
  { target, category, label, amount }: { target: string; category: string; label: string; amount: string },
) {
  fireEvent.click(within(dialog).getByRole("button", { name: target }));
  fireEvent.click(within(dialog).getByRole("button", { name: category }));
  fireEvent.change(within(dialog).getByPlaceholderText("예: 부모님 용돈"), {
    target: { value: label },
  });
  fireEvent.change(within(dialog).getByPlaceholderText("예: 300000"), {
    target: { value: amount },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장하기" }));
}

describe("예산 & 체크리스트 `/budget`", () => {
  beforeEach(() => {
    seedFlags();
    seedBudget([]);
    seedChecklist([]);
  });

  it("AC-1[P0]: 예산 항목 제출 시 ht_budget에 저장되고 총액이 갱신되며 성공 토스트가 표시된다", async () => {
    renderBudgetPage();

    const dialog = openAddSheet();
    fillAndSubmitBudgetForm(dialog, {
      target: "시댁",
      category: "용돈",
      label: "부모님 용돈",
      amount: "300000",
    });

    await waitFor(() => expect(getStoredBudget()).toHaveLength(1));
    const saved = getStoredBudget()[0];
    expect(saved.target).toBe("시댁");
    expect(saved.category).toBe("용돈");
    expect(saved.label).toBe("부모님 용돈");
    expect(saved.amount).toBe(300000);

    await waitFor(() => expect(screen.getByText("예산을 저장했어요")).toBeInTheDocument());
    expect(screen.getByTestId("budget-total-hero").textContent).toContain("300,000");
  });

  it("AC-1[P0]: 저장된 BudgetItem은 활성 명절 id와 고유 id를 포함한다", async () => {
    renderBudgetPage();

    const dialog = openAddSheet();
    fillAndSubmitBudgetForm(dialog, {
      target: "본가",
      category: "교통",
      label: "고속버스표",
      amount: "45000",
    });

    await waitFor(() => expect(getStoredBudget()).toHaveLength(1));
    const saved = getStoredBudget()[0];
    expect(saved.holidayId).toBe(HOLIDAY_ID);
    expect(typeof saved.id).toBe("string");
    expect(saved.id.length).toBeGreaterThan(0);
  });

  it("AC-2[P0]: 본가 20만원 + 시댁 30만원이면 총액 500,000원이 budget-total-hero에 표시된다", () => {
    seedBudget([
      { id: "b1", holidayId: HOLIDAY_ID, target: "본가", category: "용돈", label: "명절 용돈", amount: 200000 },
      { id: "b2", holidayId: HOLIDAY_ID, target: "시댁", category: "선물", label: "홍삼 선물세트", amount: 300000 },
    ]);

    renderBudgetPage();

    expect(screen.getByTestId("budget-total-hero").textContent).toContain("500,000");
  });

  it("AC-2[P0]: 본가/시댁 비율이 budget-ratio-bar(MiniBar)에 aria-valuenow로 시각화된다", () => {
    seedBudget([
      { id: "b1", holidayId: HOLIDAY_ID, target: "본가", category: "용돈", label: "명절 용돈", amount: 200000 },
      { id: "b2", holidayId: HOLIDAY_ID, target: "시댁", category: "선물", label: "홍삼 선물세트", amount: 300000 },
    ]);

    renderBudgetPage();

    // calcBudget({200000 본가, 300000 시댁}).minePct === 40
    expect(screen.getByTestId("budget-ratio-bar")).toHaveAttribute("aria-valuenow", "40");
  });

  it("AC-3[P0]: 체크리스트 초기 완료 개수가 done 항목 수 그대로 표시된다", () => {
    seedChecklist([
      { id: "c1", holidayId: HOLIDAY_ID, text: "선물 준비", done: true },
      { id: "c2", holidayId: HOLIDAY_ID, text: "기차표 예매", done: true },
      { id: "c3", holidayId: HOLIDAY_ID, text: "용돈 봉투", done: false },
      { id: "c4", holidayId: HOLIDAY_ID, text: "일정 공유", done: false },
    ]);

    renderBudgetPage();

    fireEvent.click(screen.getByRole("tab", { name: "체크리스트" }));

    expect(screen.getByText(/2\/4/)).toBeInTheDocument();
  });

  it("AC-3[P0]: Switch on 시 ht_checklist 해당 항목 done:true 저장 + 완료 개수 3/4로 갱신", async () => {
    seedChecklist([
      { id: "c1", holidayId: HOLIDAY_ID, text: "선물 준비", done: true },
      { id: "c2", holidayId: HOLIDAY_ID, text: "기차표 예매", done: true },
      { id: "c3", holidayId: HOLIDAY_ID, text: "용돈 봉투", done: false },
      { id: "c4", holidayId: HOLIDAY_ID, text: "일정 공유", done: false },
    ]);

    renderBudgetPage();
    fireEvent.click(screen.getByRole("tab", { name: "체크리스트" }));

    const rows = screen.getAllByTestId("checklist-row");
    const targetRow = rows.find((row) => row.textContent?.includes("용돈 봉투"));
    expect(targetRow).toBeDefined();
    fireEvent.click(within(targetRow as HTMLElement).getByRole("switch"));

    await waitFor(() => {
      const saved = getStoredChecklist().find((item) => item.id === "c3");
      expect(saved?.done).toBe(true);
    });

    expect(screen.getByText(/3\/4/)).toBeInTheDocument();
  });

  it("AC-4[P1]: 음수 금액 제출 시 에러 메시지가 표시되고 ht_budget에 저장되지 않는다", () => {
    renderBudgetPage();

    const dialog = openAddSheet();
    fillAndSubmitBudgetForm(dialog, {
      target: "본가",
      category: "용돈",
      label: "세뱃돈",
      amount: "-1000",
    });

    expect(screen.getByText("금액은 0원 이상이어야 해요")).toBeInTheDocument();
    expect(getStoredBudget()).toHaveLength(0);
  });

  it("AC-4[P1]: 비정수(소수) 금액 제출 시에도 에러 메시지가 표시되고 저장되지 않는다", () => {
    renderBudgetPage();

    const dialog = openAddSheet();
    fillAndSubmitBudgetForm(dialog, {
      target: "본가",
      category: "용돈",
      label: "세뱃돈",
      amount: "3.5",
    });

    expect(screen.getByText("금액은 0원 이상이어야 해요")).toBeInTheDocument();
    expect(getStoredBudget()).toHaveLength(0);
  });
});
