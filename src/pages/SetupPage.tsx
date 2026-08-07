// NOTE: 이 페이지는 packet-0006 테스트의 `require("@/pages/SetupPage")` 동적 로드와
// 호환되어야 한다 — Node(v23+)의 네이티브 TS 타입 스트리핑은 타입 어노테이션만 지우고
// JSX는 지우지 못한다(erasable syntax 아님). JSX 문법을 쓰면 그 require()가
// "Unexpected token '{'"로 즉시 깨진다. 그래서 JSX 대신 React.createElement를 쓴다
// (src/__tests__/__helpers__/mocks.ts도 같은 이유로 JSX를 피한다).
import { useEffect, useState } from "react";
import { createElement as h } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, Chip, TextField, AlertDialog, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { LoadingState } from "@/components/StateView";
import { getCouple, saveCouple, getFlags, saveFlags, uuid } from "@/lib/storage";
import { HOLIDAYS } from "@/lib/holidays";
import type { Couple } from "@/lib/types";

const ROLES: Couple["myRole"][] = ["며느리", "사위", "아내", "남편"];

function fireTickWeak() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/jsdom)에서는 throw — 무시 */
  }
}

export default function SetupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<Couple["myRole"]>("며느리");
  const [myFamilyLabel, setMyFamilyLabel] = useState("");
  const [partnerFamilyLabel, setPartnerFamilyLabel] = useState("");
  const [activeHolidayId, setActiveHolidayId] = useState(
    HOLIDAYS[HOLIDAYS.length - 1]?.id ?? "",
  );
  const [myError, setMyError] = useState(false);
  const [partnerError, setPartnerError] = useState(false);
  const [quotaError, setQuotaError] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  useEffect(() => {
    const existing = getCouple();
    if (existing) {
      navigate("/", { replace: true });
      return;
    }
    const flags = getFlags();
    if (flags?.activeHolidayId) setActiveHolidayId(flags.activeHolidayId);
    setLoading(false);
  }, [navigate]);

  function selectRole(role: Couple["myRole"]) {
    fireTickWeak();
    setMyRole(role);
  }

  function selectHoliday(id: string) {
    fireTickWeak();
    setActiveHolidayId(id);
    const flags = getFlags();
    saveFlags({
      aiNoticeAcknowledged: flags?.aiNoticeAcknowledged ?? false,
      activeHolidayId: id,
      purchasedHolidays: flags?.purchasedHolidays ?? [],
    });
  }

  function handleSubmit() {
    const myEmpty = myFamilyLabel.trim().length === 0;
    const partnerEmpty = partnerFamilyLabel.trim().length === 0;
    setMyError(myEmpty);
    setPartnerError(partnerEmpty);
    if (myEmpty || partnerEmpty) return;

    const couple: Couple = {
      id: uuid(),
      myRole,
      myFamilyLabel: myFamilyLabel.trim(),
      partnerFamilyLabel: partnerFamilyLabel.trim(),
      createdAt: Date.now(),
    };
    const result = saveCouple(couple);
    if (!result.ok) {
      setQuotaError(true);
      return;
    }
    setToastOpen(true);
    setTimeout(() => navigate("/", { replace: true }), 500);
  }

  const top = h(Top, { title: h(Top.TitleParagraph, null, "기본 설정") });

  if (loading) {
    return h(ScreenScaffold, {
      top,
      children: h(LoadingState, { rows: 4, testId: "setup-loading" }),
    });
  }

  const roleChips = h(
    "div",
    { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
    ROLES.map((role) =>
      h(Chip, {
        key: role,
        variant: myRole === role ? "fill" : "weak",
        onClick: () => selectRole(role),
        children: role,
      }),
    ),
  );

  const holidayChips = h(
    "div",
    { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
    HOLIDAYS.map((holiday) =>
      h(Chip, {
        key: holiday.id,
        variant: activeHolidayId === holiday.id ? "fill" : "weak",
        onClick: () => selectHoliday(holiday.id),
        children: holiday.name,
      }),
    ),
  );

  const form = h(
    "div",
    { "data-testid": "setup-form" },
    h(Paragraph.Text, { typography: "t4" }, "내 역할을 골라주세요"),
    h(Spacing, { size: 12 }),
    roleChips,
    h(Spacing, { size: 24 }),
    h(TextField, {
      variant: "box",
      label: "우리집 호칭",
      placeholder: "예: 친정",
      help: myError ? "호칭을 입력해주세요" : "예: 친정, 본가",
      hasError: myError,
      value: myFamilyLabel,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        setMyFamilyLabel(e.target.value);
        if (myError) setMyError(false);
      },
    }),
    h(Spacing, { size: 12 }),
    h(TextField, {
      variant: "box",
      label: "상대집 호칭",
      placeholder: "예: 시댁",
      help: partnerError ? "호칭을 입력해주세요" : undefined,
      hasError: partnerError,
      value: partnerFamilyLabel,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        setPartnerFamilyLabel(e.target.value);
        if (partnerError) setPartnerError(false);
      },
    }),
    h(Spacing, { size: 24 }),
    h(Paragraph.Text, { typography: "t4" }, "대상 명절"),
    h(Spacing, { size: 12 }),
    holidayChips,
    h(Spacing, { size: 80 }),
  );

  const alertDialog = h(AlertDialog, {
    open: quotaError,
    title: "저장 공간이 부족해요. 기록을 정리해주세요",
    alertButton: h(
      AlertDialog.AlertButton,
      { onClick: () => setQuotaError(false) },
      "닫기",
    ),
    onClose: () => setQuotaError(false),
  });

  const toast = h(Toast, {
    open: toastOpen,
    text: "설정이 저장되었어요",
    position: "bottom",
    onClose: () => setToastOpen(false),
  });

  return h(ScreenScaffold, {
    top,
    bottom: h(SubmitFooter, { label: "설정 저장하기", onClick: handleSubmit }),
    children: [form, alertDialog, toast],
  });
}
