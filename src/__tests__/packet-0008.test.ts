import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { AppFlags, Script } from "@/lib/types";

/**
 * Packet 0008: 응대 스크립트 입력 페이지 `/script`
 *
 * AC-1[P0]: ht_flags.aiNoticeAcknowledged=false면 진입 시 AlertDialog
 *           "이 서비스는 생성형 AI를 활용합니다" 1회 표시, 확인 시 ht_flags.aiNoticeAcknowledged=true 저장
 * AC-2[P0]: "스크립트 만들기" 버튼 탭 → (TossRewardAd 광고 시청 완료 후) requestScript 호출,
 *           ok:true면 ht_scripts 저장 + navigate('/script/result',{state:{scriptId}}) + 토스트 "스크립트가 만들어졌어요"
 * AC-3[P1]: 빈 질문 제출 시 hasError + help "곤란했던 질문을 입력해주세요", API 호출 안 됨
 * AC-4[P1]: API 실패(ok:false) 시 AlertDialog "잠시 후 다시 시도해주세요" + "다시 시도" 버튼,
 *           제출 중 버튼 비활성·중복 제출 차단
 * AC-5[P1]: 기록 탭에서 ht_scripts 빈 배열 시 Asset.ContentIcon + "아직 만든 스크립트가 없어요"
 *
 * Field contract expected from the implementation (ScriptPage.tsx):
 * - Container(만들기 탭 폼): data-testid="script-form"
 * - Tab: role="tab" 이름 "만들기"(기본 선택) / "기록" — 클릭으로 만들기/기록 화면 전환
 * - 상황 Chip 그룹: SITUATIONS(from "@/lib/types")의 각 값 텍스트를 접근성 이름으로 갖는 버튼
 * - 톤 Chip 그룹: TONES(from "@/lib/types")의 각 값 텍스트를 접근성 이름으로 갖는 버튼
 * - TextField(question): placeholder="예: 결혼은 언제 할 거니?"
 * - 제출 버튼: 접근성 이름 "스크립트 만들기" (SubmitFooter, display="block")
 * - AI 고지 AlertDialog: title "이 서비스는 생성형 AI를 활용합니다", 확인 버튼 접근성 이름 "확인"
 * - 실패 AlertDialog: title "잠시 후 다시 시도해주세요", 버튼 접근성 이름 "다시 시도"
 * - 기록 빈 상태: Asset.ContentIcon(data-content-icon) + 텍스트 "아직 만든 스크립트가 없어요"
 * - requestScript: "@/lib/scriptApi"의 named export, { situation, tone, question } 형태로 호출
 * - storage: getFlags/saveFlags/getScripts/addScript/uuid ("@/lib/storage")
 */

mockAll();

const mockGetFlags = vi.fn();
const mockSaveFlags = vi.fn();
const mockGetScripts = vi.fn();
const mockAddScript = vi.fn();
const mockUuid = vi.fn();

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    getFlags: (...args: unknown[]) => mockGetFlags(...args),
    saveFlags: (...args: unknown[]) => mockSaveFlags(...args),
    getScripts: (...args: unknown[]) => mockGetScripts(...args),
    addScript: (...args: unknown[]) => mockAddScript(...args),
    uuid: (...args: unknown[]) => mockUuid(...args),
  };
});

const mockRequestScript = vi.fn();
vi.mock("@/lib/scriptApi", () => ({
  requestScript: (...args: unknown[]) => mockRequestScript(...args),
}));

// NOTE: ScriptPage.tsx does not exist yet (TDD red phase). Use require() instead of a
// static `import` so `tsc --noEmit` doesn't fail module resolution before the Coder
// creates the file — dynamic require() bypasses TS's static import-resolution check.
function renderScriptPage() {
  const ScriptPage = require("@/pages/ScriptPage").default;
  return renderWithRouter(React.createElement(ScriptPage));
}

function fillForm(question: string) {
  fireEvent.click(screen.getByRole("button", { name: "결혼계획질문" }));
  fireEvent.click(screen.getByRole("button", { name: "정중하게" }));
  fireEvent.change(screen.getByPlaceholderText("예: 결혼은 언제 할 거니?"), {
    target: { value: question },
  });
}

describe("응대 스크립트 입력 페이지 `/script`", () => {
  beforeEach(() => {
    mockGetFlags.mockReturnValue({
      aiNoticeAcknowledged: true,
      activeHolidayId: "2026-chuseok",
      purchasedHolidays: [],
    });
    mockSaveFlags.mockReturnValue({ ok: true });
    mockGetScripts.mockReturnValue([]);
    mockAddScript.mockReturnValue({ ok: true });
    mockUuid.mockReturnValue("script-uuid-1");
    mockRequestScript.mockResolvedValue({
      ok: true,
      data: { reply: "제가 알아서 할게요, 걱정 마세요", disclaimer: "AI 생성" },
    });
  });

  it("AC-1[P0]: aiNoticeAcknowledged=false면 AlertDialog 표시, 확인 시 true 저장", async () => {
    mockGetFlags.mockReturnValue({
      aiNoticeAcknowledged: false,
      activeHolidayId: "2026-chuseok",
      purchasedHolidays: [],
    });

    renderScriptPage();

    expect(
      screen.getByRole("alertdialog", { name: "이 서비스는 생성형 AI를 활용합니다" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => expect(mockSaveFlags).toHaveBeenCalledTimes(1));
    const savedFlags = mockSaveFlags.mock.calls[0][0] as AppFlags;
    expect(savedFlags.aiNoticeAcknowledged).toBe(true);
    expect(savedFlags.activeHolidayId).toBe("2026-chuseok");
  });

  it("AC-1[P0]: aiNoticeAcknowledged=true면 AlertDialog가 표시되지 않는다", () => {
    renderScriptPage();

    expect(
      screen.queryByRole("alertdialog", { name: "이 서비스는 생성형 AI를 활용합니다" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("script-form")).toBeInTheDocument();
  });

  it("AC-2[P0]: 유효한 입력 제출 시 requestScript 호출 → 성공하면 ht_scripts 저장 + navigate + 토스트", async () => {
    renderScriptPage();

    fillForm("애는 언제 낳니?");
    fireEvent.click(screen.getByRole("button", { name: "스크립트 만들기" }));

    await waitFor(() => expect(mockRequestScript).toHaveBeenCalledTimes(1));
    expect(mockRequestScript).toHaveBeenCalledWith({
      situation: "결혼계획질문",
      tone: "정중하게",
      question: "애는 언제 낳니?",
    });

    await waitFor(() => expect(mockAddScript).toHaveBeenCalledTimes(1));
    const savedScript = mockAddScript.mock.calls[0][0] as Script;
    expect(savedScript.id).toBe("script-uuid-1");
    expect(savedScript.resultText).toBe("제가 알아서 할게요, 걱정 마세요");
    expect(savedScript.isAi).toBe(true);

    await waitFor(() => expect(screen.getByText("스크립트가 만들어졌어요")).toBeInTheDocument());
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/script/result", {
        state: { scriptId: "script-uuid-1" },
      }),
    );
  });

  it("AC-2[P0]: 선택한 상황/톤(취업질문/단호하게)이 그대로 API 페이로드에 반영된다", async () => {
    renderScriptPage();

    fireEvent.click(screen.getByRole("button", { name: "취업질문" }));
    fireEvent.click(screen.getByRole("button", { name: "단호하게" }));
    fireEvent.change(screen.getByPlaceholderText("예: 결혼은 언제 할 거니?"), {
      target: { value: "취업은 언제 하니?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "스크립트 만들기" }));

    await waitFor(() => expect(mockRequestScript).toHaveBeenCalledTimes(1));
    expect(mockRequestScript).toHaveBeenCalledWith({
      situation: "취업질문",
      tone: "단호하게",
      question: "취업은 언제 하니?",
    });
  });

  it("AC-3[P1]: 빈 질문 제출 시 hasError + '곤란했던 질문을 입력해주세요' 표시, API 호출 안 됨", () => {
    renderScriptPage();

    fireEvent.click(screen.getByRole("button", { name: "결혼계획질문" }));
    fireEvent.click(screen.getByRole("button", { name: "정중하게" }));
    fireEvent.click(screen.getByRole("button", { name: "스크립트 만들기" }));

    expect(screen.getByText("곤란했던 질문을 입력해주세요")).toBeInTheDocument();
    expect(mockRequestScript).not.toHaveBeenCalled();
  });

  it("AC-4[P1]: API 실패(ok:false) 시 AlertDialog '잠시 후 다시 시도해주세요' + '다시 시도' 버튼 표시", async () => {
    mockRequestScript.mockResolvedValueOnce({ ok: false });

    renderScriptPage();

    fillForm("애는 언제 낳니?");
    fireEvent.click(screen.getByRole("button", { name: "스크립트 만들기" }));

    await waitFor(() =>
      expect(
        screen.getByRole("alertdialog", { name: "잠시 후 다시 시도해주세요" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(mockAddScript).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-4[P1]: 제출 중 버튼이 비활성화되어 중복 제출이 차단된다", async () => {
    let resolveRequest: (value: { ok: true; data: { reply: string; disclaimer: string } }) => void =
      () => {};
    mockRequestScript.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    renderScriptPage();

    fillForm("애는 언제 낳니?");
    const submitButton = screen.getByRole("button", { name: "스크립트 만들기" });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => expect(submitButton).toBeDisabled());
    expect(mockRequestScript).toHaveBeenCalledTimes(1);

    resolveRequest({ ok: true, data: { reply: "괜찮아요, 천천히 할게요", disclaimer: "AI 생성" } });
    await waitFor(() => expect(mockAddScript).toHaveBeenCalledTimes(1));
  });

  it("AC-5[P1]: 기록 탭에서 ht_scripts가 빈 배열이면 Asset.ContentIcon + '아직 만든 스크립트가 없어요' 표시", () => {
    mockGetScripts.mockReturnValue([]);

    renderScriptPage();

    fireEvent.click(screen.getByRole("tab", { name: "기록" }));

    expect(screen.getByText("아직 만든 스크립트가 없어요")).toBeInTheDocument();
    expect(document.querySelector("[data-content-icon]")).not.toBeNull();
  });
});
