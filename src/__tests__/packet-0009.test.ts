import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";

/**
 * 방문 일정 캘린더 페이지 /schedule — packet 0009
 *
 * 구현 파일: src/pages/Schedule.tsx
 *
 * 화면 계약(테스트가 강제하는 부분만):
 * - 목록: 각 일정 ListRow → data-testid="schedule-row" (date 오름차순 정렬).
 * - 총 방문시간: SummaryHero value에 <CountUp unit="분" testId="schedule-total-countup" />
 *   (본가+처가 전체 분 합계). 본가/처가 각각의 합계는
 *   data-testid={`schedule-side-total-${side}`} 요소의 textContent에 분 단위 숫자 포함.
 * - 추가: data-testid="schedule-add-button" 클릭 → BottomSheet(role="dialog") 오픈.
 *   내부: ChipItem "본가"/"처가"(1개 선택), date 입력 data-testid="schedule-date-input",
 *   시작 data-testid="schedule-start-input", 종료 data-testid="schedule-end-input",
 *   메모 data-testid="schedule-memo-input", 완료 버튼 data-testid="schedule-submit-button".
 * - 유효 제출: addSchedule({ side, date, startTime, endTime, memo, holidayId }) 호출 +
 *   목록에 추가 + 성공 토스트(role="status").
 * - 삭제: 각 행에 data-testid={`schedule-delete-${id}`} 트리거 → AlertDialog(role="alertdialog",
 *   title "삭제할까요?") → 확인 클릭 시 removeSchedule(id) 호출 + 목록에서 제거.
 * - 검증: date 공란 제출 시 정확히 "방문 날짜를 선택해주세요" 노출, addSchedule 미호출.
 *   end < start 제출 시 정확히 "종료 시간이 시작 시간보다 빨라요" 노출, addSchedule 미호출.
 * - 균형 경고: 본가/처가 총 방문시간 차이가 120분을 초과하면
 *   data-testid="schedule-balance-warning" Card가 노출되고 차이(분) 값을 포함한다.
 * - 빈 상태: 일정 0건이면 EmptyState(Asset.ContentIcon + 안내 텍스트) 노출.
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

// ── storage 더블 — listSchedules/addSchedule/removeSchedule만 spy, 나머지는 실제 구현 유지 ──
const storageState = vi.hoisted(() => ({
  schedules: [] as Array<{
    id: string;
    side: "본가" | "처가";
    date: string;
    startTime?: string;
    endTime?: string;
    memo: string;
    holidayId: string;
    createdAt: number;
  }>,
}));

const listSchedulesMock = vi.hoisted(() =>
  vi.fn((holidayId: string) => storageState.schedules.filter((s) => s.holidayId === holidayId)),
);
const addScheduleMock = vi.hoisted(() =>
  vi.fn((input: any) => ({ ...input, id: "new-schedule-1", createdAt: 0 })),
);
const removeScheduleMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    listSchedules: listSchedulesMock,
    addSchedule: addScheduleMock,
    removeSchedule: removeScheduleMock,
  };
});

import Schedule from "@/pages/Schedule";

function openAddSheet() {
  fireEvent.click(screen.getByTestId("schedule-add-button"));
  return screen.getByRole("dialog");
}

function fillAndSubmit(opts: {
  side: "본가" | "처가";
  date?: string;
  start?: string;
  end?: string;
  memo?: string;
}) {
  const dialog = openAddSheet();
  fireEvent.click(within(dialog).getByRole("button", { name: opts.side }));
  if (opts.date !== undefined) {
    fireEvent.change(screen.getByTestId("schedule-date-input"), { target: { value: opts.date } });
  }
  if (opts.start !== undefined) {
    fireEvent.change(screen.getByTestId("schedule-start-input"), { target: { value: opts.start } });
  }
  if (opts.end !== undefined) {
    fireEvent.change(screen.getByTestId("schedule-end-input"), { target: { value: opts.end } });
  }
  if (opts.memo !== undefined) {
    fireEvent.change(screen.getByTestId("schedule-memo-input"), { target: { value: opts.memo } });
  }
  fireEvent.click(screen.getByTestId("schedule-submit-button"));
}

describe("방문 일정 캘린더 페이지 /schedule", () => {
  beforeEach(() => {
    storageState.schedules = [];
    listSchedulesMock.mockClear();
    addScheduleMock.mockClear();
    removeScheduleMock.mockClear();
    mockNavigate.mockClear();
  });

  it("AC-1[P0]: 유효 폼 제출 시 ht.schedules에 저장되고 목록에 추가되며 성공 토스트가 뜬다", () => {
    renderWithRouter(React.createElement(Schedule));

    fillAndSubmit({ side: "처가", date: "2026-02-10", start: "09:00", end: "11:00", memo: "차례 참석" });

    expect(addScheduleMock).toHaveBeenCalledTimes(1);
    expect(addScheduleMock).toHaveBeenCalledWith({
      side: "처가",
      date: "2026-02-10",
      startTime: "09:00",
      endTime: "11:00",
      memo: "차례 참석",
      holidayId: "2026-chuseok",
    });

    const rows = screen.getAllByTestId("schedule-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toMatch(/2026-02-10/);

    const statuses = screen.getAllByRole("status");
    expect(statuses.map((el) => el.textContent).join(" ")).toMatch(/추가|저장|완료/);
  });

  it("AC-2[P0]: 삭제 AlertDialog 확인 시 id가 제거되고 본가/처가 총 방문시간(분)이 갱신되어 표시된다", () => {
    storageState.schedules = [
      {
        id: "s1",
        side: "본가",
        date: "2026-02-10",
        startTime: "09:00",
        endTime: "10:00", // 60분
        memo: "",
        holidayId: "2026-chuseok",
        createdAt: 1,
      },
      {
        id: "s2",
        side: "처가",
        date: "2026-02-11",
        startTime: "09:00",
        endTime: "10:30", // 90분
        memo: "",
        holidayId: "2026-chuseok",
        createdAt: 2,
      },
    ];

    renderWithRouter(React.createElement(Schedule));

    expect(screen.getByTestId("schedule-side-total-본가").textContent).toMatch(/60/);
    expect(screen.getByTestId("schedule-side-total-처가").textContent).toMatch(/90/);

    fireEvent.click(screen.getByTestId("schedule-delete-s1"));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("삭제할까요?")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button"));

    expect(removeScheduleMock).toHaveBeenCalledTimes(1);
    expect(removeScheduleMock).toHaveBeenCalledWith("s1");

    expect(screen.getAllByTestId("schedule-row")).toHaveLength(1);
    expect(screen.getByTestId("schedule-side-total-본가").textContent).toMatch(/0/);
    expect(screen.getByTestId("schedule-side-total-처가").textContent).toMatch(/90/);
  });

  it("AC-3[P0]: 본가/처가 방문시간 차이가 120분을 초과하면 균형 경고 Card가 뜨고 차이(150분)를 보여준다", () => {
    storageState.schedules = [
      {
        id: "s1",
        side: "본가",
        date: "2026-02-10",
        startTime: "09:00",
        endTime: "12:00", // 180분
        memo: "",
        holidayId: "2026-chuseok",
        createdAt: 1,
      },
      {
        id: "s2",
        side: "처가",
        date: "2026-02-11",
        startTime: "09:00",
        endTime: "09:30", // 30분
        memo: "",
        holidayId: "2026-chuseok",
        createdAt: 2,
      },
    ];

    renderWithRouter(React.createElement(Schedule));

    const warning = screen.getByTestId("schedule-balance-warning");
    expect(warning).toBeInTheDocument();
    expect(warning.textContent).toMatch(/150/);
  });

  it("AC-3[P0]: 종료 시간이 시작 시간보다 빠르면 정확한 에러 문구를 보여주고 addSchedule을 호출하지 않는다", () => {
    renderWithRouter(React.createElement(Schedule));

    fillAndSubmit({ side: "본가", date: "2026-02-10", start: "14:00", end: "13:00", memo: "" });

    expect(screen.getByText("종료 시간이 시작 시간보다 빨라요")).toBeInTheDocument();
    expect(addScheduleMock).not.toHaveBeenCalled();
    expect(screen.queryAllByTestId("schedule-row")).toHaveLength(0);
  });

  it("AC-4[P0]: 방문 날짜가 공란이면 정확한 에러 문구를 보여주고 addSchedule을 호출하지 않는다", () => {
    renderWithRouter(React.createElement(Schedule));

    fillAndSubmit({ side: "본가", start: "09:00", end: "10:00", memo: "" });

    expect(screen.getByText("방문 날짜를 선택해주세요")).toBeInTheDocument();
    expect(addScheduleMock).not.toHaveBeenCalled();
  });

  it("AC-4[P1]: 일정이 0건이면 빈 상태(아이콘+안내 텍스트)가 노출된다", () => {
    renderWithRouter(React.createElement(Schedule));

    expect(screen.queryAllByTestId("schedule-row")).toHaveLength(0);
    expect(screen.getByRole("img", { name: /일정/ })).toBeInTheDocument();
    expect(screen.getByText(/일정.*없|없어요/)).toBeInTheDocument();
  });

  it("AC-4[P1]: 목록은 date 기준 오름차순으로 정렬되어 렌더된다", () => {
    storageState.schedules = [
      {
        id: "s1",
        side: "본가",
        date: "2026-02-15",
        startTime: "09:00",
        endTime: "10:00",
        memo: "",
        holidayId: "2026-chuseok",
        createdAt: 1,
      },
      {
        id: "s2",
        side: "처가",
        date: "2026-02-10",
        startTime: "09:00",
        endTime: "10:00",
        memo: "",
        holidayId: "2026-chuseok",
        createdAt: 2,
      },
      {
        id: "s3",
        side: "본가",
        date: "2026-02-12",
        startTime: "09:00",
        endTime: "10:00",
        memo: "",
        holidayId: "2026-chuseok",
        createdAt: 3,
      },
    ];

    renderWithRouter(React.createElement(Schedule));

    const rows = screen.getAllByTestId("schedule-row");
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.textContent).map((t) => (t?.match(/2026-02-\d{2}/) ?? [])[0])).toEqual([
      "2026-02-10",
      "2026-02-12",
      "2026-02-15",
    ]);
  });
});
