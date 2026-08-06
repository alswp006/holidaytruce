import { Top, Asset } from '@toss/tds-mobile';
import { useLocation } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { EmptyState } from '../components/StateView';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { TABS } from '../lib/nav';

type PaywallState = { from?: string };

// 골격 스텁 — 시즌권 결제(/paywall). 혜택 목록·TossPurchase 결제는 후속 패킷에서 채운다.
// state 없이 직접 진입해도 크래시 없이 렌더한다(from은 안전하게 옵셔널 수신).
export default function Paywall() {
  const location = useLocation();
  const _from = (location.state as PaywallState | null)?.from;
  void _from;

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>시즌권</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TABS} />}
    >
      <EmptyState
        icon={<Asset.ContentIcon name="iconStarRegular" alt="시즌권" />}
        title="시즌권으로 명절 준비를 무제한으로"
        description="무제한 AI 스크립트와 전체 리포트를 한 번에 잠금 해제해요"
      />
    </ScreenScaffold>
  );
}
