import { useState } from 'react';
import { Top, Button, TextField, Chip, ChipItem, ListRow, Toast, Spacing, Paragraph, Asset } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { Sparkline } from '@/components/Sparkline';
import { MiniBar } from '@/components/MiniBar';
import { EmptyState } from '@/components/StateView';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { TABS } from '@/lib/nav';
import { useHoliday } from '@/lib/HolidayContext';
import { listStressLogs, addStressLog } from '@/lib/storage';
import type { StressLog } from '@/lib/types';

const TRIGGER_OPTIONS = ['잔소리', '비교', '경제적 부담', '장거리 이동', '차례 준비', '술자리'];
const TOP_TRIGGER_COUNT = 3;

function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

// 감정소진 리포트(/stress) — 기록 폼(score/triggers/memo) + 평균·추이·트리거 리포트.
export default function Stress() {
  const { currentHolidayId } = useHoliday();

  const [logs, setLogs] = useState<StressLog[]>(() => listStressLogs(currentHolidayId));
  const [score, setScore] = useState('');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; text: string }>({ open: false, text: '' });

  function toggleTrigger(trigger: string) {
    fireHaptic('tickWeak');
    setTriggers((prev) => (prev.includes(trigger) ? prev.filter((t) => t !== trigger) : [...prev, trigger]));
  }

  function handleSubmit() {
    if (score.trim() === '') {
      setError('소진도 점수를 선택해주세요');
      return;
    }
    const parsed = Number(score);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
      setError('소진도는 1~10 사이로 선택해주세요');
      return;
    }

    setError(null);
    const created = addStressLog({ score: parsed, triggers, memo, holidayId: currentHolidayId });
    setLogs((prev) => [...prev, created]);
    setScore('');
    setTriggers([]);
    setMemo('');
    fireHaptic('success');
    setToast({ open: true, text: '기록되었어요' });
  }

  const avg = logs.length > 0 ? logs.reduce((sum, l) => sum + l.score, 0) / logs.length : 0;
  const scoreSeries = [...logs].sort((a, b) => a.createdAt - b.createdAt).map((l) => l.score);

  const triggerCounts = new Map<string, number>();
  for (const log of logs) {
    for (const t of log.triggers) {
      triggerCounts.set(t, (triggerCounts.get(t) ?? 0) + 1);
    }
  }
  const topTriggers = [...triggerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_TRIGGER_COUNT);
  const topRatio = topTriggers.length > 0 && logs.length > 0 ? topTriggers[0][1] / logs.length : 0;

  const recentLogs = [...logs].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>감정소진 리포트</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TABS} />}
    >
      {logs.length === 0 ? (
        <EmptyState
          testId="stress-empty-state"
          icon={<Asset.ContentIcon name="iconHeartRegular" alt="감정 소진 기록" />}
          title="명절 후 감정을 기록해보세요"
          description="소진도를 남기면 다음 명절 대비 리포트로 정리해 드려요"
        />
      ) : (
        <Card testId="stress-report-card">
          <Paragraph.Text typography="st11">평균 감정소진도</Paragraph.Text>
          <Spacing size={4} />
          <span data-testid="stress-avg-countup" style={{ whiteSpace: 'nowrap' }}>
            <Paragraph.Text typography="t1">{`${avg.toFixed(1)}/10`}</Paragraph.Text>
          </span>
          <Spacing size={4} />
          <Paragraph.Text typography="t6">{`최근 ${logs.length}회 기록`}</Paragraph.Text>

          <Spacing size={16} />
          <Sparkline data={scoreSeries} testId="stress-sparkline" />

          <Spacing size={16} />
          <Paragraph.Text typography="st11">트리거 분포</Paragraph.Text>
          <Spacing size={4} />
          <MiniBar ratio={topRatio} testId="stress-trigger-bar" />

          <Spacing size={12} />
          <Chip wrap>
            {topTriggers.map(([trigger]) => (
              <ChipItem key={trigger} data-testid="stress-top-trigger-chip" selected>
                {trigger}
              </ChipItem>
            ))}
          </Chip>

          <Spacing size={16} />
          {recentLogs.map((log) => (
            <div key={log.id}>
              <ListRow
                data-testid="stress-log-row"
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={`소진도 ${log.score}/10${log.triggers.length > 0 ? ` · ${log.triggers.join(', ')}` : ''}`}
                    bottom={log.memo || '메모 없음'}
                  />
                }
              />
              <Spacing size={8} />
            </div>
          ))}
        </Card>
      )}

      <Spacing size={16} />
      <Paragraph.Text typography="t5">감정소진 기록하기</Paragraph.Text>
      <Spacing size={12} />
      <TextField
        variant="line"
        label="소진도 점수"
        placeholder="1~10 사이 점수"
        inputMode="numeric"
        data-testid="stress-score-input"
        value={score}
        onChange={(e) => {
          setScore(e.target.value);
          if (error) setError(null);
        }}
      />
      <Spacing size={12} />
      <Chip wrap>
        {TRIGGER_OPTIONS.map((t) => (
          <ChipItem
            key={t}
            data-testid={`stress-trigger-option-${t}`}
            selected={triggers.includes(t)}
            onClick={() => toggleTrigger(t)}
          >
            {t}
          </ChipItem>
        ))}
      </Chip>
      <Spacing size={12} />
      <TextField
        variant="line"
        label="메모"
        placeholder="무슨 일이 있었는지 적어보세요"
        maxLength={300}
        data-testid="stress-memo-input"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />
      {error && (
        <>
          <Spacing size={8} />
          <Paragraph.Text typography="st13">{error}</Paragraph.Text>
        </>
      )}
      <Spacing size={20} />
      <Button variant="fill" display="block" data-testid="stress-submit-button" onClick={handleSubmit}>
        기록 저장
      </Button>
      <Spacing size={24} />

      <Toast
        open={toast.open}
        position="bottom"
        text={toast.text}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </ScreenScaffold>
  );
}
