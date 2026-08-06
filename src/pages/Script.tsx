import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Top,
  TextField,
  Chip,
  ChipItem,
  AlertDialog,
  Badge,
  Toast,
  Loader,
  Paragraph,
  Spacing,
  FixedBottomCTA,
  BottomSheet,
  Button,
} from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { TossRewardAd } from "@/components/TossRewardAd";
import { useHoliday } from "@/lib/HolidayContext";
import { addScript, listScripts } from "@/lib/storage";
import { generateScript, ApiError } from "@/lib/api";
import type { ScriptRecord, ScriptRequest } from "@/lib/types";

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function todayScriptCount(): number {
  const now = Date.now();
  return listScripts().filter((s) => isSameDay(s.createdAt, now)).length;
}

const TONES: ScriptRequest["tone"][] = ["정중하게", "단호하게", "유머러스하게"];
const AD_SLOT_ID = import.meta.env.VITE_TOSS_AD_SLOT_ID ?? "script-result-unlock";

function fireHaptic(type: "success" | "tickWeak") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function Script() {
  const navigate = useNavigate();
  const { aiNoticeAck, setAiNoticeAck, isPaid } = useHoliday();

  const [situation, setSituation] = useState("");
  const [tone, setTone] = useState<ScriptRequest["tone"]>(TONES[0]);
  const [situationError, setSituationError] = useState<string | null>(null);
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ScriptRecord | null>(null);
  const [toast, setToast] = useState<{ open: boolean; text: string }>({ open: false, text: "" });
  const [noticeOpen, setNoticeOpen] = useState(() => !aiNoticeAck);
  const [limitSheetOpen, setLimitSheetOpen] = useState(false);

  function handleToneSelect(next: ScriptRequest["tone"]) {
    setTone(next);
    fireHaptic("tickWeak");
  }

  function handleSubmit() {
    if (isLoading) return;

    const trimmed = situation.trim();
    if (!trimmed) {
      setSituationError("상황을 입력해주세요");
      return;
    }

    if (!isPaid && todayScriptCount() >= 1) {
      setLimitSheetOpen(true);
      return;
    }

    setSituationError(null);
    setResult(null);
    setSubmitAttempt((n) => n + 1);
  }

  async function handleRewarded() {
    setIsLoading(true);
    try {
      const response = await generateScript({ situation, tone });
      const record = addScript({ situation, tone, result: response.result });
      setResult(record);
      fireHaptic("success");
      setToast({ open: true, text: "스크립트가 생성되었어요" });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "생성에 실패했어요. 잠시 후 다시 시도해주세요";
      setToast({ open: true, text: message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>응대 스크립트</Top.TitleParagraph>} />}
      bottom={
        <FixedBottomCTA data-testid="script-submit-button" disabled={isLoading} onClick={handleSubmit}>
          {isLoading ? <Loader /> : "스크립트 만들기"}
        </FixedBottomCTA>
      }
    >
      <TextField
        variant="box"
        label="곤란한 상황"
        placeholder="예: 명절마다 취업 언제 하냐 물어봐요 (최대 300자)"
        help={situationError ?? "예: 명절마다 취업 언제 하냐 물어봐요 (최대 300자)"}
        hasError={!!situationError}
        value={situation}
        maxLength={300}
        onChange={(e) => {
          setSituation(e.target.value);
          if (situationError) setSituationError(null);
        }}
      />

      <Spacing size={12} />
      <Paragraph.Text typography="t4">톤</Paragraph.Text>
      <Spacing size={8} />
      <Chip>
        {TONES.map((t) => (
          <ChipItem key={t} selected={tone === t} onClick={() => handleToneSelect(t)}>
            {t}
          </ChipItem>
        ))}
      </Chip>

      <Spacing size={24} />

      {submitAttempt === 0 && (
        <Card>
          <Paragraph.Text typography="t5">상황을 입력하고 스크립트를 만들어보세요</Paragraph.Text>
        </Card>
      )}

      {submitAttempt > 0 && (
        <TossRewardAd key={submitAttempt} slotId={AD_SLOT_ID} onRewarded={handleRewarded}>
          {result && (
            <Card testId="script-result-card">
              <Paragraph.Text typography="st3">{result.result}</Paragraph.Text>
              <Spacing size={8} />
              <Badge size="medium" variant="weak" color="blue">
                AI가 생성한 결과입니다
              </Badge>
            </Card>
          )}
        </TossRewardAd>
      )}

      <AlertDialog
        open={noticeOpen}
        title="서비스 이용 안내"
        description="이 서비스는 생성형 AI를 활용합니다"
        onClose={() => setNoticeOpen(false)}
        alertButton={
          <AlertDialog.AlertButton
            onClick={() => {
              setAiNoticeAck(true);
              setNoticeOpen(false);
            }}
          >
            확인
          </AlertDialog.AlertButton>
        }
      />

      <Toast
        open={toast.open}
        position="bottom"
        text={toast.text}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />

      <BottomSheet
        open={limitSheetOpen}
        onDimmerClick={() => setLimitSheetOpen(false)}
        header="무료 이용 한도"
      >
        <Paragraph.Text typography="t5">
          무료 이용은 하루 1회예요. 시즌권으로 무제한 이용하세요
        </Paragraph.Text>
        <Spacing size={20} />
        <Button
          variant="fill"
          display="block"
          data-testid="script-limit-paywall-button"
          onClick={() => {
            setLimitSheetOpen(false);
            navigate("/paywall");
          }}
        >
          시즌권 보기
        </Button>
      </BottomSheet>
    </ScreenScaffold>
  );
}
