import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";

/**
 * 예산 계산기 & 갈등 방지 체크리스트 페이지 /budget — packet 0010
 *
 * 구현 파일: src/pages/Budget.tsx
 *
 * 화면 계약(테스트가 강제하는 부분만):
 * - 상단: 콘텐츠 전환용 Tab을 data-testid="budget-tabs" 컨테이너로 감싼다(하단 5탭
 *   FloatingTabBar의 role="tab"과 쿼리 충돌을 피하기 위해 반드시 이 testid로 스코프한다).
 *   내부에 Tab.Item(또는 동등한 버튼) "예산"/"체크리스트" — role="tab", aria-selected로 활성 표시.
 * - location.state는 { tab?: "예산" | "체크리스트" } 형태이며 ?? 가드로 기본값 "예산".
 *   state가 없거나 손상되어도 크래시 없이 기본 "예산" 탭을 렌더한다.
 *
 * [예산 탭]
 * - 합계: SummaryHero value에 <CountUp unit="원" testId="budget-total-countup" /> (전체 합계).
 *   본가/처가 각각 data-testid="budget-side-total-본가"/"budget-side-total-처가" textContent에
 *   천단위 콤마(toLocaleString('ko-KR')) 포함 숫자.
 * - 지급/예정 집계: data-testid="budget-paid-total"(paid:true 합)·"budget-pending-total"(paid:false 합).
 * - 양가 비중 MiniBar: data-testid="budget-balance-bar" (role="progressbar").
 * - 목록: 각 항목 ListRow → data-testid="budget-row". 각 행에 paid 토글
 *   data-testid={`budget-paid-switch-${id}`}(role="switch") — 토글 시
 *   updateBudget(id, { paid: <다음 값> }) 호출 + 지급/예정 합계 즉시 갱신.
 * - 추가: data-testid="budget-add-button" 클릭 → BottomSheet(role="dialog") 오픈.
 *   내부: side ChipItem "본가"/"처가"(1개 선택), category ChipItem
 *   "용돈"/"선물"/"차례비용"/"교통"/"기타"(1개 선택), label 입력 data-testid="budget-label-input",
 *   금액 입력 data-testid="budget-amount-input", 완료 버튼 data-testid="budget-submit-button".
 * - 유효 제출: addBudget({ side, category, label, amount, paid: false, holidayId }) 호출 +
 *   목록·합계 갱신 + 성공 토스트(role="status").
 * - 검증: amount 0 이하 제출 시 정확히 "금액을 1원 이상 입력해주세요" 노출, addBudget 미호출.
 *   amount 100000000(1억) 제출 시 정확히 "금액이 너무 커요 (최대 99,999,999원)" 노출, addBudget 미호출.
 * - 빈 상태: 예산 항목 0건이면 EmptyState(아이콘 role="img" name에 "예산" 포함) 노출.
 *
 * [체크리스트 탭]
 * - 배지: data-testid="checklist-badge" textContent가 "N/M"(체크됨/전체) 형식.
 * - 목록: 각 항목 data-testid="checklist-row", 체크 토글
 *   data-testid={`checklist-checkbox-${id}`}(role="switch") — 탭 시
 *   updateChecklistItem(id, { checked: true }) 호출 + 배지 즉시 갱신.
 * - 추가: data-testid="checklist-add-button" → BottomSheet(role="dialog") 오픈.
 *   내부 텍스트 입력 data-testid="checklist-text-input", 완료 버튼 data-testid="checklist-submit-button".
 *   제출 시 addChecklistItem({ text, checked: false, holidayId }) 호출.
 */

mockTds();
mockAppsInToss();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── HolidayContext 더블 ──
const holidayState = vi.hoisted(() => ({
  currentHolidayId: "2026-chuseok",
}));

vi.mock("@/lib/HolidayContext", () => ({
  useHoliday: () => ({
    currentHolidayId: holidayState.currentHolidayId,
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
type Budget = {
  id: string;
  side: "본가" | "처가";
  category: "용돈" | "선물" | "차례비용" | "교통" | "기타";
  label: string;
  amount: number;
  paid: boolean;
  holidayId: string;
  createdAt: number;
};
type Checklist = {
  id: string;
  text: string;
  checked: boolean;
  holidayId: string;
};

const storageState = vi.hoisted(() => ({
  budgets: [] as any[],
  checklist: [] as any[],
}));

const listBudgetsMock = vi.hoisted(() =>
  vi.fn((holidayId: string) => storageState.budgets.filter((b: any) => b.holidayId === holidayId)),
);
const addBudgetMock = vi.hoisted(() =>
  vi.fn((input: any) => ({ ...input, id: "new-budget-1", createdAt: 0 })),
);
const updateBudgetMock = vi.hoisted(() => vi.fn());

const listChecklistMock = vi.hoisted(() =>
  vi.fn((holidayId: string) => storageState.checklist.filter((c: any) => c.holidayId === holidayId)),
);
const addChecklistItemMock = vi.hoisted(() =>
  vi.fn((input: any) => ({ ...input, id: "new-checklist-1" })),
);
const updateChecklistItemMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    listBudgets: listBudgetsMock,
    addBudget: addBudgetMock,
    updateBudget: updateBudgetMock,
    listChecklist: listChecklistMock,
    addChecklistItem: addChecklistItemMock,
    updateChecklistItem: updateChecklistItemMock,
  };
});

import Budget from "@/pages/Budget";

function budgetTabs() {
  return screen.getByTestId("budget-tabs");
}

function goToChecklistTab() {
  fireEvent.click(within(budgetTabs()).getByRole("tab", { name: "체크리스트" }));
}

function goToBudgetTab() {
  fireEvent.click(within(budgetTabs()).getByRole("tab", { name: "예산" }));
}

function openAddBudgetSheet() {
  fireEvent.click(screen.getByTestId("budget-add-button"));
  return screen.getByRole("dialog");
}

function fillAndSubmitBudget(opts: {
  side: "본가" | "처가";
  category: "용돈" | "선물" | "차례비용" | "교통" | "기타";
  label: string;
  amount: string;
}) {
  const dialog = openAddBudgetSheet();
  fireEvent.click(within(dialog).getByRole("button", { name: opts.side }));
  fireEvent.click(within(dialog).getByRole("button", { name: opts.category }));
  fireEvent.change(screen.getByTestId("budget-label-input"), { target: { value: opts.label } });
  fireEvent.change(screen.getByTestId("budget-amount-input"), { target: { value: opts.amount } });
  fireEvent.click(screen.getByTestId("budget-submit-button"));
}

function seedBudgets(items: Partial<Budget>[]) {
  storageState.budgets = items.map((item, i) => ({
    id: `b${i + 1}`,
    side: "본가",
    category: "용돈",
    label: "항목",
    amount: 0,
    paid: false,
    holidayId: "2026-chuseok",
    createdAt: i,
    ...item,
  }));
}

function seedChecklist(items: Partial<Checklist>[]) {
  storageState.checklist = items.map((item, i) => ({
    id: `c${i + 1}`,
    text: "항목",
    checked: false,
    holidayId: "2026-chuseok",
    ...item,
  }));
}

describe("예산 계산기 & 갈등 방지 체크리스트 페이지 /budget", () => {
  beforeEach(() => {
    storageState.budgets = [];
    storageState.checklist = [];
    listBudgetsMock.mockClear();
    addBudgetMock.mockClear();
    updateBudgetMock.mockClear();
    listChecklistMock.mockClear();
    addChecklistItemMock.mockClear();
    updateChecklistItemMock.mockClear();
    mockNavigate.mockClear();
  });

  it("AC-1[P0]: 유효 예산 항목 제출 시 addBudget이 호출되고 목록·토스트가 갱신된다", () => {
    renderWithRouter(React.createElement(Budget));

    fillAndSubmitBudget({ side: "처가", category: "차례비용", label: "차례 음식 재료", amount: "150000" });

    expect(addBudgetMock).toHaveBeenCalledTimes(1);
    expect(addBudgetMock).toHaveBeenCalledWith({
      side: "처가",
      category: "차례비용",
      label: "차례 음식 재료",
      amount: 150000,
      paid: false,
      holidayId: "2026-chuseok",
    });

    const rows = screen.getAllByTestId("budget-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toMatch(/차례 음식 재료/);

    const statuses = screen.getAllByRole("status");
    expect(statuses.map((el) => el.textContent).join(" ")).toMatch(/추가|저장|완료/);
  });

  it("AC-1: 전체/본가/처가 합계 3종이 toLocaleString('ko-KR') 원화 포맷으로 표시된다", () => {
    seedBudgets([
      { side: "본가", amount: 200000 },
      { side: "처가", amount: 100000 },
    ]);
    renderWithRouter(React.createElement(Budget));

    expect(screen.getByTestId("budget-total-countup").textContent).toMatch(/300,000/);
    expect(screen.getByTestId("budget-side-total-본가").textContent).toMatch(/200,000/);
    expect(screen.getByTestId("budget-side-total-처가").textContent).toMatch(/100,000/);
  });

  it("AC-2[P0]: paid Switch 토글 시 updateBudget이 호출되고 지급/예정 합계가 즉시 갱신된다", () => {
    seedBudgets([
      { id: "b1", side: "본가", amount: 50000, paid: false },
      { id: "b2", side: "처가", amount: 30000, paid: true },
    ] as any);
    renderWithRouter(React.createElement(Budget));

    expect(screen.getByTestId("budget-paid-total").textContent).toMatch(/30,000/);
    expect(screen.getByTestId("budget-pending-total").textContent).toMatch(/50,000/);

    fireEvent.click(screen.getByTestId("budget-paid-switch-b1"));

    expect(updateBudgetMock).toHaveBeenCalledTimes(1);
    expect(updateBudgetMock).toHaveBeenCalledWith("b1", { paid: true });

    expect(screen.getByTestId("budget-paid-total").textContent).toMatch(/80,000/);
    expect(screen.getByTestId("budget-pending-total").textContent).toMatch(/0/);
  });

  it("AC-2[P0]: 금액 0 제출 시 정확한 에러 문구를 보여주고 addBudget을 호출하지 않는다", () => {
    renderWithRouter(React.createElement(Budget));

    fillAndSubmitBudget({ side: "본가", category: "용돈", label: "세뱃돈", amount: "0" });

    expect(screen.getByText("금액을 1원 이상 입력해주세요")).toBeInTheDocument();
    expect(addBudgetMock).not.toHaveBeenCalled();
    expect(screen.queryAllByTestId("budget-row")).toHaveLength(0);
  });

  it("AC-3[P0]: 금액 1억(100000000) 제출 시 정확한 에러 문구를 보여주고 addBudget을 호출하지 않는다", () => {
    renderWithRouter(React.createElement(Budget));

    fillAndSubmitBudget({ side: "본가", category: "기타", label: "예비비", amount: "100000000" });

    expect(screen.getByText("금액이 너무 커요 (최대 99,999,999원)")).toBeInTheDocument();
    expect(addBudgetMock).not.toHaveBeenCalled();
    expect(screen.queryAllByTestId("budget-row")).toHaveLength(0);
  });

  it("AC-3: 예산 항목이 0건이면 빈 상태(아이콘+안내 텍스트)가 노출된다", () => {
    renderWithRouter(React.createElement(Budget));

    expect(screen.queryAllByTestId("budget-row")).toHaveLength(0);
    expect(screen.getByRole("img", { name: /예산/ })).toBeInTheDocument();
    expect(screen.getByText(/예산.*없|없어요/)).toBeInTheDocument();
  });

  it("AC-4[P0]: 체크박스 탭 시 updateChecklistItem이 호출되고 'N/M' 배지가 갱신되며, 탭 전환은 서로 독립적으로 동작한다", () => {
    seedChecklist([
      { id: "c1", text: "본가 부모님께 여쭤보기" },
      { id: "c2", text: "처가 방문 시간 상의하기" },
    ]);
    renderWithRouter(React.createElement(Budget));

    goToChecklistTab();
    expect(screen.getByTestId("checklist-badge").textContent).toBe("0/2");

    fireEvent.click(screen.getByTestId("checklist-checkbox-c1"));

    expect(updateChecklistItemMock).toHaveBeenCalledTimes(1);
    expect(updateChecklistItemMock).toHaveBeenCalledWith("c1", { checked: true });
    expect(screen.getByTestId("checklist-badge").textContent).toBe("1/2");

    // 탭을 예산으로 전환했다가 다시 돌아와도 체크 상태가 유지된다 (독립 동작)
    goToBudgetTab();
    expect(screen.getByTestId("budget-add-button")).toBeInTheDocument();
    expect(screen.queryByTestId("checklist-badge")).not.toBeInTheDocument();

    goToChecklistTab();
    expect(screen.getByTestId("checklist-badge").textContent).toBe("1/2");
    expect(screen.getByTestId("checklist-checkbox-c1")).toHaveProperty("checked", true);
  });

  it("AC-4: 체크리스트 항목 추가 시 addChecklistItem이 호출되고 목록·배지가 갱신된다", () => {
    seedChecklist([{ id: "c1", text: "인사말 미리 정하기" }]);
    renderWithRouter(React.createElement(Budget));

    goToChecklistTab();
    fireEvent.click(screen.getByTestId("checklist-add-button"));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByTestId("checklist-text-input"), {
      target: { value: "용돈 봉투 준비하기" },
    });
    fireEvent.click(screen.getByTestId("checklist-submit-button"));

    expect(addChecklistItemMock).toHaveBeenCalledTimes(1);
    expect(addChecklistItemMock).toHaveBeenCalledWith({
      text: "용돈 봉투 준비하기",
      checked: false,
      holidayId: "2026-chuseok",
    });

    const rows = screen.getAllByTestId("checklist-row");
    expect(rows).toHaveLength(2);
    expect(screen.getByTestId("checklist-badge").textContent).toBe("0/2");
  });

  it("AC-4[P0]: location.state 없이 직접 진입해도 크래시 없이 기본 '예산' 탭을 렌더한다", () => {
    renderWithRouter(React.createElement(Budget), { initialEntries: ["/budget"] });

    expect(within(budgetTabs()).getByRole("tab", { name: "예산" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("budget-add-button")).toBeInTheDocument();
    expect(screen.queryByTestId("checklist-badge")).not.toBeInTheDocument();
  });
});
