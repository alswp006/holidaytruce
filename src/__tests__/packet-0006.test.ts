import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { HOLIDAYS } from "@/lib/holidays";
import type { Couple, AppFlags } from "@/lib/types";

/**
 * Packet 0006: 초기 설정 페이지 `/setup`
 *
 * AC-1[P0]: { myRole, myFamilyLabel, partnerFamilyLabel } 제출 시 ht_couple 저장,
 *           토스트 "설정이 저장되었어요" 후 navigate('/', {replace:true})
 * AC-2[P0]: 명절 Chip 탭 시 ht_flags.activeHolidayId 저장 (예: 2026-chuseok)
 * AC-3[P1]: 빈 호칭 제출 시 TextField hasError + help "호칭을 입력해주세요", 저장 차단
 * AC-4[P1]: QuotaExceededError 시 AlertDialog "저장 공간이 부족해요. 기록을 정리해주세요", 크래시 없음
 * AC-5[P1]: 로드 중 스켈레톤, 이미 설정됨이면 /로 리다이렉트, 프로모션 관련 UI 미노출
 *
 * Field contract expected from the implementation (SetupPage.tsx):
 * - Container: data-testid="setup-form"
 * - Role Chip 그룹: 텍스트 "며느리" | "사위" | "아내" | "남편"
 * - 명절 Chip 그룹: HOLIDAYS(from "@/lib/holidays")의 각 holiday.name 텍스트
 * - TextField(myFamilyLabel): placeholder="예: 친정"
 * - TextField(partnerFamilyLabel): placeholder="예: 시댁"
 * - 저장 버튼: 접근성 이름 "설정 저장하기" (display="block")
 */

mockAll();

const mockGetCouple = vi.fn();
const mockSaveCouple = vi.fn();
const mockGetFlags = vi.fn();
const mockSaveFlags = vi.fn();

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    getCouple: (...args: unknown[]) => mockGetCouple(...args),
    saveCouple: (...args: unknown[]) => mockSaveCouple(...args),
    getFlags: (...args: unknown[]) => mockGetFlags(...args),
    saveFlags: (...args: unknown[]) => mockSaveFlags(...args),
  };
});

// NOTE: SetupPage.tsx does not exist yet (TDD red phase). Use require() instead of a
// static `import` so `tsc --noEmit` doesn't fail module resolution before the Coder
// creates the file — dynamic require() bypasses TS's static import-resolution check.
function renderSetupPage() {
  const SetupPage = require("@/pages/SetupPage").default;
  return renderWithRouter(React.createElement(SetupPage));
}

function fillAndSubmit(role: string, myLabel: string, partnerLabel: string) {
  fireEvent.click(screen.getByRole("button", { name: role }));
  fireEvent.change(screen.getByPlaceholderText("예: 친정"), { target: { value: myLabel } });
  fireEvent.change(screen.getByPlaceholderText("예: 시댁"), { target: { value: partnerLabel } });
  fireEvent.click(screen.getByRole("button", { name: "설정 저장하기" }));
}

describe("초기 설정 페이지 `/setup`", () => {
  beforeEach(() => {
    mockGetCouple.mockReturnValue(null);
    mockGetFlags.mockReturnValue(null);
    mockSaveCouple.mockReturnValue({ ok: true });
    mockSaveFlags.mockReturnValue({ ok: true });
  });

  it("AC-1[P0]: 유효한 정보 제출 시 ht_couple 저장 + 토스트 + navigate('/', {replace:true})", async () => {
    renderSetupPage();

    fillAndSubmit("며느리", "친정", "시댁");

    await waitFor(() => expect(mockSaveCouple).toHaveBeenCalledTimes(1));
    const savedCouple = mockSaveCouple.mock.calls[0][0] as Couple;
    expect(savedCouple.myRole).toBe("며느리");
    expect(savedCouple.myFamilyLabel).toBe("친정");
    expect(savedCouple.partnerFamilyLabel).toBe("시댁");
    expect(typeof savedCouple.id).toBe("string");
    expect(savedCouple.id.length).toBeGreaterThan(0);

    await waitFor(() => expect(screen.getByText("설정이 저장되었어요")).toBeInTheDocument());
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true }),
    );
  });

  it("AC-1[P0]: 선택한 역할(사위)과 입력값이 그대로 저장된다", async () => {
    renderSetupPage();

    fillAndSubmit("사위", "본가", "처가");

    await waitFor(() => expect(mockSaveCouple).toHaveBeenCalledTimes(1));
    const savedCouple = mockSaveCouple.mock.calls[0][0] as Couple;
    expect(savedCouple.myRole).toBe("사위");
    expect(savedCouple.myFamilyLabel).toBe("본가");
    expect(savedCouple.partnerFamilyLabel).toBe("처가");
  });

  it("AC-2[P0]: 명절 Chip(2026 추석) 탭 시 ht_flags.activeHolidayId = '2026-chuseok' 저장", () => {
    renderSetupPage();

    const chuseok = HOLIDAYS.find((h) => h.id === "2026-chuseok")!;
    fireEvent.click(screen.getByRole("button", { name: chuseok.name }));

    expect(mockSaveFlags).toHaveBeenCalledTimes(1);
    const savedFlags = mockSaveFlags.mock.calls[0][0] as AppFlags;
    expect(savedFlags.activeHolidayId).toBe("2026-chuseok");
  });

  it("AC-2[P0]: 명절 Chip(2026 설날) 탭 시 ht_flags.activeHolidayId = '2026-lunar-new-year' 저장", () => {
    renderSetupPage();

    const seollal = HOLIDAYS.find((h) => h.id === "2026-lunar-new-year")!;
    fireEvent.click(screen.getByRole("button", { name: seollal.name }));

    expect(mockSaveFlags).toHaveBeenCalledTimes(1);
    const savedFlags = mockSaveFlags.mock.calls[0][0] as AppFlags;
    expect(savedFlags.activeHolidayId).toBe("2026-lunar-new-year");
  });

  it("AC-3[P1]: 빈 호칭 제출 시 hasError + '호칭을 입력해주세요' 표시, 저장 차단", () => {
    renderSetupPage();

    fireEvent.click(screen.getByRole("button", { name: "며느리" }));
    fireEvent.change(screen.getByPlaceholderText("예: 시댁"), { target: { value: "시댁" } });
    // 내 호칭(myFamilyLabel)은 비워둔 채 제출
    fireEvent.click(screen.getByRole("button", { name: "설정 저장하기" }));

    expect(screen.getByText("호칭을 입력해주세요")).toBeInTheDocument();
    expect(mockSaveCouple).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-4[P1]: QuotaExceededError 시 AlertDialog 표시, 크래시 없음", async () => {
    mockSaveCouple.mockReturnValue({ ok: false, reason: "quota" });
    renderSetupPage();

    fillAndSubmit("아내", "본가", "시댁");

    await waitFor(() =>
      expect(
        screen.getByRole("alertdialog", { name: "저장 공간이 부족해요. 기록을 정리해주세요" }),
      ).toBeInTheDocument(),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    // 크래시 없이 폼 컨테이너가 그대로 유지됨
    expect(screen.getByTestId("setup-form")).toBeInTheDocument();
  });

  it("AC-5[P1]: 이미 ht_couple이 있으면 로드 후 '/'로 replace 리다이렉트", async () => {
    mockGetCouple.mockReturnValue({
      id: "existing-1",
      myRole: "남편",
      myFamilyLabel: "본가",
      partnerFamilyLabel: "처가",
      createdAt: 1700000000000,
    });

    renderSetupPage();

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true }),
    );
  });

  it("AC-5[P1]: 프로모션 관련 UI를 노출하지 않는다", () => {
    renderSetupPage();

    expect(screen.getByTestId("setup-form")).toBeInTheDocument();
    expect(screen.queryByText(/포인트|리워드|프로모션/)).not.toBeInTheDocument();
  });
});
