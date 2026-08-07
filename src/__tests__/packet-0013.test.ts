import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { calcMoodReport } from "@/lib/useAppData";
import type { MoodLog } from "@/lib/types";

/**
 * Packet 0013: 감정 리포트 `/report`
 *
 * AC-1[P0]: calcMoodReport(logs)로 평균 소진도(avg)를 계산해 SummaryHero에 표시
 * AC-2[P1]: 추이(trend)는 Sparkline으로, 상위 스트레스 태그(topTags)는 Chip 목록으로 표시
 * AC-3[P0]: ht_moodlogs 빈 배열 시 Asset.ContentIcon + "아직 기록이 없어요" + "기록 추가" 버튼 표시
 * AC-4[P0]: "기록 추가" 버튼 탭 시 navigate('/report/new') 이동
 *
 * Field contract expected from the implementation (ReportPage.tsx):
 * - Container: data-testid="report-page"
 * - 데이터 있을 때: SummaryHero(testId="mood-avg-hero")에 <Amount value={avg} unit="/5"/> 렌더 → 텍스트 "{avg}/5" 포함
 * - Sparkline: data-testid="mood-trend-sparkline", data={trend}
 * - 상위 태그: data-testid="mood-top-tags" 컨테이너 안에 topTags 각각 Chip(텍스트=tag)으로 렌더
 * - 빈 상태: data-testid="report-empty" (EmptyState) 안에 "아직 기록이 없어요" 텍스트 + "기록 추가" 버튼(role=button)
 * - 데이터 있을 때도 "기록 추가" 버튼(role=button, 접근성 이름 "기록 추가")이 존재
 * - storage: getMoodLogs = "@/lib/storage"
 */

mockAll();

const mockGetMoodLogs = vi.fn();

vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return {
    ...actual,
    getMoodLogs: (...args: unknown[]) => mockGetMoodLogs(...args),
  };
});

// NOTE: ReportPage.tsx does not exist yet (TDD red phase). Use require() instead of a
// static `import` so `tsc --noEmit` doesn't fail module resolution before the Coder
// creates the file — dynamic require() bypasses TS's static import-resolution check.
function renderReportPage() {
  const ReportPage = require("@/pages/ReportPage").default;
  return renderWithRouter(React.createElement(ReportPage));
}

const LOGS: MoodLog[] = [
  {
    id: "m1",
    holidayId: "2026-chuseok",
    exhaustionLevel: 3,
    stressTags: ["과한질문"],
    note: "첫날",
    createdAt: 1722000000000,
  },
  {
    id: "m2",
    holidayId: "2026-chuseok",
    exhaustionLevel: 5,
    stressTags: ["가사노동", "과한질문"],
    note: "둘째날",
    createdAt: 1722000003600,
  },
  {
    id: "m3",
    holidayId: "2026-chuseok",
    exhaustionLevel: 4,
    stressTags: ["일정불균형"],
    note: "마지막날",
    createdAt: 1722000007200,
  },
];

describe("감정 리포트 `/report`", () => {
  beforeEach(() => {
    mockGetMoodLogs.mockReturnValue([]);
  });

  it("AC-1[P0]: 기록이 있으면 calcMoodReport 기준 평균 소진도가 SummaryHero에 표시된다", () => {
    mockGetMoodLogs.mockReturnValue(LOGS);
    const expected = calcMoodReport(LOGS);
    expect(expected.avg).toBe(4);

    renderReportPage();

    expect(screen.getByTestId("report-page")).toBeInTheDocument();
    const hero = screen.getByTestId("mood-avg-hero");
    expect(hero).toHaveTextContent("4/5");
  });

  it("AC-2[P1]: 추이는 Sparkline으로, 상위 스트레스 태그는 Chip 목록으로 표시된다", () => {
    mockGetMoodLogs.mockReturnValue(LOGS);
    const expected = calcMoodReport(LOGS);
    expect(expected.trend).toEqual([3, 5, 4]);
    expect(expected.topTags[0]).toEqual({ tag: "과한질문", count: 2 });

    renderReportPage();

    const sparkline = screen.getByTestId("mood-trend-sparkline");
    expect(sparkline.tagName.toLowerCase()).toBe("svg");

    const tagsContainer = screen.getByTestId("mood-top-tags");
    expect(within(tagsContainer).getByText("과한질문")).toBeInTheDocument();
    expect(within(tagsContainer).getByText("가사노동")).toBeInTheDocument();
    expect(within(tagsContainer).getByText("일정불균형")).toBeInTheDocument();
  });

  it("AC-3[P0]: ht_moodlogs가 빈 배열이면 아이콘 + '아직 기록이 없어요' + '기록 추가' 버튼을 보여준다", () => {
    mockGetMoodLogs.mockReturnValue([]);

    renderReportPage();

    const empty = screen.getByTestId("report-empty");
    expect(within(empty).getByText("아직 기록이 없어요")).toBeInTheDocument();
    expect(
      within(empty).getByRole("button", { name: "기록 추가" }),
    ).toBeInTheDocument();
    // 빈 상태에서는 SummaryHero/Sparkline이 렌더되지 않는다
    expect(screen.queryByTestId("mood-avg-hero")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mood-trend-sparkline")).not.toBeInTheDocument();
  });

  it("AC-4[P0]: 빈 상태에서 '기록 추가' 버튼 탭 시 navigate('/report/new')로 이동한다", () => {
    mockGetMoodLogs.mockReturnValue([]);

    renderReportPage();

    fireEvent.click(screen.getByRole("button", { name: "기록 추가" }));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/report/new");
  });

  it("AC-4[P0]: 기록이 있는 상태에서도 '기록 추가' 버튼 탭 시 navigate('/report/new')로 이동한다", () => {
    mockGetMoodLogs.mockReturnValue(LOGS);

    renderReportPage();

    fireEvent.click(screen.getByRole("button", { name: "기록 추가" }));

    expect(mockNavigate).toHaveBeenCalledWith("/report/new");
  });

  it("AC-1[P0]: 기록 1건(태그 없음)이어도 평균 소진도가 정확히 표시된다(엣지)", () => {
    const singleLog: MoodLog[] = [
      {
        id: "m1",
        holidayId: "2026-chuseok",
        exhaustionLevel: 2,
        stressTags: [],
        note: "괜찮음",
        createdAt: 1722000000000,
      },
    ];
    mockGetMoodLogs.mockReturnValue(singleLog);
    const expected = calcMoodReport(singleLog);
    expect(expected.avg).toBe(2);
    expect(expected.topTags).toEqual([]);

    renderReportPage();

    expect(screen.getByTestId("mood-avg-hero")).toHaveTextContent("2/5");
    // 태그가 없으므로 상위 태그 컨테이너가 비어 있거나 렌더되지 않는다
    const tagsContainer = screen.queryByTestId("mood-top-tags");
    if (tagsContainer) {
      expect(tagsContainer.textContent).toBe("");
    }
  });
});
