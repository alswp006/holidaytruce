// NOTE: 이 페이지는 packet-0011 테스트의 `require("@/pages/BudgetPage")` 동적 로드와
// 호환되어야 한다 — Node(v23+)의 네이티브 TS 타입 스트리핑은 타입 어노테이션만 지우고
// JSX는 지우지 못한다(erasable syntax 아님). JSX 문법을 쓰면 그 require()가
// "Unexpected token '{'"로 즉시 깨진다. 그래서 JSX 대신 React.createElement를 쓴다
// (src/pages/CalendarPage.tsx도 같은 이유로 JSX를 피한다).
import { useState } from "react";
import { createElement as h, Fragment } from "react";
import type { ChangeEvent } from "react";
import {
  Top,
  Tab,
  Paragraph,
  Spacing,
  ListRow,
  Chip,
  TextField,
  Button,
  Switch,
  BottomSheet,
  Toast,
  Asset,
} from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { CountUp } from "@/components/CountUp";
import { Card } from "@/components/Card";
import { MiniBar } from "@/components/MiniBar";
import { EmptyState } from "@/components/StateView";
import {
  getBudget,
  addBudgetItem,
  getChecklist,
  toggleChecklist,
  getFlags,
  uuid,
} from "@/lib/storage";
import { calcBudget, calcChecklistProgress } from "@/lib/useAppData";
import { formatNumber } from "@/lib/utils";
import type { BudgetItem, ChecklistItem } from "@/lib/types";

const TARGETS: BudgetItem["target"][] = ["본가", "시댁", "기타"];
const CATEGORIES: BudgetItem["category"][] = ["용돈", "선물", "교통", "기타"];

function fireHaptic(type: "success" | "tickWeak") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/jsdom)에서는 throw — 무시 */
  }
}

export default function BudgetPage() {
  const [flags] = useState(() => getFlags());
  const [budget, setBudget] = useState<BudgetItem[]>(() => getBudget());
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => getChecklist());

  const [tab, setTab] = useState<"budget" | "checklist">("budget");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [target, setTarget] = useState<BudgetItem["target"]>("본가");
  const [category, setCategory] = useState<BudgetItem["category"]>("용돈");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeHolidayId = flags?.activeHolidayId ?? "";
  const activeBudget = budget.filter((item) => item.holidayId === activeHolidayId);
  const activeChecklist = checklist.filter((item) => item.holidayId === activeHolidayId);

  const summary = calcBudget(activeBudget);
  const progress = calcChecklistProgress(activeChecklist);

  function resetForm() {
    setTarget("본가");
    setCategory("용돈");
    setLabel("");
    setAmount("");
    setAmountError(false);
  }

  function openSheet() {
    fireHaptic("tickWeak");
    resetForm();
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
  }

  function selectTarget(value: BudgetItem["target"]) {
    fireHaptic("tickWeak");
    setTarget(value);
  }

  function selectCategory(value: BudgetItem["category"]) {
    fireHaptic("tickWeak");
    setCategory(value);
  }

  function handleSubmit() {
    const amountValue = Number(amount);
    const invalid = amount.trim() === "" || !Number.isInteger(amountValue) || amountValue < 0;
    setAmountError(invalid);
    if (invalid) return;

    const item: BudgetItem = {
      id: uuid(),
      holidayId: activeHolidayId,
      target,
      category,
      label,
      amount: amountValue,
    };
    const result = addBudgetItem(item);
    if (!result.ok) return;

    setBudget((prev) => [...prev, item]);
    fireHaptic("success");
    setSheetOpen(false);
    resetForm();
    setToastMessage("예산을 저장했어요");
  }

  function handleToggle(id: string) {
    fireHaptic("tickWeak");
    toggleChecklist(id);
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  }

  function selectTab(next: "budget" | "checklist") {
    fireHaptic("tickWeak");
    setTab(next);
  }

  const top = h(Top, { title: h(Top.TitleParagraph, null, "예산 & 체크리스트") });

  const hero = h(SummaryHero, {
    label: "예산 총액",
    value: h(CountUp, { value: summary.total, unit: "원", typography: "t1" }),
    testId: "budget-total-hero",
  });

  const ratioCard = h(Card, {
    children: [
      h(Paragraph.Text, { key: "label", typography: "t4" }, "본가 · 시댁 비율"),
      h(Spacing, { key: "s1", size: 12 }),
      h(MiniBar, { key: "bar", ratio: summary.minePct / 100, testId: "budget-ratio-bar" }),
      h(Spacing, { key: "s2", size: 12 }),
      h(
        Paragraph.Text,
        { key: "pct", typography: "t6" },
        `본가 ${summary.minePct}% / 시댁 ${summary.partnerPct}%`,
      ),
    ],
  });

  const tabs = h(Tab, {
    onChange: (index: number) => selectTab(index === 0 ? "budget" : "checklist"),
    children: [
      h(
        Tab.Item,
        { key: "tab-budget", selected: tab === "budget", onClick: () => selectTab("budget") },
        "예산",
      ),
      h(
        Tab.Item,
        {
          key: "tab-checklist",
          selected: tab === "checklist",
          onClick: () => selectTab("checklist"),
        },
        "체크리스트",
      ),
    ],
  });

  const addButton = h(
    Button,
    { variant: "weak", display: "block", onClick: openSheet },
    "항목 추가",
  );

  const budgetList =
    activeBudget.length === 0
      ? h(EmptyState, {
          key: "empty",
          icon: h(Asset.ContentIcon, { name: "characterEmptyfaceRegular", alt: "예산 항목 없음" }),
          title: "아직 등록된 예산 항목이 없어요",
          testId: "budget-empty",
        })
      : h(
          "div",
          { key: "list", style: { display: "flex", flexDirection: "column" } },
          TARGETS.filter((t) => activeBudget.some((item) => item.target === t)).map((t) =>
            h(
              Fragment,
              { key: t },
              h(Spacing, { size: 16 }),
              h(Paragraph.Text, { typography: "t5" }, t),
              h(Spacing, { size: 4 }),
              activeBudget
                .filter((item) => item.target === t)
                .map((item) =>
                  h(ListRow, {
                    key: item.id,
                    contents: h(ListRow.Texts, {
                      type: "2RowTypeA",
                      top: item.label,
                      bottom: `${item.category} · ${formatNumber(item.amount)}원`,
                    }),
                  }),
                ),
            ),
          ),
        );

  const budgetPanel = h(Fragment, { key: "budget-panel" }, [
    h(Spacing, { key: "s1", size: 16 }),
    addButton,
    budgetList,
  ]);

  const checklistList =
    activeChecklist.length === 0
      ? h(EmptyState, {
          key: "empty",
          icon: h(Asset.ContentIcon, { name: "characterEmptyfaceRegular", alt: "체크리스트 없음" }),
          title: "아직 등록된 체크리스트가 없어요",
          testId: "checklist-empty",
        })
      : h(
          "div",
          { key: "list", style: { display: "flex", flexDirection: "column" } },
          activeChecklist.map((item) =>
            h(ListRow, {
              key: item.id,
              "data-testid": "checklist-row",
              contents: h(ListRow.Texts, { type: "1RowTypeA", top: item.text }),
              right: h(Switch, { checked: item.done, onChange: () => handleToggle(item.id) }),
            }),
          ),
        );

  const checklistPanel = h(Fragment, { key: "checklist-panel" }, [
    h(Spacing, { key: "s1", size: 16 }),
    h(
      Paragraph.Text,
      { key: "progress", typography: "t5" },
      `${progress.completed}/${progress.total} 완료`,
    ),
    h(Spacing, { key: "s2", size: 8 }),
    checklistList,
  ]);

  const familyChips = h(
    "div",
    { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
    TARGETS.map((t) =>
      h(Chip, {
        key: t,
        kind: "select",
        variant: target === t ? "fill" : "weak",
        onClick: () => selectTarget(t),
        children: t,
      }),
    ),
  );

  const categoryChips = h(
    "div",
    { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
    CATEGORIES.map((c) =>
      h(Chip, {
        key: c,
        kind: "select",
        variant: category === c ? "fill" : "weak",
        onClick: () => selectCategory(c),
        children: c,
      }),
    ),
  );

  const form = h(
    "div",
    { "data-testid": "budget-form" },
    h(Paragraph.Text, { typography: "t5" }, "누구네 예산인가요"),
    h(Spacing, { size: 8 }),
    familyChips,
    h(Spacing, { size: 20 }),
    h(Paragraph.Text, { typography: "t5" }, "어떤 분류인가요"),
    h(Spacing, { size: 8 }),
    categoryChips,
    h(Spacing, { size: 20 }),
    h(TextField, {
      variant: "box",
      label: "항목명",
      placeholder: "예: 부모님 용돈",
      value: label,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setLabel(e.target.value),
    }),
    h(Spacing, { size: 12 }),
    h(TextField, {
      variant: "box",
      label: "금액",
      placeholder: "예: 300000",
      inputMode: "numeric",
      hasError: amountError,
      help: amountError ? "금액은 0원 이상이어야 해요" : undefined,
      value: amount,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        setAmount(e.target.value);
        if (amountError) setAmountError(false);
      },
    }),
    h(Spacing, { size: 24 }),
    h(Button, { variant: "fill", display: "block", onClick: handleSubmit }, "저장하기"),
    h(Spacing, { size: 8 }),
  );

  const bottomSheet = h(BottomSheet, {
    open: sheetOpen,
    onDimmerClick: closeSheet,
    header: h(BottomSheet.Header, null, "예산 항목 추가"),
    children: form,
  });

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
      h(Spacing, { key: "s1", size: 16 }),
      ratioCard,
      h(Spacing, { key: "s2", size: 20 }),
      tabs,
      tab === "budget" ? budgetPanel : checklistPanel,
      bottomSheet,
      toast,
    ],
  });
}
