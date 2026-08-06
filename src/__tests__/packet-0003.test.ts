import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { mockTds } from "@/__tests__/__helpers__/mocks";

mockTds();

// meta.ts — 순수 meta 읽기/쓰기 헬퍼 (아직 미구현 — red phase)
import { getMeta, setMeta, getDefaultHolidayId } from "@/lib/meta";
// HolidayContext — 전역 명절 컨텍스트 + quota AlertDialog 상태
import { HolidayProvider, useHoliday, reportQuotaExceeded } from "@/lib/HolidayContext";

const META_KEY = "ht.meta";

function Consumer() {
  const {
    currentHolidayId,
    setCurrentHoliday,
    aiNoticeAck,
    setAiNoticeAck,
    isPaid,
    setIsPaid,
  } = useHoliday();

  return React.createElement(
    "div",
    null,
    React.createElement("span", { "data-testid": "holiday-id" }, currentHolidayId),
    React.createElement("span", { "data-testid": "ai-notice-ack" }, String(aiNoticeAck)),
    React.createElement("span", { "data-testid": "is-paid" }, String(isPaid)),
    React.createElement(
      "button",
      { onClick: () => setCurrentHoliday("2026-seollal") },
      "명절전환",
    ),
    React.createElement("button", { onClick: () => setAiNoticeAck(true) }, "AI고지확인"),
    React.createElement("button", { onClick: () => setIsPaid(true) }, "결제완료"),
  );
}

function renderConsumer() {
  return render(React.createElement(HolidayProvider, null, React.createElement(Consumer)));
}

describe("명절 컨텍스트 + meta 상태 관리 (packet-0003)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("AC-1[P0]: 초기 진입 시 기본 holidayId = 다가오는 명절(2026-08-07 기준)", () => {
    it("AC-1[P0]: getDefaultHolidayId()는 2026-08-07 기준 가장 가까운 다가오는 명절(2026-chuseok)을 반환한다", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-07T00:00:00+09:00"));

      const result = getDefaultHolidayId();

      expect(result).toBe("2026-chuseok");
      expect(typeof result).toBe("string");
    });

    it("AC-1[P0]: ht.meta가 없을 때 useHoliday()의 currentHolidayId 기본값은 2026-chuseok이다", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-07T00:00:00+09:00"));

      renderConsumer();

      expect(screen.getByTestId("holiday-id").textContent).toBe("2026-chuseok");
      expect(getMeta().currentHolidayId).toBe("2026-chuseok");
    });
  });

  describe("AC-2[P0]: setCurrentHoliday 호출 시 ht.meta 저장 & 소비 컴포넌트 갱신", () => {
    it("AC-2[P0]: setCurrentHoliday('2026-chuseok') 호출 시 ht.meta.currentHolidayId가 저장된다", () => {
      setMeta({ aiNoticeAck: false, currentHolidayId: "2026-seollal", isPaid: false });

      const updated = setMeta({ aiNoticeAck: false, currentHolidayId: "2026-chuseok", isPaid: false });

      expect(updated.currentHolidayId).toBe("2026-chuseok");
      expect(getMeta().currentHolidayId).toBe("2026-chuseok");
    });

    it("AC-2[P0]: 소비 컴포넌트가 setCurrentHoliday 클릭 후 새 holidayId로 리렌더된다", () => {
      renderConsumer();
      const before = screen.getByTestId("holiday-id").textContent;

      fireEvent.click(screen.getByText("명절전환"));

      expect(screen.getByTestId("holiday-id").textContent).toBe("2026-seollal");
      expect(screen.getByTestId("holiday-id").textContent).not.toBe(before);
      const stored = JSON.parse(localStorage.getItem(META_KEY) ?? "{}");
      expect(stored.currentHolidayId).toBe("2026-seollal");
    });
  });

  describe("AC-3[P0]: aiNoticeAck/isPaid getter·setter가 ht.meta에 반영된다", () => {
    it("AC-3[P0]: setAiNoticeAck(true) 호출 시 ht.meta.aiNoticeAck가 true로 저장되고 화면에 반영된다", () => {
      renderConsumer();
      expect(screen.getByTestId("ai-notice-ack").textContent).toBe("false");

      fireEvent.click(screen.getByText("AI고지확인"));

      expect(screen.getByTestId("ai-notice-ack").textContent).toBe("true");
      const stored = JSON.parse(localStorage.getItem(META_KEY) ?? "{}");
      expect(stored.aiNoticeAck).toBe(true);
    });

    it("AC-3[P0]: setIsPaid(true) 호출 시 ht.meta.isPaid가 true로 저장되고 화면에 반영된다", () => {
      renderConsumer();
      expect(screen.getByTestId("is-paid").textContent).toBe("false");

      fireEvent.click(screen.getByText("결제완료"));

      expect(screen.getByTestId("is-paid").textContent).toBe("true");
      const stored = JSON.parse(localStorage.getItem(META_KEY) ?? "{}");
      expect(stored.isPaid).toBe(true);
    });
  });

  describe("AC-4[P0]: onQuotaExceeded 시 Provider가 AlertDialog 상태를 노출한다", () => {
    it("AC-4[P0]: reportQuotaExceeded() 호출 시 저장 공간 부족 AlertDialog가 표시된다", () => {
      renderConsumer();
      expect(screen.queryByRole("alertdialog")).toBeNull();

      act(() => {
        reportQuotaExceeded();
      });

      const dialog = screen.getByRole("alertdialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog.textContent).toContain("저장 공간이 부족합니다. 이전 명절 기록을 삭제해주세요");
    });

    it("AC-4[P0]: AlertDialog 닫기 버튼 클릭 시 alertdialog가 사라진다", () => {
      renderConsumer();
      act(() => {
        reportQuotaExceeded();
      });
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "닫기" }));

      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
  });
});
