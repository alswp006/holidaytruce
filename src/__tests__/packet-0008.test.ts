import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor, within } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";

/**
 * AI 응대 스크립트 페이지 /script — packet 0008
 *
 * 구현 파일: src/pages/Script.tsx
 *
 * 화면 계약(테스트가 강제하는 부분만):
 * - 상황 입력: 유일한 <input>(TDS TextField multiline 대체) → getByRole("textbox")로 조회.
 * - 톤 선택: TDS Chip/ChipItem 3개 — 라벨 그대로 "정중하게"/"단호하게"/"유머러스하게" 버튼.
 * - 제출 버튼: data-testid="script-submit-button" (SubmitFooter/FixedBottomCTA 기반, 로딩 중 disabled).
 * - 빈 입력 에러: 정확히 "상황을 입력해주세요" 텍스트 노출 + generateScript 미호출.
 * - 제출 성공 흐름: 유효성 통과 → TossRewardAd 게이트(onRewarded) → generateScript 호출 →
 *   결과를 data-testid="script-result-card" Card에 표시 + 그 안에 "AI가 생성한 결과입니다" Badge +
 *   addScript({situation, tone, result}) 호출(ht.scripts 저장) + 성공 토스트.
 * - 광고 게이트가 완료(onRewarded)되지 않으면 generateScript도 결과도 노출되지 않는다.
 * - API 실패: catch한 에러 메시지를 토스트로 노출 + 입력값(situation) 보존 + 크래시 없음.
 * - 로딩 중(generateScript pending): 제출 버튼 disabled + progressbar 스피너 노출 + 중복 제출 차단(1회만 호출).
 * - 첫 진입 시 aiNoticeAck===false → AlertDialog(role="alertdialog") 1회 노출, 확인 클릭 시
 *   setAiNoticeAck(true) 호출 + 다이얼로그 닫힘. aiNoticeAck===true면 다이얼로그 미노출.
 */

mockTds();
mockAppsInToss();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── HolidayContext 더블 — aiNoticeAck을 테스트별로 제어 ──
const holidayState = vi.hoisted(() => ({
  aiNoticeAck: true,
  setAiNoticeAck: vi.fn(),
}));

vi.mock("@/lib/HolidayContext", () => ({
  useHoliday: () => ({
    currentHolidayId: "2026-chuseok",
    setCurrentHoliday: vi.fn(),
    isPaid: true,
    setIsPaid: vi.fn(),
    aiNoticeAck: holidayState.aiNoticeAck,
    setAiNoticeAck: holidayState.setAiNoticeAck,
    reportQuotaExceeded: vi.fn(),
  }),
  HolidayProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── storage 더블 — addScript만 spy, 나머지는 실제 구현 유지 ──
const addScriptMock = vi.hoisted(() => vi.fn((input: any) => ({ ...input, id: "script-1", createdAt: 0 })));

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return { ...actual, addScript: addScriptMock };
});

// ── API 클라이언트 더블 ──
class MockApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const generateScriptMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  generateScript: generateScriptMock,
  ApiError: MockApiError,
}));

// ── TossRewardAd 더블 — shouldReward로 광고 완료/중단(대기)을 제어 ──
const rewardAdState = vi.hoisted(() => ({ shouldReward: true }));

vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: ({ children, onRewarded }: any) => {
    React.useEffect(() => {
      if (rewardAdState.shouldReward) {
        onRewarded?.();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    if (!rewardAdState.shouldReward) {
      return React.createElement("div", { "data-testid": "reward-ad-pending" }, "광고 시청 중");
    }
    return children ?? null;
  },
}));

import Script from "@/pages/Script";

function fillValidForm(situation = "명절마다 취업 언제 하냐고 물어봐서 힘들어요") {
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: situation } });
  fireEvent.click(screen.getByRole("button", { name: "단호하게" }));
  return input;
}

describe("AI 응대 스크립트 페이지 /script", () => {
  beforeEach(() => {
    holidayState.aiNoticeAck = true;
    holidayState.setAiNoticeAck.mockClear();
    addScriptMock.mockClear();
    generateScriptMock.mockReset();
    mockNavigate.mockClear();
    rewardAdState.shouldReward = true;
  });

  afterEach(() => {
    rewardAdState.shouldReward = true;
  });

  it("AC-1[P0]: 광고 시청 완료 후 결과 Card·AI Badge·성공 토스트가 노출되고 ht.scripts에 저장된다", async () => {
    generateScriptMock.mockResolvedValueOnce({
      result: "명절에 취업 얘기 나오면 이렇게 답해보세요: 저도 열심히 준비 중이에요.",
      model: "claude-3-5-sonnet-20241022",
    });

    renderWithRouter(React.createElement(Script));
    fillValidForm("명절마다 취업 언제 하냐고 물어봐서 힘들어요");

    fireEvent.click(screen.getByTestId("script-submit-button"));

    const resultCard = await waitFor(() => screen.getByTestId("script-result-card"));
    expect(within(resultCard).getByText(/AI가 생성한 결과입니다/)).toBeInTheDocument();
    expect(within(resultCard).getByText(/열심히 준비 중이에요/)).toBeInTheDocument();

    expect(addScriptMock).toHaveBeenCalledTimes(1);
    expect(addScriptMock).toHaveBeenCalledWith({
      situation: "명절마다 취업 언제 하냐고 물어봐서 힘들어요",
      tone: "단호하게",
      result: "명절에 취업 얘기 나오면 이렇게 답해보세요: 저도 열심히 준비 중이에요.",
    });

    const statuses = screen.getAllByRole("status");
    const toastText = statuses.map((el) => el.textContent).join(" ");
    expect(toastText).toMatch(/저장|생성|완료/);
  });

  it("AC-1[P0]: 광고 시청이 완료(onRewarded)되지 않으면 generateScript도 결과도 노출되지 않는다", async () => {
    rewardAdState.shouldReward = false;
    generateScriptMock.mockResolvedValueOnce({ result: "숨겨진 결과", model: "claude-3-5-sonnet-20241022" });

    renderWithRouter(React.createElement(Script));
    fillValidForm();
    fireEvent.click(screen.getByTestId("script-submit-button"));

    await waitFor(() => expect(screen.getByTestId("reward-ad-pending")).toBeInTheDocument());

    expect(generateScriptMock).not.toHaveBeenCalled();
    expect(addScriptMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("script-result-card")).not.toBeInTheDocument();
  });

  it("AC-2[P0]: 첫 이용(aiNoticeAck=false)이면 AI 고지 AlertDialog가 1회 노출되고 확인 시 setAiNoticeAck(true)가 호출된다", () => {
    holidayState.aiNoticeAck = false;
    renderWithRouter(React.createElement(Script));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/AI/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button"));

    expect(holidayState.setAiNoticeAck).toHaveBeenCalledTimes(1);
    expect(holidayState.setAiNoticeAck).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("AC-2: aiNoticeAck=true이면 AI 고지 AlertDialog가 노출되지 않는다", () => {
    holidayState.aiNoticeAck = true;
    renderWithRouter(React.createElement(Script));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("AC-3[P0]: 빈 입력으로 제출하면 '상황을 입력해주세요' 에러가 노출되고 generateScript는 호출되지 않는다", () => {
    renderWithRouter(React.createElement(Script));

    fireEvent.click(screen.getByRole("button", { name: "정중하게" }));
    fireEvent.click(screen.getByTestId("script-submit-button"));

    expect(screen.getByText("상황을 입력해주세요")).toBeInTheDocument();
    expect(generateScriptMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("script-result-card")).not.toBeInTheDocument();
  });

  it("AC-4[P0]: API 실패(500) 시 에러 토스트가 뜨고 입력값이 보존되며 크래시 없이 렌더를 유지한다", async () => {
    generateScriptMock.mockRejectedValueOnce(
      new MockApiError("서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요", 500),
    );

    renderWithRouter(React.createElement(Script));
    const input = fillValidForm("설날에 결혼은 언제 하냐고 계속 물어봐요");
    fireEvent.click(screen.getByTestId("script-submit-button"));

    await waitFor(() =>
      expect(screen.getByText("서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요")).toBeInTheDocument(),
    );

    expect((input as HTMLInputElement).value).toBe("설날에 결혼은 언제 하냐고 계속 물어봐요");
    expect(screen.queryByTestId("script-result-card")).not.toBeInTheDocument();
    expect(addScriptMock).not.toHaveBeenCalled();
  });

  it("AC-4[P0]: 로딩 중에는 제출 버튼이 비활성화되고 스피너가 노출되며 중복 제출이 차단된다(generateScript 1회만 호출)", async () => {
    let resolveFn: (v: { result: string; model: string }) => void = () => {};
    generateScriptMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFn = resolve;
        }),
    );

    renderWithRouter(React.createElement(Script));
    fillValidForm();

    const submitButton = screen.getByTestId("script-submit-button");
    fireEvent.click(submitButton);

    await waitFor(() => expect(submitButton).toBeDisabled());
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    // 로딩 중 재클릭 — 비활성 버튼이라 추가 호출이 발생하면 안 된다
    fireEvent.click(submitButton);
    expect(generateScriptMock).toHaveBeenCalledTimes(1);

    resolveFn({ result: "완성된 스크립트", model: "claude-3-5-sonnet-20241022" });
    await waitFor(() => expect(screen.getByTestId("script-result-card")).toBeInTheDocument());
  });
});
