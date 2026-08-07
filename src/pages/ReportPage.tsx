// NOTE: 이 페이지는 packet-0013 테스트의 `require("@/pages/ReportPage")` 동적 로드와
// 호환되어야 한다 — JSX 대신 createElement를 사용한다 (다른 페이지와 동일 이유).
import { createElement as h } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Chip, Button, Asset } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { SummaryHero } from "@/components/SummaryHero";
import { Amount } from "@/components/Amount";
import { Sparkline } from "@/components/Sparkline";
import { EmptyState } from "@/components/StateView";
import { getMoodLogs } from "@/lib/storage";
import { calcMoodReport } from "@/lib/useAppData";

export default function ReportPage() {
  const navigate = useNavigate();
  const logs = getMoodLogs();
  const { avg, trend, topTags } = calcMoodReport(logs);
  const isEmpty = logs.length === 0;

  function handleAdd() {
    navigate("/report/new");
  }

  const top = h(Top, { title: h(Top.TitleParagraph, null, "감정 리포트") });

  if (isEmpty) {
    const empty = h(EmptyState, {
      testId: "report-empty",
      icon: h(Asset.ContentIcon, { name: "characterEmptyfaceRegular", alt: "기록 없음" }),
      title: "아직 기록이 없어요",
      action: h(Button, { variant: "weak", display: "block", onClick: handleAdd }, "기록 추가"),
    });
    return h(ScreenScaffold, { top, children: empty });
  }

  const tagsSection =
    topTags.length > 0
      ? h(
          "div",
          {
            "data-testid": "mood-top-tags",
            style: { display: "flex", gap: 8, flexWrap: "wrap" },
          },
          topTags.map(({ tag }) => h(Chip, { key: tag, variant: "weak", children: tag })),
        )
      : null;

  const body = h(
    "div",
    { "data-testid": "report-page" },
    h(SummaryHero, {
      testId: "mood-avg-hero",
      label: "평균 소진도",
      value: h(Amount, { value: avg, unit: "/5", typography: "t1" }),
      caption: "최근 명절 추이",
    }),
    h(Spacing, { size: 16 }),
    h(Paragraph.Text, { typography: "t4" }, "소진 추이"),
    h(Spacing, { size: 12 }),
    h(Sparkline, { data: trend, testId: "mood-trend-sparkline" }),
    h(Spacing, { size: 16 }),
    h(Paragraph.Text, { typography: "t4" }, "주요 스트레스"),
    h(Spacing, { size: 12 }),
    tagsSection,
    h(Spacing, { size: 24 }),
  );

  return h(ScreenScaffold, {
    top,
    bottom: h(SubmitFooter, { label: "기록 추가", onClick: handleAdd }),
    children: body,
  });
}
