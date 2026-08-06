import { Top, Asset } from '@toss/tds-mobile';
import { useLocation } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { EmptyState } from '../components/StateView';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { TABS } from '../lib/nav';

type BudgetState = { tab?: '예산' | '체크리스트' };

// 골격 스텁 — 예산·체크리스트(/budget). 목록·합계·탭 전환은 후속 패킷에서 채운다.
// state 없이 직접 진입/새로고침해도 크래시 없이 기본 '예산' 탭으로 렌더한다.
export default function Budget() {
  const location = useLocation();
  const initialTab = (location.state as BudgetState | null)?.tab ?? '예산';

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>예산 · 체크리스트</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TABS} />}
    >
      <EmptyState
        icon={<Asset.ContentIcon name="iconWonRegular" alt="예산" />}
        title={initialTab === '체크리스트' ? '준비할 일을 정리해요' : '명절 지출을 관리해요'}
        description="예산 항목을 추가해 본가·처가 지출을 한눈에 비교해요"
      />
    </ScreenScaffold>
  );
}
