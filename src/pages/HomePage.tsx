// NOTE: 이 페이지는 packet-0007 테스트의 `require("@/pages/HomePage")` 동적 로드와
// 호환되어야 한다 — Node(v23+)의 네이티브 TS 타입 스트리핑은 타입 어노테이션만 지우고
// JSX는 지우지 못한다(erasable syntax 아님). JSX 문법을 쓰면 그 require()가
// "Unexpected token '{'"로 즉시 깨진다. 그래서 JSX 대신 React.createElement를 쓴다
// (src/pages/SetupPage.tsx도 같은 이유로 JSX를 피한다).
import { useState } from "react";
import { createElement as h, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ListRow, Chip, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { Card } from "@/components/Card";
import { Amount } from "@/components/Amount";
import { MiniBar } from "@/components/MiniBar";
import { AdSlot } from "@/components/AdSlot";
import { TossPurchase } from "@/components/TossPurchase";
import { getFlags, getVisits, getBudget, getChecklist, saveFlags } from "@/lib/storage";
import { calcBalance, calcBudget, calcChecklistProgress, isImbalanced, isPremium } from "@/lib/useAppData";
import { getDday, getHolidayById } from "@/lib/holidays";
import type { AppFlags } from "@/lib/types";
import "@/styles/home-purchase.css";

const AD_GROUP_ID = (import.meta.env?.VITE_TOSS_AD_GROUP_ID as string | undefined) ?? "holidaytruce-home-banner";
const IAP_SKU = (import.meta.env?.VITE_TOSS_IAP_SKU as string | undefined) ?? "holidaytruce-premium-season";

// Card 내 ListRow.Texts 인라인 서브텍스트 — 전체 섹션 EmptyState(StateView)가 아니라
// 요약 카드 한 줄 라벨이라 packet-0007 테스트 계약(getAllByText)과 일치해야 함.
const EMPTY_TEXT = "아직 데이터가 없어요"; // gate-allow: summary-card 인라인 라벨(전체 EmptyState 아님)

function fireTickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/jsdom)에서는 throw — 무시 */
  }
}

export default function HomePage() {
  const navigate = useNavigate();
  const [flags, setFlags] = useState(() => getFlags());
  const [visits] = useState(() => getVisits());
  const [budget] = useState(() => getBudget());
  const [checklist] = useState(() => getChecklist());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeHolidayId = flags?.activeHolidayId ?? "";
  const holiday = activeHolidayId ? getHolidayById(activeHolidayId) : null;
  const dday = activeHolidayId ? getDday(activeHolidayId) : null;
  const premium = isPremium(flags, activeHolidayId);

  const hasVisits = visits.length > 0;
  const hasBudget = budget.length > 0;
  const hasChecklist = checklist.length > 0;

  const balance = calcBalance(visits);
  const budgetSummary = calcBudget(budget);
  const checklistProgress = calcChecklistProgress(checklist);
  const imbalanced = isImbalanced(balance.minePct) || isImbalanced(balance.partnerPct);

  function goTo(path: string) {
    fireTickWeak();
    navigate(path);
  }

  function handlePurchased() {
    const current = getFlags();
    const purchasedHolidays = current?.purchasedHolidays ?? [];
    const nextFlags: AppFlags = {
      aiNoticeAcknowledged: current?.aiNoticeAcknowledged ?? false,
      activeHolidayId: current?.activeHolidayId ?? activeHolidayId,
      purchasedHolidays: purchasedHolidays.includes(activeHolidayId)
        ? purchasedHolidays
        : [...purchasedHolidays, activeHolidayId],
    };
    saveFlags(nextFlags);
    setFlags(nextFlags);
    setToastMessage("프리미엄이 활성화됐어요");
  }

  function handlePurchaseError() {
    setToastMessage("결제가 완료되지 않았어요");
  }

  const heroValue =
    dday != null
      ? h(Amount, { value: Math.abs(dday), unit: dday < 0 ? "일 지났어요" : "일 남음", typography: "t1" })
      : h(Paragraph.Text, { typography: "t2" }, "명절을 설정해주세요");

  const topTitle = holiday && dday != null ? `${holiday.name}까지 D-${dday}` : "홈";

  const top = h(Top, { title: h(Top.TitleParagraph, null, topTitle) });

  const hero = h(SummaryHero, {
    label: holiday?.name ?? "명절",
    value: heroValue,
    caption: "가족 균형을 준비해요",
    testId: "dday-hero",
  });

  const balanceCard = h(Card, {
    testId: "summary-card",
    children: [
      h(Paragraph.Text, { key: "label", typography: "t4" }, "일정 균형"),
      h(Spacing, { key: "s1", size: 12 }),
      h(MiniBar, { key: "bar", ratio: balance.minePct / 100, testId: "balance-bar" }),
      h(Spacing, { key: "s2", size: 12 }),
      h(ListRow, {
        key: "row",
        "data-testid": "nav-calendar",
        onClick: () => goTo("/calendar"),
        contents: h(ListRow.Texts, {
          type: "2RowTypeA",
          top: hasVisits ? `본가 ${balance.minePct}% · 시댁 ${balance.partnerPct}%` : "일정을 기록해보세요",
          bottom: hasVisits ? (imbalanced ? "한쪽에 몰려 있어요" : "균형이 잘 맞아요") : EMPTY_TEXT,
        }),
        right:
          hasVisits && imbalanced
            ? h(Chip, { kind: "action", variant: "fill", children: "조율 필요" })
            : undefined,
      }),
    ],
  });

  const budgetCard = h(Card, {
    testId: "summary-card",
    children: [
      h(ListRow, {
        key: "budget-row",
        "data-testid": "nav-budget",
        onClick: () => goTo("/budget"),
        contents: h(ListRow.Texts, {
          type: "2RowTypeA",
          top: "예산 총액",
          bottom: hasBudget ? h(Amount, { value: budgetSummary.total, unit: "원", typography: "t5" }) : EMPTY_TEXT,
        }),
      }),
      h(ListRow, {
        key: "checklist-row",
        contents: h(ListRow.Texts, {
          type: "2RowTypeA",
          top: "체크리스트",
          bottom: hasChecklist
            ? `${checklistProgress.completed}/${checklistProgress.total} 완료 · ${checklistProgress.percentage}%`
            : EMPTY_TEXT,
        }),
      }),
    ],
  });

  const scriptCard = h(Card, {
    testId: "summary-card",
    children: h(ListRow, {
      "data-testid": "nav-script",
      onClick: () => goTo("/script"),
      contents: h(ListRow.Texts, { type: "2RowTypeA", top: "응대 스크립트", bottom: "상황별 답변을 준비해요" }),
    }),
  });

  const reportCard = h(Card, {
    testId: "summary-card",
    children: h(ListRow, {
      "data-testid": "nav-report",
      onClick: () => goTo("/report"),
      contents: h(ListRow.Texts, { type: "2RowTypeA", top: "명절 리포트", bottom: "이번 명절 기분을 기록해요" }),
    }),
  });

  const adSlot = !premium
    ? h(Fragment, null, h(AdSlot, { adGroupId: AD_GROUP_ID }), h(Spacing, { size: 16 }))
    : null;

  const purchaseButton = h(
    TossPurchase,
    {
      sku: IAP_SKU,
      processProductGrant: async () => true,
      onPurchased: handlePurchased,
      onError: handlePurchaseError,
    },
    "이번 명절 프리미엄",
  );

  const toast = h(Toast, {
    open: toastMessage !== null,
    text: toastMessage ?? "",
    position: "bottom",
    onClose: () => setToastMessage(null),
  });

  return h(ScreenScaffold, {
    top,
    children: [
      hero,
      h(Spacing, { key: "s1", size: 24 }),
      balanceCard,
      h(Spacing, { key: "s2", size: 12 }),
      budgetCard,
      h(Spacing, { key: "s3", size: 12 }),
      scriptCard,
      h(Spacing, { key: "s4", size: 12 }),
      reportCard,
      h(Spacing, { key: "s5", size: 24 }),
      adSlot,
      purchaseButton,
      h(Spacing, { key: "s6", size: 24 }),
      toast,
    ],
  });
}
