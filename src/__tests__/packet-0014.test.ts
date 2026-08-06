import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();

import { HomeBanner } from "@/components/HomeBanner";
import { usePromotionReward } from "@/hooks/usePromotionReward";
import { grantPromotionReward } from "@apps-in-toss/web-framework";

const grantPromotionRewardMock = vi.mocked(grantPromotionReward);

describe("홈 배너 광고 + 프로모션 리워드 + 최종 UX 폴리시", () => {
  beforeEach(() => {
    cleanup();
  });

  // ── AC-1: 홈 배너가 요약 Card 아래 비겹침 배치 ──
  it("AC-1[P0]: HomeBanner는 요약 Card 뒤(document order)에 렌더되고 fixed/absolute로 겹치지 않는다", () => {
    render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement("div", { "data-testid": "summary-card" }, "요약 카드"),
        React.createElement(HomeBanner, { adGroupId: "home-banner-slot" }),
      ),
    );

    const card = screen.getByTestId("summary-card");
    const banner = screen.getByTestId("home-banner");

    // 카드 다음에 오는 형제 요소여야 시각적으로 겹치지 않는다 (document flow)
    expect(card.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(banner.style.position).not.toBe("fixed");
    expect(banner.style.position).not.toBe("absolute");
  });

  it("AC-1: HomeBanner는 전달받은 adGroupId로 AdSlot을 렌더하고 카드와 겹치지 않도록 상단 여백을 확보한다", () => {
    render(React.createElement(HomeBanner, { adGroupId: "home-banner-slot" }));

    const banner = screen.getByTestId("home-banner");
    const adSlot = banner.querySelector('[data-ad-group-id="home-banner-slot"]');

    expect(adSlot).toBeInTheDocument();
    expect(Number.parseInt(banner.style.marginTop || "0", 10)).toBeGreaterThanOrEqual(12);
  });

  // ── AC-2: grantPromotionReward 호출 전 amount>5000 차단 ──
  it("AC-2[P0]: amount<=5000이면 grantPromotionReward를 정확한 인자로 호출하고 granted:true를 반환한다", async () => {
    const { result } = renderHook(() => usePromotionReward());

    let outcome: { granted: boolean; blocked?: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.grantReward({ promotionCode: "FIRST_USE", amount: 1000 });
    });

    expect(grantPromotionRewardMock).toHaveBeenCalledWith({ promotionCode: "FIRST_USE", amount: 1000 });
    expect(grantPromotionRewardMock).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ granted: true });
  });

  it("AC-2[P0]: amount>5000이면 grantPromotionReward를 호출하지 않고 granted:false, blocked:true를 반환한다", async () => {
    const { result } = renderHook(() => usePromotionReward());

    let outcome: { granted: boolean; blocked?: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.grantReward({ promotionCode: "ABUSE_CODE", amount: 6000 });
    });

    expect(grantPromotionRewardMock).not.toHaveBeenCalled();
    expect(outcome).toEqual({ granted: false, blocked: true });
  });

  // ── AC-3: 다크모드·44px 터치타겟·safe-area 준수 ──
  it("AC-3: HomeBanner는 최소 44px 영역을 확보하고 하드코딩된 HEX 색상을 사용하지 않는다", () => {
    render(React.createElement(HomeBanner, { adGroupId: "home-banner-slot" }));

    const banner = screen.getByTestId("home-banner");

    expect(Number.parseInt(banner.style.minHeight || "0", 10)).toBeGreaterThanOrEqual(44);
    expect(banner.getAttribute("style") ?? "").not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  // ── AC-4: 프로덕션 빌드 console.error 0개 ──
  it("AC-4[P0]: HomeBanner 마운트 시 SDK가 WebView 밖에서 예외를 던져도 console.error를 호출하지 않는다", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(React.createElement(HomeBanner, { adGroupId: "home-banner-slot" }));

    expect(screen.getByTestId("home-banner")).toBeInTheDocument();
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("AC-4[P0]: grantPromotionReward가 WebView 밖에서 throw해도 usePromotionReward가 이를 삼키고 console.error 없이 granted:false를 반환한다", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    grantPromotionRewardMock.mockImplementationOnce(() => {
      throw new Error("no native bridge");
    });

    const { result } = renderHook(() => usePromotionReward());

    let outcome: { granted: boolean; blocked?: boolean } | undefined;
    await act(async () => {
      outcome = await result.current.grantReward({ promotionCode: "FIRST_USE", amount: 1000 });
    });

    expect(outcome).toEqual({ granted: false });
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
