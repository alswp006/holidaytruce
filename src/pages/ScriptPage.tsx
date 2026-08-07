// NOTE: 이 페이지는 packet-0008 테스트의 `require("@/pages/ScriptPage")` 동적 로드와
// 호환되어야 한다 — Node(v23+)의 네이티브 TS 타입 스트리핑은 타입 어노테이션만 지우고
// JSX는 지우지 못한다(erasable syntax 아님). JSX 문법을 쓰면 그 require()가
// "Unexpected token '{'"로 즉시 깨진다. 그래서 JSX 대신 React.createElement를 쓴다
// (src/pages/HomePage.tsx도 같은 이유로 JSX를 피한다).
import { useState } from "react";
import { createElement as h, Fragment } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Top,
  Tab,
  Paragraph,
  Spacing,
  Chip,
  TextField,
  AlertDialog,
  Toast,
  ListRow,
  Asset,
} from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/StateView";
import { TossRewardAd } from "@/components/TossRewardAd";
import { getFlags, getScripts, addScript, uuid } from "@/lib/storage";
import { requestScript } from "@/lib/scriptApi";
import { acknowledgeAiNotice, isPremium } from "@/lib/useAppData";
import { SITUATIONS, TONES } from "@/lib/types";
import type { Script, Situation, Tone } from "@/lib/types";

export default function ScriptPage() {
  const navigate = useNavigate();
  const [flags, setFlags] = useState(() => getFlags());
  const [scripts] = useState<Script[]>(() => getScripts());

  const [tab, setTab] = useState<"create" | "history">("create");
  const [situation, setSituation] = useState<Situation>(SITUATIONS[0]);
  const [tone, setTone] = useState<Tone>(TONES[0]);
  const [question, setQuestion] = useState("");
  const [questionError, setQuestionError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingScriptId, setPendingScriptId] = useState<string | null>(null);

  const activeHolidayId = flags?.activeHolidayId ?? "";
  const premium = isPremium(flags, activeHolidayId);

  function handleAiNoticeAck() {
    acknowledgeAiNotice();
    setFlags((prev) => ({
      aiNoticeAcknowledged: true,
      activeHolidayId: prev?.activeHolidayId ?? "",
      purchasedHolidays: prev?.purchasedHolidays ?? [],
    }));
  }

  function handleReveal(scriptId: string) {
    setPendingScriptId(null);
    navigate("/script/result", { state: { scriptId } });
  }

  async function handleSubmit() {
    const trimmed = question.trim();
    if (trimmed === "") {
      setQuestionError(true);
      return;
    }
    setQuestionError(false);
    setSubmitting(true);

    const result = await requestScript({ situation, tone, question: trimmed });

    if (!result.ok) {
      setApiError(true);
      setSubmitting(false);
      return;
    }

    const script: Script = {
      id: uuid(),
      situation,
      tone,
      question: trimmed,
      resultText: result.data.reply,
      createdAt: Date.now(),
      isAi: true,
    };
    addScript(script);
    setToastMessage("스크립트가 만들어졌어요");
    setSubmitting(false);

    if (premium) {
      navigate("/script/result", { state: { scriptId: script.id } });
    } else {
      setPendingScriptId(script.id);
    }
  }

  function handleRetry() {
    setApiError(false);
  }

  const top = h(Top, { title: h(Top.TitleParagraph, null, "응대 스크립트") });

  const aiNoticeDialog = h(AlertDialog, {
    open: flags?.aiNoticeAcknowledged !== true,
    title: "이 서비스는 생성형 AI를 활용합니다",
    alertButton: h(AlertDialog.AlertButton, { onClick: handleAiNoticeAck }, "확인"),
    onClose: handleAiNoticeAck,
  });

  const tabs = h(Tab, {
    onChange: (index: number) => setTab(index === 0 ? "create" : "history"),
    children: [
      h(Tab.Item, { key: "tab-create", selected: tab === "create", onClick: () => setTab("create") }, "만들기"),
      h(Tab.Item, { key: "tab-history", selected: tab === "history", onClick: () => setTab("history") }, "기록"),
    ],
  });

  const situationChips = h(
    "div",
    { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
    SITUATIONS.map((s) =>
      h(Chip, {
        key: s,
        kind: "select",
        variant: situation === s ? "fill" : "weak",
        onClick: () => setSituation(s),
        children: s,
      }),
    ),
  );

  const toneChips = h(
    "div",
    { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
    TONES.map((t) =>
      h(Chip, {
        key: t,
        kind: "select",
        variant: tone === t ? "fill" : "weak",
        onClick: () => setTone(t),
        children: t,
      }),
    ),
  );

  const rewardGate =
    pendingScriptId != null
      ? h(Card, {
          key: "reward-gate",
          children: h(TossRewardAd, {
            slotId: "script-result-unlock",
            onRewarded: () => handleReveal(pendingScriptId),
            children: null,
          }),
        })
      : null;

  const createPanel = h(
    "div",
    { "data-testid": "script-form", key: "create-panel" },
    h(Paragraph.Text, { typography: "t4" }, "어떤 상황이었나요"),
    h(Spacing, { size: 8 }),
    situationChips,
    h(Spacing, { size: 20 }),
    h(Paragraph.Text, { typography: "t4" }, "어떤 톤으로 답하고 싶나요"),
    h(Spacing, { size: 8 }),
    toneChips,
    h(Spacing, { size: 20 }),
    h(TextField, {
      variant: "box",
      label: "받은 질문",
      placeholder: "예: 결혼은 언제 할 거니?",
      hasError: questionError,
      help: questionError ? "곤란했던 질문을 입력해주세요" : undefined,
      value: question,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        setQuestion(e.target.value);
        if (questionError) setQuestionError(false);
      },
    }),
    h(Spacing, { size: 24 }),
    rewardGate,
    h(Spacing, { size: 80 }),
  );

  const historyPanel =
    scripts.length === 0
      ? h(EmptyState, {
          key: "history-empty",
          icon: h(Asset.ContentIcon, { name: "characterEmptyfaceRegular", alt: "스크립트 기록 없음" }),
          title: "아직 만든 스크립트가 없어요",
          testId: "script-history-empty",
        })
      : h(
          "div",
          { key: "history-list", style: { display: "flex", flexDirection: "column" } },
          scripts.map((s) =>
            h(ListRow, {
              key: s.id,
              contents: h(ListRow.Texts, {
                type: "2RowTypeA",
                top: s.question,
                bottom: `${s.situation} · ${s.tone}`,
              }),
            }),
          ),
        );

  const apiErrorDialog = h(AlertDialog, {
    open: apiError,
    title: "잠시 후 다시 시도해주세요",
    alertButton: h(AlertDialog.AlertButton, { onClick: handleRetry }, "다시 시도"),
    onClose: handleRetry,
  });

  const toast = h(Toast, {
    open: toastMessage !== null,
    text: toastMessage ?? "",
    position: "bottom",
    onClose: () => setToastMessage(null),
  });

  return h(ScreenScaffold, {
    top,
    bottom:
      tab === "create"
        ? h(SubmitFooter, { label: "스크립트 만들기", onClick: handleSubmit, disabled: submitting })
        : undefined,
    children: [
      h(Fragment, { key: "body" }, tabs, h(Spacing, { size: 16 }), tab === "create" ? createPanel : historyPanel),
      aiNoticeDialog,
      apiErrorDialog,
      toast,
    ],
  });
}
