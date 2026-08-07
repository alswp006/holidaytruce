// NOTE: 이 페이지는 packet-0009 테스트의 `require("@/pages/ScriptResultPage")` 동적 로드와
// 호환되어야 한다 — Node(v23+)의 네이티브 TS 타입 스트리핑은 타입 어노테이션만 지우고
// JSX는 지우지 못한다(erasable syntax 아님). JSX 문법을 쓰면 그 require()가
// "Unexpected token '{'"로 즉시 깨진다. 그래서 JSX 대신 React.createElement를 쓴다.
import { useEffect, useState } from "react";
import { createElement as h } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Badge, Chip, Button, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback, setClipboardText } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { getScripts } from "@/lib/storage";
import type { RouteState } from "@/lib/types";

type ResultRouteState = RouteState["/script/result"];

function fireTickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/jsdom)에서는 throw — 무시 */
  }
}

export default function ScriptResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ResultRouteState) ?? null;
  const script = state ? getScripts().find((s) => s.id === state.scriptId) ?? null : null;
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    if (!script) {
      navigate("/script", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script]);

  if (!script) {
    return null;
  }

  function handleCopy() {
    try {
      Promise.resolve(setClipboardText(script!.resultText))
        .then(() => setToastOpen(true))
        .catch(() => {});
    } catch {
      /* WebView 밖(브라우저/jsdom)에서는 throw — 무시 */
    }
  }

  function handleRetry() {
    fireTickWeak();
    navigate("/script");
  }

  const top = h(Top, { title: h(Top.TitleParagraph, null, "추천 응대") });

  const summaryChips = h(
    "div",
    { key: "summary-chips", style: { display: "flex", gap: 8, flexWrap: "wrap" } },
    h(Chip, { key: "situation", children: script.situation }),
    h(Chip, { key: "tone", children: script.tone }),
  );

  const resultCard = h(Card, {
    key: "result-card",
    testId: "script-result-card",
    children: [
      h(Paragraph.Text, { key: "result-text", typography: "t3" }, script.resultText),
      h(Spacing, { key: "spacing-badge", size: 16 }),
      h(Badge, { key: "ai-badge", size: "small", variant: "weak", color: "blue" }, "AI가 생성한 결과입니다"),
    ],
  });

  const actions = h(
    "div",
    { key: "actions", style: { display: "flex", gap: 8 } },
    h(
      Button,
      { key: "copy", variant: "weak", display: "block", "aria-label": "결과 복사하기", onClick: handleCopy },
      "복사하기",
    ),
    h(
      Button,
      { key: "retry", variant: "fill", display: "block", "aria-label": "다시 만들기", onClick: handleRetry },
      "다시 만들기",
    ),
  );

  const toast = h(Toast, {
    key: "toast",
    open: toastOpen,
    text: "결과를 복사했어요",
    position: "bottom",
    onClose: () => setToastOpen(false),
  });

  return h(ScreenScaffold, {
    top,
    children: [
      summaryChips,
      h(Spacing, { size: 16, key: "spacing-1" }),
      resultCard,
      h(Spacing, { size: 24, key: "spacing-2" }),
      actions,
      toast,
    ],
  });
}
