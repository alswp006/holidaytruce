import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";

/**
 * 시즌권 결제 페이지 /paywall — packet 0012
 *
 * 구현 파일: src/pages/Paywall.tsx
 *
 * - data-testid="paywall-benefits" Card 안에 혜택 안내 + TossPurchase 버튼
 *   (role="button", accessible name에 "구매"|"결제" 포함).
 * - 결제 완료(IAP onEvent type=success) 시 useHoliday().setIsPaid(true) 호출 +
 *   성공 토스트(role="status") + 잠금 해제(paywall-benefits는 계속 렌더, 크래시 없음).
 * - 취소/실패(IAP onError) 시 setIsPaid는 true로 호출되지 않고(isPaid false 유지) +
 *   실패 안내 토스트(role="status") + 크래시 없음(paywall-benefits 계속 렌더).
 * - location.state 없이 직접 진입해도 크래시 없이 렌더된다.
 */

mockTds();
mockAppsInToss();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

const setIsPaidMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/HolidayContext", () => ({
  useHoliday: () => ({
    currentHolidayId: "2026-chuseok",
    setCurrentHoliday: vi.fn(),
    isPaid: false,
    setIsPaid: setIsPaidMock,
    aiNoticeAck: true,
    setAiNoticeAck: vi.fn(),
    reportQuotaExceeded: vi.fn(),
  }),
  HolidayProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import Paywall from "@/pages/Paywall";
import { IAP } from "@apps-in-toss/web-framework";

function clickPurchase() {
  fireEvent.click(screen.getByRole("button", { name: /구매|결제/ }));
}

describe("시즌권 결제 페이지 /paywall", () => {
  beforeEach(() => {
    setIsPaidMock.mockClear();
    vi.mocked(IAP.createOneTimePurchaseOrder).mockClear();
  });

  it("AC-1[P0]: 결제 완료 시 isPaid=true를 저장하고 성공 토스트를 띄운다", async () => {
    renderWithRouter(React.createElement(Paywall));

    clickPurchase();

    await waitFor(() => {
      expect(setIsPaidMock).toHaveBeenCalledWith(true);
    });
    expect(setIsPaidMock).toHaveBeenCalledTimes(1);

    const statuses = screen.getAllByRole("status");
    expect(statuses.map((el) => el.textContent).join(" ")).toMatch(/완료|해제/);
  });

  it("AC-1[P0]: 결제 완료 후에도 혜택 Card가 크래시 없이 계속 렌더된다(잠금 해제)", async () => {
    renderWithRouter(React.createElement(Paywall));

    clickPurchase();

    await waitFor(() => {
      expect(setIsPaidMock).toHaveBeenCalledWith(true);
    });
    expect(screen.getByTestId("paywall-benefits")).toBeInTheDocument();
  });

  it("AC-2[P0]: 취소/실패 시 isPaid는 true로 저장되지 않고 실패 토스트가 뜬다", async () => {
    vi.mocked(IAP.createOneTimePurchaseOrder).mockImplementationOnce((opts: any) => {
      opts.onError?.({ code: "USER_CANCELED" });
      return () => {};
    });

    renderWithRouter(React.createElement(Paywall));

    clickPurchase();

    await waitFor(() => {
      const statuses = screen.getAllByRole("status");
      expect(statuses.map((el) => el.textContent).join(" ")).toMatch(/취소|실패/);
    });
    expect(setIsPaidMock).not.toHaveBeenCalledWith(true);
  });

  it("AC-2[P0]: 취소/실패 후에도 페이지가 크래시 없이 그대로 유지된다", async () => {
    vi.mocked(IAP.createOneTimePurchaseOrder).mockImplementationOnce((opts: any) => {
      opts.onError?.({ code: "USER_CANCELED" });
      return () => {};
    });

    renderWithRouter(React.createElement(Paywall));

    clickPurchase();

    await waitFor(() => {
      expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    });
    expect(screen.getByTestId("paywall-benefits")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /구매|결제/ })).toBeInTheDocument();
  });

  it("AC-3[P0]: 혜택 Card(data-testid=paywall-benefits)와 TossPurchase 결제 버튼이 존재한다", () => {
    renderWithRouter(React.createElement(Paywall));

    expect(screen.getByTestId("paywall-benefits")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /구매|결제/ })).toBeInTheDocument();
  });

  it("AC-4[P1]: location.state 없이 /paywall에 직접 진입해도 크래시 없이 렌더된다", () => {
    renderWithRouter(React.createElement(Paywall), { initialEntries: ["/paywall"] });

    expect(screen.getByTestId("paywall-benefits")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /구매|결제/ })).toBeInTheDocument();
  });
});
