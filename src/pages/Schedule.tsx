import { useState } from 'react';
import {
  Top,
  Button,
  TextField,
  Chip,
  ChipItem,
  ListRow,
  AlertDialog,
  Toast,
  BottomSheet,
  Spacing,
  Paragraph,
  Asset,
} from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { SummaryHero } from '@/components/SummaryHero';
import { CountUp } from '@/components/CountUp';
import { MiniBar } from '@/components/MiniBar';
import { EmptyState } from '@/components/StateView';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { TABS } from '@/lib/nav';
import { useHoliday } from '@/lib/HolidayContext';
import { listSchedules, addSchedule, removeSchedule } from '@/lib/storage';
import type { VisitSchedule } from '@/lib/types';

const SIDES: VisitSchedule['side'][] = ['본가', '처가'];
const BALANCE_WARNING_THRESHOLD_MIN = 120;

function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function durationMinutes(schedule: VisitSchedule): number {
  if (!schedule.startTime || !schedule.endTime) return 0;
  const start = toMinutes(schedule.startTime);
  const end = toMinutes(schedule.endTime);
  if (start === null || end === null) return 0;
  return Math.max(0, end - start);
}

// 방문 일정 캘린더(/schedule) — 목록·추가(BottomSheet)·삭제(AlertDialog)·양가 균형 요약.
export default function Schedule() {
  const { currentHolidayId } = useHoliday();

  const [schedules, setSchedules] = useState<VisitSchedule[]>(() => listSchedules(currentHolidayId));
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; text: string }>({ open: false, text: '' });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [side, setSide] = useState<VisitSchedule['side']>('본가');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [memo, setMemo] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const sorted = [...schedules].sort((a, b) => a.date.localeCompare(b.date));

  const homeTotal = schedules
    .filter((s) => s.side === '본가')
    .reduce((sum, s) => sum + durationMinutes(s), 0);
  const inLawTotal = schedules
    .filter((s) => s.side === '처가')
    .reduce((sum, s) => sum + durationMinutes(s), 0);
  const totalMinutes = homeTotal + inLawTotal;
  const diff = Math.abs(homeTotal - inLawTotal);
  const ratio = totalMinutes > 0 ? homeTotal / totalMinutes : 0;

  function openForm() {
    setSide('본가');
    setDate('');
    setStartTime('');
    setEndTime('');
    setMemo('');
    setFormError(null);
    setSheetOpen(true);
  }

  function handleSubmit() {
    if (!date) {
      setFormError('방문 날짜를 선택해주세요');
      return;
    }
    if (startTime && endTime) {
      const start = toMinutes(startTime);
      const end = toMinutes(endTime);
      if (start !== null && end !== null && end < start) {
        setFormError('종료 시간이 시작 시간보다 빨라요');
        return;
      }
    }

    setFormError(null);
    const created = addSchedule({
      side,
      date,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      memo,
      holidayId: currentHolidayId,
    });
    setSchedules((prev) => [...prev, created]);
    setSheetOpen(false);
    fireHaptic('success');
    setToast({ open: true, text: '일정이 추가됐어요' });
  }

  function handleConfirmDelete() {
    if (!deleteTargetId) return;
    removeSchedule(deleteTargetId);
    setSchedules((prev) => prev.filter((s) => s.id !== deleteTargetId));
    setDeleteTargetId(null);
  }

  return (
    <ScreenScaffold
      top={
        <>
          <Top title={<Top.TitleParagraph>방문 일정</Top.TitleParagraph>} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px' }}>
            <Button variant="weak" size="small" data-testid="schedule-add-button" onClick={openForm}>
              추가
            </Button>
          </div>
        </>
      }
      bottom={<FloatingTabBar items={TABS} />}
    >
      <SummaryHero
        label="양가 방문시간 합계"
        value={<CountUp value={totalMinutes} unit="분" typography="t1" testId="schedule-total-countup" />}
        caption={`본가 ${homeTotal}분 · 처가 ${inLawTotal}분`}
      />

      <Spacing size={12} />
      <div style={{ display: 'flex', gap: 12 }}>
        <Paragraph.Text data-testid="schedule-side-total-본가" typography="t6">
          본가 {homeTotal}분
        </Paragraph.Text>
        <Paragraph.Text data-testid="schedule-side-total-처가" typography="t6">
          처가 {inLawTotal}분
        </Paragraph.Text>
      </div>
      <Spacing size={8} />
      <MiniBar ratio={ratio} testId="schedule-balance-bar" />

      {diff > BALANCE_WARNING_THRESHOLD_MIN && (
        <>
          <Spacing size={16} />
          <Card testId="schedule-balance-warning">
            <Paragraph.Text typography="st5">
              양가 방문 시간이 불균형해요 (차이 {diff}분)
            </Paragraph.Text>
          </Card>
        </>
      )}

      <Spacing size={16} />

      {sorted.length === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="iconCalendarRegular" alt="일정" />}
          title="아직 등록된 방문 일정이 없어요"
          description="본가·처가 방문 일정을 추가해 양가 균형을 맞춰요"
          action={
            <Button variant="weak" onClick={openForm}>
              일정 추가
            </Button>
          }
        />
      ) : (
        sorted.map((s) => (
          <div key={s.id}>
            <ListRow
              data-testid="schedule-row"
              contents={
                s.memo ? (
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={`${s.side} · ${s.date} ${s.startTime ?? ''}~${s.endTime ?? ''}`}
                    bottom={s.memo}
                  />
                ) : (
                  <ListRow.Texts
                    type="1RowTypeA"
                    top={`${s.side} · ${s.date} ${s.startTime ?? ''}~${s.endTime ?? ''}`}
                  />
                )
              }
              right={
                <Button
                  variant="weak"
                  size="small"
                  data-testid={`schedule-delete-${s.id}`}
                  onClick={() => setDeleteTargetId(s.id)}
                >
                  삭제
                </Button>
              }
            />
            <Spacing size={8} />
          </div>
        ))
      )}

      <BottomSheet open={sheetOpen} onDimmerClick={() => setSheetOpen(false)} header="일정 추가">
        <Chip>
          {SIDES.map((s) => (
            <ChipItem key={s} selected={side === s} onClick={() => setSide(s)}>
              {s}
            </ChipItem>
          ))}
        </Chip>
        <Spacing size={12} />
        <TextField
          variant="line"
          label="방문 날짜"
          placeholder="예: 2026-02-10"
          type="date"
          data-testid="schedule-date-input"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            if (formError) setFormError(null);
          }}
        />
        <Spacing size={12} />
        <TextField
          variant="line"
          label="시작 시간"
          placeholder="예: 10:00"
          type="time"
          data-testid="schedule-start-input"
          value={startTime}
          onChange={(e) => {
            setStartTime(e.target.value);
            if (formError) setFormError(null);
          }}
        />
        <Spacing size={12} />
        <TextField
          variant="line"
          label="종료 시간"
          placeholder="예: 14:00"
          type="time"
          data-testid="schedule-end-input"
          value={endTime}
          onChange={(e) => {
            setEndTime(e.target.value);
            if (formError) setFormError(null);
          }}
        />
        <Spacing size={12} />
        <TextField
          variant="line"
          label="메모"
          placeholder="예: 차례 참석"
          maxLength={200}
          data-testid="schedule-memo-input"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
        {formError && (
          <>
            <Spacing size={8} />
            <Paragraph.Text typography="st13">{formError}</Paragraph.Text>
          </>
        )}
        <Spacing size={20} />
        <Button
          variant="fill"
          display="block"
          data-testid="schedule-submit-button"
          onClick={handleSubmit}
        >
          일정 저장
        </Button>
      </BottomSheet>

      <AlertDialog
        open={deleteTargetId !== null}
        title="삭제할까요?"
        onClose={() => setDeleteTargetId(null)}
        alertButton={
          <AlertDialog.AlertButton onClick={handleConfirmDelete}>삭제</AlertDialog.AlertButton>
        }
      />

      <Toast
        open={toast.open}
        position="bottom"
        text={toast.text}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </ScreenScaffold>
  );
}
