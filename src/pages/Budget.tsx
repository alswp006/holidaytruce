import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Top,
  Tab,
  Button,
  TextField,
  Chip,
  ChipItem,
  ListRow,
  Switch,
  Badge,
  Toast,
  BottomSheet,
  Spacing,
  Paragraph,
  Asset,
} from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { SummaryHero } from '@/components/SummaryHero';
import { CountUp } from '@/components/CountUp';
import { MiniBar } from '@/components/MiniBar';
import { EmptyState } from '@/components/StateView';
import { FloatingTabBar } from '@/components/FloatingTabBar';
import { TABS } from '@/lib/nav';
import { useHoliday } from '@/lib/HolidayContext';
import {
  listBudgets,
  addBudget,
  updateBudget,
  listChecklist,
  addChecklistItem,
  updateChecklistItem,
} from '@/lib/storage';
import { formatNumber } from '@/lib/utils';
import type { BudgetItem, ChecklistItem } from '@/lib/types';

const SIDES: BudgetItem['side'][] = ['본가', '처가'];
const CATEGORIES: BudgetItem['category'][] = ['용돈', '선물', '차례비용', '교통', '기타'];
const TAB_ITEMS: Array<'예산' | '체크리스트'> = ['예산', '체크리스트'];
const MAX_AMOUNT = 99999999;

type BudgetState = { tab?: '예산' | '체크리스트' };

function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

// 예산 계산기 & 갈등 방지 체크리스트(/budget) — Tab 전환 + BottomSheet 추가 + Switch 토글.
// state 없이 직접 진입/새로고침해도 크래시 없이 기본 '예산' 탭으로 렌더한다.
export default function Budget() {
  const location = useLocation();
  const { currentHolidayId } = useHoliday();

  const [tab, setTab] = useState<'예산' | '체크리스트'>(
    (location.state as BudgetState | null)?.tab ?? '예산',
  );

  const [budgets, setBudgets] = useState<BudgetItem[]>(() => listBudgets(currentHolidayId));
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => listChecklist(currentHolidayId));
  const [toast, setToast] = useState<{ open: boolean; text: string }>({ open: false, text: '' });

  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false);
  const [side, setSide] = useState<BudgetItem['side']>('본가');
  const [category, setCategory] = useState<BudgetItem['category']>('용돈');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [budgetError, setBudgetError] = useState<string | null>(null);

  const [checklistSheetOpen, setChecklistSheetOpen] = useState(false);
  const [checklistText, setChecklistText] = useState('');

  const total = budgets.reduce((sum, b) => sum + b.amount, 0);
  const homeTotal = budgets.filter((b) => b.side === '본가').reduce((sum, b) => sum + b.amount, 0);
  const inLawTotal = budgets.filter((b) => b.side === '처가').reduce((sum, b) => sum + b.amount, 0);
  const paidTotal = budgets.filter((b) => b.paid).reduce((sum, b) => sum + b.amount, 0);
  const pendingTotal = total - paidTotal;
  const homeRatio = total > 0 ? homeTotal / total : 0;

  const checkedCount = checklist.filter((c) => c.checked).length;

  function openBudgetForm() {
    setSide('본가');
    setCategory('용돈');
    setLabel('');
    setAmount('');
    setBudgetError(null);
    setBudgetSheetOpen(true);
  }

  function handleBudgetSubmit() {
    const parsed = Number(amount);
    if (!parsed || parsed <= 0) {
      setBudgetError('금액을 1원 이상 입력해주세요');
      return;
    }
    if (parsed > MAX_AMOUNT) {
      setBudgetError('금액이 너무 커요 (최대 99,999,999원)');
      return;
    }

    setBudgetError(null);
    const created = addBudget({
      side,
      category,
      label,
      amount: parsed,
      paid: false,
      holidayId: currentHolidayId,
    });
    setBudgets((prev) => [...prev, created]);
    setBudgetSheetOpen(false);
    fireHaptic('success');
    setToast({ open: true, text: '예산 항목이 저장됐어요' });
  }

  function togglePaid(item: BudgetItem) {
    const next = !item.paid;
    updateBudget(item.id, { paid: next });
    setBudgets((prev) => prev.map((b) => (b.id === item.id ? { ...b, paid: next } : b)));
    fireHaptic('tickWeak');
  }

  function openChecklistForm() {
    setChecklistText('');
    setChecklistSheetOpen(true);
  }

  function handleChecklistSubmit() {
    if (!checklistText.trim()) return;
    const created = addChecklistItem({
      text: checklistText.trim(),
      checked: false,
      holidayId: currentHolidayId,
    });
    setChecklist((prev) => [...prev, created]);
    setChecklistSheetOpen(false);
    fireHaptic('success');
    setToast({ open: true, text: '체크리스트 항목이 저장됐어요' });
  }

  function toggleChecklist(item: ChecklistItem) {
    const next = !item.checked;
    updateChecklistItem(item.id, { checked: next });
    setChecklist((prev) => prev.map((c) => (c.id === item.id ? { ...c, checked: next } : c)));
    fireHaptic('tickWeak');
  }

  return (
    <ScreenScaffold
      top={
        <>
          <Top title={<Top.TitleParagraph>예산 & 체크리스트</Top.TitleParagraph>} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 16px' }}>
            {tab === '예산' ? (
              <Button variant="weak" size="small" data-testid="budget-add-button" onClick={openBudgetForm}>
                추가
              </Button>
            ) : (
              <Button
                variant="weak"
                size="small"
                data-testid="checklist-add-button"
                onClick={openChecklistForm}
              >
                추가
              </Button>
            )}
          </div>
          <div data-testid="budget-tabs" style={{ padding: '0 16px' }}>
            <Tab onChange={(i) => setTab(TAB_ITEMS[i])}>
              {TAB_ITEMS.map((t, i) => (
                <Tab.Item key={t} selected={tab === t} onClick={() => setTab(t)}>
                  {t}
                </Tab.Item>
              ))}
            </Tab>
          </div>
        </>
      }
      bottom={<FloatingTabBar items={TABS} />}
    >
      {tab === '예산' ? (
        <>
          <SummaryHero
            testId="budget-summary"
            label="총 예산"
            value={<CountUp value={total} unit="원" typography="t1" testId="budget-total-countup" />}
            caption={`본가 ${formatNumber(homeTotal)}원 · 처가 ${formatNumber(inLawTotal)}원`}
          />

          <Spacing size={12} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Paragraph.Text data-testid="budget-side-total-본가" typography="t6">
              본가 {formatNumber(homeTotal)}원
            </Paragraph.Text>
            <Paragraph.Text data-testid="budget-side-total-처가" typography="t6">
              처가 {formatNumber(inLawTotal)}원
            </Paragraph.Text>
          </div>
          <Spacing size={8} />
          <MiniBar ratio={homeRatio} testId="budget-balance-bar" />

          <Spacing size={12} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Paragraph.Text data-testid="budget-paid-total" typography="st5">
              지급 완료 {formatNumber(paidTotal)}원
            </Paragraph.Text>
            <Paragraph.Text data-testid="budget-pending-total" typography="st5">
              예정 {formatNumber(pendingTotal)}원
            </Paragraph.Text>
          </div>

          <Spacing size={16} />

          {budgets.length === 0 ? (
            <EmptyState
              icon={<Asset.ContentIcon name="iconWonRegular" alt="예산 항목" />}
              title="예산 항목이 없어요"
              description="예산 항목을 추가해 명절 지출을 관리하세요"
              action={
                <Button variant="weak" onClick={openBudgetForm}>
                  예산 항목 추가
                </Button>
              }
            />
          ) : (
            budgets.map((item) => (
              <div key={item.id}>
                <ListRow
                  data-testid="budget-row"
                  contents={
                    <ListRow.Texts
                      type="2RowTypeA"
                      top={`${item.side} · ${item.category} · ${item.label}`}
                      bottom={`${formatNumber(item.amount)}원`}
                    />
                  }
                  right={
                    <Switch
                      data-testid={`budget-paid-switch-${item.id}`}
                      checked={item.paid}
                      onChange={() => togglePaid(item)}
                    />
                  }
                />
                <Spacing size={8} />
              </div>
            ))
          )}

          <BottomSheet
            open={budgetSheetOpen}
            onDimmerClick={() => setBudgetSheetOpen(false)}
            header="예산 항목 추가"
          >
            <Chip>
              {SIDES.map((s) => (
                <ChipItem key={s} selected={side === s} onClick={() => setSide(s)}>
                  {s}
                </ChipItem>
              ))}
            </Chip>
            <Spacing size={12} />
            <Chip wrap>
              {CATEGORIES.map((c) => (
                <ChipItem key={c} selected={category === c} onClick={() => setCategory(c)}>
                  {c}
                </ChipItem>
              ))}
            </Chip>
            <Spacing size={12} />
            <TextField
              variant="line"
              label="항목"
              placeholder="예: 장인어른 용돈"
              maxLength={30}
              data-testid="budget-label-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <Spacing size={12} />
            <TextField
              variant="line"
              label="금액"
              placeholder="예: 300000"
              inputMode="numeric"
              data-testid="budget-amount-input"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (budgetError) setBudgetError(null);
              }}
            />
            {budgetError && (
              <>
                <Spacing size={8} />
                <Paragraph.Text typography="st13">{budgetError}</Paragraph.Text>
              </>
            )}
            <Spacing size={20} />
            <Button
              variant="fill"
              display="block"
              data-testid="budget-submit-button"
              onClick={handleBudgetSubmit}
            >
              예산 저장
            </Button>
          </BottomSheet>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Paragraph.Text typography="t5">준비 체크리스트</Paragraph.Text>
            <Badge data-testid="checklist-badge" size="medium" variant="weak" color="blue">
              {`${checkedCount}/${checklist.length}`}
            </Badge>
          </div>

          <Spacing size={16} />

          {checklist.length === 0 ? (
            <EmptyState
              icon={<Asset.ContentIcon name="iconCheckRegular" alt="체크리스트" />}
              title="체크리스트가 없어요"
              description="명절 준비 항목을 추가해 갈등을 예방하세요"
              action={
                <Button variant="weak" onClick={openChecklistForm}>
                  항목 추가
                </Button>
              }
            />
          ) : (
            checklist.map((item) => (
              <div key={item.id}>
                <ListRow
                  data-testid="checklist-row"
                  contents={<ListRow.Texts type="1RowTypeA" top={item.text} />}
                  left={
                    <Switch
                      data-testid={`checklist-checkbox-${item.id}`}
                      checked={item.checked}
                      onChange={() => toggleChecklist(item)}
                    />
                  }
                />
                <Spacing size={8} />
              </div>
            ))
          )}

          <BottomSheet
            open={checklistSheetOpen}
            onDimmerClick={() => setChecklistSheetOpen(false)}
            header="체크리스트 항목 추가"
          >
            <TextField
              variant="line"
              label="할 일"
              placeholder="예: 선물 포장하기"
              maxLength={100}
              data-testid="checklist-text-input"
              value={checklistText}
              onChange={(e) => setChecklistText(e.target.value)}
            />
            <Spacing size={20} />
            <Button
              variant="fill"
              display="block"
              data-testid="checklist-submit-button"
              onClick={handleChecklistSubmit}
            >
              체크리스트 저장
            </Button>
          </BottomSheet>
        </>
      )}

      <Toast
        open={toast.open}
        position="bottom"
        text={toast.text}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </ScreenScaffold>
  );
}
