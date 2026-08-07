import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { AppFlags, MoodLog } from "@/lib/types";

/**
 * Packet 0012: 감정소진 기록 입력 `/report/new`
 *
 * AC-1[P0]: { exhaustionLevel, stressTags, note } 제출 시 ht_moodlogs에 저장 + 성공 토스트 후
 *           navigate('/report', { replace: true })
 * AC-2[P0]: 소진 레벨 1~5 중 하나 선택 필수, 미선택 시 저장 차단 + 에러 "소진도를 선택해주세요"
 * AC-3[P1]: 스트레스 태그는 프리셋 Chip 다중 선택 가능(과한질문/가사노동/일정불균형),
 *           note는 0~200자(maxLength=200)
 * AC-4[P1]: 저장 실패(QuotaExceededError) 시 AlertDialog "저장 공간이 부족해요. 기록을 정리해주세요", 크래시 없음
 *
 * Field contract expected from the implementation (MoodNewPage.tsx):
 * - Container: data-testid="mood-new-form"
 * - 소진 레벨 Chip 그룹: 접근성 이름 "1" | "2" | "3" | "4" | "5" (role=button, aria-pressed)
 * - 스트레스 태그 Chip 그룹: STRESS_TAGS(from "@/lib/types")의 각 태그 텍스트, 다중 선택(aria-pressed 토글)
 * - 메모 TextField: placeholder="예: 질문이 많았어요", maxLength=200
 * - 저장 버튼: 접근성 이름 "기록 저장하기" (display="block")
 * - storage: ht_moodlogs = "@/lib/storage" addMoodLog, activeHolidayId = getFlags().activeHolidayId
 */

mockAll();

const HOLIDAY_ID = "2026-chuseok";

const mockAddMoodLog = vi.fn();
const mockGetFlags = vi.fn();

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    addMoodLog: (...args: unknown[]) => mockAddMoodLog(...args),
    getFlags: (...args: unknown[]) => mockGetFlags(...args),
  };
});

// NOTE: MoodNewPage.tsx does not exist yet (TDD red phase). Use require() instead of a
// static `import` so `tsc --noEmit` doesn't fail module resolution before the Coder
// creates the file — dynamic require() bypasses TS's static import-resolution check.
function renderMoodNewPage() {
  const MoodNewPage = require("@/pages/MoodNewPage").default;
  return renderWithRouter(React.createElement(MoodNewPage));
}

function selectLevel(level: number) {
  fireEvent.click(screen.getByRole("button", { name: String(level) }));
}

function selectTag(tag: string) {
  fireEvent.click(screen.getByRole("button", { name: tag }));
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "기록 저장하기" }));
}

describe("감정소진 기록 입력 `/report/new`", () => {
  beforeEach(() => {
    const flags: AppFlags = {
      aiNoticeAcknowledged: true,
      activeHolidayId: HOLIDAY_ID,
      purchasedHolidays: [],
    };
    mockGetFlags.mockReturnValue(flags);
    mockAddMoodLog.mockReturnValue({ ok: true });
  });

  it("AC-1[P0]: 유효한 기록 제출 시 ht_moodlogs에 저장되고 성공 토스트 후 navigate('/report', {replace:true})", async () => {
    renderMoodNewPage();

    selectLevel(4);
    selectTag("과한질문");
    selectTag("일정불균형");
    fireEvent.change(screen.getByPlaceholderText("예: 질문이 많았어요"), {
      target: { value: "질문이 많았음" },
    });
    submit();

    await waitFor(() => expect(mockAddMoodLog).toHaveBeenCalledTimes(1));
    const saved = mockAddMoodLog.mock.calls[0][0] as MoodLog;
    expect(saved.exhaustionLevel).toBe(4);
    expect(saved.stressTags).toEqual(["과한질문", "일정불균형"]);
    expect(saved.note).toBe("질문이 많았음");
    expect(saved.holidayId).toBe(HOLIDAY_ID);
    expect(typeof saved.id).toBe("string");
    expect(saved.id.length).toBeGreaterThan(0);

    await waitFor(() => expect(screen.getByText("기록됐어요")).toBeInTheDocument());
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/report", { replace: true }),
    );
  });

  it("AC-1[P0]: 태그·메모 없이 소진 레벨만 선택해도 빈 배열/빈 문자열로 저장된다", async () => {
    renderMoodNewPage();

    selectLevel(2);
    submit();

    await waitFor(() => expect(mockAddMoodLog).toHaveBeenCalledTimes(1));
    const saved = mockAddMoodLog.mock.calls[0][0] as MoodLog;
    expect(saved.exhaustionLevel).toBe(2);
    expect(saved.stressTags).toEqual([]);
    expect(saved.note).toBe("");
  });

  it("AC-2[P0]: 소진 레벨 미선택 시 '소진도를 선택해주세요' 표시, 저장 차단", () => {
    renderMoodNewPage();

    fireEvent.change(screen.getByPlaceholderText("예: 질문이 많았어요"), {
      target: { value: "메모만 입력" },
    });
    submit();

    expect(screen.getByText("소진도를 선택해주세요")).toBeInTheDocument();
    expect(mockAddMoodLog).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-3[P1]: 스트레스 태그 Chip을 다시 탭하면 선택이 해제된다(다중 선택 토글)", async () => {
    renderMoodNewPage();

    selectLevel(3);
    selectTag("가사노동");
    selectTag("가사노동"); // 재탭 → 해제
    submit();

    await waitFor(() => expect(mockAddMoodLog).toHaveBeenCalledTimes(1));
    const saved = mockAddMoodLog.mock.calls[0][0] as MoodLog;
    expect(saved.stressTags).toEqual([]);
  });

  it("AC-3[P1]: 메모 TextField는 maxLength=200을 강제한다", () => {
    renderMoodNewPage();

    const noteInput = screen.getByPlaceholderText("예: 질문이 많았어요") as HTMLInputElement;
    expect(noteInput.maxLength).toBe(200);
  });

  it("AC-4[P1]: QuotaExceededError 시 AlertDialog 표시, 크래시 없음", async () => {
    mockAddMoodLog.mockReturnValue({ ok: false, reason: "quota" });
    renderMoodNewPage();

    selectLevel(5);
    submit();

    await waitFor(() =>
      expect(
        screen.getByRole("alertdialog", { name: "저장 공간이 부족해요. 기록을 정리해주세요" }),
      ).toBeInTheDocument(),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    // 크래시 없이 폼 컨테이너가 그대로 유지됨
    expect(screen.getByTestId("mood-new-form")).toBeInTheDocument();
  });
});
