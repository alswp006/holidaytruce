import { useEffect, useState } from 'react';
import { Top, Chip, ChipItem, Paragraph, Spacing, ListRow, Button, Badge, Asset } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { SummaryHero } from '../components/SummaryHero';
import { Card } from '../components/Card';
import { CountUp } from '../components/CountUp';
import { MiniBar } from '../components/MiniBar';
import { EmptyState, LoadingState } from '../components/StateView';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { TABS } from '../lib/nav';
import { HOLIDAYS } from '../lib/constants';
import { useHoliday } from '../lib/HolidayContext';
import { listBudgets, listSchedules, listStressLogs } from '../lib/storage';
import { formatNumber } from '../lib/utils';
import type { BudgetItem, StressLog, VisitSchedule } from '../lib/types';

const EMPTY_HINT = '아직 기록이 없어요 · 추가하기';

// UTC 캘린더 날짜 기준 D-day (자정 시각 차이로 인한 타임존 오차 방지)
function diffDaysUTC(dateStr: string, now: Date): number {
  const target = Date.parse(`${dateStr}T00:00:00.000Z`);
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  return Math.round((target - today) / 86400000);
}

function ddayLabel(diff: number): string {
  if (diff > 0) return `D-${diff}`;
  if (diff === 0) return 'D-DAY';
  return `D+${Math.abs(diff)}`;
}

function safeHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'tickWeak' })).catch(() => {});
  } catch {
    /* WebView 밖에서는 throw — 무시 */
  }
}

function countBySide(list: VisitSchedule[], side: '본가' | '처가'): number {
  return list.filter((s) => s.side === side).length;
}

export default function Home() {
  const navigate = useNavigate();
  const { currentHolidayId, setCurrentHoliday, isPaid } = useHoliday();

  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [schedules, setSchedules] = useState<VisitSchedule[]>([]);
  const [stressLogs, setStressLogs] = useState<StressLog[]>([]);

  useEffect(() => {
    setBudgets(listBudgets(currentHolidayId));
    setSchedules(listSchedules(currentHolidayId));
    setStressLogs(listStressLogs(currentHolidayId));
    setLoading(false);
  }, [currentHolidayId]);

  const currentHoliday = HOLIDAYS.find((h) => h.id === currentHolidayId) ?? HOLIDAYS[0];
  const dday = diffDaysUTC(currentHoliday.date, new Date());

  const budgetTotal = budgets.reduce((sum, b) => sum + b.amount, 0);
  const hongaBudget = budgets.filter((b) => b.side === '본가').reduce((sum, b) => sum + b.amount, 0);
  const hongaBudgetPct = budgetTotal > 0 ? Math.round((hongaBudget / budgetTotal) * 100) : 0;

  const hongaCount = countBySide(schedules, '본가');
  const cheogaCount = countBySide(schedules, '처가');
  const visitTotal = hongaCount + cheogaCount;
  const hongaRatio = visitTotal > 0 ? hongaCount / visitTotal : 0;

  const recentStress = stressLogs.slice(-5);
  const avgStress =
    recentStress.length > 0
      ? Math.round((recentStress.reduce((sum, s) => sum + s.score, 0) / recentStress.length) * 10) / 10
      : 0;

  const allEmpty = budgets.length === 0 && schedules.length === 0 && stressLogs.length === 0;

  const goBudget = () => {
    safeHaptic();
    navigate('/budget');
  };
  const goSchedule = () => {
    safeHaptic();
    navigate('/schedule');
  };
  const goStress = () => {
    safeHaptic();
    navigate('/stress');
  };
  const goPaywall = () => {
    safeHaptic();
    navigate('/paywall');
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>명절휴전</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TABS} />}
    >
      {loading ? (
        <LoadingState rows={4} testId="dashboard-loading" />
      ) : (
        <>
          <Chip kind="select" wrap>
            {HOLIDAYS.map((h) => (
              <ChipItem
                key={h.id}
                selected={h.id === currentHolidayId}
                onClick={() => {
                  if (h.id === currentHolidayId) return;
                  safeHaptic();
                  setCurrentHoliday(h.id);
                }}
              >
                {h.label} {ddayLabel(diffDaysUTC(h.date, new Date()))}
              </ChipItem>
            ))}
          </Chip>

          <Spacing size={16} />

          <SummaryHero
            label={`다가오는 ${currentHoliday.label}까지`}
            value={<CountUp value={Math.max(dday, 0)} unit="일" typography="t1" />}
            caption={`${currentHoliday.date.slice(0, 4)}년 ${currentHoliday.label} · ${currentHoliday.date}`}
            testId="home-dday-hero"
          />

          <Spacing size={16} />

          {allEmpty ? (
            <>
              <EmptyState
                icon={<Asset.ContentIcon name="iconGiftRegular" alt="온보딩" />}
                title="명절 준비를 시작해보세요"
                description="예산·일정·감정 기록을 하나씩 추가하면 대시보드가 채워져요"
              />
              <Spacing size={16} />
            </>
          ) : null}

          <div data-testid="dashboard-cards" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card testId="dashboard-card-budget" onClick={goBudget}>
              <ListRow
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top="예산 총합"
                    bottom={budgets.length > 0 ? `${formatNumber(budgetTotal)}원` : EMPTY_HINT}
                  />
                }
                right={
                  budgets.length > 0 ? (
                    <Badge variant="weak" color="blue" size="small">
                      본가 {hongaBudgetPct}%
                    </Badge>
                  ) : undefined
                }
              />
            </Card>

            <Card testId="dashboard-card-balance" onClick={goSchedule}>
              <ListRow
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top="양가 방문 균형"
                    bottom={schedules.length > 0 ? `본가 ${hongaCount}건 / 처가 ${cheogaCount}건` : EMPTY_HINT}
                  />
                }
              />
              {schedules.length > 0 ? (
                <>
                  <Spacing size={8} />
                  <MiniBar ratio={hongaRatio} />
                </>
              ) : null}
            </Card>

            <Card testId="dashboard-card-stress" onClick={goStress}>
              <ListRow
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top="최근 감정소진도"
                    bottom={recentStress.length > 0 ? `평균 ${avgStress} / 10` : EMPTY_HINT}
                  />
                }
              />
            </Card>
          </div>

          {!isPaid ? (
            <>
              <Spacing size={16} />
              <Card testId="dashboard-card-paywall" onClick={goPaywall}>
                <Paragraph.Text typography="t5">시즌권으로 무제한 이용해요</Paragraph.Text>
                <Spacing size={4} />
                <Paragraph.Text typography="t6">AI 응대 스크립트와 전체 리포트를 잠금 해제해요</Paragraph.Text>
                <Spacing size={16} />
                {/* Card 자체가 onClick(goPaywall)을 갖는다 — 버튼 클릭도 그대로 버블링되어 처리되므로
                    여기 onClick을 중복으로 걸면 같은 탭에 navigate가 두 번 불린다. */}
                <Button variant="fill" size="medium" display="block">
                  시즌권 보기
                </Button>
              </Card>
            </>
          ) : null}
        </>
      )}
    </ScreenScaffold>
  );
}
