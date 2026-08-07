// NOTE: 이 페이지는 packet-0012 테스트의 `require("@/pages/MoodNewPage")` 동적 로드와
// 호환되어야 한다 — JSX 대신 createElement를 사용한다 (SetupPage.tsx와 동일 이유).
import { useState } from "react";
import { createElement as h } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Chip, TextField, AlertDialog, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { addMoodLog, getFlags, uuid } from "@/lib/storage";
import { STRESS_TAGS } from "@/lib/types";
import type { MoodLog } from "@/lib/types";

const LEVELS = [1, 2, 3, 4, 5];

function fireTickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/jsdom)에서는 throw — 무시 */
  }
}

export default function MoodNewPage() {
  const navigate = useNavigate();
  const [exhaustionLevel, setExhaustionLevel] = useState<number | null>(null);
  const [stressTags, setStressTags] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [levelError, setLevelError] = useState(false);
  const [quotaError, setQuotaError] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  function selectLevel(level: number) {
    fireTickWeak();
    setExhaustionLevel(level);
    setLevelError(false);
  }

  function toggleTag(tag: string) {
    fireTickWeak();
    setStressTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function handleSubmit() {
    if (exhaustionLevel === null) {
      setLevelError(true);
      return;
    }
    const holidayId = getFlags()?.activeHolidayId ?? "";
    const mood: MoodLog = {
      id: uuid(),
      holidayId,
      exhaustionLevel,
      stressTags,
      note,
      createdAt: Date.now(),
    };
    const result = addMoodLog(mood);
    if (!result.ok) {
      setQuotaError(true);
      return;
    }
    setToastOpen(true);
    setTimeout(() => navigate("/report", { replace: true }), 500);
  }

  const top = h(Top, { title: h(Top.TitleParagraph, null, "명절 후 기록") });

  const levelChips = h(
    "div",
    { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
    LEVELS.map((level) =>
      h(Chip, {
        key: level,
        variant: exhaustionLevel === level ? "fill" : "weak",
        onClick: () => selectLevel(level),
        children: String(level),
      }),
    ),
  );

  const tagChips = h(
    "div",
    { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
    STRESS_TAGS.map((tag) =>
      h(Chip, {
        key: tag,
        variant: stressTags.includes(tag) ? "fill" : "weak",
        onClick: () => toggleTag(tag),
        children: tag,
      }),
    ),
  );

  const form = h(
    "div",
    { "data-testid": "mood-new-form" },
    h(Paragraph.Text, { typography: "t4" }, "오늘 얼마나 지쳤나요?"),
    h(Spacing, { size: 8 }),
    h(Paragraph.Text, { typography: "st13" }, "1 = 괜찮음 · 5 = 매우 소진"),
    h(Spacing, { size: 12 }),
    levelChips,
    levelError ? h(Spacing, { size: 8 }) : null,
    levelError ? h(Paragraph.Text, { typography: "st13" }, "소진도를 선택해주세요") : null,
    h(Spacing, { size: 24 }),
    h(Paragraph.Text, { typography: "t4" }, "무엇이 힘들었나요?"),
    h(Spacing, { size: 12 }),
    tagChips,
    h(Spacing, { size: 16 }),
    h(TextField, {
      variant: "box",
      label: "메모",
      help: "0~200자",
      placeholder: "예: 질문이 많았어요",
      maxLength: 200,
      value: note,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setNote(e.target.value.slice(0, 200)),
    }),
    h(Spacing, { size: 80 }),
  );

  const alertDialog = h(AlertDialog, {
    open: quotaError,
    title: "저장 공간이 부족해요. 기록을 정리해주세요",
    alertButton: h(AlertDialog.AlertButton, { onClick: () => setQuotaError(false) }, "닫기"),
    onClose: () => setQuotaError(false),
  });

  const toast = h(Toast, {
    open: toastOpen,
    text: "기록됐어요",
    position: "bottom",
    onClose: () => setToastOpen(false),
  });

  return h(ScreenScaffold, {
    top,
    bottom: h(SubmitFooter, { label: "기록 저장하기", onClick: handleSubmit }),
    children: [form, alertDialog, toast],
  });
}
