import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { AppFlags, Visit } from "@/lib/types";

/**
 * Packet 0010: 방문 균형 캘린더 `/calendar`
 *
 * AC-1[P0]: { family, date, startHour, durationHours, memo } 제출 시 ht_visits 저장(addVisit)
 *           + 목록에 항목 추가 + 토스트 "일정이 추가됐어요" 표시
 * AC-2[P0]: 활성 명절(ht_flags.activeHolidayId) 기준으로 필터링된 Visit로 calcBalance를 계산해
 *           "본가 25% / 시댁 75%" 형태로 MiniBar + 강조 숫자 표시, 70% 초과 시 경고 Chip
 *           "한쪽에 시간이 몰려 있어요" 표시(균형 상태면 미표시)
 * AC-3[P1]: 항목 삭제 액션 탭 → AlertDialog "삭제" 확인 시 ht_visits에서 제거(removeVisit)
 *           + 균형 재계산(목록 반영)
 * AC-4[P1]: durationHours:0 제출 시 에러 "체류 시간은 1시간 이상이어야 해요" 표시, 저장 안 됨
 * AC-5[P1]: ht_visits 빈 배열 시 Asset.ContentIcon + "아직 등록된 방문 일정이 없어요" + "일정 추가"
 *           버튼 표시, 20개 초과 시 크래시 없이 세로 스크롤 렌더
 *
 * Field contract expected from the implementation (CalendarPage.tsx):
 * - 항목 추가 버튼(항상 노출, empty/non-empty 공통): 접근성 이름 "일정 추가" — BottomSheet(role="dialog") 오픈
 * - BottomSheet 폼 컨테이너: data-testid="visit-form"
 * - 집 선택 Chip: 접근성 이름 "본가" / "시댁" (family: "mine" | "partner")
 * - 날짜 TextField: placeholder="예: 2026-09-25"
 * - 시작 시각 TextField: placeholder="예: 10"
 * - 체류 시간 TextField: placeholder="예: 6"
 * - 메모 TextField: placeholder="예: 차례"
 * - 제출 버튼: 접근성 이름 "일정 저장"
 * - 집 미선택 채 제출 시 인라인 에러 "누구네 집인지 선택해 주세요", addVisit 호출 안 됨
 * - durationHours 0 이하 제출 시 인라인 에러 "체류 시간은 1시간 이상이어야 해요", addVisit 호출 안 됨
 * - 성공 토스트: 텍스트 "일정이 추가됐어요" (role="status")
 * - 목록 항목: 각 Visit 당 data-testid="visit-item" 컨테이너, 내부에 삭제 IconButton
 *   접근성 이름 "일정 삭제"
 * - 삭제 확인 AlertDialog: title "일정을 삭제할까요?", 확인 버튼 접근성 이름 "삭제"
 * - 균형 표시: data-testid="balance-bar" MiniBar + 텍스트 "{mine}% / {partner}%" 형식
 *   ("본가 25% / 시댁 75%")
 * - 경고 Chip: 한쪽 비율이 70% 초과일 때만 텍스트 "한쪽에 시간이 몰려 있어요" 노출
 * - 목록/균형 계산은 ht_flags.activeHolidayId와 일치하는 holidayId의 Visit만 대상으로 함
 * - 빈 상태: data-content-icon 존재 + 텍스트 "아직 등록된 방문 일정이 없어요" + "일정 추가" 버튼
 * - storage: getVisits/addVisit/removeVisit/uuid/getFlags ("@/lib/storage")
 */

mockAll();

const mockGetVisits = vi.fn();
const mockAddVisit = vi.fn();
const mockRemoveVisit = vi.fn();
const mockUuid = vi.fn();
const mockGetFlags = vi.fn();

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    getVisits: (...args: unknown[]) => mockGetVisits(...args),
    addVisit: (...args: unknown[]) => mockAddVisit(...args),
    removeVisit: (...args: unknown[]) => mockRemoveVisit(...args),
    uuid: (...args: unknown[]) => mockUuid(...args),
    getFlags: (...args: unknown[]) => mockGetFlags(...args),
  };
});

const ACTIVE_FLAGS: AppFlags = {
  aiNoticeAcknowledged: true,
  activeHolidayId: "2026-chuseok",
  purchasedHolidays: [],
};

function makeVisit(overrides: Partial<Visit>): Visit {
  return {
    id: "visit-x",
    family: "mine",
    date: "2026-09-25",
    startHour: 9,
    durationHours: 1,
    holidayId: "2026-chuseok",
    memo: "",
    ...overrides,
  };
}

// NOTE: CalendarPage.tsx does not exist yet (TDD red phase). Use require() instead of a
// static `import` so `tsc --noEmit` doesn't fail module resolution before the Coder
// creates the file — dynamic require() bypasses TS's static import-resolution check.
function renderCalendarPage() {
  const CalendarPage = require("@/pages/CalendarPage").default;
  return renderWithRouter(React.createElement(CalendarPage));
}

function openForm() {
  fireEvent.click(screen.getByRole("button", { name: "일정 추가" }));
}

function fillForm({
  family,
  date,
  startHour,
  duration,
  memo,
}: {
  family?: "본가" | "시댁";
  date: string;
  startHour: string;
  duration: string;
  memo: string;
}) {
  if (family) {
    fireEvent.click(screen.getByRole("button", { name: family }));
  }
  fireEvent.change(screen.getByPlaceholderText("예: 2026-09-25"), {
    target: { value: date },
  });
  fireEvent.change(screen.getByPlaceholderText("예: 10"), {
    target: { value: startHour },
  });
  fireEvent.change(screen.getByPlaceholderText("예: 6"), {
    target: { value: duration },
  });
  fireEvent.change(screen.getByPlaceholderText("예: 차례"), {
    target: { value: memo },
  });
}

describe("방문 균형 캘린더 `/calendar`", () => {
  beforeEach(() => {
    mockGetFlags.mockReturnValue(ACTIVE_FLAGS);
    mockGetVisits.mockReturnValue([]);
    mockAddVisit.mockReturnValue({ ok: true });
    mockRemoveVisit.mockReturnValue({ ok: true });
    mockUuid.mockReturnValue("visit-uuid-1");
  });

  it("AC-1[P0]: 유효한 일정 제출 시 ht_visits 저장 + 토스트 '일정이 추가됐어요' 표시", async () => {
    renderCalendarPage();

    openForm();
    fillForm({
      family: "시댁",
      date: "2026-09-25",
      startHour: "10",
      duration: "6",
      memo: "차례",
    });
    fireEvent.click(screen.getByRole("button", { name: "일정 저장" }));

    await waitFor(() => expect(mockAddVisit).toHaveBeenCalledTimes(1));
    const saved = mockAddVisit.mock.calls[0][0] as Visit;
    expect(saved.family).toBe("partner");
    expect(saved.date).toBe("2026-09-25");
    expect(saved.startHour).toBe(10);
    expect(saved.durationHours).toBe(6);
    expect(saved.holidayId).toBe("2026-chuseok");
    expect(saved.memo).toBe("차례");
    expect(saved.id).toBe("visit-uuid-1");

    await waitFor(() =>
      expect(screen.getByText("일정이 추가됐어요")).toBeInTheDocument(),
    );
  });

  it("AC-1[P0]: 집을 선택하지 않고 제출하면 '누구네 집인지 선택해 주세요' 에러, 저장 안 됨", () => {
    renderCalendarPage();

    openForm();
    fillForm({
      date: "2026-09-25",
      startHour: "10",
      duration: "6",
      memo: "차례",
    });
    fireEvent.click(screen.getByRole("button", { name: "일정 저장" }));

    expect(screen.getByText("누구네 집인지 선택해 주세요")).toBeInTheDocument();
    expect(mockAddVisit).not.toHaveBeenCalled();
  });

  it("AC-2[P0]: 활성 명절 기준 필터링 + 균형 계산 '본가 25% / 시댁 75%' + 70% 초과 경고 Chip", () => {
    mockGetVisits.mockReturnValue([
      makeVisit({ id: "v1", family: "mine", durationHours: 4, memo: "본가 방문" }),
      makeVisit({ id: "v2", family: "partner", durationHours: 12, memo: "시댁 방문" }),
      makeVisit({
        id: "v3",
        family: "mine",
        durationHours: 100,
        holidayId: "2025-seollal",
        memo: "작년 방문",
      }),
    ]);

    renderCalendarPage();

    expect(screen.getByTestId("balance-bar")).toBeInTheDocument();
    expect(screen.getByText("본가 25% / 시댁 75%")).toBeInTheDocument();
    expect(screen.getByText("한쪽에 시간이 몰려 있어요")).toBeInTheDocument();
    expect(screen.getAllByTestId("visit-item")).toHaveLength(2);
    expect(screen.queryByText("작년 방문")).not.toBeInTheDocument();
  });

  it("AC-2[P0]: 균형 잡힌 경우(50% / 50%) 경고 Chip은 표시되지 않는다", () => {
    mockGetVisits.mockReturnValue([
      makeVisit({ id: "v1", family: "mine", durationHours: 10 }),
      makeVisit({ id: "v2", family: "partner", durationHours: 10 }),
    ]);

    renderCalendarPage();

    expect(screen.getByText("본가 50% / 시댁 50%")).toBeInTheDocument();
    expect(screen.queryByText("한쪽에 시간이 몰려 있어요")).not.toBeInTheDocument();
  });

  it("AC-3[P1]: 삭제 확인 시 removeVisit 호출 + 목록에서 제거되고 빈 상태로 전환", async () => {
    mockGetVisits.mockReturnValue([
      makeVisit({ id: "v1", family: "mine", durationHours: 4, memo: "차례" }),
    ]);

    renderCalendarPage();

    fireEvent.click(screen.getByRole("button", { name: "일정 삭제" }));

    expect(
      screen.getByRole("alertdialog", { name: "일정을 삭제할까요?" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(mockRemoveVisit).toHaveBeenCalledTimes(1));
    expect(mockRemoveVisit).toHaveBeenCalledWith("v1");

    await waitFor(() =>
      expect(screen.queryByTestId("visit-item")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByText("아직 등록된 방문 일정이 없어요"),
    ).toBeInTheDocument();
  });

  it("AC-4[P1]: durationHours:0 제출 시 '체류 시간은 1시간 이상이어야 해요' 에러, 저장 안 됨", () => {
    renderCalendarPage();

    openForm();
    fillForm({
      family: "본가",
      date: "2026-09-25",
      startHour: "10",
      duration: "0",
      memo: "차례",
    });
    fireEvent.click(screen.getByRole("button", { name: "일정 저장" }));

    expect(
      screen.getByText("체류 시간은 1시간 이상이어야 해요"),
    ).toBeInTheDocument();
    expect(mockAddVisit).not.toHaveBeenCalled();
  });

  it("AC-5[P1]: ht_visits 빈 배열이면 안내 아이콘 + '아직 등록된 방문 일정이 없어요' + '일정 추가' 버튼", () => {
    mockGetVisits.mockReturnValue([]);

    renderCalendarPage();

    expect(
      screen.getByText("아직 등록된 방문 일정이 없어요"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "일정 추가" })).toBeInTheDocument();
    expect(document.querySelector("[data-content-icon]")).not.toBeNull();
  });

  it("AC-5[P1]: 방문 일정이 20개를 초과해도 크래시 없이 전체 렌더된다", () => {
    const many: Visit[] = Array.from({ length: 25 }, (_, i) =>
      makeVisit({
        id: `v${i}`,
        family: i % 2 === 0 ? "mine" : "partner",
        durationHours: 1,
        memo: `일정 ${i}`,
      }),
    );
    mockGetVisits.mockReturnValue(many);

    expect(() => renderCalendarPage()).not.toThrow();
    expect(screen.getAllByTestId("visit-item")).toHaveLength(25);
  });
});
