// NOTE: 이 페이지는 packet-0010 테스트의 `require("@/pages/CalendarPage")` 동적 로드와
// 호환되어야 한다 — Node(v23+)의 네이티브 TS 타입 스트리핑은 타입 어노테이션만 지우고
// JSX는 지우지 못한다(erasable syntax 아님). JSX 문법을 쓰면 그 require()가
// "Unexpected token '{'"로 즉시 깨진다. 그래서 JSX 대신 React.createElement를 쓴다
// (src/pages/HomePage.tsx, src/pages/SetupPage.tsx도 같은 이유로 JSX를 피한다).
import { useState } from "react";
import { createElement as h, Fragment } from "react";
import type { ChangeEvent } from "react";
import {
  Top,
  Paragraph,
  Spacing,
  ListRow,
  Chip,
  TextField,
  IconButton,
  AlertDialog,
  BottomSheet,
  Toast,
  Button,
  Asset,
} from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { Card } from "@/components/Card";
import { MiniBar } from "@/components/MiniBar";
import { EmptyState } from "@/components/StateView";
import { getVisits, addVisit, removeVisit, getFlags, uuid } from "@/lib/storage";
import { useAppData, calcBalance, isImbalanced } from "@/lib/useAppData";
import type { Visit } from "@/lib/types";

function fireHaptic(type: "success" | "tickWeak") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/jsdom)에서는 throw — 무시 */
  }
}

function formatDateShort(date: string): string {
  const parts = date.split("-");
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : date;
}

export default function CalendarPage() {
  const { couple } = useAppData();
  const [flags] = useState(() => getFlags());
  const [visits, setVisits] = useState<Visit[]>(() => getVisits());

  const [sheetOpen, setSheetOpen] = useState(false);
  const [family, setFamily] = useState<Visit["family"] | null>(null);
  const [date, setDate] = useState("");
  const [startHour, setStartHour] = useState("");
  const [duration, setDuration] = useState("");
  const [memo, setMemo] = useState("");
  const [familyError, setFamilyError] = useState(false);
  const [durationError, setDurationError] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const mineLabel = couple?.myFamilyLabel || "본가";
  const partnerLabel = couple?.partnerFamilyLabel || "시댁";
  const activeHolidayId = flags?.activeHolidayId ?? "";

  const activeVisits = visits.filter((v) => v.holidayId === activeHolidayId);
  const balance = calcBalance(activeVisits);
  const imbalanced = isImbalanced(balance.minePct) || isImbalanced(balance.partnerPct);

  function familyLabel(f: Visit["family"]): string {
    return f === "mine" ? mineLabel : partnerLabel;
  }

  function resetForm() {
    setFamily(null);
    setDate("");
    setStartHour("");
    setDuration("");
    setMemo("");
    setFamilyError(false);
    setDurationError(false);
  }

  function openForm() {
    fireHaptic("tickWeak");
    resetForm();
    setSheetOpen(true);
  }

  function closeForm() {
    setSheetOpen(false);
  }

  function selectFamily(value: Visit["family"]) {
    fireHaptic("tickWeak");
    setFamily(value);
    if (familyError) setFamilyError(false);
  }

  function handleSubmit() {
    const familyEmpty = family === null;
    const durationValue = Number(duration);
    const durationInvalid = !durationValue || durationValue < 1;
    setFamilyError(familyEmpty);
    setDurationError(durationInvalid);
    if (familyEmpty || durationInvalid) return;

    const visit: Visit = {
      id: uuid(),
      family: family as Visit["family"],
      date,
      startHour: Number(startHour) || 0,
      durationHours: durationValue,
      holidayId: activeHolidayId,
      memo,
    };
    const result = addVisit(visit);
    if (!result.ok) return;

    setVisits((prev) => [...prev, visit]);
    fireHaptic("success");
    setSheetOpen(false);
    resetForm();
    setToastMessage("일정이 추가됐어요");
  }

  function requestDelete(id: string) {
    fireHaptic("tickWeak");
    setDeleteTargetId(id);
  }

  function closeDeleteDialog() {
    setDeleteTargetId(null);
  }

  function confirmDelete() {
    if (!deleteTargetId) return;
    removeVisit(deleteTargetId);
    setVisits((prev) => prev.filter((v) => v.id !== deleteTargetId));
    closeDeleteDialog();
  }

  const top = h(Top, { title: h(Top.TitleParagraph, null, "방문 균형") });

  const balanceCard = h(Card, {
    key: "balance-card",
    children: [
      h(Paragraph.Text, { key: "label", typography: "t4" }, "방문 시간 균형"),
      h(Spacing, { key: "s1", size: 12 }),
      h(MiniBar, { key: "bar", ratio: balance.minePct / 100, testId: "balance-bar" }),
      h(Spacing, { key: "s2", size: 12 }),
      h(
        Paragraph.Text,
        { key: "pct", typography: "t2" },
        `${mineLabel} ${balance.minePct}% / ${partnerLabel} ${balance.partnerPct}%`,
      ),
      imbalanced
        ? h(
            Fragment,
            { key: "warn" },
            h(Spacing, { size: 8 }),
            h(Chip, { variant: "fill", kind: "action", children: "한쪽에 시간이 몰려 있어요" }),
          )
        : null,
    ],
  });

  const listBody =
    activeVisits.length === 0
      ? h(EmptyState, {
          key: "empty",
          icon: h(Asset.ContentIcon, { name: "characterEmptyfaceRegular", alt: "일정 없음" }),
          title: "아직 등록된 방문 일정이 없어요",
          testId: "visit-empty",
        })
      : h(
          "div",
          { key: "list", style: { display: "flex", flexDirection: "column", maxHeight: 480, overflowY: "auto" } },
          activeVisits.map((v) =>
            h(ListRow, {
              key: v.id,
              "data-testid": "visit-item",
              contents: h(ListRow.Texts, {
                type: "2RowTypeA",
                top: `${familyLabel(v.family)} · ${formatDateShort(v.date)} ${v.startHour}시`,
                bottom: `${v.durationHours}시간 · ${v.memo}`,
              }),
              right: h(IconButton, {
                "aria-label": "일정 삭제",
                name: "iconDeleteRegular",
                onClick: () => requestDelete(v.id),
              }),
            }),
          ),
        );

  const familyChips = h(
    "div",
    { style: { display: "flex", gap: 8 } },
    [
      h(Chip, {
        key: "mine",
        variant: family === "mine" ? "fill" : "weak",
        onClick: () => selectFamily("mine"),
        children: mineLabel,
      }),
      h(Chip, {
        key: "partner",
        variant: family === "partner" ? "fill" : "weak",
        onClick: () => selectFamily("partner"),
        children: partnerLabel,
      }),
    ],
  );

  const form = h(
    "div",
    { "data-testid": "visit-form" },
    h(Paragraph.Text, { typography: "t5" }, "누구네 집인가요"),
    h(Spacing, { size: 8 }),
    familyChips,
    familyError ? h(Paragraph.Text, { typography: "st12", color: "var(--adaptiveRed500)" }, "누구네 집인지 선택해 주세요") : null,
    h(Spacing, { size: 20 }),
    h(TextField, {
      variant: "box",
      label: "날짜",
      placeholder: "예: 2026-09-25",
      value: date,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setDate(e.target.value),
    }),
    h(Spacing, { size: 12 }),
    h(TextField, {
      variant: "box",
      label: "시작 시각",
      placeholder: "예: 10",
      inputMode: "numeric",
      value: startHour,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setStartHour(e.target.value),
    }),
    h(Spacing, { size: 12 }),
    h(TextField, {
      variant: "box",
      label: "체류 시간",
      placeholder: "예: 6",
      inputMode: "numeric",
      hasError: durationError,
      help: durationError ? "체류 시간은 1시간 이상이어야 해요" : undefined,
      value: duration,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        setDuration(e.target.value);
        if (durationError) setDurationError(false);
      },
    }),
    h(Spacing, { size: 12 }),
    h(TextField, {
      variant: "box",
      label: "메모",
      placeholder: "예: 차례",
      value: memo,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setMemo(e.target.value),
    }),
    h(Spacing, { size: 24 }),
    h(
      Button,
      { variant: "fill", display: "block", onClick: handleSubmit },
      "일정 저장",
    ),
    h(Spacing, { size: 8 }),
  );

  const bottomSheet = h(BottomSheet, {
    open: sheetOpen,
    onDimmerClick: closeForm,
    header: h(BottomSheet.Header, null, "일정 추가"),
    children: form,
  });

  const deleteDialog = h(AlertDialog, {
    open: deleteTargetId !== null,
    title: "일정을 삭제할까요?",
    alertButton: [
      h(AlertDialog.AlertButton, { key: "cancel", onClick: closeDeleteDialog }, "닫기"),
      h(AlertDialog.AlertButton, { key: "confirm", onClick: confirmDelete }, "삭제"),
    ],
    onClose: closeDeleteDialog,
  });

  const toast = h(Toast, {
    open: toastMessage !== null,
    text: toastMessage ?? "",
    position: "bottom",
    onClose: () => setToastMessage(null),
  });

  return h(ScreenScaffold, {
    top,
    bottom: h(SubmitFooter, { label: "일정 추가", onClick: openForm }),
    children: [balanceCard, h(Spacing, { key: "s3", size: 16 }), listBody, bottomSheet, deleteDialog, toast],
  });
}
