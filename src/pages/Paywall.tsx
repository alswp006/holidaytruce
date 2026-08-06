import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Top, ListRow, Badge, Paragraph, Spacing, Toast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { Card } from '../components/Card';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { TossPurchase } from '../components/TossPurchase';
import { useHoliday } from '../lib/HolidayContext';
import { TABS } from '../lib/nav';
import type { RouteState } from '../lib/types';

const IAP_SKU = import.meta.env.VITE_TOSS_IAP_SKU ?? 'seasonal-pass';

function fireHaptic(type: 'success' | 'tickWeak') {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* 앱인토스 WebView 밖(로컬 브라우저/jsdom)에서는 throw — 무시 */
  }
}

// 지급할 실물 상품이 없는 정액 잠금해제 상품이라 서버 검증 없이 항상 지급 확정한다.
async function grantSeasonPass() {
  return true;
}

export default function Paywall() {
  const location = useLocation();
  const _state = (location.state as RouteState) ?? null;
  void _state;

  const { isPaid, setIsPaid } = useHoliday();
  const [purchased, setPurchased] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; text: string }>({ open: false, text: '' });

  const unlocked = isPaid || purchased;

  function handlePurchased() {
    setIsPaid(true);
    setPurchased(true);
    fireHaptic('success');
    setToast({ open: true, text: '시즌권 결제가 완료됐어요. 혜택이 잠금 해제됐어요' });
  }

  function handleError() {
    setToast({ open: true, text: '결제에 실패했어요. 잠시 후 다시 시도해주세요' });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>시즌권</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TABS} />}
    >
      <Card testId="paywall-benefits">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Paragraph.Text typography="t3">시즌권 혜택</Paragraph.Text>
          <Badge size="small" variant="weak" color="blue">
            시즌 한정
          </Badge>
        </div>
        <Spacing size={12} />
        <ListRow
          contents={
            <ListRow.Texts
              type="2RowTypeA"
              top="AI 스크립트 무제한"
              bottom="상황별 응대 스크립트를 횟수 제한 없이 만들어요"
            />
          }
        />
        <ListRow
          contents={<ListRow.Texts type="2RowTypeA" top="광고 제거" bottom="전면·리워드 광고 없이 바로 이용해요" />}
        />
        <ListRow
          contents={
            <ListRow.Texts type="2RowTypeA" top="양가 균형 리포트" bottom="방문·예산 균형을 한눈에 확인해요" />
          }
        />
        <Spacing size={16} />
        {unlocked ? (
          <Badge size="medium" variant="fill" color="blue">
            이용 중
          </Badge>
        ) : (
          <TossPurchase sku={IAP_SKU} processProductGrant={grantSeasonPass} onPurchased={handlePurchased} onError={handleError}>
            시즌권 구매하기
          </TossPurchase>
        )}
      </Card>

      <Toast
        open={toast.open}
        position="bottom"
        text={toast.text}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </ScreenScaffold>
  );
}
