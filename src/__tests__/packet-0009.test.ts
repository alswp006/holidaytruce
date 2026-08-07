import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { setClipboardText } from "@apps-in-toss/web-framework";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { Script } from "@/lib/types";

/**
 * Packet 0009: 스크립트 결과 페이지 `/script/result`
 *
 * AC-1[P0]: location.state.scriptId로 ht_scripts에서 항목 조회, resultText를 결과 카드에 표시
 * AC-2[P0]: state가 없거나 scriptId에 해당하는 항목이 없으면 navigate('/script', { replace: true })
 *           로 리다이렉트, 크래시 없음
 * AC-3[P0]: 결과 카드 하단에 "AI가 생성한 결과입니다" 배지 표시
 * AC-4[P1]: 결과 텍스트 복사 시 setClipboardText 호출 + 토스트 "결과를 복사했어요" 표시,
 *           "다시 만들기" 버튼 탭 시 navigate('/script') 이동
 *
 * Field contract expected from the implementation (ScriptResultPage.tsx):
 * - 결과 카드 컨테이너: data-testid="script-result-card"
 * - 결과 텍스트: Script.resultText 그대로 화면에 표시
 * - AI 라벨: 텍스트 "AI가 생성한 결과입니다" (카드 하단)
 * - 복사 버튼: 접근성 이름 "결과 복사하기" — 클릭 시 setClipboardText(resultText) 호출,
 *   성공 후 Toast(role="status") 텍스트 "결과를 복사했어요"
 * - 다시 만들기 버튼: 접근성 이름 "다시 만들기" — 클릭 시 navigate("/script")
 * - state 없음/항목 없음: navigate("/script", { replace: true }) 호출, 예외 throw 없음
 * - storage: getScripts ("@/lib/storage")
 */

mockAll();

const mockGetScripts = vi.fn();

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    getScripts: (...args: unknown[]) => mockGetScripts(...args),
  };
});

// mockLocation.state is typed as `null` from its default value — widen for reassignment.
const location = mockLocation as { state: unknown };

const SAMPLE_SCRIPT: Script = {
  id: "script-1",
  situation: "결혼계획질문",
  tone: "정중하게",
  question: "애는 언제 낳니?",
  resultText: "제가 알아서 할게요, 걱정 마세요",
  createdAt: 1723000000000,
  isAi: true,
};

// NOTE: ScriptResultPage.tsx does not exist yet (TDD red phase). Use require() instead of a
// static `import` so `tsc --noEmit` doesn't fail module resolution before the Coder
// creates the file — dynamic require() bypasses TS's static import-resolution check.
function renderResultPage() {
  const ScriptResultPage = require("@/pages/ScriptResultPage").default;
  return renderWithRouter(React.createElement(ScriptResultPage));
}

describe("스크립트 결과 페이지 `/script/result`", () => {
  beforeEach(() => {
    mockGetScripts.mockReturnValue([SAMPLE_SCRIPT]);
    location.state = { scriptId: "script-1" };
  });

  it("AC-1[P0]: scriptId로 조회한 resultText를 결과 카드에 표시한다", () => {
    renderResultPage();

    expect(screen.getByTestId("script-result-card")).toBeInTheDocument();
    expect(screen.getByText("제가 알아서 할게요, 걱정 마세요")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-2[P0]: location.state가 없으면 navigate('/script', { replace: true })로 리다이렉트, 크래시 없음", () => {
    location.state = null;

    expect(() => renderResultPage()).not.toThrow();
    expect(mockNavigate).toHaveBeenCalledWith("/script", { replace: true });
    expect(screen.queryByTestId("script-result-card")).not.toBeInTheDocument();
  });

  it("AC-2[P0]: scriptId에 해당하는 항목이 ht_scripts에 없으면 navigate('/script', { replace: true })로 리다이렉트", () => {
    location.state = { scriptId: "missing-id" };
    mockGetScripts.mockReturnValue([SAMPLE_SCRIPT]);

    expect(() => renderResultPage()).not.toThrow();
    expect(mockNavigate).toHaveBeenCalledWith("/script", { replace: true });
    expect(screen.queryByTestId("script-result-card")).not.toBeInTheDocument();
  });

  it("AC-3[P0]: 결과 카드 하단에 'AI가 생성한 결과입니다' 배지가 표시된다", () => {
    renderResultPage();

    expect(screen.getByText("AI가 생성한 결과입니다")).toBeInTheDocument();
  });

  it("AC-4[P1]: 복사 버튼 탭 시 setClipboardText 호출 + 토스트 '결과를 복사했어요' 표시", async () => {
    renderResultPage();

    fireEvent.click(screen.getByRole("button", { name: "결과 복사하기" }));

    await waitFor(() => expect(setClipboardText).toHaveBeenCalledTimes(1));
    expect(setClipboardText).toHaveBeenCalledWith("제가 알아서 할게요, 걱정 마세요");

    await waitFor(() =>
      expect(screen.getByText("결과를 복사했어요")).toBeInTheDocument(),
    );
  });

  it("AC-4[P1]: '다시 만들기' 버튼 탭 시 navigate('/script')로 이동한다", () => {
    renderResultPage();

    fireEvent.click(screen.getByRole("button", { name: "다시 만들기" }));

    expect(mockNavigate).toHaveBeenCalledWith("/script");
  });
});
